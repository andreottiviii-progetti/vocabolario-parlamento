r"""g1 - Elenco delle parole del sito e curve per anno.

FONTE E METODO
  - Conteggi: misure/parole/unigrammi/*.parquet (parola x anno x ramo), gli stessi dello strumento del progetto
    script/140_andamento_parola.py. Una parola e' una sequenza di lettere a-z nel testo minuscolo e senza accenti.
  - Denominatore: misure/parole/totali/*.parquet, con gli stessi filtri di 140 (lingua it, non escluse, non riassunti,
    senza Presidente, segretari e voci collettive). Per milione = occorrenze / parole del ramo e dell'anno x 1.000.000.
  - Parole del sito: tutte quelle con almeno 1.000 occorrenze in tutto (Camera + Senato, 1848-2022), di almeno 2 lettere.
  - Anno di partenza ("prima comparsa stabile", regola di script/91_prima_occorrenza.py portata sull'anno): il primo anno
    con almeno una occorrenza e almeno 3 occorrenze in quell'anno e nei due seguenti. Le comparse prima di quell'anno sono
    contate a parte (spesso sono errori di lettura dello scanner) e non entrano nella curva.
  - Anno di punta: massimo annuale della media dei due rami, solo anni con almeno 100.000 parole.
  - Parole vicine nel tempo: le 8 parole con la curva piu' simile (correlazione dei logaritmi della curva media di 3 anni).
USCITA  _genera/cache/parole_base.pkl (per g2 e g4)
USO     python -I _genera/g1_parole.py
"""
import glob
import os
import pickle
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

SOGLIA_PAROLA = 1000
SOGLIA_ANNO = 100_000


def totali():
    tot = np.zeros((2, len(ANNI)), dtype=np.int64)
    for f in sorted(glob.glob(os.path.join(TOT, "*.parquet"))):
        t = pq.read_table(f, columns=["ramo", "anno", "lingua", "ruolo", "indiretto", "escludi_misure", "n_token"]).to_pandas()
        t = t[(t.lingua == "it") & (~t.escludi_misure) & (~t.indiretto) & (~t.ruolo.isin(ESCLUSI))]
        g = t.groupby(["ramo", "anno"])["n_token"].sum()
        for (ramo, anno), n in g.items():
            if 1848 <= anno <= 2022:
                tot[0 if ramo == "camera" else 1, anno - 1848] += int(n)
    return tot


def main():
    os.makedirs(CACHE, exist_ok=True)
    tot = totali()
    print("parole contate:", tot.sum(), flush=True)
    parti = []
    for f in sorted(glob.glob(os.path.join(UNI, "*.parquet"))):
        t = pq.read_table(f, columns=["ramo", "anno", "parola", "n"]).to_pandas()
        t["ramo"] = (t["ramo"].astype(str) == "senato").astype(np.int8)
        t["parola"] = t["parola"].astype(str)
        parti.append(t[(t.anno >= 1848) & (t.anno <= 2022)])
    d = pd.concat(parti, ignore_index=True)
    del parti
    tp = d.groupby("parola")["n"].sum()
    tenute = tp[(tp >= SOGLIA_PAROLA) & (tp.index.str.len() >= 2) & tp.index.str.fullmatch(r"[a-z]+")]
    parole = sorted(tenute.index)
    idx = {w: i for i, w in enumerate(parole)}
    print("parole tenute:", len(parole), flush=True)
    d = d[d.parola.isin(idx)]
    g = d.groupby(["parola", "ramo", "anno"])["n"].sum().reset_index()
    M = np.zeros((len(parole), 2, len(ANNI)), dtype=np.int32)
    M[g.parola.map(idx).values, g.ramo.values, g.anno.values - 1848] = g.n.values
    # anno di partenza (prima comparsa stabile)
    somma = M.sum(axis=1)  # parole x anni
    tre = somma.copy()
    tre[:, :-1] += somma[:, 1:]
    tre[:, :-2] += somma[:, 2:]
    ok = (somma > 0) & (tre >= 3)
    y0 = np.where(ok.any(axis=1), ok.argmax(axis=1), 0)
    prima_sparse = np.array([int(somma[i, :y0[i]].sum()) for i in range(len(parole))])
    anni_sparsi = [[ANNI[k] for k in np.nonzero(somma[i, :y0[i]])[0][:6]] for i in range(len(parole))]
    # curve per milione (media dei rami), anni deboli = nan
    with np.errstate(divide="ignore", invalid="ignore"):
        pm = M / tot[None, :, :] * 1e6
    pm[:, tot < SOGLIA_ANNO] = np.nan
    for i in range(len(parole)):
        pm[i, :, :y0[i]] = np.where(np.isnan(pm[i, :, :y0[i]]), np.nan, 0)
    media = np.nanmean(pm, axis=1)
    # media mobile di 3 anni
    s = pd.DataFrame(media.T).rolling(3, center=True, min_periods=1).mean().values.T
    s = np.nan_to_num(s, nan=0.0)
    picco = np.nan_to_num(media, nan=0.0).argmax(axis=1)  # anno di punta: valore annuale
    # vicine nel tempo
    L = np.log1p(s)
    L = L - L.mean(axis=1, keepdims=True)
    nrm = np.linalg.norm(L, axis=1, keepdims=True)
    nrm[nrm == 0] = 1
    L = (L / nrm).astype(np.float32)
    vicine = []
    for a in range(0, len(parole), 2000):
        C = L[a:a + 2000] @ L.T
        for k in range(C.shape[0]):
            C[k, a + k] = -9
        top = np.argpartition(-C, 9, axis=1)[:, :9]
        for k in range(C.shape[0]):
            o = top[k][np.argsort(-C[k, top[k]])][:8]
            vicine.append([int(j) for j in o])
        print("  vicine", a, flush=True)
    base = {"parole": parole, "M": M, "tot": tot, "y0": [ANNI[k] for k in y0], "picco": [ANNI[k] for k in picco],
            "prima_sparse": prima_sparse.tolist(), "anni_sparsi": anni_sparsi, "vicine": vicine,
            "totale": [int(tenute[w]) for w in parole]}
    with open(os.path.join(CACHE, "parole_base.pkl"), "wb") as f:
        pickle.dump(base, f, protocol=4)
    for w in ("spread", "tangentopoli", "patria", "europa", "crisi", "computer"):
        if w in idx:
            i = idx[w]
            print(w, "totale", base["totale"][i], "partenza", base["y0"][i], "picco", base["picco"][i], "sparse prima", prima_sparse[i], anni_sparsi[i],
                  "vicine", [parole[j] for j in vicine[i]])
    fine()


if __name__ == "__main__":
    main()
