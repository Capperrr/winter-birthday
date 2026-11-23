"""Pack the registered Cycles passes for the first act's WebGL relief.

python tools/winter-v2/pack-secret-garden.py CYCLES_PASSES_DIR dist/assets/home
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

source, target = map(Path, sys.argv[1:3])
target.mkdir(parents=True, exist_ok=True)
pass_size = (1360, 900)
grid_size = (293, 195)
height = Image.open(source / "garden-height-16.png")
light = Image.open(source / "garden-surface.png").convert("RGB")
if height.size != pass_size or light.size != pass_size:
    raise ValueError("Cycles passes must share one registration")
height_values = np.asarray(height, dtype=np.float32)
if height_values.ndim != 2 or height_values.max() < 30000:
    raise ValueError("The height pass must retain 16-bit depth")
height = Image.fromarray(height_values).resize(grid_size, Image.Resampling.BILINEAR)
np.clip(np.rint(np.asarray(height)), 0, 65535).astype("<u2").tofile(target / "secret-garden-depth.bin")
light.save(target / "secret-garden-light.png", optimize=True)

normal_ao = np.asarray(light, dtype=np.float32) / 255
# Match the browser's opening camera and light field so boot and fallback share a frame.
cover_x, cover_y = .14, .46
half_height = 8.9 * math.tan(math.radians(19))


def linear(rgb):
    return ((np.asarray(rgb, dtype=np.float32) / 255 + .055) / 1.055) ** 2.4


def smooth(start, end, values):
    t = np.clip((values - start) / (end - start), 0, 1)
    return t*t*(3-2*t)


def poster(width, height, night):
    aspect = width / height
    scale = min(1, aspect / 1.05)
    rise = .94 * (1 - scale)
    px = cover_x + ((np.arange(width) + .5) / width * 2 - 1) * half_height * aspect
    py = cover_y + (1 - (np.arange(height) + .5) / height * 2) * half_height
    x, y = np.meshgrid(px.astype(np.float32), py.astype(np.float32))
    u = ((x/scale) / 13.6 + .5) * (pass_size[0]-1)
    v = (.5-((y-rise)/scale) / 9) * (pass_size[1]-1)
    visible = (u>=0)&(v>=0)&(u<pass_size[0]-1)&(v<pass_size[1]-1)
    u = np.clip(u, 0, pass_size[0]-1.001)
    v = np.clip(v, 0, pass_size[1]-1.001)
    ix, iy = u.astype(int), v.astype(int)
    fx, fy = (u-ix)[:, :, None], (v-iy)[:, :, None]
    cast = (normal_ao[iy,ix] * (1-fx) + normal_ao[iy,ix+1]*fx) * (1-fy) + (
        normal_ao[iy+1,ix] * (1-fx) + normal_ao[iy+1,ix+1]*fx) * fy
    vane = (cast[:,:,:2]*255 - 128) / 127
    nz = np.sqrt(np.maximum(.014, 1-np.sum(vane*vane,axis=2)))
    n = np.dstack((vane*.04,nz))
    n /= np.linalg.norm(n,axis=2,keepdims=True)
    key = np.array((.91,.81,.60) if night else (-.79,.61,.88))
    key /= np.linalg.norm(key)
    pore_x = np.mod(np.floor(x*118)*.1031,1)
    pore_y = np.mod(np.floor(y*118)*.11369,1)
    scatter = pore_x*(pore_y+19.19)+pore_y*(pore_x+19.19)
    grain = np.mod((pore_x+scatter)*(pore_y+scatter),1)-.5
    wash = .978 + np.sin(x*.26+y*.071+.84)*.038 + grain*.018
    pigment = linear((32,43,58) if night else (240,235,227))
    base = pigment*wash[:,:,None]
    footprint = 0
    if night:
        across = -.64*(x-.72)+.77*(y-.68)
        along = -.77*(x-.72)-.64*(y-.68)
        aperture = 1.45 + np.clip(along+3.6,0,8)*.112
        footprint = (1-smooth(.62*aperture,aperture,np.abs(across+.14))) * (.74+.26*(1-smooth(-5,4,along)))
        base += linear((174,196,225))*(.045+.54*footprint)[:,:,None]
    response = (np.maximum(0,n@key)-key[2]) * ((.70+.25*footprint) if night else .47)
    engraving = (vane@key[:2])*(.088 if night else .059)
    value = 1+(response+engraving-(1-cast[:,:,2])*.047)*visible
    pixels = (1.055*np.maximum(base*value[:,:,None],0)**(1/2.4)-.055)*255
    return Image.fromarray(np.uint8(np.rint(np.clip(pixels, 0, 255))), "RGB")


for label, size in (("wide", (1800,900)), ("portrait", (1050,1400)), ("phone", (720,1520))):
    for night in (False,True):
        mode = "-night" if night else ""
        poster(*size,night).save(target / f"secret-garden{mode}-{label}.webp", quality=92, method=6)
