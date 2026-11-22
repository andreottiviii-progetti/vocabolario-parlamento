r"""g7 - Seconda scansione dei turni: insulti, risate con il loro oratore, frasi in francese, frasi delle parole dei partiti.

FONTE E METODO (sola lettura in D:\vocabolario-parlamento)
  - Turni: base_pulita/turni/*.parquet. Turni contati come nelle misure: lingua it (per il francese: lingua fr), non esclusi,
    non riassunti, senza Presidente, segretari e voci collettive.
  - Insulti: la lista ristretta di H13 (dati/liste/insulti_ristretta_forme.txt, scritta prima di guardare le serie, con le forme
    flesse). Per ogni comparsa: parola, data, ramo, oratore, persona e partito (solo Repubblica, misure/persone/turni_*.parquet)
    e una frase breve attorno alla parola. Sono citazioni dall'aula: la parola puo' anche essere riferita, negata o scherzosa.
  - Risate: le frasi che precedono un'annotazione di ilarita', ricavate da script/173 dagli originali IPSA
    (misure/governo_aula/ctx_<archivio>.json, campo esempi, scelti a caso con seme fisso). Qui si cerca l'intervento della
    stessa data che contiene le prime parole della frase, per sapere chi parlava. Si tengono le frasi con almeno 9 parole su
    10 nel dizionario (meno errori dello scanner) e tra 8 e 40 parole.
  - Francese: frasi brevi dai turni segnati in francese (lingua fr), 1848-1870.
  - Frasi delle parole dei partiti: per ogni partito e legislatura della Camera della Repubblica, le sue 8 parole piu' tipiche
    (da _genera/cache/aggregati.pkl, g4) e per ognuna la prima frase breve detta da un deputato di quel partito.
USCITA  _genera/cache/scan2/<archivio>.pkl (si riparte da dove ci si era fermati). 3 processi.
USO     python -I _genera/g7_scansione2.py
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

SCAN2 = os.path.join(CACHE, "scan2")
LISTA = os.path.join(BASE, "dati", "liste", "insulti_ristretta_forme.txt")
CTX = os.path.join(BASE, "misure", "governo_aula")
FINE_FRASE = re.compile(r"[.?!;:]\s")
PROCESSI = 3


def norma(s):
    s = unicodedata.normalize("NFD", (s or "").lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(re.findall(r"[a-z]+", s))


def frase_attorno(testo, a, b, maxc=240):
    ini = 0
    for x in FINE_FRASE.finditer(testo, 0, a):
        ini = x.end()
    f = FINE_FRASE.search(testo, b)
    fin = f.start() + 1 if f else len(testo)
    s = testo[ini:fin].strip()
    if len(s) > maxc:
        da = max(ini, a - maxc // 2)
        al = min(fin, b + maxc // 2)
        sp = testo.find(" ", da)
        da = sp + 1 if 0 <= sp < a else da
        sp = testo.rfind(" ", b, al)
        al = sp if sp > b else al
        s = ("… " if da > ini else "") + testo[da:al].strip() + (" …" if al < fin else "")
    return re.sub(r"\s+", " ", s)


def lavora(arg):
    archivio, obiettivi = arg
    import pyarrow.parquet as pq
    dest = os.path.join(SCAN2, archivio + ".pkl")
    if os.path.exists(dest):
        return archivio, "gia' fatto", 0
    t0 = time.time()
    ramo = archivio.split("_")[0]
    forme = [l.strip() for l in open(LISTA, encoding="utf-8") if l.strip() and not l.startswith("#")]
    re_ins = re.compile(r"\b(" + "|".join(re.escape(f) for f in sorted(forme, key=len, reverse=True)) + r")\b")
    persone = {}
    pp = os.path.join(PERSONE, "turni_%s.parquet" % archivio)
    if os.path.exists(pp):
        tp = pq.read_table(pp, columns=["file", "n_turno", "pid", "partito"]).to_pandas()
        for fl, nt, pid, par in zip(tp.file, tp.n_turno, tp.pid, tp.partito):
            persone[(fl, int(nt))] = (pid or "", par or "")
    # risate da cercare: data -> [(chiave di ricerca, frase)]
    risate = defaultdict(list)
    cp = os.path.join(CTX, "ctx_%s.json" % archivio)
    if os.path.exists(cp):
        ctx = json.load(open(cp, encoding="utf-8"))
        for e in ctx.get("esempi", []):
            if e.get("cat") != "ilarita" or not e.get("data"):
                continue
            n_tok, n_dic = e.get("n_tok", 0), e.get("n_dic", 0)
            if not (8 <= n_tok <= 40) or n_dic < 0.9 * n_tok:
                continue
            chiave = " ".join(norma(e["frase"]).split()[:7])
            if len(chiave) > 20:
                risate[e["data"]].append((chiave, re.sub(r"\s+", " ", e["frase"]).strip()))
    obi = obiettivi or {}
    insulti, francese, trovate_ris, frasi_par = [], [], [], {}
    pf = pq.ParquetFile(os.path.join(TURNI, archivio + ".parquet"))
    for rg in range(pf.num_row_groups):
        for r in pf.read_row_group(rg, columns=["data", "file", "n_turno", "oratore", "ruolo", "lingua", "indiretto", "escludi_misure", "testo", "testo_misura"]).to_pylist():
            if r["escludi_misure"] or r["indiretto"] or r["ruolo"] in ESCLUSI:
                continue
            testo, tm = r["testo"] or "", r["testo_misura"] or ""
            data = r["data"] or ""
            orat = (r["oratore"] or "").strip()
            pid, par = persone.get((r["file"], int(r["n_turno"] or 0)), ("", ""))
            if r["lingua"] == "fr":
                if data[:4] <= "1870" and len(francese) < 60 and len(testo) == len(tm):
                    pezzi = [p.strip() for p in re.split(r"(?<=[.?!])\s+", testo) if 60 <= len(p.strip()) <= 220]
                    if pezzi:
                        francese.append((data, ramo, orat, pezzi[len(pezzi) // 2]))
                continue
            if r["lingua"] != "it":
                continue
            if len(testo) == len(tm):
                for m in re_ins.finditer(tm):
                    insulti.append((m.group(1), data, ramo, orat, pid, par, frase_attorno(testo, m.start(), m.end())))
            if data in risate:
                tmn = " ".join(re.findall(r"[a-z]+", tm))
                resto = []
                for chiave, fr in risate[data]:
                    if chiave in tmn:
                        trovate_ris.append((data, ramo, orat, pid, par, fr))
                    else:
                        resto.append((chiave, fr))
                risate[data] = resto
            if par and par in obi and len(testo) == len(tm):
                cerca = obi[par]
                for w in list(cerca):
                    if (par, w) in frasi_par:
                        continue
                    m = re.search(r"\b%s\b" % w, tm)
                    if m:
                        fr = frase_attorno(testo, m.start(), m.end(), 220)
                        if 50 <= len(fr) <= 240:
                            frasi_par[(par, w)] = (data, orat, pid, fr)
    out = {"insulti": insulti, "francese": francese, "risate": trovate_ris, "frasi_partiti": frasi_par}
    with open(dest + ".tmp", "wb") as f:
        pickle.dump(out, f, protocol=4)
    os.replace(dest + ".tmp", dest)
    return archivio, "fatto", time.time() - t0


def main():
    os.makedirs(SCAN2, exist_ok=True)
    with open(os.path.join(CACHE, "aggregati.pkl"), "rb") as f:
        AG = pickle.load(f)
    archivi = [os.path.basename(p)[:-8] for p in glob.glob(os.path.join(TURNI, "*.parquet"))]
    archivi.sort(key=lambda a: -os.path.getsize(os.path.join(TURNI, a + ".parquet")))
    lavori = []
    for a in archivi:
        obi = {}
        if a.startswith("camera_repubblica"):
            for par, info in AG["archivi"].get(a, {}).get("partiti", {}).items():
                obi[par] = [w for w, n, s in info["tip"][:8]]
        lavori.append((a, obi))
    if len(sys.argv) > 1:
        lavori = [x for x in lavori if x[0] in sys.argv[1:]]
    from concurrent.futures import ProcessPoolExecutor, as_completed
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=PROCESSI) as ex:
        fut = [ex.submit(lavora, x) for x in lavori]
        for k, f in enumerate(as_completed(fut)):
            a, esito, sec = f.result()
            print("%3d/%d %-30s %s %4.0f s (totale %4.0f s)" % (k + 1, len(lavori), a, esito, sec, time.time() - t0), flush=True)
    fine()


if __name__ == "__main__":
    main()
