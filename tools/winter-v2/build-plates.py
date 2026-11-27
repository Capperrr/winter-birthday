"""Prepare registered WebP plates from the commissioned source artwork.

Usage: python tools/winter-v2/build-plates.py EXTRACTED_PACK GENERATED_PLATES
Generated plates contains letter.png, childhood.png, studio.png, cosmos.png
and home-back.png. Published artwork and masks are already in dist/.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import distance_transform_edt

pack, generated = map(Path, sys.argv[1:])
source = pack / "01_scene_backgrounds"
output = Path("dist/assets/winter-v2")

# Coordinates measured in the source artwork, from upper left.
opening = [
    (.653,.391),(.657,.355),(.665,.316),(.676,.274),(.691,.241),(.716,.213),
    (.740,.202),(.763,.219),(.779,.245),(.789,.286),(.790,.330),(.780,.375),
    (.758,.407),(.720,.427),(.686,.424),(.665,.414)
]
arch = [
    (.476,.424),(.508,.381),(.533,.325),(.558,.290),(.574,.257),(.609,.245),
    (.640,.168),(.645,.134),(.665,.112),(.700,.148),(.727,.131),(.758,.109),
    (.800,.090),(.832,.062),(.854,.010),(.887,0),(1,0),(1,.339),
    (.941,.328),(.898,.383),(.837,.402),(.807,.460),(.747,.493),
    (.672,.476),(.606,.460),(.540,.468),(.496,.451)
]
falls_cliff = [
    (.406,.758),(.469,.758),(.523,.718),(.544,.659),(.591,.654),(.629,.647),
    (.677,.620),(.704,.555),(.751,.534),(.793,.513),(.828,.477),(.881,.426),
    (.931,.399),(.966,.342),(1,.336),(1,1),(.762,1),(.722,.903),(.623,.932),
    (.600,.878),(.521,.840),(.464,.820)
]
cliff = [
    (0,.367),(.057,.415),(.087,.447),(.122,.494),(.148,.506),(.204,.557),
    (.242,.579),(.258,.587),(.281,.592),(.319,.591),(.354,.608),(.373,.692),
    (.394,.713),(.406,.770),(.455,.821),(.498,.877),(.572,.936),(.635,1),(0,1)
]
canopy_area = [
    (0,0),(.717,0),(.710,.067),(.557,.126),(.529,.182),(.416,.214),(.367,.259),
    (.325,.318),(.269,.331),(.226,.394),(.189,.430),(.165,.525),(.113,.490),
    (.083,.440),(.008,.340),(0,.481)
]

def open_art(name):
    return Image.open(source / name).convert("RGB")

def imported(name):
    return Image.open(generated / (name + ".png")).convert("RGB")

def polygon(size, points, feather=1.7, holes=()):
    mask = Image.new("L", size)
    draw = ImageDraw.Draw(mask)
    def coords(shape):
        return [(round(x*size[0]), round(y*size[1])) for x,y in shape]
    draw.polygon(coords(points), fill=255)
    for hole in holes:
        draw.polygon(coords(hole), fill=0)
    return mask.filter(ImageFilter.GaussianBlur(feather))

def combine(*masks):
    return Image.fromarray(np.maximum.reduce([np.asarray(m) for m in masks]))

def alpha(img, mask):
    layer = img.convert("RGBA")
    layer.putalpha(mask)
    return layer

def write(group, name, img, quality=89):
    folder = output / group
    folder.mkdir(exist_ok=True, parents=True)
    img.save(folder / (name + ".webp"), quality=quality, method=5)

def extend_edges(img, mask, width=56):
    # Fill under the matte from adjacent pixels in the range reachable by the camera.
    # The physical subject remains the source photo above this reconstructed plate.
    pixels = np.asarray(img)
    inside = np.asarray(mask) > 132
    distance, nearest = distance_transform_edt(inside, return_indices=True)
    repaired = Image.fromarray(pixels[tuple(nearest)]).filter(ImageFilter.GaussianBlur(3.2))
    blend = np.clip((width-distance)/8,0,1) * np.minimum(distance / 3.0,1)
    return Image.composite(repaired, img, Image.fromarray((blend*255).astype("uint8")))

def scene(group, img, middle, near, *, profile_feather=3):
    middle_mask = polygon(img.size,middle,profile_feather)
    near_mask = polygon(img.size,near,profile_feather)
    write(group,"still",img)
    write(group,"far",extend_edges(img,combine(middle_mask,near_mask)))
    write(group,"middle",alpha(img,middle_mask))
    write(group,"near",alpha(img,near_mask))

output.mkdir(exist_ok=True, parents=True)
# Complete original plate remains available when depth effects are disabled.
hero = open_art("01_home_monumental_arch.webp")
new_distance = imported("home-back").resize(hero.size, Image.Resampling.LANCZOS)
arch_mask = polygon(hero.size,arch,4,[opening])
cliff_mask = polygon(hero.size,cliff,4)
figure_mask = polygon(hero.size,[(.246,.559),(.25,.54),(.268,.537),(.277,.514),(.294,.51),(.294,.533),(.298,.562),(.297,.595),(.259,.600)],2)
left_mask = combine(cliff_mask,figure_mask)
fall_mask = polygon(hero.size,falls_cliff,5)
canopy_roi = np.asarray(polygon(hero.size,canopy_area,3)) / 255
brightness = np.asarray(hero.convert("L"),dtype=float)
canopy = Image.fromarray((np.clip((111-brightness)/43,0,1)*canopy_roi*255).astype("uint8"))
union = combine(arch_mask,left_mask,fall_mask,canopy)
fill = union.point(lambda a: min(255,a*3)).filter(ImageFilter.MaxFilter(49)).filter(ImageFilter.GaussianBlur(11))
write("home","still",hero,92)
write("home","far",Image.composite(new_distance,hero,fill),92)
write("home","through",new_distance,92)
write("home","arch",alpha(hero,arch_mask),91)
write("home","cliff",alpha(hero,left_mask),90)
write("home","terraces",alpha(hero,fall_mask),90)
write("home","canopy",alpha(hero,canopy),89)
write("home","rock",hero.crop((1064,220,1114,328)).resize((160,280)),86)
write("home","alternative",open_art("01_home_alternative_dawn.webp"),90)
waterfall = polygon(hero.size,[(.814,.531),(.834,.511),(.848,.511),(.837,.585),(.811,.721),(.785,.751),(.796,.655)],7)
write("home","water",alpha(hero,waterfall))
(output/"home"/"arch-profile.json").write_text(json.dumps({"outer":arch,"opening":opening},separators=(",",":"))+"\n")

scene("about", open_art("02_about_forest_greenhouse.webp"),
      [(0,.00),(.24,0),(.21,.14),(.14,.22),(.16,.56),(.109,.71),(0,.70)],
      [(0,.61),(.14,.60),(.184,.69),(.219,.80),(.343,.95),(.36,1),(0,1)])
scene("letter", imported("letter"),
      [(.12,.59),(.221,.568),(.443,.561),(.495,.578),(.49,.674),(.44,.711),(.270,.729),(.144,.708)],
      [(0,.58),(.075,.637),(.124,.688),(.184,.747),(.259,.81),(.365,.896),(.421,1),(0,1)])
scene("unlock",Image.open(output.parent/"birthday-snow.webp").convert("RGB"),
      [(0,.39),(.076,.38),(.185,.42),(.284,.45),(.396,.51),(.546,.505),(.698,.454),(.823,.478),(1,.41),(1,1),(0,1)],
      [(0,.607),(.108,.646),(.216,.714),(.343,.763),(.49,.79),(.674,.81),(.86,.748),(1,.701),(1,1),(0,1)])
scene("cake",open_art("04_birthday_moonlit_mountains.webp"),
      [(0,.48),(.073,.504),(.186,.53),(.284,.537),(.368,.525),(.489,.545),(.56,.581),(.656,.59),(.78,.554),(.90,.548),(1,.564),(1,1),(0,1)],
      [(0,.654),(.085,.646),(.215,.757),(.333,.826),(.471,.888),(.581,.937),(.711,1),(0,1)])
scene("lake",open_art("05_two_countries_mist_lake.webp"),
      [(0,.275),(.09,.273),(.126,.244),(.173,.245),(.20,.309),(.262,.433),(.286,.503),(.416,.627),(.469,.724),(.477,.84),(0,.91)],
      [(0,.603),(.098,.676),(.211,.74),(.311,.772),(.435,.815),(.572,.91),(.627,1),(0,1)])
scene("journey",open_art("06_journey_cold_valley.webp"),
      [(0,.50),(.085,.452),(.193,.469),(.318,.579),(.465,.64),(.59,.636),(.715,.681),(.865,.617),(1,.643),(1,1),(0,1)],
      [(0,.615),(.134,.714),(.224,.701),(.361,.803),(.504,.845),(.644,.925),(.81,.967),(1,1),(0,1)])
scene("childhood",imported("childhood"),
      [(.118,.00),(.871,.00),(.868,.112),(.745,.137),(.707,.153),(.297,.133),(.166,.161),(.145,.869),(.860,.876),(.872,1),(.11,1)],
      [(0,0),(.105,0),(.12,.187),(.103,.563),(.11,.725),(.172,.989),(.246,1),(0,1)])
scene("studio",imported("studio"),
      [(.801,.023),(.898,.003),(1,0),(1,.771),(.83,.779),(.843,.601),(.825,.419),(.794,.307)],
      [(0,.631),(.07,.633),(.143,.697),(.221,.756),(.192,.87),(.12,1),(0,1)])
scene("closing",open_art("11_finale_blue_mist.webp"),
      [(0,.489),(.136,.491),(.25,.55),(.38,.624),(.529,.654),(.673,.72),(.812,.735),(1,.781),(1,1),(0,1)],
      [(0,.619),(.144,.689),(.27,.719),(.401,.804),(.565,.876),(.754,.923),(.896,.978),(1,1),(0,1)])

cosmos = imported("cosmos")
scene("cosmos",cosmos,
      [(.39,.46),(.508,.30),(.652,.22),(.746,.087),(.838,.031),(.95,.02),(1,.0),(1,.203),(.894,.265),(.801,.308),(.65,.382),(.50,.516),(.38,.55)],
      [(0,.587),(.062,.628),(.142,.741),(.238,.832),(.362,.88),(.529,.93),(.706,.94),(.875,.962),(1,1),(0,1)],profile_feather=15)

portrait = open_art("08_cosmos_galaxy_portrait.webp")
# The two meeting points in this plate are covered with neighbouring real sky.
# The registered transparent sprites are the only bright particles in the sequence.
pixels = np.asarray(portrait)
w,h=portrait.size
y,x=np.ogrid[:h,:w]
lights=(x/w>.29)&(x/w<.72)&(y/h>.31)&(y/h<.43)&(pixels[:,:,0]>121)&(pixels[:,:,0]>pixels[:,:,2]*1.19)
from scipy.ndimage import binary_dilation
lights=binary_dilation(lights,iterations=15)
mask=Image.fromarray((lights*255).astype("uint8")).filter(ImageFilter.GaussianBlur(6))
portrait=extend_edges(portrait,mask,width=150)
write("cosmos","portrait",portrait,91)
middle = polygon(portrait.size,[(.16,.33),(.29,.245),(.48,.15),(.64,.039),(.83,0),(1,0),(1,.215),(.73,.247),(.44,.305),(.26,.35)],16)
near = polygon(portrait.size,[(0,.544),(.09,.605),(.168,.705),(.262,.779),(.367,.808),(.439,.812),(.532,.89),(.68,.933),(.812,.964),(1,1),(0,1)],7)
write("cosmos","portrait-far",extend_edges(portrait,combine(middle,near)))
write("cosmos","portrait-middle",alpha(portrait,middle))
write("cosmos","portrait-near",alpha(portrait,near))

for variant, source_name, points in [
    ("wide","cinematic-cake-empty.webp",[(0,.838),(.10,.752),(.22,.724),(.43,.715),(.61,.702),(.77,.705),(1,.73),(1,1),(0,1)]),
    ("portrait","cinematic-cake-empty-portrait.webp",[(0,.868),(.08,.844),(.19,.822),(.39,.815),(.63,.811),(.85,.821),(1,.843),(1,1),(0,1)])
]:
    slate = Image.open(output.parent/source_name).convert("RGB")
    write("cake","slab-"+variant,alpha(slate,polygon(slate.size,points,8)))

for path in sorted((pack/"02_alpha_atmosphere").glob("*.png")):
    write("air",path.stem,Image.open(path).convert("RGBA"),83)
for path in sorted((pack/"03_story_elements").glob("cosmos_*.png")):
    write("air",path.stem,Image.open(path).convert("RGBA"),89)
(output/"lake"/"lake_ripple.svg").write_bytes((pack/"03_story_elements"/"lake_ripple.svg").read_bytes())
