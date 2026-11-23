"""WINTER — A Secret Winter Garden, original sculpted plaster for Home act I.

blender -b -t 2 -P tools/winter-v2/render-secret-garden.py -- OUT review denoise
blender -b -t 2 -P tools/winter-v2/render-secret-garden.py -- OUT bake
Add `denoise` when Blender ships with Open Image Denoise. `draft` renders one elevation.
The camera is normal to the same XY plane that the browser displaces.
"""
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
OUT = Path(args[0]).resolve()
MODE = (args[1:] or ["review"])[0]
DENOISE = "denoise" in args[2:]
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT, MAX_DEPTH = 13.6, 9.0, 1.12
REST = .04
rng = random.Random(52)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.max_bounces = 3
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 1
scene.cycles.adaptive_threshold = .062 if DENOISE else .032
scene.cycles.adaptive_min_samples = 6
scene.render.image_settings.file_format = "PNG"
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Cool reflected daylight")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.83,.90,1,1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .36


def collection(name):
    result = bpy.data.collections.new(name)
    scene.collection.children.link(result)
    return result


wall_parts = collection("01 · Continuous gypsum ground")
traces = collection("02 · Incised frost and leaf tracery")
branches = collection("03 · Winter bough and climbing shoots")
flowers = collection("04 · Hellebore and camellia")
perched = collection("05 · Bird on the branch")
flying = collection("06 · Bird arriving")
studio = collection("07 · Cycles cameras and raking light")
art = []


def plaster_material():
    mat = bpy.data.materials.new("Fine cast gypsum · natural pores")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (.81,.79,.75,1)
    bsdf.inputs["Roughness"].default_value = .82
    bsdf.inputs["Specular IOR Level"].default_value = .23
    bsdf.inputs["Subsurface Weight"].default_value = .013
    bsdf.inputs["Subsurface Radius"].default_value = (.24,.17,.11)
    coords = nodes.new("ShaderNodeTexCoord")
    broad = nodes.new("ShaderNodeTexNoise")
    broad.inputs["Scale"].default_value = 4.7
    broad.inputs["Detail"].default_value = 3.6
    pores = nodes.new("ShaderNodeTexNoise")
    pores.inputs["Scale"].default_value = 147
    pores.inputs["Detail"].default_value = 2.6
    for node in (broad, pores):
        links.new(coords.outputs["Object"], node.inputs["Vector"])
    palette = nodes.new("ShaderNodeValToRGB")
    palette.color_ramp.elements[0].position = .12
    palette.color_ramp.elements[0].color = (.738,.718,.690,1)
    palette.color_ramp.elements[1].position = .89
    palette.color_ramp.elements[1].color = (.844,.824,.790,1)
    links.new(broad.outputs["Fac"],palette.inputs["Fac"])
    links.new(palette.outputs["Color"],bsdf.inputs["Base Color"])
    bedding = nodes.new("ShaderNodeBump")
    bedding.inputs["Strength"].default_value = .17
    bedding.inputs["Distance"].default_value = .012
    links.new(broad.outputs["Fac"],bedding.inputs["Height"])
    grain = nodes.new("ShaderNodeBump")
    grain.inputs["Strength"].default_value = .26
    grain.inputs["Distance"].default_value = .0046
    links.new(bedding.outputs["Normal"],grain.inputs["Normal"])
    links.new(pores.outputs["Fac"],grain.inputs["Height"])
    links.new(grain.outputs["Normal"],bsdf.inputs["Normal"])
    return mat


plaster = plaster_material()


def mesh(name, group, vertices, faces, sculpted=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.data.materials.append(plaster)
    for polygon in data.polygons:
        polygon.use_smooth = True
    if sculpted:
        art.append(obj)
    return obj


def shell(name, group, surface, rows, cols, thickness):
    """Carve a closed plate with a rounded crown and a buried underside."""
    stride = cols + 1
    top = [surface(i/rows,2*j/cols-1) for i in range(rows+1) for j in range(cols+1)]
    n = len(top)
    # The lower skin intersects its supporting bough or vane rather than floating.
    vertices = top + [(x,y,z-thickness) for x,y,z in top]
    faces = []
    for i in range(rows):
        for j in range(cols):
            a = i*stride+j
            face = (a,a+stride,a+stride+1,a+1)
            faces.extend((face,tuple(n+k for k in reversed(face))))
    border = [*range(stride),*(i*stride+cols for i in range(1,rows+1)),
              *range(rows*stride+cols-1,rows*stride-1,-1),*(i*stride for i in range(rows-1,0,-1))]
    faces.extend((b,a,a+n,b+n) for a,b in zip(border,border[1:]+border[:1]))
    return mesh(name,group,vertices,faces)


def spline(nodes, t):
    k = min(len(nodes)-2,int(t*(len(nodes)-1)))
    s = t*(len(nodes)-1)-k
    a,b,c,d = [nodes[i] for i in (max(0,k-1),k,k+1,min(len(nodes)-1,k+2))]
    return b + .5*s*((c-a)+s*((2*a-5*b+4*c-d)+s*(-a+3*b-3*c+d)))


def tube(name, group, points, rings=13, facets=11, bark=0):
    # The last component at each knot is radius, tapering to a rounded end.
    knots = [Vector(point) for point in points]
    vertices = []
    for i in range(rings+1):
        t = i/rings
        node = spline(knots,t)
        tangent = (spline(knots,min(1,t+.005))-spline(knots,max(0,t-.005))).to_3d()
        tangent.normalize()
        side = tangent.cross(Vector((0,0,1))).normalized()
        if not side.length_squared:
            side = Vector((1,0,0))
        normal = side.cross(tangent).normalized()
        for j in range(facets):
            a = j*math.tau/facets
            flutes = 1 + bark*(.56*math.cos(5*a+t*7)+.27*math.sin(9*a+t*11)+.17*math.cos(13*a-t*8))
            vertices.append(node.to_3d()+max(.002,node[3])*flutes*(side*math.cos(a)+.88*normal*math.sin(a)))
    faces = [(i*facets+j,(i+1)*facets+j,(i+1)*facets+(j+1)%facets,i*facets+(j+1)%facets)
             for i in range(rings) for j in range(facets)]
    faces.extend((tuple(range(facets)),tuple(range((rings+1)*facets-1,rings*facets-1,-1))))
    return mesh(name,group,vertices,faces)


def oval(name, group, center, scale, lon=20, lat=12):
    x,y,z = center
    sx,sy,sz = scale
    vertices = []
    for i in range(lat+1):
        polar = math.pi*i/lat
        radius = max(.001,math.sin(polar))
        height = z+math.cos(polar)*sz
        for j in range(lon):
            a = math.tau*j/lon
            vertices.append((x+radius*math.cos(a)*sx,y+radius*math.sin(a)*sy,height))
    faces = [(i*lon+j,(i+1)*lon+j,(i+1)*lon+(j+1)%lon,i*lon+(j+1)%lon)
             for i in range(lat) for j in range(lon)]
    return mesh(name,group,vertices,faces)


def leaf(name, group, start, end, width, crown, bend=0, veins=True):
    base, tip = Vector(start), Vector(end)
    axis = tip-base
    across = Vector((-axis.y,axis.x,0)).normalized()

    def surface(t,u):
        local = math.sin(math.pi*t)
        taper = max(.005,local)**.78 * (1.21-.37*t)
        edge = 1 + .045*math.sin(t*29*math.pi) * abs(u)**4
        side = width*taper*u*edge + bend*t*t
        rib = .09 * math.exp(-u*u*35)
        fork = .052*math.cos((t+abs(u)*.105)*math.tau*8) * (1-abs(u))*local
        height = crown*local*(.72-.68*u*u + rib + fork) + crown*.11*u*t
        pt = base + axis*t + across*side + Vector((0,0,height))
        return tuple(pt)

    shell(name,group,surface,28,12,max(.027,crown*.77))
    if veins:
        for i,t in enumerate((.24,.38,.52,.66,.78)):
            for sign in (-1,1):
                rib = []
                for s in (0,.27,.57,.83):
                    p = surface(t+.115*s,sign*s)
                    rib.append((*p[:2],p[2]+.004,max(.002,width*(.033-.023*s))))
                tube("Joining lateral vein %d"%i,group,rib,6,6)
        tube("Carved central midrib",group,[(*surface(t,0)[:2],surface(t,0)[2]+.01,width*(.047-.035*t))
                                                for t in (.04,.30,.55,.77,.96)],11,7)


def petal(name, root, angle, length, width, cup, twist, fold, scallop):
    base = Vector(root)
    f = Vector((math.cos(angle),math.sin(angle),0))
    c = Vector((-f.y,f.x,0))

    def surface(t,u):
        body = max(.005,math.sin(math.pi*t*.98))**(.62+.18*scallop)*(.59+.48*t)
        rim = 1+.075*math.sin(t*18+fold)*abs(u)**4
        spread = width*(u*body*rim + twist*t*t*.38)
        reach = length*t*(1-.072*u*u*math.sin(math.pi*t))
        lift = cup*(.12*math.sin(t*math.pi)+t*t*(.60+.29*math.sin(fold)) + .63*u*u*body)
        pleats = cup*.115*math.cos(u*9.8+t*3.2+fold)*body*(.30+.7*abs(u))
        lip = cup*(twist*u*t + .14*math.sin(u*7+fold)*t**4)
        return tuple(base+f*reach+c*spread+Vector((0,0,lift+pleats+lip)))

    return shell(name,flowers,surface,31,15,max(.056,cup*.68))


def bloom(name, root, scale, kind, turn):
    # Hellebore has one open uneven cup. The camellia spirals into an oblique inner crown.
    x,y,z = root
    rings = ((7,1,.37,.39,.0), (4,.49,.22,.30,.23)) if kind=="hellebore" else (
        (9,1,.40,.41,.0), (8,.70,.37,.53,.11), (6,.41,.32,.62,.23))
    for layer,(count,reach,width,cup,offset) in enumerate(rings):
        for i in range(count):
            a = turn + i*math.tau/count + offset + rng.uniform(-.11,.11)
            crown = z+scale*(.036+layer*.063)
            r = scale*(.13-.029*layer)
            petal(f"{name} · {'outer' if layer==0 else 'inner'} petal {i+1}",
                  (x+math.cos(a)*r,y+math.sin(a)*r,crown),a,
                  reach*scale*rng.uniform(.83,1.12),width*scale*rng.uniform(.89,1.12),
                  cup*scale*rng.uniform(.82,1.16),rng.uniform(-.27,.25),a+.7*layer,rng.uniform(.1,.8))
    center = (x-.05*scale,y+.026*scale,z+.155*scale)
    oval(name+" · pistil",flowers,center,(.161*scale,.14*scale,.11*scale))
    for i in range(29 if kind=="hellebore" else 21):
        a = i*2.399963 + turn
        r = (.06+.19*math.sqrt((i+1)/29))*scale
        h = (.245+.13*rng.random())*scale
        tip = (x+r*math.cos(a),y+r*math.sin(a),z+h)
        tube(name+" · curved filament",flowers,[(x+r*.25*math.cos(a),y+r*.25*math.sin(a),z+.12*scale,.023*scale),
                                                 (x+r*.65*math.cos(a+.16),y+r*.65*math.sin(a+.16),z+h*.74,.018*scale),
                                                 (*tip,.014*scale)],7,6)
        oval(name+" · anther",flowers,tip,(.044*scale,.029*scale,.029*scale),9,5)


def feather(name, group, start, end, width, crown, sweep=0, asym=.16, bars=21):
    base, tip = Vector(start),Vector(end)
    f = tip-base
    across = Vector((-f.y,f.x,0)).normalized()

    def surface(t,u):
        ovality = max(.006,math.sin(math.pi*t))**(.48 if bars>18 else .67)
        step = math.sin(t*bars*math.tau + .9*u)
        edge = (1+asym*u)*(1+.028*step*abs(u)**5)
        bow = sweep*math.sin(t*math.pi)*t
        quill = .028*math.exp(-u*u*82) * ovality
        rib = math.sin((t - .145*abs(u)) * bars*math.tau)**6 * abs(u)**.5
        engraving = .0105*rib*ovality*(1-.43*abs(u))
        height = crown*ovality*(.94-.62*u*u) + quill - engraving + .022*u*t
        return tuple(base+f*t+across*(bow+u*width*ovality*(.69+.34*t)*edge)+Vector((0,0,height)))

    return shell(name,group,surface,max(29,bars*3),17,max(.052,crown+.034))


def bird_frame(center,angle):
    c = math.cos(angle)
    s = math.sin(angle)
    return lambda x,y,z:(center[0]+x*c-y*s,center[1]+x*s+y*c,z)


def loft(name, group, frame, sections, texture=False):
    profile = [Vector(s[:4]) for s in sections]
    radii = [Vector((0,0,0,s[4])) for s in sections]
    vertices = []
    rows, cols = 79,48
    for i in range(rows+1):
        t=i/rows
        # Four interpolated components and a separate depth radius.
        x,y,z,ry = spline(profile,t)
        rz = spline(radii,t)[3]
        for j in range(cols):
            a=math.tau*j/cols
            crest = max(0,math.sin(a))
            scallop = .008*math.cos(t*math.tau*16+2.1*math.cos(a))*math.cos(a*13+t*2) if texture else 0
            vertices.append(frame(x,y+max(.007,ry)*math.cos(a),z+max(.007,rz)*math.sin(a)+crest*scallop))
    faces = [(i*cols+j,i*cols+(j+1)%cols,(i+1)*cols+(j+1)%cols,(i+1)*cols+j)
             for i in range(rows) for j in range(cols)]
    faces.extend((tuple(range(cols-1,-1,-1)),tuple(range(rows*cols,(rows+1)*cols))))
    return mesh(name,group,vertices,faces)


def songbird(group, place, heading):
    at = bird_frame(place,heading)
    loft("Carved contour from rump, through breast, to crown",group,at,[
         (-1.08,-.09,.22,.014,.022),(-.91,-.075,.253,.19,.218),(-.63,-.04,.285,.33,.306),
         (-.26,-.031,.355,.455,.404),(.07,.010,.37,.407,.406),(.30,.087,.365,.275,.325),
         (.49,.176,.375,.306,.336),(.66,.185,.359,.315,.323),(.815,.145,.317,.233,.266),
         (.922,.117,.268,.107,.153),(.975,.114,.25,.025,.055)],True)
    loft("Upper mandible",group,at,[(.84,.116,.245,.132,.129),(.984,.124,.25,.104,.105),
          (1.123,.11,.232,.053,.061),(1.238,.074,.197,.002,.006)])
    loft("Lower mandible",group,at,[(.90,.036,.255,.064,.104),(1.013,.037,.245,.054,.078),
          (1.138,.055,.217,.031,.042),(1.219,.070,.197,.006,.009)])
    eye = at(.704,.236,.668)
    oval("Carved eye within the eyelid",group,eye,(.073,.071,.035),24,12)
    for start,stop,label in ((.19,3.21,"Upper eyelid"),(3.38,6.04,"Lower eyelid")):
        tube(label,group,[(*at(.704+math.cos(a)*.092,.236+math.sin(a)*.087,.660),.013)
                          for a in [start+(stop-start)*i/7 for i in range(8)]],19,7)
    tube("Fine brow separating the crown and cheek",group,[(*at(.47,.304,.662),.004),(*at(.60,.339,.679),.012),
        (*at(.736,.334,.652),.010),(*at(.805,.301,.600),.004)],18,7)
    for i in range(6):
        feather("Tapered rectrix %02d"%(i+1),group,at(-.74,-.077+.026*i,.37-.009*i),
                at(-1.69+.055*abs(i-2.5),-.15+.092*i,.093+.014*i),.092,.036,.036, .11,bars=15)
    for i in range(7):
        t=i/6
        feather("Cheek and throat feather",group,at(.415+.020*i,-.065-.034*i,.632-.014*i),
                at(.20+.018*i,-.108-.038*i,.621-.016*i),.033,.017,.012,bars=8)
    return at


def closed_wing(at):
    for i in range(9):
        t=i/8
        feather("Folded flight feather %02d"%(i+1),perched,at(.07-.37*t,.145-.27*t,.64+.061*math.sin(math.pi*t)),
                at(-1.14+.35*t,-.002-.24*t,.372+.12*t),.103-.016*t,.040,.078,bars=21)
    for row in range(3):
        for i in range(7-row):
            t=i/6
            feather("Folded wing covert",perched,at(.166-.079*row-.52*t,.255-.100*row+.025*math.sin(i),.595+.063*row),
                    at(-.133-.115*row-.60*t,.069-.104*row+.019*math.sin(i),.725-.022*t),
                    .081-.009*row,.031,.043,bars=12)


def talons(at):
    for i,x in enumerate((-.27,.03)):
        end=at(x+.024,-.638,.239-.011*i)
        tube("Tarsus from breast to bough",perched,[(*at(x,-.345,.405),.052),(*at(x-.11,-.48,.342),.042),
            (*end,.036)],15,10)
        for j,across in enumerate((-.065,.003,.068)):
            tube("Grasping toe",perched,[(*end,.026),(*at(x+.115+across,-.662,.283-j*.029),.025),
                (*at(x+.204+across,-.702,.227-j*.018),.020),(*at(x+.199+across,-.744,.169),.005)],12,8)


def open_wings():
    # The far fan passes behind the ribcage. The near shoulder runs into one high wrist.
    rear = [(1.99,-.11,.09),(2.36,-.23,.10),(2.72,-.15,.12),(2.98,.045,.16),(3.18,.27,.18),
            (3.30,.49,.22),(3.34,.68,.24),(3.17,.88,.25)]
    for i,tip in enumerate(rear):
        feather("Far wing · flight feather %02d"%(i+1),flying,(1.33+.10*i,1.23-.061*i,.25+.025*i),tip,
                .133-.003*i,.068,-.13,bars=20)
    for i in range(6):
        feather("Far wing · staggered covert",flying,(1.39+.105*i,1.26-.046*i,.41),
                (1.72+.146*i,.55-.047*i,.315+.018*i),.104,.053,-.12,bars=13)
    tube("Near wing shoulder and carpal bend",flying,[(1.37,1.36,.558,.269),(1.63,1.86,.603,.244),
         (2.14,2.31,.592,.204),(2.59,2.61,.526,.125),(2.80,2.78,.429,.037)],42,18)
    tips=[(2.79,3.94,.15),(3.26,3.87,.238),(3.66,3.65,.24),(3.95,3.31,.255),(4.04,2.97,.235),
          (3.94,2.70,.24),(3.73,2.43,.28),(3.43,2.20,.31),(3.12,2.03,.35),(2.79,1.93,.395),
          (2.51,1.82,.455),(2.16,1.71,.47)]
    for i,tip in enumerate(tips):
        scale=i/(len(tips)-1)
        start=(2.668-1.098*scale,2.657-1.142*scale,.547+.073*scale)
        feather("Near wing · %s %02d"%("primary" if i<7 else "secondary",i+1),flying,start,tip,
                .238-.058*scale,.108-.034*scale,.16-.24*scale,bars=32 if i<7 else 26)
    for row in range(3):
        for i in range(8):
            t=i/7
            a=(1.44+1.16*t+.028*row,1.53+1.12*t+.052*row,.710-.133*t+.023*row)
            b=(1.84+1.18*t+.117*row,1.61+1.13*t+.109*row,.649-.150*t+.018*row)
            feather(("Lesser","Median","Greater")[row]+" covert on the shoulder",flying,a,b,
                    .107+.014*row,.056,.056,asym=.11,bars=16)


def landscape():
    tube("One bough, sweeping up to the perch",branches,[(-6.80,-3.38,-.072,.39),(-5.46,-2.45,.052,.32),
         (-4.07,-1.61,.105,.27),(-2.83,-.696,.173,.197),(-1.65,-.081,.149,.152),
         (-.46,.19,.108,.105),(.58,.47,.083,.061),(1.62,.81,.035,.009)],66,28,.19)
    tube("Fork winding back through the flowers",branches,[(-4.53,-1.97,.125,.167),(-3.86,-1.28,.165,.131),
         (-3.43,-.53,.104,.097),(-3.92,.17,.094,.066),(-4.49,.81,.038,.019)],34,17,.11)
    tube("Arching stem below the visitor",branches,[(-2.27,-.36,.167,.122),(-1.10,-.43,.095,.076),
         (.24,-.688,.062,.080),(1.49,-.837,.06,.073),(2.76,-.743,.105,.074),(3.69,-.32,.060,.047),
         (4.73,.416,.047,.031),(5.24,1.08,.033,.008)],53,16,.09)
    tube("Tendril folding over the back of the panel",traces,[(-4.12,-1.57,.036,.052),(-5.03,-.53,.032,.044),
         (-5.18,.62,.014,.045),(-4.53,1.48,.014,.033),(-3.68,2.08,.016,.023),(-3.02,2.83,.013,.017),
         (-3.08,3.49,.01,.006)],43,10)
    tube("Recessed stem rising across the far plane",traces,[(2.23,-.80,.022,.044),(3.7,-.62,.024,.032),
         (4.72,-.06,.03,.033),(5.29,1.46,.026,.031),(4.65,2.46,.015,.023),(3.93,2.69,.009,.011)],37,10)
    for start,end,w,c,b in [
        ((-5.46,-2.45,.15),(-6.64,-1.63,.07),.31,.22,-.17),((-4.81,-1.98,.15),(-4.93,-.77,.045),.23,.16,.15),
        ((-4.41,-1.70,.18),(-3.83,-2.75,.065),.35,.25,.22),((-3.77,-1.40,.21),(-2.70,-1.98,.06),.32,.24,.17),
        ((-3.40,-.53,.19),(-2.89,.43,.11),.25,.15,-.10),((-3.95,.21,.139),(-3.57,1.11,.053),.22,.13,.17),
        ((-2.40,-.49,.16),(-2.11,-1.58,.057),.235,.165,-.16),((-1.05,.08,.15),(-.81,-.63,.07),.17,.12,.15),
        ((.31,-.71,.10),(.96,-1.46,.036),.235,.18,-.11),((1.44,-.82,.12),(2.16,-1.32,.045),.25,.16,.11),
        ((2.76,-.74,.17),(2.73,-1.93,.074),.31,.23,.27),((3.43,-.48,.13),(4.53,-.91,.05),.28,.20,.19),
        ((4.15,.017,.1),(4.05,1.03,.037),.212,.12,-.17),((4.73,.416,.091),(5.46,.51,.027),.153,.082,.12)]:
        leaf("Leaf attached to the living bough",branches,start,end,w,c,b)
    for start,end,w in [
        ((-5.07,-.52,.024),(-6.23,.18,.004),.23),((-5.17,.51,.036),(-5.27,1.96,.006),.28),
        ((-4.69,1.29,.026),(-3.85,1.24,.005),.17),((-3.80,1.99,.028),(-4.37,2.97,.007),.214),
        ((-3.17,2.52,.023),(-2.38,2.80,.006),.15),((-3.018,3.06,.021),(-3.53,3.81,.003),.135),
        ((4.79,.14,.029),(5.76,.11,.009),.167),((5.16,1.04,.021),(5.76,1.83,.006),.18),
        ((5.12,1.78,.029),(4.25,1.54,.008),.203),((4.66,2.43,.03),(5.10,3.30,.008),.22)]:
        leaf("Shallow winter leaf impression",traces,start,end,w,.042,.08,True)
    tube("Hellebore stalk",branches,[(-4.03,-1.58,.14,.085),(-3.69,-1.11,.177,.070),(-3.61,-.75,.164,.063)],22,13)
    bloom("Open winter hellebore",(-3.65,-.75,.169),.73,"hellebore",.29)
    tube("Camellia stalk and small side shoot",branches,[(2.13,-.82,.093,.067),(2.55,-.62,.137,.087),
         (2.93,-.487,.151,.065)],24,12)
    bloom("Winter camellia",(2.96,-.48,.155),.642,"camellia",.92)
    for start,end,r in [((-4.25,.51,.085),(-4.59,1.02,.091),.118),
         ((-4.07,.35,.089),(-4.00,.78,.101),.088),((3.60,-.37,.10),(3.66,.147,.094),.113),
         ((4.20,.025,.091),(4.64,.078,.113),.08)]:
        tube("Small bud pedicel",branches,[(*start,r*.37),(*end,r*.21)],12,8)
        oval("Closed winter bud",flowers,end,(r*.88,r*1.24,r*.73),19,10)
    # Fine frost in broken lines; it follows the same sweep as the woody branches.
    for i in range(5):
        x=-5.74+i*.31
        y=.68+i*.46
        s=.13+i*.027
        tube("Rime incised along growth",traces,[(x,y,.004,.018),(x+s,y+.064,.015,.016),
             (x+s*2.2,y+.172,.006,.004)],10,6)


landscape()
perch = songbird(perched,(-1.65,.63),.16)
closed_wing(perch)
talons(perch)
songbird(flying,(1.47,1.28),math.pi+.10)
open_wings()

# The floor is a continuous cast. Authored forms intersect it and have no separate pedestal.
mesh("Plaster backing",wall_parts,[(-35,-29,0),(35,-29,0),(35,29,0),(-35,29,0)],[(0,1,2,3)],False)


def face(obj,target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()


def lamp(name,position,target,power,size,color):
    data=bpy.data.lights.new(name,"AREA")
    data.energy,data.size,data.color=power,size,color
    obj=bpy.data.objects.new(name,data)
    studio.objects.link(obj)
    obj.location=position
    face(obj,target)


lamp("Soft raking light from top left",(-5.5,5.7,5.2),(-.1,.45,0),2330,4.1,(1,.976,.932))
lamp("Open sky fill",(4,-3.2,8.3),(0,0,0),820,8.5,(.889,.934,1))
lamp("Reflection off the studio ceiling",(.4,.8,6.2),(0,0,0),420,8,(1,.99,.97))
camera_data=bpy.data.cameras.new("Registered elevation")
camera_data.type="ORTHO"
view=bpy.data.objects.new("Registered elevation",camera_data)
studio.objects.link(view)
scene.camera=view


def camera(center=(0,0), span=WIDTH):
    view.location=(*center,16)
    face(view,(*center,0))
    camera_data.ortho_scale=span


def shot(name,width,height,samples=48,denoise=True):
    scene.render.resolution_x=width
    scene.render.resolution_y=height
    scene.cycles.samples=samples
    scene.cycles.use_denoising=denoise and DENOISE
    scene.render.filepath=str(OUT/f"{name}.png")
    bpy.ops.render.render(write_still=True)


def raise_local(amount):
    for obj in art:
        for point in obj.data.vertices:
            x,y,z=point.co
            d=math.hypot((x+1.82)*.92,(y-.64)*1.11)
            fade=max(0,min(1,(2.20-d)/.88))
            fade=fade*fade*(3-2*fade)
            point.co.z=min(0,z)+max(0,z)*(REST+(1-REST)*amount*fade)
        obj.data.update()


def encode_pass(kind):
    mat=bpy.data.materials.new(kind)
    mat.use_nodes=True
    nodes, links=mat.node_tree.nodes, mat.node_tree.links
    geo=nodes.new("ShaderNodeNewGeometry")
    separate=nodes.new("ShaderNodeSeparateXYZ")
    emit=nodes.new("ShaderNodeEmission")
    if kind=="Height":
        links.new(geo.outputs["Position"],separate.inputs[0])
        scale=nodes.new("ShaderNodeMath")
        scale.operation="MULTIPLY"
        scale.inputs[1].default_value=1/MAX_DEPTH
        links.new(separate.outputs["Z"],scale.inputs[0])
        links.new(scale.outputs[0],emit.inputs["Color"])
    else:
        links.new(geo.outputs["Normal"],separate.inputs[0])
        rgb=nodes.new("ShaderNodeCombineXYZ")
        for axis in ("X","Y"):
            transform=nodes.new("ShaderNodeMath")
            transform.operation="MULTIPLY_ADD"
            transform.inputs[1].default_value=.5
            transform.inputs[2].default_value=.5
            links.new(separate.outputs[axis],transform.inputs[0])
            links.new(transform.outputs[0],rgb.inputs[axis])
        occlusion=nodes.new("ShaderNodeAmbientOcclusion")
        occlusion.samples=14
        occlusion.inputs["Distance"].default_value=.33
        links.new(occlusion.outputs["AO"],rgb.inputs["Z"])
        links.new(rgb.outputs[0],emit.inputs["Color"])
    links.new(emit.outputs[0],nodes["Material Output"].inputs["Surface"])
    return mat


camera()
scene.view_settings.view_transform="AgX"
scene.view_settings.look="AgX - Medium High Contrast"
if MODE=="draft":
    shot("draft",1020,675,18)
elif MODE=="review":
    scene.render.resolution_x,scene.render.resolution_y=1360,900
    scene.cycles.samples=56
    scene.cycles.use_denoising=DENOISE
    scene.render.filepath="//secret-winter-garden.png"
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"WINTER-A-Secret-Winter-Garden.blend"), compress=True)
    shot("01-complete-sculpture",1360,900,56)
    coordinates=[([point.co.z for point in obj.data.vertices],obj) for obj in art]

    def restore_cast():
        for values,obj in coordinates:
            for z,point in zip(values,obj.data.vertices):
                point.co.z=z
            obj.data.update()

    for name,amount in [("02-resting-wall",0),("03-local-lift-50",.5),("04-local-lift-100",1)]:
        restore_cast()
        raise_local(amount)
        shot(name,1360,900,48)
    restore_cast()
    for name,center,span in [("05-flight-feathers",(2.02,2.02),4.35),
          ("06-hellebore-details",(-3.66,-.77),2.43),("07-leaf-veins-gypsum",(-3.90,-1.67),3.10)]:
        camera(center,span)
        shot(name,1000,820,48)
elif MODE=="bake":
    scene.view_settings.view_transform="Raw"
    scene.view_settings.look="None"
    scene.view_layers[0].material_override=encode_pass("Height")
    scene.render.image_settings.color_depth="16"
    scene.render.image_settings.color_mode="BW"
    shot("garden-height-16",1360,900,5,False)
    scene.view_layers[0].material_override=encode_pass("Normals and occlusion")
    scene.render.image_settings.color_depth="8"
    scene.render.image_settings.color_mode="RGB"
    shot("garden-surface",1360,900,12,False)
else:
    raise ValueError(f"Unknown render mode {MODE!r}")
