"""Render the original WINTER ice lettering and its snow-crystal companion.

blender -b -t 6 -P tools/winter-v2/render-frost-type.py -- cormorant.ttf output-directory
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

font_file, output = [Path(p) for p in sys.argv[sys.argv.index("--") + 1:]]
output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = False
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.world = bpy.data.worlds.new("Blue-hour reflections")
scene.world.use_nodes = True
scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.20, .36, .52, 1)
scene.world.node_tree.nodes.get("Background").inputs[1].default_value = .37

frost = bpy.data.materials.new("Frosted mineral")
frost.use_nodes = True
nodes = frost.node_tree.nodes
links = frost.node_tree.links
stone = nodes.get("Principled BSDF")
stone.inputs["Base Color"].default_value = (.78, .88, .93, 1)
stone.inputs["Roughness"].default_value = .57
stone.inputs["Subsurface Weight"].default_value = .08
stone.inputs["Subsurface Radius"].default_value = (.3, .62, 1)
grain = nodes.new("ShaderNodeTexNoise")
grain.inputs["Scale"].default_value = 188
grain.inputs["Detail"].default_value = 2.6
bump = nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = .28
bump.inputs["Distance"].default_value = .026
links.new(grain.outputs["Fac"], bump.inputs["Height"])
links.new(bump.outputs["Normal"], stone.inputs["Normal"])

edge = frost.copy()
edge.name = "Cold cut edge"
edge.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (.27, .47, .60, 1)

def aim(object_, point):
    object_.rotation_euler = (Vector(point)-object_.location).to_track_quat("-Z", "Y").to_euler()

def light(name, position, power, size, color):
    lamp = bpy.data.lights.new(name, "AREA")
    lamp.energy, lamp.shape, lamp.size, lamp.color = power, "DISK", size, color
    obj = bpy.data.objects.new(name, lamp)
    scene.collection.objects.link(obj)
    obj.location = position
    aim(obj, (0,0,0))

light("Raking daylight", (-7,5,7), 1220, 7, (.92,.96,1))
light("Glacial bounce", (0,-3,3), 270, 7, (.54,.77,1))
light("Bright rim", (7,2,4), 860, 5, (.76,.90,1))

def curve(name, points, width, material=frost):
    mesh = bpy.data.curves.new(name,"CURVE")
    mesh.dimensions = "3D"
    mesh.bevel_depth = width
    mesh.bevel_resolution = 4
    geom = mesh.splines.new("BEZIER")
    geom.bezier_points.add(len(points)-1)
    for i,(p, co) in enumerate(zip(geom.bezier_points, points)):
        p.co = co
        p.radius = max(.10, (1-i/(len(points)-.4))**.6)
        p.handle_left_type = p.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj

def crystal(center, rad, thick):
    objects = []
    for i in range(6):
        angle = math.radians(30+60*i)
        def point(a, r, z=0):
            return (center[0]+math.cos(angle)*a-math.sin(angle)*r,
                    center[1]+math.sin(angle)*a+math.cos(angle)*r,center[2]+z)
        objects.append(curve("crystal spine", [point(0,0),point(rad*.48,0,.02),point(rad,0,-.015)],thick))
        for index,length in ((.31,.23),(.52,.25),(.72,.18)):
            for side in [-1,1]:
                a=rad*index
                r=rad*length*side
                objects.append(curve("crystal branch",[point(a,0),point(a+rad*.08,r*.55,.013),point(a+rad*.16,r,-.02)],thick*.68))
    return objects

shape = bpy.data.curves.new("WINTER",type="FONT")
shape.body = "WINTER"
shape.font = bpy.data.fonts.load(str(font_file))
shape.align_x = "CENTER"
shape.align_y = "CENTER"
shape.size = 1
shape.extrude = .026
shape.bevel_depth = .009
shape.bevel_resolution = 5
shape.space_character = 1.04
shape.materials.append(frost)
letters = bpy.data.objects.new("Carved letterforms",shape)
scene.collection.objects.link(letters)
bpy.context.view_layer.update()
scale = 10/letters.dimensions.x
letters.scale = (scale,scale,scale)
letters.location = (0,-.31,.12)

seal = crystal((3.9,1.03,-.07),.62,.043)
stem = curve("Winter fern",[(1.91,.61,-.11),(2.47,.51,-.09),(3.10,.68,-.11),(3.87,1.02,-.10)],.027)
seal.append(stem)
for i in range(5):
    x = 2.12+i*.29
    seal.append(curve("Frozen fern vane",[(x,.57,-.12),(x+.12,.76,-.10),(x+.36,.86,-.13)],.022))

camera = bpy.data.cameras.new("Relief camera")
camera.type = "ORTHO"
view = bpy.data.objects.new("Relief camera",camera)
scene.collection.objects.link(view)
scene.camera = view

def render(name,width,height,target,scale):
    view.location = (target[0]+.0,target[1]-2.38,15)
    aim(view, target)
    camera.ortho_scale = scale
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(output/(name+".png"))
    bpy.ops.render.render(write_still=True)

render("winter-relief",1920,550,(0,.27,0),10.6)
letters.hide_render = True
for obj in seal:
    obj.hide_render = True
crystal((0,0,0),2.15,.103)
render("snow-relief",640,640,(0,0,0),4.9)
