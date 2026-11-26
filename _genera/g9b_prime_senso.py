r"""g9b - Prime volte nel senso di oggi: controllo delle date di prima comparsa delle parole mostrate come «nuove».

PERCHE'
  g9_prime_volte.py fissa la prima volta con una regola automatica (primo anno con almeno 3 volte in 3 anni, poi le prime 3
  comparse da quell'anno). Per molte parole quella prima comparsa e' un altro significato (Euro il vento, la «banda larga»
  del cambio) o un errore di lettura del testo stampato (un pezzo di cognome). Qui si cerca la prima volta nel senso di oggi.

FONTE E METODO (sola lettura in D:\vocabolario-parlamento)
  - Elenco delle parole da controllare (senza doppioni): le parole e le espressioni di js/primevolte.js (PAROLE, ESPR),
    le parole di dati/prime/scelte.json, quelle di dati/home.json («nate») e quelle di dati/parole/indice.json con la curva
    che parte dal 1990 o dopo.
  - Comparse: i turni di base_pulita/turni, con gli stessi filtri di g9 (lingua it, non esclusi, non riassunti, senza
    Presidente, segretari e voci collettive); oratore come scritto nel resoconto, persona e partito da
    misure/persone/turni_*.parquet. Parole cercate come parola intera nel testo senza accenti; espressioni con spazio o
    trattino tra le parole (come g9).
  - Non si estrae tutto: per ogni parola, anno e archivio le prime 5 comparse (i turni sono in ordine di data), e in piu'
    fino a 15 comparse il cui contesto (300 caratteri per parte) contiene una parola-spia del senso di oggi (es. «telefon»
    per «cellulare», «moneta» per «euro»). Le spie servono solo a non perdere le comparse utili negli anni in cui la parola
    e' gia' frequente in un altro senso: la scelta finale si fa leggendo le frasi.
  - La frase mostrata e' la stessa di g9 (funzione schegge: al massimo 70 caratteri per parte, dentro la frase) con lo
    stesso filtro di qualita' (frase_pulita di comune.py). Una comparsa si puo' scegliere solo se la sua frase supera il filtro.
  - La lettura dei contesti, in ordine di data, e' stata fatta da un programma che legge le frasi; le scelte sono scritte
    sotto in DECISIONI (riferimento alla comparsa: data, ramo, file del resoconto, numero del turno), cosi' ogni data e
    ogni frase si ritrova nei turni. Stati: «confermata» (la prima comparsa della regola e' gia' nel senso di oggi),
    «corretta» (nuova data), «incerta» (la prima nel senso di oggi non si trova con certezza: nessuna data),
    «non nuova» (la parola esiste ben prima e cresce dopo: si da' la prima comparsa vera).
USCITA  _genera/prime_senso.json (letto dal generatore del sito) e _progetto/PRIME_VOLTE_SENSO.md (tabella);
        intermedi in _genera/cache/prime_senso/ (comparse per archivio, unione, schede da leggere).
USO     python -I _genera/g9b_prime_senso.py            estrae le comparse (3 processi; riprende da dove si era fermato)
        python -I _genera/g9b_prime_senso.py leggi      scrive le schede da leggere in cache/prime_senso/leggi/
        python -I _genera/g9b_prime_senso.py finale     scrive prime_senso.json e la tabella dalle DECISIONI
"""
import glob
import gzip
import json
import os
import pickle
import re
import sys
import time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa
from g9_prime_volte import schegge, senza_accenti  # stessa frase breve e stessa normalizzazione di g9

DIR = os.path.join(CACHE, "prime_senso")
PROCESSI = 3
K = 5        # comparse per parola, anno e archivio
KH = 15      # comparse in piu' con una parola-spia nel contesto
LARGO = 300  # caratteri di contesto per parte (spie e lettura)

# parole-spia del senso di oggi (cercate nel contesto senza accenti); solo per non perdere comparse, non per scegliere
SPIE = {
    "euro": r"monet|valut|\blir[ae]\b|maastricht|\becu\b|banca centrale|miliard|milion|\bmila\b|cambio|uem\b",
    "cellulare": r"telefon|apparecch|radiomobil|\bgsm\b|\btacs\b|squill|chiamat|\bsms\b|portatil",
    "telefonino": r"telefon|cellular|squill|chiamat",
    "satellite": r"artificial|orbit|spazial|lanci|telecomunicaz|televis|segnal|sputnik|antenn|razz|missil",
    "radio": r"radiofon|trasmission|trasmett|ascolt|onde|stazion|apparecch|radiodiffus|microfon|annunc|giornale radio",
    "web": r"internet|\bsito\b|\bsiti\b|pagin|telematic|online|\brete\b",
    "elaboratore": r"elettronic|\bdati\b|calcol|informatic|centro|meccanograf",
    "informatica": r"\bdati\b|elaborat|computer|calcol|elettronic",
    "computer": r"elettronic|\bdati\b|calcol|informatic|elaborat",
    "algoritmo": r"computer|informatic|software|programm|\bdati\b|digital|piattaform|social|intelligenza|macchin",
    "spread": r"\bbtp\b|\bbund\b|titoli|differenzial|tedesc|rendiment|punti base|mercat|germani",
    "casta": r"politic|privileg|parlamentar|vitalizi|costi della|antipolitic",
    "inquinamento": r"acqu|aria\b|ambient|atmosfer|fium|\bmare\b|scaric|industri|smog|fumi|ecolog|suolo|rifiut",
    "carta di credito": r"banc|\bvisa\b|plastic|pagament|elettronic|negozi|tessera|magnetic|bancomat|american express",
    "mani pulite": r"inchiesta|magistrat|milano|procur|\bpool\b|tangent|di pietro|operazione",
    "cambiamenti climatici": r"riscaldament|global|emission|serra|kyoto|pianeta|\bco2\b|anidride|carbonic",
    "globalizzazione": r"mercat|economi|mondial|commerc|planetar|finanz|multinazional",
    "camerati": r"fascis|squadr|camici|\bmsi\b|duce|regime|missin|destra",
    "autarchia": r"economic|materie prime|import|produzion|sanzion|autosufficien|consum|valut",
    "compact": r"fiscal|global|migra|patto|bilanci",
    "kyoto": r"protocoll|emission|serra|clima|anidride|\bco2\b",
    "superbonus": r"110|edili|ristrutturaz|energetic|cappott|sisma|cessione",
    "palliative": r"cure palliative|terapi|malat|dolore|hospice|terminal",
    "resilienza": r"ripresa|pnrr|piano nazionale|recovery|territor|economi|comunit",
    "coronavirus": r"covid|pandemi|wuhan|cina|contagi|lockdown|quarant",
    "jobs": r"\bact\b|lavoro|renzi|riforma",
    "smart": r"working|lavoro|city|card|agile",
    "frigorifero": r"elettrodomest|cas[ae]\b|famigl|domestic|televisor|lavatric",
    "automobile": r"strad|vettur|benzin|motor|velocit|circolaz|patent|garage",
    "trasparenza": r"amministraz|pubblic|\batti\b|procediment|appalt|bilanc|gestion|accesso",
    "ecologia": r"ambient|inquinament|natura|ecologic|tutela",
    "lockdown": r"covid|pandemi|contagi|virus|chiusur|quarant",
    "facebook": r"social|internet|\brete\b|post\b|profil",
    "twitter": r"social|internet|\brete\b|tweet|cinguett|messaggi",
    "google": r"internet|\brete\b|motore di ricerca|ricerca|web",
    "economy": r"new economy|green economy|sharing|circular|digital",
    "hub": r"aeroport|malpensa|fiumicino|logistic|smistament|energetic|\bgas\b|porto",
    "telecom": r"telefon|telecomunicaz|privatizz|stet|sip\b",
}


# ----------------------------------------------------------------------------- elenco
def norma(s):
    return " ".join(re.findall(r"[a-z]+", senza_accenti(s)))


def elenco():
    """Parole (una parola) ed espressioni (piu' parole) da controllare, senza doppioni; con l'origine di ciascuna."""
    js = open(os.path.join(SITO, "js", "primevolte.js"), encoding="utf-8").read()
    origine = defaultdict(list)

    def prendi(nome):
        m = re.search(r"const %s = \[(.*?)\];" % nome, js, re.S)
        return re.findall(r'"([^"]+)"', m.group(1))

    for w in prendi("PAROLE"):
        origine[norma(w)].append("primevolte")
    for w in prendi("ESPR"):
        origine[norma(w)].append("primevolte")
    for w in json.load(open(os.path.join(DATI, "prime", "scelte.json"), encoding="utf-8")):
        origine[norma(w)].append("scelte")
    for r in json.load(open(os.path.join(DATI, "home.json"), encoding="utf-8"))["nate"]:
        origine[norma(r[0])].append("home")
    for r in json.load(open(os.path.join(DATI, "parole", "indice.json"), encoding="utf-8"))["p"]:
        if r[4] >= 1990:
            origine[norma(r[0])].append("indice")
    return {k: sorted(set(v)) for k, v in origine.items()}


def vecchie():
    """La scheda attuale di dati/prime (regola di g9) per ogni voce dell'elenco."""
    espr = json.load(open(os.path.join(DATI, "prime", "espressioni.json"), encoding="utf-8"))
    out = {}
    for k in elenco():
        if " " in k:
            out[k] = espr.get(k)
            continue
        out[k] = leggi_scheda_pezzo("prime/d", k, PEZZI_PRIME)  # pezzo scelto dalla parola (comune.py)
    return out


# ----------------------------------------------------------------------------- estrazione
def lavora(archivio):
    import pyarrow.parquet as pq
    import pyarrow.compute as pc
    dest = os.path.join(DIR, "archivi", archivio + ".pkl.gz")
    if os.path.exists(dest):
        return archivio, "gia' fatto", 0
    t0 = time.time()
    voci = list(elenco())
    parole = set(k for k in voci if " " not in k)
    espr = sorted((k for k in voci if " " in k), key=lambda x: -len(x))
    pat = lambda k: r"[\s\-]+".join(k.split())
    re_tutte = r"\b(" + "|".join([pat(k) for k in espr] + sorted(parole)) + r")\b"
    re_espr = re.compile(r"\b(" + "|".join(pat(k) for k in espr) + r")\b")
    spie = {k: re.compile(v) for k, v in SPIE.items()}
    ramo = archivio.split("_")[0]
    persone = {}
    pp = os.path.join(PERSONE, "turni_%s.parquet" % archivio)
    if os.path.exists(pp):
        tp = pq.read_table(pp, columns=["file", "n_turno", "pid", "partito"]).to_pandas()
        for fl, nt, pid, par in zip(tp.file, tp.n_turno, tp.pid, tp.partito):
            persone[(fl, int(nt))] = (pid or "", par or "")
    occ = defaultdict(list)   # voce -> [(data, file, n_turno, ramo, oratore, pid, partito, frase, forma, contesto, spia)]
    n = defaultdict(int)
    nh = defaultdict(int)
    pf = pq.ParquetFile(os.path.join(TURNI, archivio + ".parquet"))
    for rg in range(pf.num_row_groups):
        t = pf.read_row_group(rg, columns=["data", "file", "n_turno", "oratore", "ruolo", "lingua", "indiretto", "escludi_misure", "testo", "testo_misura"])
        t = t.filter(pc.fill_null(pc.match_substring_regex(t["testo_misura"], re_tutte), False))
        for r in t.to_pylist():
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
            pid, par = persone.get((r["file"], int(r["n_turno"] or 0)), ("", ""))
            orat = (r["oratore"] or "").strip()
            trovate = []
            for w in set(re.findall(r"[a-z]+", tm)) & parole:
                m = re.search(r"\b%s\b" % w, tm)
                if m:
                    trovate.append((w, m.start(), m.end()))
            visti = set()
            for m in re_espr.finditer(tm):
                k = " ".join(m.group(1).replace("-", " ").split())
                if k not in visti:
                    visti.add(k)
                    trovate.append((k, m.start(), m.end()))
            for w, a, b in trovate:
                chiave = (w, anno)
                largo = tm[max(0, a - LARGO):b + LARGO]
                spia = bool(w in spie and spie[w].search(largo))
                if n[chiave] < K:
                    n[chiave] += 1
                elif spia and nh[chiave] < KH:
                    nh[chiave] += 1
                else:
                    continue
                fr, fm = schegge(testo, a, b)
                ctx = re.sub(r"\s+", " ", testo[max(0, a - LARGO):b + LARGO]).strip()
                occ[w].append((data, r["file"], int(r["n_turno"] or 0), ramo, orat, pid, par, fr, fm, ctx, spia))
        del t
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with gzip.open(dest + ".tmp", "wb") as f:
        pickle.dump(dict(occ), f, protocol=4)
    os.replace(dest + ".tmp", dest)
    return archivio, "fatto", time.time() - t0


def unione():
    """Tutte le comparse estratte, per voce, in ordine di data e turno (un file per voce, ognuno sotto 2 MB)."""
    cart = os.path.join(DIR, "unione")
    fatto = os.path.join(cart, "_fatto")
    if os.path.exists(fatto):
        return {os.path.basename(fp)[:-7].replace("_", " "): pickle.load(gzip.open(fp, "rb"))
                for fp in glob.glob(os.path.join(cart, "*.pkl.gz"))}
    occ = defaultdict(list)
    for fp in glob.glob(os.path.join(DIR, "archivi", "*.pkl.gz")):
        for w, v in pickle.load(gzip.open(fp, "rb")).items():
            occ[w].extend(v)
    os.makedirs(cart, exist_ok=True)
    for w in occ:
        occ[w].sort(key=lambda o: (o[0], o[3], o[1], o[2]))
        p = os.path.join(cart, w.replace(" ", "_") + ".pkl.gz")
        with gzip.open(p + ".tmp", "wb") as f:
            pickle.dump(occ[w], f, protocol=4)
        os.replace(p + ".tmp", p)
        if os.path.getsize(p) > LIMITE:
            raise SystemExit("file intermedio troppo grande: " + p)
    open(fatto, "w").close()
    return dict(occ)


def estrai():
    os.makedirs(os.path.join(DIR, "archivi"), exist_ok=True)
    el = elenco()
    json.dump(el, open(os.path.join(DIR, "_elenco.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("voci da controllare:", len(el), "(parole %d, espressioni %d)" % (sum(" " not in k for k in el), sum(" " in k for k in el)), flush=True)
    archivi = [os.path.basename(p)[:-8] for p in glob.glob(os.path.join(TURNI, "*.parquet"))]
    archivi.sort(key=lambda a: -os.path.getsize(os.path.join(TURNI, a + ".parquet")))
    from concurrent.futures import ProcessPoolExecutor, as_completed
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=PROCESSI) as ex:
        fut = [ex.submit(lavora, a) for a in archivi]
        for k, f in enumerate(as_completed(fut)):
            a, esito, sec = f.result()
            print("%3d/%d %-30s %s %4.0f s (totale %4.0f s)" % (k + 1, len(archivi), a, esito, sec, time.time() - t0), flush=True)
    occ = unione()
    print("voci con comparse:", len(occ), "comparse:", sum(len(v) for v in occ.values()), flush=True)


# ----------------------------------------------------------------------------- schede da leggere
def rif(o):
    """Riferimento stabile a una comparsa: data/ramo/file/turno."""
    return "%s/%s/%s/%d" % (o[0], o[3], o[1][:-4] if o[1].endswith(".txt") else o[1], o[2])


def leggi():
    """Una scheda di testo per voce: prima la scheda attuale (regola di g9), poi le comparse in ordine di data
    (al massimo 3 per anno senza spia, piu' quelle con spia), contesto ridotto a 160 caratteri per parte."""
    occ = unione()
    old = vecchie()
    cart = os.path.join(DIR, "leggi")
    os.makedirs(cart, exist_ok=True)
    for k, orig in elenco().items():
        v = occ.get(k, [])
        s = old.get(k) or {}
        righe = ["# %s  (%s)  volte %s" % (k, ",".join(orig), s.get("t")),
                 "# regola g9: p0 %s ; isolata %s" % ((s.get("p") or [[None]])[0][0], (s.get("g") or [None])[0])]
        per_anno = defaultdict(int)
        for o in v:
            anno = o[0][:4]
            if not o[10]:
                per_anno[anno] += 1
                if per_anno[anno] > 3:
                    continue
            a = o[9].lower().find(o[8].lower()) if o[8] else -1
            ctx = o[9]
            if a >= 0:
                ctx = ctx[max(0, a - 160):a + len(o[8]) + 160]
            segni = ("S" if o[10] else "-") + ("q" if frase_pulita(o[7]) else "X")
            righe.append("%s %s | %s" % (rif(o), segni, ctx))
        with open(os.path.join(cart, k.replace(" ", "_") + ".txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(righe) + "\n")
    print("schede scritte in", cart, flush=True)


# ----------------------------------------------------------------------------- decisioni e uscita
# voce: (stato, riferimento della prima comparsa nel senso di oggi o None, (riferimento, senso antico) o None, motivo)
# riferimenti nel formato data/ramo/file/turno (vedi rif); per «confermata» la comparsa resta quella della regola.
OK = "la prima comparsa della regola è già nel senso di oggi"


def C(motivo=OK, antico=None):
    return ("confermata", None, antico, motivo)


def NN(rif_vera, motivo, antico=None):
    return ("non nuova", rif_vera, antico, motivo)


DECISIONI = {
    # ---------------------------------------------------------------- parole di js/primevolte.js
    "telegrafo": C(), "ferrovia": C(), "telefono": C(),
    "fotografia": C(OK + " (anche se in senso figurato: «una fotografia falsata»)"),
    "automobile": C(), "aeroplano": C(),
    "radio": ("corretta", "1924-11-15/camera/19241115/50", ("1903-12-05/senato/19031205/8", "il radio, l'elemento chimico («un corpo nuovo, il radio»)"),
              "la prima comparsa è un errore di lettura; poi «radio» è il verbo «radiò», l'elemento chimico o il prefisso di «radio-telegrafia»: come mezzo di comunicazione compare nel 1924"),
    "cinematografo": C(OK + " (in un paragone: «come in un cinematografo»)"),
    "frigorifero": C(OK + " (l'impianto per conservare al freddo)"),
    "televisione": C(),
    "satellite": ("corretta", "1955-02-25/senato/19550225/99", ("1849-03-02/camera/18490302/86", "il seguace, lo sgherro di un potente; poi lo Stato «satellite» di un altro"),
                  "fino al 1955 «satellite» è il seguace di un potente o uno Stato dipendente: il satellite artificiale compare nel 1955"),
    "computer": C(),
    "elaboratore": ("corretta", "1962-10-23/camera/19621023/64", ("1907-06-13/camera/19070613/86", "chi elabora una riforma, un progetto, una legge"),
                    "fino al 1962 l'«elaboratore» è una persona (chi elabora una legge o un piano): la macchina, l'elaboratore elettronico, compare nel 1962"),
    "informatica": C(), "fotocopiatrice": C(), "videocassetta": C(),
    "internet": C(),
    "telefonino": C(OK + " (la comparsa isolata del 1981 è un piccolo telefono qualunque)"),
    "cellulare": ("corretta", "1991-06-20/senato/19910620/127", ("1853-01-08/camera/18530108/19", "aggettivo: il «sistema cellulare» delle carceri, con i detenuti in celle separate (e poi il furgone cellulare)"),
                  "fino al 1991 «cellulare» è il carcere a celle, il furgone dei detenuti o la biologia della cellula: il telefono compare nel 1991"),
    "web": C(OK + " (le comparse dell'Ottocento sono un cognome e un errore di lettura)"),
    "email": C(OK + " (le comparse dell'Ottocento sono errori di lettura)"),
    "euro": ("corretta", "1995-12-05/camera/19951205/21", ("1900-12-29/senato/19001229/105", "nome di una nave della Marina, in un elenco con Nembo, Turbine e Aquilone (navi con nomi di venti)"),
             "le prime comparse sono errori di lettura (pezzi di nomi, «Non mi euro» per «non mi curo») o il prefisso «euro-»: la moneta compare quando si sceglie il nome della moneta unica, nel dicembre 1995"),
    "spread": ("corretta", "1995-11-07/senato/19951107/22", ("1976-12-10/senato/19761210/44", "il margine in più sul tasso di un prestito internazionale"),
               "nel 1976 lo spread è il margine sul tasso di un prestito, poi la distanza tra tassi in generale: lo spread tra titoli italiani e tedeschi compare nel 1995"),
    "smartphone": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 2004)"),
    "facebook": C(), "twitter": C(),
    "google": C(OK + " (la comparsa del 1873 è un errore di lettura)"),
    "algoritmo": C(OK + " (un procedimento di calcolo)", ("1874-01-30/camera/18740130/53", "l'aritmetica, il far di conto insegnato a scuola («abbaco ed algoritmo»)")),
    "bitcoin": C(), "covid": C(), "lockdown": C(), "privacy": C(),
    "globalizzazione": ("corretta", "1988-03-08/camera/19880308/13", ("1958-10-16/camera/19581016/15", "la «globalizzazione dei contingenti»: l'unione in un solo conto delle quote di importazione nel Mercato comune"),
                        "dal 1958 è un termine tecnico del Mercato comune (quote di importazione messe insieme): l'integrazione delle economie del mondo compare nel 1988"),
    "ecologia": ("corretta", "1970-10-29/senato/19701029/31", ("1935-03-27/senato/19350327/19", "la scienza che studia gli esseri viventi e il loro ambiente (anche l'«ecologia agraria» di un ufficio del Ministero)"),
                 "fino al 1970 è solo il nome di una scienza: la cura dell'ambiente compare nel 1970"),
    "inquinamento": C(OK + " (l'inquinamento delle acque; c'è anche una comparsa isolata nello stesso senso nel 1887)",
                      ("1882-02-03/camera/18820203/47", "senso figurato: contaminazione morale, di idee («nessun inquinamento di teorie»)")),
    "femminicidio": C(), "migranti": C(), "tangentopoli": C(),
    "casta": NN("1848-07-12/camera/18480712/19", "non è una parola nuova: «casta» come gruppo chiuso di privilegiati c'è dal 1848; la «casta politica» compare già nel 1929 e dopo il 2007 si usa soprattutto per i politici"),
    # ---------------------------------------------------------------- espressioni di js/primevolte.js
    "energia atomica": C(), "bomba atomica": C(),
    "cervello elettronico": C(OK + " (in tono ironico, ma è la macchina)"),
    "calcolatore elettronico": C(OK + " (in un paragone; c'è anche una comparsa isolata nello stesso senso nel 1963)"),
    "televisione a colori": C(), "personal computer": C(),
    "posta elettronica": C(OK + " (un servizio sperimentale delle Poste tra grandi città; la posta tra computer in rete compare nel 1987)"),
    "telefono cellulare": C(),
    "carta di credito": ("corretta", "1984-10-30/senato/19841030/35", ("1849-09-04/camera/18490904/19", "titolo di credito, una carta che vale come denaro"),
                         "dal 1974 al 1984 «carta di credito» è usata in senso figurato (un merito da far valere): la tessera per pagare compare nel 1984"),
    "banda larga": ("corretta", "1991-11-21/camera/19911121/339", ("1991-11-05/senato/19911105/117", "la banda larga di oscillazione del cambio della lira nello SME"),
                    "le prime due comparse sono la banda di oscillazione del cambio (SME): la rete a banda larga compare il 21 novembre 1991"),
    "commercio elettronico": C(), "social network": C(), "intelligenza artificiale": C(),
    "realta virtuale": C(OK + " (in senso figurato, la realtà costruita dai media; la tecnologia vera e propria compare molto più tardi)"),
    "cambiamenti climatici": C(),
    "effetto serra": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1971)"),
    "guerra fredda": C(), "compromesso storico": C(),
    "mani pulite": ("corretta", "1992-07-23/senato/19920723/78", ("1884-06-22/camera/18840622/10", "il modo di dire «avere le mani pulite», essere onesti"),
                    "fino al 1992 è il modo di dire «avere le mani pulite»: l'inchiesta di Milano compare nel luglio 1992"),
    "questione morale": ("corretta", "1893-03-21/camera/18930321/70", ("1851-12-12/camera/18511212/33", "una questione morale qualsiasi, l'aspetto morale di un problema"),
                         "nel 1851 è l'aspetto morale di un problema qualsiasi: la moralità di Governo e Parlamento davanti a un'inchiesta compare nel 1893"),
    "seconda repubblica": ("corretta", "1958-12-02/camera/19581202/12", ("1853-03-30/camera/18530330/10", "la Seconda Repubblica francese, nata nel 1848"),
                           "fino al 1958 è la Seconda Repubblica francese: una seconda Repubblica italiana compare nel 1958"),
    # ---------------------------------------------------------------- dati/prime/scelte.json
    "antifascismo": C(),
    "camerati": ("corretta", "1924-12-05/senato/19241205/38", ("1856-05-09/camera/18560509/12", "i compagni d'armi, i commilitoni"),
                 "nell'Ottocento i camerati sono i compagni d'armi: i «camerati fascisti» compaiono nel 1924"),
    "autarchia": ("corretta", "1933-04-03/senato/19330403/17", ("1891-12-20/camera/18911220/34", "l'autonomia amministrativa degli enti locali («autarchia locale»)"),
                  "fino al 1933 l'autarchia è l'autonomia di comuni ed enti: l'autarchia economica compare nel 1933"),
    "razzismo": C(), "littorio": C(), "camorra": C(),
    "maffia": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1868)"),
    "aviazione": C(), "immigrati": C(), "ndrangheta": C(),
    "ambientalismo": C(OK, ("1978-10-19/senato/19781019/79", "la teoria che spiega le differenze tra le persone con l'ambiente in cui crescono")),
    # ---------------------------------------------------------------- dati/home.json («nate»)
    "ovviamente": NN("1853-03-04/camera/18530304/9", "non è una parola nuova: c'è dal 1853 e cresce molto dopo"),
    "normativa": NN("1917-03-19/camera/19170319/102", "non è una parola nuova: c'è dal 1917 (prima come aggettivo, «la parte normativa») e cresce dopo"),
    "crescita": NN("1872-12-03/camera/18721203/81", "non è una parola nuova: c'è dal 1872 (la crescita del Po) e cresce dopo"),
    "sottolineare": NN("1881-04-06/camera/18810406/155", "non è una parola nuova: c'è dal 1881 e cresce dopo"),
    "strutture": NN("1862-08-09/camera/18620809/193", "non è una parola nuova: c'è dal 1862 e cresce dopo"),
    "intervengo": NN("1851-07-03/camera/18510703/12", "non è una parola nuova: c'è dal 1851 (intervenire alle adunanze); «intervengo in questo dibattito» dal 1875"),
    "culturale": NN("1907-06-22/camera/19070622/438", "non è una parola nuova: nel senso di cultura c'è dal 1907 e cresce dopo",
                    ("1880-12-02/camera/18801202/179", "colturale, della coltivazione dei campi (il «sistema culturale» contro la fillossera)")),
    "istituzionale": NN("1895-07-06/camera/18950706/91", "non è una parola nuova: c'è dal 1895 e cresce dopo",
                        ("1879-03-07/camera/18790307/14", "l'insegnamento «istituzionale» dell'università, quello dei fondamenti di una materia")),
    "ambientale": NN("1914-06-26/camera/19140626/69", "non è una parola nuova: c'è dal 1914 (l'ambiente di vita) e cresce dopo"),
    "berlusconi": C(),
    "finanziamento": NN("1912-03-01/camera/19120301/135", "non è una parola nuova: c'è dal 1912 e cresce dopo"),
    "programmazione": NN("1927-03-25/camera/19270325/32", "non è una parola nuova: c'è dal 1927 e cresce dopo"),
    "infrastrutture": NN("1937-05-15/senato/19370515/19", "non è una parola nuova: nel senso di impianti e opere (qui militari) c'è dal 1937 e cresce dopo",
                         ("1914-02-09/camera/19140209/129", "la parte sottostante, le fondamenta di un'opera portuale")),
    "trasparenza": NN("1850-04-16/senato/18500416/71", "non è una parola nuova: c'è dal 1850 (la trasparenza della carta) e cresce dopo nel senso di amministrazione aperta"),
    "utilizzo": NN("1925-03-26/senato/19250326/23", "non è una parola nuova: come nome («l'utilizzo») c'è dal 1925; le comparse più vecchie sono il verbo «io utilizzo»"),
    "elettronico": NN("1948-10-14/camera/19481014/111", "non è una parola nuova: c'è dal 1948 (il microscopio elettronico) e cresce dopo"),
    "comunista": NN("1855-02-19/camera/18550219/13", "non è una parola nuova: nel senso politico c'è dal 1855 e cresce dopo",
                    ("1854-12-28/camera/18541228/19", "chi fa parte di una comunità ed ha diritti sui suoi beni comuni")),
    "culturali": NN("1912-12-17/camera/19121217/44", "non è una parola nuova: nel senso di cultura c'è dal 1912 e cresce dopo",
                    ("1883-04-16/camera/18830416/2", "colturali, della coltivazione dei campi")),
    "riformulazione": NN("1966-11-29/camera/19661129/25", "non è una parola nuova: c'è dal 1966 e cresce dopo"),
    "formulazione": NN("1854-06-22/camera/18540622/20", "non è una parola nuova: c'è dal 1854 e cresce dopo"),
    "iter": ("corretta", "1947-09-17/camera/19470917/28", None,
             "le comparse dell'Ottocento sono errori di lettura o citazioni latine («iter criminis»): l'iter di una discussione o di una legge compare nel 1947"),
    "istituzionali": NN("1875-11-20/camera/18751120/25", "non è una parola nuova: c'è dal 1875 e cresce dopo"),
    "sottolineato": NN("1882-06-24/camera/18820624/43", "non è una parola nuova: c'è dal 1882 e cresce dopo"),
    "federalismo": NN("1851-05-12/camera/18510512/53", "non è una parola nuova: c'è dal 1851 e cresce dopo"),
    "consapevolezza": NN("1861-05-07/camera/18610507/43", "non è una parola nuova: c'è dal 1861 e cresce dopo"),
    "comportamento": NN("1885-02-26/camera/18850226/21", "non è una parola nuova: c'è dal 1885 e cresce dopo"),
    "individuare": NN("1851-01-07/camera/18510107/12", "non è una parola nuova: c'è dal 1851 e cresce dopo"),
    "terrorismo": NN("1862-03-20/senato/18620320/79", "non è una parola nuova: c'è dal 1862 (il Terrore della Rivoluzione, le intimidazioni) e cresce dopo"),
    "normativo": NN("1918-04-23/camera/19180423/69", "non è una parola nuova: c'è dal 1918 e cresce dopo"),
    # ---------------------------------------------------------------- dati/parole/indice.json, curva dal 1990
    "agea": C(OK, ("1967-10-09/camera/19671009/14", "un altro ente con la stessa sigla")),
    "anticorruzione": C(), "azzollini": C(), "bce": C(), "bertolaso": C(), "bindi": C(), "biodiversita": C(), "bipartisan": C(),
    "bressa": ("corretta", "1996-05-30/camera/19960530/26", ("1919-07-10/camera/19190710/131", "la regione francese della Bresse («le terre di Bressa»)"),
               "la prima comparsa della regola è «Brescia» in dialetto lombardo: il deputato Bressa compare nel 1996"),
    "brexit": C(),
    "bullismo": C(OK, ("1957-12-04/senato/19571204/71", "spavalderia, prepotenza da bulli in politica («bullismo fascista»)")),
    "buontempo": C(OK, ("1899-02-04/camera/18990204/90", "nome comune: spasso, divertimento («prendersi il buontempo»)")),
    "calderoli": C(),
    "cartolarizzazione": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1993)"),
    "ccd": C(),
    "compact": ("corretta", "2002-05-27/camera/20020527/84", ("1985-12-05/senato/19851205/17", "il compact disk, il disco per la musica"),
                "fino al 2002 «compact» è il compact disc: il patto (global compact, poi fiscal compact) compare nel 2002"),
    "consip": C(),
    "coronavirus": ("corretta", "2020-01-30/camera/20200130/7", ("2003-04-16/camera/20030416/161", "i coronavirus della SARS del 2003"),
                    "dal 2003 sono i coronavirus della SARS: il nuovo coronavirus del 2020 compare il 30 gennaio 2020"),
    "delrio": C(), "devolution": C(),
    "digitalizzazione": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1990)"),
    "diliberto": C(OK, ("1973-12-18/camera/19731218/29", "un'altra persona con lo stesso cognome")),
    "disabilita": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1983)"),
    "disattiva": NN("1976-12-15/senato/19761215/98", "non è una parola nuova: il verbo c'è dal 1976 (si disattiva un'emittente, la SIP disattiva i telefoni)"),
    "dpcm": C(), "dpef": C(), "economy": C(),
    "eegrave": ("incerta", None, None, "non è una parola: è la «è» scritta male nei resoconti (il codice &egrave;), quindi non ha un senso di oggi"),
    "efficientamento": C(), "equitalia": C(), "fornero": C(),
    "governance": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1995)"),
    "gubert": C(), "hub": C(), "imu": C(), "irap": C(),
    "isaf": C(OK, ("1978-05-26/camera/19780526/10", "una società chimica con la stessa sigla (lo stabilimento di Gela)")),
    "isee": C(),
    "jobs": C(OK + " (la parola inglese per «posti di lavoro»; il Jobs act arriva nel 2014)"),
    "kosovo": C(OK + " (la regione è nominata anche nel 1975)"),
    "kyoto": C(OK + " (la conferenza sul clima di Kyoto)", ("1971-04-26/senato/19710426/21", "la città giapponese")),
    "lunardi": C(OK, ("1910-07-06/senato/19100706/53", "un'altra persona: Vincenzo Lunardi, che volò in pallone nel 1789")),
    "manzione": C(OK + " (le comparse più vecchie sono «mansione» stampato male)"),
    "mediaset": C(),
    "mediatica": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1990)"),
    "mediatico": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1990)"),
    "mef": C(),
    "merkel": C(OK, ("1925-05-27/camera/19250527/30", "un'altra persona: un giurista di nome Merkel")),
    "milleproroghe": C(), "milosevic": C(), "miur": C(), "ncd": C(), "obama": C(),
    "palliative": C(OK, ("1855-02-08/camera/18550208/23", "«misure palliative»: rimedi che non risolvono il problema")),
    "pandemica": NN("1922-02-16/senato/19220216/129", "non è una parola nuova: l'«influenza pandemica» c'è già nel 1922 e nel 1957; cresce con le pandemie del 2009 e del 2020"),
    "partenariato": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1980)"),
    "pds": C(), "pnrr": C(), "prestigiacomo": C(), "previti": C(), "project": C(), "putin": C(), "rating": C(),
    "realacci": C(), "resilienza": C(OK + " (le comparse dell'Ottocento sono «residenza» stampato male)"),
    "ripartenza": C(OK, ("1986-03-04/senato/19860304/20", "il ripartire di un aereo dalla base")),
    "scanio": C(),
    "schifani": ("corretta", "1996-05-16/senato/19960516/96", ("1992-05-25/camera/19920525/15", "un'altra persona: Vito Schifani, agente della scorta di Giovanni Falcone"),
                 "la prima comparsa della regola è Vito Schifani, agente ucciso con Falcone: il senatore Schifani compare nel 1996"),
    "smart": C(), "stalking": C(),
    "superbonus": ("corretta", "2020-05-21/camera/20200521/11", ("2002-09-19/camera/20020919/31", "un incentivo con lo stesso nome nel lavoro e nelle pensioni (per i nuovi assunti, poi per chi restava al lavoro)"),
                   "fino al 2020 il «superbonus» è un incentivo del lavoro e delle pensioni: il bonus per l'efficienza energetica degli edifici compare nel maggio 2020"),
    "talebani": C(), "taradash": C(),
    "telecom": ("corretta", "1993-12-16/senato/19931216/146", ("1990-11-07/camera/19901107/13", "altre compagnie dei telefoni (British Telecom, France Telecom)"),
                "fino al 1993 sono compagnie straniere (British Telecom, France Telecom): Telecom Italia compare nel dicembre 1993"),
    "termovalorizzatori": C(), "tracciabilita": C(), "trenitalia": C(),
    "udc": C(OK, ("1989-03-14/senato/19890314/43", "un'agenzia con la stessa sigla")),
    "udeur": C(), "upt": C(),
    "voucher": C(OK + " (c'è anche una comparsa isolata nello stesso senso nel 1999)"),
}


def finale():
    occ = unione()
    old = vecchie()
    nomi = {}
    ag = os.path.join(CACHE, "aggregati.pkl")
    if os.path.exists(ag):
        nomi = pickle.load(open(ag, "rb")).get("nomi", {})
    indice = {}
    for k, v in occ.items():
        for o in v:
            indice[(k, rif(o))] = o

    def voce(o):
        data, fl, nt, ramo, orat, pid, par, fr, fm = o[:9]
        nome = nomi.get(pid) or oratore_valido(orat, "", data[:4])
        return [data, ramo, nome, pid, par if par and not par.isdigit() else "", fr, fm]

    out, righe, errori = {}, [], []
    el = elenco()
    for k in sorted(el):
        if k not in DECISIONI:
            errori.append("manca la decisione: " + k)
            continue
        stato, r_nuova, antico, motivo = DECISIONI[k]
        s = old.get(k) or {}
        p0 = (s.get("p") or [None])[0]
        vecchia = p0[0] if p0 else None
        nuova = None
        if stato == "confermata":
            nuova = p0
        elif r_nuova:
            o = indice.get((k, r_nuova))
            if o is None:
                errori.append("comparsa non trovata: %s %s" % (k, r_nuova))
                continue
            if not frase_pulita(o[7]):
                errori.append("frase che non supera il filtro: %s %s" % (k, r_nuova))
            nuova = voce(o)
        if stato in ("corretta", "non nuova") and not nuova:
            errori.append("stato %s senza comparsa: %s" % (stato, k))
        a = None
        if antico:
            o = indice.get((k, antico[0]))
            if o is None:
                errori.append("comparsa antica non trovata: %s %s" % (k, antico[0]))
            else:
                a = {"data": o[0], "senso": antico[1]}
        out[k] = {"stato": stato, "vecchia": vecchia, "nuova": nuova, "antico": a, "motivo": motivo}
        righe.append((k, vecchia or "", (nuova[0] if nuova else "incerta"), stato, (a["data"] + ": " + a["senso"]) if a else "", motivo))
    if errori:
        print("\n".join(errori))
        raise SystemExit("decisioni da sistemare: %d" % len(errori))
    s = json.dumps(out, ensure_ascii=False, indent=1)
    if len(s.encode("utf-8")) > LIMITE:
        raise SystemExit("prime_senso.json troppo grande")
    with open(os.path.join(QUI, "prime_senso.json"), "w", encoding="utf-8") as f:
        f.write(s)
    conti = defaultdict(int)
    for r in righe:
        conti[r[3]] += 1
    md = ["# Prime volte nel senso di oggi", "",
          "Metodo. La data di prima volta del sito viene da una regola automatica (il primo anno con almeno 3 comparse in 3 anni). "
          "Per ogni parola mostrata come nuova un programma ha estratto dai resoconti le comparse in ordine di data, con il contesto, "
          "e le ha lette per trovare la prima volta nel senso di oggi (la moneta per «euro», la rete per «banda larga»).",
          "Ogni data e ogni frase viene dai turni (programma _genera/g9b_prime_senso.py, scelte scritte nel programma); "
          "gli errori di lettura del testo stampato non contano come senso antico; quando la prima volta nel senso di oggi non è certa, "
          "la data non c'è («incerta»).",
          "Stati: confermata %d, corretta %d, incerta %d, non nuova %d (voci controllate: %d)." % (
              conti["confermata"], conti["corretta"], conti["incerta"], conti["non nuova"], len(righe)), "",
          "| parola | vecchia data | nuova data | stato | senso antico | motivo |", "|---|---|---|---|---|---|"]
    for r in righe:
        md.append("| " + " | ".join(x.replace("|", "/") for x in r) + " |")
    with open(os.path.join(SITO, "_progetto", "PRIME_VOLTE_SENSO.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md) + "\n")
    print(dict(conti), "voci:", len(righe), flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "estrai"
    {"estrai": estrai, "leggi": leggi, "finale": finale}[cmd]()
    fine()
