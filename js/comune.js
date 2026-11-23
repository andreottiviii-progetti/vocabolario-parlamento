/* Il vocabolario del Parlamento — funzioni comuni: dati, formati, testata, piede, grafici */
(function () {
  "use strict";
  const G = (window.G = {});
  G.INK = "#16181D"; G.ROSSO = "#E3120B"; G.NERO = "#111111"; G.GIALLO = "#FFE600"; G.GRIGIO = "#6B6B6B"; G.GDATI = "#9A9A9A"; G.RIGA = "#D9D9D9";
  G.SERIE = ["#2454FF", "#E3120B", "#00A85A", "#7B3FE4", "#F56300"];
  G.FAMIGLIA = { "PCI-PD": "#E3120B", DC: "#1E78E6", PSI: "#FF7BAC", "MSI-AN-FdI": "#1B2A7A", "FI-PdL": "#00B4D8", Lega: "#00A85A", M5S: "#F5C400", altri: "#B8BEC7" };
  G.FONTE = "Fonte: resoconti stenografici di Camera e Senato.";
  G.ANNI = []; for (let a = 1848; a <= 2022; a++) G.ANNI.push(a);
  G.SOGLIA = 300000; // parole minime perché un anno di un ramo entri nelle curve
  G.TRASCR = { camera: [], senato: [] }; // si legge da base.json (calendario rivisto del progetto)
  G.EPOCHE = [[1848, 1922, "Regno liberale"], [1922, 1943, "Fascismo"], [1943, 1948, ""], [1948, 1994, "Prima Repubblica"], [1994, 2023, "Seconda Repubblica"]];

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
  G.alRamo = (r) => (r === "senato" ? "al Senato" : "alla Camera");
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
  G.MENU = [["Parole", "parole.html"], ["Prime volte", "primevolte.html"], ["Anni", "anni.html"], ["Legislature", "legislature.html"], ["Partiti", "partiti.html"], ["Persone", "persone.html"], ["Temi", "temi.html"], ["Storie", "storie.html"], ["Percorsi", "percorsi.html"], ["Esperimenti", "esperimenti.html"], ["Metodo e limiti", "metodo.html"], ["Dati", "dati.html"], ["Paper", "paper.html"]];
  /* testatina del vocabolario: le parole guida ai due lati (come nei dizionari: la prima e l'ultima voce della pagina),
     il menu in mezzo; nelle pagine interne, sotto, il nome del sito e la ricerca */
  G.MARCHIO = 'vocabolàrio <i>del</i> Parlaménto';
  G.testata = function (o) {
    o = o || {};
    const el = document.getElementById("testata");
    if (!el) return;
    const home = o.compatta === false;
    el.className = "testatina" + (home ? " home" : "");
    const menu = G.MENU.map((m) => `<a href="${m[1]}"${o.attivo === m[0] ? ' class="attivo" aria-current="page"' : ""}>${m[0]}</a>`).join("");
    const g = o.guide || (home ? [G.lGuida("adunque"), G.lGuida("tangentopoli")] : [G.esc((o.attivo || "vocabolario").toLowerCase()), "1848 · 2022"]);
    el.innerHTML = `<div class="riga-guide"><span class="guida" id="guida-a">${g[0]}</span><nav class="menu" aria-label="Sezioni">${menu}</nav><span class="guida destra" id="guida-b">${g[1]}</span></div>` +
      (home ? "" : `<div class="riga-nome"><a class="marchio" href="index.html">${G.MARCHIO}</a><form class="cerca-testa" action="parola.html" method="get" role="search"><input name="p" type="search" placeholder="cerca una voce: parola o espressione" aria-label="Cerca una parola o un'espressione" autocomplete="off" list="sugg-ricerca"><datalist id="sugg-ricerca"></datalist><button type="submit">Cerca</button></form></div>`) +
      (o.briciole ? '<div class="briciole">' + o.briciole + "</div>" : "");
    G.suggerisci(el.querySelector("input[name=p]"), el.querySelector("#sugg-ricerca"));
  };
  /* parola guida che porta alla sua voce */
  G.lGuida = (w, testo) => `<a href="parola.html?p=${encodeURIComponent(w)}">${G.esc(testo || w)}</a>`;
  /* cambia le parole guida quando la pagina sa qual è la sua voce (precedente e successiva) */
  G.guide = function (a, b) {
    const ga = document.getElementById("guida-a"), gb = document.getElementById("guida-b");
    if (ga && a != null) ga.innerHTML = a;
    if (gb && b != null) gb.innerHTML = b;
  };
  /* voce precedente e successiva come parole guida: [href, testo] */
  G.guideVicine = function (prima, dopo) {
    const corto = (s) => { s = String(s || ""); return s.length > 34 ? s.slice(0, 32).replace(/\s+\S*$/, "") + "…" : s; };
    G.guide(prima ? `<a href="${prima[0]}" title="${G.esc(prima[1])}">◂ ${G.esc(corto(prima[1]))}</a>` : "", dopo ? `<a href="${dopo[0]}" title="${G.esc(dopo[1])}">${G.esc(corto(dopo[1]))} ▸</a>` : "");
  };
  /* suggerimenti mentre si scrive: parole che cominciano cosi' (archivio delle prime volte) ed espressioni che le contengono */
  G.suggerisci = function (inp, lista) {
    if (!inp || !lista) return;
    let t;
    inp.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const q = G.normaFrase(inp.value);
        if (q.length < 2) { lista.innerHTML = ""; return; }
        const ultima = q.split(" ").slice(-1)[0];
        Promise.all([G.carica("prime/s/" + q.slice(0, 2) + ".json").catch(() => []), G.carica("prime/espressioni.json").catch(() => ({}))]).then(([S, E]) => {
          const v = q.indexOf(" ") < 0 ? S.filter((x) => x[0].startsWith(q)).slice(0, 12).map((x) => [x[1] || x[0], x[2]]) : [];
          const e = Object.keys(E).filter((k) => k.indexOf(q) >= 0 || (ultima.length > 2 && k.split(" ").some((p) => p.startsWith(ultima)) && q.indexOf(" ") < 0)).slice(0, 8).map((k) => [E[k].f || k, E[k].t]);
          lista.innerHTML = v.concat(e).map((x) => `<option value="${G.esc(x[0])}">${G.esc(x[0])}, ${G.num(x[1])} volte</option>`).join("");
        });
      }, 120);
    });
  };
  /* minuscolo, senza accenti, solo lettere e spazi singoli (le espressioni restano espressioni) */
  G.normaFrase = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").trim();
  /* banda delle epoche, chiara; il fascismo in giallo e collegato al percorso */
  G.bandaEpoche = function (svg, x, y, h, stretto) {
    const g = svg.append("g");
    g.append("line").attr("x1", x(1848)).attr("x2", x(2022.9)).attr("y1", y).attr("y2", y).attr("stroke", G.RIGA);
    g.append("line").attr("x1", x(1848)).attr("x2", x(2022.9)).attr("y1", y + h).attr("y2", y + h).attr("stroke", G.RIGA);
    G.EPOCHE.forEach((e) => {
      const x0 = x(e[0]), x1 = x(Math.min(e[1], 2022.9));
      if (e[1] === 1943) {
        // il ventennio e' una banda di periodo come le altre, in grigio tenue (capitolo 10 della guida)
        const a = g.append("a").attr("href", "fascismo.html");
        a.append("title").text("Il fascismo in aula, 1922-1943: il percorso");
        a.append("rect").attr("x", x0).attr("y", y).attr("width", Math.max(0, x1 - x0)).attr("height", h).attr("fill", document.body.dataset.sezione === "fascismo" ? "#3A3E46" : "#C9CED5");
        if (x1 - x0 > (stretto ? 40 : 60)) a.append("text").attr("x", x0 + 4).attr("y", y + h - 6).attr("font-size", 12).attr("font-weight", 700).attr("fill", G.INK).text(stretto ? "Fasc." : (x1 - x0 > 130 ? "Fascismo 1922-1943" : "Fascismo"));
      } else {
        g.append("line").attr("x1", x0).attr("x2", x0).attr("y1", y).attr("y2", y + h).attr("stroke", G.INK);
        if (e[2] && x1 - x0 > (stretto ? 64 : 110)) g.append("text").attr("x", x0 + 5).attr("y", y + h - 6).attr("font-size", 12).attr("font-weight", 700).attr("fill", G.INK).text(stretto && e[2].length > 12 ? e[2].replace("Repubblica", "Rep.") : e[2]);
      }
    });
    return g;
  };
  G.conti = {};
  /* striscia «dove sei» */
  G.dove = function (finestra) {
    const el = document.getElementById("dove");
    if (!el) return;
    G.grafico(d3.select(el), (area, w) => {
      const stretto = w < 700, H = 44;
      const svg = area.append("svg").attr("width", w).attr("height", H).attr("role", "img").attr("aria-label", finestra ? "Sei qui: " + finestra[2] : "1848-2022");
      const x = d3.scaleLinear().domain([1848, 2023]).range([0, w]);
      G.bandaEpoche(svg, x, 2, 22, stretto);
      d3.range(1850, 2021, 10).forEach((a) => {
        svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", 24).attr("y2", a % 50 === 0 ? 30 : 27).attr("stroke", G.GRIGIO);
        if (a % 50 === 0 || (!stretto && a % 20 === 0 && a !== 2020)) svg.append("text").attr("x", x(a) + 2).attr("y", 41).attr("font-size", 12).attr("font-weight", a % 50 === 0 ? 800 : 400).attr("fill", G.INK).text(a);
      });
      if (finestra) {
        const x0 = x(finestra[0]), x1 = Math.max(x0 + 5, x(finestra[1] + 1));
        svg.append("rect").attr("x", x0).attr("y", 1).attr("width", x1 - x0).attr("height", 24).attr("fill", "none").attr("stroke", G.ROSSO).attr("stroke-width", 1.5);
        const t = "Sei qui: " + finestra[2];
        const destra = x1 + 8 + t.length * 6.6 < w;
        svg.append("text").attr("x", destra ? x1 + 6 : x0 - 6).attr("y", 41).attr("text-anchor", destra ? "start" : "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", G.ROSSO).attr("class", "alone").text(t);
      }
    });
  };
  G.piede = function () {
    const el = document.getElementById("piede");
    if (!el) return;
    el.className = "piede";
    el.innerHTML = `<div class="pagina"><div class="griglia">
      <div class="c5"><h3><a href="metodo.html">Metodo e limiti</a></h3>
        <p>Le parole vengono dai resoconti stenografici, non dalla voce: lo stenografo riordina le frasi, e il suo modo di scrivere cambia nel tempo. Al Senato cambia di colpo nel ${G.TRASCR.senato.join(" e nel ")}; alla Camera non si sa dire con precisione in quali anni. Punteggiatura e grafie cambiano alla Camera nel ${(G.SCRITTURA || {camera: []}).camera.join(", ").replace(/, (\d+)$/, " e $1")}, al Senato nel ${(G.SCRITTURA || {senato: []}).senato.join(" e nel ")}.</p>
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
      const SC = G.SCRITTURA || { camera: [], senato: [] };
      [["Camera", "camera", 16], ["Senato", "senato", 40]].forEach(([n, k, y]) => {
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y).attr("stroke", G.RIGA);
        svg.append("text").attr("x", 0).attr("y", y + 4).attr("class", "etich").attr("fill", G.INK || "#16181D").text(n);
        G.TRASCR[k].forEach((a) => svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", y - 7).attr("y2", y + 7).attr("stroke", G.NERO).attr("stroke-width", 3));
        SC[k].forEach((a) => svg.append("circle").attr("cx", x(a)).attr("cy", y).attr("r", 3.5).attr("fill", "#fff").attr("stroke", G.NERO).attr("stroke-width", 1.5));
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
        if (B.trascrizione) { G.TRASCR = { camera: B.trascrizione.camera, senato: B.trascrizione.senato }; G.SCRITTURA = B.trascrizione.scrittura; }
        document.querySelectorAll("[data-conto]").forEach((e) => { const v = G.conti[e.dataset.conto]; if (v != null) e.textContent = G.num(v, String(v).indexOf(".") >= 0 ? 1 : 0); });
      }).catch(() => {}).then(() => { G.colori(); return main(); }).catch((e) => { console.error(e); }).then(() => {
        G.faiFascia();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(parti); else parti();
      });
      let t;
      window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (window.innerWidth !== ultimaL) parti(); }, 150); });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", via); else via();
  };
  /* colori dei segni dei grafici dal colore della sezione (guida v2: tesi nel tono pieno, seconda evidenza nel tono scuro) */
  G.colori = function () {
    const cs = getComputedStyle(document.body);
    const v = (k) => (cs.getPropertyValue(k) || "").trim();
    let pieno = v("--sez"), scuro = v("--sez-s"), mezzo = v("--sez-m");
    if (!pieno || document.body.dataset.sezione === "neutra" || !document.body.dataset.sezione) { pieno = "#1B3FA8"; scuro = "#14307F"; mezzo = "#C9D3EE"; }
    G.SEZ = pieno; G.SEZ_S = scuro; G.SEZ_M = mezzo;
    // impianto del vocabolario: il blu della voce per la parola di cui si parla, il rosso per la cosa da guardare
    // (anno di punta, tesi, smentita), tutto il resto in grigi
    G.ROSSO = "#D2281F"; G.NERO = "#8C939D"; G.GDATI = "#B8BEC7"; G.RIGA = "#DFE2E6"; G.GRIGIO = "#5C636D"; G.INK = "#15181C";
    if (document.body.dataset.sezione === "fascismo") {
      G.SEZ = G.ROSSO = "#E3120B"; G.SEZ_S = "#F2F3F5"; G.SEZ_M = "#3A3E46"; G.NERO = "#A3A9B2"; G.GDATI = "#5B6470"; G.RIGA = "#2A2D33"; G.GRIGIO = "#A3A9B2"; G.INK = "#F2F3F5";
    }
  };
  /* fascia di colore pieno con briciole, titolo e sommario (guida v2, capitolo 3) */
  G.faiFascia = function () {
    const main = document.getElementById("main");
    if (!main || main.querySelector(".fascia")) return;
    const h1 = main.querySelector("h1.titolo-pagina");
    if (!h1) return;
    const f = document.createElement("div");
    f.className = "fascia";
    const b = main.querySelector(".briciole");
    const pezzi = [];
    let n = h1.nextElementSibling;
    while (n && (n.classList.contains("sommario") || (n.classList.contains("piccolo") && n.classList.contains("grigio")))) { pezzi.push(n); n = n.nextElementSibling; }
    if (b) f.appendChild(b);
    f.appendChild(h1);
    // i titoli-frase vanno più piccoli dei titoli-voce (una parola, un anno, un nome)
    if ((h1.textContent || "").trim().length > 34) h1.classList.add("lungo");
    pezzi.forEach((p) => f.appendChild(p));
    main.insertBefore(f, main.firstChild);
    const dove = document.getElementById("dove");
    if (dove) main.insertBefore(dove, f.nextSibling);
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
    // tratteggio: cambi di trascrizione provati (Senato 1996 e 2000); puntinato: cambi di scrittura (punteggiatura e grafie).
    // Le date incerte del calendario rivisto non si disegnano.
    const S = G.SCRITTURA || { camera: [], senato: [] };
    const scegli = (o) => (ramo === "senato" ? o.senato : ramo === "entrambi" ? Array.from(new Set(o.camera.concat(o.senato))).sort() : o.camera);
    const prov = scegli(G.TRASCR), scr = scegli(S).filter((a) => prov.indexOf(a) < 0);
    const [d0, d1] = x.domain();
    const g = svg.append("g");
    let primo = true;
    prov.filter((a) => a >= d0 && a <= d1).forEach((a) => {
      g.append("line").attr("class", "trascrizione").attr("x1", x(a)).attr("x2", x(a)).attr("y1", y0).attr("y2", y1);
      if (scritta && primo) { g.append("text").attr("class", "nota-t").attr("x", x(a) + 4).attr("y", y0 + 12).text("tratteggio: cambia la trascrizione"); primo = false; }
    });
    let primoS = true;
    scr.filter((a) => a >= d0 && a <= d1).forEach((a) => {
      g.append("line").attr("class", "scrittura").attr("x1", x(a)).attr("x2", x(a)).attr("y1", y0).attr("y2", y1);
      if (scritta && primoS) { g.append("text").attr("class", "nota-t").attr("x", x(a) + 4).attr("y", y0 + 28).text("puntini: cambio di scrittura"); primoS = false; }
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
    o.serie.forEach((s) => { s.punti = s.punti.filter((p) => p[0] >= o.x[0] && p[0] <= o.x[1]); if (s.banda) s.banda = s.banda.filter((p) => p[0] >= o.x[0] && p[0] <= o.x[1]); });
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
        const mezza = String(s.piccoEtich.testo).length * 3.6, anchor = px > w - mezza - 10 ? "end" : px < mezza + 4 ? "start" : "middle";
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
    svg.append("path").attr("d", ar(pts)).attr("fill", o.colore || G.SEZ_M || "#A9BBFF");
    svg.append("path").attr("d", d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]))(pts)).attr("fill", "none").attr("stroke", o.linea || G.SEZ || "#2454FF").attr("stroke-width", 1.2);
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

  /* archivio delle prime volte (parole dette almeno 10 volte) ed espressioni */
  G.schedaPrime = function (w) {
    return G.carica("prime/mappa.json").then((M) => {
      const I = M.inizi;
      let lo = 0, hi = I.length - 1, k = 0;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (I[m] <= w) { k = m; lo = m + 1; } else hi = m - 1; }
      return G.carica("prime/d/" + G.pad(k) + ".json").then((d) => d[w] || null);
    }).catch(() => null);
  };
  G.espressione = (q) => G.carica("prime/espressioni.json").then((E) => E[q] || null).catch(() => null);
  /* voce di una prima volta: [data, ramo, nome, pid, partito, frase, forma] */
  G.voceVolta = function (v, forme) {
    const nome = v[2] ? (v[3] ? G.lPersona(v[3], G.oratore(v[2])) : G.esc(G.oratore(v[2]))) : "oratore non riconosciuto";
    return `<span class="quando"><b>${G.data(v[0])}</b>, ${G.ramo(v[1])}, ${nome}${v[4] ? " (" + G.esc(v[4]) + ")" : ""}</span>` +
      (v[5] ? `<q>${G.frase(v[5], forme)}</q>` : '<span class="grigio">Testo della comparsa illeggibile nella scansione.</span>');
  };
  /* colori dei filoni delle storie (guida v2, 1.3) */
  G.FILONE = { "Parole che nascono e muoiono": ["#2454FF", "#fff"], "Esteri ed Europa": ["#00A3AD", "#16181D"], "Semplificazione e resoconto": ["#7B3FE4", "#fff"],
    "Potere, partiti e persone": ["#E5007D", "#fff"], "Prima Repubblica": ["#F56300", "#16181D"], "Temi": ["#00A85A", "#16181D"], "Fascismo": ["#16181D", "#fff"] };
  G.SCURO = { "#2454FF": "#1B3FCC", "#00A3AD": "#00757D", "#7B3FE4": "#5B2BB5", "#E5007D": "#B80064", "#F56300": "#B84A00", "#00A85A": "#007A41", "#16181D": "#16181D", "#E3120B": "#C00F09" };
  /* tessere delle storie, di misura diversa */
  /* le storie come rimandi di un vocabolario: → titolo, epoca in corsivo, verdetto; la smentita col quadrato rosso */
  G.voceStoria = (s) => `<p class="rimando">${s.verdetto === "smentita" ? '<span class="sm" aria-hidden="true">■</span>' : '<span class="fr" aria-hidden="true">→</span>'} <a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a> <i>${G.esc(s.occhiello || s.filone || "")}</i>${s.verdetto ? " " + G.esito(s.verdetto) : ""}</p>`;
  G.tessere = function (storie, max) {
    return '<div class="rimandi">' + storie.slice(0, max || 8).map(G.voceStoria).join("") + "</div>";
  };

  /* ingressi dei quattro percorsi, di misura diversa (guida v2, capitolo 6) */
  G.ingressi = function (F, L, R, X) {
    const cam = F.periodi.filter((p) => p.ramo === "camera"), d0 = cam[0], d1 = cam.find((p) => /regime/i.test(p.periodo)) || cam[cam.length - 1];
    const fc = L.francese.camera || {}, am = Object.keys(fc).reduce((a, b) => (fc[b] > fc[a] ? b : a), Object.keys(fc)[0]);
    const P = R.periodi;
    return `<div class="ingressi">
      <div class="ingresso"><p class="testa"><a class="lemma" href="fascismo.html">Il fascismo in aula</a> <span class="anni">[1922-1943]</span></p><p><b>${G.num(d0.dissenso_100, 0)} → ${G.num(d1.dissenso_100, 0)}</b> Il dissenso annotato alla Camera ogni cento interventi. Le parole del regime, il Voi al posto del Lei, le cinque legislature.</p></div>
      <div class="ingresso"><p class="testa"><a class="lemma" href="lingue.html">Le lingue dell'aula</a> <span class="anni">[1848-2022]</span></p><p><b>${G.num(fc[am], 1)}%</b> Nel ${am} la quota delle parole in francese alla Camera. Poi l'inglese, il latino, le forme antiche che spariscono.</p></div>
      <div class="ingresso"><p class="testa"><a class="lemma" href="esteri.html">Amici e nemici dell'Italia</a> <span class="anni">[1848-2022]</span></p><p><b>${X.paesi.length} paesi</b> Il tono dell'aula verso ognuno, anno per anno, accanto alle alleanze e alle guerre vere.</p></div>
      <div class="ingresso"><p class="testa"><a class="lemma" href="risate.html">Risate e insulti</a> <span class="anni">[1848-2022]</span></p><p><b>${G.num(P[0][1], 0)} → ${G.num(P[P.length - 1][1], 1)}</b> Le risate annotate ogni mille interventi; chi fa ridere, ${G.num(R.frasi.length)} frasi da ridere e gli insulti detti in aula.</p></div>
    </div>`;
  };

  /* la mappa dei partiti che si muove: un cursore con le legislature e un pulsante Avvia (guida v2, capitolo 5) */
  G.scie = function (idBox, TR) {
    const P = TR.partiti;
    const tutti = [].concat(...Object.values(P));
    const legs = [...new Set(tutti.map((q) => q[0]))].sort((a, b) => a - b);
    let k = legs.length - 1, timer = null;
    const box = document.getElementById(idBox);
    const area = G.figura(box.appendChild(document.createElement("div")) && d3.select(box.lastChild), {
      titolo: "I partiti si muovono: ogni legislatura la loro lingua si sposta sulla mappa",
      sotto: "Ogni punto è un partito in una legislatura, Camera, 1948-2022: più due punti sono vicini, più usano le stesse parole. La scia mostra da dove viene ogni partito. L'area del punto è la sua quota di parole. Colori delle famiglie: rosso PCI-PD, blu DC, rosa PSI, blu notte MSI-AN-FdI, azzurro FI-PdL, verde Lega, giallo M5S, grigio gli altri.",
      limite: "Le due direzioni riassumono poco più di un terzo delle differenze; la posizione viene dalle parole, non dai voti.",
      csv: () => [["partito", "legislatura", "anno", "d1", "d2", "quota", "famiglia", "governo"]].concat([].concat(...Object.entries(P).map(([n, v]) => v.map((q) => [n].concat(q))))), nomeCSV: "traiettorie_partiti",
    });
    const fig = area.node().parentNode;
    const cur = document.createElement("div");
    cur.className = "cursore";
    cur.innerHTML = `<button type="button" id="avvia">Avvia</button><input type="range" id="leg" min="0" max="${legs.length - 1}" value="${k}" aria-label="Legislatura"><output id="leg-out"></output>`;
    fig.insertBefore(cur, area.node());
    const ri = () => { document.getElementById("leg-out").textContent = G.romano(legs[k]) + " legislatura"; G.ridisegna("#" + idBox + " .fig-area"); };
    document.getElementById("leg").addEventListener("input", (e) => { k = +e.target.value; ri(); });
    document.getElementById("avvia").addEventListener("click", (e) => {
      if (timer) { clearInterval(timer); timer = null; e.target.textContent = "Avvia"; return; }
      e.target.textContent = "Ferma"; if (k >= legs.length - 1) k = 0;
      timer = setInterval(() => { k++; document.getElementById("leg").value = k; ri(); if (k >= legs.length - 1) { clearInterval(timer); timer = null; e.target.textContent = "Avvia"; } }, 900);
    });
    document.getElementById("leg-out").textContent = G.romano(legs[k]) + " legislatura";
    G.grafico(area, (a, w) => {
      const h = w < 560 ? 340 : 520, m = 30;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Mappa dei partiti in movimento");
      const x = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[2])).nice().range([m, w - m - 70]);
      const y = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[3])).nice().range([h - m, m]);
      svg.append("text").attr("x", m).attr("y", 14).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di destra ↑");
      svg.append("text").attr("x", m).attr("y", h - 6).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di sinistra ↓");
      const L = legs[k];
      const et = [];
      Object.entries(P).forEach(([nome, v]) => {
        const fino = v.filter((q) => q[0] <= L);
        const ora = v.find((q) => q[0] === L);
        if (!ora) return;
        const col = G.FAMIGLIA[ora[5]] || G.GDATI;
        const scia = fino.slice(-4);
        if (scia.length > 1) svg.append("path").attr("d", d3.line().x((q) => x(q[2])).y((q) => y(q[3]))(scia)).attr("fill", "none").attr("stroke", col).attr("stroke-width", 2).attr("stroke-opacity", 0.55);
        scia.slice(0, -1).forEach((q) => svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", 2.5).attr("fill", col).attr("fill-opacity", 0.5));
        const r = 5 + 24 * Math.sqrt(ora[4] || 0);
        const lk = svg.append("a").attr("href", "partito.html?id=" + encodeURIComponent(nome));
        lk.append("circle").attr("cx", x(ora[2])).attr("cy", y(ora[3])).attr("r", r).attr("fill", col).attr("stroke", ora[5] === "M5S" ? G.INK : "#fff").attr("stroke-width", 1.2);
        et.push({ x: x(ora[2]) + r + 4, y: y(ora[3]) + 4, t: nome.replace("Unita'", "Unità"), lk });
      });
      G.separa(et, 14, 14, h - 10);
      et.forEach((e) => e.lk.append("text").attr("class", "etich").attr("x", e.x).attr("y", e.y).attr("fill", G.INK).text(e.t));
      svg.append("text").attr("x", w - m).attr("y", 24).attr("text-anchor", "end").attr("font-size", 20).attr("font-weight", 800).attr("fill", G.INK).text(G.romano(L) + " legislatura");
    });
  };

  /* il filo del tempo: i sette capitoli del racconto sull'asse 1848-2022 (il 4 attraversa tutti gli anni) */
  G.filoDelTempo = function (sel, capitoli, attivo) {
    G.grafico(sel, (a, w) => {
      const stretto = w < 700, h = stretto ? 86 : 70;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "I sette capitoli sull'asse del tempo");
      const x = d3.scaleLinear().domain([1848, 2023]).range([0, w]);
      const cronologici = capitoli.filter((c) => !(c.anni[0] === 1848 && c.anni[c.anni.length - 1] === 2022));
      const trasversale = capitoli.find((c) => c.anni[0] === 1848 && c.anni[c.anni.length - 1] === 2022);
      cronologici.forEach((c) => {
        const x0 = x(c.anni[0]), x1 = x(Math.min(2023, c.anni[c.anni.length - 1] + 1));
        const lk = svg.append("a").attr("href", "capitolo.html?n=" + c.n);
        lk.append("title").text(c.titolo);
        lk.append("rect").attr("x", x0 + 1).attr("y", 4).attr("width", Math.max(2, x1 - x0 - 2)).attr("height", 26).attr("fill", "#fff").attr("stroke", +c.n === attivo ? "#15181C" : "#DFE2E6").attr("stroke-width", +c.n === attivo ? 2 : 1);
        lk.append("text").attr("x", x0 + 6).attr("y", 22).attr("font-size", 13).attr("font-weight", 800).attr("fill", +c.n === attivo ? "#1B3FA8" : "#15181C").text(c.n);
        if (!stretto && x1 - x0 > 90) lk.append("text").attr("x", x0 + 20).attr("y", 22).attr("font-size", 12.5).attr("font-weight", +c.n === attivo ? 700 : 400).attr("fill", +c.n === attivo ? "#15181C" : "#5C636D").text(c.titolo);
      });
      if (trasversale) {
        const lk = svg.append("a").attr("href", "capitolo.html?n=" + trasversale.n);
        lk.append("title").text(trasversale.titolo);
        lk.append("rect").attr("x", 0).attr("y", 34).attr("width", w).attr("height", 13).attr("fill", "#fff").attr("stroke", +trasversale.n === attivo ? "#15181C" : "#DFE2E6").attr("stroke-width", +trasversale.n === attivo ? 2 : 1);
        lk.append("text").attr("x", 4).attr("y", 44.5).attr("font-size", 12).attr("font-weight", 700).attr("fill", +trasversale.n === attivo ? "#1B3FA8" : "#15181C").text(trasversale.n + " · " + trasversale.titolo + ", 1848-2022");
      }
      svg.append("rect").attr("x", x(1941.5)).attr("y", 2).attr("width", x(1945.9) - x(1941.5)).attr("height", 46).attr("fill", "#fff").attr("stroke", "#B8BEC7").attr("stroke-dasharray", "2 2");
      [1848, 1900, 1950, 2000].forEach((y) => svg.append("text").attr("x", x(y)).attr("y", h - 4).attr("text-anchor", y === 1848 ? "start" : "middle").attr("font-size", 12).attr("fill", "#5B6470").text(y));
    });
  };

  /* una scommessa: il lettore sceglie prima di vedere (niente viene salvato); senza JavaScript non si vede */
  G.scommessa = function (box, S, E) {
    const id = "sc" + S.capitolo + "-" + S.passo;
    const el = document.createElement("div");
    el.className = "scommessa";
    el.innerHTML = `<p class="occhiello">La tua scommessa</p><p class="domanda">${G.esc(S.domanda)}</p><div class="risposte">${S.risposte.map((r) => `<button type="button" class="bottone" data-r="${G.esc(r)}">${G.esc(r)}</button>`).join(" ")}</div><div class="esito-sc" id="${id}" hidden></div>`;
    // il paragrafo «Scommessa.» del testo lascia il posto ai bottoni
    const par = Array.from(box.querySelectorAll("p")).find((q) => /^\s*Scommessa\./.test(q.textContent));
    if (par) par.replaceWith(el); else box.appendChild(el);
    el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const giusta = b.dataset.r === S.giusta;
      el.querySelectorAll("button").forEach((x) => { x.disabled = true; x.classList.toggle("scelta", x === b); });
      const ver = (S.codici || []).map((k) => { const e = (E.elenco || []).find((x) => x.cod === k); return e ? `${G.lEsp(k)} ${G.esito(e.esito)}` : ""; }).join(" ");
      const out = el.querySelector(".esito-sc");
      out.hidden = false;
      out.innerHTML = `<p><b>${giusta ? "Esatto." : "No: la risposta è «" + G.esc(S.giusta) + "»."}</b> ${G.esc(S.esce.replace(/\s*H\d+[a-z]?(\s+e\s+H\d+[a-z]?)?:\s*[a-z ]+$/, ""))}</p>${ver ? `<p class="piccolo">${ver}</p>` : ""}`;
    }));
  };
  /* la riga «Nel racconto»: i capitoli che parlano di una parola, una legislatura, una storia o un esperimento */
  G.nelRacconto = function (sel, campo, valore) {
    return G.carica("capitoli/indice.json").then((IX) => {
      const v = String(valore).toLowerCase();
      const caps = IX.capitoli.filter((c) => (c[campo] || []).some((x) => String(x).toLowerCase() === v || (campo === "ipotesi" && v.startsWith(String(x).toLowerCase()))));
      const el = document.querySelector(sel);
      if (!el || !caps.length) return;
      el.innerHTML = `<p class="nel-racconto"><i class="gram">nel racconto</i> → ${caps.map((c) => `<i>cap.</i> ${c.n} <a class="lemma piccolo" href="capitolo.html?n=${c.n}">${G.esc(c.titolo)}</a>`).join(" · ")}</p>`;
    }).catch(() => {});
  };

  /* colore del testo leggibile su uno sfondo: bianco sugli scuri, inchiostro sui chiari (contrasto WCAG) */
  G.testoSu = function (bg) {
    const c = d3.rgb(bg), l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * l(c.r) + 0.7152 * l(c.g) + 0.0722 * l(c.b);
    return 1.05 / (L + 0.05) >= 4.5 ? "#fff" : "#16181D";
  };
  /* un grafico con collegamenti dentro non è un'immagine: il ruolo diventa «group» (accessibilità) */
  if (typeof MutationObserver !== "undefined") {
    let attesa = null;
    const ruoli = () => { attesa = null; document.querySelectorAll('svg[role="img"]').forEach((s) => { if (s.querySelector("a")) s.setAttribute("role", "group"); }); G.numeraTavole(); };
    new MutationObserver(() => { if (!attesa) attesa = setTimeout(ruoli, 200); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* le figure sono tavole numerate, come nei vocabolari illustrati: il numero segue l'ordine nella pagina */
  G.numeraTavole = function () {
    let n = 0;
    document.querySelectorAll("figure.fig > figcaption > .fig-tit").forEach((t) => {
      n++;
      let s = t.querySelector(":scope > .num");
      if (!s) { s = document.createElement("span"); s.className = "num"; t.insertBefore(s, t.firstChild); t.insertBefore(document.createTextNode(" "), s.nextSibling); }
      const r = n <= 30 ? G.romano(n) : String(n);
      if (s.textContent !== "Tav. " + r) s.textContent = "Tav. " + r;
    });
  };

  /* errore leggibile */
  G.nonTrovato = function (el, testo) {
    el.innerHTML = `<p class="segnaposto"><b>${testo}</b> Torna alla <a class="lk" href="index.html">prima pagina</a> o cerca una parola qui sopra.</p>`;
  };
})();
