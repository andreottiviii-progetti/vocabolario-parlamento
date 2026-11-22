r"""Funzioni comuni ai programmi che generano i dati del sito.

FONTE: i file del progetto in D:\vocabolario-parlamento (solo lettura: nessun programma qui scrive in quella cartella).
USCITA: D:\vocabolario-parlamento-sito\dati\ (JSON piccoli, ognuno sotto 2 MB) e _genera\cache\ (file intermedi, fuori dal sito).
"""
import csv
import json
import os
import sys

BASE = r"D:\vocabolario-parlamento"
RIS = os.path.join(BASE, "risultati")
TURNI = os.path.join(BASE, "base_pulita", "turni")
UNI = os.path.join(BASE, "misure", "parole", "unigrammi")
TOT = os.path.join(BASE, "misure", "parole", "totali")
PERSONE = os.path.join(BASE, "misure", "persone")
SITO = r"D:\vocabolario-parlamento-sito"
QUI = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(QUI, "cache")
DATI = os.path.join(SITO, "dati")
ANNI = list(range(1848, 2023))
ESCLUSI = ("presidente", "segretario", "collettivo")
LIMITE = 2_000_000  # byte: nessun file del sito oltre questa misura

ROMANI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII",
          "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"]

VUOTE = set("""che non per con una uno del della dei delle degli dello nel nella nei nelle sul sulla sui alla alle agli allo
dal dalla dai dalle sono stato stata stati essere anche come questo questa questi queste quello quella quelli quelle
piu ma se si ha hanno abbiamo avete mi ci vi lo la le li gli il un in di da su tra fra ed ad cui quale quali tutto tutti
tutta tutte molto poi cosi ancora gia solo dopo prima quando dove perche poiche mentre pero quindi cioe proprio
era erano fu sia stare fare fatto detto dire puo deve devono possono nostro nostra nostri nostre loro suo sua suoi sue
io noi voi egli essi lei ne e o a i dell nell dall sull all quel quanto siamo altro modo alcuni sarebbe credo allora
oggi parte altri anni fatti contro stesso stessa ogni senza sempre essa esso vostro vostra ciò quest""".split())


def leggi_csv(nome, cart=RIS):
    with open(os.path.join(cart, nome), encoding="utf-8-sig", errors="replace", newline="") as f:
        return list(csv.DictReader(f))


def num(x, cifre=3):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    if v != v:
        return None
    return round(v, cifre)


def scrivi_json(percorso_rel, oggetto):
    """Scrive un JSON compatto in dati/; si ferma se supera 2 MB."""
    p = os.path.join(DATI, percorso_rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    s = json.dumps(oggetto, ensure_ascii=False, separators=(",", ":"))
    b = s.encode("utf-8")
    if len(b) > LIMITE:
        raise SystemExit("FILE TROPPO GRANDE: %s (%d byte)" % (percorso_rel, len(b)))
    with open(p, "wb") as f:
        f.write(b)
    return len(b)


def fine():
    sys.stdout.flush()
    os._exit(0)


# ----------------------------------------------------------------------------- qualita' delle frasi mostrate
# Regole fissate prima di guardare le frasi scelte (scritte anche in LEGGIMI.md). Una frase si scarta se:
#   1. piu' del 20% delle sue parole di almeno 3 lettere non sta nel dizionario del progetto (risultati/dizionario_parole.txt);
#      la regola non vale per le frasi in francese;
#   2. i caratteri che non sono lettere, spazi o punteggiatura comune superano il 6% (cifre comprese), oppure compaiono
#      almeno 2 simboli strani (£ € { } [ ] * ^ ~ | \ < > @ # $ % & _ = + ¦ ©);
#   3. c'e' una parola di almeno 4 lettere senza vocali, o una parola che mescola lettere e cifre (010SaL1);
#   4. c'e' una sequenza tipo «deo:010» (lettere, due punti, cifre) o una parola con 3 o piu' cambi tra maiuscole e minuscole.
_DIZ = None
_STRANI = set("£€{}[]*^~|<>@#$%&_=+¦©" + chr(92))
_PUNT = set(" .,;:!?'’‘\"«»()-–—…/\n\t")


def _diz():
    global _DIZ
    if _DIZ is None:
        with open(os.path.join(RIS, "dizionario_parole.txt"), encoding="utf-8", errors="replace") as f:
            _DIZ = set(l.strip() for l in f if l.strip())
    return _DIZ


def _norma(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def frase_pulita(fr, francese=False):
    """True se la frase supera le regole di qualita' (vedi sopra)."""
    import re as _re
    if not fr:
        return False
    s = fr.replace("…", " ")
    corpo = [c for c in s if not c.isspace()]
    if not corpo:
        return False
    strani = sum(1 for c in s if c in _STRANI)
    non_lettere = sum(1 for c in s if not c.isalpha() and c not in _PUNT)
    if strani >= 2 or non_lettere / len(corpo) > 0.06:
        return False
    for t in _re.findall(r"\S+", s):
        p = t.strip(".,;:!?'’‘\"«»()-–—")
        if _re.search(r"[A-Za-z]", p) and _re.search(r"\d", p) and not _re.fullmatch(r"\d+[°ª]?|[A-Za-z]?\d+[a-z]?|\d+(?:[.,]\d+)*%?", p):
            return False
        if len(p) >= 4 and p.isalpha() and not _re.search(r"[aeiouàèéìòùAEIOUÀÈÉÌÒÙyY]", p):
            return False
        cambi = sum(1 for a, b in zip(p, p[1:]) if a.isalpha() and b.isalpha() and a.isupper() != b.isupper())
        if cambi >= 3:
            return False
    if _re.search(r"[A-Za-z]+:\d", s):
        return False
    if not francese:
        parole = [w for w in _re.findall(r"[a-z]+", _norma(s)) if len(w) >= 3]
        if parole:
            fuori = sum(1 for w in parole if w not in _diz())
            if fuori / len(parole) > 0.20:
                return False
    return True


def oratore_valido(nome, pid="", anno=None):
    """Nome mostrabile: la persona riconosciuta (pid); senza pid, nella Repubblica (dal 1946) nessun nome, nel Regno il nome
    come lo scrive il resoconto se ha la forma di un nome (solo maiuscole, apostrofi, spazi, almeno 4 lettere);
    altrimenti stringa vuota (= oratore non riconosciuto)."""
    import re as _re
    if pid:
        return nome
    if anno is not None and int(anno) >= 1946:
        return ""
    n = (nome or "").strip()
    if _re.fullmatch(r"[A-ZÀ-Ü][A-ZÀ-Ü'’ .\-]{3,60}", n) and "RICONOSCIUT" not in n and sum(c.isalpha() for c in n) >= 4:
        return n
    return ""
