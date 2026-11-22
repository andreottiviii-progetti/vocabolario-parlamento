/* Il vocabolario del Parlamento — funzioni comuni: dati, formati, testata, piede, grafici */
(function () {
  "use strict";
  const G = (window.G = {});
  G.ROSSO = "#E3120B"; G.NERO = "#111111"; G.GIALLO = "#FFE600"; G.GRIGIO = "#6B6B6B"; G.GDATI = "#9A9A9A"; G.RIGA = "#D9D9D9";
  G.SERIE = ["#E3120B", "#111111", "#1437E6", "#946300", "#00796B"];
  G.FONTE = "Fonte: resoconti stenografici di Camera e Senato.";
  G.ANNI = []; for (let a = 1848; a <= 2022; a++) G.ANNI.push(a);
  G.SOGLIA = 300000; // parole minime perché un anno di un ramo entri nelle curve
  G.TRASCR = { camera: [1953, 1979, 1987, 1994, 2001, 2006, 2008, 2013, 2018], senato: [1968, 1987, 1996, 2000, 2018] };
  G.EPOCHE = [[1848, 1922, "Regno liberale", "#111111"], [1922, 1943, "Fascismo", "#555555"], [1943, 1948, "", "#BDBDBD"], [1948, 1994, "Prima Repubblica", "#111111"], [1994, 2023, "Seconda Repubblica", "#555555"]];

  /* ---------- dati ---------- */
  const memo = {};
  G.carica = function (p) {
    if (!memo[p]) memo[p] = fetch("dati/" + p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });
    return memo[p];
  };
  G.param = (k) => new URLSearchParams(location.search).get(k);
  G.PEZZO = 400; // parole per pezzo di dati
  G.indiceParole = function () {
    return G.carica("parole/indice.json").then((ix) => {
      if (!ix._mappa) { ix._mappa = new Map(); ix.p.forEach((r, i) => ix._mappa.set(r[0], i)); }
      return ix;
    });
  };
  G.pad = (n) => String(n).padStart(3, "0");
  /* normalizza come il progetto: minuscolo, senza accenti, solo a-z */
  G.norma = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  G.curvaParola = function (w) {
    return G.indiceParole().then((ix) => {
      const i = ix._mappa.get(w);
      if (i == null) return null;
      return Promise.all([G.carica("parole/c/" + G.pad(Math.floor(i / G.PEZZO)) + ".json"), G.carica("base.json")]).then(([c, b]) => {
        const r = ix.p[i];
        return { w: w, forma: r[1] || w, tot: r[2], picco: r[3], y0: r[4], conti: c[w], pm: G.perMilione(c[w], b.tot) };
      });
    });
  };
  G.schedaParola = function (w) {
    return G.indiceParole().then((ix) => {
      const i = ix._mappa.get(w);
      if (i == null) return null;
      return G.carica("parole/d/" + G.pad(Math.floor(i / G.PEZZO)) + ".json").then((d) => d[w]);
    });
  };
  /* conti [camera[], senato[]] (sparsi: [anno0, v, v, ...]) -> per milione {c, s, m} con null dove l'anno è debole */
  G.espandi = function (sp) {
    const out = new Array(175).fill(0);
    if (!sp) return out;
    for (let k = 0; k < sp.length; k += 2) { const da = sp[k] - 1848; const v = sp[k + 1]; for (let j = 0; j < v.length; j++) out[da + j] = v[j]; }
    return out;
  };
  G.perMilione = function (conti, tot) {
    const c = G.espandi(conti[0]), s = G.espandi(conti[1]);
    const pc = c.map((v, i) => (tot[0][i] >= G.SOGLIA ? (v / tot[0][i]) * 1e6 : null));
    const ps = s.map((v, i) => (tot[1][i] >= G.SOGLIA ? (v / tot[1][i]) * 1e6 : null));
    const pm = pc.map((v, i) => (v == null ? ps[i] : ps[i] == null ? v : (v + ps[i]) / 2));
    return { c: pc, s: ps, m: pm, nc: c, ns: s };
  };
  G.media3 = function (v) {
    return v.map((x, i) => { if (x == null) return null; let s = 0, n = 0; for (let j = i - 1; j <= i + 1; j++) if (v[j] != null) { s += v[j]; n++; } return s / n; });
  };
  G.picco = function (v) { let m = -1, k = 0; v.forEach((x, i) => { if (x != null && x > m) { m = x; k = i; } }); return { anno: G.ANNI[k], val: m, i: k }; };

  /* ---------- formati all'italiana ---------- */
  G.num = function (x, dec) {
    if (x == null || isNaN(x)) return "–";
    dec = dec == null ? 0 : dec;
    const s = Math.abs(x).toFixed(dec).split(".");
    const i = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (x < 0 ? "−" : "") + i + (s[1] ? "," + s[1] : "");
  };
  G.num1 = (x) => G.num(x, x != null && Math.abs(x) < 10 && x % 1 !== 0 ? 1 : 0);
  G.seg = (x, dec) => (x > 0 ? "+" : "") + G.num(x, dec);
  G.pct = (x, dec) => G.num(x * 100, dec == null ? 1 : dec) + "%";
  G.MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  G.data = function (s) {
    if (!s) return "";
    const p = s.split("-").map(Number);
    if (p.length < 3 || !p[2]) return p.length > 1 && p[1] ? G.MESI[p[1] - 1] + " " + p[0] : String(p[0]);
    return (p[2] === 1 ? "1°" : p[2]) + " " + G.MESI[p[1] - 1] + " " + p[0];
  };
  G.nome = function (s) {
    if (!s) return "";
    return s.toLowerCase().replace(/(^|[\s'’\-])([a-zàèéìòù])/g, (m, a, b) => a + b.toUpperCase());
  };
  G.maiusc = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  G.oratore = (nome) => (/non riconosciut/i.test(nome || "") ? "oratore non riconosciuto" : G.nome(nome));
  G.ramo = (r) => (r === "senato" ? "Senato" : "Camera");
  G.esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  G.romano = (n) => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"][n] || String(n);

  /* link */
  G.lParola = (w, testo) => `<a class="lk" href="parola.html?p=${encodeURIComponent(w)}">${G.esc(testo || w)}</a>`;
  G.lAnno = (a) => `<a class="lk" href="anno.html?a=${a}">${a}</a>`;
  G.lLeg = (id, testo) => `<a class="lk" href="legislatura.html?id=${id}">${G.esc(testo)}</a>`;
  G.lPartito = (id, testo) => `<a class="lk" href="partito.html?id=${encodeURIComponent(id)}">${G.esc(testo || id)}</a>`;
  G.lPersona = (id, testo) => `<a class="lk" href="persona.html?id=${encodeURIComponent(id)}">${G.esc(testo)}</a>`;
  G.lEsp = (cod) => `<a class="lk cod" href="esperimento.html?cod=${encodeURIComponent(cod)}">${G.esc(cod)}</a>`;
  G.classeEsito = (e) => (e === "regge" ? "regge" : e === "in parte" ? "parte" : e === "smentita" ? "smentita" : "altro");
  G.esito = (e) => `<span class="esito ${G.classeEsito(e)}">${G.esc(e)}</span>`;
  /* legislatura che contiene un anno (id della pagina) */
  G.legDiAnno = function (anno, legs) {
    const v = legs.filter((l) => anno >= l.da && anno <= l.a);
    return v.length ? v[v.length - 1] : null;
  };

  /* evidenzia la parola in una frase */
  G.frase = function (testo, forme) {
    let h = G.esc(testo);
    (forme || []).filter(Boolean).forEach((f) => {
      const re = new RegExp("(^|[^A-Za-zÀ-ÿ])(" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")(?=[^A-Za-zÀ-ÿ]|$)", "i");
      h = h.replace(re, '$1<span class="evid">$2</span>');
    });
    return h;
  };

  /* ---------- testata, striscia dove sei, piede ---------- */
  G.INVENTARIO = [["parole", "parole", "parole.html"], ["anni", "anni", "anni.html"], ["legislature", "legislature", "legislature.html"], ["partiti", "partiti", "partiti.html"],
    ["persone", "persone", "persone.html"], ["temi", "temi", "temi.html"], ["storie", "storie", "storie.html"], ["esperimenti", "esperimenti", "esperimenti.html"]];
  G.MENU = [["Parole", "parole.html"], ["Anni", "anni.html"], ["Legislature", "legislature.html"], ["Partiti", "partiti.html"], ["Persone", "persone.html"], ["Temi", "temi.html"], ["Storie", "storie.html"], ["Esperimenti", "esperimenti.html"], ["Metodo e limiti", "metodo.html"], ["Dati", "dati.html"], ["Paper", "paper.html"]];
  G.testata = function (o) {
    o = o || {};
    const el = document.getElementById("testata");
    if (!el) return;
    el.className = "testata" + (o.compatta === false ? "" : " compatta");
    const menu = G.MENU.map((m) => `<a href="${m[1]}"${o.attivo === m[0] ? ' class="attivo"' : ""}>${m[0]}</a>`).join("");
    let inv = "";
    if (o.compatta === false) {
      inv = '<div class="inventario">' + G.INVENTARIO.map((r) => `<a href="${r[2]}"><b>${G.num(G.conti[r[0]])}</b> ${r[1]}</a>`).join("") + "</div>";
    }
    el.innerHTML = `
      <div class="riga-alta"><span>Camera e Senato, 1848-2022</span><span>Aggiornato al 22 novembre 2026</span></div>
      <h1><a href="index.html">Il vocabolario del Parlamento</a></h1>${inv}
      <nav class="menu" aria-label="Sezioni">${menu}<form action="parola.html" method="get" role="search"><input name="p" type="search" placeholder="scrivi una parola" aria-label="Cerca una parola" autocomplete="off"><button type="submit">Cerca</button></form></nav>
      ${o.briciole ? '<div class="briciole">' + o.briciole + "</div>" : ""}`;
  };
  G.conti = {};
  /* striscia «dove sei» */
  G.dove = function (finestra) {
    const el = document.getElementById("dove");
    if (!el) return;
    G.grafico(d3.select(el), (area, w) => {
      const stretto = w < 700, H = 40;
      const svg = area.append("svg").attr("width", w).attr("height", H).attr("role", "img").attr("aria-label", finestra ? "Sei qui: " + finestra[2] : "1848-2022");
      const x = d3.scaleLinear().domain([1848, 2023]).range([0, w]);
      G.EPOCHE.forEach((e) => {
        svg.append("rect").attr("x", x(e[0])).attr("y", 5).attr("width", Math.max(0, x(e[1]) - x(e[0]) - 1)).attr("height", 15).attr("fill", e[3]);
        if (e[2] && x(e[1]) - x(e[0]) > (stretto ? 70 : 110)) svg.append("text").attr("x", x(e[0]) + 5).attr("y", 16.5).attr("fill", "#fff").attr("font-size", 12).attr("font-weight", 700).text(stretto && e[2] === "Seconda Repubblica" ? "Seconda Rep." : e[2]);
      });
      d3.range(1850, 2021, 10).forEach((a) => {
        svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", 20).attr("y2", a % 50 === 0 ? 26 : 23).attr("stroke", G.NERO);
        if (a % 50 === 0 || (!stretto && a % 20 === 0 && a !== 2020)) svg.append("text").attr("x", x(a) + 2).attr("y", 37).attr("font-size", 12).attr("font-weight", a % 50 === 0 ? 800 : 400).attr("fill", G.NERO).text(a);
      });
      if (finestra) {
        const x0 = x(finestra[0]), x1 = Math.max(x0 + 5, x(finestra[1] + 1));
        svg.append("rect").attr("x", x0).attr("y", 2).attr("width", x1 - x0).attr("height", 21).attr("fill", "none").attr("stroke", G.ROSSO).attr("stroke-width", 3);
        const t = "Sei qui: " + finestra[2];
        const destra = x1 + 8 + t.length * 6.6 < w;
        svg.append("text").attr("x", destra ? x1 + 6 : x0 - 6).attr("y", 37).attr("text-anchor", destra ? "start" : "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", G.ROSSO).attr("class", "alone").text(t);
      }
    });
  };
  G.piede = function () {
    const el = document.getElementById("piede");
    if (!el) return;
    el.className = "piede";
    el.innerHTML = `<div class="pagina"><div class="griglia">
      <div class="c5"><h3><a href="metodo.html">Metodo e limiti</a></h3>
        <p>Le parole vengono dai resoconti stenografici, non dalla voce: lo stenografo riordina le frasi, e il suo modo di scrivere cambia nel tempo. Alla Camera cambia nel ${G.TRASCR.camera.join(", ").replace(/, (\d+)$/, " e $1")}; al Senato nel ${G.TRASCR.senato.join(", ").replace(/, (\d+)$/, " e $1")}.</p>
        <div class="fig-area" id="piede-trascr"></div>
        <p class="piccolo grigio" style="margin-top:8px">Nell'Ottocento lo scanner sbaglia più spesso. Le frasi di controllo sono state rilette da programmi, non da persone. <a href="metodo.html">Tutto il metodo</a></p></div>
      <div class="c4 fil"><h3><a href="paper.html">I due working paper</a></h3>
        <a class="doc" href="paper.html#aula">Che lingua parla l'aula? L'italiano del Parlamento e il resoconto che lo scrive (1848-2022)<span>Working paper, PDF in preparazione</span></a>
        <a class="doc" href="paper.html#chi">Chi parla come chi<span>Working paper, PDF in preparazione</span></a></div>
      <div class="c3 fil"><h3><a href="dati.html">I dati</a></h3>
        <a class="doc" href="dati.html">Conteggi per parola e anno<span>${G.num(G.conti.parole)} parole, Camera e Senato</span></a>
        <a class="doc" href="dati.html">Mappa dei partiti<span>${G.num(G.conti.schede_partito)} schede partito per legislatura</span></a>
        <a class="doc" href="esperimenti.html">Elenco degli esperimenti<span>${G.num(G.conti.esperimenti)} esperimenti su ${G.num(G.conti.ipotesi)} ipotesi</span></a></div>
      </div><div class="ultima">Il vocabolario del Parlamento. ${G.num(G.conti.interventi)} interventi in ${G.num(G.conti.anni)} anni di resoconti di Camera e Senato, 1848-2022. Fonte dei testi: archivio IPSA (Fondazione Bruno Kessler), licenza CC BY 3.0.</div></div>`;
    G.grafico("#piede-trascr", (area, w) => {
      const h = 64, m = { l: 56, r: 8 };
      const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Anni in cui cambia la trascrizione");
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      [["Camera", G.TRASCR.camera, 16, G.NERO], ["Senato", G.TRASCR.senato, 40, G.NERO]].forEach(([n, anni, y, c]) => {
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y).attr("stroke", G.RIGA);
        svg.append("text").attr("x", 0).attr("y", y + 4).attr("class", "etich").attr("fill", c).text(n);
        anni.forEach((a) => svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", y - 6).attr("y2", y + 6).attr("stroke", c).attr("stroke-width", 2));
      });
      [1848, 1900, 1950, 2022].forEach((a) => svg.append("text").attr("x", x(a)).attr("y", h - 2).attr("text-anchor", a === 1848 ? "start" : a === 2022 ? "end" : "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(a));
    });
  };

  /* ---------- registro dei grafici (ridisegno al cambio di larghezza) ---------- */
  const REG = [];
  let avviato = false;
  G.grafico = function (sel, fn) {
    const area = typeof sel === "string" ? d3.select(sel) : sel;
    if (area.empty()) return;
    const r = { area, fn };
    REG.push(r);
    if (avviato) disegna(r);
  };
  function disegna(r) {
    r.area.selectAll("*").remove();
    const w = Math.floor(r.area.node().getBoundingClientRect().width);
    if (w > 0) r.fn(r.area, w);
  }
  let ultimaL = 0;
  G.avvia = function (main) {
    const parti = () => { ultimaL = window.innerWidth; avviato = true; REG.forEach(disegna); };
    const via = () => {
      G.carica("base.json").then((B) => {
        G.B = B; G.conti = B.conti; G.conti.anni = G.ANNI.length;
        if (B.trascrizione) G.TRASCR = B.trascrizione;
        document.querySelectorAll("[data-conto]").forEach((e) => { const v = G.conti[e.dataset.conto]; if (v != null) e.textContent = G.num(v, String(v).indexOf(".") >= 0 ? 1 : 0); });
      }).catch(() => {}).then(() => main()).catch((e) => { console.error(e); }).then(() => {
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(parti); else parti();
      });
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (window.innerWidth !== ultimaL) parti(); }, 150); });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", via); else via();
  };
  G.ridisegna = function (sel) { REG.filter((r) => r.area.node() === document.querySelector(sel)).forEach(disegna); };

  /* figura: titolo, sottotitolo, riga di lettura, area, fonte con dati CSV */
  G.figura = function (sel, o) {
    const box = (typeof sel === "string" ? d3.select(sel) : sel).append("figure").attr("class", "fig");
    const cap = box.append("figcaption");
    if (o.titolo != null) cap.append("h3").attr("class", "fig-tit").html(o.titolo);
    if (o.sotto != null) cap.append("p").attr("class", "fig-sotto").html(o.sotto);
    if (o.lettura) box.append("p").attr("class", "fig-lettura").attr("aria-live", "polite");
    const area = box.append("div").attr("class", "fig-area");
    if (o.fonte !== false) {
      const f = box.append("p").attr("class", "fig-fonte").html((o.fonte || G.FONTE) + (o.limite ? " " + o.limite : ""));
      if (o.csv) f.append("span").html(" ").append("button").attr("type", "button").text("Dati del grafico (CSV)").on("click", () => G.scaricaCSV(o.nomeCSV || "dati", o.csv()));
    }
    area.attr("data-titolo", (o.titolo || "").replace(/<[^>]+>/g, ""));
    return area;
  };
  G.scaricaCSV = function (nome, righe) {
    const testo = righe.map((r) => r.map((c) => (c == null ? "" : /[",;\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : String(c))).join(",")).join("\n");
    const b = new Blob(["﻿" + testo], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nome + ".csv"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  G.righe = function (g, testo, maxch) {
    const parole = String(testo).split(" ");
    const out = []; let cur = "";
    parole.forEach((p) => { if ((cur + " " + p).trim().length > maxch && cur) { out.push(cur); cur = p; } else cur = (cur + " " + p).trim(); });
    if (cur) out.push(cur);
    out.forEach((r, i) => g.append("tspan").attr("x", g.attr("x")).attr("dy", i === 0 ? 0 : "1.18em").text(r));
    return out.length;
  };
  G.separa = function (items, gap, min, max) {
    items.sort((a, b) => a.y - b.y);
    for (let k = 0; k < 80; k++) {
      let mosso = false;
      for (let i = 1; i < items.length; i++) {
        const d = items[i].y - items[i - 1].y;
        if (d < gap) { const s = (gap - d) / 2; items[i].y += s; items[i - 1].y -= s; mosso = true; }
      }
      items.forEach((it) => { if (min != null) it.y = Math.max(min, it.y); if (max != null) it.y = Math.min(max, it.y); });
      if (!mosso) break;
    }
    return items;
  };
  G.nota = function (svg, px, py, tx, ty, testo, o) {
    o = o || {};
    const g = svg.append("g");
    g.append("line").attr("class", "nota-l").attr("x1", px).attr("y1", py).attr("x2", tx).attr("y2", ty + (ty > py ? -12 : 4));
    const t = g.append("text").attr("class", "nota-t").attr("x", tx).attr("y", ty).attr("text-anchor", o.anchor || "start");
    if (o.bold) t.attr("font-weight", 700);
    G.righe(t, testo, o.maxch || 30);
    return g;
  };
  G.lineeTrascrizione = function (svg, x, y0, y1, ramo, scritta) {
    const anni = ramo === "senato" ? G.TRASCR.senato : ramo === "entrambi" ? Array.from(new Set(G.TRASCR.camera.concat(G.TRASCR.senato))).sort() : G.TRASCR.camera;
    const [d0, d1] = x.domain();
    const g = svg.append("g");
    anni.filter((a) => a >= d0 && a <= d1).forEach((a, i) => {
      g.append("line").attr("class", "trascrizione").attr("x1", x(a)).attr("x2", x(a)).attr("y1", y0).attr("y2", y1);
      if (scritta && i === 0) g.append("text").attr("class", "nota-t").attr("x", x(a) + 4).attr("y", y0 + 12).text("tratteggio: cambia la trascrizione");
    });
  };

  /* ---------- grafico a linee ---------- */
  /* o: {x:[a,b], y:[0,max], serie:[{punti:[[x,y]], colore, sp, etich, valoreEtich}], h, m, unita, trascr, note, lettura:fn} */
  G.linee = function (area, w, o) {
    const stretto = w < 560;
    const h = o.h || (stretto ? 240 : 340);
    const m = Object.assign({ t: 22, r: stretto ? 12 : 110, b: 26, l: 0 }, o.m || {});
    if (stretto && o.etichSopra !== false) m.r = 12;
    const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", area.attr("data-titolo") || "grafico");
    const x = d3.scaleLinear().domain(o.x).range([m.l, w - m.r]);
    const y = d3.scaleLinear().domain(o.y).range([h - m.b, m.t]);
    const gy = svg.append("g").attr("class", "asse");
    const ticks = o.yTicks || y.ticks(4);
    ticks.forEach((v, i) => {
      gy.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null);
      gy.append("text").attr("x", m.l).attr("y", y(v) - 4).text((o.yFmt || G.num1)(v) + (i === ticks.length - 1 && o.unita ? " " + o.unita : ""));
    });
    const span = o.x[1] - o.x[0];
    const passo = o.xPasso || (span > 100 ? (stretto ? 50 : 20) : span > 40 ? (stretto ? 20 : 10) : span > 12 ? (stretto ? 5 : 2) : 1);
    d3.range(Math.ceil(o.x[0] / passo) * passo, o.x[1] + 0.001, passo).forEach((v) => gy.append("text").attr("x", x(v)).attr("y", h - m.b + 17).attr("text-anchor", "middle").text(o.xFmt ? o.xFmt(v) : v));
    if (o.fasce) o.fasce.forEach((f) => {
      svg.append("rect").attr("x", x(f.da)).attr("width", Math.max(1, x(f.a) - x(f.da))).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", f.colore || "#EFEFEF");
      if (f.testo) svg.append("text").attr("x", x(f.da) + 4).attr("y", m.t + 12).attr("class", "nota-t").attr("font-weight", 700).text(f.testo);
    });
    if (o.trascr) G.lineeTrascrizione(svg, x, m.t, h - m.b, o.trascr, !stretto);
    const linea = d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]));
    const fine = [];
    o.serie.forEach((s) => {
      if (s.banda) {
        const ar = d3.area().defined((d) => d[1] != null && d[2] != null).x((d) => x(d[0])).y0((d) => y(d[1])).y1((d) => y(d[2]));
        svg.append("path").attr("d", ar(s.banda)).attr("fill", "#E6E6E6");
      }
      svg.append("path").attr("d", linea(s.punti)).attr("fill", "none").attr("stroke", s.colore).attr("stroke-width", s.sp || 1.5).attr("stroke-linejoin", "round").attr("stroke-dasharray", s.tratt || null);
      // punti isolati (anni senza vicini) come pallini, così non spariscono
      s.punti.forEach((d, i) => { if (d[1] != null && (s.punti[i - 1] || [])[1] == null && (s.punti[i + 1] || [])[1] == null) svg.append("circle").attr("cx", x(d[0])).attr("cy", y(d[1])).attr("r", 1.8).attr("fill", s.colore); });
      if (s.punto) s.punti.filter((d) => d[1] != null).forEach((d) => svg.append("circle").attr("cx", x(d[0])).attr("cy", y(d[1])).attr("r", s.punto).attr("fill", s.colore));
      const ult = s.punti.filter((d) => d[1] != null).slice(-1)[0];
      if (ult && s.etich && !(stretto && o.etichSopra !== false)) fine.push({ y: y(ult[1]), x: x(ult[0]), s });
      if (s.piccoEtich && s.piccoEtich.x != null) {
        const px = x(s.piccoEtich.x), py = y(s.piccoEtich.y);
        svg.append("circle").attr("cx", px).attr("cy", py).attr("r", 3).attr("fill", s.colore);
        const anchor = px > w - 90 ? "end" : px < 60 ? "start" : "middle";
        svg.append("text").attr("class", "etich").attr("x", px).attr("y", Math.max(12, py - 7)).attr("text-anchor", anchor).attr("fill", s.colore).text(s.piccoEtich.testo);
      }
    });
    G.separa(fine, 15, m.t, h - m.b);
    fine.forEach((f) => svg.append("text").attr("class", "etich").attr("x", f.x + 6).attr("y", f.y + 4).attr("fill", f.s.colore).text(f.s.etich));
    if (o.note) o.note.slice(0, stretto ? 2 : 3).forEach((n) => G.nota(svg, x(n.x), y(n.y), x(n.tx != null ? n.tx : n.x), n.ty != null ? n.ty : y(n.y) - 40, n.testo, n));
    if (o.lettura) {
      const riga = area.node().parentNode.querySelector(".fig-lettura");
      const v = svg.append("line").attr("y1", m.t).attr("y2", h - m.b).attr("stroke", G.NERO).attr("stroke-width", 1).style("display", "none");
      svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", Math.max(0, w - m.r - m.l)).attr("height", h - m.t - m.b).attr("fill", "transparent")
        .on("pointermove", (ev) => {
          const a = Math.round(x.invert(d3.pointer(ev)[0]));
          v.attr("x1", x(a)).attr("x2", x(a)).style("display", null);
          if (riga) riga.innerHTML = o.lettura(a);
        })
        .on("pointerleave", () => { v.style("display", "none"); });
    }
    if (o.dopo) o.dopo(svg, x, y, h, m);
    return { svg, x, y, m, h };
  };

  /* mini curva ad area (piccoli multipli) */
  G.mini = function (area, w, valori, o) {
    o = o || {};
    const h = o.h || 70, m = { t: 16, r: 4, b: o.asse === false ? 2 : 16, l: 0 };
    const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", o.label || "curva");
    const pts = G.ANNI.map((x, i) => [x, valori[i]]);
    const max = d3.max(pts, (p) => p[1] || 0) || 1;
    const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
    const y = d3.scaleLinear().domain([0, max]).range([h - m.b, m.t]);
    svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", G.NERO).attr("shape-rendering", "crispEdges");
    const ar = d3.area().defined((d) => d[1] != null).x((d) => x(d[0])).y0(y(0)).y1((d) => y(d[1]));
    svg.append("path").attr("d", ar(pts)).attr("fill", o.colore || G.NERO);
    if (o.picco !== false) {
      const p = o.piccoAnno ? pts[o.piccoAnno - 1848] : pts.reduce((b, c) => ((c[1] || 0) > (b[1] || 0) ? c : b), pts[0]);
      const px = x(p[0]);
      const anchor = px > w - 30 ? "end" : px < 30 ? "start" : "middle";
      svg.append("line").attr("x1", px).attr("x2", px).attr("y1", y(p[1] || 0) - 3).attr("y2", y(p[1] || 0)).attr("stroke", G.ROSSO).attr("stroke-width", 2);
      svg.append("text").attr("x", px).attr("y", Math.max(12, y(p[1] || 0) - 5)).attr("text-anchor", anchor).attr("font-size", 12).attr("font-weight", 800).attr("fill", G.ROSSO).text(p[0]);
    }
    if (o.asse !== false) [1848, 2022].forEach((v, i) => svg.append("text").attr("x", x(v)).attr("y", h - 2).attr("text-anchor", i ? "end" : "start").attr("font-size", 12).attr("fill", G.GRIGIO).text(v));
    return svg;
  };
  /* mini-curva da tabella (svg in linea) */
  G.miniSVG = function (valori, w, h) {
    w = w || 100; h = h || 22;
    const max = d3.max(valori, (v) => v || 0) || 1;
    let k = 0; valori.forEach((v, i) => { if ((v || 0) > (valori[k] || 0)) k = i; });
    const x = (i) => (i / (valori.length - 1)) * (w - 4) + 2, y = (v) => h - 2 - ((v || 0) / max) * (h - 5);
    const d = valori.map((v, i) => (v == null ? null : [x(i), y(v)])).reduce((s, p, i) => (p ? s + (s && valori[i - 1] != null ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1) : s), "");
    return `<svg class="mini-svg" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#111" stroke-width="1.25"/><circle cx="${x(k).toFixed(1)}" cy="${y(valori[k]).toFixed(1)}" r="2.2" fill="#E3120B"/></svg>`;
  };

  /* barre orizzontali in tabella: righe [[etichetta html, valore, tesi?]] */
  G.barre = function (righe, o) {
    o = o || {};
    const max = o.max || d3.max(righe, (r) => r[1]) || 1;
    return '<table class="barre">' + righe.map((r) => `<tr${r[2] ? ' class="tesi"' : ""}><td class="e">${r[0]}</td><td class="b"><i style="width:${Math.max(0.5, (100 * r[1]) / max).toFixed(1)}%"></i></td><td class="n">${(o.fmt || G.num)(r[1])}</td></tr>`).join("") + "</table>";
  };

  /* tabella ordinabile: colonne [{t, k, n:true, fmt}] */
  G.tabella = function (el, colonne, righe, o) {
    o = o || {};
    let ord = o.ord != null ? o.ord : -1, verso = o.verso || 1;
    function fai() {
      let r = righe.slice();
      if (ord >= 0) { const c = colonne[ord]; r.sort((a, b) => { const va = c.v ? c.v(a) : a[c.k], vb = c.v ? c.v(b) : b[c.k]; return (va > vb ? 1 : va < vb ? -1 : 0) * verso; }); }
      if (o.limite) r = r.slice(0, o.limite);
      el.innerHTML = '<table class="fitta"><thead><tr>' + colonne.map((c, i) => `<th class="ord${c.n ? " n" : ""}${i === ord ? (verso > 0 ? " su" : " giu") : ""}" data-i="${i}" scope="col">${c.t}</th>`).join("") + "</tr></thead><tbody>" +
        r.map((x) => `<tr${o.evid && o.evid(x) ? ' class="evid-riga"' : ""}>` + colonne.map((c) => `<td${c.n ? ' class="n"' : ""}>${c.fmt ? c.fmt(x) : G.esc(x[c.k])}</td>`).join("") + "</tr>").join("") + "</tbody></table>";
      el.querySelectorAll("th").forEach((th) => th.addEventListener("click", () => { const i = +th.dataset.i; if (i === ord) verso = -verso; else { ord = i; verso = colonne[i].n ? -1 : 1; } fai(); }));
    }
    fai();
  };

  /* errore leggibile */
  G.nonTrovato = function (el, testo) {
    el.innerHTML = `<p class="segnaposto"><b>${testo}</b> Torna alla <a class="lk" href="index.html">prima pagina</a> o cerca una parola qui sopra.</p>`;
  };
})();
