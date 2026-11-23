/* Le tavole del vocabolario illustrato: grafici piccoli e medi della home e dei capitoli
   (nati con le proposte di impaginazione, ora parte del sito). Leggono i dati di dati/ e disegnano con d3.
   Ogni grafico prende il carattere dalla pagina che lo ospita; i colori vengono da V.tema.
   Regola dei colori: grigi dappertutto; colore solo dove ha un significato
   (amico/nemico, famiglia di partito, le serie messe a confronto, la cosa da guardare). */
(function () {
  "use strict";
  const V = (window.V = {});
  V.RADICE = window.RADICE || "";
  V.tema = {
    ink: "#15181C", grigio: "#5C636D", dati: "#B8BEC7", riga: "#DFE2E6", tenue: "#EEF0F2",
    amico: "#00A3AD", nemico: "#D2281F", alleanza: "#00757D", guerra: "#A50E09",
    serie: ["#1B3FA8", "#D2281F", "#0B8F52"], evid: "#D2281F", fs: 12.5, fondo: "#fff"
  };
  V.FAM = { "PCI-PD": "#E3120B", DC: "#1E78E6", PSI: "#FF7BAC", "MSI-AN-FdI": "#1B2A7A", "FI-PdL": "#00B4D8", Lega: "#00A85A", M5S: "#F5C400", altri: "#B8BEC7" };
  V.FAMNOME = { "PCI-PD": "PCI, PDS, PD", DC: "DC", PSI: "PSI", "MSI-AN-FdI": "MSI, AN, FdI", "FI-PdL": "FI, PdL", Lega: "Lega", M5S: "M5S" };

  /* ---------- dati e formati ---------- */
  const memo = {};
  V.carica = (p) => (window.G && G.carica ? G.carica(p) : memo[p] || (memo[p] = fetch(V.RADICE + "dati/" + p).then((r) => { if (!r.ok) throw new Error(p); return r.json(); })));
  V.num = (x, d) => { if (x == null || isNaN(x)) return ""; const p = Math.abs(Number(x)).toFixed(d || 0).split("."); return (x < 0 ? "−" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (p[1] ? "," + p[1] : ""); };
  V.esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  V.romano = (n) => { const t = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; t.forEach(([v, r]) => { while (n >= v) { s += r; n -= v; } }); return s; };
  V.media3 = (v) => v.map((x, i) => { if (x == null) return null; const a = [v[i - 1], x, v[i + 1]].filter((q) => q != null); return d3.mean(a); });
  V.sito = (p) => V.RADICE + p; // link a una pagina del sito vero
  V.EPOCHE = [[1848, 1922, "Regno liberale"], [1922, 1943, "Fascismo"], [1948, 1994, "Prima Repubblica"], [1994, 2023, "Seconda Repubblica"]];

  /* ---------- una figura si ridisegna quando cambia la larghezza ---------- */
  const reg = [];
  V.fig = function (sel, fn) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!el) return;
    const dis = () => { const w = Math.floor(el.clientWidth); if (w > 0 && w !== el._w) { el._w = w; el.innerHTML = ""; fn(d3.select(el), w); } };
    reg.push(dis); dis();
  };
  let tm; window.addEventListener("resize", () => { clearTimeout(tm); tm = setTimeout(() => reg.forEach((f) => f()), 120); });
  const svgDi = (a, w, h, nome) => a.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img").attr("aria-label", nome || "grafico").style("display", "block").style("overflow", "visible");
  const testo = (g, x, y, s, o) => { o = o || {}; const T = V.tema; return g.append("text").attr("x", x).attr("y", y).attr("font-size", o.fs || T.fs).attr("fill", o.fill || T.grigio).attr("text-anchor", o.anc || "start").attr("font-weight", o.peso || null).text(s); };
  const alone = (t) => t.attr("stroke", V.tema.fondo).attr("stroke-width", 3.5).attr("paint-order", "stroke").attr("stroke-linejoin", "round");

  /* ---------- 1. parole a confronto, 1848-2022 (il grafico d'apertura) ---------- */
  V.confronto = function (sel, H, o) {
    o = Object.assign({ parole: ["patria", "europa", "crisi"], h: 380, eventi: 1, epoche: true, y: true, nomi: null }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, stretto = w < 520, ml = o.ml != null ? o.ml : (o.y ? 30 : 0), mr = o.mr != null ? o.mr : (stretto ? 4 : 62), mt = o.epoche ? 46 : (o.mt != null ? o.mt : 14), mb = o.anni === false ? 4 : 20;
      const svg = svgDi(a, w, h, "Parole a confronto: " + o.parole.join(", "));
      const x = d3.scaleLinear().domain(o.dom || [1848, 2022]).range([ml, w - mr]);
      const serie = o.parole.map((p, i) => ({ p: p, nome: (o.nomi && o.nomi[i]) || (H.curve[p].forma || p), c: (o.colori || T.serie)[i], v: V.media3(H.curve[p].m), vero: H.curve[p].m }));
      const mx = d3.max(serie, (s) => d3.max(s.v));
      const y = d3.scaleLinear().domain([0, mx * 1.06]).range([h - mb, mt]);
      if (o.epoche) {
        V.EPOCHE.forEach((e) => {
          const x0 = x(e[0]), x1 = x(Math.min(2022, e[1]));
          if (e[2] === "Fascismo") svg.append("rect").attr("x", x0).attr("y", 18).attr("width", x1 - x0).attr("height", h - mb - 18).attr("fill", T.tenue);
          svg.append("line").attr("x1", x0).attr("x2", x0).attr("y1", 2).attr("y2", 18).attr("stroke", T.ink);
          if (x1 - x0 > 60 || !stretto) testo(svg, x0 + 5, 13, stretto && e[2].length > 9 ? e[2].replace("Repubblica", "Rep.").replace("Regno liberale", "Regno") : e[2], { fill: T.ink, peso: 600, fs: T.fs });
        });
        svg.append("line").attr("x1", ml).attr("x2", w - mr).attr("y1", 18).attr("y2", 18).attr("stroke", T.riga);
      }
      if (o.y) y.ticks(4).forEach((t) => { svg.append("line").attr("x1", ml).attr("x2", w - mr).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", T.riga); if (ml >= 24) testo(svg, 0, y(t) + 4, V.num(t)); else if (t > 0) testo(svg, ml + 3, y(t) - 3, V.num(t)); });
      if (o.eventi && !stretto) {
        const scelti = o.eventiNomi || ["Regno d'Italia", "Entrata in guerra", "Referendum Repubblica", "Elezioni 1994"];
        (H.eventi || []).filter((e) => scelti.indexOf(e[1]) >= 0).forEach((e) => {
          const an = +e[0].slice(0, 4) + (+e[0].slice(5, 7) - 1) / 12, px = x(an), sin = e[1] === "Entrata in guerra";
          svg.append("line").attr("x1", px).attr("x2", px).attr("y1", 22).attr("y2", h - mb).attr("stroke", T.dati).attr("stroke-dasharray", "1 3");
          testo(svg, px + (sin ? -4 : 4), 32, /\d{4}/.test(e[1]) ? e[1] : e[1] + " " + e[0].slice(0, 4), { fs: T.fs - 0.5, anc: sin ? "end" : "start" });
        });
      }
      if (o.anni !== false) [1850, 1875, 1900, 1925, 1950, 1975, 2000, 2022].forEach((t) => { if (!stretto || t % 50 === 0) testo(svg, x(t), h - 4, t, { anc: t === 2022 ? "end" : "middle" }); });
      const linea = d3.line().defined((d) => d != null).x((d, i) => x(1848 + i)).y((d) => y(d));
      serie.forEach((s) => svg.append("path").attr("d", linea(s.v)).attr("fill", "none").attr("stroke", s.c).attr("stroke-width", o.sp || 2.2).attr("stroke-linejoin", "round"));
      const fine = serie.map((s) => { let i = s.v.length - 1; while (i > 0 && s.v[i] == null) i--; return { s: s, y: y(s.v[i]) }; }).sort((p, q) => p.y - q.y);
      for (let i = 1; i < fine.length; i++) if (fine[i].y - fine[i - 1].y < 15) fine[i].y = fine[i - 1].y + 15;
      serie.forEach((s) => {
        const i = d3.maxIndex(s.v), px = x(1848 + i), py = y(s.v[i]);
        svg.append("circle").attr("cx", px).attr("cy", py).attr("r", 3.5).attr("fill", s.c);
        const iv = d3.maxIndex(s.vero); if (o.picchi !== false) alone(testo(svg, px + (px > w - 150 ? -7 : 7), py - 7, s.nome + " " + (1848 + iv) + ": " + V.num(s.vero[iv]), { fill: s.c, peso: 700, fs: T.fs + 0.5, anc: px > w - 150 ? "end" : "start" }));
      });
      if (!stretto && mr >= 40) fine.forEach((f) => testo(svg, w - mr + 6, f.y + 4, f.s.nome, { fill: f.s.c, peso: 700, fs: T.fs + 0.5 }));
      else if (stretto) a.append("div").attr("class", "g-chiave").html(serie.map((s) => `<span style="color:${s.c}"><b>${V.esc(s.nome)}</b></span>`).join(" · "));
    });
  };

  /* ---------- 2. curva piccola: una serie, con il punto da guardare ---------- */
  V.mini = function (sel, pts, o) {
    o = Object.assign({ h: 90, area: true, colore: null, assi: null }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, c = o.colore || T.ink, mb = o.assi === false ? 2 : 16, mt = o.mt != null ? o.mt : 14;
      const svg = svgDi(a, w, h, o.nome || "curva");
      const dx = o.x || d3.extent(pts, (p) => p[0]);
      const x = d3.scaleLinear().domain(dx).range([1, w - (o.mr || 1)]);
      const val = pts.filter((p) => p[1] != null && p[0] >= dx[0] && p[0] <= dx[1]);
      const dy = o.y || [0, d3.max(val, (p) => p[1]) * 1.05];
      const y = d3.scaleLinear().domain(dy).range([h - mb, mt]);
      (o.fasce || []).forEach((f) => { svg.append("rect").attr("x", x(f[0])).attr("y", 0).attr("width", Math.max(1, x(f[1]) - x(f[0]))).attr("height", h - mb).attr("fill", f[3] || T.tenue); if (f[2]) testo(svg, x(f[0]) + 3, 10, f[2], { fs: T.fs - 1 }); });
      const dentro = pts.filter((p) => p[0] >= dx[0] && p[0] <= dx[1]);
      if (o.area) svg.append("path").attr("d", d3.area().defined((p) => p[1] != null).x((p) => x(p[0])).y0(y(dy[0])).y1((p) => y(p[1]))(dentro)).attr("fill", o.riempi || T.tenue);
      svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", h - mb).attr("y2", h - mb).attr("stroke", T.dati);
      svg.append("path").attr("d", d3.line().defined((p) => p[1] != null).x((p) => x(p[0])).y((p) => y(p[1]))(dentro)).attr("fill", "none").attr("stroke", c).attr("stroke-width", o.sp || 1.6).attr("stroke-linejoin", "round");
      (o.righe || []).forEach((r) => { svg.append("line").attr("x1", x(r[0])).attr("x2", x(r[0])).attr("y1", mt - 4).attr("y2", h - mb).attr("stroke", r[2] || T.evid).attr("stroke-width", 1.5); if (r[1]) testo(svg, x(r[0]) + 4, mt + 4, r[1], { fill: r[2] || T.evid, peso: 700 }); });
      (o.punti || []).forEach((q) => {
        const p = val.find((v) => v[0] === q.x) || [q.x, q.y]; const px = x(p[0]), py = y(p[1]);
        if (!q.testo) svg.append("line").attr("x1", px).attr("x2", px).attr("y1", h - mb).attr("y2", py).attr("stroke", c).attr("stroke-width", 1);
        svg.append("circle").attr("cx", px).attr("cy", py).attr("r", 3.2).attr("fill", q.colore || T.evid);
        const dx_ = q.dx != null ? q.dx : (px > w * 0.6 ? -6 : 6), anc = q.anc || (dx_ < 0 ? "end" : "start");
        alone(testo(svg, px + dx_, py + (q.dy != null ? q.dy : -5), q.testo, { fill: T.ink, peso: 700, anc: anc, fs: T.fs }));
      });
      if (o.assi !== false) (o.assi || [dx[0], dx[1]]).forEach((t, i, arr) => testo(svg, x(t), h - 3, t, { anc: i === 0 ? "start" : i === arr.length - 1 ? "end" : "middle", fs: T.fs - 0.5 }));
      V.lettura(svg, x, y, val, w, h, mb, o.fmt);
    });
  };
  /* valore al passaggio del mouse: una riga verticale e l'anno con il valore */
  V.lettura = function (svg, x, y, val, w, h, mb, fmt) {
    if (!val.length) return;
    const T = V.tema, g = svg.append("g").style("display", "none").attr("pointer-events", "none");
    const ln = g.append("line").attr("y1", 0).attr("y2", h - mb).attr("stroke", T.grigio).attr("stroke-width", 1);
    const pt = g.append("circle").attr("r", 2.8).attr("fill", T.ink);
    const tx = alone(g.append("text").attr("y", 10).attr("font-size", T.fs).attr("font-weight", 700).attr("fill", T.ink));
    svg.append("rect").attr("x", 0).attr("y", 0).attr("width", w).attr("height", h).attr("fill", "transparent")
      .on("pointermove", (e) => {
        const a = Math.round(x.invert(d3.pointer(e)[0])), p = val.reduce((b, q) => (Math.abs(q[0] - a) < Math.abs(b[0] - a) ? q : b), val[0]);
        const px = x(p[0]); g.style("display", null); ln.attr("x1", px).attr("x2", px); pt.attr("cx", px).attr("cy", y(p[1]));
        tx.attr("x", px > w / 2 ? px - 5 : px + 5).attr("text-anchor", px > w / 2 ? "end" : "start").text(p[0] + ": " + (fmt ? fmt(p[1]) : V.num(p[1], p[1] < 10 ? 1 : 0)));
      }).on("pointerleave", () => g.style("display", "none"));
  };
  V.curvaParola = (H, p) => V.media3(H.curve[p].m).map((v, i) => [1848 + i, v]);
  V.annoDiPunta = (H, p) => 1848 + d3.maxIndex(H.curve[p].m);

  /* ---------- 3. amici e nemici: strisce per paese (parole sopra, fatti sotto) ---------- */
  const misto = (c1, c2, t) => d3.interpolateRgb(c1, c2)(Math.max(0, Math.min(1, t)));
  V.tono = (v) => misto(V.tema.tenue, v > 0 ? V.tema.nemico : V.tema.amico, Math.abs(v) / 0.6);
  V.tonoPaese = function (X, p) { // indice per anno, media di tre anni, solo dove ci sono abbastanza frasi
    const o = X.indice[p] || {}, out = {};
    for (let a = 1848; a <= 2022; a++) {
      if (!o[a] || o[a][0] == null || o[a][3] < 30) continue;
      const v = []; for (let k = a - 1; k <= a + 1; k++) if (o[k] && o[k][0] != null && o[k][3] >= 30) v.push(o[k][0]);
      out[a] = d3.mean(v);
    }
    return out;
  };
  V.strisce = function (sel, X, o) {
    o = Object.assign({ paesi: ["Austria", "Germania", "Francia", "Gran Bretagna", "Russia/URSS", "Stati Uniti", "Jugoslavia"], hp: 26, hf: 6, vuoto: 16, wl: 120, x: [1848, 2022], anni: true, note: [], fsNome: 15, pesoNome: 700, sotto: true }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, stretto = w < 520, wl = stretto ? 0 : o.wl, sopra = o.nomi !== false && (stretto || o.wl === 0);
      const passo = o.hp + o.hf + o.vuoto + (sopra ? 16 : 0), mt = o.anni ? 22 : 2;
      const notePer = {}; o.note.forEach((n) => { if (!stretto || n.sempre) (notePer[n.paese] = notePer[n.paese] || []).push(n); });
      const ys = []; let yy = mt;
      o.paesi.forEach((p) => { const sp = (notePer[p] || []).filter((n) => n.sopra).reduce((m, n) => Math.max(m, n.righe.length), 0) * 15; const st = (notePer[p] || []).filter((n) => !n.sopra).reduce((m, n) => Math.max(m, n.righe.length), 0) * 15; yy += sp; ys.push(yy + (sopra ? 16 : 0)); yy += passo + st; });
      const h = yy + 2, svg = svgDi(a, w, h, "Amici e nemici: come l'aula parla di ogni paese, anno per anno");
      const x = d3.scaleLinear().domain([o.x[0], o.x[1] + 1]).range([wl, w]), aw = x(o.x[0] + 1) - x(o.x[0]);
      if (o.anni) (o.x[1] - o.x[0] < 12 ? d3.range(o.x[0], o.x[1] + 1) : d3.range(Math.ceil(o.x[0] / 10) * 10, o.x[1] + 1, 10)).forEach((t) => {
        svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 14).attr("y2", h).attr("stroke", T.riga);
        if (t % 20 === 0 || o.x[1] - o.x[0] < 60) testo(svg, x(t), 10, t, { anc: "middle" });
      });
      o.paesi.forEach((p, i) => {
        const y0 = ys[i];
        const nome = svg.append("a").attr("href", V.sito("esteri.html"));
        if (o.nomi === false) { /* il nome sta fuori dal disegno */ }
        else if (sopra) testo(nome, wl, y0 - 5, p, { fill: T.ink, peso: o.pesoNome, fs: o.fsNome - 1 });
        else { testo(nome, 0, y0 + o.hp * 0.5 + 5, p, { fill: T.ink, peso: o.pesoNome, fs: o.fsNome }); if (o.sotto && o.hp >= 22) testo(svg, 0, y0 + o.hp + o.hf + 2, p === "Jugoslavia" ? "giudice · fatti" : "parole · fatti", { fs: T.fs - 1.5 }); }
        const al = X.alleanze[p] || {};
        if (p === "Jugoslavia" && X.giudice_periodi && X.giudice_periodi.Jugoslavia) {
          X.giudice_periodi.Jugoslavia.forEach((q) => {
            if (q[1] < o.x[0] || q[0] > o.x[1]) return;
            const xa = x(Math.max(q[0], o.x[0])), xb = x(Math.min(q[1], o.x[1]) + 1);
            svg.append("rect").attr("x", xa).attr("y", y0).attr("width", Math.max(1, xb - xa - 1)).attr("height", o.hp).attr("fill", misto(T.tenue, T.nemico, q[2] / 0.6));
            if (xb - xa > 34 && o.hp >= 18) testo(svg, (xa + xb) / 2, y0 + o.hp / 2 + 4, Math.round(q[2] * 100) + "%", { anc: "middle", peso: 700, fill: q[2] > 0.35 ? "#fff" : T.ink });
          });
        } else {
          const t = V.tonoPaese(X, p);
          Object.keys(t).forEach((k) => { if (+k >= o.x[0] && +k <= o.x[1]) svg.append("rect").attr("x", x(+k)).attr("y", y0).attr("width", aw + 0.4).attr("height", o.hp).attr("fill", V.tono(t[k])).append("title").text(`${p}, ${k}: ${t[k] > 0 ? "da nemico" : "da amico"} (${(t[k] > 0 ? "+" : "−") + V.num(Math.abs(t[k]), 2)})${al[k] ? ", " + (al[k][1] === "alleato" ? "alleanza in vigore" : al[k][1] === "guerra" ? "in guerra con l'Italia" : al[k][1]) : ""}`); });
        }
        Object.keys(al).forEach((k) => {
          if (+k < o.x[0] || +k > o.x[1]) return; const st = al[k][1];
          if (st === "alleato") svg.append("rect").attr("x", x(+k)).attr("y", y0 + o.hp + 2).attr("width", aw + 0.4).attr("height", o.hf - 2).attr("fill", T.alleanza);
          else if (st === "guerra") svg.append("rect").attr("x", x(+k) - 0.5).attr("y", y0 + o.hp + 1).attr("width", aw + 1.4).attr("height", o.hf + 1).attr("fill", T.guerra);
        });
        (notePer[p] || []).forEach((n) => {
          const px = Math.max(wl, Math.min(w, x(n.anno))), anc = n.anc || (px > w - 260 ? "end" : "start");
          n.righe.forEach((r, j) => alone(testo(svg, px, n.sopra ? y0 - 6 - 15 * (n.righe.length - 1 - j) - (sopra ? 16 : 0) : y0 + o.hp + o.hf + 15 + j * 15, r, { fill: T.ink, fs: T.fs + 0.5, anc: anc, peso: j === 0 && n.forte ? 700 : null })));
        });
      });
      if (o.x[0] <= 1941 && o.x[1] >= 1945 && o.vuotoGuerra !== false) { const xm = (x(1941) + x(1946)) / 2; testo(svg, xm, h - 1, stretto ? "" : "1941-45: nessun resoconto", { anc: "middle", fs: T.fs - 1 }); }
    });
  };
  V.legendaStrisce = function () {
    const T = V.tema; let s = "";
    for (let k = -6; k <= 6; k++) s += `<i style="background:${V.tono(-k / 10)}"></i>`;
    return `<span class="g-leg"><span class="g-scala">${s}</span> da nemico → da amico</span><span class="g-leg"><i class="g-tr" style="background:${T.alleanza}"></i> alleanza in vigore</span><span class="g-leg"><i class="g-qd" style="background:${T.guerra}"></i> guerra contro l'Italia</span><span class="g-leg"><i class="g-qd" style="background:#fff;outline:1px solid ${T.riga}"></i> poche frasi</span>`;
  };

  /* ---------- 4. colonne (un mese, una colonna) ---------- */
  V.colonne = function (sel, pts, o) {
    o = Object.assign({ h: 90 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, svg = svgDi(a, w, h, o.nome || "colonne");
      const x = d3.scaleBand().domain(pts.map((p) => p[0])).range([0, w]).paddingInner(0.18);
      const mx = d3.max(pts, (p) => p[1] || 0), y = d3.scaleLinear().domain([0, mx * 1.08]).range([h - 16, 14]);
      const im = d3.maxIndex(pts, (p) => p[1] || 0);
      pts.forEach((p, i) => {
        if (p[1]) svg.append("rect").attr("x", x(p[0])).attr("width", x.bandwidth()).attr("y", y(p[1])).attr("height", y(0) - y(p[1])).attr("fill", i === im ? T.evid : T.dati);
        if (String(p[0]).endsWith("-01")) testo(svg, x(p[0]), h - 3, String(p[0]).slice(0, 4), { fs: T.fs - 0.5 });
      });
      svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", h - 16).attr("y2", h - 16).attr("stroke", T.dati);
      if (o.etich) testo(svg, x(pts[im][0]) + x.bandwidth() + 4, y(pts[im][1]) + 9, o.etich, { fill: T.ink, peso: 700 });
    });
  };

  /* ---------- 5. PCI e DC sulla mappa delle parole ---------- */
  V.traiettorie = function (sel, TR, o) {
    o = Object.assign({ h: 120, fino: 10 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, m = 12, P = TR.partiti, svg = svgDi(a, w, h, "PCI e DC sulla mappa delle parole");
      const tutti = [].concat(...Object.values(P)).filter((q) => q[0] <= o.fino + 1);
      const x = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[2])).range([m, w - m - 20]), y = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[3])).range([h - m, m]);
      tutti.forEach((q) => svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", 2).attr("fill", T.dati).attr("fill-opacity", 0.6));
      [["PCI", V.FAM["PCI-PD"]], ["DC", V.FAM.DC]].forEach(([n, c]) => {
        const v = (P[n] || []).filter((q) => q[0] <= o.fino);
        svg.append("path").attr("d", d3.line().x((q) => x(q[2])).y((q) => y(q[3]))(v)).attr("fill", "none").attr("stroke", c).attr("stroke-width", 1.8);
        v.forEach((q) => svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", q[0] === 7 ? 5 : 2.6).attr("fill", c));
        const p1 = v[0], p7 = v.find((q) => q[0] === 7);
        if (p1) alone(testo(svg, x(p1[2]) + 6, y(p1[3]) + (n === "PCI" ? 14 : -6), n + " 1948", { fill: c, peso: 700 }));
        if (p7 && o.etich !== false) alone(testo(svg, x(p7[2]) + 8, y(p7[3]) + 4, n === "PCI" ? "1976-79" : "", { fill: T.ink, peso: 700 }));
      });
    });
  };

  /* ---------- 6. due punti e una pendenza ---------- */
  V.pendenza = function (sel, da, a_, o) {
    o = Object.assign({ h: 90, max: 1, fmt: (v) => Math.round(v * 100) + "%" }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, svg = svgDi(a, w, h, o.nome || "pendenza"), c = o.colore || T.evid;
      const x0 = w * 0.22, x1 = w * 0.78, y = d3.scaleLinear().domain([0, o.max]).range([h - 20, 16]);
      svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", T.dati);
      [x0, x1].forEach((px) => svg.append("line").attr("x1", px).attr("x2", px).attr("y1", 10).attr("y2", y(0)).attr("stroke", T.riga));
      svg.append("line").attr("x1", x0).attr("x2", x1).attr("y1", y(da[1])).attr("y2", y(a_[1])).attr("stroke", c).attr("stroke-width", 2.2);
      [[x0, da, "end", -8], [x1, a_, "start", 8]].forEach(([px, d, anc, dx]) => {
        svg.append("circle").attr("cx", px).attr("cy", y(d[1])).attr("r", 4).attr("fill", c);
        testo(svg, px + dx, y(d[1]) + 5, o.fmt(d[1]), { fill: T.ink, peso: 700, anc: anc, fs: T.fs + 2 });
        testo(svg, px, h - 4, d[0], { anc: "middle", fs: T.fs - 0.5 });
      });
    });
  };

  /* ---------- 7. manubri: due valori per riga ---------- */
  V.manubri = function (sel, righe, o) {
    o = Object.assign({ passo: 22, dom: [0, 100], wl: 92, fmt: (v) => V.num(v), ca: null, cb: null, tacche: null }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, mt = 18, h = mt + righe.length * o.passo + 4, svg = svgDi(a, w, h, o.nome || "manubri");
      const x = d3.scaleLinear().domain(o.dom).range([o.wl, w - 26]);
      (o.tacche || x.ticks(4)).forEach((t) => { svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", mt - 4).attr("y2", h).attr("stroke", t === 0 && o.dom[0] < 0 ? T.grigio : T.riga); testo(svg, x(t), 10, o.fmtAsse ? o.fmtAsse(t) : t, { anc: "middle", fs: T.fs - 0.5 }); });
      righe.forEach((r, i) => {
        const cy = mt + i * o.passo + o.passo / 2, ca = o.ca || T.fondo, cb = o.cb || T.ink;
        testo(svg, 0, cy + 4, r[0], { fill: T.ink, fs: T.fs + 0.5 });
        if (r[1] != null && r[2] != null) svg.append("line").attr("x1", x(r[1])).attr("x2", x(r[2])).attr("y1", cy).attr("y2", cy).attr("stroke", T.dati).attr("stroke-width", 2);
        if (r[1] != null) svg.append("circle").attr("cx", x(r[1])).attr("cy", cy).attr("r", 4.5).attr("fill", ca).attr("stroke", o.ca ? "none" : T.ink).attr("stroke-width", 1.4);
        if (r[2] != null) { svg.append("circle").attr("cx", x(r[2])).attr("cy", cy).attr("r", 4.5).attr("fill", cb); testo(svg, x(r[2]) + (r[2] >= (r[1] == null ? -1e9 : r[1]) ? 8 : -8), cy + 4, o.fmt(r[2]), { fill: T.ink, peso: 700, anc: r[2] >= (r[1] == null ? -1e9 : r[1]) ? "start" : "end" }); }
        if (o.due && r[1] != null) testo(svg, x(r[1]) + (r[1] > r[2] ? 8 : -8), cy + 4, o.fmt(r[1]), { fill: T.ink, peso: 700, anc: r[1] > r[2] ? "start" : "end" });
      });
    });
  };

  /* ---------- 8. la lingua dei partiti nel tempo: una scia per famiglia ---------- */
  V.scie = function (sel, L, o) {
    o = Object.assign({ h: 220 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, mr = w < 520 ? 4 : 70, svg = svgDi(a, w, h, "La lingua dei partiti, legislatura per legislatura");
      const tutti = [].concat(...Object.values(L)); const x = d3.scaleLinear().domain(o.dom || [1948, 2022]).range([o.ml != null ? o.ml : 4, w - (o.mr != null ? o.mr : mr)]);
      const y = d3.scaleLinear().domain(d3.extent(tutti, (p) => p[1])).range([h - 26, 16]);
      svg.append("line").attr("x1", x(1948)).attr("x2", x(2022)).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", T.dati);
      if (o.anni !== false) [1948, 1968, 1994, 2013, 2022].forEach((t) => { svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 12).attr("y2", h - 18).attr("stroke", T.riga); testo(svg, x(t), h - 4, t, { anc: t === 2022 ? "end" : t === 1948 ? "start" : "middle" }); });
      testo(svg, x(1948) + 2, 10, "↑ parole da destra"); testo(svg, x(1948) + 2, h - 22, "↓ parole da sinistra");
      const fine = [];
      Object.keys(L).forEach((f) => {
        const c = V.FAM[f] || T.dati, v = L[f];
        svg.append("path").attr("d", d3.line().x((p) => x(p[0])).y((p) => y(p[1])).curve(d3.curveMonotoneX)(v)).attr("fill", "none").attr("stroke", c).attr("stroke-width", 2.2);
        v.forEach((p) => svg.append("circle").attr("cx", x(p[0])).attr("cy", y(p[1])).attr("r", 3).attr("fill", c).attr("stroke", f === "M5S" ? T.ink : "none").attr("stroke-width", 0.6).append("title").text(`${V.FAMNOME[f] || f}, ${p[0]}${p[2] ? " (" + p[2] + ")" : ""}`));
        const u = v[v.length - 1]; fine.push({ f: f, x: x(u[0]), y: y(u[1]), c: c });
      });
      fine.sort((p, q) => p.y - q.y); for (let i = 1; i < fine.length; i++) if (fine[i].y - fine[i - 1].y < 14) fine[i].y = fine[i - 1].y + 14;
      fine.forEach((q) => alone(testo(svg, Math.min(q.x + 7, w - 4), q.y + 4, (V.FAMNOME[q.f] || q.f).split(", ").pop(), { fill: q.f === "M5S" ? T.ink : q.c, peso: 700, anc: q.x + 7 > w - 40 ? "end" : "start" })));
    });
  };

  /* ---------- 9. calore: un tema per riga, un anno per colonna ---------- */
  V.calore = function (sel, temi, o) {
    o = Object.assign({ hr: 13, wl: 190, n: 16 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, stretto = w < 520 || o.wl === 0, wl = stretto ? 0 : o.wl, mt = o.anni === false ? 2 : 16, mr = o.mr != null ? o.mr : 36;
      const righe = temi.slice(0, o.n).map((t) => ({ nome: t.nome.replace(/\s*\(.*\)$/, ""), q: t.q, im: d3.maxIndex(t.q) })).sort((p, q) => p.im - q.im);
      const passo = o.hr + (stretto ? 14 : 2), h = mt + righe.length * passo, svg = svgDi(a, w, h, "I temi dell'aula, anno per anno");
      const x = d3.scaleLinear().domain([1848, 2023]).range([wl, w - mr]), aw = x(1849) - x(1848);
      if (o.anni !== false) [1850, 1900, 1950, 2000].forEach((t) => testo(svg, x(t), 10, t, { anc: "middle" }));
      righe.forEach((r, i) => {
        const y0 = mt + i * passo + (stretto ? 13 : 0), mx = d3.max(r.q);
        testo(svg, stretto ? 0 : wl - 8, stretto ? y0 - 3 : y0 + o.hr - 2, r.nome.length > 34 ? r.nome.slice(0, 32) + "…" : r.nome, { anc: stretto ? "start" : "end", fill: T.ink, fs: T.fs });
        r.q.forEach((v, k) => { if (v > 0) svg.append("rect").attr("x", x(1848 + k)).attr("y", y0).attr("width", aw + 0.3).attr("height", o.hr).attr("fill", misto("#fff", o.colore || T.ink, Math.pow(v / mx, 1.4) * 0.85)).append("title").text(`${r.nome}, ${1848 + k}: ${V.num(v * 100, 1)}% delle parole della Camera`); });
        svg.append("rect").attr("x", x(1848 + r.im)).attr("y", y0).attr("width", aw + 0.3).attr("height", o.hr).attr("fill", T.evid);
        if (mr >= 30) testo(svg, w - 32, y0 + o.hr - 2, 1848 + r.im, { fill: T.ink, peso: 700 }); else alone(testo(svg, x(1848 + r.im) + (r.im > 150 ? -4 : aw + 4), y0 + o.hr - 1, 1848 + r.im, { fill: T.ink, peso: 700, anc: r.im > 150 ? "end" : "start" }));
      });
    });
  };

  /* ---------- 10. barre orizzontali ---------- */
  V.barre = function (sel, righe, o) {
    o = Object.assign({ passo: 20, wl: 96, fmt: (v) => V.num(v), hb: 9 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = righe.length * o.passo + 2, svg = svgDi(a, w, h, o.nome || "barre");
      const x = d3.scaleLinear().domain([0, o.max || d3.max(righe, (r) => r[1])]).range([o.wl, w - 44]);
      righe.forEach((r, i) => {
        const cy = i * o.passo + o.passo / 2;
        testo(svg, 0, cy + 4, r[0], { fill: T.ink, fs: T.fs + 0.5 });
        svg.append("rect").attr("x", o.wl).attr("y", cy - o.hb / 2).attr("width", Math.max(1, x(r[1]) - o.wl)).attr("height", o.hb).attr("fill", r[2] ? (o.colore || T.evid) : T.dati);
        testo(svg, x(r[1]) + 5, cy + 4, o.fmt(r[1]), { fill: T.ink, peso: r[2] ? 700 : null });
      });
    });
  };

  /* ---------- 11. verdetti degli esperimenti, filone per filone ---------- */
  V.verdetti = function (sel, conti, o) {
    o = Object.assign({ passo: 17, wl: 200, q: 7 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, stretto = w < 420, wl = stretto ? 0 : o.wl, righe = conti.filter((c) => c[0] !== "Totale");
      const passo = o.passo + (stretto ? 13 : 0), h = righe.length * passo + 2, svg = svgDi(a, w, h, "Verdetti degli esperimenti");
      righe.forEach((r, i) => {
        const y0 = i * passo + (stretto ? 13 : 0); let k = 0;
        testo(svg, stretto ? 0 : wl - 8, stretto ? y0 - 2 : y0 + o.q + 3, r[0].replace(/^Temi: /, "").replace(/ \(.*\)$/, "").slice(0, 34), { anc: stretto ? "start" : "end", fill: T.ink, fs: T.fs });
        [[r[1], T.ink, 0], [r[2], T.dati, 0], [r[3], T.nemico, 0], [r[4] + r[5] + r[6], T.fondo, 1]].forEach(([n, c, vuoto]) => { for (let j = 0; j < n; j++, k++) svg.append("rect").attr("x", wl + k * (o.q + 2)).attr("y", y0 + 2).attr("width", o.q).attr("height", o.q).attr("fill", c).attr("stroke", vuoto ? T.dati : "none"); });
      });
    });
  };

  /* ---------- 12. il primo nemico e il primo amico di ogni anno ---------- */
  V.nemicoAnno = function (sel, X, o) {
    o = Object.assign({ hr: 15, wl: 104, min: 4 }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, stretto = w < 520, wl = stretto ? 78 : o.wl, mt = 16;
      const conta = {}; X.nemico_anno.forEach((r) => { [r[1], r[3]].forEach((p) => { if (p[0] !== "(") conta[p] = (conta[p] || 0) + 1; }); });
      const paesi = Object.keys(conta).filter((p) => conta[p] >= o.min).sort((p, q) => d3.min(X.nemico_anno.filter((r) => r[1] === p), (r) => r[0]) - d3.min(X.nemico_anno.filter((r) => r[1] === q), (r) => r[0]) || 0);
      const h = mt + paesi.length * (o.hr + 3), svg = svgDi(a, w, h, "Il primo nemico e il primo amico di ogni anno");
      const x = d3.scaleLinear().domain([1848, 2023]).range([wl, w - 2]), aw = Math.max(1.2, x(1849) - x(1848) - 0.6);
      [1850, 1900, 1950, 2000].forEach((t) => { testo(svg, x(t), 10, t, { anc: "middle" }); svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 13).attr("y2", h).attr("stroke", T.riga); });
      paesi.forEach((p, i) => {
        const y0 = mt + i * (o.hr + 3);
        testo(svg, 0, y0 + o.hr - 3, p, { fill: T.ink, fs: T.fs });
        svg.append("line").attr("x1", wl).attr("x2", w).attr("y1", y0 + o.hr / 2).attr("y2", y0 + o.hr / 2).attr("stroke", T.riga);
        X.nemico_anno.forEach((r) => {
          if (r[1] === p) svg.append("rect").attr("x", x(r[0])).attr("y", y0).attr("width", aw).attr("height", o.hr / 2).attr("fill", T.nemico).append("title").text(`${r[0]}: il primo nemico è ${p}`);
          if (r[3] === p) svg.append("rect").attr("x", x(r[0])).attr("y", y0 + o.hr / 2).attr("width", aw).attr("height", o.hr / 2).attr("fill", T.amico).append("title").text(`${r[0]}: il primo amico è ${p}`);
        });
      });
    });
  };

  /* ---------- 13. specchio: consenso sopra, dissenso sotto (il fascismo) ---------- */
  V.specchio = function (sel, F, o) {
    o = Object.assign({ h: 110, x: [1913, 1939] }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, sc = F.serie.camera, kd = F.colonne.indexOf("b_dis_100"), kc = F.colonne.indexOf("b_cons_100");
      const anni = Object.keys(sc).map(Number).filter((y) => y >= o.x[0] && y <= o.x[1]).sort();
      const svg = svgDi(a, w, h, "Consenso e dissenso annotati alla Camera"), x = d3.scaleBand().domain(d3.range(o.x[0], o.x[1] + 1)).range([0, w]).paddingInner(0.2);
      const mx = d3.max(anni, (y) => Math.max(sc[y][kd] || 0, sc[y][kc] || 0)), meta = (h - 14) / 2, s = d3.scaleLinear().domain([0, mx]).range([0, meta - 12]);
      anni.forEach((y) => {
        if (sc[y][kc] != null) svg.append("rect").attr("x", x(y)).attr("width", x.bandwidth()).attr("y", meta - s(sc[y][kc])).attr("height", s(sc[y][kc])).attr("fill", o.sopra || T.dati);
        if (sc[y][kd] != null) svg.append("rect").attr("x", x(y)).attr("width", x.bandwidth()).attr("y", meta + 1).attr("height", s(sc[y][kd])).attr("fill", o.sotto || T.ink);
      });
      testo(svg, 0, 10, "consenso annotato ↑", { fill: o.testo || T.grigio }); testo(svg, 0, h - 16, "dissenso ↓", { fill: o.testo || T.grigio });
      [1913, 1926, 1939].forEach((t) => testo(svg, x(t) + (t === 1939 ? x.bandwidth() : 0), h - 2, t, { anc: t === 1939 ? "end" : "start", fill: o.testo || T.grigio, fs: T.fs - 0.5 }));
      const xr = x(1926) - x.step() * 0.1; svg.append("line").attr("x1", xr).attr("x2", xr).attr("y1", 14).attr("y2", h - 14).attr("stroke", o.riga || T.evid).attr("stroke-width", 1.5);
    });
  };

  /* ---------- 14. la lunghezza della frase, legislatura per legislatura ---------- */
  V.frasi = function (sel, archivi, o) {
    o = Object.assign({ h: 130, ramo: "camera" }, o || {});
    V.fig(sel, (a, w) => {
      const T = V.tema, h = o.h, svg = svgDi(a, w, h, "Parole per frase, legislatura per legislatura");
      const L = archivi.filter((r) => r.ramo === o.ramo && r.frase && r.epoca !== "consulta" && +r.da >= 1848).sort((p, q) => p.da - q.da);
      const ml = o.ml != null ? o.ml : 24, x = d3.scaleLinear().domain([1848, 2023]).range([ml, w - (o.ml != null ? 0 : 2)]), y = d3.scaleLinear().domain([20, d3.max(L, (r) => +r.frase) + 2]).range([h - 16, 8]);
      [25, 30, 35, 40].forEach((t) => { svg.append("line").attr("x1", ml).attr("x2", w).attr("y1", y(t)).attr("y2", y(t)).attr("stroke", T.riga); testo(svg, ml ? 0 : 3, y(t) + (ml ? 4 : -3), t + (t === 40 && !ml ? " parole per frase" : "")); });
      L.forEach((r, i) => { const x1 = i < L.length - 1 ? L[i + 1].da : +r.a + 1; svg.append("rect").attr("x", x(+r.da)).attr("y", y(+r.frase) - 1.5).attr("width", Math.max(2, x(x1) - x(+r.da) - 1)).attr("height", 3).attr("fill", +r.da < 1861 ? T.dati : T.ink); });
      svg.append("line").attr("x1", x(1861)).attr("x2", x(1861)).attr("y1", 4).attr("y2", h - 16).attr("stroke", T.evid).attr("stroke-width", 1.5);
      testo(svg, x(1861) + 4, o.ml != null ? h - 20 : 12, "1861", { fill: T.evid, peso: 700 });
      if (o.anni !== false) [1848, 1900, 1948, 1994, 2022].forEach((t) => testo(svg, x(t), h - 3, t, { anc: t === 2022 ? "end" : t === 1848 ? "start" : "middle", fs: T.fs - 0.5 }));
    });
  };

  /* ---------- pezzi di testo che si ripetono ---------- */
  V.CAPITOLI_NOTE = { // la riga sotto il piccolo grafico di ogni capitolo: dice che cosa si vede
    1: "Quota di parole in francese, Camera, 1848-1870", 2: "Parole per frase, Camera, 1848-1914", 3: "Consenso e dissenso annotati ogni cento interventi, Camera, 1913-1939",
    4: "Come l'aula parla della Germania, 1848-2022", 5: "PCI e DC sulla mappa delle parole, 1948-1992", 6: "«Tangentopoli» detta in aula, mese per mese, 1992-1996", 7: "Deputati M5S che parlano «da opposizione», XVII e XVIII legislatura"
  };
  /* il piccolo grafico vero di ogni capitolo; D = dati già caricati */
  V.graficoCapitolo = function (sel, n, D, o) {
    o = o || {}; const h = o.h || 96;
    if (n === 1) { const fc = D.L.francese.camera; V.mini(sel, Object.keys(fc).map(Number).sort().map((y) => [y, +fc[y]]), { h: h, x: [1848, 1870], assi: [1848, 1861, 1870], punti: [{ x: 1849, testo: "1849: 8,5%" }, { x: 1861, testo: "1861: zero", dy: -8, dx: 4, anc: "start" }], sp: 1.8 }); }
    if (n === 2) { const wp = D.L.regno.wps.camera; V.mini(sel, Object.keys(wp).map(Number).sort().map((y) => [y, +wp[y]]), { h: h, x: [1848, 1914], y: [22, 44], assi: [1848, 1914], area: false, righe: [[1861, "1861", V.tema.evid]], punti: [{ x: 1856, testo: "42", dy: -7, dx: 0, anc: "middle" }, { x: 1867, testo: "32 parole per frase", dy: 17, dx: 5, anc: "start" }], sp: 1.8 }); }
    if (n === 3) V.specchio(sel, D.F, { h: h });
    if (n === 4) V.strisce(sel, D.X, { paesi: o.paesi || ["Austria", "Germania", "Russia/URSS"], hp: o.hp || 13, hf: 4, vuoto: 5, wl: o.wl != null ? o.wl : 62, anni: false, fsNome: V.tema.fs, pesoNome: 600, sotto: false, vuotoGuerra: false });
    if (n === 5) V.traiettorie(sel, D.TR, { h: h });
    if (n === 6) { const g = D.TG.grafici.find((q) => q.dati && q.dati.forma === "colonne"); V.colonne(sel, g.dati.x.map((m, i) => [m, g.dati.serie[0].v[i]]), { h: h, etich: "marzo 1993: 171" }); }
    if (n === 7) { const O = D.M5.opposizione; V.pendenza(sel, ["2013-18", O[0][1]], ["2018-22", O[1][1]], { h: h, colore: V.tema.ink }); }
  };
  V.datiCapitoli = () => Promise.all([V.carica("sezioni/lingue.json"), V.carica("sezioni/fascismo.json"), V.carica("sezioni/esteri.json"), V.carica("partiti/traiettorie.json"), V.carica("storie/tangentopoli-entra-in-aula.json"), V.carica("partiti/m5s.json")]).then(([L, F, X, TR, TG, M5]) => ({ L: L, F: F, X: X, TR: TR, TG: TG, M5: M5 }));
  /* le note dentro il grafico delle strisce (frasi e numeri dal capitolo 4) */
  V.NOTE_STRISCE = [
    { paese: "Austria", anno: 1866, righe: ["«la guerra all'Austria sia per noi suprema necessità»", "Giuseppe Romano, Camera, 1° maggio 1866"] },
    { paese: "Austria", anno: 1956, sopra: true, righe: ["1956-67, Alto Adige: per il giudice è «nemica» in 38 passaggi su 100"] },
    { paese: "Germania", anno: 1916, anc: "middle", righe: ["«la nostra oggi nemica Germania», Maffi, Camera, 11 dicembre 1916"] },
    { paese: "Russia/URSS", anno: 1948, righe: ["1948-68: per il PCI è un paese amico, per la DC un nemico"] },
    { paese: "Stati Uniti", anno: 1882, righe: ["«la concorrenza americana batte alle porte di questa vecchia e sdruscita Europa», Mussi, 1882"] },
    { paese: "Jugoslavia", anno: 1945, righe: ["1945-54, Trieste: trattata da nemica in 49 passaggi su 100, più di ogni altro paese"] }
  ];
})();
