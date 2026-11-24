"""Bake the two light directions and occlusion at three heights of the original cast.

blender -b WINTER-Two-Grey-Wagtails.blend -P tools/winter-v2/bake-garden-light-levels.py -- PASSES_DIR

The source .blend is read-only. Red is the morning diffuse response, green is
the moonlight response, and blue is ambient visibility. Black world and zero
diffuse bounces keep these measurements independent.
"""
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

out = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.frame_set(scene.frame_end)
bpy.context.view_layer.update()

# Stretch or compress along the wall normal in world coordinates. The branch
# contacts, feather placement and approved sculpture silhouettes share XY.
ground = bpy.data.collections["01 · Continuous gypsum ground"]
originals = {
    obj: obj.matrix_world.copy() for obj in scene.objects
    if obj.type == "MESH" and obj.name not in ground.objects
}
for obj, transform in originals.items():
    obj.parent = None
    obj.animation_data_clear()
    obj.matrix_world = transform

for obj in scene.objects:
    if obj.type == "LIGHT":
        obj.hide_render = True
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0


def sun(name, direction, color):
    lamp = bpy.data.lights.new(name, "SUN")
    lamp.energy = 1.72
    lamp.angle = .19
    lamp.color = color
    obj = bpy.data.objects.new(name, lamp)
    scene.collection.objects.link(obj)
    obj.rotation_euler = (-Vector(direction)).to_track_quat("-Z", "Y").to_euler()


sun("Morning test rays",(-.79,.61,.88),(1,0,0))
sun("Night test rays",(.91,.81,.60),(0,1,0))

mat = bpy.data.materials.new("Independent illumination and ambient visibility")
mat.use_nodes=True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
ao = nodes.new("ShaderNodeAmbientOcclusion")
ao.samples = 16
ao.inputs["Distance"].default_value = .235
blue = nodes.new("ShaderNodeCombineXYZ")
links.new(ao.outputs["AO"], blue.inputs["Z"])
emission = nodes.new("ShaderNodeEmission")
links.new(blue.outputs[0], emission.inputs["Color"])
diffuse = nodes.new("ShaderNodeBsdfDiffuse")
diffuse.inputs["Color"].default_value = (1,1,1,1)
combined = nodes.new("ShaderNodeAddShader")
links.new(diffuse.outputs[0],combined.inputs[0])
links.new(emission.outputs[0],combined.inputs[1])
links.new(combined.outputs[0],nodes["Material Output"].inputs["Surface"])
scene.view_layers[0].material_override = mat
scene.camera.location = (0,0,16)
scene.camera.rotation_euler = (0,0,0)
scene.camera.data.ortho_scale = 13.6
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 13
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 1
scene.cycles.diffuse_bounces = 0
scene.view_settings.view_transform = "Raw"
scene.view_settings.look = "None"
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.render.resolution_x = 1920
scene.render.resolution_y = 1272
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.color_depth = "8"
for depth, key in ((.04,"rest"),(.52,"middle"),(1.,"raised")):
    compression = Matrix.Diagonal((1.,1.,depth,1.))
    for obj, transform in originals.items():
        obj.matrix_world = compression @ transform
    bpy.context.view_layer.update()
    scene.render.filepath = str(out / f"garden-light-{key}.png")
    bpy.ops.render.render(write_still=True)
