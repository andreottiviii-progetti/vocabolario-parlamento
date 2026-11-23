r"""Schermate dell'impaginazione v3 (il vocabolario illustrato), adattate dallo script delle proposte.

Metodo: apre un piccolo server locale sulla cartella del sito (i dati si leggono con fetch), poi fotografa con
Playwright le pagine dell'elenco, a pagina intera o solo la prima schermata. Segnala errori JavaScript e
scorrimenti orizzontali. Le immagini vanno in _schermate/v3/ (fuori dal repository).
USO   python -I _genera/schermate_v3.py            (tutte le schermate della consegna)
      python -I _genera/schermate_v3.py home parola (solo quelle il cui nome contiene una di queste parole)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
USCITA = os.path.join(SITO, "_schermate", "v3")
# (pagina, larghezza, altezza, nome del file, pagina intera?)
SCATTI = [
    ("index.html", 1440, 900, "home_1440x900.png", False),
    ("index.html", 1440, 900, "home_1440.png", True),
    ("index.html", 390, 844, "home_390.png", True),
    ("capitolo.html?n=4", 1440, 900, "capitolo4_1440.png", True),
    ("capitolo.html?n=1", 1440, 900, "capitolo1_1440.png", True),
    ("storia.html?id=tangentopoli-entra-in-aula", 1440, 900, "storia_1440.png", True),
    ("parola.html?p=patria", 1440, 900, "parola_patria_1440.png", True),
    ("partito.html?id=PCI", 1440, 900, "partito_pci_1440.png", True),
    ("fascismo.html", 1440, 900, "fascismo_1440.png", True),
    ("risate.html", 1440, 900, "risate_1440.png", True),
    ("primevolte.html", 1440, 900, "primevolte_1440.png", True),
]
ALTRE = [
    ("esteri.html", 1440, 900, "x_esteri_1440.png", True),
    ("lingue.html", 1440, 900, "x_lingue_1440.png", True),
    ("parole.html", 1440, 900, "x_parole_1440.png", True),
    ("anno.html?a=1917", 1440, 900, "x_anno_1440.png", True),
    ("legislatura.html?id=repubblica-7", 1440, 900, "x_legislatura_1440.png", True),
    ("persona.html?id=camera:p16400", 1440, 900, "x_persona_1440.png", True),
    ("tema.html?id=7", 1440, 900, "x_tema_1440.png", True),
    ("storie.html", 1440, 900, "x_storie_1440.png", True),
    ("percorsi.html", 1440, 900, "x_percorsi_1440.png", True),
    ("percorso.html?id=parole", 1440, 900, "x_percorso_1440.png", True),
    ("esperimenti.html", 1440, 900, "x_esperimenti_1440.png", True),
    ("metodo.html", 1440, 900, "x_metodo_1440.png", True),
    ("dati.html", 1440, 900, "x_dati_1440.png", True),
    ("paper.html", 1440, 900, "x_paper_1440.png", True),
    ("partiti.html", 1440, 900, "x_partiti_1440.png", True),
    ("persone.html", 1440, 900, "x_persone_1440.png", True),
    ("anni.html", 1440, 900, "x_anni_1440.png", True),
    ("legislature.html", 1440, 900, "x_legislature_1440.png", True),
    ("temi.html", 1440, 900, "x_temi_1440.png", True),
    ("esperimento.html?cod=H2", 1440, 900, "x_esperimento_1440.png", True),
    ("parola.html?p=patria", 390, 844, "x_parola_390.png", True),
    ("capitolo.html?n=4", 390, 844, "x_capitolo4_390.png", True),
    ("fascismo.html", 390, 844, "x_fascismo_390.png", True),
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
            if intera:  # scorre tutta la pagina, così i grafici a passi e quelli che entrano si disegnano
                pg.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
                pg.wait_for_timeout(400)
                pg.evaluate("window.scrollTo(0, 0)")
                pg.wait_for_timeout(400)
            pg.screenshot(path=os.path.join(USCITA, nome), full_page=intera)
            alt = pg.evaluate("document.documentElement.scrollHeight")
            largo = pg.evaluate("document.documentElement.scrollWidth")
            print("%-26s %4d  alto %5d  largo %4d%s  %s" % (nome, w, alt, largo, "  SCORRE DI LATO" if largo > w else "", ("ERRORI: " + " | ".join(errori[:4])[:500]) if errori else ""), flush=True)
            pg.close()
        br.close()
    srv.shutdown()


if __name__ == "__main__":
    main()
