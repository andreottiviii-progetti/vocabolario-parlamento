/* Pagina di una storia: storia.html?id=tangentopoli-entra-in-aula */
(function () {
  "use strict";
  const ROM = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX"];
  G.avvia(function () {
    G.testata({ attivo: "Storie" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = G.param("id");
    if (!id) { location.replace("storie.html"); return; }
    return Promise.all([G.carica("storie/" + id + ".json"), G.carica("storie/indice.json"), G.carica("esperimenti.json"), G.indiceParole(), G.carica("persone/indice.json")])
      .then(([St, IX, E, IP, PE]) => pagina(el, St, IX, E, IP, PE))
      .catch((e) => { console.error(e); G.nonTrovato(el, "Questa storia non c'è."); });
  });

  function pagina(el, St, IX, E, IP, PE) {
    document.title = St.titolo + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = "n. " + (IX.storie.find((s) => s.id === St.id) || {}).n;
    const anni = (St.anni || []).map(Number).filter(Boolean);
    if (anni.length) G.dove([Math.min(...anni), Math.max(...anni), St.occhiello || anni.join("-")]); else document.getElementById("dove").remove();
    const regno = anni.length && Math.max(...anni) < 1946;
    const esp = (St.ipotesi || []).map((c) => E.elenco.find((e) => e.cod === c) || E.elenco.find((e) => e.cod.startsWith(c))).filter(Boolean);
    const persona = (n) => {
      const N = n.toUpperCase();
      const r = PE.p.find((x) => x[1].toUpperCase() === N) || PE.p.find((x) => x[1].toUpperCase().endsWith(" " + N.split(" ").slice(-1)[0]) && x[1].toUpperCase().startsWith(N.split(" ")[0]));
      return r ? G.lPersona(r[0], G.oratore(r[1])) : G.esc(n);
    };
    const parola = (w) => { const k = G.norma(w); const i = IP._mappa.get(k); return i != null ? G.lParola(k, IP.p[i][1] || w) : G.esc(w); };
    const legLink = (r) => { const n = ROM.indexOf(String(r).trim()); return n > 0 ? G.lLeg((regno ? "regno-" : "repubblica-") + n, r + " legislatura") : G.esc(r); };
    const idx = IX.storie.findIndex((s) => s.id === St.id);
    const prec = IX.storie[idx - 1], succ = IX.storie[idx + 1];
    const coll = (St.storie_collegate || []).map((sid) => IX.storie.find((s) => s.id === sid)).filter(Boolean);
    el.innerHTML = `
      <article class="storia griglia">
        <div class="c9">
          <p class="occhiello">${G.esc(St.occhiello)}</p>
          <h1>${G.esc(St.titolo)}</h1>
          <p class="sommario">${G.esc(St.sottotitolo)}</p>
          <div id="nel-racconto"></div><div class="colonna-testo">${St.testo}</div>
          <div id="grafici"></div>
          <div class="colonna-testo verdetto" style="margin-top:32px"><h2 class="titolo-piccolo">Verdetto e limiti</h2>${St.verdetto_testo}</div>
        </div>
        <aside class="c3 fil">
          <h3 class="titolo-piccolo" style="margin-top:18px">Il verdetto</h3>
          <ul class="fatti">${esp.length ? esp.map((e) => `<li>${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span></li>`).join("") : `<li>${G.esito(St.verdetto || "descrittiva")}<span class="et">lavoro descrittivo, senza ipotesi da verificare</span></li>`}</ul>
          ${St.parole.length ? `<h3 class="titolo-piccolo" style="margin-top:18px">Parole</h3><p class="parole-nuvola">${St.parole.map(parola).join(" ")}</p>` : ""}
          ${St.partiti.length || St.persone.length ? `<h3 class="titolo-piccolo" style="margin-top:18px">Partiti e persone</h3><p class="parole-nuvola">${St.partiti.map((p) => G.lPartito(p, p)).join(" ")} ${St.persone.map(persona).join(" ")}</p>` : ""}
          ${St.legislature.length || anni.length ? `<h3 class="titolo-piccolo" style="margin-top:18px">Legislature e anni</h3><p class="parole-nuvola">${St.legislature.map(legLink).join(" ")} ${anni.map((a) => G.lAnno(a)).join(" ")}</p>` : ""}
          ${coll.length ? `<h3 class="titolo-piccolo" style="margin-top:18px">Altre storie</h3><ul class="fatti">${coll.map((s) => `<li><a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a></li>`).join("")}</ul>` : ""}
        </aside>
      </article>
      <nav class="prec-succ" aria-label="Storie vicine"><span>${prec ? `<a href="storia.html?id=${prec.id}">← ${G.esc(prec.titolo.slice(0, 70))}</a>` : ""}</span><span>${succ ? `<a href="storia.html?id=${succ.id}">${G.esc(succ.titolo.slice(0, 70))} →</a>` : ""}</span></nav>`;
    G.nelRacconto("#nel-racconto", "storie", St.id);
    const box = d3.select("#grafici");
    St.grafici.forEach((g, i) => {
      const d = box.append("div").attr("class", "sezione sottile").style("max-width", "920px");
      if (!g.dati) {
        d.html(`<h3 class="fig-tit">${g.titolo}</h3><p class="fig-sotto">${g.sotto}</p><p class="segnaposto"><b>Grafico in preparazione.</b> I dati di questo grafico non sono ancora pronti per il sito.</p>`);
        return;
      }
      if (g.dati.forma === "tabella") {
        const T = g.dati;
        const ar = G.figura(d, { titolo: g.titolo, sotto: g.sotto, limite: [g.limite, T.nota].filter(Boolean).join(" "), csv: () => [T.colonne].concat(T.righe), nomeCSV: St.id + "_" + (i + 1) });
        ar.html(`<table class="fitta tabellina"><thead><tr>${T.colonne.map((c, j) => `<th${j ? ' class="n"' : ""}>${G.esc(c)}</th>`).join("")}</tr></thead><tbody>${T.righe.map((r) => `<tr>${r.map((v, j) => `<td${j && typeof v === "number" ? ' class="n"' : ""}>${typeof v === "number" ? fmt(v) : G.esc(v == null ? "" : v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
        return;
      }
      const area = G.figura(d, { titolo: g.titolo, sotto: g.sotto, limite: g.limite, lettura: g.dati.forma === "linee", csv: () => csv(g.dati), nomeCSV: St.id + "_" + (i + 1) });
      G.grafico(area, (a, w) => disegna(a, w, g.dati));
    });
  }

  function csv(D) {
    if (D.serie[0].punti) return [["serie", "x", "valore"]].concat([].concat(...D.serie.map((s) => s.punti.map((p) => [s.nome, p[0], p[1]]))));
    return [["voce"].concat(D.serie.map((s) => s.nome)).concat(D.lo ? ["basso", "alto"] : [])].concat(D.x.map((x, i) => [x].concat(D.serie.map((s) => s.v[i])).concat(D.lo ? [D.lo[i], D.hi ? D.hi[i] : ""] : [])));
  }
  const fmt = (v) => (v == null ? "–" : Number.isInteger(v) || Math.abs(v) >= 100 ? G.num(v) : Math.abs(v) >= 10 ? G.num(v, 1) : G.num(v, 2));
  let ETMESI = false;
  const etX = (x) => (typeof x === "number" ? String(Math.round(x)) : /^\d{4}-(0[1-9]|1[0-2])$/.test(String(x)) && ETMESI ? G.MESI[+String(x).slice(5) - 1] + " " + String(x).slice(0, 4) : String(x));

  function disegna(a, w, D) {
    const col = (i) => (i === 0 ? G.ROSSO : i === 1 ? G.NERO : G.SERIE[i] || G.GDATI);
    if (D.forma === "linee" || D.forma === "multipli") {
      const tutti = [].concat(...D.serie.map((s) => s.punti));
      const xe = d3.extent(tutti, (p) => p[0]), ye = d3.extent(tutti.filter((p) => p[1] != null), (p) => p[1]);
      const y0 = D.y0 != null ? D.y0 : Math.min(0, ye[0]), y1 = D.y0 != null ? ye[1] + (ye[1] - D.y0) * 0.1 : ye[1] * 1.1 || 1;
      if (D.forma === "multipli" && D.serie.length > 1) {
        const g = a.append("div").attr("class", "multipli");
        D.serie.forEach((s) => {
          const m = g.append("div").attr("class", "mul");
          m.append("h4").text(s.nome);
          const ar = m.append("div");
          const ww = Math.max(120, Math.floor(w / Math.min(5, D.serie.length)) - 30);
          G.linee(ar, ww, { x: xe, y: [y0, d3.max(s.punti, (p) => p[1] || 0) * 1.1 || 1], h: 140, m: { r: 8 }, serie: [{ punti: s.punti, colore: G.NERO, sp: 1.5 }], yFmt: fmt, xPasso: Math.max(10, Math.round((xe[1] - xe[0]) / 30) * 10) });
        });
        return;
      }
      const ss = D.serie.map((s, i) => {
        const pk = s.punti.reduce((b, p) => (p[1] != null && (b == null || p[1] > b[1]) ? p : b), null);
        return { punti: s.punti, colore: col(i), sp: i === 0 ? 2.5 : 1.5, etich: D.serie.length > 1 ? s.nome : null, piccoEtich: i === 0 && pk ? { x: pk[0], y: pk[1], testo: (D.serie.length > 1 ? s.nome + " " : "") + Math.round(pk[0]) + ": " + fmt(pk[1]) } : null };
      });
      G.linee(a, w, { x: xe, y: [y0, y1], serie: ss, yFmt: fmt, m: { r: D.serie.length > 1 ? 110 : 20 }, lettura: (x) => {
        return "<b>" + x + "</b>: " + D.serie.map((s, i) => { const p = s.punti.find((q) => Math.round(q[0]) === x); return `<span style="color:${col(i)};font-weight:700">${G.esc(s.nome)}</span> ${p ? fmt(p[1]) : "–"}`; }).join(" · ");
      } });
      return;
    }
    if (D.forma === "colonne") {
      const s = D.serie[0];
      const pts = s.punti ? s.punti : D.x.map((x, i) => [x, s.v[i]]);
      ETMESI = D.xtipo === "mese" || (pts.length > 13 && pts.every((q) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q[0]))));
      const mese = (q) => ETMESI && /^\d{4}-\d{2}$/.test(String(q));
      const h = w < 560 ? 220 : 280, m = { t: 24, r: 6, b: 24, l: 0 };
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "colonne");
      const x = d3.scaleBand().domain(pts.map((p) => p[0])).range([m.l, w - m.r]).paddingInner(0.18);
      const mx = d3.max(pts, (p) => p[1] || 0) || 1;
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(pts, (p) => p[1] || 0)), mx * 1.1]).range([h - m.b, m.t]);
      const g = svg.append("g").attr("class", "asse");
      y.ticks(4).forEach((v) => { g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null); g.append("text").attr("x", 0).attr("y", y(v) - 4).text(fmt(v)); });
      const imax = pts.reduce((b, p, i) => ((p[1] || 0) > (pts[b][1] || 0) ? i : b), 0);
      const passo = Math.ceil(pts.length / Math.max(4, Math.floor(w / 60)));
      pts.forEach((p, i) => {
        if (p[1] != null) svg.append("rect").attr("x", x(p[0])).attr("width", x.bandwidth()).attr("y", Math.min(y(0), y(p[1]))).attr("height", Math.abs(y(0) - y(p[1]))).attr("fill", i === imax ? G.ROSSO : G.NERO);
        if ((mese(p[0]) && /-01$/.test(String(p[0]))) || (!mese(p[0]) && i % passo === 0)) g.append("text").attr("x", x(p[0]) + x.bandwidth() / 2).attr("y", h - 6).attr("text-anchor", "middle").text(mese(p[0]) ? String(p[0]).slice(0, 4) : etX(p[0]));
      });
      const p = pts[imax];
      svg.append("text").attr("class", "etich").attr("x", x(p[0]) + x.bandwidth() / 2).attr("y", y(p[1]) - 6).attr("text-anchor", x(p[0]) > w - 80 ? "end" : x(p[0]) < (etX(p[0]) + ": " + fmt(p[1])).length * 3.6 + 4 ? "start" : "middle").attr("fill", G.ROSSO).text(etX(p[0]) + ": " + fmt(p[1]));
      return;
    }
    if (D.forma === "intervalli") {
      const v = D.serie[0].v;
      const vals = v.concat(D.lo || [], D.hi || []).filter((x) => x != null);
      const ext = d3.extent(vals.concat([0]));
      const rh = 24, lw = Math.min(260, w * 0.42), h = D.x.length * rh + 30;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "punti con intervallo");
      const x = d3.scaleLinear().domain([ext[0] - (ext[1] - ext[0]) * 0.05, ext[1] + (ext[1] - ext[0]) * 0.12]).range([lw, w - 10]);
      const g = svg.append("g").attr("class", "asse");
      x.ticks(5).forEach((t) => { g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", h - 20).attr("class", t === 0 ? "zero" : null); g.append("text").attr("x", x(t)).attr("y", h - 4).attr("text-anchor", "middle").text(fmt(t)); });
      const imax = v.reduce((b, q, i) => (Math.abs(q || 0) > Math.abs(v[b] || 0) ? i : b), 0);
      D.x.forEach((lab, i) => {
        const yy = i * rh + 14;
        svg.append("text").attr("x", lw - 8).attr("y", yy + 4).attr("text-anchor", "end").attr("font-size", 13).text(String(lab).slice(0, 40));
        if (D.lo && D.lo[i] != null && D.hi && D.hi[i] != null) svg.append("line").attr("x1", x(D.lo[i])).attr("x2", x(D.hi[i])).attr("y1", yy).attr("y2", yy).attr("stroke", G.GDATI).attr("stroke-width", 3);
        if (v[i] != null) {
          svg.append("circle").attr("cx", x(v[i])).attr("cy", yy).attr("r", 4.5).attr("fill", i === imax ? G.ROSSO : G.NERO);
          svg.append("text").attr("class", "etich").attr("x", x(Math.max(v[i], D.hi && D.hi[i] != null ? D.hi[i] : v[i])) + 7).attr("y", yy + 4).attr("fill", i === imax ? G.ROSSO : G.NERO).text(fmt(v[i]));
        }
      });
      return;
    }
    // barre e categorie
    const s = D.serie[0];
    const righe = D.x.map((x, i) => [G.esc(String(x)), s.v[i] || 0]).filter((r) => r[1] != null);
    const ord = righe.slice().sort((p, q) => q[1] - p[1]);
    ord.forEach((r, i) => { r[2] = i === 0; });
    a.html(G.barre(ord, { fmt }));
  }
})();
