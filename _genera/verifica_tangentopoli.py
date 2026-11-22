r"""Verifica: chi dice piu' volte «tangentopoli», contando per persona riconosciuta.

FONTE: base_pulita/turni (archivi della Repubblica dalla X alla XVIII, Camera e Senato) e misure/persone/turni_*.parquet
(persona di ogni intervento). Turni contati come nelle misure (lingua it, non esclusi, non riassunti, senza Presidente,
segretari e voci collettive). Si conta ogni comparsa della parola intera in testo_misura.
USO   python -I _genera/verifica_tangentopoli.py
"""
import glob, os, re, sys
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa
import pyarrow.parquet as pq
import pyarrow.compute as pc
import pickle

def main():
    conta, nomi_raw = Counter(), {}
    pat = re.compile(r"\btangentopoli\b")
    for ramo in ("camera", "senato"):
        for n in range(10, 19):
            arch = "%s_repubblica_%02d" % (ramo, n)
            f = os.path.join(TURNI, arch + ".parquet")
            if not os.path.exists(f):
                continue
            t = pq.read_table(f, columns=["file", "n_turno", "oratore", "ruolo", "lingua", "indiretto", "escludi_misure", "testo_misura"])
            t = t.filter(pc.match_substring(t["testo_misura"], "tangentopoli"))
            pers = {}
            pp = os.path.join(PERSONE, "turni_%s.parquet" % arch)
            if os.path.exists(pp):
                tp = pq.read_table(pp, columns=["file", "n_turno", "pid"]).to_pandas()
                pers = {(a, int(b)): c for a, b, c in zip(tp.file, tp.n_turno, tp.pid) if c}
            for r in t.to_pylist():
                if r["lingua"] != "it" or r["escludi_misure"] or r["indiretto"] or r["ruolo"] in ESCLUSI:
                    continue
                k = len(pat.findall(r["testo_misura"] or ""))
                pid = pers.get((r["file"], int(r["n_turno"] or 0)), "")
                chiave = pid or ("senza persona: " + (r["oratore"] or ""))
                conta[chiave] += k
                nomi_raw.setdefault(chiave, Counter())[r["oratore"]] += k
    nomi = pickle.load(open(os.path.join(CACHE, "aggregati.pkl"), "rb"))["nomi"]
    for k, v in conta.most_common(8):
        print("%-28s %-28s %4d   (nel resoconto: %s)" % (k, nomi.get(k, ""), v, dict(nomi_raw[k].most_common(3))))
    fine()

if __name__ == "__main__":
    main()
