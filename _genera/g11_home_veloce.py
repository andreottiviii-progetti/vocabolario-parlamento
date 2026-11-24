r"""Prepara i dati della home perché si carichino in fretta: un solo file piccolo invece di una trentina di file grandi.

PERCHE'  La home leggeva interi file che usa solo in minima parte: le curve delle parole stanno in pezzi da 330 KB
         dietro un indice da 738 KB, le risate in un file da 908 KB (la home usa 8 oratori e una tabella), la griglia
         dei partiti apre dodici schede, le lingue sono 137 KB per due piccole curve. Qui si ricavano UNA volta le
         sole cifre che servono e si mettono dentro dati/home.json, alla voce «veloce».
COSA FA  1. toglie da home.json le voci che nessun programma del sito legge più (temi, mappa_linee, picchi);
         2. aggiunge «veloce»: curve (conti grezzi) delle parole del confronto e delle coppie della home (le parole sono
            lette da js/home.js: PREDEF, PRONTI, COPPIE), tabella delle risate, due curve di lingue, parole nuove
            con il loro stato, griglia «A chi somiglia» (solo le legislature 13-18 e i partiti delle cinque righe).
FONTI    dati/parole/c/*.json (un pezzo per chiave: la scheda di curva contiene gia' forma, totale, picco e anno di partenza), sezioni/risate.json, sezioni/lingue.json, partiti/*.json,
         prime/senso.json, home.json: tutti già scritti dagli altri programmi. Nessun dato nuovo, nessun conto nuovo.
Va lanciato per ultimo (rifai_tutto.py lo fa). Se si rifà home.json da zero con g3_sito.py, rilanciarlo.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import DATI, SITO, scrivi_json, fine, chiave_pezzo, nome_pezzo, PEZZI_PAROLE  # noqa

LEGS = list(range(13, 19))  # legislature della griglia in home (d3.range(13, 19))
RIGHE_HOME = ["PCI", "PDS/DS/PD", "MSI", "AN", "FdI", "FI/PdL", "Lega", "M5S"]  # id delle cinque righe della home
TOGLI = ("temi", "mappa_linee", "picchi")  # voci di home.json che nessun file js legge


def leggi(rel):
    with open(os.path.join(DATI, rel), encoding="utf-8") as f:
        return json.load(f)


def parole_della_home():
    """Le parole che la home può mostrare senza che il lettore scriva nulla: lette da js/home.js, così non si dimenticano."""
    js = open(os.path.join(SITO, "js", "home.js"), encoding="utf-8").read()
    ws = []
    for nome in ("PREDEF", "PRONTI", "COPPIE"):
        m = re.search(r"const %s = (.+?);\s*$" % nome, js, re.M)
        if not m:
            raise SystemExit("home.js: non trovo %s" % nome)
        ws += re.findall(r'"([a-z]+)"', m.group(1))
    ws.append("io")  # settimo capitolo
    visti = []
    for w in ws:
        if w not in visti:
            visti.append(w)
    return visti


def main():
    H = leggi("home.json")
    H.pop("veloce", None)
    for k in TOGLI:
        H.pop(k, None)

    # ---- curve delle parole (conti grezzi: il resto lo calcola js/comune.js come per ogni parola)
    parole = parole_della_home()
    curve, cache = {}, {}
    for w in parole:
        k = chiave_pezzo(w, PEZZI_PAROLE)
        if k not in cache:
            cache[k] = leggi("parole/c/" + nome_pezzo(k))
        if w not in cache[k]:
            print("   attenzione: «%s» non ha la curva" % w)
            continue
        curve[w] = cache[k][w]  # [forma, totale, picco, anno di partenza, conti]

    # ---- risate: la tabella degli oratori e i periodi (non le 908 KB di frasi)
    R = leggi("sezioni/risate.json")
    risate = {"efficaci": R["efficaci"], "periodi": R["periodi"]}

    # ---- lingue: solo le due curve dei capitoli 1 e 2
    L = leggi("sezioni/lingue.json")
    lingue = {"francese": {"camera": L["francese"]["camera"]}, "regno": {"wps": {"camera": L["regno"]["wps"]["camera"]}}}

    # ---- parole nuove: stato e anno (basta per «neol.»), per le parole del confronto e quelle delle liste
    PS = leggi("prime/senso.json")
    voglio = set(parole) | {q[0] for q in H.get("nate", [])} | {q[0] for q in H.get("morte", [])}
    senso = {}
    for w in sorted(voglio):
        x = PS.get(w)
        if x:
            s = {"stato": x.get("stato")}
            if x.get("np"):
                s["np"] = True
            if x.get("nuova"):
                s["nuova"] = [str(x["nuova"][0])]
            senso[w] = s

    # ---- griglia «A chi somiglia»
    PIX = leggi("partiti/indice.json")
    fam = {p["id"]: p["famiglia"] for p in PIX["partiti"]}
    slug = {p["id"]: p["slug"] for p in PIX["partiti"] if p["id"] in RIGHE_HOME}
    S = {}
    for pid in RIGHE_HOME:
        if pid not in slug:
            continue
        sc = leggi("partiti/%s.json" % slug[pid])
        som = {}
        for L_ in LEGS:
            x = (sc.get("somiglianze") or {}).get(str(L_))
            if x:
                som[str(L_)] = {"altro_partito": x.get("altro_partito", [])}
        S[pid] = {"id": sc["id"], "somiglianze": som}
    griglia = {"fam": fam, "slug": slug, "S": S, "legs": LEGS}

    H["veloce"] = {"curve": curve, "risate": risate, "lingue": lingue, "senso": senso, "griglia": griglia}
    n = scrivi_json("home.json", H)
    print("   home.json: %d byte (voci tolte: %s; curve per %d parole)" % (n, ", ".join(TOGLI), len(curve)))
    fine()


if __name__ == "__main__":
    main()
