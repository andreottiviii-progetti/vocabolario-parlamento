# Come si rifà il sito

Tutti i numeri del sito vengono da file generati dai programmi di questa cartella, che leggono le fonti del progetto in `D:\vocabolario-parlamento` (solo lettura). Nelle pagine non ci sono numeri scritti a mano: se nel progetto cambia un dato, un numero o un verdetto, basta rifare il sito.

## Un comando solo

- **Tutto:** `python -I _genera/rifai_tutto.py` (oppure doppio clic su `RIFAI_SITO.bat`, scelta 1). La scansione dei turni (la parte lunga, circa 10 minuti con 3 processi) si rifà da sola solo se i turni o i conteggi delle parole sono cambiati; con `--da-capo` si rifà comunque.
- **Solo storie e testi fissi** (dopo una modifica in `_progetto/`): `python -I _genera/rifai_tutto.py --storie` (oppure `RIFAI_SITO.bat`, scelta 2).
- Alla fine il programma controlla che nessun file superi 2 MB, che ogni pagina abbia il noindex e che nei file pubblici non ci siano parole vietate. Se scrive «TUTTO A POSTO» si può pubblicare.
- Poi: `git add -A`, `git commit`, `git push` (GitHub Pages si aggiorna da solo).

Ordine dei programmi: `g1_parole.py` → `g2_scansione.py` → `g4_parole.py` → `g3_sito.py` → `g6_storie.py` → `g5_pagine.py`. I file intermedi stanno in `_genera/cache/` (fuori dal repository).

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
| Calendario dei cambi di trascrizione | `dati/base.json` (`trascrizione`) | `risultati/riparazione_c3/401_salti_legislature.csv` (salti ALTA o MEDIA), `401_picchi_dentro_legislatura.csv` (almeno due misure oltre il 99° percentile) | g3 |
| Governi | `dati/legislature/*.json`, `dati/partiti/*.json` | `risultati/h33_tabella_partiti_governo.csv` | g3 |
| Mappa dei partiti, quote, somiglianze | `dati/legislature/*.json`, `dati/partiti/*.json`, `scarica/mappa_partiti.csv` | `risultati/mappa_partiti_mappa_unica_relativa.csv`, `mappa_partiti_mappe_legislature.csv`, `mappa_partiti_somiglianze.csv` | g3 |
| Quote di parole ricontate (tutti i ruoli e solo parlamentari) | `dati/legislature/*.json` | `misure/persone/turni_camera_repubblica_*.parquet` | g3 |
| Parole di destra e di sinistra | `dati/legislature/*.json` | `risultati/mappa_partiti_destra_sinistra_parole.csv` | g3 |
| Passaggi di lessico, continuità, scala DC-PCI | `dati/partiti/*.json` | `risultati/h54_parole_passaggi.csv`, `h54_somiglianze.csv`, `h56_asse_serie.csv` | g3 |
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
| Testo della pagina del metodo | `metodo.html` | `_progetto/TESTI_PAGINE.md`, capitolo 3 | g6, g5 |
| Pagine HTML, file scaricabili | `*.html`, `scarica/*.csv`, `dati/scarica.json` | dati qui sopra | g5 |

## Regole fisse del sito (non sono dati del progetto)

- Una parola ha la sua pagina se è detta almeno 1.000 volte (g1, `SOGLIA_PAROLA`).
- Un anno di un ramo entra nelle curve con almeno 300.000 parole (guida di stile; `SOGLIA_ANNO` in g3 e `G.SOGLIA` in `js/comune.js`).
- Le curve lunghe sono medie mobili di tre anni; il valore di punta scritto è quello dell'anno vero.
- Nessun file del sito supera 2 MB (`LIMITE` in `comune.py`).

## Controllo con le schermate

`python -I _genera/controlla.py` apre le pagine con playwright, segnala errori e scorrimenti orizzontali e salva le schermate in `_schermate/` (fuori dal repository).
