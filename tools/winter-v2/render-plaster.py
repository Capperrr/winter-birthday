"""Model and render WINTER's original winter herbarium.

python tools/winter-v2/letter-solid.py cormorant-static.ttf letters.json
blender -b -t 6 -P tools/winter-v2/render-plaster.py -- letters.json output-directory
Produces lit plaster plus registered height passes for the browser, and
transparent raised typography. No reference video frames are used as textures.
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
    data.bevel_resolution = 3
    data.resolution_u = 12
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
    rows,cols = 22,12
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
    shell.thickness = .023 if petal else .018
    if veins:
        for direction in (-1,1):
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
    solid=json.loads(LETTERS.read_text())
    mesh=bpy.data.meshes.new("Cormorant contours")
    mesh.from_pydata(solid["vertices"],[],solid["faces"])
    mesh.update()
    obj=bpy.data.objects.new("Raised WINTER",mesh)
    scene.collection.objects.link(obj)
    keep(obj,typeface)
    bevel=obj.modifiers.new("Rounded plaster edge","BEVEL")
    bevel.width=.019
    bevel.segments=4
    bevel.limit_method="ANGLE"
    bevel.harden_normals=True
    key.location=(-5.7,4.2,3.18)
    aim(key,(0,0,0))
    key.data.energy=1030
    key.data.size=3.0
    bounce.data.energy=400
    place_camera(0,-.11,16,10.55)
    view.location.y=-1.84
    aim(view,(0,-.11,0))
    shot("winter-lettering",1680,430)
