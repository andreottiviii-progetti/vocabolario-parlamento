r"""Collegamento con «Prima Repubblica Tracker» (https://primarepubblica.net/): quali persone del sito hanno una scheda lì.

COSA FA  Per ogni persona del sito (dati/persone/indice.json) prende il codice Wikidata (QID) dalla tabella degli oratori
         del progetto e lo cerca nell'elenco del tracker. Se c'è, la persona è collegata.
         Scrive dati/persone/tracker.json: {"u": indirizzo del sito, "p": {id persona del sito: QID}}.
         js/persona.js costruisce il collegamento «u + # + QID»: il tracker apre da solo la scheda di quel QID
         (un indirizzo con #Q123... apre la scheda, poi la pagina si porta all'indirizzo /onorevole/nome/).
         Si usa il QID e non il nome nell'indirizzo perché il QID non cambia mai, il nome-indirizzo sì (se compare un omonimo).
FONTI    D:\vocabolario-parlamento\base_pulita\oratori\oratori_persone.csv   (colonne persona_id = QID, id_fonte = id del sito)
         data/elenco.json del progetto del tracker (solo lettura; chiave «persone»), percorso in un file locale non pubblicato
REGOLE   - abbinamento esatto per QID, e solo QID veri di Wikidata (Q e cifre): le schede del tracker senza QID (sigle S...)
           non si aprono da un indirizzo e restano fuori;
         - se il tracker conosce l'id della Camera di quella persona e non coincide con quello del sito, il collegamento
           si scarta (stesso QID ma due persone diverse nelle due fonti): nessun collegamento sbagliato è meglio di uno in meno.
Va lanciato dopo g3_sito.py (serve l'indice delle persone). Se il file del tracker non c'è, scrive una mappa vuota e lo dice.
"""
import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import BASE, DATI, scrivi_json, fine  # noqa

ORATORI = os.path.join(BASE, "base_pulita", "oratori", "oratori_persone.csv")
ELENCO_TRACKER = os.environ.get("ELENCO_TRACKER", "")  # percorso locale, non pubblicato
SITO_TRACKER = "https://primarepubblica.net/"


def main():
    ix = json.load(open(os.path.join(DATI, "persone", "indice.json"), encoding="utf-8"))
    ids_sito = [r[0] for r in ix["p"]]
    if not os.path.exists(ELENCO_TRACKER):
        print("ATTENZIONE: elenco del tracker non trovato, scrivo una mappa vuota:", ELENCO_TRACKER, flush=True)
        scrivi_json("persone/tracker.json", {"u": SITO_TRACKER, "p": {}})
        return
    tracker = {p["qid"]: p for p in json.load(open(ELENCO_TRACKER, encoding="utf-8"))["persone"]}

    qid_di = {}
    with open(ORATORI, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if r["id_fonte"] and r["persona_id"]:
                qid_di.setdefault(r["id_fonte"], set()).add(r["persona_id"])

    mappa, scartati_camera, senza_qid_vero, senza_qid = {}, [], 0, 0
    for pid in ids_sito:
        qs = qid_di.get(pid)
        if not qs:
            senza_qid += 1
            continue
        if len(qs) != 1:
            continue
        q = next(iter(qs))
        if q not in tracker:
            continue
        if not re.fullmatch(r"Q\d+", q):
            senza_qid_vero += 1
            continue
        id_cam = tracker[q].get("id_camera")
        if id_cam and pid.startswith("camera:p") and pid[len("camera:p"):] != str(id_cam):
            scartati_camera.append((pid, q))
            continue
        mappa[pid] = q

    n = scrivi_json("persone/tracker.json", {"u": SITO_TRACKER, "p": mappa})
    print("persone del sito: %d; con QID: %d; collegate al tracker: %d (%d QID diversi)" % (
        len(ids_sito), len(ids_sito) - senza_qid, len(mappa), len(set(mappa.values()))))
    print("scartate per id Camera diverso: %d %s" % (len(scartati_camera), scartati_camera))
    print("scartate perche' la scheda del tracker non ha un QID vero: %d" % senza_qid_vero)
    print("dati/persone/tracker.json: %d byte" % n)


if __name__ == "__main__":
    main()
    fine()
