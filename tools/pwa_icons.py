#!/usr/bin/env python3
"""Иконки приложения (PWA) из логотипа images/logo-icon.png.

Запускается вручную, результат лежит в репозитории (images/app/, apple-touch-icon.png):
    python3 tools/pwa_icons.py

Из логотипа берётся белая фигура и ставится на сплошной фиолетовый квадрат цвета логотипа:
  * icon-192/512.png      — «any»: фигура ~70% стороны;
  * maskable-192/512.png  — «maskable»: фигура в безопасной зоне (круг 80%), ~52% стороны;
  * apple-touch-icon.png  — 180×180, без прозрачности (iOS заливает прозрачное чёрным).
"""
import os
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'images', 'logo-icon.png')
BG = (111, 95, 140, 255)  # фиолетовый логотипа


def figure():
    # В логотипе фигура «вырезана» (прозрачная), по краям — светлые сглаженные пиксели.
    im = Image.open(SRC).convert('RGBA')
    big = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
    mask = Image.new('L', big.size, 0)
    px, mp = big.load(), mask.load()
    for y in range(big.height):
        for x in range(big.width):
            r, g, b, a = px[x, y]
            white = max(0, min(255, (min(r, g, b) - 95) * 255 // 160))
            mp[x, y] = max(255 - a, white * a // 255)
    # Убираем прозрачные углы вне «листа»: заливка от углов по светлой области.
    hard = mask.point(lambda v: 255 if v > 128 else 0)
    from PIL import ImageDraw
    for c in ((0, 0), (hard.width - 1, 0), (0, hard.height - 1), (hard.width - 1, hard.height - 1)):
        if hard.getpixel(c) == 255:
            ImageDraw.floodfill(hard, c, 100)
    outside = hard.point(lambda v: 255 if v == 100 else 0).filter(ImageFilter.MaxFilter(31))
    mask.paste(0, (0, 0), outside)
    # Оставляем только фигуру и «голову»: крупные связные области (без тонких линий по краю).
    import numpy as np
    from scipy import ndimage
    arr = np.array(mask)
    lab, n = ndimage.label(arr > 60)
    sizes = ndimage.sum(np.ones_like(arr), lab, range(1, n + 1))
    keep = [i + 1 for i, sz in enumerate(sizes) if sz >= 0.02 * sizes.max()]
    grown = ndimage.binary_dilation(np.isin(lab, keep), iterations=3)
    mask = Image.fromarray(np.where(grown, arr, 0).astype('uint8'))
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    box = mask.point(lambda v: 255 if v > 60 else 0).getbbox()
    return mask.crop(box)


def make(size, share, fig):
    out = Image.new('RGBA', (size, size), BG)
    w, h = fig.size
    k = size * share / max(w, h)
    m = fig.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    white = Image.new('RGBA', m.size, (255, 255, 255, 255))
    # фигура визуально тяжелее снизу-слева — небольшой сдвиг вверх
    out.paste(white, ((size - m.width) // 2, (size - m.height) // 2 - round(size * 0.01)), m)
    return out


fig = figure()
dst = os.path.join(ROOT, 'images', 'app')
os.makedirs(dst, exist_ok=True)
for s in (192, 512):
    make(s, 0.60, fig).save(os.path.join(dst, f'icon-{s}.png'), optimize=True)
    make(s, 0.50, fig).save(os.path.join(dst, f'maskable-{s}.png'), optimize=True)
make(180, 0.64, fig).convert('RGB').save(os.path.join(ROOT, 'apple-touch-icon.png'), optimize=True)
print('иконки: images/app/icon-192/512, maskable-192/512, apple-touch-icon.png')
