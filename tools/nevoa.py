"""Gera a textura de névoa (tileável na horizontal, com transparência).
Uso: python3 tools/nevoa.py
"""
import os
import numpy as np
from PIL import Image
from imgutil import IMG, smoothstep

W, H = 1600, 600


def fractal(beta, sx, sy, seed):
    r = np.random.default_rng(seed)
    fx = np.fft.fftfreq(W)[None, :] * sx
    fy = np.fft.fftfreq(H)[:, None] * sy
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    amp = 1 / f ** (beta / 2); amp[0, 0] = 0
    n = np.real(np.fft.ifft2(amp * np.exp(2j * np.pi * r.random((H, W)))))
    return (n - n.mean()) / n.std()


n = 0.75 * fractal(3.7, 2.8, 1.0, 1) + 0.35 * fractal(3.0, 2.0, 1.0, 2)
y = np.linspace(0, 1, H)[:, None]
a = (smoothstep(-0.3, 2.0, n) * smoothstep(0.0, 0.35, y) * smoothstep(1.0, 0.6, y) * 0.85) ** 1.25
rgba = np.zeros((H, W, 4), np.uint8)
rgba[..., 0], rgba[..., 1], rgba[..., 2] = 222, 231, 242
rgba[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(os.path.join(IMG, 'nevoa.webp'), quality=70, method=6, alpha_quality=60)
print('ok: assets/img/nevoa.webp')
