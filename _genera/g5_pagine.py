r"""g5 - Pagine HTML del sito (gusci comuni) e file scaricabili.

METODO
  Ogni pagina ha lo stesso guscio: meta robots noindex (anteprima), striscia «Anteprima, non ancora pubblicato»,
  testata di riserva leggibile senza JavaScript, contenitore principale, piede. Il contenuto delle pagine generate
  (parola, anno, legislatura, partito, persona, tema, storia, esperimento) lo scrive il programma della pagina in js/
  leggendo i dati di dati/. Le pagine di testo (metodo, dati, paper) hanno il testo qui sotto oppure, se esiste,
  quello di _progetto/TESTI_PAGINE.md convertito da g6.
  File scaricabili: scarica/*.csv, ognuno sotto 2 MB, ricavati dai dati gia' prodotti (nessun conteggio nuovo).
USO     python -I _genera/g5_pagine.py
"""
import csv
import io
import json
import os
import pickle
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *  # noqa

MENU = [("Parole", "parole.html"), ("Prime volte", "primevolte.html"), ("Anni", "anni.html"), ("Legislature", "legislature.html"), ("Partiti", "partiti.html"),
        ("Persone", "persone.html"), ("Temi", "temi.html"), ("Storie", "storie.html"), ("Percorsi", "percorsi.html"), ("Esperimenti", "esperimenti.html"),
        ("Metodo e limiti", "metodo.html"), ("Dati", "dati.html"), ("Paper", "paper.html")]
SEZIONE = {"parole": "parole", "parola": "parole", "primevolte": "parole", "lingue": "parole", "anni": "anni", "anno": "anni",
           "legislature": "legislature", "legislatura": "legislature", "partiti": "partiti", "partito": "partiti",
           "persone": "persone", "persona": "persone", "risate": "persone", "temi": "temi", "tema": "temi", "storie": "storie",
           "storia": "storie", "fascismo": "fascismo", "esteri": "esteri"}


def guscio(titolo, descrizione, js, corpo, attivo=None, dove=False, home=False, sezione="neutra"):
    menu = "".join('<a href="%s"%s>%s</a>' % (h, ' class="attivo"' if t == attivo else "", t) for t, h in MENU)
    scripts = "".join('<script defer src="js/%s"></script>' % s for s in (["d3.min.js", "comune.js"] + ([js] if js else [])))
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{titolo}</title>
<meta name="description" content="{descrizione}">
<link rel="preload" href="caratteri/Archivo-variabile.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/stile.css">
<link rel="stylesheet" href="css/v2.css">
<link rel="icon" href="data:,">
{scripts}
</head>
<body data-sezione="{sezione}">
<div class="anteprima" role="note">Anteprima, non ancora pubblicato</div>
<div class="pagina">
<header id="testata" class="testata{'' if home else ' compatta'}">
<div class="riga-alta"><span>Camera e Senato, 1848-2022</span><span>Aggiornato al 22 novembre 2026</span></div>
<h1><a href="index.html">Il vocabolario del Parlamento</a></h1>
<nav class="menu" aria-label="Sezioni">{menu}</nav>
</header>
{'<div id="dove" class="dove"></div>' if dove else ''}
<main id="main">
{corpo}
</main>
</div>
<footer id="piede" class="piede"><div class="pagina"><p class="piccolo grigio">Il vocabolario del Parlamento. Fonte: resoconti stenografici di Camera e Senato, 1848-2022.</p></div></footer>
</body>
</html>
"""


NOSCRIPT = '<noscript><p class="segnaposto"><b>Questa pagina si costruisce con JavaScript.</b> Le stesse cifre sono nei file della pagina <a class="lk" href="dati.html">Dati</a>.</p></noscript>'


def home():
    corpo = f"""<section class="asse-tempo" id="asse" aria-label="Parole a confronto sull'asse del tempo">
<h2 class="titolo-asse">Parole a confronto, dal 1848 al 2022</h2>
{NOSCRIPT}
</section>
<section class="scorre-box" aria-label="La parola di ogni anno"><div class="scorre" id="scorre"></div></section>
<section class="sezione" id="racconto" aria-label="Il racconto in sette capitoli"><div class="testa"><h2>Il racconto, in sette capitoli</h2></div>
<div id="filo-home"></div><ol class="capitoli-home" id="capitoli-home"></ol></section>
<section class="sezione" id="percorsi" aria-label="Percorsi"><div class="testa"><h2>Quattro percorsi</h2><span class="a-destra"><a href="percorsi.html">Tutti i percorsi</a></span></div><div id="ingressi"></div></section>
<section class="sezione" id="archivio" aria-label="L'archivio"><div class="testa"><h2>L'archivio: scrivi una parola</h2><span class="a-destra"><a href="parole.html">Parole</a> · <a href="persone.html">Persone</a> · <a href="partiti.html">Partiti</a> · <a href="legislature.html">Legislature</a> · <a href="anni.html">Anni</a></span></div>
<p class="sotto-titolo">Ogni parola detta almeno 10 volte ha la sua scheda: scrivila nella casella in alto, oppure entra da una sezione.</p></section>
<section class="griglia sezione" aria-label="Apertura">
<article class="c8 apertura" id="apertura"></article>
<aside class="c4 fil breve"><h3>In breve</h3><ol id="in-breve"></ol></aside>
</section>
<section class="sezione" id="esteri-home" style="--sez:#00A3AD"><div class="testa"><h2>Amici e nemici dell'Italia</h2><span class="a-destra"><a href="esteri.html">Il percorso completo</a></span></div>
<p class="sotto-titolo">Il tono dell'aula verso un paese, anno per anno (sopra lo zero da nemico, sotto da amico), con le alleanze (turchese) e le guerre vere (rosa).</p>
<div class="multipli" id="esteri-mini" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div></section>
<section class="sezione" id="partiti" style="--sez:#E5007D"><div class="griglia">
<div class="c8" id="m-mappa"><h2 class="titolo-medio"><a href="storia.html?id=mappa-partiti-governo-opposizione">La mappa dei partiti</a></h2>
<p class="sommario" style="font-size:18px"><span class="somm-media"></span> <a class="lk" href="storia.html?id=mappa-partiti-governo-opposizione">Leggi la storia</a> · <a class="lk" href="partiti.html">Tutti i partiti</a></p><div id="g-scie-home"></div></div>
<div class="c4 fil" id="m-guerra"><h2 class="titolo-medio"><a href="storia.html?id=missione-o-guerra">Missione o guerra</a></h2>
<p style="font-size:15.5px"><span class="somm-media"></span> <a class="lk" href="storia.html?id=missione-o-guerra">Leggi la storia</a></p>
<div id="g-manubri"></div></div></div>
<div id="g-mappa" hidden></div></section>
<section class="sezione" id="storie-home" style="--sez:#E3120B"><div class="testa"><h2>Le storie</h2><span class="a-destra"><a href="storie.html">Tutte le <span data-conto="storie"></span> storie</a></span></div><div id="muro"></div></section>
<section class="sezione" id="parole" style="--sez:#2454FF">
<div class="testa"><h2>Venti parole, 175 anni</h2><span class="a-destra"><a href="parole.html">Tutte le <span data-conto="parole"></span> parole</a> · <a href="primevolte.html">Prime volte</a></span></div>
<p class="sotto-titolo">Volte ogni milione di parole, anno per anno, Camera e Senato. Ogni curva ha la sua scala: si confronta la forma, non l'altezza. Le parole sono in ordine di anno di punta, dalle ferrovie alla pandemia.</p>
<div class="multipli" id="multipli"></div>
</section>
<section class="sezione" id="anni" style="--sez:#00A3AD">
<div class="testa"><h2>La parola dell'anno, dal 1848 al 2022</h2><span class="a-destra"><a href="anni.html">Tutti i 175 anni</a></span></div>
<p class="sotto-titolo">Per ogni anno la parola detta molto più del solito. Le sceglie un programma tra le parole di almeno cinque lettere: solo una su quindici racconta un evento, le altre sono leggi, procedure, nomi. Restano alcuni errori dello scanner.</p>
<div class="anni-blocco" id="anni-blocco"></div>
</section>
<section class="sezione" id="legislature" style="--sez:#7B3FE4">
<div class="testa"><h2>Le <span data-conto="legislature"></span> legislature</h2><span class="a-destra"><a href="legislature.html">Tutte le legislature</a></span></div>
<div id="g-legislature"></div>
</section>
<section class="sezione griglia" id="esperimenti">
<div class="c8"><h2 class="titolo-medio" id="esp-tit"><a href="esperimenti.html">Gli esperimenti</a></h2><p class="sommario" style="font-size:17px" id="esp-somm"></p><div id="g-esperimenti"></div></div>
<div class="c4 fil"><h3 class="titolo-piccolo">Le smentite che fanno notizia</h3><ul class="smentite" id="smentite"></ul>
<p style="margin-top:10px"><a class="leggi" href="esperimenti.html">Tutti i <span data-conto="esperimenti"></span> esperimenti</a></p></div>
</section>
<section class="sezione" id="temi" style="--sez:#00A85A"><div id="g-temi"></div><p style="margin-top:10px"><a class="leggi" href="temi.html">I <span data-conto="temi"></span> temi e gli atlanti</a></p></section>
<section class="sezione sottile" id="chiusa" aria-label="Chiusa"><blockquote class="citazione-gigante" id="chiusa-frase"></blockquote><p class="chi" id="chiusa-chi"></p></section>
<section class="sezione griglia" id="elenchi">
<div class="c3"><h3 class="titolo-piccolo">Chi parla di più</h3><p class="fig-sotto">Interventi alla Camera, 1948-2022. In evidenza i deputati radicali della VII legislatura.</p><div id="g-oratori"></div><p class="fig-fonte">Si contano gli interventi, non le parole. Chi fa ostruzionismo o interrompe spesso sale in classifica. <a href="persone.html">Tutte le persone</a></p></div>
<div class="c3 fil"><h3 class="titolo-piccolo">Le parole nate dopo il 1990</h3><p class="fig-sotto">Volte per milione di parole</p><div class="tab-scorre"><table class="fitta" id="t-nate"></table></div></div>
<div class="c3 fil"><h3 class="titolo-piccolo">Le parole morte con l'Ottocento</h3><p class="fig-sotto">Volte per milione di parole</p><div class="tab-scorre"><table class="fitta" id="t-morte"></table></div></div>
<div class="c3 fil"><h3 class="titolo-piccolo">L'anno di punta di quaranta parole</h3><p class="fig-sotto">Anno di massimo, media di Camera e Senato</p><div id="l-picchi"></div></div>
</section>"""
    return guscio("Il vocabolario del Parlamento", "L'italiano parlato a Camera e Senato dal 1848 al 2022: parole, partiti, legislature, persone, esperimenti.", "home.js", corpo, home=True)


def semplice(nome, titolo, desc, js, attivo, briciola, dove=False, extra=""):
    corpo = f'<div class="briciole"><a href="index.html">Home</a> › {briciola}</div>{extra}<div id="contenuto"><p class="carica">Carico i dati…</p>{NOSCRIPT}</div>'
    return guscio(titolo, desc, js, corpo, attivo=attivo, dove=dove, sezione=SEZIONE.get(nome, "neutra"))


METODO = """<div class="briciole"><a href="index.html">Home</a> › Metodo e limiti</div>
<div class="griglia">
<article class="c8 colonna-testo" id="testo-metodo">
<h1 class="titolo-pagina">Metodo e limiti</h1>
<p class="sommario">Tutto il sito conta parole nei resoconti stenografici di Camera e Senato, dal 1848 al 2022: 5.006.103 interventi e 892,5 milioni di parole in 98 archivi di legislatura. Il resoconto non è una registrazione: lo scrive uno stenografo, e le sue regole cambiano nel tempo.</p>
<h2>Da dove vengono i testi</h2>
<p>I testi sono quelli della raccolta IPSA (Fondazione Bruno Kessler, licenza CC BY 3.0): un file per seduta, ricavato in gran parte dalle scansioni delle pagine stampate. Per la Camera della Repubblica il partito e la persona di ogni intervento vengono da ItaParlCorpus (licenza CC0) e dagli elenchi ufficiali di dati.camera.it, dati.senato.it e Wikidata.</p>
<p>La pulizia tiene solo i discorsi. Decreti letti, votazioni, elenchi e tabelle sono messi da parte; applausi, proteste e risate sono tolti dal testo ma contati. La pulizia corregge gli errori dello scanner, mai la lingua: «quistione» e «adunque» restano come sono.</p>
<h2>Che cosa si conta</h2>
<p>Una parola è una sequenza di lettere, senza accenti e senza maiuscole: «libertà» e «Libertà» sono la stessa parola, l'apostrofo separa («l'impero» conta «impero»). Si contano gli interventi di parlamentari, ministri e relatori; restano fuori il Presidente, i segretari e le voci collettive.</p>
<p>Le curve dicono quante volte una parola è detta ogni milione di parole, nello stesso ramo e nello stesso anno. Un anno di un ramo entra nella curva solo se ha almeno 300.000 parole; altrimenti la linea si interrompe. Le curve lunghe si disegnano come media mobile di tre anni; il valore del picco scritto in etichetta è quello dell'anno vero.</p>
<p>Il sito ha una pagina per ognuna delle 23.842 parole dette almeno 1.000 volte. La «prima volta» di una parola è il primo intervento a partire dal primo anno in cui la parola compare almeno tre volte in tre anni: le comparse sparse prima di quell'anno sono spesso errori dello scanner e sono segnalate a parte. Così «spread» comincia il 10 dicembre 1976 al Senato, con il ministro del Tesoro Gaetano Stammati: la comparsa del 1861 è un errore di lettura.</p>
<h2>Quando cambia il resoconto</h2>
<p>Il modo di trascrivere cambia in date precise, e con lui cambiano le misure di stile (lunghezza delle frasi, domande, annotazioni). Le date sono state trovate cercando i salti nelle serie e controllate sui testi: alla Camera 1953, 1979, 1987, 1994, 2001, 2006, 2008, 2013 e 2018; al Senato 1968, 1987, 1996, 2000 e 2018. Nei grafici sono righe verticali tratteggiate. Un cambio che cade in una di queste date non si può attribuire alla lingua senza una prova in più.</p>
<div id="g-calendario"></div>
<h2>Lo scanner</h2>
<p>Le pagine dell'Ottocento sono scansioni, e lo scanner sbaglia più spesso: le parole che non esistono nel vocabolario di oggi sono 11 su 100 nel 1848, 5-6 negli anni Ottanta dell'Ottocento, 4 negli anni Trenta, 3 negli anni Cinquanta. Non sono tutte errori: ci sono l'italiano antico («quistione», «uffizio», «imperocché») e il francese del Parlamento subalpino. Per questo le curve dell'Ottocento hanno punte isolate che vanno lette con prudenza.</p>
<h2>Gli esperimenti e la regola del verdetto</h2>
<p>Ogni esperimento parte da un'ipotesi scritta prima di guardare i dati, con la regola che decide il verdetto fissata in anticipo. I verdetti sono tre: <span class="esito regge">regge</span>, <span class="esito parte">in parte</span>, <span class="esito smentita">smentita</span>; più tre casi rari: misura non valida, descrittiva, non misurata. Il verdetto si riporta alla lettera, anche quando una lettura più larga lo addolcirebbe. Gli esperimenti sono 153, su 78 ipotesi.</p>
<p>Le prove con le date finte servono a capire se un salto è vero: si ripete la misura spostando l'evento in un anno in cui non è successo niente. Se il salto finto è grande come quello vero, il risultato non regge.</p>
<h2>Il giudice automatico</h2>
<p>Contare le parole vicine non basta a capire il tono di una frase: in una prova il conteggio era giusto due o tre volte su quattro. Per le domande sul tono (un paese è trattato da amico o da nemico? si dice «guerra» o «missione»?) un giudice automatico legge circa 18.500 brani, ognuno con la frase prima e quella dopo, senza sapere chi parla né quando, e sceglie un'etichetta da un elenco fissato prima.</p>
<p>Il giudice vale solo se supera due regole scritte prima: un secondo giudice indipendente deve essere d'accordo almeno 8 volte su 10 su 300 brani letti da entrambi, anche togliendo l'accordo dovuto al caso; e su 100 brani riletti uno per uno da un revisore il giudice deve avere ragione almeno 8 volte su 10. Il giudice è risultato valido in 8 domande su 15. Funziona quando la domanda è netta («amico o nemico», sì o no); non funziona quando le etichette sono vicine tra loro. Dove non è valido, il suo risultato è solo descrittivo e il verdetto viene dal conteggio delle parole.</p>
<h2>I limiti dei dati</h2>
<ul>
<li>Il resoconto è una versione scritta, corretta e a volte riassunta: fino al 1860 e nella Costituente molti interventi sono riassunti dallo stenografo.</li>
<li>Al Senato il resoconto dà spesso solo il cognome: i nomi delle persone sono ricostruiti con gli elenchi ufficiali, e per qualche intervento non si sa chi parla.</li>
<li>I partiti sono quelli della Camera della Repubblica: al Senato il progetto ha il gruppo parlamentare, non il partito. La mappa dei partiti parte dal 1948 e non comprende i gruppi minori.</li>
<li>La quota di parole di un partito nella mappa conta solo gli interventi da parlamentare, senza ministri e relatori. Per questo nella VII legislatura il MSI (22,7%) supera la DC (18,2%): contando anche ministri e relatori la DC torna prima (27,6% contro 20,2%).</li>
<li>Le parole dell'anno e le parole tipiche contengono qualche residuo dello scanner o del resoconto («sig», nomi di deputati letti negli appelli).</li>
<li>Nel 1941-45 non ci sono sedute: le curve si interrompono.</li>
<li>«Chi la dice di più» somma, archivio per archivio, i dieci oratori che dicono di più ogni parola: chi non è tra i primi dieci in nessun archivio resta fuori.</li>
</ul>
</article>
<aside class="c4 fil">
<h3 class="titolo-piccolo">In questa pagina</h3>
<ul class="fatti">
<li><b data-conto="parole"></b> parole con una pagina<span class="et">almeno 1.000 volte in aula</span></li>
<li><b>300.000</b> parole<span class="et">il minimo perché un anno di un ramo entri nelle curve</span></li>
<li><b data-conto="sedute"></b> sedute<span class="et">nei resoconti di Camera e Senato</span></li>
<li><b data-conto="esperimenti"></b> esperimenti su <span data-conto="ipotesi"></span> ipotesi<span class="et"><a href="esperimenti.html">l'indice con gli esiti</a></span></li>
</ul>
</aside>
</div>"""

PAPER = """<div class="briciole"><a href="index.html">Home</a> › Paper</div>
<h1 class="titolo-pagina">Due working paper</h1>
<p class="sommario">I paper sono versioni di lavoro. Numeri e verdetti sono gli stessi del sito.</p>
<div class="griglia">
<article class="c7" id="aula">
<p class="occhiello">Working paper</p>
<h2 class="titolo-medio">Che lingua parla l'aula? L'italiano del Parlamento e il resoconto che lo scrive (1848-2022)</h2>
<p>La lingua dell'aula non si semplifica con regolarità: all'Unità la frase della Camera perde sette parole di colpo, poi resta quasi ferma; quello che cambia piano e sempre è la forma, con le parole e le grafie antiche che spariscono. Con la Repubblica diventa più burocratica, e nel 1994 non cambia. Ma ogni misura di stile passa da chi scrive il resoconto: il paper ricostruisce le date in cui cambia la trascrizione e separa ciò che è dell'aula da ciò che è dello stenografo.</p>
<p class="segnaposto"><b>PDF in preparazione.</b></p>
<p class="vedi">Leggi anche: <a href="storia.html?id=semplificazione-ottocento">la semplificazione dell'Ottocento</a> <a href="storia.html?id=antilingua-repubblica">l'antilingua della Repubblica</a> <a href="storia.html?id=resoconto-nove-date">le date del resoconto</a> <a href="storia.html?id=salto-1994-non-ce">il salto del 1994 che non c'è</a></p>
</article>
<article class="c5 fil" id="chi">
<p class="occhiello">Working paper</p>
<h2 class="titolo-medio">Chi parla come chi</h2>
<p>Che cosa distingue la lingua di un partito da quella di un altro alla Camera, dal 1948 al 2022. La prima differenza è tra chi governa e chi si oppone, la seconda tra destra e sinistra. Tra il 1976 e il 1979 il PCI si avvicina alla lingua della DC e la DC resta dov'era; nel 2018 il M5S passa in pochi mesi dalla lingua dell'opposizione a quella della maggioranza.</p>
<p class="segnaposto"><b>PDF in preparazione.</b></p>
<p class="vedi">Leggi anche: <a href="storia.html?id=mappa-partiti-governo-opposizione">governo e opposizione</a> <a href="storia.html?id=compromesso-storico-pci-verso-dc">il PCI verso la DC</a> <a href="storia.html?id=potere-cambia-la-lingua">il potere cambia la lingua</a> <a href="storia.html?id=m5s-2018-lingua-di-governo">il M5S nel 2018</a></p>
</article>
</div>"""


def scarica():
    """CSV scaricabili, ognuno sotto 2 MB."""
    out = os.path.join(SITO, "scarica")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(CACHE, "parole_base.pkl"), "rb") as f:
        B = pickle.load(f)
    ix = json.load(open(os.path.join(DATI, "parole", "indice.json"), encoding="utf-8"))["p"]
    forma = {r[0]: (r[1] or r[0]) for r in ix}
    elenco = []

    def scrivi(nome, righe, descr):
        s = io.StringIO()
        csv.writer(s, lineterminator="\n").writerows(righe)
        b = s.getvalue().encode("utf-8")
        if len(b) > LIMITE:
            raise SystemExit("CSV troppo grande: " + nome)
        open(os.path.join(out, nome), "wb").write(b)
        elenco.append([nome, len(b), len(righe) - 1, descr])

    scrivi("parole.csv", [["parola", "forma", "volte_totali", "volte_camera", "volte_senato", "anno_di_punta", "anno_di_partenza"]] +
           [[w, forma[w], int(B["M"][i].sum()), int(B["M"][i, 0].sum()), int(B["M"][i, 1].sum()), B["picco"][i], B["y0"][i]] for i, w in enumerate(B["parole"])],
           "Le %d parole del sito: totali, anno di punta e anno di partenza della curva" % len(B["parole"]))
    scrivi("parole_denominatori.csv", [["anno", "parole_camera", "parole_senato"]] + [[a, int(B["tot"][0, k]), int(B["tot"][1, k])] for k, a in enumerate(ANNI)],
           "Parole contate per anno e ramo (il denominatore delle curve)")
    P = len(B["parole"])
    passo = 1000
    for k in range(0, P, passo):
        righe = [["parola", "ramo"] + ANNI]
        for i in range(k, min(P, k + passo)):
            for r, nome in ((0, "camera"), (1, "senato")):
                righe.append([B["parole"][i], nome] + B["M"][i, r].tolist())
        scrivi("conteggi_%02d.csv" % (k // passo + 1), righe, "Volte per anno e ramo, parole da «%s» a «%s»" % (B["parole"][k], B["parole"][min(P, k + passo) - 1]))
    e = json.load(open(os.path.join(DATI, "esperimenti.json"), encoding="utf-8"))
    scrivi("esperimenti.csv", [["filone", "codice", "titolo", "cosa_ci_aspettavamo", "esito", "numero_chiave"]] +
           [[x["filone"], x["cod"], x["titolo"], x["attesa"], x["esito"], x["numero"]] for x in e["elenco"]], "I 153 esperimenti con l'esito")
    righe = [["partito", "legislatura", "anno_medio", "quota_parole", "oratori", "famiglia", "quota_governo", "posizione_sinistra_destra"]]
    for r in leggi_csv("mappa_partiti_mappa_unica_relativa.csv"):
        righe.append([r["partito"].replace("Unita'", "Unità"), r["leg"], r["anno"], r["quota"], r["n_orat"], r["famiglia"], r["governo_quota"], r["dim2"]])
    scrivi("mappa_partiti.csv", righe, "La mappa dei partiti: 121 schede partito per legislatura (Camera, 1948-2022)")
    b = json.load(open(os.path.join(DATI, "base.json"), encoding="utf-8"))
    scrivi("legislature.csv", [["archivio", "ramo", "legislatura", "da", "a", "interventi", "parole", "parole_per_frase", "lettere_per_parola"]] +
           [[a["id"], a["ramo"], a["nome"], a["da"], a["a"], a["turni"], a["parole"], a["frase"], a["lettere"]] for a in b["archivi"]], "I 98 archivi di legislatura")
    t = json.load(open(os.path.join(DATI, "temi.json"), encoding="utf-8"))["temi"]
    scrivi("temi.csv", [["tema", "nome", "procedura"] + ANNI] + [[x["id"], x["nome"], x["proc"]] + x["q"] for x in t], "Quota delle parole della Camera per ognuno dei 40 temi, anno per anno")
    scrivi("parole_dell_anno.csv", [["anno", "rango", "parola", "per_milione"]] + [[a, k + 1, p[0], p[1]] for a, v in sorted(b["parole_anno"].items(), key=lambda x: int(x[0])) for k, p in enumerate(v)],
           "Le cinque parole più tipiche di ogni anno")
    scrivi_json("scarica.json", elenco)
    return elenco


def main():
    pagine = {
        "index.html": home(),
        "parole.html": semplice("parole", "Parole · Il vocabolario del Parlamento", "Tutte le 23.842 parole dette almeno mille volte a Camera e Senato, 1848-2022.", "parole.js", "Parole", "Parole"),
        "parola.html": semplice("parola", "Parola · Il vocabolario del Parlamento", "Una parola nel Parlamento italiano, 1848-2022: curva, prima volta, chi la dice, frasi vere.", "parola.js", "Parole", '<a href="parole.html">Parole</a> › <span id="bric">parola</span>'),
        "anni.html": semplice("anni", "Anni · Il vocabolario del Parlamento", "I 175 anni del Parlamento, dal 1848 al 2022, con la parola di ogni anno.", "anni.js", "Anni", "Anni"),
        "anno.html": semplice("anno", "Anno · Il vocabolario del Parlamento", "Un anno del Parlamento italiano: le parole, i temi, la legislatura.", "anno.js", "Anni", '<a href="anni.html">Anni</a> › <span id="bric">anno</span>', dove=True),
        "legislature.html": semplice("legislature", "Legislature · Il vocabolario del Parlamento", "Le 50 legislature dal 1848 al 2022: Regno, Consulta, Costituente, Repubblica.", "legislature.js", "Legislature", "Legislature"),
        "legislatura.html": semplice("legislatura", "Legislatura · Il vocabolario del Parlamento", "Una legislatura del Parlamento italiano: chi parla, i partiti, le parole, i temi.", "legislatura.js", "Legislature", '<a href="legislature.html">Legislature</a> › <span id="bric">legislatura</span>', dove=True),
        "partiti.html": semplice("partiti", "Partiti · Il vocabolario del Parlamento", "I 32 partiti della Camera della Repubblica e la loro lingua, 1948-2022.", "partiti.js", "Partiti", "Partiti"),
        "partito.html": semplice("partito", "Partito · Il vocabolario del Parlamento", "La lingua di un partito alla Camera, legislatura per legislatura.", "partito.js", "Partiti", '<a href="partiti.html">Partiti</a> › <span id="bric">partito</span>', dove=True),
        "persone.html": semplice("persone", "Persone · Il vocabolario del Parlamento", "Gli oratori della Repubblica, alla Camera e al Senato: interventi, parole, partiti.", "persone.js", "Persone", "Persone"),
        "persona.html": semplice("persona", "Persona · Il vocabolario del Parlamento", "Un oratore del Parlamento: interventi, parole, partito, le parole più sue.", "persona.js", "Persone", '<a href="persone.html">Persone</a> › <span id="bric">persona</span>', dove=True),
        "temi.html": semplice("temi", "Temi · Il vocabolario del Parlamento", "I 40 temi dell'aula anno per anno e gli atlanti degli esperimenti.", "temi.js", "Temi", "Temi"),
        "tema.html": semplice("tema", "Tema · Il vocabolario del Parlamento", "Un tema dell'aula, anno per anno, dal 1848 al 2022.", "tema.js", "Temi", '<a href="temi.html">Temi</a> › <span id="bric">tema</span>', dove=True),
        "storie.html": semplice("storie", "Storie · Il vocabolario del Parlamento", "Le storie: un risultato per volta, con il grafico, le frasi vere e il limite.", "storie.js", "Storie", "Storie"),
        "storia.html": semplice("storia", "Storia · Il vocabolario del Parlamento", "Una storia del Parlamento italiano raccontata con le parole dell'aula.", "storia.js", "Storie", '<a href="storie.html">Storie</a> › <span id="bric">storia</span>', dove=True),
        "esperimenti.html": semplice("esperimenti", "Esperimenti · Il vocabolario del Parlamento", "I 153 esperimenti su 78 ipotesi, con l'esito: regge, in parte, smentita.", "esperimenti.js", "Esperimenti", "Esperimenti"),
        "esperimento.html": semplice("esperimento", "Esperimento · Il vocabolario del Parlamento", "Un esperimento: che cosa ci aspettavamo, l'esito, il numero chiave.", "esperimento.js", "Esperimenti", '<a href="esperimenti.html">Esperimenti</a> › <span id="bric">esperimento</span>'),
        "percorsi.html": semplice("percorsi", "Percorsi · Il vocabolario del Parlamento", "Quattro percorsi: il fascismo in aula, le lingue dell'aula, risate e insulti, amici e nemici dell'Italia.", "percorsi.js", "Percorsi", "Percorsi"),
        "fascismo.html": semplice("fascismo", "Il fascismo in aula · Il vocabolario del Parlamento", "Il fascismo in aula, 1922-1943: il dissenso che sparisce, le parole del regime, le legislature XXVI-XXX.", "fascismo.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Il fascismo in aula', dove=True),
        "lingue.html": semplice("lingue", "Le lingue dell'aula · Il vocabolario del Parlamento", "Il francese del Parlamento subalpino, il latino, l'inglese, le forme e le grafie antiche.", "lingue.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Le lingue dell&#39;aula', dove=True),
        "risate.html": semplice("risate", "Risate e insulti · Il vocabolario del Parlamento", "Le risate annotate dallo stenografo e gli insulti detti in aula, 1848-2022.", "risate.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Risate e insulti', dove=True),
        "esteri.html": semplice("esteri", "Amici e nemici dell'Italia · Il vocabolario del Parlamento", "Amici e nemici dell'Italia nelle parole dell'aula, 1848-2022, con le alleanze e le guerre vere.", "esteri.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Amici e nemici', dove=True),
        "primevolte.html": semplice("primevolte", "Prime volte · Il vocabolario del Parlamento", "La prima volta che l'aula dice computer, televisione, telefonino, euro, spread, intelligenza artificiale.", "primevolte.js", "Prime volte", '<a href="parole.html">Parole</a> › Prime volte'),
        "capitolo.html": semplice("capitolo", "Capitolo · Il vocabolario del Parlamento", "Un capitolo del racconto del Parlamento italiano, 1848-2022.", "capitolo.js", "", '<a href="index.html#racconto">Il racconto</a> › <span id="bric">capitolo</span>', dove=True),
        "dati.html": semplice("dati", "Dati · Il vocabolario del Parlamento", "I dati del sito da scaricare: conteggi per parola e anno, mappa dei partiti, esperimenti.", "dati.js", "Dati", "Dati"),
        "metodo.html": guscio("Metodo e limiti · Il vocabolario del Parlamento", "Come sono contate le parole, quando cambia il resoconto, il giudice automatico, i limiti dei dati.", "metodo.js", METODO, attivo="Metodo e limiti"),
        "paper.html": guscio("Paper · Il vocabolario del Parlamento", "I due working paper del progetto.", "statica.js", PAPER, attivo="Paper"),
        "404.html": guscio("Pagina non trovata · Il vocabolario del Parlamento", "Pagina non trovata.", "statica.js", '<h1 class="titolo-pagina">Questa pagina non c&#39;è</h1><p class="sommario">L&#39;indirizzo è sbagliato o la pagina è stata spostata. <a class="lk" href="parole.html">Cerca una parola</a>, oppure torna alla <a class="lk" href="index.html">prima pagina</a>.</p>'),
    }
    # testi della redazione, se convertiti da g6
    tp = os.path.join(CACHE, "testi_pagine.json")
    if os.path.exists(tp):
        T = json.load(open(tp, encoding="utf-8"))
        if T.get("metodo"):
            # i conti dei verdetti si prendono dall'elenco degli esperimenti, non dal testo
            E = json.load(open(os.path.join(DATI, "esperimenti.json"), encoding="utf-8"))
            tot = next(c for c in E["conti"] if c[0] == "Totale")
            parole_n = {1: "una", 2: "due", 3: "tre", 4: "quattro", 5: "cinque", 6: "sei", 7: "sette", 8: "otto", 9: "nove"}
            nuovo = "I conti: %d reggono, %d in parte, %d smentite. Poi %s misur%s non valid%s, %s lavor%s solo descrittiv%s, %s esperiment%s non ancora misurat%s." % (
                tot[1], tot[2], tot[3], parole_n.get(tot[4], tot[4]), "a" if tot[4] == 1 else "e", "a" if tot[4] == 1 else "e",
                "un" if tot[5] == 1 else parole_n.get(tot[5], tot[5]), "o" if tot[5] == 1 else "i", "o" if tot[5] == 1 else "i",
                "un" if tot[6] == 1 else parole_n.get(tot[6], tot[6]), "o" if tot[6] == 1 else "i", "o" if tot[6] == 1 else "i")
            T["metodo"] = re.sub(r"I conti: \d+ reggono[^<]*", nuovo, T["metodo"])
            T["metodo"] = re.sub(r"Le ipotesi sono \d+, gli esperimenti \d+", "Le ipotesi sono %d, gli esperimenti %d" % (E["n_ipotesi"], tot[7]), T["metodo"])
            corpo_m = T["metodo"].replace("<h2>Il calendario delle trascrizioni</h2>", '<h2>Il calendario delle trascrizioni</h2><div id="g-calendario"></div>', 1)
            testa_m, resto_m = METODO.split('<article class="c8 colonna-testo" id="testo-metodo">')
            aside_m = resto_m.split("</article>", 1)[1]
            pagine["metodo.html"] = guscio("Metodo e limiti · Il vocabolario del Parlamento", "Come sono contate le parole, quando cambia il resoconto, il giudice automatico, i limiti dei dati.", "metodo.js",
                                           testa_m + '<article class="c8 colonna-testo" id="testo-metodo"><h1 class="titolo-pagina" style="font-size:clamp(48px,6vw,88px)">' + T.get("metodo_titolo", "Metodo e limiti") + "</h1>" + corpo_m + "</article>" + aside_m,
                                           attivo="Metodo e limiti")
    for nome, html in pagine.items():
        open(os.path.join(SITO, nome), "w", encoding="utf-8", newline="\n").write(html)
    open(os.path.join(SITO, "robots.txt"), "w", encoding="utf-8", newline="\n").write("User-agent: *\nDisallow: /\n")
    el = scarica()
    print("pagine:", len(pagine), "file scaricabili:", len(el))
    fine()


if __name__ == "__main__":
    main()
