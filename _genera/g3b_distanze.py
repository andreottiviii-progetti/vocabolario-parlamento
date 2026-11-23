r"""g3b - Dati della Tavola I della pagina dei partiti: la distanza tra le parole di PCI e DC, anno per anno, con DC e PSI
come confronto (Camera, 1948-1993).

FONTE E METODO (tutto letto dai file del progetto, sola lettura; nessun numero scritto a mano)
  serie anno per anno   risultati/h32_anno.csv (script 160 del progetto): distinguibilita' corretta dal rumore tra due
                        partiti, cioe' quanto bene le 5.000 parole piu' comuni rivelano se un deputato e' dell'uno o
                        dell'altro; valore = colonna «corretta» - 0,5 (0 = indistinguibili). Righe con vocabolario «tutte»
                        e tipo «partiti»; coppie DC-PCI e DC-PSI. Negli anni con due righe (cambio di legislatura) si
                        tiene quella con piu' oratori (n_a + n_b), la stessa regola della storia «dc-pci-come-dc-psi».
  scala 100             100 = media della distanza DC-PCI nelle legislature II-IV (1953-68), valori per legislatura di
                        risultati/rilettura_h32_h54/532_dcpci.csv (vocabolario «tutte»), la stessa base della storia
                        «distanza-dc-pci-fasi». Ogni valore si divide per questa base e si moltiplica per 100.
  media di tre anni     media dell'anno con quello prima e quello dopo, se ci sono (la stessa regola di G.media3 e della
                        funzione media3 delle storie); negli anni senza valore resta il vuoto.
  numeri del titolo     DC-PCI della VII legislatura (1976-79) da 532_dcpci.csv; DC-PSI degli anni 1962-63, il riferimento
                        fissato prima di misurare in H56d, dalla riga «riferimento principale» di risultati/h56_dc_psi.txt.
USCITA  dati/partiti/distanze.json
USO     python -I _genera/g3b_distanze.py   (non dipende da altri programmi del sito)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

COPPIE = [("PCI", "DC e PCI"), ("PSI", "DC e PSI")]


def main():
    leg = {int(r["leg"]): (float(r["d"]), float(r["se"])) for r in leggi_csv(os.path.join("rilettura_h32_h54", "532_dcpci.csv"))
           if r["vocabolario"] == "tutte"}
    base = sum(leg[n][0] for n in (2, 3, 4)) / 3
    scala = lambda v, c=1: None if v is None else round(v / base * 100, c)

    righe = [r for r in leggi_csv("h32_anno.csv") if r["vocabolario"] == "tutte" and r["tipo"] == "partiti" and r["a"] == "DC"]
    serie = []
    for b, nome in COPPIE:
        per_anno = {}
        for r in righe:
            if r["b"] != b:
                continue
            a, na, nb = int(r["anno"]), int(float(r["n_a"])), int(float(r["n_b"]))
            if a not in per_anno or na + nb > per_anno[a][0] + per_anno[a][1]:
                per_anno[a] = (na, nb, float(r["corretta"]) - 0.5)
        anni = list(range(min(per_anno), max(per_anno) + 1))
        v = [per_anno[a][2] if a in per_anno else None for a in anni]
        m3 = []
        for i, x in enumerate(v):
            vicini = [v[j] for j in (i - 1, i, i + 1) if 0 <= j < len(v) and v[j] is not None]
            m3.append(None if x is None else sum(vicini) / len(vicini))
        punti = [[a, scala(v[i]), scala(m3[i]), per_anno[a][0] if a in per_anno else None, per_anno[a][1] if a in per_anno else None,
                  None if v[i] is None else round(v[i], 5)] for i, a in enumerate(anni)]
        serie.append({"coppia": "DC-" + b, "nome": nome, "punti": punti})

    testo = open(os.path.join(RIS, "h56_dc_psi.txt"), encoding="utf-8", errors="replace").read()
    m = re.search(r"DC-PSI anni 1962-63 \(riferimento principale\): ([0-9.]+) \(([0-9.]+)\)", testo)
    if not m:
        raise SystemExit("h56_dc_psi.txt: manca la riga del riferimento DC-PSI 1962-63")
    rif = float(m.group(1))
    out = {
        "campi": ["anno", "valore", "media3", "oratori_dc", "oratori_altro", "distinguibilita"],
        "base": round(base, 6),
        "serie": serie,
        "legislature": {str(n): [scala(d, 3), scala(d - 1.96 * se, 3), scala(d + 1.96 * se, 3)] for n, (d, se) in sorted(leg.items())},
        "dc_psi_1962_63": scala(rif, 3),  # tre decimali: i numeri del titolo si arrotondano una volta sola, nella pagina
    }
    n = scrivi_json("partiti/distanze.json", out)
    print("distanze: %d serie, base %.5f, VII %.0f, DC-PSI 1962-63 %.0f (%d byte)" % (len(serie), base, out["legislature"]["7"][0], out["dc_psi_1962_63"], n), flush=True)


if __name__ == "__main__":
    main()
