"""Prepara a foto do casal: clareia levemente as sombras (mantendo o clima)
e gera a versão desfocada usada atrás do envelope.

Uso: python3 tools/foto.py [caminho/da/foto.jpg]
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter
from imgutil import IMG, FONTES

src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FONTES, 'casal-original.webp')
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float64) / 255
out = Image.fromarray(np.clip((0.012 + (a ** 0.80) * 0.988) * 255, 0, 255).astype(np.uint8))
out.save(os.path.join(IMG, 'casal.webp'), quality=86, method=6)
w, h = out.size
out.resize((300, int(300 * h / w)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(9)).save(
    os.path.join(IMG, 'casal-blur.webp'), quality=80, method=6)
print('ok: casal.webp, casal-blur.webp')
