r"""Misura la velocità della home (index.html): quando compaiono i grafici, quante richieste, quanti KB, quanto JavaScript.

Metodo: Playwright (Chromium) con cache vuota a ogni prova; opzione --rallenta = CPU 4 volte più lenta e rete «Fast 3G»
(1,6 Mbit/s in giù, 750 kbit/s in su, 562,5 ms di attesa), come un telefono medio. Il server locale (--locale) comprime i
file come GitHub Pages (gzip) e li serve in HTTP/1.1.
Dentro la pagina un osservatore annota l'istante in cui compare ogni grafico (svg) e ogni «long task» (compito di
JavaScript oltre 50 ms). Dopo il caricamento prova anche il ridimensionamento della finestra e lo scorrimento.

USO   python -I _genera/misura_velocita.py --locale --larghezza 390 --rallenta --prove 3 --nome prima_locale_390_lento
      python -I _genera/misura_velocita.py --url https://andreottiviii-progetti.github.io/vocabolario-parlamento/ ...
Scrive _progetto/velocita/<nome>.json e stampa la mediana delle prove.
"""
import argparse
import functools
import gzip
import http.server
import json
import os
import socketserver
import statistics
import sys
import threading
import time

from playwright.sync_api import sync_playwright

SITO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
USCITA = os.path.join(SITO, "_progetto", "velocita")

SONDA = r"""
(() => {
  const M = window.__m = { svg: [], lt: [], paint: {}, lcp: 0, cls: 0, rem: 0 };
  const visti = new WeakSet();
  const t0 = () => performance.now();
  function conta(n) {
    if (n.nodeType !== 1) return;
    const lista = n.tagName === 'svg' ? [n] : Array.from(n.querySelectorAll ? n.querySelectorAll('svg') : []);
    lista.forEach(s => {
      if (visti.has(s)) return; visti.add(s);
      const w = parseFloat(s.getAttribute('width')) || 0, h = parseFloat(s.getAttribute('height')) || 0;
      let q = s.closest('[id]');
      M.svg.push({ t: t0(), w, h, id: q ? q.id : '' });
    });
  }
  const mo = new MutationObserver(muts => muts.forEach(m => { m.addedNodes.forEach(conta); m.removedNodes.forEach(x => { if (x.nodeType === 1 && (x.tagName === 'svg' || (x.querySelector && x.querySelector('svg')))) M.rem++; }); }));
  const avvia = () => mo.observe(document.documentElement, { childList: true, subtree: true });
  if (document.documentElement) avvia(); else document.addEventListener('readystatechange', avvia, { once: true });
  try { new PerformanceObserver(l => l.getEntries().forEach(e => M.lt.push({ t: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { M.paint[e.name] = e.startTime; })).observe({ type: 'paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { M.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) M.cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
})();
"""


class Gestore(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "max-age=600")
        super().end_headers()

    def do_GET(self):
        p = self.translate_path(self.path.split("?")[0])
        if os.path.isdir(p):
            p = os.path.join(p, "index.html")
        if not os.path.isfile(p):
            return super().do_GET()
        with open(p, "rb") as f:
            dati = f.read()
        tipo = self.guess_type(p)
        self.send_response(200)
        self.send_header("Content-Type", tipo)
        if tipo.split(";")[0] in ("text/html", "text/css", "application/javascript", "text/javascript", "application/json"):
            dati = gzip.compress(dati, 6)
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(dati)))
        self.end_headers()
        self.wfile.write(dati)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def avvia_server():
    h = functools.partial(Gestore, directory=SITO)
    s = Server(("127.0.0.1", 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s, "http://127.0.0.1:%d/" % s.server_address[1]


def una_prova(pw, url, larg, rallenta, quieto=2.5, prova_extra=True):
    br = pw.chromium.launch()
    alt = 844 if larg < 600 else 900
    ctx = br.new_context(viewport={"width": larg, "height": alt}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.add_init_script(SONDA)
    cdp = ctx.new_cdp_session(pg)
    cdp.send("Network.enable")
    cdp.send("Performance.enable")
    cdp.send("Network.setCacheDisabled", {"cacheDisabled": True})
    if rallenta:
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 562.5, "downloadThroughput": 1.6 * 1024 * 1024 / 8, "uploadThroughput": 750 * 1024 / 8})
    ric = {}
    volo = {"n": 0}
    def su_richiesta(e):
        if e["requestId"] not in ric:
            volo["n"] += 1
        ric[e["requestId"]] = {"url": e["request"]["url"], "t0": e["timestamp"], "w0": e["wallTime"]}
    def su_fallita(e):
        volo["n"] -= 1
    def su_fine(e):
        volo["n"] -= 1
        r = ric.get(e["requestId"])
        if r:
            r["fine"] = e["timestamp"]; r["kb"] = e["encodedDataLength"]
    def su_risposta(e):
        r = ric.get(e["requestId"])
        if r:
            r["ris"] = e["timestamp"]; r["tipo"] = e.get("type")
    cdp.on("Network.requestWillBeSent", su_richiesta)
    cdp.on("Network.responseReceived", su_risposta)
    cdp.on("Network.loadingFinished", su_fine)
    cdp.on("Network.loadingFailed", su_fallita)
    errori = []
    pg.on("pageerror", lambda e: errori.append(str(e)))
    pg.on("console", lambda m: errori.append(m.text) if m.type == "error" else None)
    pg.goto(url, wait_until="commit", timeout=120000)
    # aspetta che per `quieto` secondi non compaia più nessun grafico, ma almeno 4 s
    ultimo, t_inizio = -1, time.time()
    while True:
        time.sleep(0.5)
        try:
            n = pg.evaluate("window.__m ? window.__m.svg.length : -1")
        except Exception:
            continue
        if n != ultimo or volo["n"] > 0:
            ultimo = n; t_cambio = time.time()
        if time.time() - t_inizio > 4 and time.time() - t_cambio > quieto and n > 0:
            break
        if time.time() - t_inizio > 200:
            break
    m = pg.evaluate("window.__m")
    met = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    t_riga = min((r["t0"] for r in ric.values()), default=0)
    reqs = []
    for r in ric.values():
        if "fine" not in r:
            continue
        reqs.append({"url": r["url"].replace(url, ""), "avvio": round((r["t0"] - t_riga) * 1000), "fine": round((r["fine"] - t_riga) * 1000), "kb": r["kb"] / 1024})
    reqs.sort(key=lambda r: r["avvio"])
    svg = m["svg"]
    grandi = [s for s in svg if s["w"] >= 150 and s["h"] >= 40]
    out = {
        "n_svg": len(svg), "n_svg_grandi": len(grandi),
        "primo_svg_ms": round(svg[0]["t"]) if svg else None,
        "primo_grande_ms": round(grandi[0]["t"]) if grandi else None,
        "ultimo_svg_ms": round(svg[-1]["t"]) if svg else None,
        "tav1_ms": next((round(s["t"]) for s in svg if s["id"].startswith("asse")), None),
        "fcp_ms": round(m["paint"].get("first-contentful-paint", 0)),
        "lcp_ms": round(m["lcp"]), "cls": round(m["cls"], 3),
        "ultima_richiesta_ms": max((r["fine"] for r in reqs), default=0),
        "n_richieste": len(reqs), "n_json": sum(1 for r in reqs if r["url"].split("?")[0].endswith(".json")),
        "kb_totali": round(sum(r["kb"] for r in reqs)), "kb_json": round(sum(r["kb"] for r in reqs if r["url"].endswith(".json"))),
        "kb_js": round(sum(r["kb"] for r in reqs if r["url"].endswith(".js"))),
        "long_n": len(m["lt"]), "long_ms": round(sum(x["d"] for x in m["lt"])),
        "long_max_ms": round(max((x["d"] for x in m["lt"]), default=0)),
        "script_s": round(met.get("ScriptDuration", 0), 2), "task_s": round(met.get("TaskDuration", 0), 2),
        "altezza_pagina": pg.evaluate("document.documentElement.scrollHeight"),
        "errori": errori[:5],
        "richieste": reqs,
        "svg_tempi": [(round(s["t"]), s["id"], round(s["w"])) for s in svg],
    }
    # ultima richiesta JSON finita, prima del primo disegno
    if prova_extra:
        # ridimensionamento
        nl = 1200 if larg >= 600 else 844
        na = alt if larg >= 600 else 390
        pg.evaluate("window.__m.svg.length = 0; window.__m.lt.length = 0; window.__m.rem = 0; window.__m.t_rid = performance.now()")
        pg.set_viewport_size({"width": nl, "height": na})
        time.sleep(3 if not rallenta else 6)
        r = pg.evaluate("({n: window.__m.svg.length, rem: window.__m.rem, lt: window.__m.lt.length, ltms: window.__m.lt.reduce((a,b)=>a+b.d,0), fine: window.__m.svg.length ? window.__m.svg[window.__m.svg.length-1].t - window.__m.t_rid : 0})")
        out["resize"] = {"svg_ridisegnati": r["n"], "long_n": r["lt"], "long_ms": round(r["ltms"]), "durata_ms": round(r["fine"])}
        pg.set_viewport_size({"width": larg, "height": alt})
        time.sleep(3 if not rallenta else 6)
        # scorrimento
        pg.evaluate("window.__m.svg.length = 0; window.__m.lt.length = 0; window.__m.t_sc = performance.now()")
        h = pg.evaluate("document.documentElement.scrollHeight")
        y = 0
        while y < h:
            y += alt // 2
            pg.evaluate("window.scrollTo(0, %d)" % y)
            time.sleep(0.12)
        time.sleep(1)
        r = pg.evaluate("({n: window.__m.svg.length, lt: window.__m.lt.length, ltms: window.__m.lt.reduce((a,b)=>a+b.d,0)})")
        out["scroll"] = {"svg_nuovi": r["n"], "long_n": r["lt"], "long_ms": round(r["ltms"])}
    br.close()
    return out


CHIAVI = ["primo_grande_ms", "ultima_richiesta_ms", "tav1_ms", "ultimo_svg_ms", "fcp_ms", "lcp_ms", "cls", "n_svg", "n_richieste", "n_json", "kb_totali", "kb_json", "kb_js", "long_n", "long_ms", "long_max_ms", "script_s", "altezza_pagina"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    ap.add_argument("--locale", action="store_true")
    ap.add_argument("--larghezza", type=int, default=1440)
    ap.add_argument("--rallenta", action="store_true")
    ap.add_argument("--prove", type=int, default=3)
    ap.add_argument("--nome", required=True)
    ap.add_argument("--pagina", default="index.html")
    a = ap.parse_args()
    srv = None
    if a.locale:
        srv, base = avvia_server()
    else:
        base = a.url
    url = base + a.pagina
    os.makedirs(USCITA, exist_ok=True)
    prove = []
    with sync_playwright() as pw:
        for i in range(a.prove):
            r = una_prova(pw, url, a.larghezza, a.rallenta)
            prove.append(r)
            print("prova", i + 1, {k: r[k] for k in ("primo_grande_ms", "tav1_ms", "ultimo_svg_ms", "kb_totali", "n_richieste", "long_ms")}, r["errori"][:2], flush=True)
    med = {k: statistics.median([p[k] for p in prove if p[k] is not None]) for k in CHIAVI}
    for k in ("resize", "scroll"):
        if k in prove[0]:
            med[k] = {kk: statistics.median([p[k][kk] for p in prove]) for kk in prove[0][k]}
    with open(os.path.join(USCITA, a.nome + ".json"), "w", encoding="utf-8") as f:
        json.dump({"url": url, "larghezza": a.larghezza, "rallenta": a.rallenta, "mediana": med, "prove": prove}, f, ensure_ascii=False, indent=1)
    print("MEDIANA", a.nome, json.dumps(med, ensure_ascii=False))
    if srv:
        srv.shutdown()


if __name__ == "__main__":
    main()
