"""Pack the registered Cycles materials and responsive opening stills.

python tools/winter-v2/pack-secret-garden.py CYCLES_PASSES_DIR dist/assets/home
Inputs are garden-height-16.png and garden-surface.png, registered at 2720 × 1800.
The surface stores world XY normals in red/green and ambient occlusion in blue.
"""
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

source, target = map(Path, sys.argv[1:3])
target.mkdir(parents=True, exist_ok=True)
pass_size = (2720, 1800)
grid_size = (521, 345)
height = Image.open(source / "garden-height-16.png")
surface = Image.open(source / "garden-surface.png").convert("RGB")
if height.size != pass_size or surface.size != pass_size:
    raise ValueError("Use the registered 2720 × 1800 Cycles passes")
depth = np.asarray(height, dtype=np.float32)
if depth.ndim != 2 or depth.max() < 30000:
    raise ValueError("The height pass must retain 16-bit depth")

mesh_height = Image.fromarray(depth).resize(grid_size, Image.Resampling.BILINEAR)
np.rint(np.clip(np.asarray(mesh_height), 0, 65535)).astype("<u2").tofile(target / "secret-garden-depth.bin")

# Suppress AO sampling speckle while preserving the normal channels that carry the engraved feathers.
red, green, occlusion = surface.split()
surface = np.array(Image.merge("RGB", (red, green, occlusion.filter(ImageFilter.GaussianBlur(1.1)))))
# The stationary wall uses its own plaster shader. Pad the geometry mask for bilinear texture sampling.
footprint = Image.fromarray(np.uint8(depth > 62) * 255).filter(ImageFilter.MaxFilter(9))
surface[np.asarray(footprint) == 0] = (128, 128, 255)
Image.fromarray(surface).save(target / "secret-garden-light.webp", lossless=True, method=6)
normal_ao = surface.astype(np.float32) / 255

# Keep the resting posters registered to the browser camera and its day/night light field.
cover_x, cover_y = .14, .46
half_height = 9.6 * math.tan(math.radians(19))


def linear(rgb):
    return ((np.asarray(rgb, dtype=np.float32) / 255 + .055) / 1.055) ** 2.4


def smooth(start, end, values):
    t = np.clip((values - start) / (end - start), 0, 1)
    return t*t*(3-2*t)


def plaster_row(x, y, scale, rise, night):
    u = np.clip((x/(13.6*scale) + .5) * (pass_size[0]-1), 0, pass_size[0]-1.001)
    v = np.clip((.5-(y-rise)/(9*scale)) * (pass_size[1]-1), 0, pass_size[1]-1.001)
    ix, iy = u.astype(int), v.astype(int)
    fx, fy = (u-ix)[:, :, None], (v-iy)[:, :, None]
    cast = (normal_ao[iy,ix] * (1-fx) + normal_ao[iy,ix+1]*fx) * (1-fy) + (
        normal_ao[iy+1,ix] * (1-fx) + normal_ao[iy+1,ix+1]*fx) * fy
    vane = (cast[:,:,:2]*255 - 128) / 127
    nz = np.sqrt(np.maximum(.014, 1-np.sum(vane*vane,axis=2)))
    normal = np.dstack((vane*.04,nz))
    normal /= np.linalg.norm(normal,axis=2,keepdims=True)
    key = np.array((.91,.81,.60) if night else (-.79,.61,.88))
    key /= np.linalg.norm(key)
    wash = .982 + np.sin(x*.26+y*.071+.84)*.027
    pigment = linear((40,54,70) if night else (240,235,227))
    base = pigment*wash[:,:,None]
    footprint = 0
    reflected = 0
    if night:
        across = -.64*(x-.84)+.77*(y-.92)
        along = -.77*(x-.84)-.64*(y-.92)
        aperture = 1.75 + np.clip(along+3.6,0,8)*.13
        footprint = (1-smooth(.28*aperture,aperture,np.abs(across+.12))) * (.68+.32*(1-smooth(-5,4,along)))
        footprint *= smooth(-2.8,-.24,y)
        spill = np.exp(-((x+2.24)*.51)**2 - ((y-.41)*.55)**2)
        base += linear((174,196,225))*(.078+.076*spill+.39*footprint)[:,:,None]
        fill = np.array((-.49,.23,.841))
        reflected = .13*(np.maximum(0,normal@fill)-fill[2])
    response = (np.maximum(0,normal@key)-key[2]) * ((.65+.18*footprint) if night else .46)
    engraving = (vane@key[:2])*(.164 if night else .068)
    value = np.maximum(.36,1+response+reflected+engraving-(1-cast[:,:,2])*.041)
    linear_pixels = base*value[:,:,None]
    pixels = (1.055*np.maximum(linear_pixels,0)**(1/2.4)-.055)*255
    return np.uint8(np.rint(np.clip(pixels,0,255)))


def poster(width, height, night):
    aspect = width / height
    scale = min(1, aspect / 1.05)
    rise = .94 * (1 - scale)
    px = cover_x + ((np.arange(width) + .5) / width * 2 - 1) * half_height * aspect
    py = cover_y + (1 - (np.arange(height) + .5) / height * 2) * half_height
    pixels = np.empty((height,width,3),dtype=np.uint8)
    for start in range(0,height,120):
        x,y = np.meshgrid(px.astype(np.float32),py[start:start+120].astype(np.float32))
        pixels[start:start+120] = plaster_row(x,y,scale,rise,night)
    return Image.fromarray(pixels)


sizes = {
    "wide":(1920,1080), "wide-2x":(3840,2160),
    "portrait":(1056,1408), "portrait-2x":(2112,2816),
    "phone":(1152,2464),
}
for label, size in sizes.items():
    for night in (False,True):
        mode = "-night" if night else ""
        name = f"secret-garden{mode}-{label}.webp"
        poster(*size,night).save(target / name, quality=95, method=5)
        print(name, (target / name).stat().st_size, flush=True)
