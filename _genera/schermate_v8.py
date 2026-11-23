r"""Schermate della home intera a 1440 e 390 px, per confrontare prima e dopo la v8 (velocità).

USO   python -I _genera/schermate_v8.py prima [--cartella D:\copia]    -> _schermate/v8_velocita/prima_1440.png, prima_390.png
      python -I _genera/schermate_v8.py dopo
Il server è locale; si scorre la pagina fino in fondo (così anche i grafici disegnati solo quando si avvicinano compaiono),
si aspetta che i caratteri siano arrivati e che nulla si muova più, poi si fotografa la pagina intera.
"""
import argparse
import functools
import http.server
import os
import socketserver
import threading
import time

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class Zitto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nome")
    ap.add_argument("--cartella", default=SITO)
    ap.add_argument("--larghezze", default="1440,390")
    a = ap.parse_args()
    s = socketserver.ThreadingTCPServer(("127.0.0.1", 0), functools.partial(Zitto, directory=a.cartella))
    s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:%d/" % s.server_address[1]
    out = os.path.join(SITO, "_schermate", "v8_velocita")
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        for larg in [int(x) for x in a.larghezze.split(",")]:
            pg = br.new_page(viewport={"width": larg, "height": 900})
            pg.goto(base + "index.html", wait_until="load")
            time.sleep(2.5)
            h = pg.evaluate("document.documentElement.scrollHeight")
            y = 0
            while y < h:
                y += 300
                pg.evaluate("window.scrollTo(0, %d)" % y)
                time.sleep(0.2)
                h = pg.evaluate("document.documentElement.scrollHeight")
            time.sleep(1.5)
            pg.evaluate("window.scrollTo(0, 0)")
            pg.evaluate("document.fonts.ready")
            ult = None
            for _ in range(30):
                v = pg.evaluate("document.documentElement.scrollHeight + '|' + document.querySelectorAll('svg').length")
                if v == ult:
                    break
                ult = v
                time.sleep(0.7)
            p = os.path.join(out, "%s_%d.png" % (a.nome, larg))
            pg.screenshot(path=p, full_page=True)
            print(p, pg.evaluate("document.documentElement.scrollHeight"), "px di altezza")
            pg.close()
        br.close()
    s.shutdown()


if __name__ == "__main__":
    main()
