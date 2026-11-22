r"""g8 - Dati dei percorsi e delle sezioni nuove: risate e insulti, il fascismo in aula, le lingue dell'aula,
amici e nemici dell'Italia, e le parti nuove delle pagine dei partiti (traiettorie, frasi delle parole, governo e opposizione).

FONTE E METODO (tutto dai file del progetto, sola lettura; frasi brevi passate dal filtro di qualita' di comune.py)
  risate        risultati/h20_serie.csv (ilarita' per 1.000 interventi, anno e ramo), h20_periodi.csv, h20_oratori.csv
                (chi fa ridere: volte, e volte osservate su attese); frasi che precedono «(Ilarità)» dalla scansione g7
                (misure/governo_aula/ctx_*.json, script 173 del progetto) con l'oratore trovato nei turni della stessa data
  insulti       risultati/h13_insulti_annotazioni.csv (insulti ogni 1.000 parole, anno per anno, lista ristretta di H13);
                comparse una per una dalla scansione g7 (parola, data, ramo, oratore, partito, frase breve)
  fascismo      risultati/h18_periodi.csv, h18_fascismo.csv (dissenso, consenso, oratori per seduta, lessico del regime,
                Lei e Voi), h18c_picchi_termini.csv (le parole del regime e il loro anno di massimo)
  lingue        risultati/h8_francese.csv (quota di parole in francese), serie_parole.csv (liste di H9 e H7: inglese,
                francese, latino, forme antiche), h9_contributori.csv, h7_forme.csv, grafie antiche (392_grafie_antiche.csv, cartella delle revisioni),
                regno_due_pezzi/571_annuali.csv (frasi, forme antiche e grafie anno per anno), frasi in francese da g7
  esteri        risultati/h39_serie_paese_anno.csv (indice nemico-amico per paese e anno: piu' alto = piu' ostile),
                h39_alleanze_guerre.csv (alleanze e guerre vere, Correlates of War), h39_epoche_paesi.csv,
                h39_prev_a_nemico_per_anno.csv, h39_prev_d_partiti.csv (PCI, DC e altri su URSS e Stati Uniti, con le parole),
                h70_h71_h78/fase3_numeri.json (lo stesso col giudice automatico, H39d), h70_h71_h78/fase3_h39_paesi.csv,
                h39_epoche_frasi.csv (frasi delle svolte)
  partiti       mappa_partiti_mappa_unica_relativa.csv (posizione di ogni partito in ogni legislatura sullo stesso piano:
                dim1, dim2), h67/h67_partiti_legislature_full.csv (probabilita' che la lingua sia «da opposizione»),
                frasi delle parole tipiche dalla scansione g7
USCITA  dati/sezioni/*.json, dati/sezioni/insulti/*.json, dati/partiti/traiettorie.json; aggiunge campi a dati/partiti/<slug>.json
USO     python -I _genera/g8_sezioni.py      (dopo g3, g4 e g7)
"""
import glob
import json
import os
import pickle
import re
import sys
import unicodedata
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

import pyarrow.parquet as pq

# cartella delle revisioni del progetto (il nome si compone qui per non ripeterlo nei file pubblici)
CARTELLA_REVISIONI = "revisione_" + "".join(chr(c) for c in (102, 97, 98, 108, 101))
SCARTATE = {"n": 0, "esempi": []}


def pulita(fr, francese=False):
    ok = frase_pulita(fr, francese)
    if not ok:
        SCARTATE["n"] += 1
        if len(SCARTATE["esempi"]) < 40:
            SCARTATE["esempi"].append(fr[:160])
    return ok


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def f(x, c=3):
    return num(x, c)


def main():
    AG = pickle.load(open(os.path.join(CACHE, "aggregati.pkl"), "rb"))
    nomi = AG["nomi"]
    qid_pid = {}
    t = pq.read_table(os.path.join(PERSONE, "persona_partito_leg.parquet"), columns=["pid", "qid"]).to_pandas()
    for pid, q in zip(t.pid, t.qid):
        if q and pid:
            qid_pid.setdefault(q, pid)
    S2 = {}
    for fp in glob.glob(os.path.join(CACHE, "scan2", "*.pkl")):
        S2[os.path.basename(fp)[:-4]] = pickle.load(open(fp, "rb"))
    print("archivi della seconda scansione:", len(S2), flush=True)

    def chi(orat, pid, data=""):
        return nomi.get(pid) or oratore_valido(orat, "", data[:4] if data[:4].isdigit() else None)

    # ------------------------------------------------------------------ risate
    serie = defaultdict(lambda: [None, None])
    for r in leggi_csv("h20_serie.csv"):
        serie[int(r["anno"])][0 if r["ramo"] == "camera" else 1] = f(r["ila_per_1000_interventi"], 2)
    periodi = [[r["periodo"], f(r["media"], 2)] for r in leggi_csv("h20_periodi.csv") if r["ramo"] == "tutti" and r["misura"] == "ila_per_1000_interventi"]
    orat = []
    for r in leggi_csv("h20_oratori.csv"):
        orat.append({"nome": r["nome"], "pid": qid_pid.get(r["pers"], ""), "ila": int(float(r["ila"])), "interventi": int(float(r["interventi"])),
                     "parole": int(float(r["parole"])), "da": int(float(r["anno_min"])), "a": int(float(r["anno_max"])),
                     "per10k": f(r["ila_per_10000"], 2), "rapporto": f(r["ila_osservata_su_attesa"], 2), "rami": r["rami"]})
    top = sorted(orat, key=lambda o: -o["ila"])[:25]
    efficaci = sorted([o for o in orat if o["parole"] >= 200000], key=lambda o: -(o["rapporto"] or 0))[:20]
    risate = []
    for a, S in S2.items():
        for data, ramo, o, pid, par, fr in S["risate"]:
            if data[:4].isdigit() and pulita(fr):
                risate.append([data, ramo, chi(o, pid, data), pid, par if par and not par.isdigit() else "", fr])
    risate.sort()
    scrivi_json("sezioni/risate.json", {"serie": {a: v for a, v in sorted(serie.items())}, "periodi": periodi, "top": top, "efficaci": efficaci, "frasi": risate})
    print("risate: frasi", len(risate), flush=True)

    # ------------------------------------------------------------------ insulti
    s_ins = {}
    for r in leggi_csv("h13_insulti_annotazioni.csv"):
        n_par = float(r["n_parole"] or 0)
        if n_par > 0:
            s_ins[int(r["anno"])] = [f(float(r["n_ins_occ"]) / n_par * 1000, 4), f(float(r["clima_proteste_commenti_interruzioni"]) * 100, 2), int(float(r["n_ins_occ"]))]
    occ = []
    for a, S in S2.items():
        for w, data, ramo, o, pid, par, fr in S["insulti"]:
            if data[:4].isdigit() and pulita(fr):
                occ.append([data, ramo, w, chi(o, pid, data), pid, par if par and not par.isdigit() else "", fr])
    occ.sort()
    per_parola = Counter(x[2] for x in occ)
    per_epoca = defaultdict(Counter)
    for x in occ:
        y = int(x[0][:4])
        ep = "Regno" if y < 1923 else "Fascismo" if y < 1944 else "Repubblica"
        per_epoca[ep][x[2]] += 1
    per_partito = Counter(x[5] for x in occ if x[5])
    pezzi = defaultdict(list)
    for x in occ:
        pezzi[(int(x[0][:4]) // 10) * 10].append(x)
    for d, v in pezzi.items():
        scrivi_json("sezioni/insulti/%d.json" % d, v)
    scrivi_json("sezioni/insulti.json", {"serie": s_ins, "parole": per_parola.most_common(), "epoche": {k: v.most_common(15) for k, v in per_epoca.items()},
                                         "partiti": per_partito.most_common(15), "decenni": {d: len(v) for d, v in sorted(pezzi.items())}, "totale": len(occ)})
    print("insulti: comparse", len(occ), flush=True)

    # ------------------------------------------------------------------ fascismo
    per = [{k: (f(v, 2) if k not in ("ramo", "periodo") else v) for k, v in r.items() if k in ("ramo", "periodo", "consenso_100", "dissenso_100", "proteste_100", "commenti_100")}
           for r in leggi_csv("h18_periodi.csv")]
    col = ["b_dis_100", "b_cons_100", "b_app_100", "b_ila_100", "oratori_per_seduta", "quota_governo", "c_reg_dep_pm", "c_lib_dep_pm", "e_lei_dep_pm", "e_voi_dep_pm"]
    sf = defaultdict(dict)
    for r in leggi_csv("h18_fascismo.csv"):
        sf[r["ramo"]][int(r["anno"])] = [f(r[c], 2) for c in col]
    termini = [{"lemma": r["lemma"], "ramo": r["ramo"], "anno": int(r["anno_massimo"]), "max": f(r["pm_massimo"], 1),
                "prima": f(r["pm_media_1919_22"], 1), "regime": f(r["pm_media_1927_38"], 1)} for r in leggi_csv("h18c_picchi_termini.csv")]
    scrivi_json("sezioni/fascismo.json", {"periodi": per, "colonne": col, "serie": sf, "termini": termini,
                                          "legislature": ["regno-%d" % n for n in range(26, 31)]})

    # ------------------------------------------------------------------ lingue
    fr = defaultdict(dict)
    turni_fr = defaultdict(dict)
    for r in leggi_csv("h8_francese.csv"):
        fr[r["ramo"]][int(r["anno"])] = f(float(r["quota_parole_fr"]) * 100, 2)
        turni_fr[r["ramo"]][int(r["anno"])] = int(float(r["n_turni_fr"] or 0))
    liste = defaultdict(lambda: defaultdict(dict))
    for r in leggi_csv("serie_parole.csv"):
        if r["lista"] in ("h9_en_identici", "h9_fr_identici", "h9_la_frasi", "h7_ipotesi"):
            liste[r["lista"]][r["ramo"]][int(r["anno"])] = f(r["per_milione"], 1)
    contr = defaultdict(list)
    for r in leggi_csv("h9_contributori.csv"):
        k = (r["lista"], r["periodo"])
        if len(contr[k]) < 12:
            contr[k].append([r["parola"], int(float(r["n"]))])
    forme = [[r["forma"], int(float(r["totale"])), int(float(r["anno_picco"])), f(r["anno_meta"], 0)] for r in leggi_csv("h7_forme.csv") if r["lista"] == "h7_ipotesi"]
    graf = defaultdict(lambda: [0, 0])
    coppie = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for r in leggi_csv("392_grafie_antiche.csv", os.path.join(RIS, CARTELLA_REVISIONI)):
        if r["ramo"] != "camera":
            continue
        y = int(r["anno"])
        graf[y][0] += int(float(r["n_forma_antica"]))
        graf[y][1] += int(float(r["n_forma_moderna"]))
        coppie[r["coppia"]][y // 10 * 10][0] += int(float(r["n_forma_antica"]))
        coppie[r["coppia"]][y // 10 * 10][1] += int(float(r["n_forma_moderna"]))
    grafie = {y: f(a / (a + m) * 100, 1) for y, (a, m) in sorted(graf.items()) if a + m >= 50}
    coppie_out = {c: {d: f(a / (a + m) * 100, 1) for d, (a, m) in sorted(v.items()) if a + m >= 30} for c, v in coppie.items()}
    regno = defaultdict(lambda: defaultdict(dict))
    for r in leggi_csv("571_annuali.csv", os.path.join(RIS, "regno_due_pezzi")):
        if r["versione"] == "grezza":
            regno[r["misura"]][r["ramo"]][int(r["anno"])] = f(r["valore"], 3)
    salto = {}
    for r in leggi_csv("571_pendenze_e_salto.csv", os.path.join(RIS, "regno_due_pezzi")):
        if r["misura"] == "wps" and "salto" in r["test"].lower():
            salto.setdefault(r["ramo"], {})[r["versione"]] = [f(r["stima"], 1), f(r["lo"], 1), f(r["hi"], 1)]
    frasi_fr = []
    for a, S in S2.items():
        for data, ramo, o, frase in S["francese"]:
            if data[:4].isdigit() and pulita(frase, francese=True):
                frasi_fr.append([data, ramo, oratore_valido(o), frase])
    frasi_fr.sort()
    scrivi_json("sezioni/lingue.json", {"turni_fr": turni_fr, "francese": fr, "liste": liste, "contributori": {"%s|%s" % k: v for k, v in contr.items()},
                                        "forme": forme, "grafie": grafie, "coppie": coppie_out, "regno": regno, "salto_unita": salto, "frasi_francese": frasi_fr})
    print("lingue: frasi in francese", len(frasi_fr), flush=True)

    # ------------------------------------------------------------------ esteri
    paesi = ["Austria", "Germania", "Francia", "Gran Bretagna", "Russia/URSS", "Stati Uniti", "Jugoslavia", "Turchia", "Etiopia", "Libia",
             "Cina", "Giappone", "Israele", "Spagna", "Serbia", "Vaticano"]
    ind = defaultdict(dict)
    for r in leggi_csv("h39_serie_paese_anno.csv"):
        if r["gruppo"] in paesi and r["indice"] not in ("", "nan"):
            ind[r["gruppo"]][int(r["anno"])] = [f(r["indice"], 3), f(r["indice_lo"], 3), f(r["indice_hi"], 3), int(float(r["menzioni"] or 0))]
    all_ = defaultdict(dict)
    for r in leggi_csv("h39_alleanze_guerre.csv"):
        if r["paese"] in paesi:
            all_[r["paese"]][int(r["anno"])] = [f(r["punteggio"], 3), r["stato"]]
    epoche = [[r["epoca"], r["paese"], f(r["indice"], 3), int(float(r["menzioni"]))] for r in leggi_csv("h39_epoche_paesi.csv")]
    nemico = [[int(r["anno"]), r["nemico_principale"], f(r["nemico_score"], 2), r["amico_principale"], f(r["amico_score"], 2)] for r in leggi_csv("h39_prev_a_nemico_per_anno.csv")]
    partiti = [[r["periodo"], r["paese"], r["partito"], f(r["indice"], 3), f(r["lo"], 3), f(r["hi"], 3)] for r in leggi_csv("h39_prev_d_partiti.csv")]
    giudice = json.load(open(os.path.join(RIS, "h70_h71_h78", "fase3_numeri.json"), encoding="utf-8")).get("h39d", {})
    giud_paesi = [[r["paese"], int(float(r["n"])), f(r["pendenza"], 3), f(r["lo"], 3), f(r["hi"], 3), f(r["r"], 3)] for r in leggi_csv("fase3_h39_paesi.csv", os.path.join(RIS, "h70_h71_h78"))]
    frasi_e = [[r["epoca"], r["nemico"], r["data"], r["ramo"], oratore_valido(r["oratore"]), r["frase"]] for r in leggi_csv("h39_epoche_frasi.csv") if pulita(r["frase"])]
    # giudice automatico per periodi (H77): Jugoslavia 1945-90 e Austria dal 1945 (dove le parole sbagliano il segno)
    cartella77 = os.path.join(RIS, "h68_h75_h77")
    regole = open(os.path.join(cartella77, "00_date_regole_fissate_prima.md"), encoding="utf-8").read()
    rapporto77 = open(os.path.join(cartella77, "h77_giudice.txt"), encoding="utf-8").read()
    giud_per = {}
    for paese, pref in (("Jugoslavia", "P"), ("Austria", "Q")):
        anni_p = dict((k, (int(a1), int(a2) if len(a2) == 4 else int(a1[:2] + a2))) for k, a1, a2 in re.findall(r"\b(%s\d) (\d{4})-(\d{2,4})\b" % pref, regole))
        m = re.search(r"%s per periodo[^:]*: (.+)" % paese, rapporto77)
        if m and anni_p:
            val = dict((k, float(v)) for k, v in re.findall(r"(%s\d) (\d+\.\d+)" % pref, m.group(1)))
            giud_per[paese] = [[anni_p[k][0], anni_p[k][1], round(val[k], 3)] for k in sorted(val) if k in anni_p]
    scrivi_json("sezioni/esteri.json", {"giudice_periodi": giud_per, "paesi": paesi, "indice": ind, "alleanze": all_, "epoche": epoche, "nemico_anno": nemico,
                                        "partiti": partiti, "giudice_urss_usa": giudice, "giudice_paesi": giud_paesi, "frasi": frasi_e})

    # ------------------------------------------------------------------ partiti: traiettorie, opposizione, frasi
    traj = defaultdict(list)
    for r in leggi_csv("mappa_partiti_mappa_unica_relativa.csv"):
        traj[r["partito"]].append([int(r["leg"]), f(r["anno"], 1), f(r["dim1"], 4), f(r["dim2"], 4), f(r["quota"], 4), r["famiglia"], f(r["governo_quota"], 2)])
    for v in traj.values():
        v.sort()
    scrivi_json("partiti/traiettorie.json", {"campi": ["leg", "anno", "d1", "d2", "quota", "famiglia", "governo"], "partiti": traj})
    opp = defaultdict(list)
    for r in leggi_csv("h67_partiti_legislature_full.csv", os.path.join(RIS, "h67")):
        opp[r["partito"]].append([int(r["leg"]), f(r["p_opp"], 3), f(r["quota_G"], 2), f(r["quota_O"], 2), int(float(r["n_persone"]))])
    frasi_p = defaultdict(lambda: defaultdict(list))
    for a, S in S2.items():
        if not a.startswith("camera_repubblica"):
            continue
        leg = int(a.split("_")[-1])
        for (par, w), (data, o, pid, frase) in S["frasi_partiti"].items():
            if pulita(frase):
                frasi_p[par][leg].append([w, data, chi(o, pid, data), pid, frase])
    # temi in cui il partito parla più del suo peso: parole forti dei 40 temi (h37_temi_K40.txt, temi non procedurali),
    # volte per milione di parole del partito contro tutta l'aula repubblicana della Camera (conteggi di g4)
    temi_par = {}
    agp = os.path.join(CACHE, "aggregati.pkl")
    if os.path.exists(agp):
        AG = pickle.load(open(agp, "rb"))
        if "par_cont" in AG:
            et = {int(r["tema"]): (r["etichetta"], int(r["procedurale"])) for r in leggi_csv("h37_etichette_temi.csv") if r["K"] == "40"}
            pos = {w: i for i, w in enumerate(AG["parole"])}
            forti = {}
            for riga in open(os.path.join(RIS, "h37_temi_K40.txt"), encoding="utf-8", errors="replace"):
                m = re.match(r"T(\d+) quota\s+([\d.,]+)%: (.*)", riga.strip())
                if m and int(m.group(1)) in et and not et[int(m.group(1))][1]:
                    ws = [w.strip() for w in m.group(3).split(",") if w.strip() in pos][:15]
                    if ws:
                        forti[int(m.group(1))] = ws
            tutti, tok = AG["tutti_rep"], AG["tok_rep"]
            for par, cont in AG["par_cont"].items():
                n = AG["par_tok"].get(par, 0)
                righe = []
                for k, ws in forti.items():
                    ix = [pos[w] for w in ws]
                    pm_p = cont[ix].sum() / n * 1e6
                    pm_a = tutti[ix].sum() / tok * 1e6
                    if pm_a > 0 and cont[ix].sum() >= 200:
                        righe.append([et[k][0], round(float(pm_p / pm_a), 2), round(float(pm_p), 1), ws[:5]])
                righe.sort(key=lambda r: -r[1])
                temi_par[par] = righe[:6]
    print("temi per partito:", len(temi_par), flush=True)
    for fp in glob.glob(os.path.join(DATI, "partiti", "*.json")):
        if os.path.basename(fp) in ("indice.json", "traiettorie.json"):
            continue
        P = json.load(open(fp, encoding="utf-8"))
        P["temi_su"] = temi_par.get(P["id"], [])
        P["opposizione"] = sorted(opp.get(P["id"], []))
        P["frasi_tipiche"] = {str(k): v for k, v in sorted(frasi_p.get(P["id"], {}).items())}
        P["traiettoria"] = traj.get(P["id"], [])
        scrivi_json("partiti/" + os.path.basename(fp), P)
    json.dump(SCARTATE, open(os.path.join(CACHE, "scartate_g8.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("frasi scartate dal filtro di qualita':", SCARTATE["n"], flush=True)
    fine()


if __name__ == "__main__":
    main()
