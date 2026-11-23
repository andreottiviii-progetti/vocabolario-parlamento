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
    const verd = esp.length ? esp.map((e) => G.esito(e.esito)).filter((v, k, a) => a.indexOf(v) === k).join(" ") : G.esito(St.verdetto || "descrittiva");
    // la storia come voce: titolo, sommario, epoca; il testo a sinistra e le tavole accanto; i rimandi in fondo, in colonne
    el.innerHTML = `
      <h1 class="titolo-pagina lungo">${G.esc(St.titolo)}</h1>
      <p class="sommario">${G.esc(St.sottotitolo)}</p>
      <p class="piccolo grigio"><i>${G.esc(St.occhiello)}</i> · <i class="gram">verdetto</i> ${verd}</p>
      <div id="nel-racconto"></div>
      <article class="storia griglia">
        <div class="c6 colonna-testo">${St.testo}<div class="verdetto"><h2 class="rubrica">Verdetto e limiti</h2>${St.verdetto_testo}</div></div>
        <div class="c6 fil" id="grafici"></div>
      </article>
      <section class="sezione griglia rimandi-storia">
        <div class="c3"><h2 class="rubrica">Il verdetto</h2><ul class="fatti">${esp.length ? esp.map((e) => `<li>${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span></li>`).join("") : `<li>${G.esito(St.verdetto || "descrittiva")}<span class="et">lavoro descrittivo, senza ipotesi da verificare</span></li>`}</ul></div>
        <div class="c3 fil">${St.parole.length ? `<h2 class="rubrica">Parole</h2><p class="parole-nuvola">${St.parole.map(parola).join(" ")}</p>` : ""}
          ${St.legislature.length || anni.length ? `<h2 class="rubrica">Legislature e anni</h2><p class="parole-nuvola">${St.legislature.map(legLink).join(" ")} ${anni.map((a) => G.lAnno(a)).join(" ")}</p>` : ""}</div>
        <div class="c3 fil">${St.partiti.length || St.persone.length ? `<h2 class="rubrica">Partiti e persone</h2><p class="parole-nuvola">${St.partiti.map((p) => G.lPartito(p, p)).join(" ")} ${St.persone.map(persona).join(" ")}</p>` : ""}</div>
        <div class="c3 fil">${coll.length ? `<h2 class="rubrica">Vedi anche</h2>${coll.map(G.voceStoria).join("")}` : ""}</div>
      </section>
      <nav class="prec-succ" aria-label="Storie vicine"><span>${prec ? `<a href="storia.html?id=${prec.id}">◂ ${G.esc(prec.titolo)}</a>` : ""}</span><span>${succ ? `<a href="storia.html?id=${succ.id}">${G.esc(succ.titolo)} ▸</a>` : ""}</span></nav>`;
    G.guideVicine(prec ? ["storia.html?id=" + prec.id, prec.titolo] : ["storie.html", "tutte le storie"], succ ? ["storia.html?id=" + succ.id, succ.titolo] : ["storie.html", "tutte le storie"]);
    G.nelRacconto("#nel-racconto", "storie", St.id);
    const box = d3.select("#grafici");
    St.grafici.forEach((g, i) => {
      const d = box.append("div").attr("class", "tav-storia");
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
      const area = G.figura(d, { titolo: g.titolo, sotto: g.sotto, limite: g.limite, csv: () => csv(g.dati), nomeCSV: St.id + "_" + (i + 1) });
      G.grafico(area, (a, w) => disegna(a, w, g.dati, g.sotto || ""));
    });
  }

  function csv(D) {
    if (D.serie[0].punti) return [["serie", "x", "valore"]].concat([].concat(...D.serie.map((s) => s.punti.map((p) => [s.nome, p[0], p[1]]))));
    return [["voce"].concat(D.serie.map((s) => s.nome)).concat(D.lo ? ["basso", "alto"] : [])].concat(D.x.map((x, i) => [x].concat(D.serie.map((s) => s.v[i])).concat(D.lo ? [D.lo[i], D.hi ? D.hi[i] : ""] : [])));
  }
  const fmt = (v) => (v == null ? "–" : Number.isInteger(v) || Math.abs(v) >= 100 ? G.num(v) : Math.abs(v) >= 10 ? G.num(v, 1) : G.num(v, 2));
  let ETMESI = false;
  const etX = (x) => (typeof x === "number" ? String(Math.round(x)) : /^\d{4}-(0[1-9]|1[0-2])$/.test(String(x)) && ETMESI ? G.MESI[+String(x).slice(5) - 1] + " " + String(x).slice(0, 4) : String(x));

  /* Colori delle serie (revisione v7). Il colore segue la serie, non la sua posizione in classifica.
     - Se le serie sono partiti: i colori delle loro famiglie (gli altri partiti in grigio).
     - Se il sottotitolo dice i colori («Camera (nero) e Senato (grigio)», «punto rosso il Senato», «in rosso le riforme»),
       si seguono le sue parole: nero = grigio scuro, rosso = il rosso del sito, grigio = grigio medio.
     - Altrimenti: una serie sola in grigio scuro (il punto di punta in rosso); due serie, la tesi in rosso e l'altra in
       grigio scuro («in nero» nei testi delle storie); da tre a cinque, dopo questi due, verde, viola e arancio
       (tavolozza controllata con lo script su tutte le coppie). */
  const STORIA = () => [G.ROSSO, G.SCURO, G.SERIE[2], G.SERIE[3], G.SERIE[4]];
  function coloriDalTesto(sotto) {
    const out = [], t = String(sotto || "");
    let m;
    const r1 = /(?:punto|linea|in)\s+(nero|nera|rosso|rossa|grigio|grigia)\s+(?:la |il |le |i |gli |lo |l')?(?:(?:due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d+) )?([A-Za-zÀ-ú]+)/gi;
    while ((m = r1.exec(t))) out.push([m[2], m[1]]);
    const r2 = /([A-Za-zÀ-ú]+)\s*\((?:punto |linea )?(nero|nera|rosso|rossa|grigio|grigia)/gi;
    while ((m = r2.exec(t))) out.push([m[1], m[2]]);
    return out.map(([w, c]) => [w.toLowerCase(), /^ner/.test(c) ? G.SCURO : /^ros/.test(c) ? G.ROSSO : G.NERO]);
  }
  const combacia = (etichetta, w) => { const k = w.slice(0, Math.max(3, Math.min(5, w.length - 1))); return String(etichetta).toLowerCase().split(/[^a-zà-ú]+/).some((p) => p && p.startsWith(k)); };
  const coloreDi = (etichetta, regole) => { const r = regole.find((q) => combacia(etichetta, q[0])); return r ? r[1] : null; };
  function colori(serie, sotto) {
    const n = serie.length;
    const fam = serie.map((s) => { const f = G.famigliaDi(s.nome); return f ? G.FAMIGLIA[f] : null; });
    if (n > 1 && fam.some(Boolean) && new Set(fam.filter(Boolean)).size === fam.filter(Boolean).length) {
      const grigi = [G.SCURO, G.NERO, G.GDATI]; // i partiti senza famiglia: grigi diversi, mai un colore di un'altra famiglia
      return fam.map((c) => c || grigi.shift() || G.GDATI);
    }
    const dalTesto = n > 1 ? serie.map((s) => coloreDi(nome(s), coloriDalTesto(sotto))) : [null];
    const liberi = (n === 1 ? [G.SCURO] : STORIA()).filter((c) => dalTesto.indexOf(c) < 0);
    return dalTesto.map((c) => c || liberi.shift() || G.GDATI);
  }
  const conCifre = (xs) => xs.some((x) => /\d/.test(String(x))); // categorie con un ordine (anni, finestre di tempo): non si riordinano
  const nome = (s) => String(s.nome).replace(/_/g, " ");

  function disegna(a, w, D, sotto) {
    const C = colori(D.serie, sotto);
    // colori delle singole righe scritti nel sottotitolo (barre e punti con una serie sola)
    const regole = coloriDalTesto(sotto);
    const perRiga = D.x && D.serie.length === 1 && regole.length ? D.x.map((x) => coloreDi(x, regole)) : null;
    const righeColorate = perRiga && perRiga.some(Boolean) ? perRiga.map((c) => c || G.NERO) : null;
    if (D.forma === "linee" || D.forma === "multipli") {
      const tutti = [].concat(...D.serie.map((s) => s.punti));
      const xe = d3.extent(tutti, (p) => p[0]), ye = d3.extent(tutti.filter((p) => p[1] != null), (p) => p[1]);
      const y0 = D.y0 != null ? D.y0 : Math.min(0, ye[0]), y1 = D.y0 != null ? ye[1] + (ye[1] - D.y0) * 0.1 : ye[1] * 1.1 || 1;
      if (D.forma === "multipli" && D.serie.length > 1) {
        const g = a.append("div").attr("class", "multipli");
        D.serie.forEach((s) => {
          const m = g.append("div").attr("class", "mul");
          m.append("h4").text(nome(s));
          const ar = m.append("div");
          const ww = Math.max(120, Math.floor(w / Math.min(5, D.serie.length)) - 30);
          G.linee(ar, ww, { x: xe, y: [y0, d3.max(s.punti, (p) => p[1] || 0) * 1.1 || 1], h: 140, m: { r: 8 }, serie: [{ punti: s.punti, colore: G.SCURO, sp: 1.5, nome: nome(s) }], yFmt: fmt, xPasso: Math.max(10, Math.round((xe[1] - xe[0]) / 30) * 10) });
        });
        return;
      }
      // etichette dirette in fondo alle linee solo se i nomi sono brevi; altrimenti bastano la legenda e il riquadro
      const lungo = d3.max(D.serie, (s) => nome(s).length), dirette = D.serie.length > 1 && D.serie.length <= 4 && lungo <= 26;
      const ss = D.serie.map((s, i) => {
        const pk = s.punti.reduce((b, p) => (p[1] != null && (b == null || p[1] > b[1]) ? p : b), null);
        const uno = D.serie.length === 1;
        return { punti: s.punti, colore: C[i], sp: i === 0 ? 2.5 : 1.5, etich: dirette ? nome(s) : null, nome: nome(s),
          piccoEtich: i === 0 && pk ? { x: pk[0], y: pk[1], colore: uno ? G.ROSSO : C[i], testo: (uno || !dirette ? "" : nome(s) + " ") + Math.round(pk[0]) + ": " + fmt(pk[1]) } : null };
      });
      G.linee(a, w, { x: xe, y: [y0, y1], serie: ss, yFmt: fmt, xFmt: (v) => String(Math.round(v)), m: { r: dirette ? Math.max(48, lungo * 6.8 + 30) : 20 } });
      return;
    }
    if (D.forma === "colonne") {
      // una serie: colonne grigie, la più alta in rosso; due serie (Camera e Senato): colonne affiancate, con la legenda
      const due = D.serie.length === 2 && !D.serie[0].punti && !/^(True|False)$/.test(D.serie[1].nome);
      const s = D.serie[0];
      const pts = s.punti ? s.punti : D.x.map((x, i) => [x, s.v[i]]);
      const pts2 = due ? D.x.map((x, i) => [x, D.serie[1].v[i]]) : [];
      ETMESI = D.xtipo === "mese" || (pts.length > 13 && pts.every((q) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(q[0]))));
      const mese = (q) => ETMESI && /^\d{4}-\d{2}$/.test(String(q));
      if (due) a.append("div").html(G.legenda([{ c: G.SCURO, nome: nome(D.serie[0]), quadro: true }, { c: G.GDATI, nome: nome(D.serie[1]), quadro: true }]));
      // categorie con nomi lunghi (eventi, periodi): tutte le etichette, su due righe sfalsate, così non si sovrappongono
      const due_righe = !ETMESI && pts.length > 1 && !pts.every((q) => /^\d{4}/.test(String(q[0]))) && d3.max(pts, (q) => etX(q[0]).length) * 6.4 > (w - 6) / pts.length - 6;
      const h = (w < 560 ? 220 : 280) + (due_righe ? 14 : 0), m = { t: 24, r: 6, b: due_righe ? 38 : 24, l: 0 };
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "colonne");
      const x = d3.scaleBand().domain(pts.map((p) => p[0])).range([m.l, w - m.r]).paddingInner(due ? 0.28 : 0.18);
      const mx = d3.max(pts.concat(pts2), (p) => p[1] || 0) || 1;
      const y = d3.scaleLinear().domain([Math.min(0, d3.min(pts.concat(pts2), (p) => p[1] || 0)), mx * 1.1]).range([h - m.b, m.t]);
      const g = svg.append("g").attr("class", "asse");
      y.ticks(4).forEach((v) => g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null));
      const imax = pts.reduce((b, p, i) => ((p[1] || 0) > (pts[b][1] || 0) ? i : b), 0);
      const passo = Math.ceil(pts.length / Math.max(4, Math.floor(w / 60)));
      const bw = due ? Math.max(1, (x.bandwidth() - 2) / 2) : x.bandwidth();
      pts.forEach((p, i) => {
        const rett = (q, dx, col) => { if (q[1] != null) svg.append("rect").attr("x", x(p[0]) + dx).attr("width", bw).attr("y", Math.min(y(0), y(q[1]))).attr("height", Math.abs(y(0) - y(q[1]))).attr("fill", col); };
        rett(p, 0, due ? G.SCURO : i === imax ? G.ROSSO : G.NERO);
        if (due) rett(pts2[i], bw + 2, G.GDATI);
        if (due_righe) g.append("text").attr("x", i === 0 ? x(p[0]) : i === pts.length - 1 ? x(p[0]) + x.bandwidth() : x(p[0]) + x.bandwidth() / 2).attr("y", h - (i % 2 ? 6 : 20)).attr("text-anchor", i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle").text(etX(p[0]));
        else if ((mese(p[0]) && /-01$/.test(String(p[0]))) || (!mese(p[0]) && i % passo === 0)) g.append("text").attr("x", i === 0 ? x(p[0]) : x(p[0]) + x.bandwidth() / 2).attr("y", h - 6).attr("text-anchor", i === 0 ? "start" : "middle").text(mese(p[0]) ? String(p[0]).slice(0, 4) : etX(p[0]));
        const tip = due ? `${fmt(p[1])} ${nome(D.serie[0])} · ${fmt(pts2[i][1])} ${nome(D.serie[1])}\n${etX(p[0])}` : `${fmt(p[1])}\n${etX(p[0])}`;
        svg.append("rect").attr("x", x(p[0]) - (x.step() - x.bandwidth()) / 2).attr("width", x.step()).attr("y", m.t).attr("height", h - m.t - m.b).attr("fill", "transparent").attr("data-tip", tip);
      });
      const gt = svg.append("g").attr("class", "asse");
      y.ticks(4).forEach((v) => gt.append("text").attr("class", "alone").attr("x", 0).attr("y", y(v) - 4).text(fmt(v)));
      const p = pts[imax];
      svg.append("text").attr("class", "etich").attr("x", x(p[0]) + (due ? bw / 2 : x.bandwidth() / 2)).attr("y", y(p[1]) - 6).attr("text-anchor", x(p[0]) > w - 80 ? "end" : x(p[0]) < (etX(p[0]) + ": " + fmt(p[1])).length * 3.6 + 4 ? "start" : "middle").attr("fill", G.INK).text(etX(p[0]) + ": " + fmt(p[1]));
      return;
    }
    if (D.forma === "intervalli") {
      // un punto per riga con il suo margine di incertezza; il valore più lontano dallo zero in rosso
      const v = D.serie[0].v;
      const vals = v.concat(D.lo || [], D.hi || []).filter((x) => x != null);
      const ext = d3.extent(vals.concat([0]));
      const rh = 24, lw = Math.min(260, w * 0.42), h = D.x.length * rh + 30;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "punti con intervallo");
      const x = d3.scaleLinear().domain([ext[0] - (ext[1] - ext[0]) * 0.05, ext[1] + (ext[1] - ext[0]) * 0.12]).range([lw, w - 10]);
      const g = svg.append("g").attr("class", "asse");
      x.ticks(5).forEach((t) => { g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", h - 20).attr("class", t === 0 ? "zero" : null); g.append("text").attr("x", x(t)).attr("y", h - 4).attr("text-anchor", "middle").text(fmt(t)); });
      // in rosso il valore più lontano dallo zero, ma mai una riga di controllo (date finte, placebo): non è la tesi
      const controllo = (lab) => /controll|placebo|finta|finte|inventat/i.test(String(lab));
      const imax = v.reduce((b, q, i) => (!controllo(D.x[i]) && (b < 0 || Math.abs(q || 0) > Math.abs(v[b] || 0)) ? i : b), -1);
      D.x.forEach((lab, i) => {
        const yy = i * rh + 14, ci = D.lo && D.lo[i] != null && D.hi && D.hi[i] != null;
        svg.append("text").attr("x", lw - 8).attr("y", yy + 4).attr("text-anchor", "end").attr("font-size", 13).attr("fill", G.INK).text(String(lab).slice(0, 40));
        if (ci) svg.append("line").attr("x1", x(D.lo[i])).attr("x2", x(D.hi[i])).attr("y1", yy).attr("y2", yy).attr("stroke", G.GDATI).attr("stroke-width", 3);
        if (v[i] != null) {
          const forte = !righeColorate && i === imax;
          svg.append("circle").attr("cx", x(v[i])).attr("cy", yy).attr("r", 4.5).attr("fill", righeColorate ? righeColorate[i] : forte ? G.ROSSO : G.SCURO).attr("stroke", "#fff").attr("stroke-width", 1.5);
          svg.append("text").attr("class", "etich").attr("x", x(Math.max(v[i], ci ? D.hi[i] : v[i])) + 7).attr("y", yy + 4).attr("fill", G.INK).attr("font-weight", forte ? 700 : 400).text(fmt(v[i]));
        }
        svg.append("rect").attr("x", 0).attr("y", yy - rh / 2).attr("width", w).attr("height", rh).attr("fill", "transparent")
          .attr("data-tip", (v[i] == null ? "–" : fmt(v[i])) + (ci ? ` (tra ${fmt(D.lo[i])} e ${fmt(D.hi[i])})` : "") + "\n" + String(lab));
      });
      return;
    }
    // barre e categorie
    const s = D.serie[0];
    if (D.serie.length === 2 && /placebo/i.test(D.serie[1].nome)) {
      // la seconda serie è la posizione tra le date finte: un numero accanto alla barra, non un'altra barra
      const righe = D.x.map((x, i) => [G.esc(String(x)) + ` <span class="grigio">· più alto del ${G.num(D.serie[1].v[i], 0)}% delle date finte</span>`, s.v[i] || 0, false]);
      const ix = d3.maxIndex(righe, (r) => r[1]); righe[ix][2] = true;
      a.html(G.barre(righe, { fmt }));
      return;
    }
    if (D.serie.length === 2) {
      // due valori per riga (prima e dopo, chi cambia e chi resta): manubri, con la legenda; le righe restano nel loro ordine
      const s2 = D.serie[1], c1 = G.ROSSO, c2 = G.SCURO;
      a.append("div").html(`<p class="legenda"><span><span class="punto pieno" style="--k:${c1}"></span>${G.esc(nome(s))}</span><span><span class="punto vuoto" style="--k:${c2}"></span>${G.esc(nome(s2))}</span></p>`);
      const rh = 26, lw = Math.min(240, w * 0.4), h = D.x.length * rh + 26;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "due valori per riga");
      const vals = s.v.concat(s2.v).filter((q) => q != null);
      const ext = d3.extent(vals.concat([0])), pad = (ext[1] - ext[0]) * 0.1;
      const x = d3.scaleLinear().domain([ext[0] - (ext[0] < 0 ? pad : 0), ext[1] + pad]).range([lw, w - 40]);
      const g = svg.append("g").attr("class", "asse");
      x.ticks(5).forEach((t) => { g.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", 0).attr("y2", h - 18).attr("class", t === 0 ? "zero" : null); g.append("text").attr("x", x(t)).attr("y", h - 4).attr("text-anchor", "middle").text(fmt(t)); });
      D.x.forEach((lab, i) => {
        const yy = i * rh + 14, p = s.v[i], q = s2.v[i];
        svg.append("text").attr("x", lw - 8).attr("y", yy + 4).attr("text-anchor", "end").attr("font-size", 13).attr("fill", G.INK).text(String(lab).slice(0, 40));
        if (p != null && q != null) svg.append("line").attr("x1", x(p)).attr("x2", x(q)).attr("y1", yy).attr("y2", yy).attr("stroke", G.GDATI).attr("stroke-width", 2);
        if (q != null) svg.append("circle").attr("cx", x(q)).attr("cy", yy).attr("r", 4.5).attr("fill", "#fff").attr("stroke", c2).attr("stroke-width", 1.6);
        if (p != null) {
          svg.append("circle").attr("cx", x(p)).attr("cy", yy).attr("r", 4.5).attr("fill", c1).attr("stroke", "#fff").attr("stroke-width", 1.5);
          // il valore va dalla parte libera; se a sinistra finirebbe sui nomi delle righe, va a destra di tutti e due i punti
          let dx = q == null || p >= q ? 8 : -8, px = x(p);
          if (dx < 0 && px - 8 - fmt(p).length * 7 < lw) { dx = 8; px = x(Math.max(p, q)); }
          svg.append("text").attr("class", "etich").attr("x", px + dx).attr("y", yy + 4).attr("text-anchor", dx > 0 ? "start" : "end").attr("fill", G.INK).text(fmt(p));
        }
        svg.append("rect").attr("x", 0).attr("y", yy - rh / 2).attr("width", w).attr("height", rh).attr("fill", "transparent")
          .attr("data-tip", `${p == null ? "–" : fmt(p)} ${nome(s)} · ${q == null ? "–" : fmt(q)} ${nome(s2)}\n${lab}`);
      });
      return;
    }
    const righe = D.x.map((x, i) => [G.esc(String(x)), s.v[i] || 0, false, righeColorate ? righeColorate[i] : null]).filter((r) => r[1] != null);
    const ord = conCifre(D.x) ? righe.slice() : righe.slice().sort((p, q) => q[1] - p[1]);
    if (!righeColorate) { let im = -1; ord.forEach((r, i) => { if (!/controll|placebo|finta|finte|inventat/i.test(r[0]) && (im < 0 || r[1] > ord[im][1])) im = i; }); ord.forEach((r, i) => { r[2] = i === im; }); }
    a.html(G.barre(ord, { fmt }));
  }
})();
