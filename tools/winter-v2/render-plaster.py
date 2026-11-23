"""Model and render WINTER's original winter herbarium.

python tools/winter-v2/letter-solid.py cormorant-static.ttf letters.json
blender -b -t 6 -P tools/winter-v2/render-plaster.py -- letters.json output-directory
Produces lit plaster plus registered height passes for the browser, and
transparent raised typography. Add the wall argument to export the connected glTF relief.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

arguments = sys.argv[sys.argv.index("--") + 1:]
LETTERS, OUT = [Path(arg) for arg in arguments[:2]]
chosen = set(arguments[2:] or ("cover","prints","dedication","winter-lettering"))
export_wall = "wall" in chosen
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Studio bounce")
scene.world.use_nodes = True
world = scene.world.node_tree.nodes["Background"]
world.inputs[0].default_value = (.90,.94,1,1)
world.inputs[1].default_value = .27

def material(name, color, roughness=.82, grain=120):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    surface = nodes["Principled BSDF"]
    surface.inputs["Base Color"].default_value = (*color,1)
    surface.inputs["Roughness"].default_value = roughness
    texture = nodes.new("ShaderNodeTexNoise")
    texture.inputs["Scale"].default_value = grain
    texture.inputs["Detail"].default_value = 2.4
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .17
    bump.inputs["Distance"].default_value = .017
    mat.node_tree.links.new(texture.outputs["Fac"],bump.inputs["Height"])
    mat.node_tree.links.new(bump.outputs["Normal"],surface.inputs["Normal"])
    return mat

plaster = material("Ivory plaster",(.78,.763,.723))
frost = material("Carved translucent plaster",(.835,.814,.777),.69,148)
typeface = material("Letter face",(.635,.615,.565),.72,140)

def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()

def light(name, loc, power, size, color):
    data = bpy.data.lights.new(name,"AREA")
    data.energy, data.shape, data.size, data.color = power,"DISK",size,color
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj,(.4,-.25,0))
    return obj

key = light("Raking daylight",(-6.5,5.4,4.2),2550,3.9,(1,.964,.907))
fill = light("Window bounce",(5.2,-2.2,7.8),520,8,(.875,.926,1))
bounce = light("Ceiling bounce",(0,1,10.4),760,10,(1,.99,.959))
camera = bpy.data.cameras.new("Gallery scan")
camera.type = "ORTHO"
view = bpy.data.objects.new("Gallery scan",camera)
scene.collection.objects.link(view)
scene.camera = view

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0))
wall = bpy.context.object
wall.name = "Plaster ground"
wall.data.materials.append(plaster)
models = []
def keep(obj, mat=frost):
    if mat:
        obj.data.materials.append(mat)
    models.append(obj)
    return obj

def trace(name, points, width, taper=0.87):
    data = bpy.data.curves.new(name,"CURVE")
    data.dimensions = "3D"
    data.bevel_depth = width
    data.bevel_resolution = 1 if export_wall else 3
    data.resolution_u = 5 if export_wall else 12
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for i, (p, co) in enumerate(zip(spline.bezier_points,points)):
        p.co = co
        p.radius = 1-taper*i/(len(points)-1)
        p.handle_left_type = p.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    return keep(obj)

def blade(root, angle, length, width, bend=.26, petal=False, skew=0, veins=False):
    base = Vector(root)
    forward = Vector((math.cos(angle),math.sin(angle),0))
    across = Vector((-forward.y,forward.x,0))
    def surface(t,u):
        taper = max(.001,math.sin(math.pi*t))**(.66 if petal else .81)
        w = width*taper*(.78+.31*t)
        offset = u*w
        swell = (math.sin(t*math.pi)*.51+(.36 if petal else .22)*t*t) * bend
        rim = (.55*u*u*math.sin(math.pi*t)+.13*u*math.sin(t*6+angle))*bend
        folds = math.cos(u*(9 if petal else 5)+t*2.1)*.073*bend*taper
        z = swell+(rim if petal else -rim)+folds+t*.12*bend
        return base+forward*(length*t)+across*(offset+skew*t*t)+Vector((0,0,z))
    rows,cols = (13,7) if export_wall else (22,12)
    vertices = [surface(i/rows,(j/cols)*2-1) for i in range(rows+1) for j in range(cols+1)]
    faces = [(i*(cols+1)+j,(i+1)*(cols+1)+j,(i+1)*(cols+1)+j+1,i*(cols+1)+j+1)
             for i in range(rows) for j in range(cols)]
    mesh = bpy.data.meshes.new("Petal" if petal else "Frost leaf")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj = bpy.data.objects.new(mesh.name,mesh)
    scene.collection.objects.link(obj)
    keep(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    shell = obj.modifiers.new("Rounded stone edge","SOLIDIFY")
    shell.thickness = .029 if export_wall and petal else .023 if petal else .018
    if veins:
        for direction in (() if export_wall else (-1,1)):
            for t in (.23,.41,.57):
                points = [surface(t,0),surface(t+.11,direction*.42),surface(t+.19,direction*.83)]
                trace("Leaf vein",[p+Vector((0,0,.006)) for p in points],width*.037)
        trace("Leaf midrib",[surface(t,0)+Vector((0,0,.012)) for t in (.08,.26,.46,.67,.89)],width*.049)

def bud(x,y,scale,angle):
    for j, offset in enumerate((-.34,.20,.63)):
        blade((x,y,.13),angle+offset,scale*(.8+.09*j),scale*.24,.24*scale,True,skew=.03)
    trace("Bud stem",[(x-.39*math.cos(angle),y-.39*math.sin(angle),.045),(x,y,.14)],.042*scale)

def flower(x,y,size,angle=.2):
    for i in range(5):
        arc=angle+i*math.tau/5
        blade((x,y,.10),arc,size*(1+.10*math.sin(i*2.2)),size*.39,size*.59,True,.13*math.sin(i))
    for i in range(5):
        arc=angle+.39+i*math.tau/5
        blade((x,y,.21),arc,size*.52,size*.185,size*.35,True)
    for i in range(10):
        arc=angle+i*math.tau/10
        trace("Hellebore stamen",[(x,y,.225),(x+math.cos(arc)*size*.11,y+math.sin(arc)*size*.11,.33),(x+math.cos(arc)*size*.20,y+math.sin(arc)*size*.20,.39)],size*.024,.31)

def cluster(start, angle, length, bend, count=6, needle=False):
    x,y=start
    f=Vector((math.cos(angle),math.sin(angle),0))
    wing=Vector((-f.y,f.x,0))
    def path(t):
        return Vector((x,y,.056))+f*length*t+wing*(bend*math.sin(t*2.1))+Vector((0,0,.20*math.sin(math.pi*t)))
    trace("Curving winter stem",[path(t) for t in (0,.21,.47,.7,1)],.083 if needle else .064)
    for i in range(count):
        t=.165+.74*i/count
        root=path(t)
        side=1 if i%2 else -1
        direction=angle+side*(.90+.22*math.sin(i*19.1))
        if needle:
            for j in range(4):
                q=path(t+j*.019)
                blade(q,direction+side*j*.16,(1-t*.48)*(.67+.085*j),.047,.23,False,skew=.045*side)
        else:
            size=(.88-.39*t)*(1+.21*math.cos(i*2.44))
            blade(root,direction,size*2.0,size*.46,size*.45,False,.12*side,True)
    return path(1)

def crystal(x,y,r,angle=.0):
    for n in range(6):
        a=angle+n*math.pi/3
        def point(t,s=0,z=.09):
            return (x+r*(math.cos(a)*t-math.sin(a)*s),y+r*(math.sin(a)*t+math.cos(a)*s),z)
        trace("Snow crystal spine",[point(0),point(.53,0,.16),point(1)],r*.031,.53)
        for tip,width in ((.35,.18),(.59,.22),(.81,.15)):
            for sign in (-1,1):
                trace("Snow crystal arm",[point(tip,0,.14),point(tip+.12,width*.51*sign,.12),point(tip+.20,width*sign,.075)],r*.020)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r*.087,location=(x,y,.11))
    keep(bpy.context.object)

def twig_stars(values):
    for i,(x,y,r) in enumerate(values):
        crystal(x,y,r,.27+i*.58)

def cover():
    tip=cluster((-10.2,4.8),-.22,7.1,-1.65,8)
    cluster((-8.3,5.8),-.74,6.2,.60,9,True)
    cluster((-11,-4.2),.30,4.9,-.9,8,True)
    flower(-6.72,3.42,1.03,.23)
    flower(-4.91,4.45,.69,-.26)
    bud(tip.x-.23,tip.y,.64,-.36)
    tip=cluster((10.15,-5.6),2.74,6.9,-1.35,8)
    cluster((8.75,-4.7),2.06,6.2,-1.34,9,True)
    cluster((8.93,-4.87),3.19,5.0,.49,7)
    flower(6.52,-3.82,1.25,.14)
    flower(5.0,-3.05,.63,.4)
    bud(tip.x,tip.y,.58,2.6)
    twig_stars([(6.5,3.1,.58),(3.55,4.1,.24),(-5.06,-3.05,.43),(-2.69,3.10,.19),(7.72,2.01,.21),(-3.0,-4.37,.19)])

def prints():
    tip=cluster((-9.55,-3.68),.73,7.9,.96,8)
    cluster((-9.1,-4.63),1.07,7.0,-1.09,9,True)
    cluster((8.9,5.31),-2.25,6.5,-.91,8,True)
    flower(-7.08,-1.28,1.16,.57)
    bud(tip.x,tip.y,.58,.51)
    flower(6.80,2.55,.95,1.10)
    twig_stars([(-6.0,3.6,.51),(-4.67,4.18,.19),(6.28,-3.48,.74),(4.51,-3.67,.28)])

def dedication():
    tip=cluster((-8.85,-4.75),.32,7.47,-.66,8)
    cluster((-8.44,-1.64),.92,6.27,1.08,9,True)
    cluster((8.66,4.26),-2.69,6.55,-1.34,8)
    flower(-5.93,-3.35,.99,.04)
    flower(6.53,3.18,1.16,.39)
    bud(tip.x,tip.y,.63,.44)
    twig_stars([(5.05,-3.1,.66),(3.8,-4.09,.29),(-5.61,2.89,.41),(-3.4,3.82,.21),(7.4,-2.01,.18)])

def place_camera(x,y,z,width):
    view.location=(x,y,z)
    aim(view,(x,y,0))
    camera.ortho_scale=width

def shot(name,width,height):
    scene.render.resolution_x,scene.render.resolution_y = width,height
    scene.render.filepath=str(OUT/(name+".png"))
    bpy.ops.render.render(write_still=True)

def letter_model():
    solid = json.loads(LETTERS.read_text())
    mesh = bpy.data.meshes.new("Cormorant contours")
    mesh.from_pydata(solid["vertices"], [], solid["faces"])
    mesh.update()
    obj = bpy.data.objects.new("Raised WINTER", mesh)
    scene.collection.objects.link(obj)
    keep(obj, typeface)
    bevel = obj.modifiers.new("Rounded plaster edge", "BEVEL")
    bevel.width = .018
    bevel.segments = 2 if export_wall else 4
    bevel.limit_method = "ANGLE"
    bevel.harden_normals = True
    return obj


def wall_export():
    """Export the herbarium as beveled surfaces in one wall coordinate system."""
    panels = []

    def place(name, center, depth, budget, draw):
        models.clear()
        draw()
        bpy.ops.object.select_all(action="DESELECT")
        for item in models:
            item.select_set(True)
        bpy.context.view_layer.objects.active = models[0]
        bpy.ops.object.convert(target="MESH")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.ops.object.join()
        item = bpy.context.object
        item.name = name
        item.location.x, item.location.y = center
        item.scale.z = depth
        # The stems start inside the stone surface so their edges cast contact shadows.
        item.location.z = -.051 * depth
        item.data.materials.clear()
        item.data.calc_loop_triangles()
        count = len(item.data.loop_triangles)
        if count > budget:
            modifier = item.modifiers.new("Realtime tessellation", "DECIMATE")
            modifier.ratio = budget / count
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        panels.append(item)
        print(name, len(item.data.vertices), flush=True)

    def upper_bough():
        tip = cluster((-3.25, .95), -.04, 4.55, -.70, 6)
        cluster((-2.23, 1.02), -.72, 3.8, -.46, 8, True)
        flower(-.4, .05, 1.16, .21)
        bud(tip.x, tip.y, .54, -.30)
        crystal(1.95, -.6, .43, .22)

    def lower_bough():
        cluster((3.0, -.8), 2.75, 5.75, -.75, 7)
        cluster((2.03, -.7), 2.25, 4.85, .64, 8, True)
        flower(.32, .02, 1.13, .42)
        flower(1.74, -.66, .73, -.48)
        crystal(-1.5, -1.05, .46, .20)

    def hellebore():
        cluster((2.45, 1.55), 3.98, 4.85, -.57, 6)
        cluster((2.12, 1.08), 3.05, 3.40, .52, 8, True)
        flower(.04, -.10, 1.63, .19)
        flower(1.49, .73, .79, .51)
        bud(-1.32, -.38, .53, 3.14)
        crystal(-2.15, -1.22, .55, .06)

    def portfolio_left():
        tip = cluster((-2.96, -1.48), .86, 5.84, .50, 7)
        cluster((-2.28, -1.36), .24, 4.37, -.67, 8, True)
        flower(-.17, .40, 1.13, .35)
        bud(tip.x, tip.y, .70, .19)
        crystal(1.36, 1.11, .32, .24)

    def portfolio_right():
        cluster((2.45, 1.56), -2.05, 4.67, -.24, 8, True)
        cluster((2.18, 1.36), -2.60, 4.13, .60, 7)
        flower(.46, .36, 1.10, .79)
        crystal(-1.55, -1.23, .72, .05)

    def crossing():
        tip = cluster((-3.15, -1.55), .43, 7.30, 1.12, 8)
        cluster((-2.22, -.93), .95, 4.66, 1.03, 9, True)
        flower(-.24, .24, 1.37, -.30)
        bud(tip.x, tip.y, .59, .36)
        crystal(1.36, -.82, .58, .17)

    def lower_garland():
        cluster((-3.0, -1.03), .48, 6.1, -.99, 8)
        cluster((-2.30, -.62), .94, 5.0, .66, 8, True)
        flower(-.51, -.31, 1.30, -.19)
        flower(1.54, -.83, .7, .54)
        crystal(3.27, .56, .78, .38)

    def upper_garland():
        cluster((2.77, 1.1), 3.45, 5.48, 1.29, 7)
        cluster((2.58, 1.72), 3.65, 3.85, .63, 8, True)
        flower(.96, .11, .98, .29)
        crystal(-1.96, -.70, .46, -.22)

    place("Upper bough", (-4.78, 2.68), 1.68, 2300, upper_bough)
    place("Lower bough", (4.63, -2.51), 2.20, 3050, lower_bough)
    place("Hellebore", (2.84, -6.66), 2.86, 4100, hellebore)
    place("Photographic bay left", (-4.69, -10.87), 2.15, 3300, portfolio_left)
    place("Photographic bay right", (4.98, -14.03), 1.76, 2600, portfolio_right)
    place("Crossing bough", (-2.68, -18.58), 2.95, 3900, crossing)
    place("Lower garland", (-3.69, -27.03), 1.99, 3050, lower_garland)
    place("Upper garland", (4.87, -22.23), 1.76, 2700, upper_garland)
    models.clear()
    letters = letter_model()
    bpy.context.view_layer.objects.active = letters
    letters.select_set(True)
    bpy.ops.object.modifier_apply(modifier=letters.modifiers[0].name)
    letters.data.calc_loop_triangles()
    reduced = letters.modifiers.new("Realtime lettering", "DECIMATE")
    reduced.ratio = min(1.0, 4500 / len(letters.data.loop_triangles))
    bpy.ops.object.modifier_apply(modifier=reduced.name)
    panels.append(letters)
    bpy.ops.object.select_all(action="DESELECT")
    for item in panels:
        item.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / "winter-herbarium.glb"), export_format="GLB",
                             use_selection=True, export_yup=False, export_texcoords=False,
                             export_lights=False, export_cameras=False, export_materials="NONE")


if export_wall:
    wall_export()
    sys.exit(0)


height_mat=bpy.data.materials.new("Height in scene units")
height_mat.use_nodes=True
nodes=height_mat.node_tree.nodes
links=height_mat.node_tree.links
geometry=nodes.new("ShaderNodeNewGeometry")
component=nodes.new("ShaderNodeSeparateXYZ")
scale=nodes.new("ShaderNodeMapRange")
scale.inputs["From Min"].default_value=0
scale.inputs["From Max"].default_value=.92
out=nodes.new("ShaderNodeEmission")
links.new(geometry.outputs["Position"],component.inputs["Vector"])
links.new(component.outputs["Z"],scale.inputs["Value"])
links.new(scale.outputs["Result"],out.inputs["Color"])
links.new(out.outputs["Emission"],nodes["Material Output"].inputs["Surface"])

# Curves and height passes share camera framing exactly.
for name, build in (("cover",cover),("prints",prints),("dedication",dedication)):
    if name not in chosen:
        continue
    build()
    place_camera(0,0,19,18)
    scene.view_settings.view_transform="AgX"
    scene.cycles.samples=32
    shot(name,1680,1120)
    scene.view_layers[0].material_override=height_mat
    scene.view_settings.view_transform="Raw"
    scene.cycles.samples=3
    shot(name+"-depth",1152,768)
    scene.view_layers[0].material_override=None
    for obj in models:
        bpy.data.objects.remove(obj,do_unlink=True)
    models.clear()

# Use bevels smaller than the narrowest gap between the serif outlines.
if "winter-lettering" in chosen:
    # Raised letterforms with their own bevel, body and cast-shadow receiver.
    wall.hide_render=True
    scene.view_settings.view_transform="AgX"
    scene.render.film_transparent=True
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=56
    letter_model()
    key.location=(-5.7,4.2,3.18)
    aim(key,(0,0,0))
    key.data.energy=1030
    key.data.size=3.0
    bounce.data.energy=400
    place_camera(0,-.11,16,10.55)
    view.location.y=-1.84
    aim(view,(0,-.11,0))
    shot("winter-lettering",1680,430)
