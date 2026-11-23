r"""Schermate della v7 (revisione generale dei grafici), adattate da schermate_v4.py.

Metodo: apre un piccolo server locale sulla cartella del sito (i dati si leggono con fetch), poi fotografa con
Playwright le pagine dell'elenco, a pagina intera. Con --figure salva anche ogni grafico da solo (figure.fig, le tavole
della home e dei capitoli), così si guardano a piena larghezza. Segnala errori JavaScript e scorrimenti orizzontali.
Le immagini vanno in _schermate/v7/<cartella>/ (fuori dal repository): la cartella è «prima» o «dopo».
USO   python -I _genera/schermate_v7.py prima                 (tutte le pagine, solo pagina intera)
      python -I _genera/schermate_v7.py dopo --figure home    (solo le pagine il cui nome contiene «home», con i grafici)
"""
import functools
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
# (pagina, larghezza, nome)
PAGINE = [
    ("index.html", 1440, "home"),
    ("index.html", 390, "home_390"),
    ("capitolo.html?n=1", 1440, "capitolo1"),
    ("capitolo.html?n=4", 1440, "capitolo4"),
    ("capitolo.html?n=5", 1440, "capitolo5"),
    ("capitolo.html?n=7", 1440, "capitolo7"),
    ("storia.html?id=tangentopoli-entra-in-aula", 1440, "storia_tangentopoli"),
    ("storia.html?id=corruzione-salto-1980", 1440, "storia_corruzione"),
    ("storia.html?id=amici-e-nemici", 1440, "storia_amici"),
    ("storia.html?id=debito-pubblico", 1440, "storia_debito"),
    ("storia.html?id=terrorismo-1980", 1440, "storia_terrorismo"),
    ("storia.html?id=forme-antiche-unita", 1440, "storia_forme_antiche"),
    ("storia.html?id=chi-cambia-gruppo", 1440, "storia_cambia_gruppo"),
    ("storia.html?id=compromesso-storico-pci-verso-dc", 1440, "storia_compromesso"),
    ("storia.html?id=calcio", 1440, "storia_calcio"),
    ("storia.html?id=piu-elettori-date-finte", 1440, "storia_date_finte"),
    ("storia.html?id=domande-in-calo", 1440, "storia_domande"),
    ("parola.html?p=euro", 1440, "parola_euro"),
    ("parola.html?p=euro", 390, "parola_euro_390"),
    ("partito.html?id=PCI", 1440, "partito_pci"),
    ("partiti.html", 1440, "partiti"),
    ("partiti.html", 390, "partiti_390"),
    ("persona.html?id=camera:p17650", 1440, "persona"),
    ("anni.html", 1440, "anni"),
    ("anno.html?a=1994", 1440, "anno"),
    ("legislature.html", 1440, "legislature"),
    ("legislatura.html?id=repubblica-7", 1440, "legislatura"),
    ("temi.html", 1440, "temi"),
    ("tema.html?id=4", 1440, "tema"),
    ("primevolte.html", 1440, "primevolte"),
    ("risate.html", 1440, "risate"),
    ("risate_migliori.html", 1440, "risate_migliori"),
    ("lingue.html", 1440, "lingue"),
    ("esteri.html", 1440, "esteri"),
    ("fascismo.html", 1440, "fascismo"),
    ("esperimenti.html", 1440, "scoperte"),
    ("esperimento.html?cod=H1", 1440, "esperimento"),
    ("percorsi.html", 1440, "percorsi"),
    ("percorso.html?id=partiti", 1440, "percorso_partiti"),
    ("percorso.html?id=prima-repubblica", 1440, "percorso_pr"),
    ("metodo.html", 1440, "metodo"),
    ("progetto.html", 1440, "progetto"),
    ("parole.html", 1440, "parole"),
]
FIGURE = "figure.fig, .tav-storia, .tavola, .tav, .fig-tav"


class Muto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    arg = [a for a in sys.argv[1:] if not a.startswith("--")]
    cartella = arg[0] if arg else "prima"
    filtri = arg[1:]
    figure = "--figure" in sys.argv
    uscita = os.path.join(SITO, "_schermate", "v7", cartella)
    os.makedirs(uscita, exist_ok=True)
    lista = [p for p in PAGINE if not filtri or any(f == p[2] or f in p[2] for f in filtri)]
    srv = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Muto, directory=SITO))
    porta = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        try:
            br = p.chromium.launch()
        except Exception:
            br = p.chromium.launch(channel="chrome")
        for pagina, w, nome in lista:
            pg = br.new_page(viewport={"width": w, "height": 900 if w > 500 else 844}, device_scale_factor=1)
            errori = []
            pg.on("pageerror", lambda e: errori.append(str(e)))
            pg.on("console", lambda m: errori.append(m.text) if m.type == "error" else None)
            pg.goto("http://127.0.0.1:%d/%s" % (porta, pagina), wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(1200)
            alt = pg.evaluate("document.documentElement.scrollHeight")
            for yy in range(0, alt, 700):  # scorre a passi: i grafici che entrano e quelli a passi si disegnano
                pg.evaluate("window.scrollTo(0, %d)" % yy)
                pg.wait_for_timeout(60)
            pg.evaluate("window.scrollTo(0, 0)")
            pg.wait_for_timeout(500)
            pg.screenshot(path=os.path.join(uscita, nome + ".png"), full_page=True)
            n = 0
            if figure:
                els = pg.locator(FIGURE)
                for i in range(min(els.count(), 40)):
                    el = els.nth(i)
                    try:
                        bb = el.bounding_box()
                        if not bb or bb["height"] < 40 or bb["width"] < 120:
                            continue
                        el.scroll_into_view_if_needed()
                        pg.wait_for_timeout(150)
                        el.screenshot(path=os.path.join(uscita, "%s__%02d.png" % (nome, i)))
                        n += 1
                    except Exception:
                        pass
            alt = pg.evaluate("document.documentElement.scrollHeight")
            largo = pg.evaluate("document.documentElement.scrollWidth")
            print("%-22s %4d  alto %5d  largo %4d  grafici %2d%s  %s" % (nome, w, alt, largo, n, "  SCORRE DI LATO" if largo > w else "",
                  ("ERRORI: " + " | ".join(errori[:4])[:500]) if errori else ""), flush=True)
            pg.close()
        br.close()
    srv.shutdown()


if __name__ == "__main__":
    main()
