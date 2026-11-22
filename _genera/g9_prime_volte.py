r"""g9 - Archivio delle prime volte: tutte le parole dette almeno 10 volte e un elenco ragionato di espressioni.

FONTE E METODO (sola lettura in D:\vocabolario-parlamento)
  - Conteggi per parola, anno e ramo: misure/parole/unigrammi/*.parquet (gli stessi delle curve, turni contati: lingua it,
    non esclusi, non riassunti, senza Presidente, segretari e voci collettive). Entrano le parole con almeno 10 volte in tutto.
  - Prima comparsa stabile (regola di script/91_prima_occorrenza.py portata sull'anno, come per «spread»): il primo anno con
    almeno una occorrenza e almeno 3 nell'anno e nei due seguenti. Le prime 3 volte si cercano da quell'anno in poi.
    Se c'e' una comparsa piu' vecchia, si tiene a parte con l'avviso «probabile errore di lettura del testo stampato».
    Le parole che non arrivano mai a 3 volte in 3 anni non hanno una comparsa stabile: si mostrano le prime 3 volte grezze.
  - Le volte si cercano solo negli anni che servono (noti dai conteggi), nei turni di base_pulita/turni (sola lettura);
    oratore come scritto nel resoconto, persona e partito dove il progetto li conosce (misure/persone/turni_*.parquet).
  - Espressioni di piu' parole: l'elenco ragionato in _genera/espressioni.txt (non tutte le sequenze: sarebbero decine di
    milioni). Si contano come parola intera con spazio o trattino tra le parole (come script/140 e 91), negli stessi turni.
    Entrano quelle dette almeno 10 volte.
  - Curva per decennio: volte per decennio, Camera e Senato insieme (il sito divide per le parole del decennio).
USCITA  dati/prime/mappa.json, dati/prime/d/NNN.json (schede), dati/prime/s/<due lettere>.json (suggerimenti),
        dati/prime/espressioni.json; intermedi in _genera/cache/prime/
USO     python -I _genera/g9_prime_volte.py        (3 processi; riprende da dove si era fermato)
"""
import glob
import json
import os
import pickle
import re
import sys
import time
import unicodedata
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

DIR = os.path.join(CACHE, "prime")
SOGLIA = 10
PROCESSI = 3
FINE_FRASE = re.compile(r"[.?!;:]\s")
DECENNI = list(range(1840, 2030, 10))


def senza_accenti(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def espressioni():
    out = []
    for r in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "espressioni.txt"), encoding="utf-8"):
        r = r.strip()
        if not r or r.startswith("#"):
            continue
        p = re.findall(r"[a-z]+", senza_accenti(r))
        if len(p) >= 2:
            out.append((" ".join(p), r))
    return out


def schegge(testo, a, b, n=70):
    """Frase breve attorno a [a, b): al massimo n caratteri per parte, dentro la frase."""
    ini = 0
    for x in FINE_FRASE.finditer(testo, max(0, a - 400), a):
        ini = x.end()
    f = FINE_FRASE.search(testo, b, b + 400)
    fin = f.start() + 1 if f else min(len(testo), b + 400)
    da, al = max(ini, a - n), min(fin, b + n)
    if da > ini:
        sp = testo.find(" ", da, a)
        da = sp + 1 if sp >= 0 else da
    if al < fin:
        sp = testo.rfind(" ", b, al)
        al = sp if sp > b else al
    return (("… " if da > ini else "") + re.sub(r"\s+", " ", testo[da:al]).strip() + (" …" if al < fin else "")), testo[a:b]


def prepara():
    """Conteggi per parola e anno, anno stabile, anni da cercare."""
    import pyarrow.parquet as pq
    import pandas as pd
    parti = []
    for f in sorted(glob.glob(os.path.join(UNI, "*.parquet"))):
        t = pq.read_table(f, columns=["ramo", "anno", "parola", "n"]).to_pandas()
        t["ramo"] = t["ramo"].astype(str)
        t["parola"] = t["parola"].astype(str)
        parti.append(t[(t.anno >= 1848) & (t.anno <= 2022)])
    d = pd.concat(parti, ignore_index=True)
    tot = d.groupby("parola")["n"].sum()
    tenute = set(tot[(tot >= SOGLIA) & tot.index.str.fullmatch(r"[a-z]{2,}")].index)
    d = d[d.parola.isin(tenute)]
    g = d.groupby(["parola", "anno", "ramo"])["n"].sum().reset_index().sort_values(["parola", "anno"])
    info = {}
    cerca = defaultdict(set)  # (ramo, anno) -> parole
    for w, x in g.groupby("parola", sort=False):
        per_anno = x.groupby("anno")["n"].sum()
        anni = list(per_anno.index)
        cont = dict(per_anno)
        y0 = None
        for y in anni:
            if cont.get(y, 0) + cont.get(y + 1, 0) + cont.get(y + 2, 0) >= 3:
                y0 = y
                break
        partenza = y0 if y0 is not None else anni[0]
        finestra, c = [], 0
        for y in anni:
            if y < partenza:
                continue
            finestra.append(y)
            c += cont[y]
            if c >= 8:  # abbastanza volte per trovare frasi leggibili
                break
        grezza = anni[0] if anni[0] < partenza else None
        for y in finestra + ([grezza] if grezza else []):
            for r in x[x.anno == y].ramo:
                cerca[(r, int(y))].add(w)
        dec = [0] * len(DECENNI)
        for y, n in cont.items():
            dec[(int(y) - 1840) // 10] += int(n)
        info[w] = {"tot": int(tot[w]), "y0": y0, "partenza": int(partenza), "finestra": [int(y) for y in finestra],
                   "grezza": int(grezza) if grezza else None, "dec": dec}
    return info, dict(cerca)


def lavora(archivio):
    import pyarrow.parquet as pq
    import pyarrow.compute as pc
    dest = os.path.join(DIR, archivio + ".pkl")
    if os.path.exists(dest):
        return archivio, "gia' fatto", 0
    t0 = time.time()
    with open(os.path.join(DIR, "_cerca.pkl"), "rb") as f:
        cerca = pickle.load(f)
    ramo = archivio.split("_")[0]
    espr = espressioni()
    re_espr = re.compile(r"\b(" + "|".join(r"[\s\-]+".join(p.split()) for p, _ in sorted(espr, key=lambda x: -len(x[0]))) + r")\b")
    re2 = r"\b(" + "|".join(r"[\s\-]+".join(p.split()) for p, _ in espr) + r")\b"
    persone = {}
    pp = os.path.join(PERSONE, "turni_%s.parquet" % archivio)
    if os.path.exists(pp):
        tp = pq.read_table(pp, columns=["file", "n_turno", "pid", "partito"]).to_pandas()
        for fl, nt, pid, par in zip(tp.file, tp.n_turno, tp.pid, tp.partito):
            persone[(fl, int(nt))] = (pid or "", par or "")
    occ = defaultdict(list)       # parola -> [(data, n_turno, ramo, oratore, pid, partito, frase, forma)]
    e_conti = defaultdict(int)    # (espressione, anno) -> volte
    e_occ = defaultdict(list)
    pf = pq.ParquetFile(os.path.join(TURNI, archivio + ".parquet"))
    for rg in range(pf.num_row_groups):
        t = pf.read_row_group(rg, columns=["data", "file", "n_turno", "oratore", "ruolo", "lingua", "indiretto", "escludi_misure", "testo", "testo_misura"])
        ha_e = pc.match_substring_regex(t["testo_misura"], re2).to_pylist()
        for r, he in zip(t.to_pylist(), ha_e):
            if r["lingua"] != "it" or r["escludi_misure"] or r["indiretto"] or r["ruolo"] in ESCLUSI:
                continue
            data = r["data"] or ""
            try:
                anno = int(data[:4])
            except ValueError:
                continue
            tm, testo = r["testo_misura"] or "", r["testo"] or ""
            if len(tm) != len(testo):
                continue
            C = cerca.get((ramo, anno))
            pid, par = persone.get((r["file"], int(r["n_turno"] or 0)), ("", ""))
            orat = (r["oratore"] or "").strip()
            if C:
                toks = set(re.findall(r"[a-z]+", tm))
                for w in toks & C:
                    if len(occ[w]) < 8:
                        m = re.search(r"\b%s\b" % w, tm)
                        if m:
                            fr, fm = schegge(testo, m.start(), m.end())
                            occ[w].append((data, int(r["n_turno"] or 0), ramo, orat, pid, par, fr, fm))
            if he:
                for m in re_espr.finditer(tm):
                    k = " ".join(m.group(1).replace("-", " ").split())
                    e_conti[(k, anno)] += 1
                    if len(e_occ[k]) < 8:
                        fr, fm = schegge(testo, m.start(), m.end())
                        e_occ[k].append((data, int(r["n_turno"] or 0), ramo, orat, pid, par, fr, fm))
        del t
    out = {"ramo": ramo, "occ": dict(occ), "e_conti": dict(e_conti), "e_occ": dict(e_occ)}
    with open(dest + ".tmp", "wb") as f:
        pickle.dump(out, f, protocol=4)
    os.replace(dest + ".tmp", dest)
    return archivio, "fatto", time.time() - t0


def stabile(conti_anno):
    anni = sorted(conti_anno)
    for y in anni:
        if conti_anno.get(y, 0) + conti_anno.get(y + 1, 0) + conti_anno.get(y + 2, 0) >= 3:
            return y
    return None


def main():
    os.makedirs(DIR, exist_ok=True)
    pi = os.path.join(DIR, "_info.pkl")
    if not os.path.exists(pi) or not os.path.exists(os.path.join(DIR, "_cerca.pkl")):
        info, cerca = prepara()
        pickle.dump(cerca, open(os.path.join(DIR, "_cerca.pkl"), "wb"), protocol=4)
        pickle.dump(info, open(pi, "wb"), protocol=4)
        print("parole da almeno %d volte: %d; coppie ramo-anno da cercare: %d" % (SOGLIA, len(info), sum(len(v) for v in cerca.values())), flush=True)
    info = pickle.load(open(pi, "rb"))
    archivi = [os.path.basename(p)[:-8] for p in glob.glob(os.path.join(TURNI, "*.parquet"))]
    archivi.sort(key=lambda a: -os.path.getsize(os.path.join(TURNI, a + ".parquet")))
    from concurrent.futures import ProcessPoolExecutor, as_completed
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=PROCESSI) as ex:
        fut = [ex.submit(lavora, a) for a in archivi]
        for k, f in enumerate(as_completed(fut)):
            a, esito, sec = f.result()
            print("%3d/%d %-30s %s %4.0f s (totale %4.0f s)" % (k + 1, len(archivi), a, esito, sec, time.time() - t0), flush=True)
    # ----------------------------------------------------------------- unione
    nomi = {}
    ag = os.path.join(CACHE, "aggregati.pkl")
    if os.path.exists(ag):
        nomi = pickle.load(open(ag, "rb")).get("nomi", {})
    occ = defaultdict(list)
    e_conti = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    e_occ = defaultdict(list)
    for fp in glob.glob(os.path.join(DIR, "*_*.pkl")):
        if os.path.basename(fp).startswith("_"):
            continue
        S = pickle.load(open(fp, "rb"))
        for w, v in S["occ"].items():
            occ[w].extend(v)
        for (k, a), n in S["e_conti"].items():
            e_conti[k][a][0 if S["ramo"] == "camera" else 1] += n
        for k, v in S["e_occ"].items():
            e_occ[k].extend(v)

    scartate = {"n": 0, "esempi": []}

    def voce(o, controlla=True):
        data, nt, ramo, orat, pid, par, fr, fm = o
        nome = nomi.get(pid) or oratore_valido(orat, "", data[:4] if data[:4].isdigit() else None)
        if controlla and not frase_pulita(fr):
            scartate["n"] += 1
            if len(scartate["esempi"]) < 30:
                scartate["esempi"].append([data, fr[:160]])
            fr = ""
        return [data, ramo, nome, pid, par if par and not par.isdigit() else "", fr, fm]

    def scegli(v):
        """La prima volta (anche se il testo e' illeggibile: resta la data) e poi le prime volte con una frase pulita."""
        if not v:
            return []
        out = [voce(v[0])]
        for o in v[1:]:
            if len(out) >= 3:
                break
            x = voce(o)
            if x[5]:
                out.append(x)
        return out

    schede = {}
    for w, inf in info.items():
        v = sorted(occ.get(w, []), key=lambda o: (o[0], o[1]))
        dopo = [o for o in v if int(o[0][:4]) >= inf["partenza"]]
        prima = [o for o in v if int(o[0][:4]) < inf["partenza"]][:1]
        forme = [o[7].lower() for o in dopo if o[7]]
        forma = max(set(forme), key=forme.count) if forme else w
        if senza_accenti(forma) != w:
            forma = w
        s = {"t": inf["tot"], "d": inf["dec"], "p": scegli(dopo)}
        if forma != w:
            s["f"] = forma
        if inf["y0"] is None:
            s["sp"] = 1  # nessuna comparsa stabile
        if prima:
            s["g"] = voce(prima[0])
        schede[w] = s
    parole = sorted(schede)
    # pezzi sotto 1,2 MB in ordine alfabetico
    mappa, pezzo, peso, k = [], {}, 0, 0
    for w in parole:
        j = json.dumps(schede[w], ensure_ascii=False, separators=(",", ":"))
        if peso + len(j) > 1_200_000 and pezzo:
            scrivi_json("prime/d/%03d.json" % k, pezzo)
            k += 1
            pezzo, peso = {}, 0
        if not pezzo:
            mappa.append(w)
        pezzo[w] = schede[w]
        peso += len(j.encode("utf-8")) + len(w) + 4
    if pezzo:
        scrivi_json("prime/d/%03d.json" % k, pezzo)
    # suggerimenti per le prime due lettere: parola, forma, volte (le piu' dette prima)
    sug = defaultdict(list)
    for w in parole:
        sug[w[:2]].append([w, schede[w].get("f", 0), schede[w]["t"]])
    for p, v in sug.items():
        v.sort(key=lambda x: -x[2])
        scrivi_json("prime/s/%s.json" % p, v)
    # espressioni
    elenco = {p: orig for p, orig in espressioni()}
    out_e = {}
    for k, per_anno in e_conti.items():
        totale = sum(a + b for a, b in per_anno.values())
        if totale < SOGLIA:
            continue
        ca = {a: c + s for a, (c, s) in per_anno.items()}
        y0 = stabile(ca)
        partenza = y0 if y0 is not None else min(ca)
        v = sorted(e_occ.get(k, []), key=lambda o: (o[0], o[1]))
        dopo = [o for o in v if int(o[0][:4]) >= partenza]
        prima = [o for o in v if int(o[0][:4]) < partenza][:1]
        dec = [0] * len(DECENNI)
        for a, n in ca.items():
            dec[(a - 1840) // 10] += n
        e = {"t": totale, "d": dec, "p": scegli(dopo), "f": elenco.get(k, k),
             "anni": {str(a): per_anno[a] for a in sorted(per_anno)}}
        if y0 is None:
            e["sp"] = 1
        if prima:
            e["g"] = voce(prima[0])
        out_e[k] = e
    scrivi_json("prime/espressioni.json", out_e)
    json.dump(scartate, open(os.path.join(CACHE, "scartate_g9.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("frasi scartate dal filtro di qualita':", scartate["n"], flush=True)
    scrivi_json("prime/mappa.json", {"inizi": mappa, "n": len(parole), "soglia": SOGLIA, "decenni": DECENNI})
    print("parole:", len(parole), "pezzi:", len(mappa), "espressioni:", len(out_e), "di", len(elenco), flush=True)
    for w in ("computer", "telefonino", "spread", "intelligenza"):
        print(w, json.dumps(schede.get(w), ensure_ascii=False)[:400])
    print("intelligenza artificiale", json.dumps(out_e.get("intelligenza artificiale"), ensure_ascii=False)[:400])
    fine()


if __name__ == "__main__":
    main()
