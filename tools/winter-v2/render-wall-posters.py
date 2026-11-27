"""Render the neutral Home plaster shown before the WebGL scene is ready."""
import math
from pathlib import Path

import numpy as np
from PIL import Image

out = Path(__file__).resolve().parents[2] / "dist/assets/home"
half_height = 13.7 * math.tan(math.radians(38 / 2))


def to_linear(srgb):
    return np.power((srgb + .055) / 1.055, 2.4)


def render(width, height):
    # Match the opening camera and wall shader in winter-relief-{wall,field}.js.
    x = (2 * (np.arange(width, dtype=np.float32) + .5) / width - 1) * half_height * width / height
    y = (1 - 2 * (np.arange(height, dtype=np.float32) + .5) / height) * half_height
    x, y = np.meshgrid(x, y)
    px = np.mod(np.floor(x * 118) * .1031, 1)
    py = np.mod(np.floor(y * 118) * .11369, 1)
    scramble = px * (py + 19.19) + py * (px + 19.19)
    grain = np.mod((px + scramble) * (py + scramble), 1) - .5
    wash = .978 + np.sin(x * .26 + y * .071 + .84) * .038 + grain * .018
    pigment = to_linear(np.array([238,235,230]) / 255)
    linear = wash[:, :, None] * pigment
    pixels = (1.055 * np.power(linear, 1 / 2.4) - .055) * 255
    return Image.fromarray(np.uint8(np.round(np.clip(pixels, 0, 255))), "RGB")


if __name__ == "__main__":
    for name, dimensions in (("wide", (1680,1120)), ("portrait", (1050,1400))):
        render(*dimensions).save(out / f"wall-{name}.webp", quality=91, method=6)
