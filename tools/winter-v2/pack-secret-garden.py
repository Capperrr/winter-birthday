"""Pack the registered Cycles passes for the first act's WebGL relief.

python tools/winter-v2/pack-secret-garden.py CYCLES_PASSES_DIR dist/assets/home
"""
import math
import runpy
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

wall = runpy.run_path(str(Path(__file__).with_name("render-wall-posters.py")))["render"]
normal_ao = np.asarray(light, dtype=np.float32) / 255
half_height = 13.7 * math.tan(math.radians(19))


def poster(width, height):
    aspect = width / height
    scale = min(1, aspect / 1.05)
    rise = .94 * (1 - scale)
    x = (((np.arange(width) + .5) / width * 2 - 1) * half_height * aspect) / scale
    y = (((1 - (np.arange(height) + .5) / height * 2) * half_height) - rise) / scale
    x, y = np.meshgrid(x, y)
    u = (x / 13.6 + .5) * (pass_size[0]-1)
    v = (.5-y / 9) * (pass_size[1]-1)
    visible = (u>=0)&(v>=0)&(u<pass_size[0]-1)&(v<pass_size[1]-1)
    u = np.clip(u, 0, pass_size[0]-1.001)
    v = np.clip(v, 0, pass_size[1]-1.001)
    ix, iy = u.astype(int), v.astype(int)
    fx, fy = (u-ix)[:, :, None], (v-iy)[:, :, None]
    cast = (normal_ao[iy,ix] * (1-fx) + normal_ao[iy,ix+1]*fx) * (1-fy) + (
        normal_ao[iy+1,ix] * (1-fx) + normal_ao[iy+1,ix+1]*fx) * fy
    xy = cast[:,:,:2] * 2 - 1
    contour = (xy[:,:,0]*-.57+xy[:,:,1]*.48)*3.9 - (1-cast[:,:,2])*5.1
    base = np.asarray(wall(width, height), dtype=np.float32)
    pixels = np.rint(base + (contour*visible)[:,:,None])
    return Image.fromarray(np.uint8(np.clip(pixels, 0, 255)), "RGB")


for label, size in (("wide", (1680,1120)), ("portrait", (1050,1400))):
    poster(*size).save(target / f"secret-garden-{label}.webp", quality=92, method=6)
