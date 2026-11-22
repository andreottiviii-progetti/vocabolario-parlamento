r"""g6 - Storie del sito: converte i testi della redazione (_progetto/storie/*.md) e prepara i dati dei loro grafici.

FONTE E METODO
  - Testi: _progetto/storie/*.md (una storia per file; ordine in INDICE.md se c'e', altrimenti per interesse e forza).
    Il testo resta quello scritto; qui si converte solo il formato (neretto, corsivo, capoversi).
  - Grafici: ogni storia indica per ogni grafico il file del progetto (D:\vocabolario-parlamento, sola lettura), le colonne
    e i filtri sulle righe. Il programma legge il file e prova a ricavare in automatico: la colonna del tempo o delle voci,
    le colonne dei valori, le righe da tenere (filtri del tipo `colonna` = valore) e le serie (una per valore di una colonna
    di testo). Se il file non e' una tabella leggibile o le colonne non si trovano, il grafico resta un segnaposto con
    titolo e sottotitolo, e il motivo e' scritto in _genera/cache/storie_rapporto.txt (fuori dal sito).
  - Testi fissi: se c'e' _progetto/TESTI_PAGINE.md, la sezione del metodo e' convertita in _genera/cache/testi_pagine.json
    (la usa g5).
USCITA  dati/storie/indice.json, dati/storie/<id>.json
USO     python -I _genera/g6_storie.py     (poi g5 se sono cambiati i testi fissi)
"""
import csv
import glob
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

STORIE = os.path.join(SITO, "_progetto", "storie")
X_NOMI = ["anno", "mese", "periodo", "decennio", "data", "leg", "legislatura", "trimestre", "semestre", "anno_inizio", "blocco", "epoca"]
RE_LOHI = re.compile(r"^(lo|hi|basso|alto|inf|sup|ci_lo|ci_hi|lo95|hi95|.+_lo|.+_hi|lo_.+|hi_.+|.+_basso|.+_alto)$")


def md_inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    s = re.sub(r"`([^`]+)`", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a class="lk" href="\2">\1</a>', s)
    return s


def md_blocchi(t):
    out, lista = [], []
    for p in re.split(r"\n\s*\n", t.strip()):
        righe = [r for r in p.strip().splitlines() if r.strip()]
        if righe and all(re.match(r"\s*[-*] ", r) for r in righe):
            out.append("<ul>" + "".join("<li>%s</li>" % md_inline(re.sub(r"^\s*[-*] ", "", r)) for r in righe) + "</ul>")
        elif righe and righe[0].startswith("### "):
            out.append("<h3>%s</h3>" % md_inline(righe[0][4:]))
            if righe[1:]:
                out.append("<p>%s</p>" % md_inline(" ".join(righe[1:])))
        elif righe:
            out.append("<p>%s</p>" % md_inline(" ".join(r.strip() for r in righe)))
    return "".join(out)


def testa(t):
    m = re.match(r"---\s*\n(.*?)\n---\s*\n", t, re.S)
    if not m:
        return {}, t
    d = {}
    for riga in m.group(1).splitlines():
        riga = re.sub(r"\s+#.*$", "", riga) if not riga.strip().startswith(("titolo", "sottotitolo", "occhiello")) else riga
        mm = re.match(r"(\w+):\s*(.*)$", riga.strip())
        if not mm:
            continue
        k, v = mm.group(1), mm.group(2).strip()
        if v.startswith("["):
            v = [x.strip().strip('"').strip("'") for x in v.strip("[]").split(",") if x.strip()]
        else:
            v = v.strip('"').strip("'")
            if re.fullmatch(r"\d+", v):
                v = int(v)
        d[k] = v
    return d, t[m.end():]


def sezioni(corpo):
    s = {}
    parti = re.split(r"^## (.+)$", corpo, flags=re.M)
    for i in range(1, len(parti), 2):
        s[parti[i].strip().lower()] = parti[i + 1].strip()
    return s


def grafici(testo):
    out = []
    for blocco in re.split(r"^### .*$", testo, flags=re.M)[1:]:
        g = {}
        for mm in re.finditer(r"^- \*\*(.+?)\*\*:\s*(.*)$", blocco, re.M):
            g[mm.group(1).strip().lower()] = mm.group(2).strip()
        if g:
            out.append(g)
    return out


def numero(x):
    try:
        v = float(str(x).replace(",", "."))
        return v if v == v else None
    except (TypeError, ValueError):
        return None


def leggi_tabella(p):
    with open(p, encoding="utf-8-sig", errors="replace", newline="") as f:
        testa_ = f.readline()
        f.seek(0)
        sep = ";" if testa_.count(";") > testa_.count(",") else ","
        return list(csv.DictReader(f, delimiter=sep))


def risolvi(g, rapporto, sid):
    """Ritorna i dati del grafico o None (segnaposto)."""
    f = (g.get("file") or "").split(";")[0].split(" e ")[0]
    f = re.findall(r"`([^`]+)`", f) or [f]
    f = f[0].strip().rstrip(",")
    p = os.path.join(BASE, f.replace("/", os.sep))
    tipo = (g.get("tipo") or "curva").lower()
    col = g.get("colonne", "")
    if not f or not os.path.exists(p):
        rapporto.append("%s: file non trovato (%s)" % (sid, f))
        return None
    if p.endswith(".json"):
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            rapporto.append("%s: json illeggibile %s" % (sid, f))
            return None
        if "mese" in col and isinstance(d.get("mese"), list):
            anni = re.findall(r"(1[89]\d\d|20[0-2]\d)", g.get("anni", ""))
            m = [x for x in d["mese"] if x[0] and (not anni or anni[0] <= x[0][:4] <= anni[-1])]
            return {"forma": "colonne", "x": [x[0] for x in m], "serie": [{"nome": "volte", "v": [x[1] for x in m]}], "xtipo": "mese"}
        if "oratori" in col and isinstance(d.get("oratori"), list):
            o = [x for x in d["oratori"] if x[0] and "RICONOSCIUTO" not in x[0]][:10]
            return {"forma": "barre", "x": [x[0].title() for x in o], "serie": [{"nome": "volte", "v": [x[1] for x in o]}]}
        rapporto.append("%s: json senza campi noti %s" % (sid, f))
        return None
    if not p.endswith(".csv"):
        rapporto.append("%s: non e' una tabella (%s)" % (sid, f))
        return None
    righe = leggi_tabella(p)
    if not righe:
        rapporto.append("%s: tabella vuota %s" % (sid, f))
        return None
    H = list(righe[0].keys())
    tok = re.findall(r"`([^`]+)`", col)
    cols = []
    for t in tok:
        if t in H and t not in cols:
            cols.append(t)
    if not cols:
        rapporto.append("%s: colonne non trovate in %s (%s)" % (sid, f, col[:80]))
        return None
    # filtri `col` = valori
    filtri = {}
    for mm in re.finditer(r"`([^`]+)`\s*(?:=|==)\s*([^;]+?)(?=;|\bper `|$)", col):
        c = mm.group(1)
        if c not in H:
            continue
        vals_col = set(r[c] for r in righe)
        cand = re.split(r",|\be\b|\bo\b", re.sub(r"\([^)]*\)", "", mm.group(2)))
        ok = []
        for v in cand:
            v = v.strip().strip("`'\"«» .")
            if v in vals_col and v not in ok:
                ok.append(v)
        if ok:
            filtri[c] = ok
    sel = [r for r in righe if all(r[c] in v for c, v in filtri.items())]
    # soglie del tipo «`colonna` sotto 100.000»: la colonna serve solo a togliere righe, non e' una serie
    soglie = {}
    for mm in re.finditer(r"`([^`]+)`\s*(?:\([^)]*\)\s*)?(sotto|sopra|almeno|meno di|inferiore a|superiore a)\s*([\d.,]+)", col):
        c = mm.group(1)
        if c in H:
            soglie[c] = (mm.group(2), numero(mm.group(3).replace(".", "").replace(",", ".")))
    scarta = set()
    for i, r in enumerate(sel):
        for c, (verso, v) in soglie.items():
            x = numero(r[c])
            if x is None or v is None:
                continue
            if (verso in ("sotto", "meno di", "inferiore a") and x < v) or (verso in ("sopra", "superiore a") and x > v) or (verso == "almeno" and x < v):
                scarta.add(i)
    sel_buone = set(range(len(sel))) - scarta
    if not sel:
        rapporto.append("%s: nessuna riga dopo i filtri %s" % (sid, filtri))
        return None

    def e_num(c):
        vv = [numero(r[c]) for r in sel[:400] if r[c] != ""]
        return len(vv) > 0 and sum(v is not None for v in vv) >= 0.8 * len(vv)
    xs = [c for c in cols if c.lower() in X_NOMI or re.match(r"^(anno|mese|periodo|decennio)", c.lower())]
    lohi = [c for c in cols if RE_LOHI.match(c.lower())]
    gruppo = [c for c, v in filtri.items() if len(v) > 1]
    testo_c = [c for c in cols if not e_num(c) and c not in xs and c not in filtri]
    numc = [c for c in cols if e_num(c) and c not in xs and c not in lohi and c not in filtri and c not in soglie]
    if scarta:  # le righe sotto soglia restano come buchi nella linea
        for i in scarta:
            for c in numc:
                sel[i] = dict(sel[i]); sel[i][c] = ""
    if not numc:
        rapporto.append("%s: nessuna colonna di valori (%s)" % (sid, cols))
        return None
    anni = [int(a) for a in re.findall(r"(1[89]\d\d|20[0-2]\d)", g.get("anni", ""))]
    if "intervallo" in tipo or ("barre" in tipo and lohi) :
        etich = (testo_c + gruppo + xs)[:2] or [H[0]]
        v = numc[0]
        lo = next((c for c in lohi if re.search(r"lo|basso|inf", c.lower())), None)
        hi = next((c for c in lohi if re.search(r"hi|alto|sup", c.lower())), None)
        rr = sel[:40]
        return {"forma": "intervalli", "x": [" · ".join(r[c] for c in etich) for r in rr], "serie": [{"nome": v, "v": [numero(r[v]) for r in rr]}],
                "lo": [numero(r[lo]) for r in rr] if lo else None, "hi": [numero(r[hi]) for r in rr] if hi else None}
    if xs:
        x = xs[0]
        grp = (gruppo or testo_c)[:1]
        serie = []
        if grp:
            gc = grp[0]
            valori = []
            for r in sel:
                if r[gc] not in valori:
                    valori.append(r[gc])
            for val in valori[:5]:
                rr = [r for r in sel if r[gc] == val]
                serie.append({"nome": val, "punti": [[r[x], numero(r[numc[0]])] for r in rr]})
        else:
            for c in numc[:5]:
                serie.append({"nome": c, "punti": [[r[x], numero(r[c])] for r in sel]})
        # x numerico (anni) o testo
        def xv(s):
            s = str(s)
            m = re.match(r"^(\d{4})-(\d{2})", s)
            if m:
                return int(m.group(1)) + (int(m.group(2)) - 1) / 12
            m = re.match(r"^(\d{4})(?:-(\d{2,4}))?", s)
            if m:
                a = int(m.group(1))
                if m.group(2):
                    b = int(m.group(2)) if len(m.group(2)) == 4 else int(m.group(1)[:2] + m.group(2))
                    return (a + b) / 2
                return a
            return numero(s)
        tutti_num = all(xv(p[0]) is not None for s in serie for p in s["punti"])
        if tutti_num:
            for s in serie:
                s["punti"] = sorted([[round(xv(p[0]), 3), p[1]] for p in s["punti"] if (not anni or anni[0] - 1 <= xv(p[0]) <= anni[-1] + 1)], key=lambda q: q[0])
            forma = "colonne" if "colonne" in tipo else ("multipli" if "multipli" in tipo else "linee")
            return {"forma": forma, "serie": [{"nome": s["nome"], "punti": s["punti"][:2500]} for s in serie], "xtipo": "numero"}
        cat = [p[0] for p in serie[0]["punti"]][:40]
        return {"forma": "barre" if "barre" in tipo else "categorie", "x": cat, "serie": [{"nome": s["nome"], "v": [p[1] for p in s["punti"]][:40]} for s in serie[:5]]}
    etich = (testo_c + gruppo)[:1] or [H[0]]
    rr = sel[:30]
    return {"forma": "barre", "x": [r[etich[0]] for r in rr], "serie": [{"nome": c, "v": [numero(r[c]) for r in rr]} for c in numc[:3]]}


# Titoli dei capitoli decisi il 22/11/2026: brevi ed esplicativi. La parola-simbolo del titolo della redazione
# («Messieurs», «Adunque»...) non va nel titolo: resta come citazione piccola nella pagina riassunto.
TITOLI_CAPITOLI = {1: "Due lingue in aula", 2: "L'Italia unita accorcia le frasi", 3: "La guerra e il regime", 4: "Amici e nemici",
                   5: "Il PCI va verso la DC", 6: "Tangentopoli arriva in aula", 7: "La lingua di oggi"}


def porte_html(t):
    """«Storia `id`; H25: smentita; Scheda di «patria»» -> collegamenti."""
    if not t:
        return ""
    h = md_inline(re.sub(r"`([a-z0-9-]+)`", r"[[\1]]", t))
    h = re.sub(r"[Ss]tori[ae]\s+(?=\[\[)", "", h)
    h = re.sub(r"\[\[([a-z0-9-]+)\]\]", r'<a class="lk" href="storia.html?id=\1">la storia</a>', h)
    h = re.sub(r"\b(H\d+[a-z]?)\b", r'<a class="lk" href="esperimento.html?cod=\1">\1</a>', h)
    h = re.sub(r"«([^»]{2,40})»", lambda m: '«<a class="lk" href="parola.html?p=%s">%s</a>»' % (m.group(1).lower(), m.group(1)), h)
    return h


def main():
    files = [p for p in sorted(glob.glob(os.path.join(STORIE, "*.md"))) if not os.path.basename(p).startswith("_") and os.path.basename(p) != "INDICE.md"]
    ordine = []
    ip = os.path.join(STORIE, "INDICE.md")
    if os.path.exists(ip):
        ordine = re.findall(r"^\|\s*\d+\s*\|\s*`([a-z0-9-]+)`", open(ip, encoding="utf-8").read(), re.M)
    rapporto = []
    escluse = []
    indice = []
    n_graf = n_ok = 0
    for p in files:
        sid = os.path.basename(p)[:-3]
        grezzo = open(p, encoding="utf-8").read()
        if "DA VERIFICARE" in grezzo:
            rapporto.append("%s: contiene [DA VERIFICARE], non pubblicata" % sid)
            escluse.append(sid)
            vecchio = os.path.join(DATI, "storie", sid + ".json")
            if os.path.exists(vecchio):
                os.remove(vecchio)  # file generato da questo programma, non del progetto
            continue
        d, corpo = testa(grezzo)
        if not d.get("titolo"):
            rapporto.append("%s: senza titolo, saltata" % sid)
            continue
        s = sezioni(corpo)
        gr = []
        for g in grafici(s.get("grafici", "")):
            n_graf += 1
            try:
                dati = risolvi(g, rapporto, sid)
            except Exception as e:  # una tabella strana non deve fermare tutto
                rapporto.append("%s: errore %s" % (sid, e))
                dati = None
            if dati:
                n_ok += 1
            gr.append({"tipo": g.get("tipo", ""), "titolo": md_inline(g.get("titolo", "")), "sotto": md_inline(g.get("sottotitolo", "")),
                       "limite": md_inline(g.get("limite sotto il grafico", "")), "dati": dati})
        coll = {}
        for mm in re.finditer(r"^- \*\*(.+?)\*\*:\s*(.*)$", s.get("collegamenti", ""), re.M):
            coll[mm.group(1).strip().lower()] = mm.group(2).strip()
        storia = {"id": sid, "filone": d.get("filone", ""), "titolo": d.get("titolo"), "sottotitolo": d.get("sottotitolo", ""), "occhiello": d.get("occhiello", ""),
                  "ipotesi": d.get("ipotesi") or [], "verdetto": d.get("verdetto", ""), "forza": d.get("forza"), "interesse": d.get("interesse"),
                  "parole": d.get("parole") or [], "partiti": d.get("partiti") or [], "legislature": d.get("legislature") or [],
                  "anni": d.get("anni") or [], "persone": d.get("persone") or [], "temi": d.get("temi") or [],
                  "testo": md_blocchi(s.get("testo", "")), "grafici": gr, "verdetto_testo": md_blocchi(s.get("verdetto e limiti", "")),
                  "storie_collegate": re.findall(r"\b([a-z0-9]+(?:-[a-z0-9]+)+)\b", coll.get("storie ed esperimenti", ""))}
        scrivi_json("storie/%s.json" % sid, storia)
        indice.append({k: storia[k] for k in ("id", "filone", "titolo", "sottotitolo", "occhiello", "ipotesi", "verdetto", "forza", "interesse", "parole", "partiti", "legislature", "anni", "persone", "temi")})
    pos = {s: i for i, s in enumerate(ordine)}
    indice.sort(key=lambda x: (pos.get(x["id"], 9999), -(x["interesse"] or 0) if isinstance(x["interesse"], int) else 0, -(x["forza"] or 0) if isinstance(x["forza"], int) else 0))
    for i, x in enumerate(indice):
        x["n"] = i + 1
    scrivi_json("storie/indice.json", {"storie": indice})
    # conteggio storie nella base
    bp = os.path.join(DATI, "base.json")
    b = json.load(open(bp, encoding="utf-8"))
    b["conti"]["storie"] = len(indice)
    scrivi_json("base.json", b)
    # capitoli del racconto (_progetto/racconto/capitoli/*.md): passi di testo, porte, verdetti.
    # Le righe «Grafico», «Stato» e «Dati» sono istruzioni di lavoro e non vanno in pagina.
    cap_dir = os.path.join(SITO, "_progetto", "racconto", "capitoli")
    # frasi ancora da ricontrollare secondo _progetto/racconto/FRASI_VERE.md («Che cosa resta da controllare»): non si pubblicano
    fv_path = os.path.join(SITO, "_progetto", "racconto", "FRASI_VERE.md")
    in_verifica = []
    if os.path.exists(fv_path):
        fv = open(fv_path, encoding="utf-8").read()
        coda = fv.split("## Che cosa resta da controllare", 1)[-1] if "## Che cosa resta da controllare" in fv else ""
        numeri = set(re.findall(r"\b(\d{1,3})\b", re.sub(r"(?m)^\s*\d+\.\s", "", re.sub(r"«[^»]*»", "", coda))))
        for riga in fv.splitlines():
            m = re.match(r"\|\s*(\d+)\s*\|\s*«([^»]+)»", riga)
            if m and m.group(1) in numeri:
                in_verifica.append(m.group(2)[:28])

    # le citazioni in pagina devono stare nel registro FRASI_VERE.md (forma controllata): le altre restano fuori
    registro = ""
    if os.path.exists(fv_path):
        registro = re.sub(r"\s+", " ", html.unescape(open(fv_path, encoding="utf-8").read()))

    def nel_registro(q):
        q = re.sub(r"\s+", " ", q).strip()
        return len(q) < 30 or q[:25] in registro

    def senza_frasi_in_verifica(html_):
        tolte = 0
        pezzi = re.split(r"(?=<p>)|(?=<ul>)", html_)
        tenuti = []
        for pz in pezzi:
            pulito = html.unescape(re.sub(r"<[^>]+>", "", pz))
            if any(q in pulito for q in in_verifica) or any(not nel_registro(c) for c in re.findall(r"«([^»]{30,})»", pulito)):
                tolte += 1
                continue
            tenuti.append(pz)
        return "".join(tenuti), tolte
    capitoli = []
    for pc in sorted(glob.glob(os.path.join(cap_dir, "*.md"))):
        grezzo = open(pc, encoding="utf-8").read()
        if "DA VERIFICARE" in grezzo:
            rapporto.append("capitolo %s: contiene [DA VERIFICARE], non pubblicato" % os.path.basename(pc))
            continue
        d, corpo = testa(grezzo)
        sez = sezioni(corpo)
        passi = []
        for blocco in re.split(r"^### ", sez.get("testo e passi", ""), flags=re.M)[1:]:
            righe = blocco.split("\n")
            tit = re.sub(r"^Passo\s+\d+\s*[—-]\s*", "", righe[0]).strip()
            testo, porte = [], ""
            for r in righe[1:]:
                if r.startswith(">"):
                    m = re.match(r">\s*\*\*Porte\.\*\*\s*(.*)", r)
                    if m:
                        porte = m.group(1)
                    continue
                testo.append(r)
            corpo_passo, tolte = senza_frasi_in_verifica(md_blocchi("\n".join(testo)))
            if tolte:
                rapporto.append("capitolo %s, passo «%s»: %d capoversi tolti perche' citano frasi ancora da ricontrollare" % (d.get("capitolo"), tit, tolte))
            passi.append({"titolo": md_inline(tit), "testo": corpo_passo, "porte": porte_html(porte)})
        simbolo = (re.match(r"\s*«([^»]+)»", d.get("titolo", "")) or [None, ""])[1]
        breve = re.split(r"(?<=[.!?])\s", d.get("sommario", ""), maxsplit=1)[0]
        cap = {"n": d.get("capitolo"), "id": d.get("id"), "titolo": TITOLI_CAPITOLI.get(int(d.get("capitolo") or 0), d.get("titolo")), "simbolo": simbolo,
               "sommario": breve, "anni": [int(x) for x in (d.get("anni") or []) if str(x).isdigit()],
               "frase": "" if any(q in d.get("frase_gigante", "") for q in in_verifica) else d.get("frase_gigante", ""),
               "chi": "" if any(q in d.get("frase_gigante", "") for q in in_verifica) else d.get("frase_gigante_chi", ""), "storie": d.get("storie") or [], "ipotesi": d.get("ipotesi") or [],
               "parole": d.get("parole") or [], "persone": d.get("persone") or [], "legislature": d.get("legislature") or [], "passi": passi,
               "stenografo": md_blocchi(sez.get("il momento dello stenografo", "")), "porte_fondo": md_blocchi(sez.get("tre porte in fondo al capitolo", "")),
               "verdetti": md_blocchi(sez.get("verdetti toccati", "")), "verso": md_blocchi(next((v for k, v in sez.items() if k.startswith("verso")), ""))}
        scrivi_json("capitoli/%s.json" % cap["n"], cap)
        capitoli.append({k: cap[k] for k in ("n", "id", "titolo", "simbolo", "sommario", "anni", "frase", "chi")})
    capitoli.sort(key=lambda c: int(c["n"] or 0))
    rac = open(os.path.join(SITO, "_progetto", "racconto", "RACCONTO.md"), encoding="utf-8").read()
    m1 = re.search(r"Prologo:[^«]*«([^»]+)»", rac)
    m2 = re.search(r"Chiusa:[^«]*«([^»]+)»", rac)
    m3 = re.search(r"Sotto, la riga: «([^»]+)»", rac)
    scrivi_json("capitoli/indice.json", {"capitoli": capitoli, "prologo": m1.group(1) if m1 else "", "riga": m3.group(1) if m3 else "",
                                         "chiusa": m2.group(1) if m2 else ""})
    print("capitoli:", len(capitoli))
    # testi fissi
    tp = os.path.join(SITO, "_progetto", "TESTI_PAGINE.md")
    if os.path.exists(tp):
        t = open(tp, encoding="utf-8").read()
        sez = re.split(r"^## (.+)$", t, flags=re.M)
        testi = {}
        for i in range(1, len(sez), 2):
            nome = sez[i].strip().lower()
            if "metodo" in nome and "testo completo" in nome:
                corpo = re.sub(r"^> Nota per chi costruisce.*$", "", sez[i + 1], flags=re.M)
                parti = re.split(r"^### (.+)$", corpo, flags=re.M)
                h = ""
                for j in range(1, len(parti), 2):
                    tit, txt = parti[j].strip(), parti[j + 1].strip()
                    if tit.lower() == "titolo":
                        testi["metodo_titolo"] = md_inline(txt)
                    elif tit.lower() == "sommario":
                        h += '<p class="sommario">%s</p>' % md_inline(txt)
                    elif "segnalare" in tit.lower() or "{" in txt:
                        continue
                    else:
                        h += "<h2>%s</h2>%s" % (md_inline(tit), md_blocchi(txt))
                testi["metodo"] = h
        json.dump(testi, open(os.path.join(CACHE, "testi_pagine.json"), "w", encoding="utf-8"), ensure_ascii=False)
    open(os.path.join(CACHE, "storie_rapporto.txt"), "w", encoding="utf-8").write("\n".join(rapporto))
    print("storie escluse perche' da verificare:", len(escluse), escluse)
    print("storie:", len(indice), "grafici:", n_graf, "con dati:", n_ok, "segnaposti:", n_graf - n_ok)
    fine()


if __name__ == "__main__":
    main()
