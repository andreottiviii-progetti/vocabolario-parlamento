r"""Controllo delle pagine con playwright: errori JavaScript, scorrimento orizzontale, schermate.

Avvia un piccolo server locale sulla cartella del sito (in questo stesso processo), apre le pagine richieste
e salva le schermate a pagina intera in _schermate/ (cartella esclusa dal repository).
USO   python -I _genera/controlla.py                    (le schermate della consegna)
      python -I _genera/controlla.py "parola.html?p=spread" 1440 parola_spread.png   (una pagina)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import SITO, fine  # noqa

from playwright.sync_api import sync_playwright

USCITA = os.path.join(SITO, "_schermate")
CONSEGNA = [("index.html", 1440, "home_1440.png"), ("index.html", 390, "home_390.png"),
            ("parola.html?p=tangentopoli", 1440, "parola_1440.png"), ("partito.html?id=PCI", 1440, "partito_1440.png"),
            ("legislatura.html?id=repubblica-7", 1440, "legislatura_1440.png"), ("storia.html?id=tangentopoli-entra-in-aula", 1440, "storia_1440.png"),
            ("esperimenti.html", 1440, "esperimenti_1440.png"), ("metodo.html", 1440, "metodo_1440.png")]


class Zitto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def percorsi_privati():
    """Nessun percorso dei file di lavoro del progetto nei file pubblici (quelli che git pubblica, fuori dalle cartelle che
    cominciano con «_»): risultati/, *_risultati, note_hNN, misure/."""
    import re
    import subprocess
    file_ = subprocess.run(["git", "ls-files"], capture_output=True, cwd=SITO).stdout.decode("utf-8").splitlines()
    file_ += subprocess.run(["git", "ls-files", "-o", "--exclude-standard"], capture_output=True, cwd=SITO).stdout.decode("utf-8").splitlines()
    vietato = re.compile(r"risultati/|_risultati|note_h[0-9]|misure/")
    trovati = []
    for f in file_:
        if f.startswith("_") or f.endswith((".png", ".woff2", ".ico")):
            continue
        p = os.path.join(SITO, f)
        if os.path.isfile(p) and vietato.search(open(p, encoding="utf-8", errors="replace").read()):
            trovati.append(f)
    print("percorsi dei file di lavoro nei file pubblici:", ", ".join(trovati) if trovati else "nessuno", flush=True)
    return not trovati


def main():
    percorsi_privati()
    os.makedirs(USCITA, exist_ok=True)
    arg = sys.argv[1:]
    lista = CONSEGNA if not arg else [(arg[i], int(arg[i + 1]), arg[i + 2]) for i in range(0, len(arg), 3)]
    h = functools.partial(Zitto, directory=SITO)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), h)
    porta = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        try:
            br = p.chromium.launch()
        except Exception:
            br = p.chromium.launch(channel="chrome")
        for url, larg, nome in lista:
            pg = br.new_page(viewport={"width": larg, "height": 900}, device_scale_factor=1)
            errori = []
            pg.on("console", lambda m: errori.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errori.append(str(e.stack or e)))
            pg.goto("http://127.0.0.1:%d/%s" % (porta, url), wait_until="networkidle")
            pg.wait_for_timeout(900)
            sw = pg.evaluate("document.documentElement.scrollWidth")
            hh = pg.evaluate("document.documentElement.scrollHeight")
            pg.screenshot(path=os.path.join(USCITA, nome), full_page=True)
            print("%-48s %4d px  largo %4d  alto %5d  errori: %s" % (url, larg, sw, hh, " | ".join(errori)[:600] or "nessuno"), flush=True)
            pg.close()
        br.close()
    srv.shutdown()
    fine()


if __name__ == "__main__":
    main()
