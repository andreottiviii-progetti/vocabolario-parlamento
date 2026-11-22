r"""Rifà tutti i dati e le pagine del sito dalle fonti del progetto, poi fa i controlli prima della pubblicazione.

USO   python -I _genera/rifai_tutto.py            tutto (la scansione dei turni si rifà solo se i turni sono cambiati)
      python -I _genera/rifai_tutto.py --storie   solo storie e testi fissi (dopo una modifica in _progetto/)
      python -I _genera/rifai_tutto.py --da-capo  tutto, rifacendo anche la scansione dei turni (circa 10 minuti)
      oppure doppio clic su RIFAI_SITO.bat
Vedi LEGGIMI.md per l'elenco dei file del progetto da cui dipende ogni dato.
"""
import glob
import os
import re
import subprocess
import sys
import time

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
from comune import SITO, TURNI, CACHE, LIMITE, fine  # noqa

import codecs
# parole che non devono comparire nei file pubblici (scritte in rot13, cosi' non compaiono nemmeno qui)
PAROLE_VIETATE = [codecs.decode(w, "rot13") for w in ['pynhqr', 'naguebcvp', 'qnivqr', 'wbheany', 'snoyr', 'bchf', 'fbaarg', 'unvxh', 'erivfvbar_snoyr', 'fvgb_obmmr']]


NOMI_PROPRI_AMMESSI = {codecs.decode(w, "rot13") for w in ["qnivqr", "wbheany", "pynhqr", "bchf"]}  # nomi e parole latine o francesi dette in aula


def lancia(nome, *arg):
    t0 = time.time()
    print("== %s" % nome, flush=True)
    r = subprocess.run([sys.executable, "-I", os.path.join(QUI, nome)] + list(arg), cwd=SITO)
    if r.returncode != 0:
        print("ERRORE in %s: mi fermo" % nome, flush=True)
        fine()
    print("   fatto in %.0f s" % (time.time() - t0), flush=True)


def scansione_vecchia():
    scan = glob.glob(os.path.join(CACHE, "scan", "*.pkl"))
    if len(scan) < 98:
        return False  # mancano archivi: g2 riparte da dove si era fermato
    from comune import UNI
    fonti = glob.glob(os.path.join(TURNI, "*.parquet")) + glob.glob(os.path.join(UNI, "*.parquet"))
    return max(os.path.getmtime(p) for p in fonti) > min(os.path.getmtime(p) for p in scan)


def controlli():
    print("== controlli prima della pubblicazione", flush=True)
    esclusi = {"_progetto", "_schermate", ".git", "cache", "__pycache__"}
    grandi, vietate, senza_noindex = [], [], []
    totale = 0
    for radice, cartelle, files in os.walk(SITO):
        cartelle[:] = [c for c in cartelle if c not in esclusi]
        for f in files:
            p = os.path.join(radice, f)
            n = os.path.getsize(p)
            totale += n
            if n > LIMITE:
                grandi.append((p, n))
            if f.endswith((".html", ".js", ".json", ".css", ".csv", ".txt", ".md", ".yml")) and not f.startswith("d3.min"):
                t = open(p, encoding="utf-8", errors="replace").read().lower()
                nei_dati = os.sep + "dati" + os.sep in p or os.sep + "scarica" + os.sep in p
                for w in PAROLE_VIETATE:
                    # nei dati restano i nomi propri detti in aula (deputati che hanno quel nome di battesimo, parole inglesi nelle citazioni)
                    if nei_dati and w in NOMI_PROPRI_AMMESSI:
                        continue
                    if re.search(r"(?<![a-z])%s(?![a-z])" % re.escape(w), t):
                        vietate.append((p, w))
                if f.endswith(".html") and 'name="robots" content="noindex, nofollow"' not in t:
                    senza_noindex.append(p)
    print("   peso totale del sito: %.1f MB" % (totale / 1e6))
    print("   file oltre 2 MB:", grandi or "nessuno")
    print("   parole vietate:", vietate or "nessuna")
    print("   pagine senza noindex:", senza_noindex or "nessuna")
    return not grandi and not vietate and not senza_noindex


def main():
    a = sys.argv[1:]
    if "--storie" in a:
        lancia("g6b_tabelline.py")
        lancia("g6c_correzioni.py")
        lancia("g6_storie.py")
        lancia("g5_pagine.py")
    else:
        lancia("g1_parole.py")
        if "--da-capo" in a or scansione_vecchia():
            for p in glob.glob(os.path.join(CACHE, "scan", "*.pkl")):
                os.remove(p)  # file intermedi di questo programma, fuori dal progetto
        lancia("g2_scansione.py")
        lancia("g4_parole.py")
        lancia("g3_sito.py")
        lancia("g7_scansione2.py")
        lancia("g8_sezioni.py")
        lancia("g9_prime_volte.py")
        lancia("g6b_tabelline.py")
        lancia("g6c_correzioni.py")
        lancia("g6_storie.py")
        lancia("g5_pagine.py")
    ok = controlli()
    print("TUTTO A POSTO" if ok else "CI SONO PROBLEMI: guarda sopra", flush=True)
    fine()


if __name__ == "__main__":
    main()
