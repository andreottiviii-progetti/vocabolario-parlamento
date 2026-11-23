/* Grafici che cambiano stato a ogni passo (guida v2, capitolo 5): componenti riusabili.
   Ogni scena si disegna completa (lo stato finale si legge anche fermo e senza movimento) e offre stato(s)
   per accendere e spegnere le sue parti. G.legaPassi collega gli stati ai passi del testo mentre si scorre;
   G.bottoniStati mette sotto il grafico dei bottoni per chi non scorre un testo. */
(function () {
  "use strict";
  const S = (G.Scena = {});
  const ROSSO = "#E3120B", TURCHESE = "#00A3AD", TURCHESE_S = "#00757D";

  /* collega gli stati ai passi: mappa[k] e' lo stato del passo k (0, 1, 2...) */
  G.legaPassi = function (scena, passi, mappa) {
    if (!scena || !passi.length) return;
    const fai = (k) => scena.stato(mappa[Math.min(k, mappa.length - 1)]);
    if (!("IntersectionObserver" in window)) { scena.stato(null); return; }
    const io = new IntersectionObserver((voci) => voci.forEach((e) => { if (e.isIntersecting) fai(+e.target.dataset.stato - 1); }), { rootMargin: "-40% 0px -50% 0px" });
    passi.forEach((p) => io.observe(p));
  };
  G.bottoniStati = function (sel, scena, etichette) {
    const box = document.querySelector(sel);
    if (!box || !scena) return;
    box.innerHTML = '<div class="filtri" role="group" aria-label="Passi del grafico">' + etichette.map((t, i) => `<button type="button" data-i="${i}" class="${i === etichette.length - 1 ? "attivo" : ""}">${G.esc(t)}</button>`).join("") + "</div>";
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      box.querySelectorAll("button").forEach((x) => x.classList.toggle("attivo", x === b));
      scena.stato(scena.stati[+b.dataset.i]);
    }));
  };
  const transizione = (sel) => (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? sel : sel.transition().duration(400));

  /* ---------- Amici e nemici: fasce doppie per paese (parole sopra, alleanze e guerre sotto) ---------- */
  S.amiciNemici = function (sel, X) {
    const PAESI = ["Austria", "Germania", "Francia", "Gran Bretagna", "Russia/URSS", "Stati Uniti", "Jugoslavia"];
    const scena = { stati: [], stato: () => {} };
    const colore = (v) => (v == null ? "#fff" : v >= 0.3 ? "#C9241C" : v >= 0.1 ? "#EE9B95" : v > -0.1 ? "#ECEDEF" : v > -0.3 ? "#8FD0D5" : "#00838C"); // cinque gradini
    const m3 = (o, a) => { const v = []; for (let y = a - 1; y <= a + 1; y++) if (o[y] && o[y][0] != null && (o[y][3] || 0) >= 30) v.push(o[y][0]); return v.length >= 2 ? d3.mean(v) : null; };
    const giud = X.giudice_periodi || {};
    const area = G.figura(sel, {
      titolo: "Amici e nemici dell'Italia: in aula il tono segue i trattati",
      sotto: "Per ogni paese due strisce: sopra come ne parla l'aula, anno per anno (rosso da nemico, turchese da amico, bianco se se ne parla poco), sotto le alleanze (turchese) e le guerre vere (rosso). Jugoslavia e Austria 1956-67: il colore viene dal giudice automatico, perché lì le parole vicine sbagliano il segno.",
      limite: "Fonte delle alleanze e delle guerre: Correlates of War. Le parole vicine sono una misura grezza: giusta in circa tre frasi su quattro.",
      csv: () => [["paese", "anno", "indice_parole", "stato_vero"]].concat([].concat(...PAESI.map((p) => G.ANNI.map((a) => [p, a, m3(X.indice[p] || {}, a), ((X.alleanze[p] || {})[a] || [])[1] || ""])))), nomeCSV: "amici_nemici",
    });
    let celle = null, righe = null, note = null;
    G.grafico(area, (a, w) => {
      const stretto = w < 700, lw = stretto ? 86 : 150, rh = stretto ? 46 : 58, top = 28;
      const h = top + PAESI.length * rh + 26;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Amici e nemici dell'Italia");
      const x = d3.scaleLinear().domain([1848, 2023]).range([lw, w - 8]);
      const cw = Math.max(1, x(1849) - x(1848));
      [1860, 1900, 1940, 1980, 2020].forEach((y) => { svg.append("line").attr("x1", x(y)).attr("x2", x(y)).attr("y1", top - 6).attr("y2", h - 22).attr("stroke", G.RIGA); svg.append("text").attr("x", x(y)).attr("y", top - 10).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(y); });
      const tutte = [];
      PAESI.forEach((p, i) => {
        const y0 = top + i * rh;
        const g = svg.append("g").attr("class", "riga-paese").attr("data-p", p);
        g.append("text").attr("x", 0).attr("y", y0 + rh * 0.45).attr("font-size", stretto ? 13 : 17).attr("font-weight", 800).attr("fill", G.INK).text(p === "Russia/URSS" && stretto ? "URSS" : p);
        const o = X.indice[p] || {}, al = X.alleanze[p] || {};
        G.ANNI.forEach((y) => {
          let v = p === "Jugoslavia" ? null : m3(o, y), daGiudice = false;
          const gp = (giud[p] || []).find((q) => y >= q[0] && y <= q[1]);
          if (gp && (p === "Jugoslavia" || (y >= 1956 && y <= 1967))) { v = (gp[2] - 0.15) * 1.6; daGiudice = true; }
          if (v != null) tutte.push(g.append("rect").attr("class", "cella").attr("data-p", p).attr("data-a", y).attr("x", x(y)).attr("y", y0 + 6).attr("width", cw + 0.4).attr("height", rh * 0.5).attr("fill", colore(v)).attr("stroke", daGiudice ? G.INK : null).attr("stroke-width", daGiudice ? 0.4 : null).node());
          const st = (al[y] || [])[1];
          if (st === "alleato" || st === "guerra") g.append("rect").attr("class", "cella fatto").attr("data-p", p).attr("data-a", y).attr("x", x(y)).attr("y", y0 + 6 + rh * 0.5 + 4).attr("width", cw + 0.4).attr("height", 5).attr("fill", st === "alleato" ? TURCHESE_S : ROSSO);
        });
        if (!stretto) g.append("text").attr("x", 0).attr("y", y0 + rh * 0.45 + 15).attr("font-size", 12).attr("fill", G.GRIGIO).text(p === "Jugoslavia" ? "il giudice, i fatti" : "le parole, i fatti");
      });
      svg.append("rect").attr("x", x(1941.5)).attr("y", top - 4).attr("width", x(1946) - x(1941.5)).attr("height", h - top - 18).attr("fill", "#fff");
      svg.append("text").attr("x", x(1943.7)).attr("y", h - 6).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text("1941-45: nessun resoconto");
      note = svg.append("g").attr("class", "note-scena");
      celle = d3.select(svg.node()).selectAll(".cella");
      righe = d3.select(svg.node()).selectAll(".riga-paese");
      scena.x = x; scena.top = top; scena.rh = rh; scena.svg = svg;
      if (scena.ultimo !== undefined) scena.stato(scena.ultimo, true);
    });
    /* stato: {righe:[paesi] (vuoto = tutte), fino: anno, evid: [[paese, da, a]], nota: testo} ; null = tutto */
    scena.stato = function (s, subito) {
      scena.ultimo = s;
      if (!celle) return;
      const tutti = !s;
      transizione(righe).style("opacity", function () { return tutti || !s.righe || !s.righe.length || s.righe.includes(this.dataset.p) ? 1 : 0.08; });
      transizione(celle).style("opacity", function () {
        if (tutti) return 1;
        const a = +this.dataset.a, p = this.dataset.p;
        if (s.fino && a > s.fino) return 0;
        if (s.evid && s.evid.length) return s.evid.some((e) => e[0] === p && a >= e[1] && a <= e[2]) ? 1 : (s.righe && s.righe.includes(p) ? 0.25 : 1);
        return 1;
      });
      note.selectAll("*").remove();
      if (s && s.nota && scena.x) {
        const r = PAESI.indexOf(s.nota[0]);
        const y = scena.top + r * scena.rh + scena.rh * 0.5 + 22;
        note.append("text").attr("class", "nota-t").attr("x", scena.x(s.nota[1])).attr("y", y).attr("text-anchor", scena.x(s.nota[1]) > scena.svg.attr("width") * 0.7 ? "end" : "start").text(s.nota[2]);
      }
    };
    scena.stati = [
      { righe: ["Germania"], evid: [["Germania", 1915, 1918], ["Germania", 1939, 1940]], nota: ["Germania", 1916, "1916 nemica, 1940 alleata"] },
      { righe: ["Austria", "Stati Uniti"], fino: 1914 },
      { righe: ["Austria"], evid: [["Austria", 1882, 1914], ["Austria", 1915, 1918]], nota: ["Austria", 1882, "Triplice, 1882-1914: alleata nei trattati e amica nelle parole"] },
      { righe: ["Germania"] },
      { righe: ["Russia/URSS", "Stati Uniti"], fino: 1968 },
      { righe: ["Jugoslavia", "Austria"], evid: [["Jugoslavia", 1945, 1990], ["Austria", 1956, 1967]], nota: ["Jugoslavia", 1945, "1945-54: il paese trattato più da nemico (giudice)"] },
      { righe: ["Russia/URSS"], evid: [["Russia/URSS", 2010, 2022]], nota: ["Russia/URSS", 2022, "2022: nemica"] },
      null,
    ];
    return scena;
  };

  /* ---------- Il francese in aula: un quadretto per ogni intervento in francese, Camera 1848-1862 ---------- */
  S.francese = function (sel, L) {
    const T = (L.turni_fr || {}).camera || {}, Q = (L.francese || {}).camera || {};
    const anni = []; for (let a = 1848; a <= 1862; a++) anni.push(a);
    const mx = d3.max(anni, (a) => T[a] || 0), am = anni.reduce((p, q) => ((T[q] || 0) > (T[p] || 0) ? q : p), 1848);
    const scena = { stati: [], stato: () => {} };
    const area = G.figura(sel, {
      titolo: `Nel ${am} alla Camera si parla francese ${G.num(T[am])} volte. Nel 1861, ${T[1861] ? G.num(T[1861]) + " volte" : "nessuna"}`,
      sotto: "Ogni quadretto è un intervento in francese, Camera, 1848-1862; sotto l'anno, la quota delle parole dette in francese",
      csv: () => [["anno", "interventi_in_francese", "quota_parole_%"]].concat(anni.map((a) => [a, T[a] || 0, Q[a]])), nomeCSV: "francese_quadretti",
    });
    let qd = null, et = null, fine = null;
    G.grafico(area, (a, w) => {
      const stretto = w < 600, h = stretto ? 300 : 380, base = h - 46, top = 26;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Interventi in francese");
      const x = d3.scaleBand().domain(anni).range([0, w]).paddingInner(0.18);
      const col = Math.max(3, Math.floor(x.bandwidth() / (stretto ? 3 : 5)));
      const lato = x.bandwidth() / col;
      const per = Math.max(1, Math.ceil(mx / (col * Math.floor((base - top) / lato))));
      const tutti = [];
      anni.forEach((y) => {
        const n = Math.ceil((T[y] || 0) / per);
        for (let k = 0; k < n; k++) tutti.push({ y, k, cx: x(y) + (k % col) * lato, cy: base - (Math.floor(k / col) + 1) * lato });
        svg.append("text").attr("class", "q-et").attr("data-a", y).attr("x", x(y)).attr("y", base - (Math.ceil(n / col)) * lato - 6).attr("font-size", 12.5).attr("font-weight", 700).attr("fill", G.SEZ_S).text(T[y] ? G.num(T[y]) : (y === 1861 ? "zero" : ""));
        svg.append("text").attr("x", x(y)).attr("y", base + 16).attr("font-size", 12).attr("fill", G.INK).text(stretto ? String(y).slice(2) : y);
        if (!stretto) svg.append("text").attr("x", x(y)).attr("y", base + 31).attr("font-size", 12).attr("fill", G.GRIGIO).text(Q[y] != null ? G.num(Q[y], 1) + "%" : "");
      });
      svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", base).attr("y2", base).attr("stroke", G.GRIGIO);
      svg.selectAll("rect.q").data(tutti).enter().append("rect").attr("class", "q").attr("data-a", (d) => d.y).attr("x", (d) => d.cx).attr("y", (d) => d.cy).attr("width", Math.max(1, lato - 1)).attr("height", Math.max(1, lato - 1)).attr("fill", G.SEZ);
      if (per > 1) svg.append("text").attr("x", w).attr("y", 14).attr("text-anchor", "end").attr("font-size", 12).attr("fill", G.GRIGIO).text("un quadretto = " + per + " interventi");
      fine = svg.append("text").attr("x", x(1861) + x.bandwidth()).attr("y", base - 70).attr("text-anchor", "end").attr("font-size", stretto ? 16 : 22).attr("font-weight", 800).attr("fill", G.INK).text("1861: il Regno d'Italia. In aula, nessun intervento in francese.").style("opacity", 0);
      if (stretto) fine.text("1861: nessuno");
      qd = d3.select(svg.node()).selectAll("rect.q"); et = d3.select(svg.node()).selectAll(".q-et");
      if (scena.ultimo !== undefined) scena.stato(scena.ultimo);
    });
    /* stato: {fino: anno, tenue: bool, scritta: bool} ; null = tutto */
    scena.stato = function (s) {
      scena.ultimo = s;
      if (!qd) return;
      const fino = s ? s.fino : 9999;
      transizione(qd).style("opacity", function () { return +this.dataset.a <= fino ? (s && s.tenue ? 0.3 : 1) : 0; });
      transizione(et).style("opacity", function () { return +this.dataset.a <= fino ? 1 : 0; });
      transizione(fine).style("opacity", !s || s.scritta ? 1 : 0);
    };
    scena.stati = [{ fino: 1848 }, { fino: 1849 }, { fino: 1849, tenue: true }, { fino: 1859 }, { fino: 1862, scritta: true }, null];
    return scena;
  };

  /* ---------- Il fascismo: specchio, sopra il consenso annotato e sotto il dissenso; sotto, le prime volte delle parole ---------- */
  S.specchio = function (sel, F, parole) {
    const sc = F.serie.camera || {}, c = F.colonne;
    const anni = Object.keys(sc).map(Number).filter((y) => y >= 1913 && y <= 1938).sort();
    const su = (y) => sc[y][c.indexOf("b_cons_100")], giu = (y) => sc[y][c.indexOf("b_dis_100")];
    const scena = { stati: [], stato: () => {} };
    const ymin = anni.reduce((p, q) => (giu(q) < giu(p) ? q : p), anni[0]);
    const area = G.figura(sel, {
      titolo: `Sopra gli applausi, sotto le proteste: dal 1927 la metà di sotto si riduce, fino a ${G.num(giu(ymin), 0)} nel ${ymin}`,
      sotto: "Annotazioni dello stenografo ogni cento interventi, Camera, 1913-1938: sopra consenso (applausi, approvazioni), sotto dissenso (proteste, rumori, interruzioni, commenti). La fascia è il regime. Sotto, la prima volta in aula di alcune parole.",
      limite: "Si contano le annotazioni dello stenografo, non i fatti: sotto il regime i resoconti sono ripuliti.",
      csv: () => [["anno", "consenso_100", "dissenso_100"]].concat(anni.map((y) => [y, su(y), giu(y)])), nomeCSV: "specchio_fascismo",
    });
    let colSu = null, colGiu = null, fascia = null, crono = null;
    G.grafico(area, (a, w) => {
      const h = 470, mid = 210, alt = 180;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Consenso e dissenso");
      const x = d3.scaleBand().domain(anni).range([0, w]).paddingInner(0.15);
      const y = d3.scaleLinear().domain([0, d3.max(anni, (q) => Math.max(su(q) || 0, giu(q) || 0))]).range([0, alt]);
      fascia = svg.append("rect").attr("x", x(1926)).attr("y", 4).attr("width", w - x(1926)).attr("height", 2 * alt + 24).attr("fill", document.body.dataset.sezione === "fascismo" ? "#22252B" : "#EEF0F2").style("opacity", 0);
      colSu = svg.selectAll("rect.su").data(anni).enter().append("rect").attr("class", "su").attr("data-a", (d) => d).attr("x", (d) => x(d)).attr("width", x.bandwidth()).attr("y", (d) => mid - y(su(d) || 0)).attr("height", (d) => y(su(d) || 0)).attr("fill", G.GDATI);
      colGiu = svg.selectAll("rect.giu").data(anni).enter().append("rect").attr("class", "giu").attr("data-a", (d) => d).attr("x", (d) => x(d)).attr("width", x.bandwidth()).attr("y", mid).attr("height", (d) => y(giu(d) || 0)).attr("fill", ROSSO);
      svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", mid).attr("y2", mid).attr("stroke", G.INK);
      anni.filter((q) => q % 2 === 1).forEach((q) => svg.append("text").attr("x", x(q) + x.bandwidth() / 2).attr("y", mid + 4).attr("text-anchor", "middle").attr("font-size", 12).attr("class", "alone").attr("fill", G.INK).text(q));
      svg.append("text").attr("x", 0).attr("y", 14).attr("font-size", 12.5).attr("font-weight", 700).attr("fill", G.INK).text("↑ applausi, approvazioni ogni cento interventi");
      svg.append("text").attr("x", 0).attr("y", mid + alt + 14).attr("font-size", 12.5).attr("font-weight", 700).attr("fill", ROSSO).text("↓ proteste, rumori, interruzioni, commenti");
      crono = svg.append("g").style("opacity", 0);
      const yc = h - 40;
      crono.append("line").attr("x1", 0).attr("x2", w).attr("y1", yc).attr("y2", yc).attr("stroke", G.INK);
      (parole || []).forEach((p, i) => {
        const anno = +p.data.slice(0, 4);
        if (anno < 1913 || anno > 1938) return;
        const xx = x(anno) + x.bandwidth() / 2, alto = i % 2 === 0;
        crono.append("rect").attr("x", xx - 4).attr("y", yc - 4).attr("width", 8).attr("height", 8).attr("fill", G.INK);
        crono.append("text").attr("x", xx).attr("y", alto ? yc - 12 : yc + 22).attr("text-anchor", xx > w - 120 ? "end" : "start").attr("font-size", 14).attr("font-weight", 800).attr("fill", G.INK).text("«" + p.forma + "» " + G.data(p.data));
      });
      if (scena.ultimo !== undefined) scena.stato(scena.ultimo);
    });
    /* stato: {fino: anno, fascia: bool, parole: bool} ; null = tutto */
    scena.stato = function (s) {
      scena.ultimo = s;
      if (!colSu) return;
      const fino = s ? s.fino : 9999;
      transizione(colSu).style("opacity", function () { return +this.dataset.a <= fino ? 1 : 0; });
      transizione(colGiu).style("opacity", function () { return +this.dataset.a <= fino ? 1 : 0; });
      transizione(fascia).style("opacity", !s || s.fascia ? 1 : 0);
      transizione(crono).style("opacity", !s || s.parole ? 1 : 0);
    };
    scena.stati = [{ fino: 1922 }, { fino: 1925, fascia: true }, { fino: 1938, fascia: true }, null];
    return scena;
  };
  /* ---------- Curve a stati: un grafico a linee che a ogni passo mostra serie diverse (parole, frasi, risate...) ---------- */
  /* o = {titolo, sotto, limite, nomeCSV, serie: [{id, nome, punti: [[anno, v]], unita}],
          stati: [{mostra: [id], evid: [id], tratt: [id], x: [da, a], scritta, unita, fascia: {da, a, testo}, nota: {x, id, testo}}]} */
  S.curve = function (sel, o) {
    const scena = { stati: o.stati, stato: () => {} };
    const per = {}; o.serie.forEach((s) => (per[s.id] = s));
    const area = G.figura(sel, {
      titolo: o.titolo, sotto: o.sotto, limite: o.limite, nomeCSV: o.nomeCSV || "curve",
      csv: () => [["serie", "anno", "valore", "unita"]].concat([].concat(...o.serie.map((s) => s.punti.filter((p) => p[1] != null).map((p) => [s.nome, p[0], p[1], s.unita || ""])))),
    });
    let dis = null;
    G.grafico(area, (a, w) => {
      const stretto = w < 560, h = stretto ? 280 : 360, m = { t: 34, r: stretto ? 12 : 130, b: 26, l: 0 };
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", o.titolo);
      const gF = svg.append("g"), gA = svg.append("g").attr("class", "asse"), gL = svg.append("g"), gE = svg.append("g"), gN = svg.append("g");
      const scritta = svg.append("text").attr("x", 0).attr("y", 14).attr("font-size", 14).attr("font-weight", 800).attr("fill", G.INK);
      const x = d3.scaleLinear().range([m.l, w - m.r]), y = d3.scaleLinear().range([h - m.b, m.t]);
      const linee = {};
      o.serie.forEach((s) => (linee[s.id] = gL.append("path").attr("fill", "none").attr("stroke-width", 2).attr("stroke-linejoin", "round").style("opacity", 0)));
      dis = function (st) {
        const S0 = st || o.stati[o.stati.length - 1];
        const mostra = S0.mostra.filter((k) => per[k]), evid = S0.evid || mostra, tratt = S0.tratt || [];
        x.domain(S0.x);
        const vis = [].concat(...mostra.map((k) => per[k].punti.filter((p) => p[0] >= S0.x[0] && p[0] <= S0.x[1] && p[1] != null).map((p) => p[1])));
        const lo = S0.y0 != null ? S0.y0 : 0, hi = d3.max(vis) || 1;
        y.domain([lo, lo + (hi - lo) * 1.12]);
        gA.selectAll("*").remove();
        const ticks = y.ticks(4);
        ticks.forEach((v, i) => {
          gA.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null);
          gA.append("text").attr("x", m.l).attr("y", y(v) - 4).text(G.num(v, hi < 0.1 ? 3 : hi < 10 ? 1 : 0) + (i === ticks.length - 1 ? " " + (S0.unita || per[mostra[0]].unita || "") : ""));
        });
        const span = S0.x[1] - S0.x[0], passo = span > 100 ? (stretto ? 50 : 20) : span > 40 ? (stretto ? 20 : 10) : span > 20 ? (stretto ? 10 : 5) : stretto ? 5 : 2;
        d3.range(Math.ceil(S0.x[0] / passo) * passo, S0.x[1] + 0.001, passo).forEach((v) => gA.append("text").attr("x", x(v)).attr("y", h - m.b + 17).attr("text-anchor", x(v) < 20 ? "start" : "middle").text(v));
        gF.selectAll("*").remove();
        if (S0.fascia) {
          gF.append("rect").attr("x", x(S0.fascia.da)).attr("width", Math.max(2, x(S0.fascia.a) - x(S0.fascia.da))).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", document.body.dataset.sezione === "fascismo" ? "#22252B" : "#EEF0F2");
          if (S0.fascia.testo) gF.append("text").attr("x", x(S0.fascia.da) + 4).attr("y", m.t + 14).attr("font-size", 12.5).attr("font-weight", 700).attr("fill", G.INK).text(S0.fascia.testo);
        }
        const linea = d3.line().defined((d) => d[1] != null && d[0] >= S0.x[0] && d[0] <= S0.x[1]).x((d) => x(d[0])).y((d) => y(d[1]));
                const fine = [];
        o.serie.forEach((s) => {
          const on = mostra.includes(s.id), ev = evid.includes(s.id);
          const col = ev ? (s.colore || (evid.length === 1 ? G.SEZ : G.SERIE[evid.indexOf(s.id) % G.SERIE.length])) : G.GDATI;
          transizione(linee[s.id]).attr("d", linea(s.punti)).attr("stroke", col).attr("stroke-width", ev ? 2.5 : 1.5).attr("stroke-dasharray", tratt.includes(s.id) ? "6 4" : null).style("opacity", on ? 1 : 0);
          if (on) { const u = s.punti.filter((p) => p[1] != null && p[0] >= S0.x[0] && p[0] <= S0.x[1]).slice(-1)[0]; if (u) fine.push({ x: x(u[0]), y: y(u[1]), testo: s.nome, col: ev ? col : G.GRIGIO }); }
        });
        gE.selectAll("*").remove();
        if (stretto) {
          fine.forEach((f, i) => gE.append("text").attr("class", "etich").attr("x", w - 4).attr("y", m.t + 14 + i * 15).attr("text-anchor", "end").attr("fill", f.col).text(f.testo));
        } else {
          G.separa(fine, 15, m.t, h - m.b);
          fine.forEach((f) => gE.append("text").attr("class", "etich").attr("x", f.x + 6).attr("y", f.y + 4).attr("fill", f.col).text(f.testo));
        }
        gN.selectAll("*").remove();
        if (S0.nota && per[S0.nota.id]) {
          const p = per[S0.nota.id].punti.find((q) => q[0] === S0.nota.x);
          if (p && p[1] != null) {
            gN.append("circle").attr("cx", x(p[0])).attr("cy", y(p[1])).attr("r", 4.5).attr("fill", G.INK);
            gN.append("text").attr("class", "etich alone").attr("x", x(p[0]) + (x(p[0]) > w * 0.7 ? -8 : 8)).attr("y", y(p[1]) - 8).attr("text-anchor", x(p[0]) > w * 0.7 ? "end" : "start").attr("fill", G.INK).text(S0.nota.testo);
          }
        }
        scritta.text(S0.scritta || "");
      };
      dis(scena.ultimo);
    });
    scena.stato = function (s) { scena.ultimo = s; if (dis) dis(s); };
    return scena;
  };
  /* serie di parole (per milione di parole, media di tre anni) dalle curve del sito */
  S.parole = function (lista, grezzo) {
    return Promise.all(lista.map((w) => G.curvaParola(w).then((c) => {
      if (!c) return null;
      const v = grezzo ? c.pm.m : G.media3(c.pm.m);
      return { id: w, nome: "«" + c.forma + "»", unita: "per milione di parole", punti: G.ANNI.map((a, i) => [a, v[i]]) };
    }))).then((v) => v.filter(Boolean));
  };
  /* le prime volte delle parole del regime, dall'archivio delle prime volte */
  S.primeParole = function (lista) {
    // prima il file piccolo delle parole scelte (g6), poi l'archivio intero solo per le parole che mancano
    return G.carica("prime/scelte.json").catch(() => ({})).then((SC) => Promise.all(lista.map((w) => (SC[w] ? { forma: SC[w].f, data: SC[w].data }
      : G.schedaPrime(w).then((s) => (s && s.p && s.p[0] ? { forma: s.f || w, data: s.p[0][0] } : null))))))
      .then((v) => v.filter(Boolean).sort((a, b) => (a.data < b.data ? -1 : 1)));
  };
})();
