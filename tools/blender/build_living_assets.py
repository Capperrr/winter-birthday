"""Build actual GLB birthday, envelope, Alpine depth/foliage/dog assets and curled paper.
Blender 4.3: blender -b --threads 2 --python this.py -- --output dist/assets/living --papers /tmp/paper-renders --lighter-blend FILE
"""
import argparse,math,random,sys,json
from pathlib import Path
import bpy
from mathutils import Vector
random.seed(25)
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--papers',type=Path,required=True);p.add_argument('--lighter-blend',type=Path,required=True);p.add_argument('--only-cake',action='store_true');p.add_argument('--only-papers',action='store_true')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);a.papers.mkdir(parents=True,exist_ok=True)

def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 return bpy.context.scene

def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;q=m.node_tree.nodes['Principled BSDF'];q.inputs['Base Color'].default_value=(*color,1);q.inputs['Metallic'].default_value=metal;q.inputs['Roughness'].default_value=rough
 return m

def group(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o

def attach(o,m,parent=None):
 o.data.materials.append(m);o.parent=parent
 if hasattr(o.data,'polygons'):
  for f in o.data.polygons:f.use_smooth=True
 return o

def ball(name,loc,r,m,parent=None,scale=(1,1,1),segments=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=8,radius=r,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;return attach(o,m,parent)

def cylinder(name,loc,r,h,m,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=r,depth=h,location=loc);o=bpy.context.object;o.name=name
 mod=o.modifiers.new('Soft edge','BEVEL');mod.width=.018;mod.segments=3
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return attach(o,m,parent)

def line(name,points,r,m,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r;c.bevel_resolution=2
 q=c.splines.new('POLY');q.points.add(len(points)-1)
 for pt,co in zip(q.points,points):pt.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);o.parent=parent
 return o

def mesh(name,vertices,faces,m,parent=None,uv=None):
 d=bpy.data.meshes.new(name);d.from_pydata(vertices,[],faces);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);attach(o,m,parent)
 if uv:
  layer=d.uv_layers.new()
  for poly in d.polygons:
   for loop in poly.loop_indices:layer.data[loop].uv=uv[d.loops[loop].vertex_index]
 return o

def merge_materials(exclude=()):
 # Static decoration is merged by material for low mobile draw-call counts.
 for o in list(bpy.context.scene.objects):
  if o.type=='CURVE':
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 batches={}
 for o in bpy.context.scene.objects:
  if o.type=='MESH' and not any(o.name.startswith(x) for x in exclude):batches.setdefault((o.parent,o.data.materials[0] if o.data.materials else None),[]).append(o)
 for (parent,m),objects in batches.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=(m.name if m else 'Surface')+' merged'

def export(name,cameras=False):
 bpy.ops.wm.save_as_mainfile(filepath=str(a.papers/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',export_cameras=cameras,export_lights=False,export_extras=True)
 print('EXPORTED',name,flush=True)

def bake_papers():
 for k in range(6):
  scene=reset();scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=False;scene.render.resolution_x=256;scene.render.resolution_y=256;scene.render.resolution_percentage=100;scene.render.film_transparent=True
  scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.world.color=(.65,.65,.65)
  pm=mat('Uncoated paper',(.86,.84,.78),0,.93);vs=[];faces=[];N=32
  for j in range(N+1):
   for i in range(N+1):
    x=i/N;y=j/N;sx=1 if k%2 else -1;sy=1 if k%3 else -1;cx=x if sx>0 else 1-x;cy=y if sy>0 else 1-y
    curl=max(0,(cx+cy-1.5)/.5)**2*(.08+.014*k);z=curl+.002*math.sin(x*13+k)*math.sin(y*9)
    vs.append((x-.5-sx*curl*.65,y-.5-sy*curl*.65,z))
  for j in range(N):
   for i in range(N):q=j*(N+1)+i;faces.append((q,q+1,q+N+2,q+N+1))
  mesh('Hand placed paper',vs,faces,pm)
  ld=bpy.data.lights.new('Soft daylight','AREA');ld.energy=75;ld.size=3;o=bpy.data.objects.new('Soft daylight',ld);bpy.context.collection.objects.link(o);o.location=(-1,-1,3)
  cd=bpy.data.cameras.new('Paper camera');cam=bpy.data.objects.new('Paper camera',cd);bpy.context.collection.objects.link(cam);cam.location=(0,0,3);cd.type='ORTHO';cd.ortho_scale=1.1;scene.camera=cam
  scene.render.filepath=str(a.papers/('paper-'+str(k)+'.png'));bpy.ops.render.render(write_still=True)

if a.only_papers:bake_papers();sys.exit(0)

# The actual cake: turned silver pedestal, three tiers, pearl swags, piped rope, florals.
reset();cake=group('BirthdayCake');cream=mat('Ivory cream',(.77,.70,.56),0,.48);petal=mat('Ivory flower',(.91,.85,.72),0,.53);pearl=mat('Sugar pearl',(.92,.85,.69),.08,.24);silver=mat('Antique silver',(.48,.51,.54),.92,.27);sage=mat('Sage leaf',(.19,.28,.16),0,.65);gold=mat('Stamen gold',(.49,.32,.08),.15,.55);wax=mat('Candle wax',(.66,.73,.73),0,.43);wickmat=mat('Cotton wick',(.08,.055,.03),0,.95)
profile=[(.02,.02),(.68,.02),(.78,.07),(.73,.13),(.45,.19),(.22,.30),(.19,.40),(.26,.47),(1.39,.50),(1.44,.55),(1.40,.59)]
v=[];f=[];N=128
for r,z in profile:
 for i in range(N):t=i*math.tau/N;v.append((r*math.cos(t),r*math.sin(t),z))
for j in range(len(profile)-1):
 for i in range(N):n=(i+1)%N;f.append((j*N+i,j*N+n,(j+1)*N+n,(j+1)*N+i))
mesh('Turned silver pedestal',v,f,silver,cake)
for z,r in [(.075,.765),(.53,1.43),(.57,1.40)]:line('Silver rim',[(r*math.cos(i*math.tau/160),r*math.sin(i*math.tau/160),z) for i in range(161)],.012,silver,cake)
z=.59
for tier,(r,h) in enumerate([(1.23,1.03),(.99,.95),(.79,.90)]):
 cylinder('Cream tier '+str(tier),(0,0,z+h/2),r,h,cream,cake)
 for level in [z+.035,z+h-.035]:
  count=round(r*75)
  for i in range(count):t=i*math.tau/count;ball('Pearl',((r+.015)*math.cos(t),(r+.015)*math.sin(t),level),.027,pearl,cake)
 for offset in [0,math.pi]:
  pts=[]
  for i in range(401):
   t=i*math.tau/400;rr=r+.012+.018*math.cos(t*42+offset);pts.append((rr*math.cos(t),rr*math.sin(t),z+h-.065+.018*math.sin(t*42+offset)))
  line('Hand piped rope',pts,.018,cream,cake)
 # Scalloped pearl garlands.
 for arc in range(9):
  t0=arc*math.tau/9
  pts=[]
  for i in range(25):
   u=i/24;t=t0+u*math.tau/9;pts.append(((r+.025)*math.cos(t),(r+.025)*math.sin(t),z+h-.15-.23*math.sin(u*math.pi)))
  line('Scalloped piping',pts,.010,cream if tier!=1 else silver,cake)
  for i in range(1,14):
   u=i/14;t=t0+u*math.tau/9;ball('Garland sugar',((r+.035)*math.cos(t),(r+.035)*math.sin(t),z+h-.19-.20*math.sin(u*math.pi)),.018,pearl,cake,segments=10)
 if tier==0:
  for i in range(64):
   t=i*math.tau/64;line('Fine cream pleat',[((r+.006)*math.cos(t),(r+.006)*math.sin(t),z+.1+j*h*.75/10) for j in range(11)],.011,cream,cake)
 if tier==1:
  for i in range(7):
   center=-math.pi/2+(i-3)*.25
   pts=[]
   for j in range(45):
    u=j/44*math.pi*3;ang=center+.10*(1-j/55)*math.cos(u);zz=z+h*.53+.15*(1-j/55)*math.sin(u);pts.append(((r+.045)*math.cos(ang),(r+.045)*math.sin(ang),zz))
   line('Silver filigree',pts,.012,silver,cake)
 z+=h

def flower(center,radius):
 center=Vector(center)
 for ring,(count,sc) in enumerate([(11,1),(9,.72)]):
  for k in range(count):
   theta=k*math.tau/count+ring*.33;rad=Vector((math.cos(theta),0,math.sin(theta)));side=Vector((-math.sin(theta),0,math.cos(theta)));vs=[];fs=[]
   for u in range(13):
    t=u/12
    for j in range(7):
     across=(j/6-.5)*2;width=math.sin(math.pi*t)**.7*radius*.34
     point=center+rad*(t*radius*sc)+side*(across*width*sc)+Vector((0,-radius*(.10+.34*math.sin(math.pi*t)+.10*across*across)+ring*-.025,0));vs.append(tuple(point))
   for u in range(12):
    for j in range(6):i=u*7+j;fs.append((i,i+1,i+8,i+7))
   mesh('Curved cream petal',vs,fs,petal,cake)
 for i in range(32):
  t=random.random()*math.tau;rr=random.random()*radius*.22;end=center+Vector((math.cos(t)*rr,-radius*.25-random.random()*.035,math.sin(t)*rr));line('Stamen',[tuple(center+Vector((0,-.02,0))),tuple(end)],.003,gold,cake);ball('Pollen',end,.011,gold,cake,segments=8)
 for i in range(6):
  t=i*math.tau/6+.3;rad=Vector((math.cos(t),0,math.sin(t)));side=Vector((-math.sin(t),0,math.cos(t)));start=center+rad*radius*.46+Vector((0,.025,0));vs=[];fs=[]
  for u in range(11):
   q=u/10
   for j in range(5):
    cross=j/4*2-1;point=start+rad*(q*radius*.95)+side*(cross*math.sin(q*math.pi)*radius*.20)+Vector((0,.04*math.sin(q*math.pi)-.045*abs(cross),0));vs.append(tuple(point))
  for u in range(10):
   for j in range(4):n=u*5+j;fs.append((n,n+1,n+6,n+5))
  mesh('Sage leaf',vs,fs,sage,cake)
flower((-.48,-.68,2.83),.34);flower((.72,-.75,1.91),.36);flower((-.67,-1.06,.83),.37)
for i in range(5):
 x=(i-2)*.35;y=-.20+.07*abs(i-2);height=.43+.025*(2-abs(i-2));cylinder('Wax candle '+str(i),(x,y,z+height/2),.024,height,wax,cake)
 line('Dark wick',[(x,y,z+height),(x,y,z+height+.045)],.006,wickmat,cake)
 group('CandleTip_'+str(i),(x,y,z+height+.045),cake)
merge_materials();export('birthday-cake')
if a.only_cake:sys.exit(0)

# Real envelope geometry and string, ready for independent hinge and bow animation.
reset();paper=mat('Warm letter paper',(.77,.72,.59),0,.88);edge=mat('Folded paper edge',(.69,.64,.51),0,.9);rope=mat('Flax twine',(.37,.31,.20),0,.97);env=group('Envelope')
mesh('EnvelopeBody',[(-2.7,-.04,-1.71),(2.7,-.04,-1.71),(2.7,-.04,1.71),(-2.7,-.04,1.71)],[(0,1,2,3)],paper,env)
mesh('Envelope lower fold',[(-2.7,-.065,-1.71),(2.7,-.065,-1.71),(0,-.1,.35)],[(0,1,2)],edge,env)
for sign in [-1,1]:mesh('Envelope side fold',[(sign*2.7,-.075,-1.71),(sign*2.7,-.075,1.71),(0,-.09,0)],[(0,1,2)],paper,env)
flap=group('EnvelopeFlapHinge',(0,-.11,1.71),env);mesh('Envelope flap',[(-2.7,0,0),(2.7,0,0),(0,-.02,-1.38)],[(0,1,2)],paper,flap)
sheet=group('LetterSheet',(0,.01,0),env);mesh('Letter upper',[(-2.4,0,0),(2.4,0,0),(2.4,0,1.45),(-2.4,0,1.45)],[(0,1,2,3)],paper,sheet)
fold=group('LetterFold',(0,0,0),sheet);mesh('Letter lower',[(-2.4,0,0),(2.4,0,0),(2.4,0,-1.45),(-2.4,0,-1.45)],[(0,1,2,3)],paper,fold)
line('TwineHorizontal',[(-2.8,-.18,.55),(0,-.19,.55),(2.8,-.18,.55)],.022,rope,env)
line('TwineVertical',[(-1.48,-.18,-1.8),(-1.48,-.21,.55),(-1.48,-.18,1.8)],.022,rope,env)
for sign,name in [(-1,'BowLeft'),(1,'BowRight')]:
 g=group(name,(-1.48,-.23,.55),env);line('Twine loop',[(sign*(.36-.36*math.cos(t)),-.03*math.sin(t),.25*math.sin(t)) for t in [i*math.tau/64 for i in range(65)]],.023,rope,g)
 line('Twine tail',[(0,0,0),(sign*.16,-.02,-.18),(sign*.38,0,-.48)],.022,rope,g)
merge_materials(exclude=('TwineHorizontal','TwineVertical'));export('envelope')

# Photo-projected terrain: UV stays the original Swiss photograph at the neutral view.
reset();m=mat('Original landscape projection',(1,1,1),0,1);vs=[];faces=[];uv=[];nx,ny=96,64;aspect=2000/1335
for j in range(ny+1):
 v=j/ny
 for i in range(nx+1):
  u=i/nx;front=(1-v)**2*1.6;mount=.16*math.sin(u*11)*(math.sin(v*math.pi)**4);depth=front-1+mount
  vs.append(((u*2-1)*aspect,-depth,v*2-1));uv.append((u,v))
for j in range(ny):
 for i in range(nx):k=j*(nx+1)+i;faces.append((k,k+1,k+nx+2,k+nx+1))
mesh('HomeTerrain',vs,faces,m,uv=uv);export('home-terrain')

# Meadow grass clumps: individually curved blades, no cartoon mountain replacement.
reset();gm=mat('Meadow blades',(.15,.24,.07),0,.95)
for side in [-1,1]:
 g=group('Grass_'+str(side))
 for i in range(70):
  x=random.uniform(-.6,.6);y=random.uniform(-.2,.2);h=random.uniform(.15,.55);bend=random.uniform(-.15,.15);w=random.uniform(.006,.016);verts=[]
  for j in range(7):q=j/6;verts.extend([(x-w*(1-q)+bend*q*q,y,q*h),(x+w*(1-q)+bend*q*q,y,q*h)])
  mesh('Curved blade',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(6)],gm,g)
merge_materials();export('grass')

# Distant smooth-bodied puppy with named limbs for a proper gallop cycle.
reset();fur=mat('Warm puppy coat',(.68,.54,.34),0,.86);creamfur=mat('Cream puppy chest',(.84,.78,.63),0,.9);nose=mat('Puppy eyes and nose',(.025,.018,.012),0,.32);dog=group('Puppy')
ball('Dog body',(0,0,.42),1,fur,dog,(.39,.15,.20));ball('Dog chest',(.26,-.01,.44),1,creamfur,dog,(.13,.16,.22));ball('Dog head',(.39,0,.68),1,fur,dog,(.18,.14,.18));ball('Muzzle',(.55,-.01,.62),1,creamfur,dog,(.14,.10,.085));ball('Nose',(.66,-.015,.65),.043,nose,dog)
for yy in [-.116,.116]:ball('Eye',(.47,yy,.73),.017,nose,dog);ball('Ear',(.33,yy,.73),1,fur,dog,(.085,.045,.16))
for i,(x,y) in enumerate([(.22,-.11),(.22,.11),(-.23,-.11),(-.23,.11)]):
 leg=group('DogLeg_'+str(i),(x,y,.4),dog);ball('Leg',(0,0,-.15),1,fur,leg,(.05,.05,.18));ball('Paw',(.035,0,-.31),1,creamfur,leg,(.09,.06,.05))
tail=group('DogTail',(-.34,0,.47),dog);ball('Tail',(-.12,0,.12),1,fur,tail,(.20,.05,.06))
merge_materials();export('puppy')

# Export the calibrated Blender lighter from the existing renderer's source scene.
bpy.ops.wm.open_mainfile(filepath=str(a.lighter_blend.resolve()))
lid=bpy.data.objects.get('Open lid');hinge=group('LighterLid',(-.29,0,1.025))
if lid:old=lid.matrix_world.copy();lid.parent=hinge;lid.matrix_world=old
wheel=group('LighterWheel',(-.035,0,1.285))
for o in list(bpy.context.scene.objects):
 if o.name.startswith(('Striker wheel','Wheel knurl')):old=o.matrix_world.copy();o.parent=wheel;o.matrix_world=old
export('lighter',True)

# Bake six subtle curled paper surfaces for all 22 editable notes.
bake_papers()
print('ALL_LIVING_ASSETS_EXPORTED',flush=True)
