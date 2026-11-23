r"""Schermate della v6 (la griglia «a chi somiglia» al posto della mappa animata), adattate dallo script delle proposte.

Metodo: apre un piccolo server locale sulla cartella del sito (i dati si leggono con fetch), poi fotografa con
Playwright le pagine dell'elenco, a pagina intera o solo la prima schermata. Segnala errori JavaScript e
scorrimenti orizzontali. Le immagini vanno in _schermate/v6/ (fuori dal repository).
USO   python -I _genera/schermate_v6.py            (tutte le schermate della consegna)
      python -I _genera/schermate_v6.py home parola (solo quelle il cui nome contiene una di queste parole)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
USCITA = os.path.join(SITO, "_schermate", "v6")
# (pagina, larghezza, altezza, nome del file, pagina intera?)
SCATTI = [
    ("index.html", 1440, 900, "home_1440.png", True),
    ("partiti.html", 1440, 900, "partiti_1440.png", True),
    ("partito.html?id=PCI", 1440, 900, "partito_pci_1440.png", True),
    ("partito.html?id=M5S", 1440, 900, "partito_m5s_1440.png", True),
]
ALTRE = [
    ("partiti.html", 390, 844, "x_partiti_390.png", True),
    ("percorso.html?id=partiti", 1440, 900, "x_percorso_partiti_1440.png", True),
    ("percorso.html?id=prima-repubblica", 1440, 900, "x_percorso_prima_repubblica_1440.png", True),
    ("partito.html?id=PPI", 1440, 900, "x_partito_ppi_1440.png", True),
]


class Muto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    filtri = [a for a in sys.argv[1:] if not a.startswith("--")]
    lista = SCATTI + (ALTRE if ("--tutte" in sys.argv or filtri) else [])
    if filtri:
        lista = [s for s in lista if any(f in s[3] for f in filtri)]
    os.makedirs(USCITA, exist_ok=True)
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Muto, directory=SITO))
    porta = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        try:
            br = p.chromium.launch()
        except Exception:
            br = p.chromium.launch(channel="chrome")
        for pagina, w, h, nome, intera in lista:
            pg = br.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            errori = []
            pg.on("pageerror", lambda e: errori.append(str(e)))
            pg.on("console", lambda m: errori.append(m.text) if m.type == "error" else None)
            pg.goto("http://127.0.0.1:%d/%s" % (porta, pagina), wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(1200)
            if intera is True:  # scorre tutta la pagina, così i grafici a passi e quelli che entrano si disegnano
                pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                pg.wait_for_timeout(400)
                pg.evaluate("window.scrollTo(0, 0)")
                pg.wait_for_timeout(400)
            if isinstance(intera, str):  # solo un pezzo della pagina
                pg.locator(intera).first.screenshot(path=os.path.join(USCITA, nome))
            else:
                pg.screenshot(path=os.path.join(USCITA, nome), full_page=intera)
            alt = pg.evaluate("document.documentElement.scrollHeight")
            largo = pg.evaluate("document.documentElement.scrollWidth")
            print("%-26s %4d  alto %5d  largo %4d%s  %s" % (nome, w, alt, largo, "  SCORRE DI LATO" if largo > w else "", ("ERRORI: " + " | ".join(errori[:4])[:500]) if errori else ""), flush=True)
            pg.close()
        br.close()
    srv.shutdown()


if __name__ == "__main__":
    main()
