r"""g3 - Dati di home, anni, legislature, partiti, persone, temi ed esperimenti.

FONTE E METODO (tutto letto dai file del progetto, nessun numero scritto a mano tranne la tabella H68 copiata dalla nota)
  base e curve      _genera/cache/parole_base.pkl (g1); soglia di 300.000 parole per anno e ramo, come da guida del sito
  legislature       risultati/serie_h2_legislature.csv (98 archivi; anni dagli anni con almeno l'1% delle parole in misure/parole/totali), h33_tabella_partiti_governo.csv (governi),
                    mappa_partiti_mappe_legislature.csv, mappa_partiti_mappa_unica_relativa.csv,
                    mappa_partiti_destra_sinistra_parole.csv, h22_parole_anno.csv, h37_quote_K40.csv;
                    oratori principali e parole tipiche di partiti e persone da _genera/cache/aggregati.pkl (g4)
                    quote di parole per partito ricontate da misure/persone/turni_camera_repubblica_NN.parquet
  partiti           mappa_partiti_*.csv, h54_somiglianze.csv, h54_parole_passaggi.csv, h56_asse_serie.csv, h33 (governi)
  persone           misure/persone/unita_persona.parquet (interventi e parole per persona, ramo, legislatura e ruolo),
                    nomi dagli elenchi ufficiali (g4), pagina di Wikipedia da misure/persone/itaparl_aggancio.parquet,
                    gruppi del Senato da misure/persone/senato_gruppo_periodi.parquet
  temi              h37_etichette_temi.csv, h37_quote_K40.csv, h37_temi_K40.txt (parole forti di ogni tema)
  totali            risultati/pulizia_riepilogo.csv (interventi, parole tenute e sedute di ogni archivio)
  esperimenti       risultati/ELENCO_ESPERIMENTI.md (le colonne Note e File restano fuori: sono appunti di lavoro)
  home              come sopra, piu' la tabella H68 di risultati/note_h68_h75_h77.md; i fatti brevi e le smentite
                    vengono dai testi della redazione (_progetto/TESTI_PAGINE.md)
USO     python -I _genera/g3_sito.py      (dopo g1, g2 e g4)
"""
import json
import os
import pickle
import re
import sys
import unicodedata
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

import numpy as np
import pyarrow.parquet as pq

SOGLIA_ANNO = 300_000


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def nome_partito(p):
    return p.replace("Unita'", "Unità")


def main():
    with open(os.path.join(CACHE, "parole_base.pkl"), "rb") as f:
        B = pickle.load(f)
    with open(os.path.join(CACHE, "aggregati.pkl"), "rb") as f:
        AG = pickle.load(f)
    parole = B["parole"]
    tidx = {w: i for i, w in enumerate(parole)}
    M, tot = B["M"], B["tot"]
    indice = json.load(open(os.path.join(DATI, "parole", "indice.json"), encoding="utf-8"))["p"]
    forma = {r[0]: (r[1] or r[0]) for r in indice}
    nomi = AG["nomi"]

    def nome_or(kk):
        if kk in nomi:
            return nomi[kk]
        n = AG["or_nome"].get(kk, kk.split(":", 1)[-1])
        return n

    # ------------------------------------------------------------- curve per milione (media dei rami)
    with np.errstate(divide="ignore", invalid="ignore"):
        pm = M / tot[None, :, :] * 1e6
    pm[:, tot < SOGLIA_ANNO] = np.nan
    for i in range(len(parole)):
        pm[i, :, : B["y0"][i] - 1848] = np.where(np.isnan(pm[i, :, : B["y0"][i] - 1848]), np.nan, 0)

    def curva(w):
        i = tidx[w]
        c, s = pm[i, 0], pm[i, 1]
        m = np.where(np.isnan(c), s, np.where(np.isnan(s), c, (c + s) / 2))
        return [None if np.isnan(v) else round(float(v), 2) for v in m]

    # ------------------------------------------------------------- esperimenti
    t = open(os.path.join(RIS, "ELENCO_ESPERIMENTI.md"), encoding="utf-8").read()
    esp, conti, filone = [], [], None
    for riga in t.splitlines():
        if riga.startswith("## "):
            filone = riga[3:].strip()
            continue
        if not riga.startswith("|") or set(riga) <= set("|-: "):
            continue
        c = [x.strip() for x in riga.strip().strip("|").split("|")]
        if filone == "Conti":
            if c[0] != "Filone":
                conti.append([c[0].strip("*")] + [int(x.strip("*")) for x in c[1:]])
            continue
        if c[0] == "Codice" or len(c) < 6:
            continue
        esp.append({"filone": filone, "cod": c[0], "titolo": c[1], "attesa": c[2], "esito": c[3], "numero": c[4]})
    filoni = [c[0] for c in conti if c[0] != "Totale"]
    esp = [e for e in esp if e["filone"] in filoni]
    ipotesi = sorted(set(re.match(r"H\d+", e["cod"]).group(0) for e in esp if re.match(r"H\d+", e["cod"])), key=lambda x: int(x[1:]))
    scrivi_json("esperimenti.json", {"elenco": esp, "conti": conti, "filoni": filoni, "n_ipotesi": len(ipotesi)})
    print("esperimenti:", len(esp), "ipotesi:", len(ipotesi), flush=True)

    def esp_che_citano(anni=None, nome=None):
        out = []
        for e in esp:
            testo = " ".join([e["titolo"], e["attesa"], e["numero"]])
            if anni and any(int(y) in anni for y in re.findall(r"\b(1[89]\d\d|20[0-2]\d)\b", testo)):
                out.append(e["cod"])
            elif nome and re.search(r"(?<![A-Za-z])%s(?![A-Za-z])" % re.escape(nome), testo):
                out.append(e["cod"])
        return out

    # ------------------------------------------------------------- archivi e legislature
    archivi = []
    for r in leggi_csv("serie_h2_legislature.csv"):
        stem = r["stem"]
        m = re.match(r"(camera|senato)_(regno|repubblica)_(\d+)", stem)
        if m:
            epoca, n = m.group(2), int(m.group(3))
            leg = "%s-%d" % (epoca, n)
            nome = "%s legislatura" % ROMANI[n] + (" del Regno" if epoca == "regno" else "")
        else:
            epoca = "consulta" if "consulta" in stem else "costituente"
            n, leg = 0, epoca
            nome = "Consulta nazionale" if epoca == "consulta" else "Assemblea costituente"
        da_, a_ = anni_archivio(stem, int(float(r["anno_min"])), int(float(r["anno_max"])))
        archivi.append({"id": stem, "leg": leg, "ramo": r["ramo"], "epoca": epoca, "n": n, "nome": nome,
                        "da": da_, "a": a_, "turni": int(float(r["turni"])),
                        "parole": int(float(r["parole"])), "frase": num(r["frase_media_pesata"], 1),
                        "lettere": num(r["parola_lettere_pesata"], 2), "turno_mediana": num(r["turno_mediana"], 0)})
    ordine_ep = {"regno": 0, "consulta": 1, "costituente": 2, "repubblica": 3}
    legs = {}
    for a in archivi:
        L = legs.setdefault(a["leg"], {"id": a["leg"], "nome": a["nome"], "epoca": a["epoca"], "n": a["n"], "da": a["da"], "a": a["a"], "archivi": {}})
        L["da"] = min(L["da"], a["da"]); L["a"] = max(L["a"], a["a"])
        L["archivi"][a["ramo"]] = {k: a[k] for k in ("id", "da", "a", "turni", "parole", "frase", "lettere", "turno_mediana")}
    lista_leg = sorted(legs.values(), key=lambda L: (ordine_ep[L["epoca"]], L["n"]))
    # la Repubblica comincia nel 1948: le date dei file Camera bastano
    print("legislature:", len(lista_leg), flush=True)

    # parole dell'anno
    pa_anno = defaultdict(list)
    for r in leggi_csv("h22_parole_anno.csv"):
        a = int(r["anno"])
        if int(r["rango"]) <= 10:
            pa_anno[a].append([r["parola"], num(r["per_milione_anno"], 0), 1 if r["fuori_dizionario"] == "True" else 0, forma.get(r["parola"], r["parola"])])

    # temi (Camera e Senato)
    et = {int(r["tema"]): (r["etichetta"], int(r["procedurale"])) for r in leggi_csv("h37_etichette_temi.csv") if r["K"] == "40"}
    serie_t = defaultdict(lambda: defaultdict(dict))
    for r in leggi_csv("h37_quote_K40.csv"):
        if r["ammesso"] == "True":
            serie_t[r["ramo"]][int(r["tema"])][int(r["anno"])] = float(r["quota"])
    parole_tema = {}
    for riga in open(os.path.join(RIS, "h37_temi_K40.txt"), encoding="utf-8", errors="replace"):
        m = re.match(r"T(\d+) quota\s+([\d.,]+)%: (.*)", riga.strip())
        if m:
            parole_tema[int(m.group(1))] = [w.strip() for w in m.group(3).split(",")]
    temi = []
    for k, (nome, proc) in sorted(et.items()):
        qc = [round(serie_t["camera"][k][a], 5) if a in serie_t["camera"][k] else None for a in ANNI]
        qs = [round(serie_t["senato"][k][a], 5) if a in serie_t["senato"][k] else None for a in ANNI]
        temi.append({"id": k, "nome": nome, "proc": proc, "q": qc, "qs": qs if any(v is not None for v in qs) else None,
                     "parole": [[w, forma.get(w, w)] for w in parole_tema.get(k, [])]})
    scrivi_json("temi.json", {"temi": temi})

    # governi
    governi, visti = [], {}
    for r in leggi_csv("h33_tabella_partiti_governo.csv"):
        g = visti.get(r["governo"])
        if g is None:
            g = {"governo": re.sub(r"\s*\(.*\)$", "", r["governo"]), "da": r["inizio"], "a": r["fine"], "stati": {}}
            visti[r["governo"]] = g
            governi.append(g)
        g["stati"][r["partito"]] = r["stato"]

    # mappa dei partiti
    unita = defaultdict(list)
    for r in leggi_csv("mappa_partiti_mappa_unica_relativa.csv"):
        unita[r["partito"]].append({"leg": int(r["leg"]), "anno": float(r["anno"]), "quota": num(r["quota"], 4), "n_orat": int(float(r["n_orat"])),
                                    "fam": r["famiglia"], "LR": num(r["LR"], 2), "gov": num(r["governo_quota"], 2), "d2": num(r["dim2"], 4)})
    per_leg_mappa = defaultdict(list)
    for r in leggi_csv("mappa_partiti_mappe_legislature.csv"):
        per_leg_mappa[int(r["leg"])].append({"p": r["partito"], "x": num(r["x"], 5), "y": num(r["y"], 5), "fam": r["famiglia"], "gov": num(r["governo_quota"], 2)})
    som = {}
    for r in leggi_csv("mappa_partiti_somiglianze.csv"):
        def lista(pref):
            v = []
            for i in range(1, 6):
                s = r.get("%s_%d" % (pref, i)) or ""
                mm = re.match(r"(.+) \((\w+)\) (-?\d+\.\d+)$", s)
                if mm:
                    v.append([mm.group(1), mm.group(2), float(mm.group(3))])
            return v
        som[(r["partito"], int(r["legislatura"]))] = {"altra_leg": lista("simile_altra_leg"), "altro_partito": lista("simile_altro_partito")}
    ds = defaultdict(lambda: {"destra": [], "sinistra": []})
    for r in leggi_csv("mappa_partiti_destra_sinistra_parole.csv"):
        if r["versione"] != "parole" or r["blocco"] not in ("destra", "sinistra") or len(r["parola"]) < 4 or r["parola"] in VUOTE:
            continue
        v = ds[int(r["leg"])][r["blocco"]]
        if len(v) < 15:
            v.append([r["parola"], forma.get(r["parola"], r["parola"]), num(r["per_milione_blocco"], 0), num(r["per_milione_resto"], 0)])
    best = {}
    for p, us in unita.items():
        for u in us:
            if u["fam"] == "altri":
                continue
            k = (u["fam"], u["leg"])
            if k not in best or u["quota"] > best[k][1]["quota"]:
                best[k] = (p, u)
    linee = defaultdict(list)
    for (fam, leg), (p, u) in sorted(best.items()):
        linee[fam].append([u["anno"], u["d2"], "%s (%s)" % (p, ROMANI[leg]), leg])

    # quote di parole per partito ricontate (Camera della Repubblica): tutti i ruoli e solo parlamentari
    quote_ric = {}
    for n in range(1, 19):
        f = os.path.join(PERSONE, "turni_camera_repubblica_%02d.parquet" % n)
        if not os.path.exists(f):
            continue
        tt = pq.read_table(f, columns=["usabile", "ruolo", "partito", "n_parole"]).to_pandas()
        tt = tt[tt.usabile & (tt.partito != "")]
        tutti = tt.groupby("partito")["n_parole"].sum()
        parl = tt[tt.ruolo == "parlamentare"].groupby("partito")["n_parole"].sum()
        quote_ric[n] = {p: [round(float(tutti.get(p, 0) / tutti.sum()), 4), round(float(parl.get(p, 0) / parl.sum()), 4)] for p in tutti.index}

    # temi: media nella legislatura contro media generale (Camera)
    def temi_leg(da, a):
        out = []
        for tm in temi:
            if tm["proc"]:
                continue
            q = [v for v in tm["q"] if v is not None]
            ql = [tm["q"][y - 1848] for y in range(da, a + 1) if tm["q"][y - 1848] is not None]
            if q and ql:
                out.append([tm["id"], tm["nome"], round(float(np.mean(ql)), 4), round(float(np.mean(q)), 4)])
        out.sort(key=lambda x: -(x[2] / x[3] if x[3] else 0))
        return out

    def parole_tipiche_periodo(da, a, k=30):
        i0, i1 = da - 1848, a - 1848 + 1
        c = M[:, :, i0:i1].sum(axis=(1, 2)).astype(np.float64)
        T = M.sum(axis=(1, 2)).astype(np.float64)
        n1, n2 = c.sum(), T.sum() - c.sum()
        e1 = T * n1 / (n1 + n2)
        e2 = T * n2 / (n1 + n2)
        o2 = T - c
        with np.errstate(divide="ignore", invalid="ignore"):
            g2 = 2 * (np.where(c > 0, c * np.log(c / e1), 0) + np.where(o2 > 0, o2 * np.log(o2 / e2), 0))
        buone = np.array([len(w) >= 4 and w not in VUOTE for w in parole])
        g2 = np.where((c > e1) & (c >= 100) & buone, g2, 0)
        idx = np.argsort(-g2)[:k]
        return [[parole[j], forma[parole[j]], int(c[j]), round(float(c[j] / n1 * 1e6), 1), round(float(o2[j] / n2 * 1e6), 1)] for j in idx if g2[j] > 0]

    ids_leg = [L["id"] for L in lista_leg]
    for k, L in enumerate(lista_leg):
        out = dict(L)
        out["prec"] = ids_leg[k - 1] if k > 0 else None
        out["succ"] = ids_leg[k + 1] if k + 1 < len(ids_leg) else None
        da, a = L["da"], L["a"]
        out["governi"] = [g for g in governi if g["da"][:4] and da <= int(g["da"][:4]) <= a and L["epoca"] == "repubblica"]
        n = L["n"]
        if L["epoca"] == "repubblica":
            out["mappa"] = per_leg_mappa.get(n, [])
            out["partiti"] = [{"p": p, "nome": nome_partito(p), **{kk: u[kk] for kk in ("quota", "n_orat", "gov", "fam")},
                               "ricontata": quote_ric.get(n, {}).get(p)} for p, us in unita.items() for u in us if u["leg"] == n]
            out["partiti"].sort(key=lambda x: -x["quota"])
            out["quote_ricontate"] = sorted([[p, v[0], v[1]] for p, v in quote_ric.get(n, {}).items()], key=lambda x: -x[1])
            out["destra_sinistra"] = ds.get(n)
        orat = {}
        for ramo, arc in L["archivi"].items():
            info = AG["archivi"].get(arc["id"])
            if info:
                orat[ramo] = [[kk if ":p" in kk else "", nome_or(kk), nn] for kk, nn in info["principali"] if kk and not kk.endswith(":")][:15]
        out["oratori"] = orat
        out["parole_tipiche"] = parole_tipiche_periodo(da, a)
        out["parole_anno"] = {y: pa_anno.get(y, [])[:5] for y in range(da, a + 1)}
        tl = temi_leg(da, a)
        out["temi_su"] = tl[:6]
        out["temi_giu"] = tl[-6:][::-1]
        out["esperimenti"] = esp_che_citano(anni=set(range(da, a + 1)))
        scrivi_json("legislature/%s.json" % L["id"], out)
    print("legislature scritte", flush=True)

    # ------------------------------------------------------------- persone
    up = pq.read_table(os.path.join(PERSONE, "unita_persona.parquet"), columns=["ramo", "leg", "pid", "partito", "ruolo", "n_parole", "n_turni"]).to_pandas()
    up = up[up.pid.astype(str).str.contains(":p")]
    gruppi_sen = {}
    for r in pq.read_table(os.path.join(PERSONE, "senato_gruppo_periodi.parquet"), columns=["gruppo_id", "nome_gruppo"]).to_pylist():
        gruppi_sen.setdefault(str(r["gruppo_id"]), r["nome_gruppo"])
    wiki = {}
    for r in pq.read_table(os.path.join(PERSONE, "itaparl_aggancio.parquet"), columns=["pid", "pageid"]).to_pylist():
        if r["pid"] and r["pageid"] and str(r["pageid"]).isdigit():
            wiki.setdefault(r["pid"], str(r["pageid"]))
    pers = defaultdict(lambda: {"legs": defaultdict(lambda: {"parole": 0, "turni": 0, "partiti": Counter(), "ruoli": Counter()})})
    for r in up.itertuples(index=False):
        p = pers[r.pid]
        L = p["legs"][(r.ramo, int(r.leg))]
        L["parole"] += int(r.n_parole); L["turni"] += int(r.n_turni)
        par = r.partito or ""
        if r.ramo == "senato" and par.isdigit():
            par = gruppi_sen.get(par, "")
        if par:
            L["partiti"][par] += int(r.n_parole)
        L["ruoli"][r.ruolo] += int(r.n_turni)
    righe_ix = []
    schede = {}
    for pid, p in pers.items():
        nome = nomi.get(pid) or AG["or_nome"].get(pid) or pid
        legs_out = []
        for (ramo, leg), L in sorted(p["legs"].items(), key=lambda x: (x[0][1], x[0][0])):
            arc = "%s_repubblica_%02d" % (ramo, leg)
            tip = AG["archivi"].get(arc, {}).get("persone", {}).get(pid, {}).get("tip", [])
            legs_out.append({"ramo": ramo, "leg": leg, "parole": L["parole"], "turni": L["turni"],
                             "partito": nome_partito(L["partiti"].most_common(1)[0][0]) if L["partiti"] else "",
                             "ruoli": dict(L["ruoli"]), "tipiche": [[w, forma.get(w, w), n] for w, n, _ in tip[:12]]})
        tot_t = sum(x["turni"] for x in legs_out)
        if tot_t == 0:
            continue
        rami = "".join(sorted(set("C" if x["ramo"] == "camera" else "S" for x in legs_out)))
        par_tot = Counter()
        for x in legs_out:
            if x["partito"]:
                par_tot[x["partito"]] += x["parole"]
        schede[pid] = {"nome": nome, "wiki": wiki.get(pid), "legs": legs_out}
        righe_ix.append([pid, nome, rami, min(x["leg"] for x in legs_out), max(x["leg"] for x in legs_out),
                         par_tot.most_common(1)[0][0] if par_tot else "", tot_t, sum(x["parole"] for x in legs_out)])

    def chiave_nome(r):
        parti = r[1].split()
        return (parti[-1] if parti else "").lower() + " " + r[1].lower()
    righe_ix.sort(key=chiave_nome)
    PEZZO_P = 400
    pezzi = defaultdict(dict)
    for i, r in enumerate(righe_ix):
        pezzi[i // PEZZO_P][r[0]] = schede[r[0]]
    for k, v in pezzi.items():
        scrivi_json("persone/%03d.json" % k, v)
    scrivi_json("persone/indice.json", {"pezzo": PEZZO_P, "p": righe_ix})
    print("persone:", len(righe_ix), flush=True)
    pid_itaparl = {}
    for r in pq.read_table(os.path.join(PERSONE, "itaparl_aggancio.parquet"), columns=["pid", "oratore"]).to_pylist():
        if r["pid"] and r["oratore"]:
            pid_itaparl.setdefault(r["oratore"].strip().upper(), r["pid"])
    pid_di_nome = {}
    for r in righe_ix:
        pid_di_nome.setdefault(r[1].upper(), r[0])

    # ------------------------------------------------------------- partiti
    h54p = defaultdict(lambda: defaultdict(lambda: {"guadagnata": [], "persa": []}))
    for r in leggi_csv("h54_parole_passaggi.csv"):
        if len(r["parola"]) < 4 or r["parola"] in VUOTE:
            continue
        v = h54p[r["partito"]]["%s-%s" % (r["da_leg"], r["a_leg"])][r["direzione"]]
        if len(v) < 10:
            v.append([r["parola"], forma.get(r["parola"], r["parola"]), num(r["pmil_t"], 0), num(r["pmil_t1"], 0)])
    cont = defaultdict(list)
    for r in leggi_csv("h54_somiglianze.csv"):
        cont[r["partito"]].append([int(r["da_leg"]), int(r["a_leg"]), num(r["simil"], 2), num(r["lo"], 2), num(r["hi"], 2)])
    asse = defaultdict(list)
    for r in leggi_csv("h56_asse_serie.csv"):
        if r["tipo"] == "anno":
            asse[r["partito"]].append([int(r["periodo"]), num(r["x"], 3), num(r["lo"], 3), num(r["hi"], 3)])
    up_cam = up[up.ramo == "camera"]
    lista_partiti = []
    for p, us in unita.items():
        us = sorted(us, key=lambda u: u["leg"])
        fam = Counter(u["fam"] for u in us).most_common(1)[0][0]
        tip = {}
        for u in us:
            info = AG["archivi"].get("camera_repubblica_%02d" % u["leg"], {}).get("partiti", {}).get(p)
            if info:
                tip[u["leg"]] = [[w, forma.get(w, w), n] for w, n, _ in info["tip"][:15]]
        sel = up_cam[up_cam.partito == p].groupby("pid")["n_parole"].sum().sort_values(ascending=False).head(15)
        oratori = [[pid, nomi.get(pid, pid), int(n)] for pid, n in sel.items()]
        gov = [[g["governo"], g["da"], g["a"], g["stati"][p]] for g in governi if p in g["stati"]]
        out = {"id": p, "slug": slug(p), "nome": nome_partito(p), "famiglia": fam, "unita": us,
               "somiglianze": {str(u["leg"]): som.get((p, u["leg"])) for u in us},
               "passaggi": h54p.get(p, {}), "continuita": cont.get(p, []), "asse": asse.get(p, []),
               "governi": gov, "tipiche": tip, "oratori": oratori, "linea": linee.get(fam, []),
               "esperimenti": esp_che_citano(nome=p.split("/")[0]) if len(p) >= 2 else []}
        scrivi_json("partiti/%s.json" % slug(p), out)
        lista_partiti.append({"id": p, "slug": slug(p), "nome": nome_partito(p), "famiglia": fam, "legs": [u["leg"] for u in us],
                              "quota_max": max(u["quota"] for u in us), "da": int(us[0]["anno"] - 2.5), "a": int(us[-1]["anno"] + 2.5)})
    lista_partiti.sort(key=lambda x: (x["legs"][0], -x["quota_max"]))
    scrivi_json("partiti/indice.json", {"partiti": lista_partiti, "linee": linee})
    print("partiti:", len(lista_partiti), flush=True)

    # ------------------------------------------------------------- anni
    eventi = [[r["data"], r["etichetta"], int(r["peso"])] for r in leggi_csv("eventi.csv", os.path.join(BASE, "dati"))]
    picchi_anno = defaultdict(list)
    for i, w in enumerate(parole):
        if len(w) >= 4 and w not in VUOTE:
            picchi_anno[B["picco"][i]].append((B["totale"][i], w))
    anni = {}
    for a in ANNI:
        k = a - 1848
        top_temi = sorted([[tm["id"], tm["nome"], tm["q"][k]] for tm in temi if not tm["proc"] and tm["q"][k] is not None], key=lambda x: -x[2])[:6]
        anni[a] = {"parole": pa_anno.get(a, []), "picchi": [[w, forma[w], n] for n, w in sorted(picchi_anno.get(a, []), reverse=True)[:16]],
                   "eventi": [e for e in eventi if e[0][:4] == str(a)],
                   "leg": [L["id"] for L in lista_leg if L["da"] <= a <= L["a"]],
                   "tot": [int(tot[0, k]), int(tot[1, k])], "temi": top_temi}
    scrivi_json("anni.json", anni)

    # ------------------------------------------------------------- base
    base = {"tot": tot.tolist(), "eventi": eventi, "trascrizione": calendario(),
            "archivi": [{**a, "nome": a["nome"]} for a in archivi],
            "legislature": [{"id": L["id"], "nome": L["nome"], "epoca": L["epoca"], "n": L["n"], "da": L["da"], "a": L["a"],
                             "parole": sum(x["parole"] for x in L["archivi"].values()), "turni": sum(x["turni"] for x in L["archivi"].values())} for L in lista_leg],
            "parole_anno": {a: v[:5] for a, v in pa_anno.items()},
            "conti": {"interventi": sum(int(float(r["turni"])) for r in leggi_csv("pulizia_riepilogo.csv")),
                      "parole_milioni": round(sum(float(r["parole_tenute"]) for r in leggi_csv("pulizia_riepilogo.csv")) / 1e6, 1),
                      "sedute": sum(int(float(r["sedute"])) for r in leggi_csv("pulizia_riepilogo.csv")),
                      "archivi": len(archivi), "schede_partito": sum(len(v) for v in unita.values()), "parole": len(parole), "legislature": len(lista_leg), "partiti": len(lista_partiti), "persone": len(righe_ix), "storie": 0,
                      "esperimenti": len(esp), "ipotesi": len(ipotesi), "temi": len(temi)}}
    for a in base["archivi"]:
        pass
    scrivi_json("base.json", base)

    # ------------------------------------------------------------- home
    PAROLE_HOME = """patria europa crisi guerra pace compagni camerati popolo mafia terrorismo emergenza tangentopoli spread casta ferrovie
    telegrafo internet fascismo resistenza costituzione missione televisione tasse droga scuola calcio federalismo duce impero colonie
    divorzio aborto nucleare ambiente inflazione disoccupazione clandestini pandemia euro sciopero regioni mezzogiorno emigrazione
    immigrazione petrolio debito austerita globalizzazione privatizzazioni computer donne liberta lavoro operai precari giovani clima covid comunismo""".split()
    curve_home = {}
    for w in PAROLE_HOME:
        if w in tidx:
            i = tidx[w]
            curve_home[w] = {"forma": forma[w], "tot": int(M[i].sum()), "picco": B["picco"][i], "m": curva(w)}
    multipli = "ferrovie telegrafo emigrazione colonie impero duce camerati patria resistenza costituzione regioni divorzio terrorismo inflazione tangentopoli euro clandestini precari pandemia covid".split()
    picchi = [[w, B["picco"][tidx[w]], forma[w]] for w in PAROLE_HOME if w in tidx and w not in ("patria", "europa", "crisi", "lavoro", "liberta", "popolo", "pace")][:40]
    nate = [[r["parola"], num(r["pm_1848_1900"], 1), num(r["pm_1901_1989"], 1), num(r["pm_1990_2022"], 1), forma.get(r["parola"], r["parola"])] for r in leggi_csv("h27_nate_elenco.csv")[:30]]
    morte = [[r["parola"], num(r["pm_1848_1900"], 1), num(r["pm_1901_1989"], 1), num(r["pm_1990_2022"], 1), forma.get(r["parola"], r["parola"])] for r in leggi_csv("h27_morte_elenco.csv")[:30]]
    orat = []
    for r in leggi_csv("tab_oratori_top.csv"):
        o = r["oratore"].strip()
        if not o or o in ("Government", "PRESIDENTE"):
            continue
        pid = pid_itaparl.get(o.upper()) or pid_di_nome.get(o.upper())
        orat.append([G_nome(o), pid, int(r["interventi"]), 0])
    # in rosso: chi nella VII legislatura sta nel gruppo radicale (misure/persone/unita_persona.parquet)
    radicali = set(up[(up.ramo == "camera") & (up.leg == 7) & (up.partito == "Radicali")].pid)
    for x in orat:
        x[3] = 1 if x[1] in radicali else 0
    smentite_cod = ["H2", "H16", "H34b", "H65", "H75", "H72", "H71", "H25"]
    smentite = [e for c in smentite_cod for e in esp if e["cod"] == c]
    breve = [
        'L\'aula non ride più: <span class="n">38</span> annotazioni di ilarità ogni mille interventi nel 1848-79, <b>0,6</b> dal 1994. ' + '<a href="esperimento.html?cod=H20a">H20a</a>',
        'Il francese alla Camera: <span class="n">8,5%</span> nel 1849, zero dal 1861, dopo la cessione della Savoia. <a href="esperimento.html?cod=H8">H8</a>',
        'Sotto il fascismo il dissenso annotato scende da <span class="n">32</span> a 10 ogni cento interventi, con il crollo nel 1926-27. <a href="esperimento.html?cod=H18b">H18b</a>',
        'Il lessico di classe passa da <span class="n">236</span> volte per milione nel 1948-69 a 46 nel 2000-22; la svolta è stimata nel 1988. <a href="esperimento.html?cod=H29">H29</a>',
        '«Ambiente» in senso ecologico: da <span class="n">18</span> per milione nel 1948-65 a 206 negli anni Ottanta; il clima decolla nel 1996. <a href="esperimento.html?cod=H30">H30</a>',
        'Terrorismo, ognuno lo attribuisce all\'altro: il PCI dice «nero» <span class="n">2,06</span> volte per ogni «rosso», il MSI 0,19. <a href="esperimento.html?cod=H50c">H50c</a>',
        'Nella Prima Repubblica il PCI nomina la mafia <span class="n">2,4</span> volte più della DC. <a href="esperimento.html?cod=H40d">H40d</a>',
        'Chi arriva: «extracomunitari» ha il picco nel <span class="n">1990</span>, «clandestini» nel 2009, «migranti» nel 2017. <a href="esperimento.html?cod=H44b">H44b</a>',
        'La spagnola del 1918-19 ebbe circa <span class="n">200</span> volte meno attenzione per morto del colera o del Covid. <a href="esperimento.html?cod=H41a">H41a</a>',
        'Il M5S nel 2018 passa dal <span class="n">2%</span> all\'85% di lingua «da maggioranza». <a href="esperimento.html?cod=H67c">H67c</a>',
    ]
    H68 = tabella_h68()
    # testi della redazione (_progetto/TESTI_PAGINE.md): «In breve» e «Le smentite», con il link alla storia
    tp = os.path.join(SITO, "_progetto", "TESTI_PAGINE.md")
    smentite_txt = []
    if os.path.exists(tp):
        T = open(tp, encoding="utf-8").read()
        def blocco(titolo):
            m = re.search(r"^### %s\s*$(.*?)(?=^### |^## )" % re.escape(titolo), T, re.M | re.S)
            return m.group(1) if m else ""
        voci = re.findall(r"^\d+\. (.+?) → `([a-z0-9-]+)`\s*$", blocco("In breve"), re.M)
        if voci:
            breve = []
            for testo, sid in voci:
                h = html_escape(testo)
                h = re.sub(r"\*\*(.+?)\*\*", r'<span class="n">\1</span>', h, count=1)
                h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", h)
                breve.append(h + ' <a href="storia.html?id=%s">La storia</a>' % sid)
        for cod, testo, sid in re.findall(r"^\d+\. \*\*(H\w+)\*\* (.+?) → `([a-z0-9-]+)`\s*$", blocco("Gli esperimenti"), re.M):
            e = next((x for x in esp if x["cod"] == cod), None)
            if e:
                smentite_txt.append({"cod": cod, "testo": testo, "storia": sid, "esito": e["esito"]})
        m = re.search(r"Nota per chi costruisce: le venti parole della bozza 1 vanno bene \(([^)]+)\)", T)
        if m:
            multipli = [w.strip() for w in m.group(1).split(",") if w.strip() in tidx]
    home = {"curve": curve_home, "smentite_txt": smentite_txt, "multipli": multipli, "picchi": picchi, "mappa_linee": linee, "h68": H68,
            "temi": [{"id": tm["id"], "nome": tm["nome"], "proc": tm["proc"], "q": tm["q"]} for tm in temi],
            "oratori": orat[:20], "nate": nate, "morte": morte, "eventi": eventi,
            "esperimenti": {"conti": conti, "smentite": smentite},
            "breve": breve}
    scrivi_json("home.json", home)
    print("home e base scritte", flush=True)
    fine()


def anni_archivio(stem, da, a):
    """Anni di un archivio: quelli che contengono almeno l'1% delle sue parole (misure/parole/totali/<archivio>.parquet).
    Evita che poche sedute con la data sbagliata allunghino una legislatura (per esempio la II del Regno, 1849)."""
    f = os.path.join(TOT, stem + ".parquet")
    if not os.path.exists(f):
        return da, a
    t = pq.read_table(f, columns=["anno", "n_token"]).to_pandas()
    t = t[t.anno > 0]
    g = t.groupby("anno")["n_token"].sum()
    if g.sum() <= 0:
        return da, a
    tenuti = g[g / g.sum() >= 0.01].index
    return (int(min(tenuti)), int(max(tenuti))) if len(tenuti) else (da, a)


def calendario():
    """Calendario rivisto dei cambi di trascrizione (risultati/calendario_h65/590_calendario_rivisto.csv e 590_inizi_tabella.csv,
    nota note_calendario_e_h65.md): «camera»/«senato» = cambi provati (stato RESTA); «scrittura» = cambi di punteggiatura e
    grafie (RESTA_GP, RESTA_G_COMUNE); «incerte» = inizi di legislatura incerti (non disegnati nei grafici)."""
    cart = os.path.join(RIS, "calendario_h65")
    out = {"camera": set(), "senato": set(), "scrittura": {"camera": set(), "senato": set()}, "incerte": {"camera": set(), "senato": set()}}
    for r in leggi_csv("590_calendario_rivisto.csv", cart):
        a = int(r["mese"][:4])
        if r["stato"] == "RESTA":
            out[r["ramo"]].add(a)
        elif r["stato"].startswith("RESTA_G"):
            out["scrittura"][r["ramo"]].add(a)
    for r in leggi_csv("590_inizi_tabella.csv", cart):
        if r["stato"] == "INCERTA":
            out["incerte"][r["ramo"]].add(int(r["mese"][:4]))
    return {"camera": sorted(out["camera"]), "senato": sorted(out["senato"]),
            "scrittura": {k: sorted(v) for k, v in out["scrittura"].items()}, "incerte": {k: sorted(v) for k, v in out["incerte"].items()}}


def tabella_h68():
    """Tabella di H68 da risultati/note_h68_h75_h77.md: operazione, parole e quota di «guerra» di maggioranza e opposizione,
    differenza in punti con il margine di incertezza."""
    righe = []
    for riga in open(os.path.join(RIS, "note_h68_h75_h77.md"), encoding="utf-8"):
        m = re.match(r"\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)%\s*\|\s*(\d+)\s*\|\s*(\d+)%\s*\|\s*([+-]?\d+)\s*\[([+-]?\d+);\s*([+-]?\d+)\]", riga)
        if m:
            a = re.search(r"(19|20)\d\d", m.group(1))
            righe.append([m.group(1)] + [int(m.group(k)) for k in range(2, 9)] + [int(a.group(0)) if a else None])
        if len(righe) == 10:
            break
    return righe


def html_escape(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def G_nome(s):
    return " ".join(p.capitalize() if not p.isdigit() else p for p in s.lower().split())


if __name__ == "__main__":
    main()
