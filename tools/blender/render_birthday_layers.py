"""Blender 4.3+: render the birthday stone/lighter and retain the photographic cake.
Run: blender -b --factory-startup --python tools/blender/render_birthday_layers.py -- --output DIR
"""
import argparse, json, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

args = sys.argv[sys.argv.index('--') + 1:]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--only-lighter', action='store_true')
parser.add_argument('--only-stone', action='store_true')
parser.add_argument('--only-masks', action='store_true')
parser.add_argument('--mask-wide', type=Path)
parser.add_argument('--mask-portrait', type=Path)
options=parser.parse_args(args)
out=options.output.resolve(); out.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[2] / 'dist' / 'assets'
metadata = {'blender': bpy.app.version_string, 'cake': 'Original photographic cake, native-resolution alpha; no new cake model is claimed.'}

if (options.only_lighter or options.only_stone or options.only_masks) and (out/'manifest.json').exists():
    metadata.update(json.loads((out/'manifest.json').read_text()))

mask_dir=Path(__file__).parent/'masks';mask_dir.mkdir(exist_ok=True)

def save_rgba(name, pixels, destination):
    h,w,_=pixels.shape
    image=bpy.data.images.new(name,width=w,height=h,alpha=True)
    image.pixels.foreach_set(pixels[::-1].copy().ravel())
    image.filepath_raw=str(destination);image.file_format='PNG';image.save()

def prepare_mask(source,name,w,h,target):
    image=bpy.data.images.load(str(source),check_existing=False)
    sw,sh=image.size;pixels=np.array(image.pixels[:],dtype=np.float32).reshape(sh,sw,4)[::-1]
    # Image-generation supplies only a silhouette. Original photographic RGB is retained.
    raw=pixels[:,:,3]>.945
    yy,xx=np.where(raw);crop=raw[yy.min():yy.max()+1,xx.min():xx.max()+1].astype(np.float32)
    x0,y0,x1,y1=target;tw,th=x1-x0,y1-y0
    sy=np.linspace(0,crop.shape[0]-1,th);sx=np.linspace(0,crop.shape[1]-1,tw)
    ya=sy.astype(int);xa=sx.astype(int);yb=np.minimum(ya+1,crop.shape[0]-1);xb=np.minimum(xa+1,crop.shape[1]-1)
    wy=(sy-ya)[:,None];wx=(sx-xa)[None,:]
    sampled=crop[ya[:,None],xa]*(1-wy)*(1-wx)+crop[yb[:,None],xa]*wy*(1-wx)+crop[ya[:,None],xb]*(1-wy)*wx+crop[yb[:,None],xb]*wy*wx
    result=np.ones((h,w,4),dtype=np.float32);result[:,:,3]=0;result[y0:y1,x0:x1,3]=sampled
    save_rgba('Silhouette '+name,result,mask_dir/(name+'.png'))

if options.mask_wide:prepare_mask(options.mask_wide,'cake-wide',1536,1024,(508,218,1018,858))
if options.mask_portrait:prepare_mask(options.mask_portrait,'cake-portrait',1024,1536,(232,590,796,1352))

def cake_layer(name, image_name):
    photo=bpy.data.images.load(str(root/image_name),check_existing=False);w,h=photo.size
    pixels=np.array(photo.pixels[:],dtype=np.float32).reshape(h,w,4)[::-1].copy()
    mask=bpy.data.images.load(str(mask_dir/(name+'.png')),check_existing=False)
    assert tuple(mask.size)==(w,h)
    pixels[:,:,3]=np.array(mask.pixels[:],dtype=np.float32).reshape(h,w,4)[::-1,:,3]
    save_rgba(name,pixels,out/(name+'.png'))
    metadata[name]={'width':w,'height':h,'source':image_name,'alpha':'Authored extraction silhouette; original RGB retained.'}

if not options.only_lighter and not options.only_stone:
    cake_layer('cake-wide','cinematic-cake-scene.webp')
    cake_layer('cake-portrait','cinematic-cake-scene-portrait.webp')
if options.only_masks:
    (out/'manifest.json').write_text(json.dumps(metadata,indent=2));raise SystemExit(0)

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Blue hour ambient');scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.27,.4,.6,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
    return scene

def material(name,color,metal=0,rough=.4):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m

def box(name,loc,scale,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft crafted edges','BEVEL');mod.width=bevel;mod.segments=4
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    o.data.materials.append(mat);return o

def area(name,loc,color,energy,size,target=(0,0,0)):
    d=bpy.data.lights.new(name,'AREA');d.color=color;d.energy=energy;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def camera(scene,loc,target,scale,w,h):
    d=bpy.data.cameras.new('Matched orthographic camera');o=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(o)
    o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale
    scene.camera=o;scene.render.resolution_x=w;scene.render.resolution_y=h;bpy.context.view_layer.update();return o

def render(scene,name):
    scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)

for name,w,h,start,foot in ([] if options.only_lighter else [('wide',1536,1024,.80,(.72,.823)),('portrait',1024,1536,.80,(.71,.864))]):
    scene=reset();stone=material('Honed blue slate',(.115,.14,.16),.05,.67)
    nodes=stone.node_tree.nodes;links=stone.node_tree.links;p=nodes.get('Principled BSDF')
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=12;noise.inputs['Detail'].default_value=5
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.025,.038,.05,1);ramp.color_ramp.elements[1].color=(.085,.10,.12,1)
    coords=nodes.new('ShaderNodeTexCoord');links.new(coords.outputs['Object'],noise.inputs['Vector'])
    links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],p.inputs['Base Color'])
    fine=nodes.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=125;fine.inputs['Detail'].default_value=3
    links.new(coords.outputs['Object'],fine.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.035
    links.new(fine.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
    box('Continuous stone shelf',(0,-.5,-.16),(20,2.4,.32),stone,.06)
    cam=camera(scene,(0,-8,6),(0,0,0),9 if name=='wide' else 8,w,h)
    up=cam.rotation_euler.to_quaternion()@Vector((0,1,0));rear=Vector((0,.7,0))
    y=world_to_camera_view(scene,cam,rear).y;dy=world_to_camera_view(scene,cam,rear+up).y-y
    cam.location+=up*((y-(1-start))/dy);bpy.context.view_layer.update()
    # Shadow-only pedestal proxy: its camera projection matches the retained photo.
    p0=world_to_camera_view(scene,cam,Vector((0,0,0)));px=world_to_camera_view(scene,cam,Vector((1,0,0)));py=world_to_camera_view(scene,cam,Vector((0,1,0)))
    xy=np.linalg.solve([[px.x-p0.x,py.x-p0.x],[px.y-p0.y,py.y-p0.y]],[foot[0]-p0.x,1-foot[1]-p0.y]);cx,cy=map(float,xy)
    silver=material('Pedestal shadow proxy',(.23,.25,.26),0,.8)
    silver.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.14
    for radius,depth,z in [(.25,.02,.01)]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=(cx,cy,z));o=bpy.context.object;o.name='Camera-invisible cake shadow proxy';o.data.materials.append(silver);o.visible_camera=False;o.visible_glossy=False
    area('Soft ivory key',(-3,-4,7),(1,.87,.7),650,5,(cx,cy,1))
    area('Lake blue reflection',(5,2,5),(.35,.6,1),420,5,(cx,cy,1))
    render(scene,'stone-'+name)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/('stone-'+name+'.blend')))

if options.only_stone:
    (out/'manifest.json').write_text(json.dumps(metadata,indent=2))
    raise SystemExit(0)

scene=reset();metal=material('Brushed silver',(.49,.54,.59),.95,.24);dark=material('Inside metal',(.13,.17,.20),.9,.32)
body=box('Silver lighter body',(0,0,.53),(.64,.25,1.0),metal,.065)
# Open lid and hinge, separate from the body for future interactive modelling.
lid=box('Open lid',(-.36,.015,1.29),(.63,.27,.37),metal,.045);lid.rotation_euler.y=math.radians(-28)
box('Burner chimney',(.15,0,1.16),(.27,.18,.28),dark,.018)
# A real hinge, serrated striker and small wick keep the unlit tool recognisable.
bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.045,depth=.25,location=(-.29,0,1.025),rotation=(math.pi/2,0,0))
bpy.context.object.name='Lid hinge';bpy.context.object.data.materials.append(metal)
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.065,depth=.08,location=(-.035,0,1.285),rotation=(0,math.pi/2,0))
bpy.context.object.name='Striker wheel';bpy.context.object.data.materials.append(dark)
for i in range(24):
    angle=i*math.tau/24
    tooth=box('Wheel knurl',(-.035,math.cos(angle)*.066,1.285+math.sin(angle)*.066),(.083,.012,.012),metal,.002)
    tooth.rotation_euler.x=angle
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.009,depth=.045,location=(.15,0,1.31))
bpy.context.object.name='Cotton wick';bpy.context.object.data.materials.append(material('Wick',(.21,.16,.10),0,.9))

# Small raised perforation rims read as punched metal at mobile sizes.
for x in [.075,.16,.245]:
    for z in [1.10,1.20]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.025,location=(x,-.093,z));o=bpy.context.object;o.scale=(1,.12,1);o.data.materials.append(material('Vent',(.018,.023,.03),.3,.45))
bpy.ops.object.text_add(location=(-.12,-.128,.34),rotation=(math.pi/2,0,0));text=bpy.context.object;text.name='WINTER monogram';text.data.body='W.';text.data.size=.17;text.data.extrude=.0008;text.data.materials.append(dark)
cam=camera(scene,(2.7,-6,2.7),(-.03,0,.8),2.18,1065,1477)
area('Ivory softbox',(-2,-4,4),(1,.88,.72),400,3,(0,0,.7));area('Blue lake rim',(3,2,3),(.4,.65,1),600,3,(0,0,.7))
base=Vector((0,0,.03));tip=Vector((.15,0,1.33))
b0=world_to_camera_view(scene,cam,base);t0=world_to_camera_view(scene,cam,tip)
cam.data.ortho_scale*=abs(t0.y-b0.y)/.677;bpy.context.view_layer.update()
right=cam.rotation_euler.to_quaternion()@Vector((1,0,0));up=cam.rotation_euler.to_quaternion()@Vector((0,1,0))
p0=world_to_camera_view(scene,cam,base);px=world_to_camera_view(scene,cam,base+right);py=world_to_camera_view(scene,cam,base+up)
cam.location+=right*((p0.x-.658)/(px.x-p0.x))+up*((p0.y-.033)/(py.y-p0.y));bpy.context.view_layer.update()
area('Narrow silver highlight',(-1.8,-3,2.8),(1,.96,.88),550,1.1,(0,0,.8))
flame=world_to_camera_view(scene,cam,Vector((.15,0,1.33)))
metadata['lighter_flame']=[round(flame.x*1065,2),round((1-flame.y)*1477,2)]
render(scene,'lighter')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'lighter.blend'))
(out/'manifest.json').write_text(json.dumps(metadata,indent=2))
print('WINTER_RENDER_COMPLETE',json.dumps(metadata))
