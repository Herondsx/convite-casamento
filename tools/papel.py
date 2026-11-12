"""Gera as texturas de papel a partir da foto do papel em relevo.

Saídas (assets/img):
  papel-relevo.webp       região limpa, iluminação corrigida (envelope)
  papel-relevo-tile.webp  versão sem emendas, para repetir (cartões)
  forro-tile.webp         forro azul-noite com folhas "foil" prateadas

Uso: python3 tools/papel.py
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from imgutil import IMG, FONTES, smoothstep, min_cut_vertical

src = Image.open(os.path.join(FONTES, 'papel-original.webp')).convert('RGB')
a = np.asarray(src).astype(np.float64)
reg = a[1140:2000, 520:2000]          # uma única folha, sem bordas sobrepostas
L = reg.mean(axis=2)
low = gaussian_filter(L, 70, mode='reflect')
Lf = L / low * low.mean()             # corrige a iluminação
detail = Lf - gaussian_filter(Lf, 30, mode='reflect')   # só o relevo


def colorir(d, base, sombra, luz, ganho=1.0):
    d = d * ganho
    neg = np.clip(-d / 38.0, 0, 1)[..., None]
    pos = np.clip(d / 16.0, 0, 1)[..., None]
    base, sombra, luz = (np.array(c, float)[None, None] for c in (base, sombra, luz))
    out = base * (1 - neg) + sombra * neg
    out = out * (1 - pos) + luz * pos
    return np.clip(out, 0, 255).astype(np.uint8)


Image.fromarray(colorir(detail, (243, 240, 233), (176, 180, 190), (255, 254, 251), 1.05)).save(
    os.path.join(IMG, 'papel-relevo.webp'), quality=88, method=6)

# ---- versão sem emendas (corte de custo mínimo) ----
N, O = 720, 140
A = detail[0:N + O, 300:300 + N + O]


def emenda_h(A):
    esq, cont = A[:, 0:O], A[:, N:N + O]
    path = min_cut_vertical(gaussian_filter((esq - cont) ** 2, 1.5))
    T = A[:, :N].copy()
    w = smoothstep(-4, 4, np.arange(O)[None, :] - path[:, None])
    T[:, :O] = cont * (1 - w) + esq * w
    return T


tile = emenda_h(emenda_h(A).T).T
Image.fromarray(colorir(tile, (244, 241, 234), (178, 182, 192), (255, 254, 251))).save(
    os.path.join(IMG, 'papel-relevo-tile.webp'), quality=80, method=6)

# ---- forro: reconstrói a altura do relevo e pinta as folhas em "foil" ----
F = np.fft.fft2(tile - tile.mean())
fy = np.fft.fftfreq(N)[:, None]
fx = np.fft.fftfreq(N)[None, :]
e = smoothstep(3.2, 6.5, gaussian_filter(np.abs(tile), 3.2, mode='wrap'))
melhor = None
for ang in range(0, 360, 10):            # descobre a direção da luz da foto
    r = np.deg2rad(ang)
    k = 2j * np.pi * (fx * np.cos(r) + fy * np.sin(r))
    H = np.real(np.fft.ifft2(F * np.conj(k) / (np.abs(k) ** 2 + 1e-4)))
    H -= gaussian_filter(H, 25, mode='wrap')
    c = np.corrcoef(H.ravel(), e.ravel())[0, 1]
    if melhor is None or c > melhor[0]:
        melhor = (c, H)
Hn = gaussian_filter(melhor[1], 1.3, mode='wrap')
Hn /= Hn.std()
perto = smoothstep(1.2, 3.5, gaussian_filter(np.abs(tile), 7, mode='wrap'))
mask = gaussian_filter(smoothstep(0.55, 1.35, Hn) * perto, 0.7, mode='wrap')
h = gaussian_filter(mask, 1.6, mode='wrap')
gy, gx = np.gradient(h)
shade = np.clip(0.82 + (gx * -0.55 + gy * -0.75) * 9.0, 0.45, 1.3)
yy, xx = np.mgrid[0:N, 0:N] / N
t = (0.5 + 0.5 * np.sin(2 * np.pi * (xx + 2 * yy)))[..., None] * 0.55
base = np.array((15, 25, 41), float) * (1 - t) + np.array((25, 39, 61), float) * t
g = gaussian_filter(np.random.default_rng(7).standard_normal((N, N)), 0.7, mode='wrap')
base = base * (1 + 0.04 * g[..., None])
foil = np.array((178, 189, 204), float)[None, None] * shade[..., None]
mm = (mask * 0.78)[..., None]
Image.fromarray(np.clip(base * (1 - mm) + foil * mm, 0, 255).astype(np.uint8)).save(
    os.path.join(IMG, 'forro-tile.webp'), quality=82, method=6)
print('ok: papel-relevo.webp, papel-relevo-tile.webp, forro-tile.webp')
