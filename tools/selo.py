"""Gera o selo de cera (relevo iluminado em 3D, com monograma e ramos).

Uso:
  python3 tools/selo.py                      # azul-noite, "H&D"
  python3 tools/selo.py --cor 120,40,60      # bordô
  python3 tools/selo.py --texto "D&H" --cor 150,128,80
"""
import argparse
import math
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import gaussian_filter
from imgutil import IMG, RAIZ, smoothstep

ap = argparse.ArgumentParser()
ap.add_argument('--cor', default='30,48,78', help='cor da cera em R,G,B')
ap.add_argument('--texto', default='H&D', help='monograma')
ap.add_argument('--tamanho', type=int, default=480, help='lado da imagem final (px)')
ap.add_argument('--semente', type=int, default=11, help='muda o formato da borda')
args = ap.parse_args()

FONTE = os.path.join(RAIZ, 'assets', 'fonts', 'corinthia-latin-700-normal.woff2')
S = 1200
cor = tuple(int(c) for c in args.cor.split(','))
rng = np.random.default_rng(args.semente)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float64)
cx = cy = S / 2
r = np.hypot(xx - cx, yy - cy)
th = np.arctan2(yy - cy, xx - cx)

# contorno orgânico da cera
wob = np.zeros_like(th)
for k, amp in [(3, .018), (5, .014), (7, .010), (11, .007), (17, .004), (23, .003)]:
    wob += amp * np.cos(k * th + rng.uniform(0, 2 * np.pi))
for _ in range(4):
    c = rng.uniform(-np.pi, np.pi); w = rng.uniform(.10, .22); a = rng.uniform(.015, .035)
    wob += a * np.exp(-(np.angle(np.exp(1j * (th - c))) / w) ** 2)
dentro = 0.425 * S * (1 + wob) - r
alpha = smoothstep(-1.5, 1.5, dentro)

# relevo: borda arredondada, anel espremido e área prensada
lip = smoothstep(0, 0.07 * S, dentro) ** 0.6
h = 0.55 * lip
R1 = 0.315 * S
anel = np.exp(-((r - (R1 + 0.035 * S)) / (0.035 * S)) ** 2) * (0.25 + 0.08 * np.cos(5 * th + 1.3))
h += anel * lip
prensa = smoothstep(R1 + 0.012 * S, R1 - 0.012 * S, r)
h = h * (1 - prensa) + prensa * 0.30

# desenho gravado (fica em alto-relevo na cera)
img = Image.new('L', (S, S), 0)
dr = ImageDraw.Draw(img)
rb = R1 - 0.03 * S
dr.ellipse([cx - rb, cy - rb, cx + rb, cy + rb], outline=255, width=int(0.008 * S))
rd = R1 - 0.055 * S
for i in range(19):
    a = math.radians(212 + i * (116 / 18))
    px, py = cx + rd * math.cos(a), cy + rd * math.sin(a)
    rr = 0.0048 * S
    dr.ellipse([px - rr, py - rr, px + rr, py + rr], fill=255)


def folha(x, y, ang, L, W):
    pts = [(t * L, W * math.sin(math.pi * t) ** 0.9) for t in np.linspace(0, 1, 24)]
    pts += [(t * L, -W * math.sin(math.pi * t) ** 0.9) for t in np.linspace(1, 0, 24)]
    ca, sa = math.cos(ang), math.sin(ang)
    dr.polygon([(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in pts], fill=255)


rw = R1 - 0.095 * S
a0, a1 = math.radians(97), math.radians(166)
for lado in (-1, 1):
    angs = np.linspace(a0, a1, 60)
    pts = [((cx + rw * math.cos(a)) if lado < 0 else (cx - rw * math.cos(a)), cy + rw * math.sin(a)) for a in angs]
    dr.line(pts, fill=255, width=int(0.007 * S), joint='curve')
    for i in range(6):
        t = (i + 0.6) / 6.2
        a = a0 + (a1 - a0) * t
        x = (cx + rw * math.cos(a)) if lado < 0 else (cx - rw * math.cos(a))
        y = cy + rw * math.sin(a)
        tang = math.atan2(math.cos(a), -math.sin(a))
        if lado > 0:
            tang = math.pi - tang
        for k in (-1, 1):
            folha(x, y, tang + k * 0.75 * lado, 0.046 * S * (1 - 0.3 * t), 0.012 * S * (1 - 0.25 * t))
fonte = ImageFont.truetype(FONTE, int(0.25 * S))
bb = dr.textbbox((0, 0), args.texto, font=fonte)
dr.text((cx - (bb[2] - bb[0]) / 2 - bb[0], cy - (bb[3] - bb[1]) / 2 - bb[1] - 0.045 * S), args.texto, font=fonte, fill=255)
D = gaussian_filter(np.asarray(img).astype(np.float64) / 255.0, 0.0035 * S)
h = h + prensa * 0.16 * smoothstep(0.05, 0.75, D)
ruido = gaussian_filter(rng.standard_normal((S, S)), 0.004 * S) * 0.010 + gaussian_filter(rng.standard_normal((S, S)), 0.03 * S) * 0.05
h = gaussian_filter(h + ruido * lip, 0.0012 * S)

# iluminação (difusa + especular + oclusão)
gy, gx = np.gradient(h)
nx, ny, nz = -gx * S * 0.11, -gy * S * 0.11, np.ones_like(h)
ln = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2); nx /= ln; ny /= ln; nz /= ln
Lz = np.array([-0.55, -0.62, 0.56]); Lz /= np.linalg.norm(Lz)
Hv = (Lz + [0, 0, 1]) / np.linalg.norm(Lz + [0, 0, 1])
dif = np.clip(nx * Lz[0] + ny * Lz[1] + nz * Lz[2], 0, 1)
ndh = np.clip(nx * Hv[0] + ny * Hv[1] + nz * Hv[2], 0, 1)
spec = 0.85 * ndh ** 60 + 0.18 * ndh ** 9
ao = np.clip(1 - 2.2 * np.clip(gaussian_filter(h, 0.02 * S) - h, 0, None), 0.55, 1)
base = np.array(cor, float)
col = base[None, None] * (0.38 + 0.85 * dif[..., None]) * ao[..., None]
col += np.array((205, 215, 235))[None, None] * spec[..., None]
borda = (1 - lip)[..., None]
col = col * (1 - 0.25 * borda) + base[None, None] * 1.25 * 0.25 * borda
rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
out = Image.fromarray(rgba, 'RGBA').resize((args.tamanho, args.tamanho), Image.LANCZOS)
out.save(os.path.join(IMG, 'selo.webp'), quality=90, method=6)
print('ok: assets/img/selo.webp')
