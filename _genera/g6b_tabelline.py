r"""g6b - Tabelline per i grafici delle storie che restano segnaposto.

FONTE E METODO
  - Elenco: le storie in _progetto/storie/*.md (sezione «Grafici»: campi titolo, file, colonne, tipo, come li legge g6).
    Per ogni grafico che g6 non riesce a disegnare (file .txt/.md/.json oppure .csv senza colonne di valori) qui c'e'
    una regola scritta nel codice che estrae da quel file una piccola tabella (al massimo 12 righe e 4 colonne).
  - Numeri: letti ogni volta dai file del progetto in D:\vocabolario-parlamento (SOLA LETTURA: il programma non scrive li').
    File .txt e .md: righe e sezioni trovate con espressioni regolari (la riga «Austria per periodo», l'istogramma del placebo,
    le coppie anno:volte...). File .csv: conteggi e filtri come dice il blocco della storia. File .json: le chiavi indicate.
    Nel codice ci sono solo le etichette (nomi delle colonne, delle righe, degli anni dei periodi).
  - Percorsi: il file sorgente si ricava dal campo «file» del blocco della storia, mai scritto a mano nel codice.
  - Controllo: i numeri chiave della tabella (quelli che il titolo, il testo o il blocco citano) devono comparire nel testo
    della storia (_progetto/storie/<id>.md, escluse le righe «file»), scritti all'italiana (virgola, punto delle migliaia),
    oppure come data in lettere. Se non tornano, la tabella non si scrive: la storia resta segnaposto e il motivo va nel riepilogo.
  - Righe scelte: dove un grafico ha piu' di 12 punti si tiene una scelta dichiarata nella nota (per esempio le righe con piu' frasi
    lette, o gli anni piu' significativi); i decenni di fila a zero si riuniscono in una riga sola.
USCITA  _genera/cache/tabelline.json
          {"<id storia>": [{"file", "titolo", "forma": "tabella", "colonne": [...], "righe": [[...]], "nota": "..."}]}
        poi un riepilogo a video: tabelle fatte, storie che restano segnaposto e perche'.
USO     python -I _genera/g6b_tabelline.py
"""
import csv
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import BASE, SITO, CACHE  # noqa

STORIE = os.path.join(SITO, "_progetto", "storie")
USCITA = os.path.join(CACHE, "tabelline.json")
MAX_RIGHE, MAX_COL = 12, 4

MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
# anni di inizio delle legislature della Camera (etichette per scrivere «XI» come 1992-94)
LEG_INIZIO = {"I": 1948, "II": 1953, "III": 1958, "IV": 1963, "V": 1968, "VI": 1972, "VII": 1976, "VIII": 1979, "IX": 1983, "X": 1987,
              "XI": 1992, "XII": 1994, "XIII": 1996, "XIV": 2001, "XV": 2006, "XVI": 2008, "XVII": 2013, "XVIII": 2018}
LEG_FINE_ULTIMA = 2022


# ---------------------------------------------------------------- lettura

def leggi(p):
    with open(p, encoding="utf-8-sig", errors="replace") as f:
        return f.read()


def righe_csv(p):
    with open(p, encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def num(s):
    """'+0,06' / '0.0035' / '1.234' -> float (il punto e' decimale nei file del progetto, la virgola nei testi)."""
    return float(str(s).replace("\u2212", "-").replace(",", ".").replace("+", ""))


def testa(t):
    m = re.match(r"---\s*\n(.*?)\n---\s*\n", t, re.S)
    return t[m.end():] if m else t


def sezione_grafici(corpo):
    parti = re.split(r"^## (.+)$", corpo, flags=re.M)
    for i in range(1, len(parti), 2):
        if parti[i].strip().lower() == "grafici":
            return parti[i + 1]
    return ""


def blocchi_grafici(testo):
    out = []
    for blocco in re.split(r"^### .*$", testo, flags=re.M)[1:]:
        g = {}
        for mm in re.finditer(r"^- \*\*(.+?)\*\*:\s*(.*)$", blocco, re.M):
            g[mm.group(1).strip().lower()] = mm.group(2).strip()
        if g:
            out.append(g)
    return out


def file_blocco(g):
    """Stesso modo di g6 per ricavare il file del grafico (primo percorso tra apici)."""
    f = (g.get("file") or "").split(";")[0].split(" e ")[0]
    f = re.findall(r"`([^`]+)`", f) or [f]
    return f[0].strip().rstrip(",")


def percorsi_blocco(g):
    return [x.strip() for x in re.findall(r"`([^`]+)`", g.get("file", "")) if "/" in x or "." in x]


def abs_p(rel):
    return os.path.join(BASE, rel.replace("/", os.sep))


# ---------------------------------------------------------------- formati e controlli

def it(x, dec):
    s = "{:,.{d}f}".format(abs(x), d=dec)
    return s.replace(",", "\0").replace(".", ",").replace("\0", ".")


def N(v, *decs):
    return ("n", v, decs or (0,))


def D(iso):
    return ("d", iso)


def S(txt):
    return ("s", txt)


def norm_corpus(t):
    t = t.replace("\u2212", "-").replace("\u00a0", " ").replace("*", "").replace("`", "")
    return t


def cerca_num(corpus, s):
    return re.search(r"(?<![\d.,])" + re.escape(s) + r"(?![\d]|[.,]\d)", corpus) is not None


def data_varianti(iso):
    a, m, g = iso.split("-")
    gi, mi = int(g), int(m)
    v = ["%d %s %s" % (gi, MESI[mi - 1], a), "%d/%d/%s" % (gi, mi, a), "%d/%02d/%s" % (gi, mi, a)]
    if gi == 1:
        v += ["1\u00ba %s %s" % (MESI[mi - 1], a), "1\u00b0 %s %s" % (MESI[mi - 1], a)]
    return v


def verifica(corpus, attesi):
    """Ritorna l'elenco di cio' che non si trova nel testo della storia."""
    mancano = []
    for a in attesi:
        if a[0] == "n":
            ok = False
            for d in a[2]:
                s = it(a[1], d)
                if cerca_num(corpus, s) or (a[1] == int(a[1]) and cerca_num(corpus, str(int(abs(a[1]))))):
                    ok = True
                    break
            if not ok:
                mancano.append(" / ".join(it(a[1], d) for d in a[2]))
        elif a[0] == "d":
            if not any(v in corpus for v in data_varianti(a[1])):
                mancano.append(a[1])
        else:
            if a[1] not in corpus:
                mancano.append(a[1])
    return mancano


def pct(x, dec=1):
    return round(x * 100, dec)


def data_it(iso):
    a, m, g = iso.split("-")
    return "%d/%d/%s" % (int(g), int(m), a)


def anni_leg(rom):
    ini = LEG_INIZIO[rom]
    ordine = list(LEG_INIZIO)
    i = ordine.index(rom)
    fine = LEG_INIZIO[ordine[i + 1]] if i + 1 < len(ordine) else LEG_FINE_ULTIMA
    return "%d-%02d" % (ini, fine % 100)


def segno(x, dec=2):
    s = it(x, dec)
    return ("+" if x > 0 else ("\u2212" if x < 0 else "")) + s


class Scarto(Exception):
    """La tabella non si puo' fare: il motivo va nel riepilogo."""


# ---------------------------------------------------------------- regole, una per grafico
# Ogni regola riceve il blocco della storia (g) e ritorna (colonne, righe, nota, attesi).

def t_austria_periodi(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"^Austria per periodo:\s*(.+)$", t, re.M)
    if not m:
        raise Scarto("riga «Austria per periodo» non trovata")
    v = {int(a): num(b) for a, b in re.findall(r"Q(\d)\s+([\d.]+)", m.group(1))}
    anni = {1: "1945-55", 2: "1956-67", 3: "1968-72", 4: "1973-91", 5: "1992-2022"}
    if sorted(v) != [1, 2, 3, 4, 5]:
        raise Scarto("periodi Q1-Q5 incompleti")
    righe = [[anni[k], pct(v[k])] for k in sorted(v)]
    return ["Periodo", "Austria «nemica» (% dei passaggi)"], righe, "Quota di passaggi in cui l'Austria e' trattata da nemica, letta dal giudice automatico.", [N(pct(v[2], 0), 0)]


def t_jugoslavia_periodi(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"^Jugoslavia per periodo \(ostilita', pesata\):\s*(.+)$", t, re.M)
    if not m:
        raise Scarto("riga «Jugoslavia per periodo» non trovata")
    v = {int(a): num(b) for a, b in re.findall(r"P(\d)\s+([\d.]+)", m.group(1))}
    anni = {1: "1945-54", 2: "1955-69", 3: "1970-74", 4: "1975-77", 5: "1978-90"}
    if sorted(v) != [1, 2, 3, 4, 5]:
        raise Scarto("periodi P1-P5 incompleti")
    righe = [[anni[k], pct(v[k])] for k in sorted(v)]
    return ["Periodo", "Jugoslavia «nemica» (% dei passaggi)"], righe, "Quote pesate sul numero di menzioni di ogni gruppo di oratori.", [N(pct(v[1], 0), 0), N(pct(v[5], 0), 0)]


def t_ambiente_giudizio(g):
    rr = righe_csv(abs_p(file_blocco(g)))
    ordine = ["1948-1959", "anni 1960", "anni 1970", "anni 1980", "anni 1990", "anni 2000", "anni 2010", "2020-2022"]
    tot, eco = {}, {}
    for r in rr:
        tot[r["gruppo"]] = tot.get(r["gruppo"], 0) + 1
        if r["giudizio"].strip().lower() == "ecologico":
            eco[r["gruppo"]] = eco.get(r["gruppo"], 0) + 1
    if set(tot) != set(ordine):
        raise Scarto("gruppi inattesi nel file: %s" % sorted(tot))
    righe = [[k, eco.get(k, 0), tot[k], pct(eco.get(k, 0) / tot[k], 0)] for k in ordine]
    return ["Periodo", "Frasi sull'ecologia", "Frasi lette", "Quota (%)"], righe, "Frasi con «ambiente» in senso ecologico su un campione a caso per periodo, rilette una per una.", \
        [N(righe[0][3], 0), N(righe[-1][3], 0)]


def t_cimitero_tipi(g):
    rr = righe_csv(abs_p(file_blocco(g)))
    cont = {}
    for r in rr:
        s = (r.get("sottotipo") or "").strip().lower()
        if s.startswith("nome proprio") or s.startswith("frammento"):
            continue
        cont[r["tipo"]] = cont.get(r["tipo"], 0) + 1
    totale = sum(cont.values())
    nomi = {"altro": "lessico comune"}
    ordine = ["forma antica", "istituzione", "tecnica", "prestito", "altro"]
    ordine += [k for k in cont if k not in ordine]
    righe = [[nomi.get(k, k), cont[k], pct(cont[k] / totale)] for k in ordine if k in cont]
    attesi = [N(totale, 0), N(cont.get("forma antica", 0), 0), N(pct(cont.get("forma antica", 0) / totale, 0), 0)]
    return ["Tipo di parola morta", "Parole", "Quota (%)"], righe, "Tolti cognomi e pezzi di parola; tipi assegnati da un programma.", attesi


def t_dc_psi_riferimenti(g):
    t = leggi(abs_p(file_blocco(g)))
    sez = t.split("2) DC-PCI nel 1976-79")[1].split("\n3)")[0]
    nomi = ["anni 1962-63", "anni 1958-65", "legislatura III (1958-63)", "legislatura IV (1963-68)"]
    righe, vistin = [], []
    for m in re.finditer(r"^\s*DC-PSI (.+?): ([\d.]+) \(([\d.]+)\) \| DC-PCI legislatura VII \(1976-79\): ([\d.]+) \(([\d.]+)\)", sez, re.M):
        vistin.append(m.group(1))
        righe.append([m.group(1).replace(" (riferimento principale)", ""), num(m.group(2)), round(1.96 * num(m.group(3)), 4), num(m.group(4))])
    if len(righe) != 4:
        raise Scarto("righe DC-PSI/DC-PCI VII trovate: %d invece di 4" % len(righe))
    for r, n in zip(righe, nomi):
        if r[0] != n:
            raise Scarto("riferimento inatteso: %s" % r[0])
    pci = righe[0][3]
    return ["Riferimento DC-PSI", "DC-PSI", "Margine (\u00b1)", "DC-PCI 1976-79"], righe, \
        "Distanza di lingua, 0 = indistinguibili; margine = 1,96 \u00d7 errore. DC-PCI 1976-79: margine \u00b1%s." % it(1.96 * 0.0002, 4), \
        [N(righe[0][1], 4), N(pci, 4)]


def t_distanza_coppie(g):
    t = leggi(abs_p(file_blocco(g)))
    sez = t.split("Altre coppie della Prima Repubblica")[1].split("\nB)")[0]
    coppie = {}
    for m in re.finditer(r"^\s*tutte\s+([A-Za-z]+-[A-Za-z]+):\s+VII ([\d.]+)\s+VIII ([\d.]+)\s+IX ([\d.]+)", sez, re.M):
        coppie[m.group(1)] = (num(m.group(2)), num(m.group(4)))
    m = re.search(r"^\s*tutte\s+VII ([\d.]+) VIII ([\d.]+) IX ([\d.]+) X ([\d.]+); VIII->IX", t, re.M)
    if not m:
        raise Scarto("riga A2 (DC-PCI VII e IX) non trovata")
    coppie["DC-PCI"] = (num(m.group(1)), num(m.group(3)))
    ordine = ["DC-PCI", "PCI-PSI", "DC-PSI", "DC-MSI", "MSI-PCI"]
    if any(k not in coppie for k in ordine):
        raise Scarto("coppie mancanti: %s" % [k for k in ordine if k not in coppie])
    righe = [[k, coppie[k][0], coppie[k][1], round(coppie[k][1] - coppie[k][0], 4)] for k in ordine]
    return ["Coppia di partiti", "VII leg. (1976-79)", "IX leg. (1983-87)", "Cambio"], righe, \
        "Distanza di lingua tra i partiti (0 = parlano uguale); piu' e' alta, piu' sono diversi. Camera.", [N(coppie["DC-PCI"][0], 4), N(coppie["DC-PCI"][1], 4)]


def t_moro_svolta(g):
    t = leggi(abs_p(file_blocco(g)))
    sez = t.split("CONFRONTO PRIMA/DOPO CON FINESTRE FISSE")[1]
    etic = {"B": "Posizione del PCI", "C": "Divario PCI-DC"}
    righe, attesi = [], []
    for m in re.finditer(r"^\s*serie ([BC]) (?:posizione PCI|divario PCI-DC), (maggio 1978|gennaio 1979): prima ([+-][\d.]+), dopo ([+-][\d.]+); "
                         r"differenza ([+-][\d.]+) \[([+-][\d.]+); ([+-][\d.]+)\]", sez, re.M):
        d, lo, hi = num(m.group(5)), num(m.group(6)), num(m.group(7))
        righe.append(["%s, %s" % (etic[m.group(1)], m.group(2)), num(m.group(3)), num(m.group(4)),
                      "%s (da %s a %s)" % (segno(d), segno(lo), segno(hi))])
        if m.group(1) == "B" and m.group(2) == "gennaio 1979":
            attesi.append(N(d, 2))
    if len(righe) != 4:
        raise Scarto("righe B/C prima-dopo trovate: %d invece di 4" % len(righe))
    return ["Misura e data", "Prima", "Dopo", "Differenza (margine)"], righe, "Sull'asse DC (0) - PCI (1); tra parentesi il margine di incertezza della differenza.", attesi


def t_forme_antiche_decenni(g):
    rr = [r for r in righe_csv(abs_p(file_blocco(g))) if r["lista"] == "h7_protette"]
    cont = {}
    for r in rr:
        if r["anno_meta"].strip() == "":
            continue
        d = int(float(r["anno_meta"])) // 10 * 10
        cont[d] = cont.get(d, 0) + 1
    tot = sum(cont.values())
    dec = list(range(min(cont), max(cont) + 10, 10))
    righe, i = [], 0
    while i < len(dec):
        j = i
        while j < len(dec) and cont.get(dec[j], 0) == 0:
            j += 1
        if j - i >= 3:  # tre o piu' decenni di fila a zero: una riga sola
            righe.append(["%d-%d" % (dec[i], dec[j - 1] + 9), 0])
            i = j
        else:
            righe.append(["%d-%d" % (dec[i], dec[i] + 9), cont.get(dec[i], 0)])
            i += 1
    d1860, d1910 = cont.get(1860, 0), cont.get(1910, 0)
    return ["Decennio", "Forme che si dimezzano"], righe, "Su %d forme antiche con almeno 150 occorrenze; decenni di fila senza forme riuniti in una riga." % tot, \
        [N(d1860, 0), N(tot, 0)] if d1910 == 0 else [N(d1860, 0), N(tot, 0), N(d1910, 0)]


def t_uffizio_anni(g):
    t = leggi(abs_p(file_blocco(g))).splitlines()
    i0 = next((i for i, r in enumerate(t) if "Quota della forma antica anno per anno" in r), None)
    if i0 is None:
        raise Scarto("sezione «Quota della forma antica anno per anno» non trovata")
    riga = next((r for r in t[i0 + 1:] if r.strip().startswith("uffizio")), None)
    if riga is None:
        raise Scarto("riga «uffizio» non trovata")
    v = {int(a): (int(b), int(c)) for a, b, c in re.findall(r"(\d{4}):\s*(\d+)\|\s*(\d+)", riga)}
    scelti = [a for a in sorted(v) if a in (1848, 1856, 1899) or a % 10 == 0]
    righe = [[a, v[a][0], v[a][1]] for a in scelti]
    return ["Anno", "Camera (%)", "Senato (%)"], righe, "Quota di «uffizio» sul totale di «uffizio» e «ufficio»; anni scelti: 1848, ogni decennio, 1856 e 1899.", \
        [N(v[1856][0], 0), N(v[1856][1], 0)]


def t_germania_fase3(g):
    d = json.load(open(abs_p(file_blocco(g)), encoding="utf-8"))["h71"]
    et = [("p1990_2010", "1990-2010"), ("p2011_15", "2011-15"), ("p2016_22", "2016-22")]
    righe = [[n, round(d[k][0], 2), round(d[k][1], 2), round(d[k][2], 2)] for k, n in et]
    return ["Periodo", "Ostilita'", "Margine basso", "Margine alto"], righe, "Ostilita' da -1 (amica) a +1 (nemica), letta dal giudice automatico.", \
        [N(righe[0][1], 2), N(righe[1][1], 2), N(righe[2][1], 2)]


def t_germania_lessico(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"^\(a2\) INDICE PER BLOCCHI DI 5 ANNI ALLINEATI:\s*(.+)$", t, re.M)
    if not m:
        raise Scarto("riga (a2) non trovata")
    voci = [(a, num(b), int(c)) for a, b, c in re.findall(r"(\d{4}-\d{4}) ([+-]\d,\d\d) \(H\+A=(\d+)\)", m.group(1))]
    if len(voci) != 15:
        raise Scarto("blocchi trovati: %d invece di 15" % len(voci))
    if len(voci) > MAX_RIGHE:
        meno = sorted(voci, key=lambda x: x[2])[:len(voci) - MAX_RIGHE]
        tolti = {x[0] for x in meno}
        nota = "Non mostrati i %d blocchi con meno frasi lette: %s." % (len(meno), "; ".join("%s %s" % (x[0], segno(x[1])) for x in sorted(meno)))
        voci = [x for x in voci if x[0] not in tolti]
    else:
        nota = ""
    righe = [[a, v] for a, v, _ in voci]
    attesi = [N(voci[0][1], 2)] + [N(v, 2) for a, v, _ in voci if a == "2011-2015"]
    return ["Anni", "Indice di ostilita'"], righe, ("Da -1 (solo amicizia) a +1 (solo inimicizia), contato con le parole vicine. " + nota).strip(), attesi


def t_insulti(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"forme piu' frequenti 1994-2022 \(tot (\d+)\):\s*(.+)$", t, re.M)
    if not m:
        raise Scarto("riga «forme piu' frequenti 1994-2022» non trovata")
    coppie = [(a, int(b)) for a, b in re.findall(r"([A-Za-z\u00c0-\u00ff']+) (\d+)", m.group(2))]
    if len(coppie) != 10:
        raise Scarto("forme trovate: %d invece di 10" % len(coppie))
    return ["Insulto", "Volte"], [[a, b] for a, b in coppie], "Camera e Senato, 1994-2022; ogni forma e' contata a parte.", [N(coppie[0][1], 0)]


def blocchi_h40(t):
    """{nome blocco: [voci]}; voce = (data, ramo, chi, testo)."""
    out, cur = {}, None
    for r in t.splitlines():
        if r.startswith("=== "):
            cur = r[4:]
            out[cur] = []
            continue
        m = re.match(r"^\d+\. (\d{4}-\d\d-\d\d) \| (camera|senato) \| (.+?) \| ", r)
        if m and cur is not None:
            out[cur].append([m.group(1), m.group(2), m.group(3), ""])
        elif cur is not None and out[cur] and r.startswith(" ") and not out[cur][-1][3]:
            out[cur][-1][3] = r.strip()
    return out


def titolo_nome(s):
    s = s.split(",")[0].strip()
    return " ".join(p.capitalize() for p in s.split())


def t_mafie_prime(g):
    b = blocchi_h40(leggi(abs_p(file_blocco(g))))
    chiavi = {"camorra": "camorra", "maffia": "maffia (due f", "antimafia": "antimafia (parola stretta)", "Cosa nostra": "cosa nostra VALIDA",
              "'ndrangheta": "'ndrangheta", "Sacra corona unita": "sacra corona unita"}
    righe, attesi, nota = [], [], ""
    for nome, k in chiavi.items():
        voci = next((v for kk, v in b.items() if kk.startswith(k)), None)
        if not voci:
            raise Scarto("blocco «%s» non trovato" % k)
        prima = voci[0]
        if nome == "antimafia":
            prima = next((v for v in voci if ">>antimafia<<" in v[3].lower()), None)
            if prima is None:
                raise Scarto("prima voce «antimafia» non trovata")
            if voci[0] is not prima and ">>antimafioso<<" in voci[0][3].lower():
                nota = "«antimafioso» c'e' gia' il %s (%s, %s)." % (data_it(voci[0][0]), titolo_nome(voci[0][2]), "Camera" if voci[0][1] == "camera" else "Senato")
        righe.append([nome, data_it(prima[0]), titolo_nome(prima[2]), "Camera" if prima[1] == "camera" else "Senato"])
        attesi.append(D(prima[0]))
    return ["Parola", "Prima volta", "Chi parla", "Ramo"], righe, ("Prima menzione che regge alla rilettura. " + nota).strip(), attesi


def t_mappa_somiglianze(g):
    rr = righe_csv(abs_p(file_blocco(g)))
    righe, attesi = [], []
    for unita in ("M5S (XVII)", "M5S (XVIII)"):
        r = next((x for x in rr if x["unita"] == unita), None)
        if r is None:
            raise Scarto("riga %s non trovata" % unita)
        rom = re.search(r"\((\w+)\)", unita).group(1)
        for k in range(1, 6):
            m = re.match(r"^(.+?) \((\w+)\) ([\d.]+)$", r["simile_altra_leg_%d" % k].strip())
            if not m:
                raise Scarto("cella inattesa: %s" % r["simile_altra_leg_%d" % k])
            righe.append([anni_leg(rom), "%s (%s)" % (m.group(1), anni_leg(m.group(2))), num(m.group(3))])
            if unita == "M5S (XVII)" and m.group(1) == "MSI" and m.group(2) == "XI":
                attesi.append(N(num(m.group(3)), 2))
    return ["M5S nella legislatura", "Partito piu' simile", "Somiglianza"], righe, "Somiglianza delle parole: 1 = identici, 0 = nessuna relazione. Solo partiti di altre legislature.", attesi


def t_ministri_grafie(g):
    t = leggi(abs_p(file_blocco(g)))
    righe, attesi = [], []
    for m in re.finditer(r"^(uffizio|sieno)\s+(\d{4})-(\d{4})\s+(\d+)\s+([\d.]+)%\s+([\d.]+)%\s+([+-][\d.]+) \[\s*[+-][\d.]+;\s*[+-][\d.]+\] punti", t, re.M):
        cam, sen, dif = num(m.group(5)), num(m.group(6)), num(m.group(7))
        righe.append(["%s %s-%s" % (m.group(1), m.group(2), m.group(3)[2:]), cam, sen, dif])
        if m.group(1) == "uffizio" and m.group(2) == "1848":
            attesi += [N(cam, 0), N(sen, 0)]
    if len(righe) != 10:
        raise Scarto("righe uffizio/sieno trovate: %d invece di 10" % len(righe))
    return ["Forma e periodo", "Camera (%)", "Senato (%)", "Differenza (punti)"], righe, "Quota della forma antica sul totale delle due forme, media per persona, stessi ministri nei due rami.", attesi


def t_placebo(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"^istogramma:\s*\[([\d,\s]+)\]", t, re.M)
    m2 = re.search(r"quante volte >= 7 su 10:\s*([\d.]+)%", t)
    if not m or not m2:
        raise Scarto("istogramma o percentuale non trovati")
    h = [int(x) for x in m.group(1).split(",")]
    if len(h) != 11 or sum(h) != 1000:
        raise Scarto("istogramma inatteso (somma %d)" % sum(h))
    calc = sum(h[7:]) / 10.0
    if abs(calc - num(m2.group(1))) > 0.05:
        raise Scarto("la somma delle barre da 7 in su (%.1f%%) non torna con la percentuale del file (%s%%)" % (calc, m2.group(1)))
    righe = [[k, h[k]] for k in range(11)]
    return ["Operazioni nel verso atteso", "Prove su 1.000"], righe, "Ruoli rimescolati a caso tra gli oratori: da 7 operazioni in su escono in %d prove su 1.000." % sum(h[7:]), [N(calc, 1)]


def t_parola_anno_lettori(g):
    pa = abs_p(file_blocco(g))
    pb = os.path.join(os.path.dirname(pa), "h22_giudizio_lettore_B.csv")
    if not os.path.exists(pb):
        raise Scarto("file del lettore B non trovato")
    A = {r["id"]: r["giudizio"].strip().lower() for r in righe_csv(pa)}
    B = {r["id"]: r["giudizio"].strip().lower() for r in righe_csv(pb)}
    ids = sorted(set(A) & set(B))
    if len(ids) != len(A) or len(ids) != len(B):
        raise Scarto("gli id dei due file non coincidono")
    due = sum(1 for i in ids if A[i] == "si" and B[i] == "si")
    uno = sum(1 for i in ids if (A[i] == "si") != (B[i] == "si"))
    zero = len(ids) - due - uno
    righe = [["Evento per tutti e due i lettori", due, pct(due / len(ids))], ["Evento per uno solo", uno, pct(uno / len(ids))],
             ["Evento per nessuno dei due", zero, pct(zero / len(ids))]]
    return ["Giudizio", "Parole", "Quota (%)"], righe, "«Incerto» vale come «non evento». Giudizio di due lettori automatici, da ricontrollare su un campione.", \
        [N(len(ids), 0), N(pct(due / len(ids)), 1), N(due, 0), N(uno, 0), N(zero, 0)]


def t_senso_h35(g):
    pp = percorsi_blocco(g)
    nota = leggi(abs_p(pp[0]))
    m = re.search(r"Il cambio medio \u00e8 ([\d,]+) nel vero e ([\d,]+) nel rimescolato", nota)
    if not m:
        raise Scarto("frase «Il cambio medio» non trovata nella nota")
    vero, mesc = num(m.group(1)), num(m.group(2))
    f = next((x for x in righe_csv(abs_p(pp[1])) if x["spec"] == "F"), None)
    if f is None:
        raise Scarto("riga spec = F non trovata")
    same = round(float(f["cambio_medio"]), 3)
    righe = [["Decenni veri", vero, 100], ["Frasi mescolate tra i decenni", mesc, round(mesc / vero * 100)], ["Stesso decennio 2000-09, primo campione", same, round(same / vero * 100)]]
    return ["Confronto", "Cambio medio dei vicini", "Rispetto al vero (%)"], righe, "Il cambio e' 0 se la parola resta identica.", \
        [N(vero, 3), N(mesc, 3), N(round(mesc / vero * 100), 0)]


def t_parole_nuove(g):
    cart = os.path.dirname(abs_p(file_blocco(g)))
    regole = [("privacy", None), ("internet", None), ("euro", 1997), ("spread", "senza1861")]
    righe, attesi, note = [], [], []
    for nome, filtro in regole:
        t = leggi(os.path.join(cart, nome + ".txt"))
        m = re.search(r"Occorrenze per anno \(tutti i turni\)[^\n]*\n([^\n]+)", t)
        d = re.search(r"Anno di decollo[^:]*\):\s*(\d{4})", t)
        if not m or not d:
            raise Scarto("%s: serie per anno o anno di decollo non trovati" % nome)
        v = {int(a): int(b) for a, b in re.findall(r"(\d{4}):(\d+)", m.group(1))}
        if filtro == 1997:
            v = {a: b for a, b in v.items() if a >= 1997}
            note.append("euro contato dal 1997")
        elif filtro == "senza1861":
            scartate = v.pop(1861, 0)
            note.append("spread senza il 1861")
        mt = re.search(r"Occorrenze in tutti i turni: (\d+)", t)
        if not mt:
            raise Scarto("%s: totale delle occorrenze non trovato" % nome)
        if filtro is None:
            tot = int(mt.group(1))  # totale scritto nel file (per internet l'elenco per anno somma 8 in meno)
            if abs(tot - sum(v.values())) > 10:
                raise Scarto("%s: totale e somma per anno troppo diversi" % nome)
        elif filtro == "senza1861":
            tot = int(mt.group(1)) - scartate
        else:
            tot = sum(v.values())
        righe.append([nome, min(v), int(d.group(1)), tot])
        if nome in ("privacy", "internet", "spread"):
            attesi.append(N(tot, 0))
        if nome in ("privacy", "internet"):
            attesi += [N(min(v), 0), N(int(d.group(1)), 0)]
    return ["Parola", "Prima volta (anno)", "Decollo (anno)", "Volte in tutto"], righe, \
        "Conteggi in tutti gli interventi; " + " e ".join(note) + ": le menzioni scartate sono errori di lettura del testo scansionato.", attesi


def t_pci1984_mesi(g):
    t = leggi(abs_p(file_blocco(g)))
    sez = t.split("quota del PCI mese per mese nel 1984")[1].split("\n2.")[0]
    v = {int(a): num(b) for a, b in re.findall(r"mese\s+(\d+): PCI\s+([\d.]+)%", sez)}
    if sorted(v) != list(range(1, 13)):
        raise Scarto("mesi trovati: %s" % sorted(v))
    righe = [[MESI[k - 1].capitalize(), v[k]] for k in range(1, 13)]
    return ["Mese del 1984", "Quota PCI (%)"], righe, "Parole dei deputati PCI sul totale dei deputati con un partito, Camera.", [N(v[4], 1), N(v[5], 1)]


def t_scendere_periodi(g):
    t = leggi(abs_p(file_blocco(g)))
    m = re.search(r"Per milione:\s*(.+?)\.\s*$", t.split("DESCRITTIVO - 'SCENDERE IN CAMPO'")[1], re.M)
    if not m:
        raise Scarto("riga «Per milione» non trovata")
    v = [(a, num(b)) for a, b in re.findall(r"(\d{4}-\d{4}) ([\d.]+)", m.group(1))]
    if len(v) != 5:
        raise Scarto("periodi trovati: %d invece di 5" % len(v))
    dic = dict(v)
    return ["Periodo", "Volte per milione di parole"], [[a, b] for a, b in v], "I periodi hanno lunghezze diverse. Camera e Senato.", \
        [N(dic["1990-1993"], 1), N(dic["1994-2000"], 1)]


def t_terrorismo_prime(g):
    t = leggi(abs_p(file_blocco(g)))
    parti = re.split(r"^(?==== |Prime menzioni in senso)", t, flags=re.M)
    voce = re.compile(r"^(\d{4}-\d\d-\d\d) (cam|sen) (.+?) (?:\[(\w+)\] )?\.\.\.", re.M)

    def prima(sez):
        m = voce.search(sez)
        return m.groups() if m else None

    s_terrorismo = next((p for p in parti if p.startswith("=== prime 14 menzioni di terrorismo")), "")
    s_terrorista = next((p for p in parti if p.startswith("=== prime 14 menzioni di terrorista")), "")
    s_violenza = next((p for p in parti if p.startswith("Prime menzioni in senso")), "")
    a, b = prima(s_terrorista), prima(s_terrorismo)
    if not a or not b or not s_violenza:
        raise Scarto("sezioni delle prime menzioni non trovate")
    viol = {m.group(1): m.groups() for m in voce.finditer(s_violenza)}
    cercate = [("1908-02-28", "violenza politica di oggi (organizzazione terrorista)"), ("1916-03-03", "violenza politica (attentati terroristici)"),
               ("1921-03-23", "violenza politica (terrorismo comunista)")]
    senso = {a[0]: "i giacobini di Parigi", b[0]: "il Terrore del 1793"}
    voci = [(a[0], a[1], "terroristi"), (b[0], b[1], "terrorismo")]
    for d, s in cercate:
        if d not in viol:
            raise Scarto("la menzione del %s non e' nel file" % d)
        voci.append((d, viol[d][1], {"1908-02-28": "terrorista", "1916-03-03": "terroristici", "1921-03-23": "terrorismo"}[d]))
        senso[d] = s
    righe = [[data_it(d), "Camera" if r == "cam" else "Senato", p, senso[d]] for d, r, p in voci]
    attesi = [D(d) for d, _, _ in voci]
    return ["Data", "Ramo", "Parola", "Senso"], righe, "Prime comparse rilette frase per frase; prima del 1908 «terrorismo» indica il Terrore francese o un modo di dire.", attesi


def t_terrorismo_livello(g):
    t = leggi(abs_p(file_blocco(g)))
    sez = t.split("Tasso per periodi lunghi (Camera+Senato):")[1].split("\n\n")[0]
    v = [(a, num(b), int(c)) for a, b, c in re.findall(r"(\d{4}-\d{4}):\s*([\d.]+)\s*\((\d+) menzioni\)", sez)]
    if len(v) != 7:
        raise Scarto("periodi trovati: %d invece di 7" % len(v))
    d = {a: b for a, b, _ in v}
    return ["Periodo", "Menzioni ogni 10.000 parole", "Menzioni in tutto"], [[a, b, c] for a, b, c in v], "Terrorismo, terrorista e terroristico; Camera e Senato.", \
        [N(d["1915-1945"], 2), N(d["1969-1982"], 1)]


def t_urss_usa(g):
    d = json.load(open(abs_p(file_blocco(g)), encoding="utf-8"))["h39d"]
    righe = []
    for paese in ("Russia/URSS", "Stati Uniti"):
        for k, n in (("pci", "PCI"), ("dc", "DC")):
            v, lo, hi = d[paese][k]
            righe.append([paese, n, round(v, 2), "da %s a %s" % (segno(lo), segno(hi))])
    return ["Paese", "Partito", "Ostilita'", "Margine"], righe, "Ostilita' da -1 (amico) a +1 (nemico), letta dal giudice automatico, Camera, 1948-1968.", \
        [N(d["Russia/URSS"]["pci"][0], 2), N(d["Russia/URSS"]["dc"][0], 2)]


def t_voto_donne_prime(g):
    t = leggi(abs_p(file_blocco(g)))
    attese = [("1866-02-23", "Camera", "Pisanelli", "prima menzione del tema"), ("1870-08-11", "Senato", "discussione sulla legge comunale", "prima discussione"),
              ("1872-03-08", "Camera", "Morelli", "la sua proposta"), ("1874-12-05", "Camera", "Nicotera", "liste elettorali"),
              ("1877-02-27", "Camera", "Sorrentino", "prima volta «voto alle donne»")]
    righe, attesi = [], []
    for d, ramo, chi, che in attese:
        if d not in t:
            raise Scarto("la data %s non e' nel file" % d)
        m = re.search(re.escape(d) + r",?\s*(Camera|Senato)?", t)
        r = m.group(1) or ramo
        if r != ramo:
            raise Scarto("ramo diverso dal previsto per %s" % d)
        righe.append([data_it(d), r, chi, che])
        attesi.append(D(d))
    if not re.search(r"\b1881\b[^\n]*Zanardelli", t):
        raise Scarto("riga 1881 (riforma Zanardelli) non trovata")
    righe.append(["1881", "", "riforma Zanardelli", "discussione piena"])
    return ["Data", "Ramo", "Chi", "Che cosa"], righe, "Prime comparse del voto alle donne nei resoconti, lette a mano.", attesi


SPEC = [
    ("alto-adige-austria", r"h77_giudice\.txt", t_austria_periodi),
    ("ambiente-1970-clima-1996", r"h30_campione_giudicato\.csv", t_ambiente_giudizio),
    ("cimitero-delle-parole", r"h27_morte\.csv", t_cimitero_tipi),
    ("dc-pci-come-dc-psi", r"h56_dc_psi\.txt", t_dc_psi_riferimenti),
    ("distanza-dc-pci-fasi", r"532_h32\.txt", t_distanza_coppie),
    ("dopo-moro-si-ferma", r"h56_svolta\.txt", t_moro_svolta),
    ("forme-antiche-unita", r"h7_forme\.csv", t_forme_antiche_decenni),
    ("forme-antiche-unita", r"392_grafie_e_spie\.txt", t_uffizio_anni),
    ("germania-non-torna-nemica", r"fase3_numeri\.json", t_germania_fase3),
    ("germania-non-torna-nemica", r"h71_lessico\.txt", t_germania_lessico),
    ("insulti-non-aumentano", r"h7_h13_primi_risultati\.txt", t_insulti),
    ("mafie-prime-volte", r"h40_prime_comparse\.txt", t_mafie_prime),
    ("mappa-partiti-governo-opposizione", r"mappa_partiti_somiglianze\.csv", t_mappa_somiglianze),
    ("ministri-nei-due-rami", r"398_ministri_regno_grafie\.txt", t_ministri_grafie),
    ("missione-o-guerra", r"h68_placebo\.txt", t_placebo),
    ("parola-dell-anno", r"h22_giudizio_lettore_A\.csv", t_parola_anno_lettori),
    ("parole-che-cambiano-senso", r"note_h35\.md", t_senso_h35),
    ("parole-nuove-prima-volta", r"prime_occorrenze/privacy\.txt", t_parole_nuove),
    ("pci-1984-scala-mobile", r"416_pci_1984\.txt", t_pci1984_mesi),
    ("scendere-in-campo", r"h64_risultati\.txt", t_scendere_periodi),
    ("terrorismo-cambia-volto", r"h50_prime_comparse\.txt", t_terrorismo_prime),
    ("terrorismo-cambia-volto", r"h50_livello\.txt", t_terrorismo_livello),
    ("trieste-jugoslavia", r"h77_giudice\.txt", t_jugoslavia_periodi),
    ("urss-usa-pci-dc", r"fase3_numeri\.json", t_urss_usa),
    ("voto-alle-donne-1866", r"prima_voto\.txt", t_voto_donne_prime),
]


def main():
    risultato, fatte, restano = {}, 0, []
    for sid, patt, fn in SPEC:
        p = os.path.join(STORIE, sid + ".md")
        if not os.path.exists(p):
            restano.append((sid, patt, "storia non trovata"))
            continue
        grezzo = leggi(p)
        blocchi = blocchi_grafici(sezione_grafici(testa(grezzo)))
        g = next((b for b in blocchi if re.search(patt, file_blocco(b))), None)
        if g is None:
            restano.append((sid, patt, "blocco del grafico non trovato"))
            continue
        corpus = norm_corpus(grezzo)
        try:
            colonne, righe, nota, attesi = fn(g)
            if len(righe) > MAX_RIGHE or len(colonne) > MAX_COL:
                raise Scarto("tabella troppo grande (%d righe, %d colonne)" % (len(righe), len(colonne)))
            if any(len(r) != len(colonne) for r in righe):
                raise Scarto("righe con un numero di celle diverso dalle colonne")
            mancano = verifica(corpus, attesi)
            if mancano:
                raise Scarto("numeri non coerenti con il testo della storia: " + "; ".join(mancano))
        except Scarto as e:
            restano.append((sid, patt, str(e)))
            continue
        except Exception as e:  # una regola che si rompe non deve fermare le altre
            restano.append((sid, patt, "errore: %r" % (e,)))
            continue
        voce = {"file": file_blocco(g), "titolo": g.get("titolo", ""), "forma": "tabella", "colonne": colonne, "righe": righe}
        if nota:
            voce["nota"] = nota
        risultato.setdefault(sid, []).append(voce)
        fatte += 1
    os.makedirs(CACHE, exist_ok=True)
    with open(USCITA, "w", encoding="utf-8") as f:
        json.dump(risultato, f, ensure_ascii=False, indent=1)
    print("Tabelle fatte: %d su %d" % (fatte, len(SPEC)))
    print("Scritto %s (%d byte)" % (USCITA, os.path.getsize(USCITA)))
    if restano:
        print("Restano segnaposto:")
        for sid, patt, motivo in restano:
            print("  - %s [%s]: %s" % (sid, patt, motivo))
    else:
        print("Nessun segnaposto resta.")
    sys.stdout.flush()
    os._exit(0)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
