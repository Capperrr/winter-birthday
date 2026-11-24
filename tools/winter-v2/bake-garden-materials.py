"""Render registered web materials from the approved garden sculpture.

blender -b WINTER-Two-Grey-Wagtails.blend -P tools/winter-v2/bake-garden-materials.py -- PASSES_DIR
python tools/winter-v2/pack-secret-garden.py PASSES_DIR dist/assets/home

The saved sculpture uses the XY wall plane with height along +Z at its final frame.
"""
import sys
from pathlib import Path

import bpy

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.frame_set(scene.frame_end)
scene.camera.location=(0,0,16)
scene.camera.rotation_euler=(0,0,0)
scene.camera.data.ortho_scale=13.6
scene.render.resolution_x,scene.render.resolution_y=2720,1800
scene.render.resolution_percentage=100
scene.cycles.use_denoising=False
scene.render.image_settings.file_format="PNG"
scene.render.image_settings.color_mode="RGB"
scene.view_settings.view_transform="Raw"
scene.view_settings.look="None"
scene.view_settings.exposure=0
scene.view_settings.gamma=1

def height_material():
    mat=bpy.data.materials.new("Unlit height in plaster coordinates")
    mat.use_nodes=True
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    geo=nodes.new("ShaderNodeNewGeometry")
    xyz=nodes.new("ShaderNodeSeparateXYZ")
    remap=nodes.new("ShaderNodeMath")
    remap.operation="DIVIDE"
    remap.inputs[1].default_value=1.12
    remap.use_clamp=True
    emit=nodes.new("ShaderNodeEmission")
    links.new(geo.outputs["Position"],xyz.inputs[0])
    links.new(xyz.outputs["Z"],remap.inputs[0])
    links.new(remap.outputs[0],emit.inputs["Color"])
    links.new(emit.outputs[0],nodes["Material Output"].inputs["Surface"])
    return mat

def surface_material(source):
    mat=source.copy()
    mat.name=source.name+" | registered normals and occlusion"
    nodes=mat.node_tree.nodes
    links=mat.node_tree.links
    original=nodes["Principled BSDF"].inputs["Normal"]
    geo=nodes.new("ShaderNodeNewGeometry")
    xyz=nodes.new("ShaderNodeSeparateXYZ")
    rgb=nodes.new("ShaderNodeCombineXYZ")
    emit=nodes.new("ShaderNodeEmission")
    links.new(original.links[0].from_socket if original.is_linked else geo.outputs["Normal"],xyz.inputs[0])
    for axis in ("X","Y"):
        remap=nodes.new("ShaderNodeMath")
        remap.operation="MULTIPLY_ADD"
        remap.inputs[1].default_value=.5
        remap.inputs[2].default_value=.5
        links.new(xyz.outputs[axis],remap.inputs[0])
        links.new(remap.outputs[0],rgb.inputs[axis])
    ao=nodes.new("ShaderNodeAmbientOcclusion")
    ao.samples=12
    ao.inputs["Distance"].default_value=.31
    links.new(geo.outputs["Normal"],ao.inputs["Normal"])
    links.new(ao.outputs["AO"],rgb.inputs["Z"])
    links.new(rgb.outputs[0],emit.inputs["Color"])
    links.new(emit.outputs[0],nodes["Material Output"].inputs["Surface"])
    return mat

scene.view_layers[0].material_override=height_material()
scene.render.image_settings.color_depth="16"
scene.render.image_settings.color_mode="BW"
scene.cycles.samples=5
scene.render.filepath=str(out/"garden-height-16.png")
bpy.ops.render.render(write_still=True)
scene.view_layers[0].material_override=None
mats={}
for obj in scene.objects:
    if obj.type!="MESH":
        continue
    original=obj.data.materials[0]
    if original not in mats:
        mats[original]=surface_material(original)
    obj.data.materials[0]=mats[original]
scene.render.image_settings.color_depth="8"
scene.render.image_settings.color_mode="RGB"
scene.cycles.samples=8
scene.render.filepath=str(out/"garden-surface.png")
bpy.ops.render.render(write_still=True)
