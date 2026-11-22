r"""g2 - Scansione dei turni: prima volta, frasi vere, chi dice ogni parola, quali partiti.

FONTE E METODO
  - Testi: base_pulita/turni/*.parquet (98 archivi, sola lettura). Si contano gli stessi turni delle curve e di
    script/140_andamento_parola.py: lingua it, non esclusi dalle misure, non riassunti (indiretto), senza Presidente,
    segretari e voci collettive. Le parole sono le sequenze a-z di testo_misura (minuscolo, senza accenti).
  - Prima volta: per ogni parola del sito il primo turno (in ordine di data) a partire dal suo anno di partenza
    (vedi g1: prima comparsa stabile). La frase e' presa dal campo testo, che ha la stessa lunghezza di testo_misura.
  - Frasi vere: fino a 3 frasi brevi per parola nel suo anno di punta (scelte alla 1a, 7a, 40a, 200a, 1000a comparsa
    dell'anno nell'archivio, cosi' non vengono tutte dallo stesso dibattito).
  - Chi la dice: conteggi per oratore. Nella Repubblica l'oratore e' la persona riconosciuta dal progetto
    (misure/persone/turni_<archivio>.parquet: pid e partito); nel Regno e' il nome come scritto nel resoconto.
  - Partiti: conteggi per partito, solo Repubblica (stesso file delle persone).
  Ogni archivio scrive _genera/cache/scan/<archivio>.pkl: se il file c'e' gia' l'archivio si salta (il programma riparte
  da dove si era fermato). 3 processi.
USO     python -I _genera/g2_scansione.py            (tutti gli archivi)
        python -I _genera/g2_scansione.py camera_repubblica_07   (uno solo, per prova)
"""
import glob
import os
import pickle
import re
import sys
import time
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

SCAN = os.path.join(CACHE, "scan")
RE_PAROLA = re.compile(r"[a-z]+")
FINE_FRASE = re.compile(r"[.?!;:]\s")
CAMPIONI = {1, 7, 40, 200, 1000}
PROCESSI = 3


def frase(testo, tm, w):
    """Frase del testo originale attorno alla prima comparsa di w (parola intera) in tm."""
    m = re.search(r"\b%s\b" % w, tm)
    if not m or len(testo) != len(tm):
        return None, None
    a, b = m.start(), m.end()
    forma = testo[a:b]
    ini = 0
    for x in FINE_FRASE.finditer(testo, 0, a):
        ini = x.end()
    f = FINE_FRASE.search(testo, b)
    fin = f.start() + 1 if f else len(testo)
    s = testo[ini:fin].strip()
    if len(s) > 280:
        da = max(ini, a - 130)
        a_ = min(fin, b + 130)
        sp = testo.find(" ", da)
        da = sp + 1 if 0 <= sp < a else da
        sp = testo.rfind(" ", b, a_)
        a_ = sp if sp > b else a_
        s = ("… " if da > ini else "") + testo[da:a_].strip() + (" …" if a_ < fin else "")
    s = re.sub(r"\s+", " ", s)
    return s, forma


def lavora(archivio):
    import numpy as np
    import pyarrow.parquet as pq
    from scipy import sparse
    dest = os.path.join(SCAN, archivio + ".pkl")
    if os.path.exists(dest):
        return archivio, "gia' fatto", 0
    t0 = time.time()
    with open(os.path.join(CACHE, "parole_leggero.pkl"), "rb") as f:
        L = pickle.load(f)
    parole, y0, picco = L["parole"], L["y0"], L["picco"]
    tidx = {w: i for i, w in enumerate(parole)}
    ramo = archivio.split("_")[0]
    pf = pq.ParquetFile(os.path.join(TURNI, archivio + ".parquet"))
    # persone e partiti (solo Repubblica)
    persone = {}
    pp = os.path.join(PERSONE, "turni_%s.parquet" % archivio)
    if os.path.exists(pp):
        tp = pq.read_table(pp, columns=["file", "n_turno", "pid", "partito"]).to_pandas()
        for fl, nt, pid, par in zip(tp.file, tp.n_turno, tp.pid, tp.partito):
            if pid or par:
                persone[(fl, int(nt))] = (pid or "", par or "")
    in_attesa = set(parole)
    trovate = {}
    frasi = defaultdict(list)
    conta_anno = Counter()
    per_anno = defaultdict(set)
    for i, w in enumerate(parole):
        per_anno[picco[i]].add(w)
    c_or = defaultdict(Counter)
    n_or = Counter()
    nomi_or = {}
    c_par = defaultdict(Counter)
    n_par = Counter()
    for rg in range(pf.num_row_groups):
        t = pf.read_row_group(rg, columns=["data", "file", "n_turno", "oratore", "ruolo", "lingua", "indiretto",
                                           "escludi_misure", "testo", "testo_misura"]).to_pylist()
        for r in t:
            if r["lingua"] != "it" or r["escludi_misure"] or r["indiretto"] or r["ruolo"] in ESCLUSI:
                continue
            tm = r["testo_misura"] or ""
            toks = RE_PAROLA.findall(tm)
            if not toks:
                continue
            data = r["data"] or ""
            try:
                anno = int(data[:4])
            except ValueError:
                continue
            pid, par = persone.get((r["file"], int(r["n_turno"] or 0)), ("", ""))
            orat = (r["oratore"] or "").strip()
            chiave = pid if pid else "%s:%s" % (ramo, orat)
            if not orat and not pid:
                chiave = ""
            if chiave:
                c_or[chiave].update(toks)
                n_or[chiave] += len(toks)
                nomi_or.setdefault(chiave, Counter())[orat] += 1
            if par:
                c_par[par].update(toks)
                n_par[par] += len(toks)
            s = set(toks)
            h = s & in_attesa
            if h:
                for w in h:
                    if anno >= y0[tidx[w]]:
                        fr, forma = frase(r["testo"] or "", tm, w)
                        trovate[w] = (data, r["file"], int(r["n_turno"] or 0), ramo, orat, pid, fr, forma)
                        in_attesa.discard(w)
            pa = per_anno.get(anno)
            if pa:
                h2 = s & pa
                for w in h2:
                    conta_anno[w] += 1
                    if conta_anno[w] in CAMPIONI and len(frasi[w]) < 3:
                        fr, forma = frase(r["testo"] or "", tm, w)
                        if fr and 50 <= len(fr) <= 300:
                            frasi[w].append((data, ramo, orat, pid, fr, forma))
        del t
    # matrici oratori x parole e partiti x parole (solo parole del sito)
    def matrice(cont):
        chiavi = list(cont)
        righe, col, val = [], [], []
        for i, k in enumerate(chiavi):
            for w, n in cont[k].items():
                j = tidx.get(w)
                if j is not None:
                    righe.append(i); col.append(j); val.append(n)
        m = sparse.csr_matrix((np.array(val, dtype=np.int32), (np.array(righe, dtype=np.int32), np.array(col, dtype=np.int32))),
                              shape=(len(chiavi), len(parole)))
        return chiavi, m
    or_k, OR = matrice(c_or)
    par_k, PAR = matrice(c_par)
    out = {"prime": trovate, "frasi": dict(frasi), "or_k": or_k, "or_n": [n_or[k] for k in or_k],
           "or_nome": {k: nomi_or[k].most_common(1)[0][0] for k in or_k}, "OR": OR,
           "par_k": par_k, "par_n": [n_par[k] for k in par_k], "PAR": PAR}
    tmp = dest + ".tmp"
    with open(tmp, "wb") as f:
        pickle.dump(out, f, protocol=4)
    os.replace(tmp, dest)
    return archivio, "fatto", time.time() - t0


def main():
    import pickle as pk
    os.makedirs(SCAN, exist_ok=True)
    leggero = os.path.join(CACHE, "parole_leggero.pkl")
    with open(os.path.join(CACHE, "parole_base.pkl"), "rb") as f:
        B = pk.load(f)
    with open(leggero, "wb") as f:
        pk.dump({"parole": B["parole"], "y0": B["y0"], "picco": B["picco"]}, f, protocol=4)
    del B
    archivi = [os.path.basename(p)[:-8] for p in glob.glob(os.path.join(TURNI, "*.parquet"))]
    if len(sys.argv) > 1:
        archivi = sys.argv[1:]
    archivi.sort(key=lambda a: -os.path.getsize(os.path.join(TURNI, a + ".parquet")))
    from concurrent.futures import ProcessPoolExecutor, as_completed
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=PROCESSI) as ex:
        fut = [ex.submit(lavora, a) for a in archivi]
        for k, f in enumerate(as_completed(fut)):
            a, esito, sec = f.result()
            print("%3d/%d %-32s %s %4.0f s (totale %4.0f s)" % (k + 1, len(archivi), a, esito, sec, time.time() - t0), flush=True)
    fine()


if __name__ == "__main__":
    main()
