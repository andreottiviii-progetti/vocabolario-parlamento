# Come si rifà il sito

Tutti i numeri del sito vengono da file generati dai programmi di questa cartella, che leggono le fonti del progetto in `D:\vocabolario-parlamento` (solo lettura). Nelle pagine non ci sono numeri scritti a mano: se nel progetto cambia un dato, un numero o un verdetto, basta rifare il sito.

## Un comando solo

- **Tutto:** `python -I _genera/rifai_tutto.py` (oppure doppio clic su `RIFAI_SITO.bat`, scelta 1). La scansione dei turni (la parte lunga, circa 10 minuti con 3 processi) si rifà da sola solo se i turni o i conteggi delle parole sono cambiati; con `--da-capo` si rifà comunque.
- **Solo storie e testi fissi** (dopo una modifica in `_progetto/`): `python -I _genera/rifai_tutto.py --storie` (oppure `RIFAI_SITO.bat`, scelta 2).
- Alla fine il programma controlla che nessun file superi 2 MB, che ogni pagina abbia il noindex e che nei file pubblici non ci siano parole vietate. Se scrive «TUTTO A POSTO» si può pubblicare.
- Poi: `git add -A`, `git commit`, `git push` (GitHub Pages si aggiorna da solo).

Ordine dei programmi: `g1_parole.py` → `g2_scansione.py` → `g4_parole.py` → `g3_sito.py` → `g3b_distanze.py` → `g7_scansione2.py` → `g8_sezioni.py` → `g9_prime_volte.py` → `g6b_tabelline.py` → `g6c_correzioni.py` → `g6_storie.py` → `g5_pagine.py` → `g11_home_veloce.py`; poi `g10_rapporti.py` scrive in `_progetto/` la copertura dei risultati e il conto delle frasi scartate. I file intermedi stanno in `_genera/cache/` (fuori dal repository).

Le storie con il marcatore `[DA VERIFICARE` non vengono pubblicate: `g6` le salta e le elenca in `_genera/cache/storie_rapporto.txt`. Tolto il marcatore, basta il comando «solo storie».

## Da dove viene ogni dato

| Dato del sito | File del sito | File di origine nel progetto | Programma |
|---|---|---|---|
| Curve delle parole (volte per anno, Camera e Senato) | `dati/parole/c/*.json`, `scarica/conteggi_*.csv` | `misure/parole/unigrammi/*.parquet` | g1, g4 |
| Denominatore delle curve (parole per anno) | `dati/base.json` (`tot`), `scarica/parole_denominatori.csv` | `misure/parole/totali/*.parquet` (stessi filtri di `script/140_andamento_parola.py`) | g1 |
| Elenco delle 23.842 parole, anno di punta, anno di partenza | `dati/parole/indice.json`, `scarica/parole.csv` | `misure/parole/unigrammi`; regola della prima comparsa stabile di `script/91_prima_occorrenza.py` | g1 |
| Parole con la stessa storia | `dati/parole/d/*.json` (`vi`) | curve di g1 | g1 |
| Prima volta, frasi vere, forma con gli accenti | `dati/parole/d/*.json` (`pv`, `fr`) | `base_pulita/turni/*.parquet` | g2, g4 |
| Chi dice una parola | `dati/parole/d/*.json` (`or`) | `base_pulita/turni`, `misure/persone/turni_*.parquet` (persona di ogni intervento) | g2, g4 |
| Partiti che dicono una parola | `dati/parole/d/*.json` (`pa`) | `misure/persone/turni_camera_repubblica_*.parquet` (partito) | g2, g4 |
| Nomi delle persone | `dati/persone/*.json` | `misure/persone/persona_partito_leg.parquet`, `itaparl_aggancio.parquet`, `senato_gruppo_periodi.parquet`, `dati/elenchi_parlamentari/senato/senatori_leg_*.json` | g4, g3 |
| Persone: interventi, parole, partito, ruoli, Wikipedia | `dati/persone/*.json` | `misure/persone/unita_persona.parquet`, `itaparl_aggancio.parquet` | g3 |
| Parole più sue (persone e partiti) | `dati/persone/*.json`, `dati/partiti/*.json` | scansione dei turni (g2) | g4, g3 |
| Totali: interventi, parole, sedute | `dati/base.json` (`conti`) | `risultati/pulizia_riepilogo.csv` | g3 |
| Archivi e legislature (interventi, parole, frasi, lettere) | `dati/base.json`, `dati/legislature/*.json`, `scarica/legislature.csv` | `risultati/serie_h2_legislature.csv` | g3 |
| Calendario dei cambi di trascrizione | `dati/base.json` (`trascrizione`) | calendario rivisto: `risultati/calendario_h65/590_calendario_rivisto.csv` (provati: stato RESTA; cambi di scrittura: RESTA_GP, RESTA_G_COMUNE) e `590_inizi_tabella.csv` (incerte, non disegnate); nota `note_calendario_e_h65.md` | g3 |
| Governi | `dati/legislature/*.json`, `dati/partiti/*.json` | `risultati/h33_tabella_partiti_governo.csv` | g3 |
| Mappa dei partiti, quote, somiglianze | `dati/legislature/*.json`, `dati/partiti/*.json`, `scarica/mappa_partiti.csv` | `risultati/mappa_partiti_mappa_unica_relativa.csv`, `mappa_partiti_mappe_legislature.csv`, `mappa_partiti_somiglianze.csv` | g3 |
| Quote di parole ricontate (tutti i ruoli e solo parlamentari) | `dati/legislature/*.json` | `misure/persone/turni_camera_repubblica_*.parquet` | g3 |
| Parole di destra e di sinistra | `dati/legislature/*.json` | `risultati/mappa_partiti_destra_sinistra_parole.csv` | g3 |
| Passaggi di lessico, continuità, scala DC-PCI | `dati/partiti/*.json` | `risultati/h54_parole_passaggi.csv`, `h54_somiglianze.csv`, `h56_asse_serie.csv` | g3 |
| Distanza tra le parole di PCI e DC, e di PSI e DC, anno per anno (Tavola I dei partiti) | `dati/partiti/distanze.json` | `risultati/h32_anno.csv`, `rilettura_h32_h54/532_dcpci.csv` (base 100 = DC-PCI 1953-68), `h56_dc_psi.txt` (DC-PSI 1962-63) | g3b |
| Parole tipiche di una legislatura | `dati/legislature/*.json` | conteggi di g1 | g3 |
| Parola dell'anno | `dati/base.json`, `dati/anni.json`, `scarica/parole_dell_anno.csv` | `risultati/h22_parole_anno.csv` | g3 |
| Temi | `dati/temi.json`, `scarica/temi.csv` | `risultati/h37_etichette_temi.csv`, `h37_quote_K40.csv`, `h37_temi_K40.txt` | g3 |
| Parole nate e morte | `dati/home.json` | `risultati/h27_nate_elenco.csv`, `h27_morte_elenco.csv` | g3 |
| Chi parla di più (home) | `dati/home.json` | `risultati/tab_oratori_top.csv` | g3 |
| Missione o guerra (home) | `dati/home.json` (`h68`) | tabella di `risultati/note_h68_h75_h77.md` | g3 |
| Esperimenti, verdetti, conti | `dati/esperimenti.json`, `scarica/esperimenti.csv` | `risultati/ELENCO_ESPERIMENTI.md` (senza le colonne Note e File) | g3 |
| Eventi (solo contesto, non misurati) | `dati/base.json`, `dati/anni.json` | `dati/eventi.csv` | g3 |
| «In breve», smentite e venti parole della home | `dati/home.json` | `_progetto/TESTI_PAGINE.md` (testi della redazione) | g3 |
| Storie: testi, verdetti, collegamenti | `dati/storie/*.json` | `_progetto/storie/*.md`, ordine in `_progetto/storie/INDICE.md` | g6 |
| Grafici delle storie | `dati/storie/*.json` (`grafici`) | i file indicati in ogni storia (campo «file»), letti in automatico; se non si leggono resta un segnaposto | g6 |
| Tabelle al posto dei segnaposti | `dati/storie/*.json` (`grafici`, forma «tabella») | i rapporti di testo indicati nelle storie, letti da regole scritte storia per storia (`_genera/cache/tabelline.json`) | g6b, g6 |
| Grafici corretti dopo il controllo a occhio | `dati/storie/*.json` (`grafici`) | gli stessi file delle storie, riletti con regole storia per storia (`_genera/cache/correzioni_grafici.json`); sostituiscono il grafico automatico | g6c, g6 |
| Capitoli: grafici che cambiano a ogni passo, scommesse | `js/scene.js`, `dati/capitoli/scommesse.json` | dati del sito (curve delle parole, sezioni); scommesse dalla tabella «Le sei scommesse» di `_progetto/racconto/RACCONTO.md` | g6 |
| Percorsi nuovi (Prima Repubblica, partiti, parole, resoconto) | `dati/percorsi/*.json` | `_progetto/racconto/PERCORSI.md`, sezioni 3, 4, 7, 8; titoli delle storie dall'indice delle storie | g6 |
| Temi della pagina partito | `dati/partiti/<id>.json` (`temi_su`) | conteggi per partito di g4 e parole forti dei 40 temi (`h37_temi_K40.txt`, `h37_etichette_temi.csv`) | g4, g8 |
| Testo della pagina del metodo | `metodo.html` | `_progetto/TESTI_PAGINE.md`, capitolo 3 | g6, g5 |
| Pagine HTML, file scaricabili | `*.html`, `scarica/*.csv`, `dati/scarica.json` | dati qui sopra | g5 |

| Anni di ogni legislatura | `dati/base.json`, `dati/legislature/*.json` | anni con almeno l'1% delle parole dell'archivio in `misure/parole/totali/*.parquet` | g3 |
| Risate (serie, chi fa ridere, frasi) | `dati/sezioni/risate.json` | `risultati/h20_serie.csv`, `h20_periodi.csv`, `h20_oratori.csv`; frasi: `misure/governo_aula/ctx_*.json` con l'oratore dai turni | g7, g8 |
| Insulti (serie, parole, citazioni) | `dati/sezioni/insulti.json`, `dati/sezioni/insulti/*.json` | `risultati/h13_insulti_annotazioni.csv`; lista `dati/liste/insulti_ristretta_forme.txt`; citazioni dai turni | g7, g8 |
| Il fascismo in aula | `dati/sezioni/fascismo.json` | `risultati/h18_periodi.csv`, `h18_fascismo.csv`, `h18c_picchi_termini.csv` | g8 |
| Le lingue dell'aula | `dati/sezioni/lingue.json` | `risultati/h8_francese.csv`, `serie_parole.csv`, `h9_contributori.csv`, `h7_forme.csv`, `392_grafie_antiche.csv` (cartella delle revisioni), `regno_due_pezzi/571_*.csv`; frasi in francese dai turni | g7, g8 |
| Amici e nemici | `dati/sezioni/esteri.json` | `risultati/h39_serie_paese_anno.csv`, `h39_alleanze_guerre.csv`, `h39_epoche_*.csv`, `h39_prev_*.csv`, `h70_h71_h78/fase3_numeri.json`, `fase3_h39_paesi.csv` | g8 |
| Mappa dei partiti in movimento, opposizione, frasi dei partiti | `dati/partiti/traiettorie.json`, campi `opposizione`, `frasi_tipiche`, `traiettoria` in `dati/partiti/*.json` | `risultati/mappa_partiti_mappa_unica_relativa.csv`, `h67/h67_partiti_legislature_full.csv`; frasi dai turni | g7, g8 |
| Prime volte (parole da 10 volte in su ed espressioni) | `dati/prime/*` | `misure/parole/unigrammi`, `base_pulita/turni`, elenco ragionato `_genera/espressioni.txt` | g9 |
| Capitoli del racconto | `dati/capitoli/*.json` | `_progetto/racconto/capitoli/*.md` (le righe Grafico, Stato e Dati non vanno in pagina; i capoversi con frasi ancora da ricontrollare in `FRASI_VERE.md` sono tolti) | g6 |

## Filtro di qualità delle frasi (regole fissate prima, funzione `frase_pulita` in `comune.py`)

Ogni frase mostrata nel sito (prime volte, frasi dell'anno di punta, risate, insulti, francese, frasi dei partiti, frasi degli esteri) passa queste regole. Una frase si scarta se:

1. più del 20% delle sue parole di almeno 3 lettere non sta nel dizionario del progetto (`risultati/dizionario_parole.txt`); la regola non vale per le frasi in francese;
2. i caratteri che non sono lettere, spazi o punteggiatura comune superano il 6% (cifre comprese), oppure ci sono almeno 2 simboli strani (£ € { } [ ] * ^ ~ | \ < > @ # $ % & _ = + ¦ ©);
3. c'è una parola di almeno 4 lettere senza vocali, o una parola che mescola lettere e cifre;
4. c'è una sequenza tipo «deo:010» o una parola con 3 o più cambi tra maiuscole e minuscole.

Se la frase della prima volta è illeggibile, resta la data con la nota «testo della prima comparsa illeggibile nella scansione» e si mostra la prima frase pulita che segue. Un oratore senza persona riconosciuta si mostra solo se il nome ha la forma di un nome del resoconto (solo maiuscole, almeno tre lettere); altrimenti «oratore non riconosciuto». Il conto delle frasi tolte è in `_progetto/FRASI_SCARTATE.md`.

## Regole fisse del sito (non sono dati del progetto)

- Una parola ha la sua pagina se è detta almeno 1.000 volte (g1, `SOGLIA_PAROLA`).
- Un anno di un ramo entra nelle curve con almeno 300.000 parole (guida di stile; `SOGLIA_ANNO` in g3 e `G.SOGLIA` in `js/comune.js`).
- Le curve lunghe sono medie mobili di tre anni; il valore di punta scritto è quello dell'anno vero.
- Nessun file del sito supera 2 MB (`LIMITE` in `comune.py`).

## Controllo con le schermate

`python -I _genera/controlla.py` apre le pagine con playwright, segnala errori e scorrimenti orizzontali e salva le schermate in `_schermate/` (fuori dal repository).

**Velocità della home (v8).** `g11_home_veloce.py` gira per ultimo (anche con `--storie`): riscrive `dati/home.json` togliendo le voci che nessuna pagina legge (temi, mappa_linee, picchi) e aggiungendo la voce `veloce`, con le sole cifre che la home prima prendeva da file grandi (curve delle parole del confronto e delle coppie, tabella delle risate, due curve delle lingue, stato delle parole nuove, griglia «A chi somiglia» per le legislature 13-18). Le parole le legge da `js/home.js` (PREDEF, PRONTI, COPPIE), quindi se si cambiano lì basta rilanciare. Se si rifà `home.json` con `g3_sito.py`, rilanciare anche g11. Strumenti di misura: `misura_velocita.py` (tempi, richieste e KB con CPU e rete rallentate), `prova_home.py` (confronto parole, valori al mouse, CSV: prima e dopo devono coincidere), `schermate_v8.py` (home intera a 1440 e 390 px).
