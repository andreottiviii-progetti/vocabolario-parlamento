"""Affianca le schermate prima/dopo della revisione dei grafici (v9) in un'unica immagine per coppia.
Uso: python -I _genera/confronto_v9.py nome1 nome2 ...   (nomi dei file in _schermate/v9/prima e dopo, senza .png)
Le immagini vanno in _schermate/v9/confronti/."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).resolve().parent.parent / "_schermate" / "v9"
OUT = BASE / "confronti"
OUT.mkdir(exist_ok=True)
try:
    FONT = ImageFont.truetype("arialbd.ttf", 26)
except OSError:
    FONT = ImageFont.load_default()

for nome in sys.argv[1:]:
    a, b = Image.open(BASE / "prima" / f"{nome}.png").convert("RGB"), Image.open(BASE / "dopo" / f"{nome}.png").convert("RGB")
    gap, testa = 30, 44
    w, h = a.width + b.width + gap, max(a.height, b.height) + testa
    tela = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(tela)
    d.text((0, 6), "PRIMA", fill="#5C636D", font=FONT)
    d.text((a.width + gap, 6), "DOPO", fill="#D2281F", font=FONT)
    tela.paste(a, (0, testa))
    tela.paste(b, (a.width + gap, testa))
    d.line([(a.width + gap // 2, testa), (a.width + gap // 2, h)], fill="#C9CDD3", width=1)
    tela.save(OUT / f"{nome}.png")
    print(OUT / f"{nome}.png")
