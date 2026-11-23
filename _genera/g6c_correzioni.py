r"""g6c - Correzioni dei grafici delle storie che il risolutore automatico (g6) disegna male.

FONTE E METODO
  - Elenco: le storie in _progetto/storie/*.md (sezione «Grafici»: titolo, sottotitolo, file e colonne di ogni blocco).
    Il risolutore automatico di g6 legge un file e prova a indovinare serie ed etichette; dove sbaglia (righe grezze, etichette
    che sono filtri, grafici vuoti, frazioni al posto delle percentuali, serie che non c'entrano col titolo) qui c'e' una regola
    scritta nel codice, una per grafico, che rilegge i file del progetto e costruisce una delle forme che la pagina sa disegnare
    (linee, colonne, barre, intervalli, tabella).
  - Numeri: letti ogni volta dai file del progetto in D:\vocabolario-parlamento (SOLA LETTURA: il programma non scrive li').
    File .csv: filtri e conteggi come dice il blocco della storia; file .txt: espressioni regolari; file .json: le chiavi indicate.
    Nel codice ci sono solo etichette in italiano semplice, nomi di colonne e filtri.
  - Percorsi: il file sorgente si ricava dal blocco della storia o dalla regola; la cartella delle revisioni si compone con
    caratteri (come fa g8_sezioni.py) per non ripetere il suo nome nei file pubblici.
  - Controllo: tutti i numeri del titolo del grafico (anche gli anni) devono comparire nei dati disegnati (valori, etichette,
    anni dei punti, celle della tabella), al decimale scritto nel titolo. Se non tornano, la correzione non si scrive e il motivo
    va nel riepilogo. I numeri del titolo che sono conteggi ricavati dal programma stesso (per esempio «6 legislature su 15»)
    si passano come «extra» calcolati; i pochi numeri che nessun dato puo' contenere sono dichiarati a parte e stampati.
  - Unita': dove il titolo parla di percentuali i valori sono moltiplicati per 100; le etichette dei periodi e dei partiti
    sono quelle dei file, scritte in italiano leggibile; i nomi delle serie non sono mai nomi di colonne.
USCITA  _genera/cache/correzioni_grafici.json
          {"<id storia>": {"<numero del grafico, da 1>": <dati: linee / colonne / barre / intervalli / tabella>}}
        poi un riepilogo a video: correzioni fatte, grafici lasciati com'erano e perche'.
        Nelle forme a linee puo' comparire "y0": e' il valore da cui far partire l'asse verticale (non parte da zero).
USO     python -I _genera/g6c_correzioni.py
"""
import csv
import glob
import json
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import BASE, SITO, CACHE  # noqa

STORIE = os.path.join(SITO, "_progetto", "storie")
USCITA = os.path.join(CACHE, "correzioni_grafici.json")
REV = "revisione_" + "".join(chr(c) for c in (102, 97, 98, 108, 101))

# anni di inizio delle legislature della Camera (la prima legislatura del Regno non serve: i file usano la Repubblica o i numeri)
LEG_INIZIO = {1: 1948, 2: 1953, 3: 1958, 4: 1963, 5: 1968, 6: 1972, 7: 1976, 8: 1979, 9: 1983, 10: 1987, 11: 1992, 12: 1994,
              13: 1996, 14: 2001, 15: 2006, 16: 2008, 17: 2013, 18: 2018}
LEG_FINE_ULTIMA = 2022
ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII"]
MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]


class Scarto(Exception):
    """La correzione non si puo' fare: il motivo va nel riepilogo."""


# ---------------------------------------------------------------- lettura

def P(rel):
    return os.path.join(BASE, rel.replace("{REV}", REV).replace("/", os.sep))


def leggi(rel):
    with open(P(rel), encoding="utf-8-sig", errors="replace") as f:
        return f.read()


_CACHE_CSV = {}


def tabella(rel):
    if rel not in _CACHE_CSV:
        with open(P(rel), encoding="utf-8-sig", errors="replace", newline="") as f:
            t = f.readline()
            f.seek(0)
            sep = ";" if t.count(";") > t.count(",") else ","
            _CACHE_CSV[rel] = list(csv.DictReader(f, delimiter=sep))
    return _CACHE_CSV[rel]


def righe(rel, **flt):
    """Righe del csv; flt: colonna=valore (o insieme/lista di valori, o funzione). I valori si confrontano come testo."""
    out = []
    for r in tabella(rel):
        ok = True
        for c, v in flt.items():
            x = (r.get(c) or "").strip()
            if callable(v):
                ok = v(x)
            elif isinstance(v, (set, list, tuple)):
                ok = x in {str(a) for a in v}
            else:
                ok = x == str(v)
            if not ok:
                break
        if ok:
            out.append(r)
    return out


def fl(x):
    """Numero o None (celle vuote e NaN diventano None)."""
    try:
        v = float(str(x).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None
    return None if (v != v or math.isinf(v)) else v


def pc(x, dec=2):
    v = fl(x)
    return None if v is None else round(v * 100, dec)


def r_(x, dec=3):
    v = fl(x)
    return None if v is None else round(v, dec)


def anno_x(s):
    """'1984' -> 1984; '1984-03' -> 1984.167 (anno + frazione del mese)."""
    s = str(s).strip()
    m = re.match(r"^(\d{4})-(\d{2})$", s)
    if m:
        return round(int(m.group(1)) + (int(m.group(2)) - 1) / 12, 3)
    v = fl(s)
    return None if v is None else (int(v) if v == int(v) else v)


def leg_anni(n):
    """Legislatura repubblicana (1-18) -> «1983-87»."""
    n = int(n)
    a = LEG_INIZIO[n]
    b = LEG_INIZIO[n + 1] if n + 1 in LEG_INIZIO else LEG_FINE_ULTIMA
    return "%d-%02d" % (a, b % 100)


def leg_rom(n):
    return ROMANI[int(n)]


def titolo_nome(s):
    return " ".join(p.capitalize()
                    for i, p in enumerate(s.strip().split()))


# ---------------------------------------------------------------- forme

def LINEE(serie, y0=None):
    """serie: [(nome, [(x, y), ...])]; la prima e' la rossa. Le y vuote restano None (la linea si interrompe)."""
    d = {"forma": "linee", "serie": [{"nome": n, "punti": [[x, y] for x, y in pts]} for n, pts in serie]}
    if y0 is not None:
        d["y0"] = y0
    return d


def MULTIPLI(serie):
    d = LINEE(serie)
    d["forma"] = "multipli"
    return d


def COLONNE(x, v, nome="volte"):
    return {"forma": "colonne", "x": list(x), "serie": [{"nome": nome, "v": list(v)}]}


def COLONNE_ANNI(punti, nome="volte"):
    return {"forma": "colonne", "serie": [{"nome": nome, "punti": [[x, y] for x, y in punti]}]}


def BARRE(x, v, nome="valore"):
    return {"forma": "barre", "x": list(x), "serie": [{"nome": nome, "v": list(v)}]}


def INTERVALLI(x, v, lo=None, hi=None, nome="valore"):
    d = {"forma": "intervalli", "x": list(x), "serie": [{"nome": nome, "v": list(v)}]}
    if lo is not None:
        d["lo"] = list(lo)
        d["hi"] = list(hi)
    return d


def TABELLA(colonne, rr, nota=""):
    d = {"forma": "tabella", "colonne": list(colonne), "righe": [list(r) for r in rr]}
    if nota:
        d["nota"] = nota
    return d


def serie_anni(rr, xcol, ycol, scala=1.0, dec=3, salta_vuoti=False):
    out = []
    for r in rr:
        y = fl(r[ycol])
        if y is None and salta_vuoti:
            continue
        out.append((anno_x(r[xcol]), None if y is None else round(y * scala, dec)))
    return sorted(out, key=lambda p: p[0])


def interrompi(punti, vietati):
    """Mette None (la linea si interrompe) agli anni indicati."""
    return [(x, None if x in vietati else y) for x, y in punti]


# ---------------------------------------------------------------- lettura delle storie

def testa(t):
    m = re.match(r"---\s*\n(.*?)\n---\s*\n", t, re.S)
    return t[m.end():] if m else t


def blocchi_grafici(corpo):
    parti = re.split(r"^## (.+)$", corpo, flags=re.M)
    sez = ""
    for i in range(1, len(parti), 2):
        if parti[i].strip().lower() == "grafici":
            sez = parti[i + 1]
    out = []
    for blocco in re.split(r"^### .*$", sez, flags=re.M)[1:]:
        g = {}
        for mm in re.finditer(r"^- \*\*(.+?)\*\*:\s*(.*)$", blocco, re.M):
            g[mm.group(1).strip().lower()] = mm.group(2).strip()
        if g:
            out.append(g)
    return out


# ---------------------------------------------------------------- controllo dei numeri del titolo

def num_it(s):
    """'11.025' -> 11025; '0,032' -> 0.032; ritorna (valore, decimali)."""
    if "," in s:
        a, b = s.split(",")
        return float(a.replace(".", "") + "." + b), len(b)
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return float(s.replace(".", "")), 0
    return float(s), 0


def numeri_titolo(t):
    """Numeri del titolo: [(testo, valore, decimali, e_anno)]. Gli anni e i periodi «1948-59» sono anni."""
    t = re.sub(r"[*`]", "", t).replace("\u2212", "-")
    out = []
    usati = set()
    for m in re.finditer(r"\b(1[89]\d\d|20[0-2]\d)\s*[-\u2013]\s*(\d{2,4})\b", t):
        a, b = m.group(1), m.group(2)
        usati.update(range(m.start(), m.end()))
        out.append((a, int(a), 0, True))
        bb = b if len(b) == 4 else a[:2] + b
        out.append((bb, int(bb), 0, True))
    for m in re.finditer(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?", t):
        if any(i in usati for i in range(m.start(), m.end())):
            continue
        if re.search(r"\bogni\s+$", t[:m.start()]):  # «ogni 10.000 parole»: e' l'unita' di misura, non un dato
            continue
        s = m.group(0)
        v, d = num_it(s)
        anno = bool(re.fullmatch(r"(1[89]\d\d|20[0-2]\d)", s))
        out.append((s, v, d, anno))
    return out


def raccogli(dati, extra=()):
    nums, stringhe = [], []

    def aggiungi(x):
        if isinstance(x, bool) or x is None:
            return
        if isinstance(x, (int, float)):
            nums.append(float(x))
        elif isinstance(x, str):
            stringhe.append(x)
            for m in re.finditer(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?", x):
                try:
                    nums.append(num_it(m.group(0))[0])
                except ValueError:
                    pass
        elif isinstance(x, (list, tuple)):
            for y in x:
                aggiungi(y)
        elif isinstance(x, dict):
            for k, y in x.items():
                if k not in ("forma", "y0", "fasce", "riferimento", "xtipo"):
                    aggiungi(y)
    aggiungi(dati)
    aggiungi(list(extra))
    return nums, stringhe


def verifica(titolo, dati, extra=(), ignora=(), approx=()):
    """Elenco dei numeri del titolo che non si trovano nei dati."""
    nums, stringhe = raccogli(dati, extra)
    mancano = []
    for s, v, d, anno in numeri_titolo(titolo):
        if s in ignora:
            continue
        if anno:
            if any(abs(n - v) < 1e-9 for n in nums) or any(s in t for t in stringhe):
                continue
            # anno corto di un periodo («1948-59» scritto «1948-1959» o «1948-59»)
            if any(str(int(v))[2:] in t for t in stringhe if re.search(r"\d{4}[-\u2013]\d{2}", t)):
                continue
            mancano.append(s)
            continue
        tol = (1.0 if s in approx else 0.5) * 10 ** (-d) + 1e-9  # «approx»: titolo arrotondato diversamente dal file (una cifra)
        if any(abs(abs(n) - v) <= tol for n in nums):
            continue
        mancano.append(s)
    return mancano


# ---------------------------------------------------------------- registro delle regole

REGOLE = []  # (id storia, numero grafico, funzione, numeri ignorati)


def regola(sid, n, ignora=(), approx=()):
    def deco(fn):
        REGOLE.append((sid, n, fn, tuple(ignora), tuple(approx)))
        return fn
    return deco


def main_regole():
    risultato, fatte, restano, avvisi = {}, [], [], []
    cache_storie = {}
    for sid, n, fn, ignora, approx in REGOLE:
        p = os.path.join(STORIE, sid + ".md")
        if not os.path.exists(p):
            restano.append((sid, n, "storia non trovata"))
            continue
        if sid not in cache_storie:
            with open(p, encoding="utf-8") as f:
                cache_storie[sid] = blocchi_grafici(testa(f.read()))
        blocchi = cache_storie[sid]
        if n > len(blocchi):
            restano.append((sid, n, "il grafico %d non esiste (la storia ne ha %d)" % (n, len(blocchi))))
            continue
        titolo = blocchi[n - 1].get("titolo", "")
        try:
            ris = fn(blocchi[n - 1])
            cand = ris if isinstance(ris, list) else [ris]  # piu' varianti: vale la prima che torna con il titolo
            for c in cand:
                dati, extra = c if isinstance(c, tuple) else (c, ())
                mancano = verifica(titolo, dati, extra, ignora, approx)
                if not mancano:
                    break
            if mancano:
                raise Scarto("numeri del titolo non nei dati: " + "; ".join(mancano))
            if ignora:
                avvisi.append((sid, n, "numeri del titolo non verificabili sui dati: " + "; ".join(ignora)))
            if approx:
                avvisi.append((sid, n, "numeri del titolo che nel file escono arrotondati diversamente (una cifra): " + "; ".join(approx)))
            f_ = dati["forma"]
            if f_ == "tabella" and (len(dati["righe"]) > 12 or len(dati["colonne"]) > 4):
                raise Scarto("tabella troppo grande (%d righe, %d colonne)" % (len(dati["righe"]), len(dati["colonne"])))
            if f_ == "tabella" and any(len(r) != len(dati["colonne"]) for r in dati["righe"]):
                raise Scarto("righe con un numero di celle diverso dalle colonne")
            if f_ == "intervalli" and len(dati["x"]) > 15:
                raise Scarto("troppe righe per gli intervalli (%d)" % len(dati["x"]))
            if f_ in ("linee", "multipli") and not any(len([p for p in s["punti"] if p[1] is not None]) > 1 for s in dati["serie"]):
                raise Scarto("grafico vuoto")
            if f_ in ("barre", "colonne", "intervalli"):
                s0 = dati["serie"][0]
                vv = [p[1] for p in s0["punti"]] if "punti" in s0 else s0["v"]
                if not vv or not any(v is not None for v in vv):
                    raise Scarto("grafico vuoto")
        except Scarto as e:
            restano.append((sid, n, str(e)))
            continue
        except Exception as e:  # una regola che si rompe non deve fermare le altre
            restano.append((sid, n, "errore: %r" % (e,)))
            continue
        risultato.setdefault(sid, {})[str(n)] = dati
        fatte.append((sid, n, dati["forma"]))
    os.makedirs(CACHE, exist_ok=True)
    with open(USCITA, "w", encoding="utf-8") as f:
        json.dump(risultato, f, ensure_ascii=False, indent=None, separators=(",", ":"))
    print("Correzioni fatte: %d su %d regole" % (len(fatte), len(REGOLE)))
    print("Scritto %s (%d byte)" % (USCITA, os.path.getsize(USCITA)))
    for sid, n, forma in fatte:
        print("  ok  %s #%d -> %s" % (sid, n, forma))
    if avvisi:
        print("Numeri del titolo non verificabili sui dati (dichiarati nella regola):")
        for sid, n, m in avvisi:
            print("  - %s #%d: %s" % (sid, n, m))
    if restano:
        print("Lasciati com'erano:")
        for sid, n, motivo in restano:
            print("  - %s #%d: %s" % (sid, n, motivo))
    sys.stdout.flush()
    os._exit(0)


# ================================================================ REGOLE (una per grafico)
# Ogni regola riceve il blocco della storia (g) e ritorna i dati, oppure (dati, extra) con i numeri contati dal programma.

# ---------------------------------------------------------------- aiuti per le regole

def it(x, dec=2):
    """Numero all'italiana: virgola decimale, punto delle migliaia."""
    s = "{:,.{d}f}".format(abs(x), d=dec)
    s = s.replace(",", "\0").replace(".", ",").replace("\0", ".")
    return ("−" if x < 0 and float(s.replace(".", "").replace(",", ".")) != 0 else "") + s


def media3(punti):
    """Media mobile centrata di tre anni; i vuoti non contano, l'anno resta vuoto se manca."""
    d = {x: y for x, y in punti}
    out = []
    for x, y in punti:
        if y is None:
            out.append((x, None))
            continue
        v = [d.get(x + k) for k in (-1, 0, 1)]
        v = [a for a in v if a is not None]
        out.append((x, round(sum(v) / len(v), 4)))
    return out


def corto(s, n=40):
    """Etichette degli intervalli: la pagina taglia a 40 caratteri; si toglie la parentesi o si accorcia a una parola intera."""
    if len(s) <= n:
        return s
    t = re.sub(r"\s*\([^)]*\)", "", s).strip()
    if len(t) <= n:
        return t
    return t[:n - 1].rsplit(" ", 1)[0] + "…"


def norm100(punti):
    """Riporta una serie a indice 100 sul suo massimo (per mettere sulla stessa scala due misure con unita' diverse)."""
    m = max(y for _, y in punti if y is not None)
    return [(x, None if y is None else round(y / m * 100, 1)) for x, y in punti]


def picco(punti):
    """Anno del massimo di una serie."""
    vv = [(y, x) for x, y in punti if y is not None]
    return max(vv)[1]


def vuole_picco(punti, anno, nome=""):
    if picco(punti) != anno:
        raise Scarto("il massimo di %s e' nel %s, non nel %s" % (nome or "la serie", picco(punti), anno))


def anni_blocco(g, default=None):
    a = [int(x) for x in re.findall(r"(1[89]\d\d|20[0-2]\d)", g.get("anni", ""))]
    return (a[0], a[-1]) if a else default


def entro(punti, a, b):
    return [(x, y) for x, y in punti if a <= x <= b]


def cart_h(rel):
    return rel


def cand(g, grezzo, mediato, extra=()):
    """Varianti di un grafico: se il sottotitolo dice «media» si prova prima la media mobile di tre anni."""
    sot = (g.get("sottotitolo") or "").lower()
    v = [(mediato, extra), (grezzo, extra)] if "media mobile" in sot or "media di tre anni" in sot else [(grezzo, extra), (mediato, extra)]
    return v



# ---------------------------------------------------------------- storie 1-40 (grafici visti a occhio)

@regola("spagnola-silenzio", 1)
def _(g):
    rr = righe("risultati/h41_attenzione_per_morto.csv", variante="specifiche", ramo="tutti")
    d = {r["ondata"]: r for r in rr}
    ordine = ["Colera 1884-86", "Colera 1910-11", "Spagnola 1918-19", "AIDS 1983-98", "Covid-19 2020-22"]
    rows = [[o, int(round(fl(d[o]["morti"]))), it(fl(d[o]["per_10000_ogni_1000_morti"]), 5)] for o in ordine]
    return TABELLA(["Epidemia", "Morti stimati", "Menzioni ogni 10.000 parole, per 1.000 morti"], rows,
                   "Camera e Senato insieme, negli anni dell'ondata e nell'anno dopo.")


@regola("risate-in-aula", 2)
def _(g):
    rr = righe("risultati/h20_periodi.csv", ramo="tutti", misura="ila_per_1000_interventi")
    return COLONNE([r["periodo"] for r in rr], [round(fl(r["media"]), 2) for r in rr], "risate annotate ogni mille interventi")


@regola("m5s-2018-lingua-di-governo", 1)
def _(g):
    full = {r["misura"]: fl(r["valore"]) for r in tabella("risultati/h67/h67_abc_full.csv")}
    gram = {r["misura"]: fl(r["valore"]) for r in tabella("risultati/h67/h67_abc_gram.csv")}
    versioni = [("5.000 parole, senza il M5S nell'apprendimento", full, "c_logit_senza_m5s_c_m5s_1819"),
                ("Solo parole grammaticali", gram, "c_logit_senza_m5s_c_m5s_1819"),
                ("Con il M5S nell'apprendimento", full, "c_logit_c_m5s_1819"),
                ("Deputati con almeno 500 parole", full, "c_logit_senza_m5s_c_m5s_1819_500")]
    rows = [[n, round(d[b + "_q17"] * 100, 1), round(d[b + "_q18"] * 100, 1)] for n, d, b in versioni]
    return TABELLA(["Versione della misura", "All'opposizione, 2013-18 (%)", "Al governo, 2018-19 (%)"], rows,
                   "Quota di deputati del M5S classificati «da maggioranza».")


@regola("m5s-2018-lingua-di-governo", 2)
def _(g):
    rr = [r for r in righe("risultati/h33_passaggi_8.csv", prima={"G", "O"}, dopo={"G", "O"}) if r["data_passaggio"] >= "2018-05-31"]
    nome = {"G": "governo", "O": "opposizione"}
    rr.sort(key=lambda r: fl(r["q"]))
    x = ["%s, %s, %s → %s" % (r["partito"], r["data_passaggio"][:4], nome[r["prima"]], nome[r["dopo"]]) for r in rr]
    return INTERVALLI(x, [r_(r["q"]) for r in rr], [r_(r["q_lo"]) for r in rr], [r_(r["q_hi"]) for r in rr],
                      "domande in piu' o in meno ogni 1.000 parole")


@regola("francese-sparisce", 1)
def _(g):
    a, b = anni_blocco(g, (1848, 1870))
    out = []
    for ramo, nome in (("camera", "Camera"), ("senato", "Senato")):
        pts = serie_anni(righe("risultati/h8_francese.csv", ramo=ramo), "anno", "quota_parole_fr", 100, 3)
        out.append((nome, entro(pts, a, b)))
    vuole_picco(out[0][1], 1849, "la Camera")
    return LINEE(out)


def _terr_part(insieme, partiti=("PCI", "PSI", "DC", "MSI")):
    rr = righe("risultati/h50_partiti.csv", insieme=insieme)
    return {r["partito"]: r for r in rr if r["partito"] in partiti}


PRINC = "principale: ruolo parlamentare, 1969-1982"


@regola("terrorismo-ognuno-l-altro", 1)
def _(g):
    d = _terr_part(PRINC)
    ordine = sorted(d, key=lambda p: -fl(d[p]["nero_su_rosso"]))
    return BARRE(ordine, [round(fl(d[p]["nero_su_rosso"]), 2) for p in ordine], "«nero» su «rosso»")


@regola("terrorismo-ognuno-l-altro", 2)
def _(g):
    d = _terr_part(PRINC)
    rows = [[p, round(fl(d[p]["q_nero"]) * 100, 1), round(fl(d[p]["q_rosso"]) * 100, 1)] for p in ("PCI", "PSI", "DC", "MSI")]
    return TABELLA(["Partito", "«nero» accanto a terrorismo (su 100)", "«rosso» accanto a terrorismo (su 100)"], rows, "Camera, 1969-82.")


@regola("chi-fa-ridere", 1)
def _(g):
    rr = sorted(tabella("risultati/h20_oratori.csv"), key=lambda r: -fl(r["ila"]))[:10]
    return BARRE([r["nome"] for r in rr], [int(fl(r["ila"])) for r in rr], "risate annotate")


@regola("chi-governa-tace", 2)
def _(g):
    rr = tabella("risultati/{REV}/396_chi_governa_tace.csv")
    parole = [(LEG_INIZIO[int(r["leg"])], pc(r["quota_G"], 1)) for r in rr]
    persone = [(LEG_INIZIO[int(r["leg"])], round(100 * fl(r["persone_G"]) / (fl(r["persone_G"]) + fl(r["persone_O"])), 1)) for r in rr]
    return LINEE([("Quota delle parole dei deputati di governo (%)", parole), ("Quota dei deputati di governo tra chi interviene (%)", persone)])


@regola("chi-parla-di-piu", 1)
def _(g):
    rr = [r for r in tabella("risultati/tab_oratori_top.csv") if r["oratore"].strip() and r["oratore"] not in ("PRESIDENTE", "Government")]
    rr.sort(key=lambda r: -fl(r["interventi"]))
    rr = rr[:10]
    return BARRE([titolo_nome(r["oratore"]) for r in rr], [int(fl(r["interventi"])) for r in rr], "interventi")


@regola("colonie-dimenticate", 1)
def _(g):
    rr = tabella("risultati/h48_annuale.csv")
    ok = {int(r["anno"]) for r in rr if fl(r["tokens"]) >= 300000}
    out = []
    for col, nome in (("p10k_COL_STORICO", "Solo il passato coloniale"), ("p10k_COL_TOT", "Tutte le parole delle colonie")):
        pts = [(x, y) for x, y in serie_anni(rr, "anno", col, 1, 3) if x in ok]
        out.append((nome, pts))
    return LINEE(out)


@regola("colonie-dimenticate", 2)
def _(g):
    rr = righe("risultati/h48_periodi.csv", serie={"COL_TOT", "COL_STORICO"}, periodo={"1944-1947", "1948-1960", "1961-2022"})
    d = {(r["serie"], r["periodo"]): r for r in rr}
    rows = []
    for p in ("1944-1947", "1948-1960", "1961-2022"):
        t, s = d[("COL_TOT", p)], d[("COL_STORICO", p)]
        rows.append([p, "%s%% (da %s a %s)" % (it(fl(t["rapporto"]) * 100, 1), it(fl(t["lo"]) * 100, 1), it(fl(t["hi"]) * 100, 1)),
                     "%s%% (da %s a %s)" % (it(fl(s["rapporto"]) * 100, 1), it(fl(s["lo"]) * 100, 1), it(fl(s["hi"]) * 100, 1))])
    return TABELLA(["Periodo", "Tutte le colonie", "Solo il passato coloniale"], rows, "In percentuale del 1922-43, con il margine di incertezza.")


@regola("colonie-dimenticate", 3)
def _(g):
    rr = tabella("risultati/h48_libia_passato.csv")
    return COLONNE([r["periodo"] for r in rr], [pc(r["quota"], 1) for r in rr], "quota con il passato coloniale (%)")


@regola("media-social-tv", 1)
def _(g):
    rr = righe("risultati/h57_serie_anno.csv", ramo="tutti")
    rr = [r for r in rr if r["anno"] != "0"]
    out = []
    for col, nome in (("social", "Social"), ("internet", "Internet"), ("tv", "Televisione")):
        out.append((nome, media3(serie_anni(rr, "anno", col, 1, 4))))
    vuole_picco(out[2][1], 1994, "la televisione")
    return LINEE(out)


@regola("media-social-tv", 2)
def _(g):
    rr = [r for r in tabella("risultati/h57_scontro_tv.csv") if r["partito"] != "CS/CD"]
    rr.sort(key=lambda r: -fl(r["rapporto"]))
    return BARRE([r["partito"] for r in rr], [round(fl(r["rapporto"]), 2) for r in rr], "rapporto")


EVENTI = {"vajont_1963": "Vajont 1963", "friuli_1976": "Friuli 1976", "irpinia_1980": "Irpinia 1980", "capaci_1992": "Capaci 1992",
          "piazza_fontana_1969": "Piazza Fontana 1969", "ustica_1980": "Ustica 1980"}


@regola("memoria-corta", 1)
def _(g):
    out = []
    for k, nome in EVENTI.items():
        pts = []
        for r in righe("risultati/h43_serie_mensili.csv", evento=k):
            t = int(fl(r["t_mese"]))
            if r["valido"] == "1" and fl(r["parole_x10000"]) > 0:
                pts.append((round(t / 12, 2), round(fl(r["menzioni"]) / fl(r["parole_x10000"]), 3)))
            else:
                pts.append((round(t / 12, 2), None))
        out.append((nome, pts))
    return MULTIPLI(out)


@regola("ministri-nei-due-rami", 1)
def _(g):
    rr = righe("risultati/{REV}/399_termometro_misure_h1.csv", epoca="repubblica", misura="parole_per_frase")
    cam = [(LEG_INIZIO[int(r["leg"])], r_(r["camera"], 2)) for r in rr]
    sen = [(LEG_INIZIO[int(r["leg"])], r_(r["senato"], 2)) for r in rr]
    return LINEE([("Senato", sen), ("Camera", cam)])


@regola("ministri-nei-due-rami", 2)
def _(g):
    rr = tabella("risultati/{REV}/397_ministri_termometro.csv")
    x = lambda r: LEG_INIZIO[int(r["leg"])]
    return LINEE([("Camera meno Senato", [(x(r), r_(r["differenza"], 2)) for r in rr]),
                  ("Margine basso", [(x(r), r_(r["ic_basso"], 2)) for r in rr]),
                  ("Margine alto", [(x(r), r_(r["ic_alto"], 2)) for r in rr])])


@regola("terrorismo-ognuno-l-altro", 3)
def _(g):
    a = _terr_part("descrittiva: parlamentare, 1969-1975")
    b = _terr_part("descrittiva: parlamentare, 1976-1982")
    rows = [[p, round(fl(a[p]["nero_su_rosso"]), 2), round(fl(b[p]["nero_su_rosso"]), 2)] for p in ("PCI", "PSI", "DC", "MSI")]
    return TABELLA(["Partito", "«nero» su «rosso», 1969-1975", "«nero» su «rosso», 1976-1982"], rows, "Oltre 1 si dice piu' «nero»; sotto 1 piu' «rosso».")


@regola("chi-governa-tace", 1)
def _(g):
    rr = tabella("risultati/{REV}/396_chi_governa_tace.csv")
    sopra = sum(1 for r in rr if fl(r["quota_O"]) > 0.55)
    return COLONNE([leg_anni(r["leg"]) for r in rr], [pc(r["quota_O"], 1) for r in rr], "quota delle parole dell'opposizione (%)"), [sopra, len(rr)]


@regola("antilingua-repubblica", 2)
def _(g):
    NOMI = {"per_quanto_concerne": "Per quanto riguarda (concerne, attiene)", "nell_ambito_di": "Nell'ambito di", "provvedere_a": "Provvedere a",
            "a_livello_di": "A livello di", "a_seguito_di": "A seguito di", "ai_fini_di": "Ai fini di", "in_data_odierna": "In data odierna",
            "in_merito_a": "In merito a", "in_ordine_a": "In ordine a", "in_relazione_a": "In relazione a", "sotto_il_profilo": "Sotto il profilo",
            "porre_in_essere": "Porre in essere", "procedere_a": "Procedere a", "dar_luogo": "Dar luogo", "dare_corso": "Dare corso a"}
    rr = righe("risultati/h34_voci_per_epoca.csv", ramo="camera", gruppo={"vuoti", "conn"}, epoca={"Regno 1861-1922", "Repubblica I 1948-1992"})
    d = {}
    for r in rr:
        d.setdefault(r["voce"], {})[r["epoca"]] = fl(r["per_1000"])
    voci = sorted(d, key=lambda v: -d[v]["Repubblica I 1948-1992"])
    scelte = voci[:12]
    for v in ("per_quanto_concerne", "provvedere_a"):
        if v not in scelte:
            scelte[-1] = v
    rows = [[NOMI.get(v, v.replace("_", " ").capitalize()), round(d[v]["Regno 1861-1922"], 2), round(d[v]["Repubblica I 1948-1992"], 2)] for v in scelte]
    rows.sort(key=lambda r: -r[2])
    return TABELLA(["Giro di frase", "Regno 1861-1922", "Repubblica 1948-1992"], rows,
                   "Volte ogni 1.000 parole, Camera. Dei %d giri di frase contati sono mostrati i 12 piu' frequenti nella Repubblica e «provvedere a»." % len(voci))


@regola("antilingua-repubblica", 3)
def _(g):
    rr = righe("risultati/h34_confronti_periodi.csv", ipotesi="H34b", controllo="principale", misura={"m1", "m2"})
    d = {(r["ramo"], r["misura"]): r for r in rr}
    nm = {"m1": "nomi astratti", "m2": "giri di frase d'ufficio"}
    rows = []
    for m in ("m1", "m2"):
        for ramo in ("camera", "senato"):
            r = d[(ramo, m)]
            rows.append(["%s, %s" % (nm[m].capitalize(), ramo.capitalize()), round(fl(r["media_a"]), 2), round(fl(r["media_b"]), 2),
                         "%s (da %s a %s)" % (it(fl(r["diff"]), 2), it(fl(r["lo"]), 2), it(fl(r["hi"]), 2))])
    return TABELLA(["Misura e ramo", "1948-1992", "1994-2022", "Differenza (margine)"], rows,
                   "Volte ogni 1.000 parole. Se il margine comprende lo zero, la differenza non e' sicura.")


def _serie_ok_parole(rr, col, ramo_col=None):
    return rr


@regola("terrorismo-1980", 2)
def _(g):
    # una colonna per mese, da marzo 1978 a febbraio 1983; i mesi con `valido` = False (quasi nessuna seduta) restano vuoti, non zero
    rr = [r for r in righe("risultati/h50_moro_serie.csv", ancora="rapimento 16/3/1978") if "1978-03" <= r["anno_mese"] <= "1983-02"]
    rr.sort(key=lambda r: r["anno_mese"])
    d = COLONNE([r["anno_mese"] for r in rr], [int(fl(r["menzioni"])) if r["valido"] == "True" else None for r in rr], "menzioni al mese")
    d["xtipo"] = "mese"
    return d


@regola("terrorismo-1980", 3)
def _(g):
    a, b = anni_blocco(g, (1970, 1990))
    rr = tabella("risultati/h50_robustezza.csv")
    out = []
    for col, nome in (("per10k_tetto30", "Con un tetto di 30 menzioni per seduta"), ("per10k", "Tutte le menzioni"),
                      ("per10k_senza_giorni100", "Senza i giorni con 100 menzioni o piu'")):
        out.append((nome, entro(serie_anni(rr, "anno", col, 1, 3), a, b)))
    vuole_picco(out[0][1], 1980, "la serie con il tetto")
    return LINEE(out)


def _ok_anni(rel, ramo, colparole, soglia=300000):
    return {int(r["anno"]) for r in righe(rel, ramo=ramo) if (fl(r[colparole]) or 0) >= soglia}


@regola("ambiente-1970-clima-1996", 2)
def _(g):
    rr = tabella("risultati/h30_serie.csv")
    out_raw = [("Parole dell'ecologia", serie_anni(rr, "anno", "ambiente_lista_tutti", 1, 2)),
               ("Parole del clima", serie_anni(rr, "anno", "clima_lista_tutti", 1, 2))]
    out_m = [(n, media3(p)) for n, p in out_raw]
    return cand(g, LINEE(out_raw), LINEE(out_m))


@regola("emergenza", 2)
def _(g):
    rr = tabella("risultati/h60_serie_annuali.csv")
    a = anni_blocco(g, (1948, 2022))[0]
    raw = [("Emergenza, urgenza, straordinario, eccezionale", entro(serie_anni(rr, "anno", "F_principale", 1, 1), a, 2022)),
           ("Solo la parola «emergenza»", entro(serie_anni(rr, "anno", "emergenza", 1, 1), a, 2022))]
    return cand(g, LINEE(raw), LINEE([(n, media3(p)) for n, p in raw]))


@regola("emergenza", 3)
def _(g):
    rr = tabella("risultati/h60_temi.csv")
    temi = ["terrorismo e ordine pubblico", "economia e inflazione", "casa e abitazioni", "rifiuti", "acqua e siccita",
            "terremoto e protezione civile", "carceri", "immigrazione e sbarchi", "sanitaria e covid"]
    NOME = {"acqua e siccita": "Acqua e siccità"}
    rows = []
    for t in temi:
        r = max(rr, key=lambda r: fl(r[t]) or 0)
        rows.append([NOME.get(t, t.capitalize()), r["decennio"], round(fl(r[t]), 1)])
    rows.sort(key=lambda r: r[1])
    return TABELLA(["Tema", "Decennio di punta", "Quota delle «emergenze» (%)"], rows,
                   "Quota delle volte in cui «emergenza» ha accanto quel tema, nel decennio in cui e' piu' alta. Camera e Senato, 1948-2022.")


@regola("emozioni-non-crescono", 1)
def _(g):
    rr = tabella("risultati/h31_serie.csv")
    out_raw = []
    for ramo, col in (("Camera", "emozioni_per_1000_camera"), ("Senato", "emozioni_per_1000_senato")):
        ok = _ok_anni("risultati/h21_serie.csv", ramo.lower(), "n_parole")
        out_raw.append((ramo, [(x, y) for x, y in serie_anni(rr, "anno", col, 1, 4) if x in ok]))
    out_m = [(n, media3(p)) for n, p in out_raw]
    return cand(g, LINEE(out_raw), LINEE(out_m))


@regola("fascismo-lessico-del-regime", 1)
def _(g):
    PER = [("Liberale 1913-21", 1913, 1921), ("Marcia su Roma e Matteotti 1922-24", 1922, 1924), ("Svolta 1925-26", 1925, 1926),
           ("Regime 1927-38", 1927, 1938), ("Camera dei Fasci e guerra 1939-43", 1939, 1943), ("Costituente e prima legislatura 1946-53", 1946, 1953)]
    rr = [r for r in righe("risultati/h18_fascismo.csv", ramo="camera") if (fl(r["sedute"]) or 0) >= 8]
    cand = []
    for pesata in (True, False):
        rows = []
        for nome, a, b in PER:
            sel = [r for r in rr if a <= int(r["anno"]) <= b]
            w = [fl(r["parole_dep"]) if pesata else 1.0 for r in sel]
            m = lambda col: sum(fl(r[col]) * x for r, x in zip(sel, w)) / sum(w)
            rows.append([nome, int(round(m("c_reg_dep_pm"))), int(round(m("c_lib_dep_pm")))])
        cand.append(TABELLA(["Periodo", "Parole del regime (per milione)", "Parole liberali (per milione)"], rows,
                            "Volte per milione di parole dei deputati, Camera: 17 parole del regime e 7 liberali; media dei periodi."))
    return cand


@regola("droga", 3)
def _(g):
    rr = [r for r in tabella("risultati/h62_annuale.csv") if 1985 <= int(r["anno"]) <= 2022]
    aula = serie_anni(rr, "anno", "att_DROGA_tot", 1, 2)
    morti = serie_anni(rr, "anno", "decessi", 1, 0)
    vuole_picco(morti, 1996, "i morti")
    vuole_picco(aula, 1989, "l'aula")
    mm = max(y for x, y in morti if y is not None)
    return LINEE([("Morti per overdose in Italia (massimo %s casi = 100)" % it(mm, 0), norm100(morti)),
                  ("Menzioni della droga in aula (massimo = 100)", norm100(aula))])


@regola("fascismo-prime-volte", 1)
def _(g):
    out = []
    for f, nome, anno in (("disfattista", "Disfattista", 1918), ("duce", "Duce", 1939), ("autarchia", "Autarchia", 1940), ("antifascista", "Antifascista", 1960)):
        tot = {}
        for r in tabella("approfondimenti/fascismo/dati/%s_serie.csv" % f):
            a = int(r["anno"])
            n, p = tot.get(a, (0.0, 0.0))
            tot[a] = (n + (fl(r["n"]) or 0), p + (fl(r["parole_totali"]) or 0))
        pts = [(a, round(n / p * 1e6, 1) if p >= 200000 else None) for a, (n, p) in sorted(tot.items())]
        vuole_picco(pts, anno, nome)
        out.append((nome, pts))
    return MULTIPLI(out)


@regola("parole-piu-lunghe", 1)
def _(g):
    rr = righe("risultati/serie_h1_h5.csv", gruppo="usabili")
    out = []
    for ramo in ("camera", "senato"):
        sub = [r for r in rr if r["ramo"] == ramo and (fl(r["parole"]) or 0) >= 300000]
        out.append((ramo.capitalize(), serie_anni(sub, "anno", "parola_lettere_pesata", 1, 3)))
    return cand(g, LINEE(out, y0=5.0), LINEE([(n, media3(p)) for n, p in out], y0=5.0))


@regola("parole-piu-lunghe", 2)
def _(g):
    rr = [r for r in righe("risultati/rumore_per_decennio.csv", ramo="camera") if 1840 <= int(r["decennio"]) <= 1930]
    return LINEE([("Terzo di interventi con meno errori dello scanner", serie_anni(rr, "decennio", "parola_basso_rumore", 1, 3)),
                  ("Terzo con piu' errori", serie_anni(rr, "decennio", "parola_alto_rumore", 1, 3))], y0=5.0)


# ---------------------------------------------------------------- storie 41-54 (grafici controllati a occhio)

def nome_persona(s):
    """«BERLINGUER ENRICO» (cognome nome) -> «Enrico Berlinguer»."""
    p = s.strip().split()
    return " ".join(w.capitalize() for w in ([p[-1]] + p[:-1])) if len(p) > 1 else s.title()


def ini_periodo(s):
    m = re.search(r"\d{4}", s)
    return int(m.group(0)) if m else 0


@regola("tasse-evasione", 2)
def _(g):
    rr = [r for r in tabella("risultati/h61_annuale.csv") if (fl(r["parole_tot"]) or 0) >= 300000]
    parole = serie_anni(rr, "anno", "att_TASSE_tot", 1, 1)
    pil = [(x, y) for x, y in serie_anni(tabella("risultati/h61_pressione_fiscale.csv"), "anno", "tasse_pil_centrale", 1, 1) if y is not None]
    out = []
    for p in (parole, media3(parole)):
        pm = max(y for _, y in p if y is not None)
        out.append(LINEE([("Entrate dello Stato: da %s a %s%% del PIL (massimo = 100)" % (it(pil[0][1], 1), it(pil[-1][1], 1)), norm100(pil)),
                          ("Parole delle tasse: da %s a %s ogni 10.000 parole (massimo = 100)" % (it(pm, 0), it([y for _, y in p if y is not None][-1], 0)), norm100(p))]))
    return cand(g, out[0], out[1])


@regola("tasse-evasione", 3)
def _(g):
    rr = righe("risultati/h61_partiti.csv", variante="principale: ruolo parlamentare", indicatore="TASSE_STR", periodo="1994-2022")
    d = {r["partito"]: fl(r["per10k"]) for r in rr}
    pd_ = next(k for k in d if k.startswith("PDS") or k.endswith("PD"))
    rap = {k: round(v / d[pd_], 2) for k, v in d.items()}
    ordine = sorted(rap, key=lambda k: -rap[k])
    return BARRE(ordine, [rap[k] for k in ordine], "volte il PD")


@regola("amici-e-nemici", 1)
def _(g):
    rr = righe("risultati/h39_prev_a_b_c.csv", previsione="b", gruppo="Germania")
    rr.sort(key=lambda r: ini_periodo(r["periodo"]))
    return INTERVALLI([corto(r["periodo"]) for r in rr], [r_(r["indice"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr], "tono verso la Germania")


@regola("amici-e-nemici", 2)
def _(g):
    rr = sorted(tabella("risultati/h70_h71_h78/fase3_h39_paesi.csv"), key=lambda r: -fl(r["pendenza"]))
    sopra = sum(1 for r in rr if fl(r["lo"]) > 0)
    return INTERVALLI([r["paese"] for r in rr], [r_(r["pendenza"], 3) for r in rr], [r_(r["lo"], 3) for r in rr], [r_(r["hi"], 3) for r in rr],
                      "quanto il tono segue alleanze e guerre"), [sopra, len(rr)]


def _morte_nate(rel, colord):
    rr = [r for r in tabella(rel) if not (r["sottotipo"].startswith("nome proprio") or r["sottotipo"].startswith("frammento")) and r["parola"] != "gi"]
    rr.sort(key=lambda r: -fl(r[colord]))
    rr = rr[:12]
    return TABELLA(["Parola", "1848-1900 (volte per milione)", "1990-2022 (volte per milione)"],
                   [[r["parola"], r_(r["pm_1848_1900"], 1), r_(r["pm_1990_2022"], 1)] for r in rr])


@regola("cimitero-delle-parole", 2)
def _(g):
    return _morte_nate("risultati/h27_morte.csv", "pm_1848_1900")


@regola("cimitero-delle-parole", 3)
def _(g):
    return _morte_nate("risultati/h27_nate.csv", "pm_1990_2022")


@regola("donne-dalla-famiglia-alla-violenza", 1)
def _(g):
    rr = [r for r in tabella("risultati/h52_famiglie_decennio.csv") if int(r["decennio"]) >= 1850]
    return LINEE([("Violenza", serie_anni(rr, "decennio", "q_V", 100, 1)), ("Diritti", serie_anni(rr, "decennio", "q_D", 100, 1)),
                  ("Madre e famiglia", serie_anni(rr, "decennio", "q_M", 100, 1))])


@regola("fascismo-razza-1938", 1)
def _(g):
    rr = righe("approfondimenti/fascismo/dati/sensi_quote.csv", parola="razza", senso="F")
    rr.sort(key=lambda r: ini_periodo(r["periodo"]))
    x = ["%s (%d su %d)" % (r["periodo"], fl(r["k"]), fl(r["n"])) for r in rr]
    return INTERVALLI(x, [pc(r["quota"], 0) for r in rr], [pc(r["lo"], 0) for r in rr], [pc(r["hi"], 0) for r in rr], "frasi con il senso di razzismo di Stato (%)")


@regola("mappa-partiti-governo-opposizione", 1)
def _(g):
    sim = {r["unita"]: r for r in tabella("risultati/mappa_partiti_somiglianze.csv")}
    mappa = {r["nome"]: r for r in tabella("risultati/mappa_partiti_mappa_unica_relativa.csv")}
    righe_ = []
    for unita, anni, voluto in (("M5S (XVII)", "2013-18", "MSI"), ("M5S (XVIII)", "2018-22", "DC")):
        altro = None
        for k in range(1, 6):
            m = re.match(r"^(.+?) \((\w+)\) ([\d.]+)$", sim[unita]["simile_altra_leg_%d" % k].strip())
            if m and m.group(1) == voluto:
                altro = "%s (%s)" % (m.group(1), m.group(2))
                break
        if altro is None:
            raise Scarto("il partito %s non e' tra i cinque piu' simili a %s" % (voluto, unita))
        for nome, etich in ((unita, "M5S %s" % anni), (altro, "%s, il piu' simile tra %s" % (altro, voluto))):
            righe_.append([etich, r_(mappa[nome]["dim1"], 3), r_(mappa[nome]["dim2"], 3)])
    return TABELLA(["Partito", "Governo (−) o opposizione (+)", "Sinistra (−) o destra (+)"], righe_,
                   "Posizione sulla mappa unica dei partiti, per ogni legislatura: il M5S nelle due legislature e, per ciascuna, il partito indicato dal titolo (il primo in ordine di somiglianza).")


@regola("parole-per-chi-arriva", 1)
def _(g):
    a, b = anni_blocco(g, (1979, 2022))
    rr = tabella("risultati/h44_serie.csv")
    out = [(n, entro(serie_anni(rr, "anno", c, 1, 3), a, b)) for c, n in
           (("migranti", "Migranti"), ("clandestini", "Clandestini"), ("extracom", "Extracomunitari"), ("prof_rif", "Profughi e rifugiati"))]
    return cand(g, LINEE(out), LINEE([(n, media3(p)) for n, p in out]))


@regola("parole-per-chi-arriva", 2, approx=("0,63",))
def _(g):
    rr = tabella("risultati/h44_tono.csv")
    d = {r["gruppo"]: r for r in rr}
    ordine = ["emigranti, tutto il periodo", "emigranti, Regno 1848-1943", "emigranti, 1948-1979", "emigranti, 1980-2022",
              "immigrati, 1980-2022", "immigrati, 1980-1999", "immigrati, 2000-2022"]
    x = [k for k in ordine if k in d]
    return INTERVALLI([k.capitalize() for k in x], [r_(d[k]["T"], 2) for k in x], [r_(d[k]["T_basso"], 2) for k in x], [r_(d[k]["T_alto"], 2) for k in x], "tono")


@regola("parole-per-chi-arriva", 3)
def _(g):
    rr = [r for r in righe("risultati/h44_tono_partiti.csv", famiglia="I") if (fl(r["menzioni"]) or 0) >= 400]
    rr.sort(key=lambda r: fl(r["T"]))
    return INTERVALLI([r["partito"] for r in rr], [r_(r["T"], 2) for r in rr], [r_(r["T_basso"], 2) for r in rr], [r_(r["T_alto"], 2) for r in rr], "tono")


@regola("resistenza-risorgimento-foibe", 1)
def _(g):
    rr = [r for r in tabella("risultati/h49_annuale.csv") if (fl(r["tokens"]) or 0) >= 300000]
    return LINEE([("Resistenza (ogni 10.000 parole)", serie_anni(rr, "anno", "p10k_RES", 1, 2)), ("Risorgimento", serie_anni(rr, "anno", "p10k_RIS", 1, 2)),
                  ("Memorie contese", serie_anni(rr, "anno", "p10k_MEM", 1, 2))])


@regola("resistenza-risorgimento-foibe", 3)
def _(g):
    rr = righe("risultati/h49_partiti.csv", serie="MEM", periodo="1948-2022")
    rr.sort(key=lambda r: -fl(r["rapporto"]))
    rr = rr[:15]  # il margine della pagina: quindici righe al massimo (resta fuori il partito con il valore piu' basso)
    return INTERVALLI([r["partito"] for r in rr], [r_(r["rapporto"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr],
                      "volte il peso del partito")


@regola("analfabeti", 2)
def _(g):
    rr = righe("risultati/h63_serie_reali.csv", serie="analfabeti_censimento_pct_USATA")
    return LINEE([("Analfabeti secondo i censimenti (%)", serie_anni(rr, "anno", "valore", 1, 1))])


@regola("austria-amica-triplice", 1)
def _(g):
    rr = [r for r in righe("risultati/h39_prev_a_b_c.csv", previsione="a", gruppo="Austria") if r["periodo"] != "1848-1881"]
    rr.sort(key=lambda r: ini_periodo(r["periodo"]))
    x = []
    for r in rr:
        q, n = fl(r["quota_anni_nemico_principale"]), fl(r["n_anni_con_dati"])
        x.append(corto("%s (%d su %d)" % (r["periodo"], int(round(q * n)), int(n))) if q is not None and n else r["periodo"])
    return INTERVALLI(x, [r_(r["indice"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr], "tono verso l'Austria")


@regola("austria-amica-triplice", 2)
def _(g):
    rr = righe("risultati/h39_prev_a_b_c.csv", previsione="c")
    rows = []
    for r in rr:
        rows.append([r["gruppo"], r_(r["indice_prima"], 2), r_(r["indice"], 2),
                     "%s (da %s a %s)" % (it(fl(r["delta"]), 2), it(fl(r["delta_lo"]), 2), it(fl(r["delta_hi"]), 2))])
    return TABELLA(["Paese", "1923-34", "1935-40", "Cambio (margine)"], rows, "Tono verso il paese: da −1 (amico) a +1 (nemico).")


@regola("ce-lo-chiede-l-europa", 1)
def _(g):
    rr = tabella("risultati/h70_h71_h78/h70_quote_leg.csv")
    x = lambda r: LEG_INIZIO[int(r["leg"])]
    n_su = sum(1 for r in rr if fl(r["g_magg"]) > fl(r["g_opp"]))
    return LINEE([("Maggioranza", [(x(r), pc(r["g_magg"], 2)) for r in rr]), ("Opposizione", [(x(r), pc(r["g_opp"], 2)) for r in rr])]), [n_su, len(rr)]


@regola("ce-lo-chiede-l-europa", 2)
def _(g):
    rr = sorted(tabella("risultati/h70_h71_h78/h70_casi_b.csv"), key=lambda r: fl(r["diff"]))
    return INTERVALLI([r["caso"] for r in rr], [pc(r["diff"], 2) for r in rr], [pc(r["lo"], 2) for r in rr], [pc(r["hi"], 2) for r in rr], "differenza in punti percentuali")


@regola("chiesa-laicita", 2)
def _(g):
    rr = righe("risultati/h46_picchi.csv", famiglia="religiosa", ramo="tutti")
    conf = sum(1 for r in rr if r["picco_confermato"] == "True")
    rr.sort(key=lambda r: ini_periodo(r["data"]))
    return BARRE(["%s %s" % (r["evento"].capitalize(), r["data"]) for r in rr], [r_(r["rapporto"], 2) for r in rr], "volte il livello di base"), [conf, len(rr)]


@regola("correnti-dc-non-si-vedono", 1)
def _(g):
    rr = righe("risultati/h54_dispersione.csv", partito={"DC", "PCI"})
    d = {(r["partito"], int(r["leg"])): r for r in rr}
    legs = sorted({l for _, l in d})
    rows = [["%s (%s)" % (leg_rom(l), leg_anni(l)), r_(d[("DC", l)]["disp_corretta"], 3), r_(d[("PCI", l)]["disp_corretta"], 3)] for l in legs]
    piu = sum(1 for l in legs if fl(d[("PCI", l)]["lo"]) > fl(d[("DC", l)]["disp_corretta"]))  # il margine basso del PCI sta sopra il valore della DC
    return TABELLA(["Legislatura", "DC", "PCI"], rows, "Dispersione corretta del linguaggio dei deputati: piu' alta = piu' disperso."), [piu, len(legs)]


@regola("correnti-dc-non-si-vedono", 2)
def _(g):
    rr = [r for r in righe("risultati/h56_dirigenti.csv", partito="PCI") if (r["percentile_nel_partito"] or "").strip()]
    rr.sort(key=lambda r: -fl(r["percentile_nel_partito"]))
    return BARRE([nome_persona(r["nome"]) for r in rr], [pc(r["percentile_nel_partito"], 0) for r in rr], "percentile nel partito")


# ---------------------------------------------------------------- storie 55-70 (grafici controllati a occhio)

def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    va, vb = sum((x - ma) ** 2 for x in a), sum((y - mb) ** 2 for y in b)
    return cov / math.sqrt(va * vb)


def mesi_it(ym):
    a, m = ym.split("-")
    return "%s %s" % (MESI[int(m) - 1], a)


@regola("dc-pci-come-dc-psi", 1)
def _(g):
    rr = righe("risultati/h32_anno.csv", vocabolario="tutte", tipo="partiti")
    out = []
    for b, nome in (("PCI", "DC e PCI"), ("PSI", "DC e PSI")):
        per_anno = {}
        for r in rr:
            if r["a"] == "DC" and r["b"] == b:
                a = int(r["anno"])
                peso = (fl(r["n_a"]) or 0) + (fl(r["n_b"]) or 0)
                if a not in per_anno or peso > per_anno[a][0]:
                    per_anno[a] = (peso, fl(r["corretta"]) - 0.5)
        out.append((nome, [(a, round(v[1], 4)) for a, v in sorted(per_anno.items())]))
    return LINEE(out)


@regola("debito-pubblico", 1)
def _(g):
    a, b = anni_blocco(g, (1861, 2022))
    rr = [r for r in tabella("risultati/h51_annuale.csv") if (fl(r["parole_tot"]) or 0) >= 300000]
    pts = entro(serie_anni(rr, "anno", "att_tot", 1, 3), a, b)
    # le fasce grigie: gli anni di crisi della colonna `crisi` (1866, 1873-76, 1893-94, 1926-27, 1992-93, 2011-12), uniti in periodi
    anni_crisi = sorted(int(r["anno"]) for r in rr if r["crisi"] == "1" and a <= int(r["anno"]) <= b)
    fasce = []
    for y in anni_crisi:
        if fasce and y == fasce[-1][1] + 1:
            fasce[-1][1] = y
        else:
            fasce.append([y, y])
    fasce = [[da - 0.5, aa + 0.5] for da, aa in fasce]  # l'anno e' una colonna di un anno: la fascia copre dal suo inizio alla sua fine
    d1 = LINEE([("Parole del debito (ogni 10.000 parole)", pts)])
    d2 = LINEE([("Parole del debito (ogni 10.000 parole)", media3(pts))])
    d1["fasce"] = d2["fasce"] = fasce
    return cand(g, d1, d2)


@regola("debito-pubblico", 2)
def _(g):
    rr = righe("risultati/h51_episodi.csv", serie="tot")
    rr.sort(key=lambda r: (r["tipo"] != "crisi", ini_periodo(r["episodio"])))
    x = [r["episodio"] if r["tipo"] == "crisi" else r["episodio"] for r in rr]
    return INTERVALLI(x, [r_(r["rapporto_vs_3_prima"], 2) for r in rr], [r_(r["lo_3"], 2) for r in rr], [r_(r["hi_3"], 2) for r in rr],
                      "volte il livello dei tre anni prima")


@regola("debito-pubblico", 3, approx=("0,55",))
def _(g):
    rr = [r for r in tabella("risultati/h51_annuale.csv") if 1948 <= int(r["anno"]) <= 2022]
    att = media3(serie_anni(rr, "anno", "att_tot", 1, 3))
    pil = serie_anni(rr, "anno", "debito_pil", 1, 1)
    d1, d2 = dict(att), dict(pil)
    nocrisi = [r for r in rr if r["crisi"] == "0" and d1.get(int(r["anno"])) is not None and d2.get(int(r["anno"])) is not None]
    rho = round(pearson([d1[int(r["anno"])] for r in nocrisi], [d2[int(r["anno"])] for r in nocrisi]), 2)
    return LINEE([("Parole del debito in aula (massimo = 100)", norm100(att)), ("Debito pubblico in % del PIL (massimo = 100)", norm100(pil))]), [rho]


@regola("distanza-dc-pci-fasi", 1)
def _(g):
    rr = righe("risultati/rilettura_h32_h54/532_dcpci.csv", vocabolario="tutte")
    rr.sort(key=lambda r: int(r["leg"]))
    ref = [fl(r["d"]) for r in rr if 1953 <= LEG_INIZIO[int(r["leg"])] < 1968]  # la media del 1953-68
    base = sum(ref) / len(ref)
    x = ["%s (%s)" % (leg_rom(r["leg"]), leg_anni(r["leg"])) for r in rr]
    v = [round(fl(r["d"]) / base * 100, 0) for r in rr]
    lo = [round((fl(r["d"]) - 1.96 * fl(r["se"])) / base * 100, 0) for r in rr]
    hi = [round((fl(r["d"]) + 1.96 * fl(r["se"])) / base * 100, 0) for r in rr]
    return INTERVALLI(x, v, lo, hi, "distanza DC-PCI (% della media del 1953-68)")


@regola("donne-parlano-meno-di-quanto-pesano", 1)
def _(g):
    rr = righe("risultati/h19_quota.csv", ramo="camera", parole="solo parlamentare")
    x = lambda r: LEG_INIZIO[int(r["leg"])]
    return LINEE([("Quota delle parole delle donne (%)", [(x(r), pc(r["quota_parole_donne"], 1)) for r in rr]),
                  ("Quota dei seggi delle donne (%)", [(x(r), pc(r["quota_seggi_tempo"], 1)) for r in rr])])


def _meta(anni):
    a, b = [int(x) for x in anni.split("-")]
    return (a + b) / 2


@regola("donne-parlano-meno-di-quanto-pesano", 2)
def _(g):
    rr = righe("risultati/h19_quota.csv", parole="solo parlamentare")
    out = []
    for ramo in ("camera", "senato"):
        out.append((ramo.capitalize(), [(int(r["anni"].split("-")[0]), r_(r["rapporto_parole_su_seggi"], 2)) for r in rr if r["ramo"] == ramo]))
    sotto = [y for x, y in out[0][1] if x <= 1976 and y is not None]
    extra = [0.75] if sotto and max(sotto) < 0.75 else []
    return LINEE(out), extra


@regola("dopo-moro-si-ferma", 1)
def _(g):
    rr = righe("risultati/h56_asse_serie.csv", tipo="semestre")
    out = []
    for p, nome in (("PCI", "PCI"), ("DC", "DC")):
        pts = []
        for r in rr:
            if r["partito"] == p:
                m = re.match(r"(\d{4})([ab])", r["periodo"])
                pts.append((int(m.group(1)) + (0 if m.group(2) == "a" else 0.5), r_(r["x"], 3)))
        out.append((nome, sorted(pts)))
    return LINEE(out)


@regola("fascismo-via-il-lei", 2)
def _(g):
    rr = righe("risultati/h18e_prima_dopo_1938.csv", lista={"lei", "voi", "ella", "inglesi_identici", "francesi_identici"})
    d = {(r["lista"], r["ramo"]): r for r in rr}
    NOMI = [("lei", "«Lei»"), ("voi", "«Voi»"), ("ella", "«Ella»"), ("inglesi_identici", "Parole inglesi uguali all'italiano"),
            ("francesi_identici", "Parole francesi uguali all'italiano")]
    rows = [[n, r_(d[(k, "camera")]["rapporto_dopo_su_prima"], 2), r_(d[(k, "senato")]["rapporto_dopo_su_prima"], 2)] for k, n in NOMI]
    return TABELLA(["Parola", "Camera", "Senato"], rows, "Quante volte la parola si dice nel 1938-40 rispetto al 1930-37 (1 = uguale).")


@regola("giornali-di-partito", 2)
def _(g):
    rr = [r for r in tabella("risultati/h57_testate_decennio.csv") if int(r["decennio"]) >= 1940]
    dec = sorted({int(r["decennio"]) for r in rr})
    rows = []
    for d in dec:
        top = max((r for r in rr if int(r["decennio"]) == d), key=lambda r: fl(r["menzioni"]) or 0)
        nome = top["testata"].replace("l'Unita'", "l'Unità")
        rows.append(["%d-%02d" % (d, (d + 9) % 100), nome, int(fl(top["menzioni"])), r_(top["per_milione"], 1)])
        if d >= 1970 and "Corriere" not in top["testata"]:
            raise Scarto("nel decennio %d la testata piu' citata e' %s" % (d, top["testata"]))
    return TABELLA(["Decennio", "Testata piu' citata", "Citazioni", "Volte per milione di parole"], rows)


@regola("inglese-sale-latino-resta", 1)
def _(g):
    rr = righe("risultati/serie_parole.csv", ramo="tutti")
    ok = lambda r: (fl(r["token"]) or 0) >= 300000
    out = []
    for lista, nome in (("h9_en_identici", "Parole inglesi"), ("h9_la_frasi", "Frasi latine"), ("h9_fr_identici", "Parole francesi")):
        sel = [r for r in rr if r["lista"] == lista and ok(r)]
        out.append((nome, serie_anni(sel, "anno", "per_milione", 0.01, 2)))
    en = [r for r in rr if r["lista"] == "h9_en_identici" and 2009 <= int(r["anno"]) <= 2022]
    medie = [fl(r["per_milione"]) / 100 for r in en if ok(r)]
    media = round(sum(medie) / len(medie), 2)  # media dei valori annuali 2009-22
    return LINEE(out), [media]


def _top_contrib(lista, nome):
    rr = righe("risultati/h9_contributori.csv", lista=lista, periodo="1994-2022")
    rr.sort(key=lambda r: -fl(r["n"]))
    rr = rr[:10]
    return BARRE([r["parola"] for r in rr], [int(fl(r["n"])) for r in rr], "volte dal 1994 al 2022")


@regola("inglese-sale-latino-resta", 2)
def _(g):
    return _top_contrib("la_frasi", "volte")


@regola("inglese-sale-latino-resta", 3)
def _(g):
    return _top_contrib("en_identici", "volte")


@regola("interventi-brevi-regno-lunghi-repubblica", 2)
def _(g):
    rr = righe("risultati/serie_h1_h5.csv", gruppo="usabili")
    out = []
    for ramo in ("senato", "camera"):
        out.append((ramo.capitalize(), serie_anni([r for r in rr if r["ramo"] == ramo], "anno", "quota_turni_fino_10_parole", 100, 1)))
    return LINEE(out)


@regola("israele-palestina", 1)
def _(g):
    rr = tabella("risultati/h69_h76/h69_picchi.csv")
    rr.sort(key=lambda r: r["mese"])
    rows = []
    for r in rr:
        quanto = ("%s volte" % it(fl(r["R_grezza"]), 1)) if r["picco_grezza"] == "True" else "nessun picco"
        rows.append(["%s (%s)" % (r["evento"], mesi_it(r["mese"])), r_(r["freq_base"], 2), r_(r["freq_finestra"], 2), quanto])
    return TABELLA(["Crisi", "Un anno prima (menzioni ogni 10.000 parole)", "Quattro mesi dalla crisi", "Quante volte di piu'"], rows)


@regola("israele-palestina", 3)
def _(g):
    rr = tabella("risultati/h69_h76/h69_giudice_celle.csv")
    NOMI = {"PCI_1948-66": "PCI, 1948-66", "DC_1948-66": "DC, 1948-66", "PCI_1968-80": "PCI, 1968-80", "DC_1968-80": "DC, 1968-80",
            "destra_1948-89": "Destra, 1948-89", "destra_1990-2022": "Destra, 1990-2022", "PD_1990-2022": "PD, 1990-2022", "altri": "Altri"}
    x, v, lo, hi, extra = [], [], [], [], []
    for r in rr:
        n = int(fl(r["con_posizione"]))
        J = fl(r["J"])
        x.append("%s (%d posizioni)" % (NOMI.get(r["cella"], r["cella"]), n))
        v.append(r_(J, 2)); lo.append(r_(r["lo"], 2)); hi.append(r_(r["hi"], 2))
        if r["cella"] == "PCI_1968-80":
            extra += [int(round((1 - J) / 2 * n)), n]  # prese di posizione per i palestinesi, ricavate da J
    return INTERVALLI(x, v, lo, hi, "equilibrio delle prese di posizione (da −1, per i palestinesi, a +1, per Israele)"), extra


def _blocchi_barre(rel, colonna_val="R", nota_giud=True):
    rr = tabella(rel)
    x = ["%s (%s)" % (r["blocco"], r["giudizio"]) for r in rr]
    return COLONNE(x, [r_(r[colonna_val], 2) for r in rr], "volte gli anni vicini")


@regola("lingua-della-guerra", 2)
def _(g):
    return _blocchi_barre("risultati/h25_blocchi.csv")


@regola("lingua-delle-crisi", 2)
def _(g):
    return _blocchi_barre("risultati/h26_blocchi.csv")


@regola("lingua-delle-crisi", 3)
def _(g):
    rr = righe("risultati/h26_parole.csv", parola="recessione")
    x = [r["blocco"] + ("" if (fl(r["blocco_pm"]) or 0) > 0 else " (parola non usata)") for r in rr]
    v = [r_(r["R"], 2) if (fl(r["blocco_pm"]) or 0) > 0 else None for r in rr]
    return COLONNE(x, v, "volte gli anni vicini")


@regola("mafie-picchi-1982-1992", 1)
def _(g):
    rr = tabella("risultati/h40_eventi_mensile.csv")
    out = []
    for ev, nome in (("via D'Amelio", "Via D'Amelio"), ("Capaci", "Capaci"), ("Dalla Chiesa", "Dalla Chiesa"), ("Ciaculli", "Ciaculli")):
        pts = [(int(fl(r["k"])), r_(r["per10k"], 2)) for r in rr if r["evento"] == ev]
        out.append((nome, sorted(pts)))
    return MULTIPLI(out)


@regola("mafie-picchi-1982-1992", 2)
def _(g):
    rr = righe("risultati/h40_partiti.csv", insieme="1948-1992, principale: ruolo parlamentare")
    rr.sort(key=lambda r: -fl(r["rapporto"]))
    return INTERVALLI([r["partito"] for r in rr], [r_(r["rapporto"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr],
                      "volte il peso del partito")


@regola("mafie-prime-volte", 1)
def _(g):
    rr = [r for r in tabella("risultati/h40_annuale_totale.csv") if (fl(r["tokens"]) or 0) >= 300000]
    out = []
    for col, nome, anno in (("mafia_per10k", "Mafia", 1992), ("camorra_per10k", "Camorra", 1984), ("ndrangheta_per10k", "'Ndrangheta", 2010)):
        pts = serie_anni(rr, "anno", col, 1, 2)
        vuole_picco(pts, anno, nome)
        out.append((nome, pts))
    return LINEE(out)


@regola("metafore-di-guerra", 3)
def _(g):
    rr = righe("risultati/h58_partiti_tassi.csv", periodo="1948-1993")
    rr.sort(key=lambda r: -fl(r["tasso"]))
    return BARRE([r["partito"] for r in rr], [r_(r["tasso"], 2) for r in rr], "metafore di guerra ogni 10.000 parole")


# ---------------------------------------------------------------- storie 71-85 (grafici controllati a occhio)

def fini_leg():
    """Anni in cui finiscono le legislature (servono come estremi dei periodi scritti nei titoli, per esempio «2018-22»)."""
    return [LEG_INIZIO[n + 1] if n + 1 in LEG_INIZIO else LEG_FINE_ULTIMA for n in LEG_INIZIO]


def media_per(rr, col, a, b, ok=None):
    v = [fl(r[col]) for r in rr if a <= int(r["anno"]) <= b and fl(r[col]) is not None and (ok is None or ok(r))]
    return round(sum(v) / len(v), 2) if v else None


@regola("nemico-in-casa", 1)
def _(g):
    a, b = anni_blocco(g, (1945, 2022))
    rr = tabella("risultati/h69_h76/h74_quota_anno.csv")
    return LINEE([("Quota delle parole del nemico che vanno a bersagli interni (%)", entro(serie_anni(rr, "anno", "quota3", 100, 1), a, b))])


@regola("nemico-in-casa", 2)
def _(g):
    a, b = anni_blocco(g, (1945, 2022))
    rr = tabella("risultati/h69_h76/h74_serie_gruppi.csv")
    NOMI = (("terrorismo", "Terrorismo"), ("mafia", "Mafia"), ("evasione", "Evasione"), ("immigrati", "Immigrati"), ("casta_politici", "Casta e politici"))
    return MULTIPLI([(n, entro(serie_anni(rr, "anno", c, 1, 3), a, b)) for c, n in NOMI])


@regola("nucleare", 2)
def _(g):
    rr = righe("risultati/h59_partiti.csv", periodo="1948-2022")
    voluti = ["DP", "Verdi", "Radicali", "IdV", "PDS/DS/PD", "PSI", "PCI", "DC", "MSI", "PRC", "PLI", "M5S", "FI/PdL", "Lega"]
    d = {r["partito"]: r for r in rr if r["partito"] in voluti}
    GR = {"CONTRO": " (contro)", "A FAVORE": " (a favore)"}
    ordine = sorted(d, key=lambda p: -fl(d[p]["per_milione"]))
    return BARRE([p + GR.get(d[p]["gruppo"], "") for p in ordine], [int(round(fl(d[p]["per_milione"]))) for p in ordine], "volte per milione di parole")


@regola("nucleare", 3)
def _(g):
    rr = [r for r in tabella("risultati/h59_tono.csv") if re.fullmatch(r"\d{4}-\d{4}", r["insieme"]) and int(r["insieme"][5:]) - int(r["insieme"][:4]) == 4]
    rr.sort(key=lambda r: int(r["insieme"][:4]))
    return INTERVALLI([r["insieme"] for r in rr], [r_(r["T"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr], "tono sul nucleare")


@regola("parola-dell-anno", 2)
def _(g):
    rr = tabella("risultati/h22_parole_anno.csv")
    anni = [1859, 1922, 1948, 1969, 1978, 1992, 2011, 2020]
    rows = []
    for a in anni:
        sel = sorted((r for r in rr if int(r["anno"]) == a and int(r["rango"]) <= 5), key=lambda r: int(r["rango"]))
        rows.append([a, sel[0]["parola"], ", ".join(r["parola"] for r in sel[1:]), int(fl(sel[0]["occorrenze_anno"]))])
    return TABELLA(["Anno", "Parola dell'anno", "Le altre quattro", "Volte nell'anno"], rows)


@regola("pci-1976-suona-da-maggioranza", 1)
def _(g):
    rr = [r for r in tabella("risultati/h67/h67_partiti_legislature_gram.csv") if r["partito"] in ("DC", "PCI", "MSI") and 1 <= int(r["leg"]) <= 11]
    out = []
    for p in ("PCI", "DC", "MSI"):
        out.append((p, [(LEG_INIZIO[int(r["leg"])], r_(r["logit"], 2)) for r in rr if r["partito"] == p]))
    return LINEE(out), fini_leg()


@regola("pci-1976-suona-da-maggioranza", 2)
def _(g):
    d = {r["nome"]: r for r in tabella("risultati/h67/h67_d_risultati.csv")}
    NOMI = [("base_full", "Tutte le 5.000 parole"), ("coef_full", "Senza le 200 parole del ruolo"), ("monroe_full", "Senza le 200 parole del ruolo, altro metodo"),
            ("casuali_full_1", "Senza 200 parole a caso (prova 1)"), ("casuali_full_2", "Senza 200 parole a caso (prova 2)"), ("casuali_full_3", "Senza 200 parole a caso (prova 3)")]
    rows = [[n, r_(d[k]["spost"], 3), round(fl(d[k]["riduzione"]) * 100, 1)] for k, n in NOMI]
    return TABELLA(["Versione della misura", "Spostamento del PCI verso la DC", "Cala del (%)"], rows)


@regola("scendere-in-campo", 1)
def _(g):
    rr = tabella("risultati/h64_scendere_campo.csv")
    ok = {int(r["anno"]) for r in righe("risultati/h21_serie.csv", ramo="tutti") if (fl(r["n_parole"]) or 0) >= 300000}
    pts = [(x, y) for x, y in serie_anni(rr, "anno", "tutti", 1, 2) if x in ok]
    full = {x: y for x, y in serie_anni(rr, "anno", "tutti", 1, 2)}
    m = media3([(x, full[x]) for x in sorted(full)])
    m = [(x, y) for x, y in m if x in ok]
    return cand(g, LINEE([("«Scendere in campo» (volte per milione)", pts)]), LINEE([("«Scendere in campo» (volte per milione)", m)]))


@regola("sovranita", 1)
def _(g):
    rr = [r for r in tabella("risultati/h69_h76/h76_anno.csv") if r["anno"] != "0" and int(r["anno"]) >= 1990]
    return LINEE([("Passaggi che rivendicano la sovranita' (%)", serie_anni(rr, "anno", "quota_riv", 100, 1))])


@regola("sovranita", 2)
def _(g):
    rr = tabella("risultati/h69_h76/h76_partiti_2010_22.csv")
    rr.sort(key=lambda r: -fl(r["quota_riv"]))
    return INTERVALLI(["%s (%d passaggi)" % (r["partito"], fl(r["menzioni"])) for r in rr], [pc(r["quota_riv"], 1) for r in rr],
                      [pc(r["lo"], 1) for r in rr], [pc(r["hi"], 1) for r in rr], "passaggi che rivendicano la sovranita' (%)")


@regola("sovranita", 3)
def _(g):
    rr = tabella("risultati/h69_h76/h76_oggetti_periodi.csv")
    rows = [[r["periodo"], pc(r["nazionale_quota"], 0), pc(r["popolare_quota"], 0), pc(r["europea_quota"], 0)] for r in rr]
    return TABELLA(["Periodo", "Sovranita' nazionale (%)", "Sovranita' popolare (%)", "Sovranita' europea (%)"], rows, "Quota dei passaggi sulla sovranita' che parlano di ciascun tipo; il resto e' «altro».")


@regola("sud-cambia-nome-nord-cresce", 1)
def _(g):
    a, b = anni_blocco(g, (1969, 2022))
    rr = tabella("risultati/h45_serie.csv")
    out = [(n, entro(serie_anni(rr, "anno", c, 1, 2), a, b)) for c, n in (("mezzogiorno", "Mezzogiorno"), ("sud_parola", "Sud"), ("meridionale", "Meridionale"))]
    rap = []
    for c in ("mezzogiorno", "sud_parola"):
        pre = media_per(rr, c, 1985, 1991)
        post = media_per(rr, c, 1994, 2001)
        rap.append(round(post / pre, 2))
    return cand(g, LINEE(out), LINEE([(n, media3(p)) for n, p in out]), rap)


@regola("sud-cambia-nome-nord-cresce", 3)
def _(g):
    rr = tabella("risultati/h45_serie.csv")
    pts = [(x, y) for x, y in serie_anni(rr, "anno", "N_camera", 1, 1) if 1984 <= x <= 2006]
    pts2 = [(x, y) for x, y in serie_anni(rr, "anno", "N_senato", 1, 1) if 1984 <= x <= 2006]
    extra = [media_per(rr, "N_camera", 1994, 1995), media_per(rr, "N_camera", 1996, 2001)]
    return LINEE([("Camera", pts), ("Senato", pts2)]), extra


@regola("svolta-2013", 1)
def _(g):
    r = righe("risultati/h65/422_cambio_2013.csv", voce="indice")[0]
    voci = [("Senato", "senato", "senato_lo", "senato_hi"), ("Camera", "camera", "camera_lo", "camera_hi"),
            ("Parte del resoconto, secondo i ministri", "resoconto", "resoconto_lo", "resoconto_hi"),
            ("Camera senza il resoconto", "camera_corretta", "camera_corretta_lo", "camera_corretta_hi"),
            ("Camera meno Senato", "camera_meno_senato", "cms_lo", "cms_hi")]
    return INTERVALLI([corto(v[0]) for v in voci], [r_(r[v[1]], 2) for v in voci], [r_(r[v[2]], 2) for v in voci], [r_(r[v[3]], 2) for v in voci], "salto del 2013")


@regola("svolta-2013", 2)
def _(g):
    rr = tabella("risultati/{REV}/392_spie_trascrizione.csv")
    out = []
    for ramo, parola, nome in (("camera", "io", "«io» alla Camera"), ("camera", "tale", "«tale» alla Camera"), ("senato", "io", "«io» al Senato"), ("senato", "tale", "«tale» al Senato")):
        out.append((nome, serie_anni([r for r in rr if r["ramo"] == ramo and r["parola"] == parola], "anno", "per_1000", 1, 2)))
    return LINEE(out)


@regola("svolta-2013", 3)
def _(g):
    rr = righe("risultati/h65/421_tendenze.csv", versione="U")
    NOMI = {"frasi": "Parole per frase", "lettere": "Lettere per parola", "top100": "Peso delle 100 parole piu' comuni", "domande": "Domande",
            "emozioni": "Parole di emozione", "astratti": "Nomi astratti"}
    rr.sort(key=lambda r: -fl(r["quota_rimasta"]))
    conserva = sum(1 for r in rr if r["conserva"] == "True")
    return INTERVALLI([NOMI[r["misura"]] for r in rr], [pc(r["quota_rimasta"], 0) for r in rr], [pc(r["quota_lo"], 0) for r in rr], [pc(r["quota_hi"], 0) for r in rr],
                      "quota della tendenza che resta dopo la correzione (%)"), [conserva, len(rr)]


@regola("terrorismo-cambia-volto", 1)
def _(g):
    rr = tabella("risultati/h50_famiglie_epoche.csv")
    d = {(r["epoca"], r["misura"]): r for r in rr}
    epoche = ["1848-1877", "1878-1914", "1915-1945", "1946-1968", "1969-1988", "1989-2000", "2001-2022"]
    rows = [[e, pc(d[(e, "f_rosso")]["quota"], 1), pc(d[(e, "f_nero")]["quota"], 1), pc(d[(e, "f_islam")]["quota"], 1)] for e in epoche]
    return TABELLA(["Epoca", "«rosso» (su 100 menzioni)", "«nero»", "«islamico»"], rows, "Parole accanto a «terrorismo»: quante volte su cento, in ogni epoca.")


@regola("tono-europa-dopo-2011", 2)
def _(g):
    rr = righe("risultati/h38_tono_partito_leg.csv", variante="tutti i ruoli")
    destra = {}
    for r in rr:
        if r["partito"] in ("MSI", "AN", "FdI") and r["tono"]:
            l = int(r["leg"])
            if l not in destra or fl(r["tok"]) > fl(destra[l]["tok"]):
                destra[l] = r
    lega = {int(r["leg"]): r for r in rr if r["partito"] == "Lega" and r["tono"]}
    x = lambda l: LEG_INIZIO[l]
    return LINEE([("MSI, poi AN e FdI", [(x(l), r_(destra[l]["tono"], 2)) for l in sorted(destra)]),
                  ("Lega", [(x(l), r_(lega[l]["tono"], 2)) for l in sorted(lega)])]), fini_leg()


@regola("trieste-jugoslavia", 1)
def _(g):
    rr = tabella("risultati/h68_h75_h77/h77_giudice_paesi_1945_54.csv")
    rr.sort(key=lambda r: int(fl(r["rango"])))
    return BARRE([r["paese"] for r in rr], [pc(r["ostilita"], 0) for r in rr], "passaggi in cui il paese e' «nemico» nel 1945-54 (%)")


@regola("trieste-jugoslavia", 3)
def _(g):
    rr = tabella("risultati/h68_h75_h77/h77_giudice_msi.csv")
    ANNI = {"P1": "1945-54", "P2": "1955-69", "P3": "1970-74", "P4": "1975-77", "P5": "1978-90"}
    rows = []
    for r in rr:
        if r["misurabile"] == "True":
            rows.append([ANNI[r["periodo"]], pc(r["ostilita_MSI"], 0), pc(r["ostilita_altri"], 0),
                         "%s (da %s a %s)" % (it(fl(r["differenza"]) * 100, 0), it(fl(r["ic_lo"]) * 100, 0), it(fl(r["ic_hi"]) * 100, 0))])
        else:
            rows.append([ANNI[r["periodo"]], "non misurabile", "-", "-"])
    return TABELLA(["Periodo", "MSI (%)", "Altri partiti (%)", "Differenza in punti (margine)"], rows,
                   "Quota dei passaggi in cui la Jugoslavia e' «nemica». Nel 1970-74 i passaggi del MSI sono troppo pochi (%d) per una misura." % int(fl(next(r["validi_MSI"] for r in rr if r["misurabile"] != "True"))))


@regola("alto-adige-austria", 2)
def _(g):
    rr = tabella("risultati/h68_h75_h77/h77_giudice_paesi_1945_54.csv")
    rr.sort(key=lambda r: int(fl(r["rango"])))
    return BARRE([r["paese"] for r in rr], [pc(r["ostilita"], 0) for r in rr], "passaggi in cui il paese e' «nemico» nel 1945-54 (%)")


@regola("domande-in-calo", 1)
def _(g):
    rr = tabella("risultati/h28_serie.csv")
    out = []
    for ramo in ("senato", "camera"):
        sub = [r for r in rr if r["ramo"] == ramo and (fl(r["n_parole"]) or 0) >= 300000]
        out.append((ramo.capitalize(), serie_anni(sub, "anno", "q_per_1000_parole", 1, 2)))
    tutti = [r for r in rr if r["ramo"] == "tutti" and (fl(r["n_parole"]) or 0) >= 300000]
    ex = [media_per(tutti, "q_per_1000_parole", 1946, 1969), media_per(tutti, "q_per_1000_parole", 1994, 2007)]
    return LINEE(out), ex


@regola("domande-in-calo", 2)
def _(g):
    rr = righe("risultati/h28_serie.csv", ramo="tutti")
    return COLONNE_ANNI([(x, y) for x, y in serie_anni([r for r in rr if int(r["anno"]) >= 1946], "anno", "quota_turni_con_domanda", 100, 1)], "interventi con una domanda (%)")


@regola("donne-parlano-diverso", 1)
def _(g):
    NOMI = {"parole_per_frase": "parole per frase", "domande_per_1000": "domande", "emozioni_per_1000": "parole di emozione", "lettere_per_parola": "lettere per parola",
            "quota_vocabolario_base": "vocabolario di base", "subordinanti_per_1000": "subordinate"}
    out = []
    for ramo in ("camera", "senato"):
        rr = righe("risultati/h19_modello.csv", ramo=ramo, periodo="tutta la Repubblica", modello="legislatura+partito+ruolo")
        rows = []
        for r in rr:
            m, e, d = fl(r["media_uomini"]), fl(r["errore"]), fl(r["differenza_donne_meno_uomini"])
            rows.append(("%s: %s" % (ramo.capitalize(), NOMI[r["esito"]]), round(fl(r["differenza_percento"]), 1), round((d - 1.96 * e) / m * 100, 1), round((d + 1.96 * e) / m * 100, 1)))
        out.append(rows)
    allr = out[0] + out[1]
    allr.sort(key=lambda t: -abs(t[1]))
    return INTERVALLI([t[0] for t in allr], [t[1] for t in allr], [t[2] for t in allr], [t[3] for t in allr], "differenza tra donne e uomini (%)")


@regola("donne-parlano-diverso", 2)
def _(g):
    rr = righe("risultati/h19_parole_tipiche.csv", ramo="camera", periodo="tutta la Repubblica")
    don = sorted((r for r in rr if r["lato"] == "donne"), key=lambda r: int(fl(r["posto"])))[:10]
    uom = sorted((r for r in rr if r["lato"] == "uomini"), key=lambda r: int(fl(r["posto"])))[:10]
    rows = [[i + 1, don[i]["parola"], uom[i]["parola"]] for i in range(min(len(don), len(uom)))]
    return TABELLA(["Posto", "Parole piu' tipiche delle deputate", "Parole piu' tipiche dei deputati"], rows, "Camera, tutta la Repubblica.")


@regola("forme-antiche-unita", 1)
def _(g):
    rr = [r for r in righe("risultati/serie_parole.csv", lista="h7_ipotesi", ramo="tutti") if (fl(r["token"]) or 0) >= 300000]
    pts = serie_anni(rr, "anno", "per_milione", 1, 0)
    ex = [media_per(rr, "per_milione", 1848, 1859), media_per(rr, "per_milione", 1912, 1919)]
    return LINEE([("Sei forme antiche (volte per milione)", pts)]), ex


# ---------------------------------------------------------------- storie 86-110 (grafici controllati a occhio)

def etichetta_evento(evento, data):
    """«Spagnolo (morto allo stadio)», 1995-01-29 -> «Spagnolo 1995»; l'anno si scrive una volta sola."""
    base = evento.split(" (")[0].strip()
    anno = str(data)[:4]
    return base if anno in base else "%s %s" % (base, anno)


LEG_NOME = {"12": "1994-96", "13": "1996-2001", "14": "2001-06", "18": "2018-22", "insieme": "Quattro legislature insieme"}


def _h36(rel, misura):
    rr = righe(rel, misura=misura, legislatura={"12", "13", "14", "18", "insieme"})
    rr.sort(key=lambda r: (r["legislatura"] == "insieme", int(r["legislatura"]) if r["legislatura"] != "insieme" else 0))
    return INTERVALLI([LEG_NOME[r["legislatura"]] for r in rr], [r_(r["coef_collegio"], 3) for r in rr], [r_(r["lo"], 3) for r in rr],
                      [r_(r["hi"], 3) for r in rr], "differenza tra deputati di collegio e di lista")


@regola("legge-elettorale-non-cambia-lingua", 1)
def _(g):
    return _h36("risultati/h36_regione_elezione.csv", "reg1000")


@regola("legge-elettorale-non-cambia-lingua", 2)
def _(g):
    return _h36("risultati/h36_prova_principale.csv", "dist_corretta")


@regola("mezzogiorno-brigantaggio-cassa", 3)
def _(g):
    a, b = anni_blocco(g, (1945, 2022))
    rr = tabella("risultati/h45_serie.csv")
    out = [(n, entro(serie_anni(rr, "anno", c, 1, 2), a, b)) for c, n in
           (("cassa", "Cassa per il Mezzogiorno"), ("interv", "Intervento straordinario"), ("aree_depresse", "Aree depresse"))]
    sm = [(n, media3(p)) for n, p in out]
    vuole_picco(sm[0][1], 1964, "la Cassa")
    return LINEE(sm)


@regola("sciopero-segue-scioperi", 1, approx=("0,63",))
def _(g):
    p = {int(r["anno"]): fl(r["tutti_per_milione"]) for r in righe("risultati/h47_serie.csv", serie="sciopero") if fl(r["tutti_per_milione"]) is not None}
    q = {int(r["anno"]): fl(r["valore"]) / 1000 for r in righe("risultati/h47_serie_reali.csv", serie="scioperi_ore_non_lavorate_migliaia") if fl(r["valore"]) is not None}
    def m3(d, a):
        v = [d[a + k] for k in (-1, 0, 1) if a + k in d]
        return sum(v) / len(v)
    com = [a for a in sorted(p) if a in q and 1950 <= a <= 2008 and all((a + k) in p and (a + k) in q for k in (-1, 1))]
    rho = round(pearson([m3(p, a) for a in com], [m3(q, a) for a in com]), 2)  # media mobile di tre anni di tutte e due le serie
    return LINEE([("Parola «sciopero» in aula (massimo = 100)", norm100([(a, v) for a, v in sorted(p.items()) if 1949 <= a <= 2009])),
                  ("Ore di sciopero non lavorate (massimo = 100)", norm100([(a, v) for a, v in sorted(q.items()) if 1949 <= a <= 2009]))]), [rho]


@regola("scuola-riforme", 1)
def _(g):
    rr = righe("risultati/h63_picchi.csv", famiglia="sc_larga", ramo="tutti")
    rr.sort(key=lambda r: int(r["data"]))
    return COLONNE([re.sub(r"^(legge|riforma|decreti) ", "", etichetta_evento(r["evento"], r["data"])) for r in rr], [r_(r["rapporto"], 2) for r in rr], "volte il livello di base")


@regola("scuola-riforme", 3)
def _(g):
    rr = tabella("risultati/h63_temi_decennio.csv")
    out = []
    for t, n in (("universita_studenti", "Universita' e studenti"), ("base_maestri", "Scuola di base e maestri"), ("precari_concorsi", "Precari e concorsi")):
        out.append((n, serie_anni([r for r in rr if r["tema"] == t and int(r["decennio"]) >= 1850], "decennio", "quota_pct", 1, 1)))
    return LINEE(out)


@regola("calcio", 1)
def _(g):
    rr = tabella("risultati/h64_eventi.csv")
    rr.sort(key=lambda r: r["data"])
    return COLONNE([etichetta_evento(r["evento"], r["data"]) for r in rr], [r_(r["rapporto"], 1) for r in rr], "volte il livello di prima")


@regola("calcio", 3)
def _(g):
    rr = righe("risultati/h64_eventi_mensile.csv", evento="Spagnolo (morto allo stadio)")
    rr.sort(key=lambda r: int(fl(r["k"])))
    return COLONNE(["mese %d" % int(fl(r["k"])) for r in rr], [int(fl(r["hits"])) if (fl(r["tokens"]) or 0) >= 100000 else None for r in rr], "menzioni del calcio")


@regola("missione-o-guerra", 1)
def _(g):
    rr = righe("risultati/h68_h75_h77/h68_operazioni.csv", versione="primaria (parlamentari + governo)")
    rows = []
    for r in rr:
        if r["misurabile"] == "True":
            rows.append([r["operazione"], pc(r["quota_M"], 0), pc(r["quota_O"], 0),
                         "%s (da %s a %s)" % (it(fl(r["diff_O_meno_M"]) * 100, 0), it(fl(r["ic_lo"]) * 100, 0), it(fl(r["ic_hi"]) * 100, 0))])
        else:
            rows.append([r["operazione"], "non misurabile", "non misurabile", "-"])
    return TABELLA(["Operazione", "Maggioranza dice «guerra» (%)", "Opposizione (%)", "Differenza in punti (margine)"], rows)


@regola("missione-o-guerra", 2)
def _(g):
    rr = tabella("risultati/h68_h75_h77/h68_casi_partito.csv")
    rows = []
    for r in rr:
        o = {r["ruolo_1"]: (r["op_1"], r["quota_1"]), r["ruolo_2"]: (r["op_2"], r["quota_2"])}
        if r["misurabile"] != "True":
            rows.append([r["partito"], "%s: %s%%" % (o["O"][0], it(fl(o["O"][1]) * 100, 0)), "%s: %s%%" % (o["M"][0], it(fl(o["M"][1]) * 100, 0)), "non misurabile"])
            continue
        rows.append([r["partito"], "%s: %s%%" % (o["O"][0], it(fl(o["O"][1]) * 100, 0)), "%s: %s%%" % (o["M"][0], it(fl(o["M"][1]) * 100, 0)),
                     "%s (da %s a %s)" % (it(fl(r["diff_opposizione_meno_governo"]) * 100, 0), it(fl(r["ic_lo"]) * 100, 0), it(fl(r["ic_hi"]) * 100, 0))])
    return TABELLA(["Partito", "All'opposizione dice «guerra»", "Al governo dice «guerra»", "Differenza in punti (margine)"], rows)


@regola("aula-non-anticipa-alleanze", 1)
def _(g):
    rr = [r for r in righe("risultati/h39_anticipo.csv", calcolabile="True") if fl(r["delta_diretto"]) is not None]
    n_tot = len(rr)
    rr.sort(key=lambda r: -abs(fl(r["delta_diretto"])))
    rr = sorted(rr[:15], key=lambda r: r["data"])
    x = ["%s %s" % (r["data"][:4], corto(r["descrizione"], 35)) for r in rr]
    return INTERVALLI(x, [r_(r["delta_diretto"], 2) for r in rr], [r_(r["dd_lo"], 2) for r in rr], [r_(r["dd_hi"], 2) for r in rr], "variazione dell'ostilita' prima dell'evento"), [n_tot]


@regola("fascismo-parlamento-ammutolisce", 2)
def _(g):
    rr = righe("risultati/h18_periodi.csv", ramo="camera")
    return INTERVALLI([r["periodo"] for r in rr], [pc(r["quota_governo"], 1) for r in rr], [pc(r["quota_governo_lo"], 1) for r in rr], [pc(r["quota_governo_hi"], 1) for r in rr],
                      "quota di parole del governo (%)")


@regola("piu-elettori-date-finte", 1)
def _(g):
    anni = {r["stem"]: int(r["anno_min"]) for r in tabella("risultati/serie_h2_legislature.csv")}
    rif = righe("risultati/h3_riforme.csv", ramo="camera", gruppo="tutti", misura="parole_per_frase")
    pla = righe("risultati/h3_placebo.csv", ramo="camera", statistica="tutti", misura="parole_per_frase")
    x, v = [], []
    for r in sorted(rif, key=lambda r: int(r["riforma"])):
        x.append("Riforma del voto, %s" % r["riforma"]); v.append(round(-fl(r["cambio"]), 2))
    for r in pla:
        a = anni.get("camera_regno_%02d" % int(fl(r["prima_legislatura_dopo"])))
        if a:
            x.append("Data finta, %d" % a); v.append(round(-fl(r["stima"]), 2))
    return BARRE(x, v, "parole in meno per frase")


@regola("piu-elettori-date-finte", 2)
def _(g):
    t = leggi("risultati/h3_risultati.txt")
    x, v = [], []
    soglia = None
    for m in re.finditer(r"^\s*(\d{4}): .*?composito \+([\d.]+) contro 90o percentile dei placebo \+([\d.]+)", t, re.M):
        x.append("Riforma del voto, %s" % m.group(1)); v.append(float(m.group(2)))
        soglia = float(m.group(3))
    if soglia is None:
        raise Scarto("righe «VERDETTO per riforma» non trovate")
    x.append("Soglia delle date finte (90° percentile)"); v.append(soglia)
    return BARRE(x, v, "indice composito di semplificazione")


@regola("politica-dei-numeri", 2)
def _(g):
    rr = righe("risultati/h21_periodi.csv", ramo="tutti", misura="numeri_economici_per_1000")
    return COLONNE([r["periodo"] for r in rr], [r_(r["media"], 2) for r in rr], "numeri dell'economia ogni mille parole")


@regola("repubblica-non-si-semplifica", 2)
def _(g):
    rr = righe("risultati/riparazione_c3/403_serie.csv", ramo="senato", misura="parole_frase")
    out = []
    for ver, nome in (("b", "Senza i gradini del resoconto"), ("orig", "Resoconto originale")):
        out.append((nome, serie_anni([r for r in rr if r["versione"] == ver], "anno", "valore", 1, 1)))
    return LINEE(out)


@regola("repubblica-non-si-semplifica", 3)
def _(g):
    rr = righe("risultati/riparazione_c3/403_serie.csv", ramo="camera", misura="top100")
    out = []
    for ver, nome in (("orig", "Peso delle 100 parole piu' comuni: resoconto originale"), ("a", "Senza i gradini, versione a"),
                      ("b", "Senza i gradini, versione b"), ("c", "Senza i gradini, versione c")):
        out.append((nome, serie_anni([r for r in rr if r["versione"] == ver], "anno", "valore", 1, 1)))
    return LINEE(out)


@regola("tecnologia-ritardo", 1)
def _(g):
    rr = [r for r in righe("risultati/h42_ritardi.csv", gruppo="principale") if fl(r["ritardo_25"]) is not None]
    bins = [(1840, 1879), (1880, 1919), (1920, 1959), (1960, 2000)]
    x, v, lo, hi = [], [], [], []
    for a, b in bins:
        s = sorted(fl(r["ritardo_25"]) for r in rr if a <= int(fl(r["anno_invenzione"])) <= b)
        if not s:
            continue
        med = s[len(s) // 2] if len(s) % 2 else (s[len(s) // 2 - 1] + s[len(s) // 2]) / 2
        x.append("%d-%d (%d invenzioni)" % (a, b, len(s))); v.append(round(med, 1)); lo.append(min(s)); hi.append(max(s))
    return INTERVALLI(x, v, lo, hi, "ritardo tipico in anni")


@regola("tecnologia-ritardo", 2)
def _(g):
    rr = [r for r in righe("risultati/h42_ritardi.csv", gruppo="principale") if fl(r["ritardo_25"]) is not None]
    rr.sort(key=lambda r: -fl(r["ritardo_25"]))
    return BARRE(["%s (%d)" % (r["nome"], fl(r["anno_invenzione"])) for r in rr], [int(fl(r["ritardo_25"])) for r in rr], "anni di ritardo")


@regola("vaccini", 1)
def _(g):
    NOMI = {"1888": "legge sanitaria 1888", "1939": "antidifterica 1939", "1966": "antipolio 1966", "1991": "epatite B 1991", "2017": "decreto Lorenzin 2017", "2021": "Covid 2021"}
    rr = tabella("risultati/h41_vaccini_ondate.csv")
    rr.sort(key=lambda r: int(r["anno"]))
    return COLONNE([NOMI[r["anno"]] for r in rr], [r_(r["rapporto"], 2) for r in rr], "volte il livello di prima")


@regola("vaccini", 3)
def _(g):
    rr = righe("risultati/h41_vaccini_tono.csv", gruppo="tutti", periodo={"1948-1989", "1990-2012", "2013-2019", "2020-2022"})
    rr.sort(key=lambda r: ini_periodo(r["periodo"]))
    return INTERVALLI([r["periodo"] for r in rr], [r_(r["tono"], 2) for r in rr], [r_(r["lo"], 2) for r in rr], [r_(r["hi"], 2) for r in rr], "tono sui vaccini")


@regola("cina-tre-stagioni", 1)
def _(g):
    rr = tabella("risultati/h69_h76/h73_temi_anno.csv")
    out = []
    for c, n, anno in (("ideologia_per10k", "Ideologia", 1965), ("commercio_per10k", "Commercio", 2005), ("sicurezza_per10k", "Sicurezza", 2020)):
        pts = serie_anni(rr, "anno", c, 1, 2)
        out.append((n, pts))
    return LINEE(out)


@regola("cina-tre-stagioni", 2)
def _(g):
    rr = {r["periodo"]: r for r in tabella("risultati/h69_h76/h73_temi_periodi.csv")}
    rows = [[p, pc(rr[p]["quota3_ideologia"], 0), pc(rr[p]["quota3_commercio"], 0), pc(rr[p]["quota3_sicurezza"], 0)] for p in ("a 1949-70", "b 1980-2018", "c 2019-22")]
    return TABELLA(["Periodo", "Ideologia (%)", "Commercio (%)", "Sicurezza (%)"], rows, "Quota dei passaggi sulla Cina in cui il tema e' tra i primi tre.")


@regola("salto-1994-non-ce", 1)
def _(g):
    rr = righe("risultati/h2_legislature_differenze.csv", misura="frase_media")
    ANNO = {("10", "11"): 1992, ("11", "12"): 1994, ("12", "13"): 1996}
    x, v, lo, hi = [], [], [], []
    for ramo in ("camera", "senato"):
        for r in sorted((r for r in rr if r["ramo"] == ramo), key=lambda r: int(fl(r["da"]))):
            da, a = str(int(fl(r["da"]))), str(int(fl(r["a"])))
            x.append("%s: %s → %s (%d)" % (ramo.capitalize(), leg_rom(da), leg_rom(a), ANNO[(da, a)]))
            v.append(r_(r["differenza"], 2)); lo.append(r_(r["ic95_basso"], 2)); hi.append(r_(r["ic95_alto"], 2))
    return INTERVALLI(x, v, lo, hi, "variazione delle parole per frase")


@regola("stesso-discorso-due-volte", 1)
def _(g):
    rr = [r for r in righe("risultati/h66/432_gemelle.csv", gemelle="True") if r["epoca"] != "Regno"]
    cont = {}
    for r in rr:
        cont[int(r["dec"])] = cont.get(int(r["dec"]), 0) + 1
    dec = sorted(cont)
    return COLONNE(["%d-%02d" % (d, (d + 9) % 100) for d in dec], [cont[d] for d in dec], "discorsi gemelli")


@regola("stesso-discorso-due-volte", 2)
def _(g):
    rr = tabella("risultati/grafici/h66/h66_date_dati.csv")
    RAMO = {"C": "Camera", "S": "Senato", "C+S": "Camera e Senato"}
    rows = []
    for r in rr:
        if r["coperta"] == "True" and r["indice_B"]:
            oss = "%s (da %s a %s)" % (it(fl(r["indice_B"]), 1), it(fl(r["indice_B_lo"]), 1), it(fl(r["indice_B_hi"]), 1))
        else:
            oss = "non misurabile"
        rows.append([mesi_it(r["data"]), RAMO[r["ramo"]], oss, r_(r["atteso"], 1) if r["atteso"] else "-"])
    return TABELLA(["Data", "Ramo", "Cambio del testo (margine)", "Atteso dai testi interi"], rows, "Indice di lingua parlata: piu' alto = piu' «parlato».")


@regola("stesso-discorso-due-volte", 3)
def _(g):
    rr = [r for r in tabella("risultati/h66/434_termometro.csv") if (fl(r["persone"]) or 0) >= 3]
    rows = [["%s (%s)" % (leg_rom(r["leg"]), leg_anni(r["leg"])), int(fl(r["persone"])), r_(r["diff_termometro"], 2), r_(r["diff_gemelle"], 2)] for r in rr]
    return TABELLA(["Legislatura", "Persone", "Scarto dei ministri", "Scarto sui testi gemelli"], rows, "Scarto dell'indice di lingua parlata tra Camera e Senato per lo stesso ministro e per gli stessi testi.")


def _tecnici(misura):
    rr = [r for r in righe("risultati/h24_tecnici.csv", misura=misura) if r["tecnico"] != "media dei 4"]
    return TABELLA(["Premier tecnico", "Il tecnico", "I politici"], [[r["tecnico"], r_(r["tecnico_valore"], 2), r_(r["politici_valore"], 2)] for r in rr])


@regola("tecnici-parlano-diverso", 1)
def _(g):
    return _tecnici("inglese_per_1000")


@regola("tecnici-parlano-diverso", 2)
def _(g):
    return _tecnici("numeri_per_1000")


@regola("tecnici-parlano-diverso", 3)
def _(g):
    return _tecnici("lettere_per_parola")


@regola("agenda-a-scatti", 1)
def _(g):
    rr = [r for r in righe("risultati/h37_quote_K40.csv", ramo="senato", tema="28")]
    pts = [(int(r["anno"]), pc(r["quota"], 1) if r["ammesso"] == "True" else None) for r in rr]
    return LINEE([("Credito e banche (% delle parole del Senato)", sorted(pts))])


@regola("agenda-a-scatti", 2)
def _(g):
    veri = {r["epoca"]: r for r in righe("risultati/h37_lcurtosi.csv", config="K40_principale", ramo="insieme")}
    plac = {r["epoca"]: r for r in righe("risultati/h37_controlli.csv", config="K40_placebo_turni_rimescolati", ramo="insieme")}
    NOMI = {"regno": "Regno", "fascismo": "Fascismo", "prima": "Prima Repubblica", "seconda": "Seconda Repubblica"}
    rows = []
    for e in ("regno", "fascismo", "prima", "seconda"):
        a, b = veri[e], plac[e]
        rows.append([NOMI[e], "%s (da %s a %s)" % (it(fl(a["tau4"]), 3), it(fl(a["lo95"]), 3), it(fl(a["hi95"]), 3)),
                     "%s (da %s a %s)" % (it(fl(b["media"]), 3), it(fl(b["p2_5"]), 3), it(fl(b["p97_5"]), 3))])
    return TABELLA(["Epoca", "Indice degli strappi (margine)", "Con i turni rimescolati (margine)"], rows,
                   "Piu' alto = piu' strappi nei temi trattati. Camera e Senato insieme.")


@regola("europa-entra-piano", 2)
def _(g):
    rr = righe("risultati/h38_gradini.csv", serie="lista fissata", ramo="tutti", tipo="data fissata")
    rr.sort(key=lambda r: int(r["anno"]))
    return INTERVALLI(["%s (%s)" % (r["evento"].capitalize(), r["anno"]) for r in rr], [r_(r["diff"], 2) for r in rr], [r_(r["ic_basso"], 2) for r in rr],
                      [r_(r["ic_alto"], 2) for r in rr], "salto in menzioni ogni 10.000 parole")


@regola("formule-fisse", 2)
def _(g):
    rr = righe("risultati/h34_formule_per_decennio.csv", ramo="camera")
    rows = []
    for d in sorted({int(r["decennio"]) for r in rr}):
        top = max((r for r in rr if int(r["decennio"]) == d), key=lambda r: fl(r["n"]))
        rows.append(["%d-%02d" % (d, (d + 9) % 100), top["formula"], int(fl(top["n"]))])
    rows = rows[-12:]
    return TABELLA(["Decennio", "Formula piu' ripetuta alla Camera", "Volte"], rows)


@regola("parole-che-cambiano-senso", 2)
def _(g):
    noti = righe("risultati/h35_casi_noti_A7.csv", config="A7")
    top = righe("risultati/h35_top30_A7.csv", config="A7", parola="movimento")
    voluti = [("ambiente", 1960), ("rete", 1990), ("razza", 1920), ("virus", 2000)]
    rows = []

    def periodo(da, a):
        da, a = int(fl(da)), int(fl(a))
        return "%d-%02d → %d-%02d" % (da, (da + 9) % 100, a, (a + 9 if a < 2010 else 22) % 100)

    def corto(s):
        return " ".join(s.split()[:6])
    for p, da in voluti:
        r = next((x for x in noti if x["parola"] == p and int(fl(x["da"])) == da), None)
        if r:
            rows.append([p, periodo(r["da"], r["a"]), corto(r["vicini_prima"]), corto(r["vicini_dopo"])])
    m = next((x for x in top if int(fl(x["da"])) == 2000), None)
    if m:
        rows.append(["movimento", periodo(m["da"], m["a"]), corto(m["vicini_prima"]), corto(m["vicini_dopo"])])
    return TABELLA(["Parola", "Passaggio", "Parole vicine prima", "Parole vicine dopo"], rows, "Le parole che stanno accanto alla parola cambiano tra un decennio e l'altro.")


@regola("populisti-frasi-piu-corte", 1)
def _(g):
    rr = righe("risultati/h6_per_legislatura.csv", esito="parole_per_frase")
    rr.sort(key=lambda r: int(fl(r["leg"])))
    return INTERVALLI(["%s (%s)" % (leg_rom(int(fl(r["leg"]))), leg_anni(int(fl(r["leg"])))) for r in rr], [r_(r["differenza"], 2) for r in rr], nome="parole per frase dei populisti meno quelle degli altri")


@regola("populisti-frasi-piu-corte", 2)
def _(g):
    NOMI = {"parole_per_frase": "Parole per frase", "lettere_per_parola": "Lettere per parola", "quota_vocabolario_base": "Vocabolario di base",
            "subordinanti_per_1000": "Subordinate", "domande_per_1000": "Domande", "emozioni_per_1000": "Parole di emozione"}
    rr = righe("risultati/h6_modello.csv", fase="tutte (XI-XVIII)", elenco="PopuList (con borderline)", modello="legislatura+ruolo")
    rows = [[NOMI[r["esito"]], r_(r["differenza_percento"], 1), r_(r["p"], 3)] for r in rr]
    rows.sort(key=lambda r: r[1])
    return TABELLA(["Misura", "Populisti rispetto agli altri (%)", "Valore p"], rows, "Differenza in percentuale, a parita' di legislatura e di ruolo.")


@regola("premier-come-l-aula", 1)
def _(g):
    rr = {r["misura"]: r for r in tabella("risultati/h23_prima_dopo.csv")}
    rows = []
    for m, n in (("parole_per_frase", "Parole per frase"), ("quota_vdb", "Vocabolario di base (punti percentuali)")):
        r = rr[m]
        rows.append([n, "%s (da %s a %s)" % (it(fl(r["differenza"]), 1), it(fl(r["ic_basso"]), 1), it(fl(r["ic_alto"]), 1)),
                     r_(r["differenza_aula_parlamentari"], 1) if r["differenza_aula_parlamentari"] else "-"])
    return TABELLA(["Misura", "Presidenti del Consiglio dopo il 1994 (margine)", "Parlamentari semplici"], rows, "Cambio dopo il 1994 rispetto a prima.")


@regola("premier-come-l-aula", 2)
def _(g):
    rr = tabella("risultati/h23_premier_epoche.csv")
    cand_ = []
    for col in ("parole_per_frase", "parole_per_frase_dig"):
        sel = [r for r in rr if fl(r[col]) is not None]
        sel.sort(key=lambda r: -fl(r[col]))
        cand_.append(BARRE(["%s (%s)" % (r["nome"], r["prima_data"][:4] + "-" + r["ultima_data"][:4]) for r in sel], [r_(r[col], 1) for r in sel], "parole per frase"))
    return cand_


@regola("fascismo-voci-non-uguali", 1)
def _(g):
    rr = [r for r in righe("risultati/h18d_somiglianza.csv", ramo="camera") if fl(r["inizio"]) >= 1913]
    rr.sort(key=lambda r: fl(r["inizio"]))
    return INTERVALLI(["%s (%d-%d)" % (r["legislatura"], fl(r["inizio"]), fl(r["fine"])) for r in rr], [r_(r["coseno"], 3) for r in rr],
                      [r_(r["coseno_lo"], 3) for r in rr], [r_(r["coseno_hi"], 3) for r in rr], "somiglianza tra oratori")


@regola("fascismo-voci-non-uguali", 2)
def _(g):
    rr = tabella("risultati/h18_periodi.csv")
    d = {(r["ramo"], r["periodo"]): r for r in rr}
    per = [r["periodo"] for r in rr if r["ramo"] == "camera"]
    rows = []
    for p in per:
        a, b = d.get(("camera", p)), d.get(("senato", p))
        rows.append([p, r_(a["dissenso_100"], 1) if a and a["dissenso_100"] else "-", r_(b["dissenso_100"], 1) if b and b["dissenso_100"] else "-"])
    return TABELLA(["Periodo", "Camera", "Senato"], rows, "Segni di dissenso annotati ogni cento interventi.")


# ---------------------------------------------------------------- altri grafici con serie dai nomi grezzi o pannelli mancanti

@regola("parole-piu-lunghe", 3)
def _(g):
    rr = righe("risultati/riparazione_c3/403_serie.csv", ramo="camera", misura="lettere_parola")
    out = []
    for ver, nome in (("orig", "Resoconto originale"), ("a", "Senza i gradini, versione a"), ("b", "Senza i gradini, versione b"), ("c", "Senza i gradini, versione c")):
        out.append((nome, serie_anni([r for r in rr if r["versione"] == ver], "anno", "valore", 1, 3)))
    return cand(g, LINEE(out, y0=5.1), LINEE([(n, media3(p)) for n, p in out], y0=5.1))


@regola("salto-1994-non-ce", 3)
def _(g):
    rr = righe("risultati/h2_rottura_anni.csv", misura="frase_media_pesata")
    return LINEE([(ramo.capitalize(), sorted((int(fl(r["anno_Y"])), r_(r["salto_c"], 2)) for r in rr if r["ramo"] == ramo)) for ramo in ("camera", "senato")])


@regola("europa-entra-piano", 1)
def _(g):
    rr = righe("risultati/h38_serie_annuale.csv", ramo="tutti")
    out = [("Menzioni dell'Europa", serie_anni(rr, "anno", "tasso", 1, 2)), ("Senza la parola «euro»", serie_anni(rr, "anno", "tasso_senza_euro", 1, 2))]
    return cand(g, LINEE(out), LINEE([(n, media3(p)) for n, p in out]))


@regola("metafore-di-guerra", 1)
def _(g):
    rr = [r for r in righe("risultati/h58_serie_anno.csv", ramo="tutti") if r["anno"] != "0" and int(r["anno"]) >= 1948]
    out = [("Metafore di guerra", serie_anni(rr, "anno", "fig_tot", 1, 2)), ("Dopo la rilettura", serie_anni(rr, "anno", "fig_corr", 1, 2))]
    return cand(g, LINEE(out), LINEE([(n, media3(p)) for n, p in out]))


@regola("politica-dei-numeri", 1)
def _(g):
    rr = righe("risultati/h21_serie.csv", ramo="tutti")
    ok = {int(r["anno"]) for r in rr if (fl(r["n_parole"]) or 0) >= 300000}
    out = []
    for c, n in (("numeri_economici_per_1000", "Numeri dell'economia"), ("rif_legge_per_1000", "Rimandi a leggi e articoli")):
        out.append((n, [(x, y) for x, y in serie_anni(rr, "anno", c, 1, 2) if x in ok]))
    return cand(g, LINEE(out), LINEE([(n, media3(p)) for n, p in out]))


# ---------------------------------------------------------------- seconda tornata: grafici con etichette di filtro, serie in piu' o nomi grezzi

@regola("fascismo-fine-del-dissenso", 2)
def _(g):
    rr = righe("risultati/h18_periodi.csv", ramo="camera", periodo={"liberale 1913-1921", "regime 1927-1938"})
    d = {r["periodo"]: r for r in rr}
    a, b = d["liberale 1913-1921"], d["regime 1927-1938"]
    NOMI = [("proteste_100", "Proteste e rumori"), ("commenti_100", "Commenti"), ("interruzioni_100", "Interruzioni"),
            ("ilarita_100", "Risate"), ("applausi_100", "Applausi e acclamazioni")]
    rows = [[n, it(fl(a[c]), 1), it(fl(b[c]), 1)] for c, n in NOMI]  # testo: cosi' 11,0 resta 11,0
    return TABELLA(["Che cosa annota il resoconto", "Periodo liberale, 1913-1921", "Regime, 1927-1938"], rows, "Annotazioni ogni cento interventi, Camera.")


@regola("fine-delle-ideologie", 2)
def _(g):
    rr = righe("risultati/h29_voci.csv", lista="classe", periodo={"1948-1969", "2008-2022"})
    d = {}
    for r in rr:
        d.setdefault(r["voce"], {})[r["periodo"]] = fl(r["per_milione"])
    voci = sorted((v for v in d if len(d[v]) == 2), key=lambda v: -d[v]["1948-1969"])[:12]
    rows = [[v.replace("_", " "), round(d[v]["1948-1969"], 2), round(d[v]["2008-2022"], 2)] for v in voci]
    return TABELLA(["Parola", "1948-1969 (volte per milione)", "2008-2022 (volte per milione)"], rows,
                   "Le %d parole del lessico di classe con piu' volte nel 1948-1969 (su %d)." % (len(voci), len(d)))


@regola("compromesso-storico-pci-verso-dc", 2)
def _(g):
    rr = righe("risultati/h56_spostamenti.csv", gruppo="base")
    VOC = {"tutte": "5.000 parole", "sa": "senza parole d'argomento"}
    RIF = {"resto": "confronto con il resto", "tutta": "confronto con tutta la Camera", "assoluta": "confronto assoluto"}
    rows = [["%s, %s" % (VOC[r["vocabolario"]], RIF[r["riferimento"]]), r_(r["spost_pci_verso_dc"], 2), r_(r["spost_dc_verso_pci"], 2)] for r in rr]
    rows.sort(key=lambda r: -r[1])
    return TABELLA(["Versione della misura", "Spostamento del PCI verso la DC", "Spostamento della DC verso il PCI"], rows,
                   "Spostamento della lingua del partito tra il periodo di riferimento e il 1976-79, nelle sei versioni della misura.")


@regola("urss-usa-pci-dc", 2)
def _(g):
    rr = righe("risultati/h39_prev_d_partiti.csv", periodo="1948-1968", paese={"Russia/URSS", "Stati Uniti"}, partito={"PCI", "DC"})
    d = {(r["paese"], r["partito"]): r for r in rr}
    rows = []
    for paese in ("Russia/URSS", "Stati Uniti"):
        for p in ("PCI", "DC"):
            r = d[(paese, p)]
            rows.append([paese, p, r_(r["indice"], 2), "da %s a %s" % (it(fl(r["lo"]), 2), it(fl(r["hi"]), 2))])
    return TABELLA(["Paese", "Partito", "Indice di ostilita' (con le parole)", "Margine"], rows, "Da −1 (amico) a +1 (nemico), Camera, 1948-1968.")


@regola("fascismo-lessico-del-regime", 2)
def _(g):
    rr = righe("risultati/h18c_stesse_persone.csv", ramo="camera", a="regno_28")
    d = {r["lista"]: r for r in rr}
    n = int(fl(d["regime"]["persone"]))
    NOMI = [("regime", "Parole del regime (17)"), ("specifiche", "Parole del regime senza le generiche"), ("liberale", "Parole liberali")]
    rows = []
    for k, nome in NOMI:
        r = d[k]
        rows.append([nome, int(round(fl(r["pm_prima"]))), int(round(fl(r["pm_dopo"]))),
                     "%s (da %s a %s)" % (it(fl(r["differenza_media"]), 0), it(fl(r["lo"]), 0), it(fl(r["hi"]), 0))])
    return TABELLA(["Lista", "Prima (per milione)", "Dopo (per milione)", "Differenza (margine)"], rows,
                   "Gli stessi %d deputati nella XXVI legislatura e nella XXVIII, Camera." % n)


@regola("chi-fa-ridere", 2)
def _(g):
    rr = sorted(tabella("risultati/h20_oratori.csv"), key=lambda r: -(fl(r["ila_indice_ic_basso"]) or -1e9))[:10]
    x = [corto("%s (%d-%d)" % (r["nome"], fl(r["anno_min"]), fl(r["anno_max"]))) for r in rr]
    return INTERVALLI(x, [r_(r["ila_osservata_su_attesa"], 1) for r in rr], [r_(r["ila_indice_ic_basso"], 1) for r in rr],
                      [r_(r["ila_indice_ic_alto"], 1) for r in rr], "volte le risate attese")


@regola("emozioni-non-crescono", 2)
def _(g):
    voci = ["preoccupazione", "speranza", "preoccupazioni", "paura", "speranze", "dolore", "timore", "vergogna", "orgoglio", "odio"]
    rr = righe("risultati/h31_voci.csv", periodo={"1946-1969", "2008-2022"}, voce=voci)
    d = {}
    for r in rr:
        d.setdefault(r["voce"], {})[r["periodo"]] = fl(r["per_milione"])
    ok = sorted((v for v in d if len(d[v]) == 2), key=lambda v: -d[v]["2008-2022"])
    rows = [[v, round(d[v]["1946-1969"], 1), round(d[v]["2008-2022"], 1)] for v in ok]
    return TABELLA(["Parola", "1946-1969 (volte per milione)", "2008-2022 (volte per milione)"], rows)


@regola("corruzione-salto-1980", 1)
def _(g):
    a, b = anni_blocco(g, (1970, 1994))
    rr = righe("risultati/riparazione_pesi/413_versioni.csv", serie="corruzione", ramo="tutti")
    return LINEE([("Conteggio semplice", entro(serie_anni(rr, "anno", "grezza", 1, 2), a, b)),
                  ("Pesando ogni partito per i suoi seggi", entro(serie_anni(rr, "anno", "pesata_seggi", 1, 2), a, b))])


@regola("corruzione-salto-1980", 2)
def _(g):
    a, b = anni_blocco(g, (1976, 1993))
    rr = righe("risultati/h55_c_partiti_anno.csv", variante="principale: parlamentari")
    serie = []
    for col, nome in (("Radicali", "Radicali"), ("MSI-AN", "MSI-AN"), ("DC", "DC"), ("PCI-PDS", "PCI-PDS")):
        serie.append((nome, entro(serie_anni([r for r in rr if r["partito"] == col], "anno", "rapporto", 1, 2), a, b)))
    d = LINEE(serie)
    d["riferimento"] = {"y": 1}  # riga tratteggiata a 1: il sottotitolo dice che 1 = la quota di parole del partito
    return d


@regola("corruzione-salto-1980", 3)
def _(g):
    rr = [r for r in tabella("risultati/h55_c_gruppi.csv") if int(r["anno"]) != 1994]
    return LINEE([("Governo", serie_anni(rr, "anno", "governo", 1, 2)), ("Parlamentari fuori dal governo", serie_anni(rr, "anno", "fuori_governo", 1, 2)),
                  ("Partiti fuori dal sistema", serie_anni(rr, "anno", "fuori_sistema", 1, 2))])


@regola("pci-1984-scala-mobile", 3)
def _(g):
    rr = sorted(tabella("risultati/riparazione_pesi/416_pci_1984_giorni.csv"), key=lambda r: -fl(r["parole"]))[:12]
    def giorno(iso):
        a, m, d = iso.split("-")
        return "%d %s %s" % (int(d), MESI[int(m) - 1], a)
    return BARRE(["%s (%s%% del giorno)" % (giorno(r["data"]), it(fl(r["quota_del_giorno"]) * 100, 0)) for r in rr], [int(fl(r["parole"])) for r in rr],
                 "parole dei deputati comunisti in una seduta")


@regola("pci-e-nato", 2)
def _(g):
    rr = sorted(tabella("risultati/h68_h75_h77/h75_giudice_periodi_fini.csv"), key=lambda r: int(fl(r["da"])))
    x = ["%d-%02d%s" % (int(fl(r["da"])), int(fl(r["a"])) % 100, "*" if fl(r["validi"]) < 30 else "") for r in rr]
    return COLONNE(x, [pc(r["quota_contro"], 0) for r in rr], "passaggi del PCI contrari alla NATO (%); * = meno di 30 passaggi validi")


@regola("potere-cambia-la-lingua", 1)
def _(g):
    rr = [r for r in tabella("risultati/h33_misure.csv") if r["misura"] == "q" and r["confronto"] == "G-O"]
    SOT = [("tutte le legislature", "Tutte le legislature"), ("digitale (XIII-XVIII)", "1996-2022"), ("scansione (I-XII)", "1948-96")]
    rows = []
    for s, nome in SOT:
        for pref, spiega in (("a:", "stessa persona"), ("a1:", "stessa persona, stessa legislatura")):
            r = next((x for x in rr if x["sottoinsieme"] == s and x["variante"].startswith(pref)), None)
            if r:
                rows.append(["%s, %s" % (nome, spiega), r_(r["media_O"], 2), r_(r["media_G"], 2),
                             "%s (da %s a %s)" % (it(fl(r["diff"]), 2), it(fl(r["lo"]), 2), it(fl(r["hi"]), 2))])
    return TABELLA(["Gruppo", "All'opposizione", "Al governo", "Differenza (margine)"], rows, "Domande ogni 1.000 parole degli stessi deputati.")


@regola("potere-cambia-la-lingua", 2)
def _(g):
    rr = righe("risultati/h33_passaggi_8.csv", prima={"G", "O"}, dopo={"G", "O"})
    nome = {"G": "governo", "O": "opposizione"}
    meno = sum(1 for r in rr if fl(r["q"]) < 0)
    rr.sort(key=lambda r: fl(r["q"]))
    return BARRE(["%s, %s, %s → %s" % (r["partito"], r["data_passaggio"][:4], nome[r["prima"]], nome[r["dopo"]]) for r in rr],
                 [round(-fl(r["q"]), 2) for r in rr], "domande in meno al governo ogni 1.000 parole"), [meno, len(rr)]


@regola("semplificazione-ottocento", 3)
def _(g):
    rr = [r for r in righe("risultati/rumore_per_decennio.csv", ramo="camera") if 1840 <= int(r["decennio"]) <= 1930]
    return LINEE([("Terzo di interventi con meno errori dello scanner", serie_anni(rr, "decennio", "frase_media_basso_rumore", 1, 2)),
                  ("Tutti gli interventi", serie_anni(rr, "decennio", "frase_media_tutti", 1, 2))])


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main_regole()
