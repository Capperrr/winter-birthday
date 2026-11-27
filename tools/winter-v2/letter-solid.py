"""Extrude Cormorant's glyph contours into a watertight mesh for render-plaster.py.

Requires fonttools and shapely >= 2.1 in the authoring environment.
Run with a static Cormorant Garamond TTF and an output JSON path.
"""
import json
import sys
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely import constrained_delaunay_triangles
from shapely.affinity import scale, translate
from shapely.geometry import Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union


class Outline(BasePen):
    def __init__(self, glyphs):
        super().__init__(glyphs)
        self.rings = []
        self.ring = []

    def _moveTo(self, point):
        self.ring = [point]

    def _lineTo(self, point):
        self.ring.append(point)

    def _qCurveToOne(self, control, end):
        start = self.ring[-1]
        for step in range(1, 11):
            t = step / 10
            self.ring.append(tuple((1-t)**2*a+2*(1-t)*t*b+t*t*c for a,b,c in zip(start,control,end)))

    def _curveToOne(self, left, right, end):
        start = self.ring[-1]
        for step in range(1, 13):
            t = step / 12
            self.ring.append(tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
                                   for a,b,c,d in zip(start,left,right,end)))

    def _closePath(self):
        if len(self.ring)>2:
            self.rings.append(self.ring)
        self.ring = []

    _endPath = _closePath


font = TTFont(sys.argv[1])
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
shapes = []
advance = 0
for letter in "WINTER":
    name = cmap[ord(letter)]
    pen = Outline(glyphs)
    glyphs[name].draw(pen)
    polygons = [Polygon(ring) for ring in pen.rings]
    positive = max(polygons,key=lambda p:p.area).exterior.is_ccw
    outside = unary_union([p.buffer(0) for p in polygons if p.exterior.is_ccw==positive])
    holes = unary_union([p.buffer(0) for p in polygons if p.exterior.is_ccw!=positive])
    shapes.append(translate(outside.difference(holes),xoff=advance))
    advance += font["hmtx"][name][0]+font["head"].unitsPerEm*.12

left = min(shape.bounds[0] for shape in shapes)
bottom = min(shape.bounds[1] for shape in shapes)
right = max(shape.bounds[2] for shape in shapes)
top = max(shape.bounds[3] for shape in shapes)
factor = 9.50/(right-left)
vertices, faces = [], []

for shape in shapes:
    solid = scale(translate(shape,xoff=-(left+right)/2,yoff=-(bottom+top)/2),factor,factor,origin=(0,0))
    for outline in ([solid] if solid.geom_type=="Polygon" else solid.geoms):
        outline = orient(outline,sign=1)
        points = {}
        def pair(point):
            xy = tuple(round(value,7) for value in point)
            if xy not in points:
                points[xy] = len(vertices)
                vertices.extend([(*xy,.018),(*xy,.236)])
            return points[xy]
        for triangle in constrained_delaunay_triangles(outline).geoms:
            a,b,c = [pair(p) for p in list(orient(triangle,1).exterior.coords)[:-1]]
            faces.extend([(c,b,a),(a+1,b+1,c+1)])
        for ring in (outline.exterior,*outline.interiors):
            indices = [pair(p) for p in list(ring.coords)]
            faces.extend((a,b,b+1,a+1) for a,b in zip(indices,indices[1:]))

Path(sys.argv[2]).write_text(json.dumps({"vertices":vertices,"faces":faces}))
