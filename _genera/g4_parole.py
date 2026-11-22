r"""g4 - Dati delle parole per il sito (indice, curve, schede) e riassunti della scansione per persone e partiti.

FONTE E METODO
  - _genera/cache/parole_base.pkl (g1: conteggi per parola, anno e ramo; anno di partenza; anno di punta; parole vicine).
  - _genera/cache/scan/*.pkl (g2: prima volta, frasi, conteggi per oratore e per partito, archivio per archivio).
  - Nomi delle persone: misure/persone/persona_partito_leg.parquet (Camera) e senato_gruppo_leg.parquet (Senato), se ci sono.
  - Chi la dice: per ogni archivio i 10 oratori che la dicono di piu', poi sommati su tutti gli archivi (gli oratori
    che non sono tra i primi 10 in nessun archivio restano fuori: e' una graduatoria dei principali).
  - Partiti (solo Camera della Repubblica: al Senato il progetto ha il gruppo, non il partito): volte per milione di parole del partito, sommando Camera e Senato e tutte le legislature;
    solo partiti con almeno 2 milioni di parole. Rapporto = per milione del partito / per milione di tutta l'aula repubblicana.
  - Parole tipiche di una persona o di un partito in un archivio: confronto con il resto dell'archivio
    (logaritmo del rapporto tra le due frequenze, con 0,5 aggiunto ai conteggi), solo parole dette almeno 8 volte
    dalla persona (20 dal partito), di almeno 4 lettere e non vuote.
USCITA  dati/parole/indice.json, dati/parole/c/NNN.json (conteggi), dati/parole/d/NNN.json (schede); _genera/cache/aggregati.pkl
USO     python -I _genera/g4_parole.py
"""
import glob
import json
import os
import pickle
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

import numpy as np

PEZZO = 400
SCARTATE = {"n": 0, "esempi": []}
SCAN = os.path.join(CACHE, "scan")


def nomi_persone():
    """pid -> 'Nome Cognome' dagli elenchi ufficiali gia' collegati dal progetto (Camera e Senato)."""
    import json as _json
    import pyarrow.parquet as pq
    nomi = {}
    p = os.path.join(PERSONE, "persona_partito_leg.parquet")
    t = pq.read_table(p, columns=["pid", "cognome", "nome"]).to_pandas()
    for pid, c, n in zip(t.pid, t.cognome, t.nome):
        if pid and pid not in nomi and (c or n):
            nomi[pid] = ("%s %s" % (n or "", c or "")).strip()
    t = pq.read_table(os.path.join(PERSONE, "itaparl_aggancio.parquet"), columns=["pid", "oratore"]).to_pandas()
    for pid, o in zip(t.pid, t.oratore):
        if pid and pid not in nomi and o:
            nomi[pid] = o
    sen = {}
    for f in glob.glob(os.path.join(BASE, "dati", "elenchi_parlamentari", "senato", "senatori_leg_*.json")):
        for b in _json.load(open(f, encoding="utf-8"))["results"]["bindings"]:
            u = b.get("sen", {}).get("value")
            if u and u not in sen:
                sen[u] = ("%s %s" % (b.get("nome", {}).get("value", ""), b.get("cognome", {}).get("value", ""))).strip()
    t = pq.read_table(os.path.join(PERSONE, "senato_gruppo_periodi.parquet"), columns=["pid", "sen"]).to_pandas()
    for pid, u in zip(t.pid, t.sen):
        if pid and pid not in nomi and u in sen and sen[u]:
            nomi[pid] = sen[u]
    return nomi


def tipiche(riga, tot, n_r, N, minimo, parole, k=15):
    c = riga
    altri = tot - c
    with np.errstate(divide="ignore", invalid="ignore"):
        sc = np.log((c + 0.5) / max(n_r, 1)) - np.log((altri + 0.5) / max(N - n_r, 1))
    ok = (c >= minimo) & BUONE
    sc = np.where(ok, sc, -99)
    idx = np.argpartition(-sc, k)[:k]
    idx = idx[np.argsort(-sc[idx])]
    return [[parole[j], int(c[j]), round(float(sc[j]), 2)] for j in idx if sc[j] > 0]


def main():
    global BUONE
    with open(os.path.join(CACHE, "parole_base.pkl"), "rb") as f:
        B = pickle.load(f)
    parole = B["parole"]
    P = len(parole)
    tidx = {w: i for i, w in enumerate(parole)}
    BUONE = np.array([len(w) >= 4 and w not in VUOTE for w in parole])
    nomi = nomi_persone()
    print("nomi di persone:", len(nomi), flush=True)
    prime = {}
    frasi = defaultdict(list)
    or_top = defaultdict(Counter)
    or_nome = {}
    par_cont = defaultdict(lambda: np.zeros(P, dtype=np.int64))
    par_tok = Counter()
    agg = {"archivi": {}}
    files = sorted(glob.glob(os.path.join(SCAN, "*.pkl")))
    print("archivi scansionati:", len(files), flush=True)
    for fp in files:
        arch = os.path.basename(fp)[:-4]
        with open(fp, "rb") as f:
            S = pickle.load(f)
        for w, v in S["prime"].items():
            k = (v[0], v[2])
            if w not in prime or k < (prime[w][0], prime[w][2]):
                prime[w] = v
        for w, v in S["frasi"].items():
            frasi[w].extend(v)
        OR = S["OR"].tocoo()
        if OR.nnz:
            o = np.lexsort((-OR.data, OR.col))
            col, row, dat = OR.col[o], OR.row[o], OR.data[o]
            inizio = np.r_[0, np.nonzero(np.diff(col))[0] + 1]
            rango = np.arange(len(col)) - np.repeat(inizio, np.diff(np.r_[inizio, len(col)]))
            sel = rango < 10
            for c_, r_, d_ in zip(col[sel], row[sel], dat[sel]):
                or_top[c_][S["or_k"][r_]] += int(d_)
        for kk, nm in S["or_nome"].items():
            or_nome.setdefault(kk, nm)
        # riassunti per archivio: oratori principali, parole tipiche di persone e partiti
        ORc = S["OR"].tocsr()
        tot = np.asarray(ORc.sum(axis=0)).ravel().astype(np.float64)
        N = float(sum(S["or_n"]))
        ordine = np.argsort(-np.array(S["or_n"]))
        principali = [[S["or_k"][i], S["or_n"][i]] for i in ordine[:25]]
        pers = {}
        for i, kk in enumerate(S["or_k"]):
            if S["or_n"][i] >= 3000 and ":p" in kk:
                riga = ORc.getrow(i).toarray().ravel().astype(np.float64)
                pers[kk] = {"n": S["or_n"][i], "tip": tipiche(riga, tot, S["or_n"][i], N, 8, parole, 15)}
        PARc = S["PAR"].tocsr()
        part = {}
        for i, kk in enumerate(S["par_k"]):
            if kk.isdigit():  # al Senato il partito e' il numero del gruppo: si usa solo la Camera
                continue
            riga = PARc.getrow(i).toarray().ravel()
            par_cont[kk] += riga
            par_tok[kk] += S["par_n"][i]
            if S["par_n"][i] >= 50000:
                part[kk] = {"n": S["par_n"][i], "tip": tipiche(riga.astype(np.float64), tot, S["par_n"][i], N, 20, parole, 20)}
        agg["archivi"][arch] = {"N": int(N), "principali": principali, "persone": pers, "partiti": part}
        print("  letto", arch, flush=True)
    agg["or_nome"] = or_nome
    agg["nomi"] = nomi

    def nome_or(kk):
        if kk in nomi:
            return nomi[kk]
        n = or_nome.get(kk, kk.split(":", 1)[-1])
        return n.title() if n.isupper() else n

    # partiti per parola
    tok_rep = sum(par_tok.values())
    tutti_rep = sum(par_cont.values()) if par_cont else np.zeros(P)
    grandi = [p for p in par_tok if par_tok[p] >= 2_000_000 and p not in ("", "altro", "Misto")]
    # indice e pezzi
    M, tot = B["M"], B["tot"]
    y0, picco = B["y0"], B["picco"]
    indice = []
    pezzi_c, pezzi_d = defaultdict(dict), defaultdict(dict)
    for i, w in enumerate(parole):
        # forma con accenti dalla frase della prima volta e delle frasi
        forme = Counter()
        cand = ([prime[w][7]] if w in prime and prime[w][7] else []) + [x[5] for x in frasi.get(w, []) if x[5]]
        for fm in cand:
            fl = fm.lower()
            import unicodedata
            if "".join(ch for ch in unicodedata.normalize("NFD", fl) if unicodedata.category(ch) != "Mn") == w:
                forme[fl] += 1
        forma = w
        if forme:
            f0 = forme.most_common(1)[0][0]
            if f0 != w:
                forma = f0
        k = i // PEZZO
        # conteggi dall'anno di partenza
        cs = []
        for r in (0, 1):
            v = M[i, r].copy()
            v[: y0[i] - 1848] = 0
            nz = np.nonzero(v)[0]
            if len(nz):
                cs.append([int(nz[0] + 1848), v[nz[0]: nz[-1] + 1].tolist()])
            else:
                cs.append([])
        pezzi_c[k][w] = [cs[0], cs[1]]
        tot_i = int(sum(sum(x[1]) for x in cs if x))
        indice.append([w, forma if forma != w else 0, tot_i, picco[i], y0[i]])
        d = {}
        if w in prime:
            v = prime[w]
            fr_pv = v[6] or ""
            if fr_pv and not frase_pulita(fr_pv):
                SCARTATE["n"] += 1
                fr_pv = ""
            d["pv"] = [v[0], v[3], nome_or(v[5] or "%s:%s" % (v[3], v[4])) if (v[5] or oratore_valido(v[4])) else "", v[5] or "", fr_pv]
        if B["prima_sparse"][i]:
            d["sp"] = [B["prima_sparse"][i], B["anni_sparsi"][i]]
        fr = sorted(frasi.get(w, []), key=lambda x: x[0])
        scelte, visti = [], set()
        for x in fr:
            if x[2] in visti:
                continue
            if not frase_pulita(x[4]):  # filtro di qualita' (comune.py, regole in LEGGIMI.md)
                SCARTATE["n"] += 1
                if len(SCARTATE["esempi"]) < 30:
                    SCARTATE["esempi"].append([x[0], x[4][:160]])
                continue
            visti.add(x[2])
            scelte.append([x[0], x[1], nome_or(x[3] or "%s:%s" % (x[1], x[2])), x[3] or "", x[4]])
            if len(scelte) == 3:
                break
        if scelte:
            d["fr"] = scelte
        if i in or_top:
            d["or"] = [[kk if ":p" in kk else "", nome_or(kk), n] for kk, n in or_top[i].most_common(14)
                       if kk and not kk.endswith(":") and "NON RICONOSCIUTO" not in kk and (":p" in kk or oratore_valido(nome_or(kk)))][:8]
        if grandi and tutti_rep[i] >= 20:
            base = tutti_rep[i] / tok_rep * 1e6
            pa = []
            for p in grandi:
                pm = par_cont[p][i] / par_tok[p] * 1e6
                pa.append([p, round(float(pm), 1), round(float(pm / base), 2) if base else None, int(par_cont[p][i])])
            pa.sort(key=lambda x: -x[1])
            d["pa"] = pa[:8]
        d["vi"] = [parole[j] for j in B["vicine"][i]]
        pezzi_d[k][w] = d
    n = 0
    for k, v in pezzi_c.items():
        n += scrivi_json("parole/c/%03d.json" % k, v)
    for k, v in pezzi_d.items():
        n += scrivi_json("parole/d/%03d.json" % k, v)
    n += scrivi_json("parole/indice.json", {"pezzo": PEZZO, "p": indice})
    print("parole:", len(indice), "byte:", n, "pezzi:", len(pezzi_c), flush=True)
    agg["par_tok"] = dict(par_tok)
    # per i temi della pagina partito (g8): conteggi di ogni parola per i partiti grandi e per tutta l'aula repubblicana
    agg["par_cont"] = {p: par_cont[p].astype(np.int64) for p in grandi}
    agg["tutti_rep"] = np.asarray(tutti_rep, dtype=np.int64)
    agg["tok_rep"] = int(tok_rep)
    agg["parole"] = list(parole)
    json.dump(SCARTATE, open(os.path.join(CACHE, "scartate_g4.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("frasi scartate dal filtro di qualita':", SCARTATE["n"], flush=True)
    with open(os.path.join(CACHE, "aggregati.pkl"), "wb") as f:
        pickle.dump(agg, f, protocol=4)
    for w in ("spread", "tangentopoli", "liberta", "aborto"):
        i = tidx[w]
        print(w, indice[i], pezzi_d[i // PEZZO][w].get("pv"), pezzi_d[i // PEZZO][w].get("or", [])[:3], pezzi_d[i // PEZZO][w].get("pa", [])[:3])
    fine()


if __name__ == "__main__":
    main()
