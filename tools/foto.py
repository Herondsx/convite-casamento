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
# versão desfocada: o desfoque fica "assado" na imagem (o CSS não aplica filtro),
# o que poupa a GPU do celular durante a animação de fundo
from PIL import ImageEnhance
bl = out.resize((480, int(480 * h / w)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(22))
ImageEnhance.Color(bl).enhance(1.1).save(os.path.join(IMG, 'casal-blur.webp'), quality=82, method=6)
# recorte pequeno para o selo postal do envelope (evita baixar a foto inteira na abertura)
st = out.crop((370, 642, 830, 1217)).resize((176, 220), Image.LANCZOS)
st = ImageEnhance.Brightness(ImageEnhance.Color(st).enhance(1.15)).enhance(1.15)
st.save(os.path.join(IMG, 'selo-postal.webp'), quality=84, method=6)
print('ok: casal.webp, casal-blur.webp, selo-postal.webp')
