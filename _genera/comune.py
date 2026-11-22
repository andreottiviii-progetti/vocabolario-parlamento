r"""Funzioni comuni ai programmi che generano i dati del sito.

FONTE: i file del progetto in D:\vocabolario-parlamento (solo lettura: nessun programma qui scrive in quella cartella).
USCITA: D:\vocabolario-parlamento-sito\dati\ (JSON piccoli, ognuno sotto 2 MB) e _genera\cache\ (file intermedi, fuori dal sito).
"""
import csv
import json
import os
import sys

BASE = r"D:\vocabolario-parlamento"
RIS = os.path.join(BASE, "risultati")
TURNI = os.path.join(BASE, "base_pulita", "turni")
UNI = os.path.join(BASE, "misure", "parole", "unigrammi")
TOT = os.path.join(BASE, "misure", "parole", "totali")
PERSONE = os.path.join(BASE, "misure", "persone")
SITO = r"D:\vocabolario-parlamento-sito"
QUI = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(QUI, "cache")
DATI = os.path.join(SITO, "dati")
ANNI = list(range(1848, 2023))
ESCLUSI = ("presidente", "segretario", "collettivo")
LIMITE = 2_000_000  # byte: nessun file del sito oltre questa misura

ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII",
          "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"]

VUOTE = set("""che non per con una uno del della dei delle degli dello nel nella nei nelle sul sulla sui alla alle agli allo
dal dalla dai dalle sono stato stata stati essere anche come questo questa questi queste quello quella quelli quelle
piu ma se si ha hanno abbiamo avete mi ci vi lo la le li gli il un in di da su tra fra ed ad cui quale quali tutto tutti
tutta tutte molto poi cosi ancora gia solo dopo prima quando dove perche poiche mentre pero quindi cioe proprio
era erano fu sia stare fare fatto detto dire puo deve devono possono nostro nostra nostri nostre loro suo sua suoi sue
io noi voi egli essi lei ne e o a i dell nell dall sull all quel quanto siamo altro modo alcuni sarebbe credo allora
oggi parte altri anni fatti contro stesso stessa ogni senza sempre essa esso vostro vostra ciò quest""".split())


def leggi_csv(nome, cart=RIS):
    with open(os.path.join(cart, nome), encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def num(x, cifre=3):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    return round(v, cifre)


def scrivi_json(percorso_rel, oggetto):
    """Scrive un JSON compatto in dati/; si ferma se supera 2 MB."""
    p = os.path.join(DATI, percorso_rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    s = json.dumps(oggetto, ensure_ascii=False, separators=(",", ":"))
    b = s.encode("utf-8")
    if len(b) > LIMITE:
        raise SystemExit("FILE TROPPO GRANDE: %s (%d byte)" % (percorso_rel, len(b)))
    with open(p, "wb") as f:
        f.write(b)
    return len(b)


def fine():
    sys.stdout.flush()
    os._exit(0)
