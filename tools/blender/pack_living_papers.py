"""Format conversion of our Blender-rendered RGBA paper surfaces; requires Pillow."""
import sys
from pathlib import Path
from PIL import Image

source, output = map(Path, sys.argv[1:3])
output.mkdir(parents=True, exist_ok=True)
for index in range(6):
    Image.open(source / f'paper-{index}.png').convert('RGBA').save(output / f'paper-{index}.webp', quality=88, method=6)
