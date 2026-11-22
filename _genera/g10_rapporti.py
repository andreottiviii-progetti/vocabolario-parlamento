r"""g10 - Rapporti di lavoro per la redazione (scritti in _progetto/, cartella esclusa dal sito pubblico).

  COPERTURA.md        ogni esperimento che regge o regge in parte, e ogni smentita, con dove sta nel sito
                      (storie, percorsi, capitoli, home) e se ha una visualizzazione forte, piatta o assente.
                      Regola: «forte» = c'e' un grafico costruito dai dati (in una storia, un percorso o un capitolo);
                      «piatta» = c'e' solo una riga di tabella o un testo; «assente» = non compare da nessuna parte oltre l'indice.
  FRASI_SCARTATE.md   quante frasi ha tolto il filtro di qualita' (comune.frase_pulita) in ogni programma, con esempi,
                      e un controllo finale su tutte le frasi pubblicate in dati/.
USO     python -I _genera/g10_rapporti.py
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

PROG = os.path.join(SITO, "_progetto")
# percorsi e capitoli: quali ipotesi mostrano con un grafico costruito dai dati (vedi js/fascismo.js, lingue.js, risate.js, esteri.js)
PERCORSI = {"fascismo.html": r"^H18", "lingue.html": r"^H[789]$|^H8|^H9|^H7", "risate.html": r"^H20|^H13", "esteri.html": r"^H39|^H72|^H71|^H77|^H78|^H68"}


def main():
    E = json.load(open(os.path.join(DATI, "esperimenti.json"), encoding="utf-8"))
    S = json.load(open(os.path.join(DATI, "storie", "indice.json"), encoding="utf-8"))["storie"]
    graf_storia = {}
    for s in S:
        d = json.load(open(os.path.join(DATI, "storie", s["id"] + ".json"), encoding="utf-8"))
        graf_storia[s["id"]] = sum(1 for g in d["grafici"] if g.get("dati"))
    capitoli = []
    for f in glob.glob(os.path.join(DATI, "capitoli", "*.json")):
        if not f.endswith("indice.json"):
            capitoli.append(json.load(open(f, encoding="utf-8")))
    home = json.load(open(os.path.join(DATI, "home.json"), encoding="utf-8"))
    in_home = set(re.findall(r"cod=(H\w+)", " ".join(home.get("breve", [])))) | {x["cod"] for x in home.get("smentite_txt", [])}
    righe = []
    conta = {"forte": 0, "piatta": 0, "assente": 0}
    for e in E["elenco"]:
        if e["esito"] not in ("regge", "in parte", "smentita"):
            continue
        base = re.match(r"H\d+", e["cod"]).group(0) if re.match(r"H\d+", e["cod"]) else e["cod"]
        st = [s for s in S if e["cod"] in (s.get("ipotesi") or []) or base in (s.get("ipotesi") or [])]
        pe = [p for p, rx in PERCORSI.items() if re.search(rx, e["cod"])]
        ca = [c for c in capitoli if e["cod"] in (c.get("ipotesi") or []) or base in (c.get("ipotesi") or [])]
        forte = any(graf_storia.get(s["id"], 0) for s in st) or bool(pe)
        vis = "forte" if forte else ("piatta" if st or ca else "assente")
        conta[vis] += 1
        dove = []
        if st:
            dove.append("storie: " + ", ".join(s["id"] for s in st[:3]))
        if pe:
            dove.append("percorso: " + ", ".join(pe))
        if ca:
            dove.append("capitoli: " + ", ".join(str(c["n"]) for c in ca))
        dove.append("esperimento.html?cod=" + e["cod"])
        vista = "dalla home" if (e["cod"] in in_home or base in in_home or ca) else ("a un clic (storia o percorso)" if st or pe else "solo dall'indice")
        righe.append("| %s | %s | %s | %s | %s | %s |" % (e["cod"], e["titolo"].replace("|", "/"), e["esito"], "; ".join(dove), vista, vis))
    testo = ["# Copertura dei risultati nel sito", "",
             "Generato da `_genera/g10_rapporti.py` (si rifà da solo). Righe: ogni esperimento con esito regge, in parte o smentita.",
             "Visualizzazione: **forte** = grafico costruito dai dati (storia, percorso o capitolo); **piatta** = solo testo o tabella; **assente** = solo l'indice degli esperimenti.", "",
             "Conti: forte %(forte)d, piatta %(piatta)d, assente %(assente)d." % conta, "",
             "| Codice | Risultato | Esito | Dove sta nel sito | Quanto è visibile | Visualizzazione |", "|---|---|---|---|---|---|"] + righe
    open(os.path.join(PROG, "COPERTURA.md"), "w", encoding="utf-8").write("\n".join(testo) + "\n")
    # frasi scartate
    tot, esempi = 0, []
    parti = []
    for nome, f in (("schede delle parole (g4)", "scartate_g4.json"), ("percorsi: risate, insulti, francese, esteri, partiti (g8)", "scartate_g8.json"), ("archivio delle prime volte (g9)", "scartate_g9.json")):
        p = os.path.join(CACHE, f)
        if os.path.exists(p):
            d = json.load(open(p, encoding="utf-8"))
            tot += d["n"]
            parti.append("- %s: %d frasi tolte" % (nome, d["n"]))
            esempi += [x if isinstance(x, str) else " · ".join(map(str, x)) for x in d["esempi"][:6]]
    # controllo finale: le frasi rimaste nei dati pubblicati
    restano = 0
    for f in glob.glob(os.path.join(DATI, "sezioni", "**", "*.json"), recursive=True):
        d = json.load(open(f, encoding="utf-8"))
        def giro(x):
            nonlocal restano
            if isinstance(x, list) and len(x) >= 5 and isinstance(x[-1], str) and len(x[-1]) > 40 and isinstance(x[0], str) and x[0][:2] in ("18", "19", "20"):
                if not frase_pulita(x[-1], francese="francese" in f):
                    restano += 1
            elif isinstance(x, list):
                for y in x:
                    giro(y)
            elif isinstance(x, dict):
                for y in x.values():
                    giro(y)
        giro(d)
    t = ["# Frasi scartate dal filtro di qualità", "", "Generato da `_genera/g10_rapporti.py`. Regole in `_genera/LEGGIMI.md` e in `comune.py` (funzione `frase_pulita`).", "",
         "In tutto: **%d** frasi tolte prima della pubblicazione." % tot, ""] + parti + ["", "Controllo finale sulle frasi dei percorsi pubblicati: %d ancora sotto la soglia." % restano, "", "## Esempi di frasi tolte", ""] + ["- «%s»" % x.replace("\n", " ")[:170] for x in esempi]
    open(os.path.join(PROG, "FRASI_SCARTATE.md"), "w", encoding="utf-8").write("\n".join(t) + "\n")
    print("copertura:", conta, "frasi scartate:", tot, "restano:", restano)
    fine()


if __name__ == "__main__":
    main()
