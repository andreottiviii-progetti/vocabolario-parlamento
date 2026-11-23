r"""Prova che la home fa le stesse cose di prima: confronto parole (Tav. I), valori al passaggio del mouse, bottoni CSV.

Apre la home di una cartella del sito (la prima è quella da provare; --cartella dà un'altra, per esempio una copia «prima»),
scorre la pagina per far disegnare tutto, poi registra: il testo di ogni sezione, un'impronta di ogni grafico, il testo del
riquadro che compare passando il mouse su alcuni punti, il contenuto di ogni bottone «Dati del grafico (CSV)», e il
risultato di quattro confronti di parole (pronti, scritti a mano, parola senza curva pronta).
Scrive il risultato in JSON; il programma confronta.py (qui sotto: opzione --confronta) dice se due prove coincidono.
USO   python -I _genera/prova_home.py --uscita prova_dopo.json [--cartella D:\altra\copia]
      python -I _genera/prova_home.py --confronta prova_prima.json prova_dopo.json
"""
import argparse
import functools
import hashlib
import http.server
import json
import os
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))


class Zitto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def server(cartella):
    h = functools.partial(Zitto, directory=cartella)
    s = socketserver.ThreadingTCPServer(("127.0.0.1", 0), h)
    s.daemon_threads = True
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, "http://127.0.0.1:%d/" % s.server_address[1]


def imp(t):
    return hashlib.sha1(t.encode("utf-8")).hexdigest()[:12]


def scorri(pg):
    h = pg.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < h:
        y += 400
        pg.evaluate("window.scrollTo(0, %d)" % y)
        time.sleep(0.15)
        h = pg.evaluate("document.documentElement.scrollHeight")
    time.sleep(1.0)
    pg.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.4)


def aspetta_quiete(pg, s=2.0):
    ultimo, t = None, time.time()
    while time.time() - t < 30:
        n = pg.evaluate("document.querySelectorAll('svg').length + '|' + (document.getElementById('asse-fig')||{innerHTML:''}).innerHTML.length")
        if n != ultimo:
            ultimo, t0 = n, time.time()
        elif time.time() - t0 > s:
            return
        time.sleep(0.4)


def stato(pg):
    """Impronte: testo e disegni di ogni sezione della home."""
    return pg.evaluate("""() => {
      const out = {};
      document.querySelectorAll('main section, main figure, #piede').forEach((e, i) => {
        const k = e.id || ('s' + i);
        out[k + '|testo'] = e.innerText;
        out[k + '|svg'] = Array.from(e.querySelectorAll('svg')).map(s => s.outerHTML).join('');
      });
      return out;
    }""")


def tips(pg):
    """Passa il mouse su alcuni punti di grafici e tabelle e legge il riquadro."""
    ris = {}
    mir = pg.query_selector_all("rect.mirino")
    for i, r in enumerate(mir):
        r.scroll_into_view_if_needed()
        b = r.bounding_box()
        if not b:
            continue
        for f in (0.2, 0.5, 0.8):
            pg.mouse.move(b["x"] + b["width"] * f, b["y"] + b["height"] * 0.5)
            time.sleep(0.05)
            t = pg.evaluate("(() => { const q = document.querySelector('.riquadro'); return q && q.style.display !== 'none' ? q.innerText : null; })()")
            ris["mirino%d@%.1f" % (i, f)] = t
        pg.mouse.move(2, 2)
    dt = pg.query_selector_all("[data-tip]")
    for i, e in enumerate(dt[:60:3]):
        e.scroll_into_view_if_needed()
        b = e.bounding_box()
        if not b:
            continue
        pg.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
        time.sleep(0.05)
        ris["tip%d" % i] = pg.evaluate("(() => { const q = document.querySelector('.riquadro'); return q && q.style.display !== 'none' ? q.innerText : null; })()")
        pg.mouse.move(2, 2)
    return ris


def csv_tutti(pg):
    ris = {}
    bott = pg.query_selector_all(".dati-csv button, .fig-fonte button, .griglia-csv button")
    for i, b in enumerate(bott):
        b.scroll_into_view_if_needed()
        with pg.expect_download(timeout=8000) as d:
            b.click()
        p = d.value.path()
        ris["csv%d|%s" % (i, d.value.suggested_filename)] = open(p, "rb").read().decode("utf-8", "replace")
    return ris


def confronto(pg, come, valore):
    pg.evaluate("window.scrollTo(0, 0)")
    if come == "pronto":
        pg.click('.pronti a[data-p="%s"]' % valore)
    else:
        pg.fill("#asse-in", valore)
        pg.press("#asse-in", "Enter")
    time.sleep(1.0)
    aspetta_quiete(pg, 1.5)
    r = {"titolo": pg.inner_text("#asse-tit"), "avviso": pg.inner_text("#asse-avviso"), "voci": pg.inner_text("#tre"),
         "svg": pg.evaluate("document.querySelector('#asse-fig svg').outerHTML"), "url": pg.evaluate("location.search")}
    r["tips"] = {}
    m = pg.query_selector("#asse-fig rect.mirino")
    if m:
        b = m.bounding_box()
        for f in (0.3, 0.7):
            pg.mouse.move(b["x"] + b["width"] * f, b["y"] + b["height"] / 2)
            time.sleep(0.05)
            r["tips"][str(f)] = pg.evaluate("(() => { const q = document.querySelector('.riquadro'); return q && q.style.display !== 'none' ? q.innerText : null; })()")
        pg.mouse.move(2, 2)
    with pg.expect_download(timeout=8000) as d:
        pg.click("#asse .fig-fonte button")
    r["csv"] = open(d.value.path(), "rb").read().decode("utf-8", "replace")
    return r


def prova(cartella, larghezza):
    srv, base = server(cartella)
    ris = {}
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        ctx = br.new_context(viewport={"width": larghezza, "height": 900}, accept_downloads=True)
        pg = ctx.new_page()
        errori = []
        pg.on("pageerror", lambda e: errori.append(str(e)))
        pg.on("console", lambda m: errori.append(m.text) if m.type == "error" else None)
        pg.goto(base + "index.html", wait_until="load")
        aspetta_quiete(pg)
        scorri(pg)
        aspetta_quiete(pg)
        ris["stato"] = {k: imp(v) + ":" + str(len(v)) for k, v in stato(pg).items()}
        ris["stato_testo"] = {k: v for k, v in stato(pg).items() if k.endswith("|testo")}
        ris["tips"] = tips(pg)
        ris["csv"] = csv_tutti(pg)
        ris["confronti"] = {
            "pronto_guerra_pace": confronto(pg, "pronto", "guerra,pace"),
            "pronto_tangentopoli": confronto(pg, "pronto", "tangentopoli,spread,casta"),
            "scritto_a_mano": confronto(pg, "mano", "spread, casta"),
            "senza_curva_pronta": confronto(pg, "mano", "ostruzionismo, lottizzazione"),
            "senza_curva": confronto(pg, "mano", "xyzzy, patria"),
        }
        ris["errori"] = errori
        br.close()
    srv.shutdown()
    return ris


def confronta(a, b):
    A, B = json.load(open(a, encoding="utf-8")), json.load(open(b, encoding="utf-8"))
    diff = 0

    def conf(x, y, p):
        nonlocal diff
        if isinstance(x, dict) and isinstance(y, dict):
            for k in sorted(set(x) | set(y)):
                if k not in x or k not in y:
                    print("MANCA", p + "/" + k, "in", "prima" if k not in x else "dopo")
                    diff += 1
                else:
                    conf(x[k], y[k], p + "/" + k)
        elif x != y:
            diff += 1
            print("DIVERSO", p, "|", str(x)[:150].replace("\n", "\\n"), "|", str(y)[:150].replace("\n", "\\n"))
    conf(A, B, "")
    print("DIFFERENZE:", diff)
    return diff


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cartella", default=SITO)
    ap.add_argument("--uscita")
    ap.add_argument("--confronta", nargs=2)
    a = ap.parse_args()
    if a.confronta:
        sys.exit(1 if confronta(*a.confronta) else 0)
    out = {"1440": prova(a.cartella, 1440), "390": prova(a.cartella, 390)}
    json.dump(out, open(a.uscita, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("scritto", a.uscita, "errori:", out["1440"]["errori"], out["390"]["errori"])
