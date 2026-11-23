r"""Schermate della v4 (le note di revisione sul vocabolario illustrato), adattate dallo script delle proposte.

Metodo: apre un piccolo server locale sulla cartella del sito (i dati si leggono con fetch), poi fotografa con
Playwright le pagine dell'elenco, a pagina intera o solo la prima schermata. Segnala errori JavaScript e
scorrimenti orizzontali. Le immagini vanno in _schermate/v4/ (fuori dal repository).
USO   python -I _genera/schermate_v4.py            (tutte le schermate della consegna)
      python -I _genera/schermate_v4.py home parola (solo quelle il cui nome contiene una di queste parole)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
USCITA = os.path.join(SITO, "_schermate", "v4")
# (pagina, larghezza, altezza, nome del file, pagina intera?)
SCATTI = [
    ("index.html", 1440, 900, "home_1440x900.png", False),
    ("index.html", 1440, 900, "home_1440.png", True),
    ("index.html", 390, 844, "home_390.png", True),
    ("index.html?testata=b", 1440, 900, "variante_testata_b_1440x900.png", False),
    ("index.html?unghie=no", 1440, 900, "variante_senza_alfabeto_1440x900.png", False),
    ("index.html", 1440, 900, "amici_nemici_A_linee_scelta.png", "#esteri-home"),
    ("index.html?amici=celle", 1440, 900, "amici_nemici_B_celle.png", "#esteri-home"),
    ("index.html?amici=strisce", 1440, 900, "amici_nemici_C_strisce_di_prima.png", "#esteri-home"),
    ("partiti.html", 1440, 900, "mappa_partiti_1440.png", True),
    ("partito.html?id=PCI", 1440, 900, "partito_pci_1440.png", True),
    ("risate_migliori.html", 1440, 900, "risate_migliori_1440.png", True),
    ("progetto.html", 1440, 900, "progetto_1440.png", True),
    ("esperimenti.html", 1440, 900, "scoperte_esperimenti_1440.png", True),
    ("parola.html?p=euro", 1440, 900, "parola_euro_1440.png", True),
    ("parola.html?p=banda%20larga", 1440, 900, "parola_banda_larga_1440.png", True),
]
ALTRE = [
    ("capitolo.html?n=4", 1440, 900, "x_capitolo4_1440.png", True),
    ("esteri.html", 1440, 900, "x_esteri_1440.png", True),
    ("fascismo.html", 1440, 900, "x_fascismo_1440.png", True),
    ("risate.html", 1440, 900, "x_risate_1440.png", True),
    ("legislature.html", 1440, 900, "x_legislature_1440.png", True),
    ("temi.html", 1440, 900, "x_temi_1440.png", True),
    ("primevolte.html", 1440, 900, "x_primevolte_1440.png", True),
    ("storia.html?id=tangentopoli-entra-in-aula", 1440, 900, "x_storia_1440.png", True),
    ("metodo.html", 1440, 900, "x_metodo_1440.png", True),
    ("parola.html?p=euro", 390, 844, "x_parola_euro_390.png", True),
    ("capitolo.html?n=7", 1440, 900, "x_capitolo7_1440.png", True),
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
