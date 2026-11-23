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
        ("Persone", "persone.html"), ("Temi", "temi.html"), ("Scoperte", "esperimenti.html"), ("Percorsi", "percorsi.html"), ("Fascismo", "fascismo.html"),
        ("Metodo", "metodo.html"), ("Dati", "dati.html"), ("Paper", "paper.html"), ("Il progetto", "progetto.html")]
ALIAS_MENU = {"Storie": "Scoperte", "Esperimenti": "Scoperte", "Metodo e limiti": "Metodo"}
SEZIONE = {"parole": "parole", "parola": "parole", "primevolte": "parole", "lingue": "parole", "anni": "anni", "anno": "anni",
           "legislature": "legislature", "legislatura": "legislature", "partiti": "partiti", "partito": "partiti",
           "persone": "persone", "persona": "persone", "risate": "persone", "temi": "temi", "tema": "temi", "storie": "storie",
           "storia": "storie", "fascismo": "fascismo", "esteri": "esteri"}


def guscio(titolo, descrizione, js, corpo, attivo=None, dove=False, home=False, sezione="neutra"):
    attivo = ALIAS_MENU.get(attivo, attivo)
    menu = "".join('<a href="%s"%s>%s</a>' % (h, ' class="attivo"' if t == attivo else "", t) for t, h in MENU)
    pre = ["scene.js"] if js in ("capitolo.js", "esteri.js", "lingue.js", "fascismo.js", "percorso.js") else []
    if js in ("home.js", "capitolo.js"):
        pre = pre + ["tavole.js"]  # le tavole del vocabolario illustrato (strisce, scie, figure dei capitoli)
    scripts = "".join('<script defer src="js/%s"></script>' % s for s in (["d3.min.js", "comune.js"] + pre + ([js] if js else [])))
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{titolo}</title>
<meta name="description" content="{descrizione}">
<link rel="preload" href="caratteri/AlegreyaSans-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="caratteri/AlegreyaSans-800-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="css/caratteri.css">
<link rel="stylesheet" href="css/stile.css">
<link rel="stylesheet" href="css/v2.css">
<link rel="stylesheet" href="css/v3.css">
<link rel="icon" href="data:,">
{scripts}
</head>
<body data-sezione="{sezione}"{' class="home-v"' if home else ''}>
<div class="anteprima" role="note">Anteprima, non ancora pubblicato</div>
<nav class="unghie" aria-label="Le parole dalla A alla Z">{UNGHIE}</nav>
<div class="pagina">
<header id="testata" class="testatina{' home' if home else ''}">
<div class="riga-nome"><a class="marchio" href="index.html">vocabolàrio <i>del</i> Parlaménto</a><nav class="menu" aria-label="Sezioni">{menu}</nav></div>
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


# le unghie dell'alfabeto sul bordo, come sul taglio di un dizionario: portano all'elenco delle parole con quella lettera
UNGHIE = "".join('<a href="parole.html?l=%s#lettere">%s</a>' % (l.lower(), l) for l in "ABCDEFGHILMNOPQRSTUVZ")

NOSCRIPT = '<noscript><p class="segnaposto"><b>Questa pagina si costruisce con JavaScript.</b> Le stesse cifre sono nei file della pagina <a class="lk" href="dati.html">Dati</a>.</p></noscript>'


def home():
    """La home come una pagina del vocabolario illustrato (proposta 3, più densa): il nome è una voce con la sua
    definizione, poi tavole numerate, la riga dei sette capitoli, i tagli (partiti, guerra, risate), le parole,
    il listino della parola dell'anno, i rimandi alle storie. I testi e i numeri li scrive js/home.js dai dati."""
    B = json.load(open(os.path.join(DATI, "base.json"), encoding="utf-8"))["conti"]
    n_prime = json.load(open(os.path.join(DATI, "prime", "mappa.json"), encoding="utf-8"))["n"]
    n_espr = len(json.load(open(os.path.join(DATI, "prime", "espressioni.json"), encoding="utf-8")))
    it = lambda x: "{:,}".format(x).replace(",", ".")
    conto_a = "%s milioni di parole, %s interventi, %s sedute" % (str(B["parole_milioni"]).replace(".", ","), it(B["interventi"]), it(B["sedute"]))
    conto_b = "%s parole e %d espressioni; le %s dette almeno mille volte hanno anche la curva anno per anno" % (it(n_prime), n_espr, it(B["parole"]))
    corpo = f"""<section class="frontespizio" aria-label="Che cos'è il vocabolario">
<div class="definizione"><h1>vocabolàrio <i>del</i> Parlaménto</h1><span class="pron"><i class="gram">s. m.</i></span>
<p class="def"><b class="n">1</b> Raccolta delle parole dette alla Camera e al Senato dal 1848 al 2022: <span id="conto-a">{conto_a}</span>. <b class="n">2</b> Racconto in sette capitoli di come cambia la lingua dell'aula, da «messieurs» a «noi cittadini». <b class="n">3</b> Archivio in cui ogni parola detta almeno dieci volte ha la sua voce, con la prima volta: <span id="conto-b">{conto_b}</span>.</p></div>
<div class="cerca-box"><form class="cerca" action="parola.html" method="get" role="search"><label for="q">Cerca una voce</label><div><input id="q" name="p" type="search" autocomplete="off" placeholder="patria, spread, camerati" list="sugg-home"><datalist id="sugg-home"></datalist><button type="submit">Cerca</button></div></form>
<p class="abbr"><b>Abbr.</b> <i>cap.</i> capitolo · <i>tav.</i> tavola · <i>neol.</i> nata dopo il 1990 · <b>†</b> morta con l'Ottocento · <span class="sm">■</span> smentita · → vedi · <b class="blu">in blu</b> le voci con una pagina</p></div>
</section>
<section class="blocco g12" aria-label="Tavola prima: parole a confronto">
<figure class="tavola s9" id="asse"><figcaption><span class="num">Tav. I</span> <span id="asse-tit">Parole a confronto, dal 1848 al 2022</span></figcaption>
{NOSCRIPT}</figure>
<div class="s3"><div id="tre"></div><h2 class="rubrica">In breve</h2><ol class="brevi" id="brevi"></ol></div>
</section>
<section class="blocco" id="racconto" aria-label="Il racconto in sette capitoli"><h2 class="titolo-sezione">Il racconto, in sette capitoli <span id="riga-racconto"></span></h2>
<div class="sette" id="sette"></div></section>
<section class="blocco g12" id="esteri-home" aria-label="Tavola seconda: amici e nemici">
<figure class="tavola s8"><figcaption><span class="num">Tav. II</span> <a href="esteri.html" id="am-titolo">Amici e nemici dell'Italia</a></figcaption><div class="leg" id="leg"></div><div id="g-strisce"></div>
<p class="did">Come l'aula parla di sette paesi, anno per anno: sopra la riga quando accanto al nome ci sono parole da nemico, sotto quando sono da amico (media di tre anni). Per la Jugoslavia il segno lo dà il giudice automatico. <a href="esteri.html">I sedici paesi, uno per uno →</a></p></figure>
<figure class="tavola media s4"><figcaption><span class="num">Tav. III</span> <a id="gu-titolo" href="storia.html?id=missione-o-guerra">Missione o guerra</a></figcaption><div id="g-manubri"></div>
<p class="did" id="gu-did"></p></figure>
</section>
<section class="blocco g12" aria-label="Partiti, risate, smentite">
<figure class="tavola media s5"><figcaption><span class="num">Tav. IV</span> <a href="partiti.html">A chi somiglia la lingua dei partiti, 1996-2022</a></figcaption><div id="g-somiglia-home"></div>
<p class="did">In ogni casella il partito di un'altra famiglia che parla più simile, con la sua legislatura e la vicinanza (intorno a 1: come un partito con sé stesso nella legislatura dopo). Dalle parole, non dai voti. <a href="partiti.html">Tutti i partiti, dal 1948 →</a></p></figure>
<figure class="tavola media s4"><figcaption><span class="num">Tav. V</span> <a id="ri-titolo" href="risate.html">Chi fa ridere più del previsto</a></figcaption><p class="voce" id="ri-spiega"></p><div id="g-risate"></div>
<p class="did">Risate annotate durante i suoi interventi divise per quelle che ci si aspetta: 1 vuol dire come l'aula del suo tempo. Oratori con almeno 200.000 parole. <a href="risate_migliori.html">Le risate migliori, scelte leggendo →</a></p></figure>
<div class="s3"><h2 class="rubrica">Ci aspettavamo altro</h2><ul class="brevi" id="smentite"></ul><h2 class="rubrica"><a href="esperimenti.html"><span id="n-esp"></span> esperimenti</a></h2><div id="g-verdetti"></div>
<p class="did"><i class="q pieno"></i> regge <i class="q mezzo"></i> in parte <i class="q rosso"></i> smentita <i class="q vuoto"></i> altri</p></div>
</section>
<section class="blocco" id="parole" aria-label="Le parole"><h2 class="titolo-sezione">Le parole <span>venti voci in ordine di anno di punta; poi quelle che crescono dopo il 1990 e le morte con l'Ottocento</span> <small><a href="parole.html">tutte le <b data-conto="parole"></b> voci</a> · <a href="primevolte.html">prime volte</a></small></h2>
<div class="g12"><div class="s6 voci-due" id="venti"></div><div class="s3"><h2 class="rubrica">Cresciute dopo il 1990</h2><div id="nate" class="lemmi"></div></div><div class="s3"><h2 class="rubrica">Morte con l'Ottocento</h2><div id="morte" class="lemmi"></div></div></div></section>
<section class="blocco" id="anni" aria-label="La parola dell'anno"><h2 class="titolo-sezione">La parola dell'anno, dal 1848 al 2022 <span>quella detta molto più del solito; una su quindici racconta un evento, le altre sono leggi, procedure, nomi</span> <small><a href="anni.html">tutti i 175 anni</a></small></h2>
<div class="listino" id="listino"></div></section>
<section class="blocco g12" aria-label="Percorsi, frase, risate">
<div class="s4"><h2 class="rubrica"><a href="percorsi.html">Otto percorsi</a></h2><div class="percorsi-voci" id="percorsi-voci"></div></div>
<figure class="tavola media s4"><figcaption><span class="num">Tav. VI</span> <a id="fr-titolo" href="storia.html?id=repubblica-non-si-semplifica">La frase della Camera</a></figcaption><div id="g-frasi"></div><p class="did">Parole per frase alla Camera, una tacca per legislatura. In grigio il Parlamento di Torino.</p></figure>
<div class="s4"><h2 class="rubrica"><a href="risate_migliori.html">Le risate migliori</a></h2><div id="risate-scelte"></div><p class="did"><a href="risate_migliori.html">Tutte le risate e gli insulti scelti, epoca per epoca →</a></p></div>
</section>
<section class="blocco" id="storie-home" aria-label="Vedi anche: le storie"><h2 class="titolo-sezione">Vedi anche <span id="n-storie"></span> <small><a href="esperimenti.html">tutte le <b data-conto="storie"></b> storie, esperimento per esperimento</a></small></h2>
<div class="g12"><div class="s9" id="muro"></div>
<div class="s3"><h2 class="rubrica">Le sezioni</h2><ul class="sezioni" id="sezioni"></ul><h2 class="rubrica">Chi parla di più</h2><div id="g-oratori"></div><p class="did">Interventi alla Camera, 1948-2022. In rosso i deputati radicali della VII legislatura: chi fa ostruzionismo sale in classifica.</p></div></div></section>
<section class="blocco" id="chiusa" aria-label="Lo stenografo"><p class="chiusa-riga"><span class="lemma nero">stenografo</span> <i class="gram">s. m.</i> Chi scrive quello che l'aula dice: <span id="riga-steno"></span> <span id="chiusa-frasi"></span> <a href="metodo.html">→ Metodo e limiti</a></p></section>"""
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
           [[x["filone"], x["cod"], x["titolo"], x["attesa"], x["esito"], x["numero"]] for x in e["elenco"]], "I %d esperimenti con l'esito" % len(e["elenco"]))
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


# ---------------------------------------------------------------------------------------------------------------------
# Missione o guerra: chi governa e chi sta all'opposizione durante ogni operazione.
# Periodi delle operazioni: gli stessi dell'esperimento H68 (script/481_h68_estrai.py del progetto, costante OPS).
# Governi e partiti: dati/legislature/*.json (campo governi, stato di ogni partito: G governo, O opposizione), da
# risultati/h33_tabella_partiti_governo.csv. Partiti dell'opposizione: quelli con almeno il 3% delle parole della
# legislatura (mappa dei partiti) che stanno all'opposizione del primo governo del periodo.
# ---------------------------------------------------------------------------------------------------------------------
OPERAZIONI_H68 = {"Golfo 1990-91": ("1990-08-02", "1991-07-31"), "Somalia": ("1992-12-01", "1994-06-30"), "Bosnia": ("1995-06-01", "1996-12-31"),
                  "Albania": ("1997-03-01", "1997-12-31"), "Kosovo": ("1999-02-01", "1999-12-31"), "Afghanistan": ("2001-09-12", "2021-12-31"),
                  "Iraq 2003-06": ("2003-01-01", "2006-12-31"), "Libano 2006": ("2006-07-12", "2007-12-31"), "Libia 2011": ("2011-02-15", "2011-12-31"),
                  "ISIS": ("2014-06-10", "2022-12-31")}
NOME_P = {"PDS/DS/PD": "PDS-DS-PD", "FI/PdL": "FI-PdL", "UDC/CCD": "CCD-UDC", "SEL/LeU/SI": "SEL-LeU", "Unita' Socialista": None, "PSI-PSDI unificati": None,
          "PSI-PSDI/PSIUP": None, "SEL": None, "Rosa nel Pugno": None}


def governi_h68():
    import glob as _g
    gov, legs = [], []
    for f in sorted(_g.glob(os.path.join(DATI, "legislature", "repubblica-*.json"))):
        L = json.load(open(f, encoding="utf-8"))
        legs.append(L)
        for g in L.get("governi") or []:
            gov.append((g, L))
    out = {}
    for op, (a, b) in OPERAZIONI_H68.items():
        nome_g = lambda s: re.sub(r"\s*[\(\[].*$", "", s).replace("Governo ", "").strip()
        scelti = {}
        for g, L in sorted(gov, key=lambda x: x[0]["da"]):
            if g["da"] <= b and g["a"] >= a:
                k = nome_g(g["governo"])
                # lo stesso governo può stare in due legislature: si tiene quella iniziata più tardi
                if k not in scelti or L["da"] > scelti[k][1]["da"]:
                    scelti[k] = (g, L)
        gs = sorted(scelti.values(), key=lambda x: x[0]["da"])
        if not gs:
            continue
        partiti_g, partiti_o = [], []
        for g, L in gs:
            for p, st in g["stati"].items():
                n = NOME_P.get(p, p)
                if st == "G" and n and n not in partiti_g:
                    partiti_g.append(n)
        g0, L0 = gs[0]
        grandi = [r["p"] for r in sorted(L0.get("partiti") or [], key=lambda r: -(r.get("quota") or 0)) if (r.get("quota") or 0) >= 0.03]
        for p in grandi:
            n = NOME_P.get(p, p)
            if g0["stati"].get(p) == "O" and n and n not in partiti_o:
                partiti_o.append(n)
        out[op] = {"da": a, "a": b, "governi": [nome_g(g["governo"]) for g, L in gs], "governo": partiti_g, "opposizione": partiti_o,
                   "tecnico": [nome_g(g["governo"]) for g, L in gs if not any(s == "G" for s in g["stati"].values())]}
    scrivi_json("sezioni/h68_governi.json", out)


# ---------------------------------------------------------------------------------------------------------------------
# Le risate e gli insulti migliori: la scelta fatta leggendo le frasi (_genera/risate_migliori.json); qui si ricontrolla
# ogni frase con il filtro di qualità e si passa al sito. Le frasi sono copiate dai dati delle risate e degli insulti.
# ---------------------------------------------------------------------------------------------------------------------
def risate_migliori():
    f = os.path.join(os.path.dirname(os.path.abspath(__file__)), "risate_migliori.json")
    if not os.path.exists(f):
        return
    R = json.load(open(f, encoding="utf-8"))
    out = {}
    for k in ("risate", "insulti"):
        tenute = []
        for v in R.get(k, []):
            testo = re.sub(r"\[[^\]]*\]", "", v.get("frase", ""))
            if not frase_pulita(testo):
                continue
            tenute.append({c: v.get(c, "") for c in ("epoca", "data", "ramo", "oratore", "pid", "partito", "frase", "contesto")})
        out[k] = tenute
    out["nomi"] = R.get("nomi", {})
    out["lette"] = len(json.load(open(os.path.join(DATI, "sezioni", "risate.json"), encoding="utf-8"))["frasi"])
    scrivi_json("sezioni/risate_migliori.json", out)
    return len(out["risate"]), len(out["insulti"])


def progetto():
    """La pagina «Il progetto»: la scala del lavoro (tutti i numeri dai dati del sito), i metodi, le fonti."""
    B = json.load(open(os.path.join(DATI, "base.json"), encoding="utf-8"))["conti"]
    E = json.load(open(os.path.join(DATI, "esperimenti.json"), encoding="utf-8"))
    tot = next(c for c in E["conti"] if c[0] == "Totale")
    n_prime = json.load(open(os.path.join(DATI, "prime", "mappa.json"), encoding="utf-8"))["n"]
    n_espr = len(json.load(open(os.path.join(DATI, "prime", "espressioni.json"), encoding="utf-8")))
    n_storie = len(json.load(open(os.path.join(DATI, "storie", "indice.json"), encoding="utf-8"))["storie"])
    it = lambda x: "{:,}".format(int(x)).replace(",", ".")
    numeri = [
        (it(len(ANNI)), "anni di resoconti", "dall'8 maggio 1848, Parlamento subalpino, al 2022"),
        (it(B["interventi"]), "interventi", "ogni volta che qualcuno prende la parola in aula"),
        (str(B["parole_milioni"]).replace(".", ","), "milioni di parole", "dette alla Camera e al Senato e contate una per una"),
        (it(B["sedute"]), "sedute", "in " + it(B["archivi"]) + " archivi di legislatura"),
        (it(B["parole"]), "parole con la curva", "dette almeno mille volte: per ognuna, anno per anno, Camera e Senato"),
        (it(n_prime), "prime volte", "le parole dette almeno dieci volte, con la data, chi la dice e la frase; più " + str(n_espr) + " espressioni"),
        (it(B["persone"]), "persone", "gli oratori riconosciuti, con partito e legislature"),
        (it(B["legislature"]), "legislature", "trenta del Regno, la Consulta, la Costituente, diciotto della Repubblica"),
        (it(B["partiti"]), "partiti", "della Camera della Repubblica, in " + it(B["schede_partito"]) + " schede per legislatura"),
        (it(tot[7]), "esperimenti", "su " + it(E["n_ipotesi"]) + " ipotesi scritte prima di guardare i dati: " + "%d reggono, %d in parte, %d smentite" % (tot[1], tot[2], tot[3])),
        (it(n_storie), "storie", "un risultato per volta, con il grafico, le frasi vere e il limite"),
        (it(B["temi"]), "temi", "trovati da un programma che raggruppa le parole che compaiono insieme"),
    ]
    celle = "".join('<li><b>%s</b> %s<span>%s</span></li>' % n for n in numeri)
    return f"""<div class="briciole"><a href="index.html">Home</a> › Il progetto</div>
<h1 class="titolo-pagina">Il progetto</h1>
<p class="sommario">Il vocabolario del Parlamento legge tutti i resoconti stenografici di Camera e Senato dal 1848 al 2022 e conta le parole: quali nascono, quali muoiono, chi le dice, come cambia la lingua dell'aula con il Regno, il fascismo, la Repubblica. Non è un'antologia di discorsi: è l'archivio intero, misurato.</p>
<section class="sezione"><div class="testa"><h2>La scala del lavoro</h2></div><ul class="scala">{celle}</ul></section>
<section class="sezione griglia">
<div class="c7 colonna-testo">
<h2>Come è fatto</h2>
<p><b>I testi.</b> Un file per seduta, ricavato in gran parte dalle scansioni delle pagine stampate. La pulizia tiene solo i discorsi: decreti letti, votazioni, elenchi e tabelle sono messi da parte; applausi, proteste e risate sono tolti dal testo ma contati. Corregge gli errori dello scanner, mai la lingua.</p>
<p><b>Le parole.</b> Ogni parola si conta nello stesso ramo e nello stesso anno e si divide per le parole dette: le curve dicono quante volte ogni milione di parole. Un anno entra solo se il ramo ha almeno 300.000 parole.</p>
<p><b>Le prime volte.</b> La prima volta di una parola è il primo intervento dal primo anno in cui la parola compare almeno tre volte in tre anni. Per le parole nuove le prime comparse sono state rilette, per trovare la prima nel senso di oggi.</p>
<p><b>Chi parla.</b> Ogni intervento è legato a una persona e, alla Camera della Repubblica, al suo partito, con gli elenchi ufficiali di Camera e Senato.</p>
<p><b>I partiti sulla mappa.</b> Ogni partito, in ogni legislatura, è un insieme di parole: una mappa mette vicini i partiti che usano le stesse parole. Le due direzioni principali sono governo e opposizione, sinistra e destra.</p>
<p><b>Gli esperimenti.</b> Ogni ipotesi è scritta prima di guardare i dati, con la regola che la smentirebbe. Le prove con le date finte dicono se un salto è vero. Per le domande sul tono (un paese è trattato da amico o da nemico?) un giudice automatico legge le frasi intere; vale solo se supera due controlli fissati prima.</p>
<p><b>Lo stenografo.</b> Il resoconto non è una registrazione: le regole di chi scrive cambiano nel tempo. Il calendario dei cambi di trascrizione è segnato nei grafici, e ogni capitolo dice dove il resoconto può ingannare.</p>
<p>Tutto il metodo, con i limiti: <a class="lk" href="metodo.html">Metodo e limiti</a>. I dati da scaricare: <a class="lk" href="dati.html">Dati</a>. I due working paper: <a class="lk" href="paper.html">Paper</a>.</p>
</div>
<aside class="c5 fil">
<h2 class="rubrica">Le fonti</h2>
<ul class="fatti">
<li><b>Archivio IPSA</b>, Fondazione Bruno Kessler<span class="et">i resoconti stenografici di Camera e Senato, 1848-2022, licenza CC BY 3.0</span></li>
<li><b>ItaParlCorpus</b><span class="et">persona e partito degli interventi della Camera della Repubblica, licenza CC0</span></li>
<li><b>dati.camera.it e dati.senato.it</b><span class="et">elenchi ufficiali di deputati, senatori e membri del governo</span></li>
<li><b>Wikidata</b><span class="et">nomi, date e collegamenti delle persone</span></li>
<li><b>Correlates of War</b><span class="et">alleanze e guerre, per il percorso Amici e nemici</span></li>
</ul>
<h2 class="rubrica">Dove si entra</h2>
<ul class="fatti">
<li><a href="index.html#racconto">Il racconto in sette capitoli</a><span class="et">dal francese del 1848 alla lingua di oggi</span></li>
<li><a href="parole.html">Le parole</a><span class="et">ogni parola con la sua curva, le frasi vere, chi la dice</span></li>
<li><a href="esperimenti.html">Che cosa abbiamo scoperto</a><span class="et">gli esperimenti con le loro storie</span></li>
<li><a href="percorsi.html">I percorsi</a><span class="et">il fascismo in aula, amici e nemici, le lingue, risate e insulti, e altri quattro</span></li>
</ul>
</aside>
</section>"""


def sintesi_legislature():
    """Che cosa distingue ogni legislatura, in poche righe, per la pagina indice: le parole più tipiche (le più frequenti
    rispetto alle altre legislature, tra quelle dette almeno 700 volte), chi parla di più alla Camera, i temi che salgono,
    i governi. Tutto dai file dati/legislature/*.json (scritti da g3)."""
    import glob as _g
    out = []
    for f in _g.glob(os.path.join(DATI, "legislature", "*.json")):
        if f.endswith("sintesi.json"):
            continue
        L = json.load(open(f, encoding="utf-8"))
        tip = sorted([r for r in (L.get("parole_tipiche") or []) if r[2] >= 700 and len(r[0]) >= 4], key=lambda r: -(r[3] / max(r[4], 0.1)))[:7]
        orc = (L.get("oratori") or {}).get("camera") or (L.get("oratori") or {}).get("senato") or []
        orc = [o for o in orc if "RICONOSCIUT" not in str(o[1]).upper() and not str(o[1]).upper().startswith(("MINISTRO", "PRESIDENTE", "RELATORE"))]
        gov = [re.sub(r"\s*[\(\[].*$", "", g["governo"]).replace("Governo ", "") for g in (L.get("governi") or [])]
        gov = [g for k, g in enumerate(gov) if g not in gov[:k]]
        out.append({"id": L["id"], "nome": L["nome"], "epoca": L["epoca"], "n": L["n"], "da": L["da"], "a": L["a"],
                    "tipiche": [r[1] if isinstance(r[1], str) and r[1] else r[0] for r in tip],
                    "oratore": [orc[0][1], orc[0][0]] if orc else None,
                    "temi": [t[1] for t in (L.get("temi_su") or [])[:2]], "governi": gov})
    ordine = {"regno": 0, "consulta": 1, "costituente": 2, "repubblica": 3}
    out.sort(key=lambda x: (x["da"], ordine.get(x["epoca"], 9), x["n"]))
    scrivi_json("legislature/sintesi.json", out)


# ---------------------------------------------------------------------------------------------------------------------
# Attribuzioni corrette: frasi che il resoconto mette nel turno sbagliato (sigla dell'oratore rovinata dallo scanner) o
# legate all'omonimo sbagliato. Ogni correzione è verificata sul testo dei turni e sull'anagrafe (_genera/correzioni_oratori.json,
# con la prova). Si applica a tutte le frasi del sito che portano data, ramo e oratore: risate, insulti, frasi delle parole,
# prime volte, francese, frasi dei partiti.
# ---------------------------------------------------------------------------------------------------------------------
def applica_correzioni_oratori():
    import glob as _g
    fc = os.path.join(os.path.dirname(os.path.abspath(__file__)), "correzioni_oratori.json")
    if not os.path.exists(fc):
        return 0
    C = json.load(open(fc, encoding="utf-8"))["correzioni"]
    per_data = {}
    for c in C:
        c["_tutte"] = str(c.get("tutte_le_frasi_del_giorno")).lower() == "true"
        c["_inizio"] = re.sub(r"\s+", " ", (c.get("frase_inizia") or "")).strip().lower()[:30]
        per_data.setdefault(c["data"], []).append(c)
    pulisci = lambda t: re.sub(r"^[…\.\s«\"']+", "", re.sub(r"\s+", " ", t)).lower()

    def correggi(v):
        if not (isinstance(v, list) and len(v) >= 4 and isinstance(v[0], str) and v[0][:10] in per_data and v[1] in ("camera", "senato")):
            return False
        for c in per_data[v[0][:10]]:
            if c["ramo"] != v[1]:
                continue
            vecchio = c["chi_era"].lower()
            k = next((i for i in range(2, len(v)) if isinstance(v[i], str) and v[i].strip().lower() == vecchio), None)
            if k is None:
                continue
            if not c["_tutte"] and not any(isinstance(x, str) and len(x) > 25 and pulisci(x).startswith(c["_inizio"]) for x in v):
                continue
            if vecchio.startswith("camera:"):  # l'oratore è riconosciuto per persona: cambia la persona e il nome prima
                v[k] = c.get("pid") or ""
                if k - 1 >= 2 and isinstance(v[k - 1], str):
                    v[k - 1] = c["chi_e"] if not v[k - 1].isupper() else c["chi_e"].upper()
            else:
                v[k] = c["chi_e"].upper() if v[k].isupper() else c["chi_e"]
                if len(v) > k + 2 and isinstance(v[k + 1], str) and (v[k + 1] == "" or v[k + 1].startswith("camera:")):
                    v[k + 1] = c.get("pid") or ""
                    if len(v) > k + 3 and isinstance(v[k + 2], str) and len(v[k + 2]) < 25 and c.get("partito"):
                        v[k + 2] = c["partito"]
            return True
        return False

    def cammina(x):
        n = 0
        if isinstance(x, list):
            if correggi(x):
                n += 1
            for y in x:
                n += cammina(y)
        elif isinstance(x, dict):
            for y in x.values():
                n += cammina(y)
        return n

    tot = 0
    for f in (_g.glob(os.path.join(DATI, "sezioni", "*.json")) + _g.glob(os.path.join(DATI, "sezioni", "insulti", "*.json")) +
              _g.glob(os.path.join(DATI, "prime", "d", "*.json")) + _g.glob(os.path.join(DATI, "parole", "d", "*.json")) +
              _g.glob(os.path.join(DATI, "partiti", "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        n = cammina(d)
        if n:
            scrivi_json(os.path.relpath(f, DATI).replace(os.sep, "/"), d)
            tot += n
    return tot


def main():
    ESP = json.load(open(os.path.join(DATI, "esperimenti.json"), encoding="utf-8"))
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
        "storie.html": semplice("esperimenti", "Che cosa abbiamo scoperto · Il vocabolario del Parlamento", "Le storie del Parlamento italiano, esperimento per esperimento: che cosa ci aspettavamo, che cosa abbiamo trovato.", "esperimenti.js", "Scoperte", "Che cosa abbiamo scoperto"),
        "storia.html": semplice("storia", "Storia · Il vocabolario del Parlamento", "Una storia del Parlamento italiano raccontata con le parole dell'aula.", "storia.js", "Storie", '<a href="storie.html">Storie</a> › <span id="bric">storia</span>', dove=True),
        "esperimenti.html": semplice("esperimenti", "Che cosa abbiamo scoperto · Il vocabolario del Parlamento", "I %d esperimenti su %d ipotesi, con l'esito e le storie che li raccontano." % (len(ESP["elenco"]), ESP["n_ipotesi"]), "esperimenti.js", "Scoperte", "Che cosa abbiamo scoperto"),
        "esperimento.html": semplice("esperimento", "Esperimento · Il vocabolario del Parlamento", "Un esperimento: che cosa ci aspettavamo, l'esito, il numero chiave.", "esperimento.js", "Esperimenti", '<a href="esperimenti.html">Esperimenti</a> › <span id="bric">esperimento</span>'),
        "percorsi.html": semplice("percorsi", "Percorsi · Il vocabolario del Parlamento", "Otto percorsi: le lingue dell'aula, il fascismo in aula, la Prima Repubblica, i partiti, amici e nemici, risate e insulti, parole che nascono e muoiono, il resoconto che inganna.", "percorsi.js", "Percorsi", "Percorsi"),
        "percorso.html": semplice("percorso", "Percorso · Il vocabolario del Parlamento", "Un percorso dentro l'archivio dei resoconti: una domanda, un grafico e una fila di storie.", "percorso.js", "Percorsi", '<a href="percorsi.html">Percorsi</a>'),
        "fascismo.html": semplice("fascismo", "Il fascismo in aula · Il vocabolario del Parlamento", "Il fascismo in aula, 1922-1943: il dissenso che sparisce, le parole del regime, le legislature XXVI-XXX.", "fascismo.js", "Fascismo", "Il fascismo in aula", dove=True),
        "lingue.html": semplice("lingue", "Le lingue dell'aula · Il vocabolario del Parlamento", "Il francese del Parlamento subalpino, il latino, l'inglese, le forme e le grafie antiche.", "lingue.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Le lingue dell&#39;aula', dove=True),
        "risate.html": semplice("risate", "Risate e insulti · Il vocabolario del Parlamento", "Le risate annotate dallo stenografo e gli insulti detti in aula, 1848-2022.", "risate.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Risate e insulti', dove=True),
        "esteri.html": semplice("esteri", "Amici e nemici dell'Italia · Il vocabolario del Parlamento", "Amici e nemici dell'Italia nelle parole dell'aula, 1848-2022, con le alleanze e le guerre vere.", "esteri.js", "Percorsi", '<a href="percorsi.html">Percorsi</a> › Amici e nemici', dove=True),
        "risate_migliori.html": semplice("risate", "Le risate migliori · Il vocabolario del Parlamento", "Le risate e gli insulti migliori del Parlamento italiano, 1848-2022, scelti leggendo i resoconti.", "risatemigliori.js", "Percorsi", '<a href="risate.html">Risate e insulti</a> › Le risate migliori'),
        "progetto.html": guscio("Il progetto · Il vocabolario del Parlamento", "Il vocabolario del Parlamento: 175 anni di resoconti di Camera e Senato, i numeri, i metodi, le fonti.", "statica.js", progetto(), attivo="Il progetto"),
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
            # la lettura delle prime comparse delle parole nuove (g9b): metodo e conti, dal file della lettura
            fs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prime_senso.json")
            if os.path.exists(fs):
                PS = json.load(open(fs, encoding="utf-8"))
                cs = {k: sum(1 for v in PS.values() if v.get("stato") == k) for k in ("confermata", "corretta", "non nuova", "incerta")}
                corpo_m += ("<h2>La prima volta nel senso di oggi</h2><p>La regola della prima volta è automatica, e per le parole nuove a volte trova un altro significato "
                            "o un errore di lettura: «euro» compare nel 1848 come pezzo di un cognome, la «banda larga» nel 1991 è la banda del cambio della lira. "
                            "Per le %d parole che il sito presenta come nuove (le prime volte, le parole della prima pagina, quelle la cui curva comincia dal 1990) "
                            "un programma ha riletto le prime comparse in ordine di data e ha scelto la prima nel senso di oggi. È una lettura automatica, "
                            "dichiarata parola per parola con la data vecchia, la data nuova e il motivo: %d prime volte sono confermate, %d corrette, "
                            "%d parole risultano non nuove (c'erano già e crescono dopo), %d restano incerte e non hanno una data. Dove una parola ha anche "
                            "un senso antico, la sua pagina dà tutte e due le date.</p>") % (len(PS), cs["confermata"], cs["corretta"], cs["non nuova"], cs["incerta"])
            testa_m, resto_m = METODO.split('<article class="c8 colonna-testo" id="testo-metodo">')
            aside_m = resto_m.split("</article>", 1)[1]
            pagine["metodo.html"] = guscio("Metodo e limiti · Il vocabolario del Parlamento", "Come sono contate le parole, quando cambia il resoconto, il giudice automatico, i limiti dei dati.", "metodo.js",
                                           testa_m + '<article class="c8 colonna-testo" id="testo-metodo"><h1 class="titolo-pagina" style="font-size:clamp(48px,6vw,88px)">' + T.get("metodo_titolo", "Metodo e limiti") + "</h1>" + corpo_m + "</article>" + aside_m,
                                           attivo="Metodo e limiti")
    for nome, html in pagine.items():
        open(os.path.join(SITO, nome), "w", encoding="utf-8", newline="\n").write(html)
    open(os.path.join(SITO, "robots.txt"), "w", encoding="utf-8", newline="\n").write("User-agent: *\nDisallow: /\n")
    # prime volte nel senso di oggi: il file della lettura (g9b) passa al sito così com'è
    fs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "prime_senso.json")
    if os.path.exists(fs):
        PS = json.load(open(fs, encoding="utf-8"))
        fn = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nomi_propri.txt")
        np_ = set(w for r in open(fn, encoding="utf-8") if not r.startswith("#") for w in r.split()) if os.path.exists(fn) else set()
        for w, v in PS.items():
            if w in np_:
                v["np"] = True  # nome proprio: niente «neol.», fuori dagli elenchi delle parole nuove
        scrivi_json("prime/senso.json", PS)
    # la tabella di «Missione o guerra» con tutte e dieci le operazioni (g3 ora legge anche i numeri con il punto delle
    # migliaia): si riscrive solo quel campo della home, così non serve rifare tutto g3
    from g3_sito import tabella_h68
    fh = os.path.join(DATI, "home.json")
    Hh = json.load(open(fh, encoding="utf-8"))
    Hh["h68"] = tabella_h68()
    scrivi_json("home.json", Hh)
    governi_h68()
    sintesi_legislature()
    nc = applica_correzioni_oratori()
    if nc:
        print("frasi con l'oratore corretto:", nc)
    nr = risate_migliori()
    if nr:
        print("risate e insulti migliori:", nr)
    el = scarica()
    print("pagine:", len(pagine), "file scaricabili:", len(el))
    fine()


if __name__ == "__main__":
    main()
