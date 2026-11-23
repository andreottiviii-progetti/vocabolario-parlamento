/* Home: la pagina del vocabolario illustrato.
   Frontespizio con la definizione, tavola I (parole a confronto, a scelta), la riga dei sette capitoli,
   tavola II (amici e nemici), i tagli (partiti, risate, smentite), le parole, il listino della parola dell'anno,
   temi e percorsi, i rimandi alle storie. Tutti i numeri vengono da dati/. */
(function () {
  "use strict";
  const PREDEF = ["patria", "europa", "crisi"];
  const PRONTI = [["guerra", "pace"], ["compagni", "camerati", "popolo"], ["divorzio", "aborto", "droga"], ["mafia", "terrorismo", "emergenza"], ["tangentopoli", "spread", "casta"]];
  const $ = (id) => document.getElementById(id);
  const minuscola = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const SERIE = ["#1B3FA8", "#D2281F", "#0B8F52", "#7B3FE4", "#B84A00"];

  G.avvia(function () {
    G.testata({ compatta: false });
    G.piede();
    G.suggerisci($("q"), $("sugg-home"));
    return Promise.all([G.carica("home.json"), G.carica("base.json"), G.carica("capitoli/indice.json"), G.carica("storie/indice.json"), V.datiCapitoli(), G.carica("sezioni/risate.json"), G.carica("sezioni/insulti.json").catch(() => null), G.carica("percorsi/indice.json").catch(() => ({ percorsi: [] }))])
      .then(([H, B, IX, SI, D, R, I, PI]) => {
        const c = B.conti;
        const pronto = asse(H);
        brevi(H);
        sette(IX, D);
        amici(H, SI, D);
        tagli(H, SI, R, I);
        parole(H);
        listino(B);
        temiPercorsi(H, B, SI, D, R, PI);
        storie(SI, c, H);
        $("riga-steno").textContent = minuscola(IX.riga) + ".";
        $("chiusa-frasi").innerHTML = `<i class="es">«${G.esc(IX.prologo)}»</i> <span class="anni">la prima riga del primo resoconto, 8 maggio 1848</span> · <i class="es">«${G.esc(IX.chiusa)}»</i> <span class="anni">la frase che chiude il racconto, 20 luglio 2022</span>`;
        return pronto;
      });
  });

  /* ---------------- tavola I: parole a confronto, scelte dal lettore ---------------- */
  function asse(H) {
    const el = $("asse");
    const da = G.param("p");
    let attive = (da ? da.split(",").map(G.norma).filter(Boolean) : PREDEF).slice(0, 5);
    const curve = {};
    el.insertAdjacentHTML("beforeend", `<div class="confronto-riga"><label for="asse-in" class="nascosto">Parole da confrontare</label><input id="asse-in" type="search" placeholder="altre parole, separate da una virgola" autocomplete="off"><button class="bottone" id="asse-ok" type="button">Confronta</button><span id="asse-gettoni"></span>
      <span class="pronti">oppure: ${PRONTI.map((p) => `<a href="?p=${p.join(",")}" data-p="${p.join(",")}">${p.join(", ")}</a>`).join("")}</span><span class="avviso" id="asse-avviso" role="status"></span></div>
      <div id="asse-fig"></div>`);
    const fig = G.figura("#asse-fig", {
      titolo: null, lettura: true,
      fonte: "Volte ogni milione di parole, media di Camera e Senato e di tre anni. Tratteggio: anni in cui cambia la trascrizione.",
      limite: "Gli anni con meno di 300.000 parole in un ramo non sono disegnati: nel 1934-40 lo sono quasi tutti, nel 1941-45 non ci sono sedute.",
      csv: () => [["anno"].concat(attive)].concat(G.ANNI.map((a, i) => [a].concat(attive.map((w) => (curve[w] && curve[w].pm.m[i] != null ? curve[w].pm.m[i].toFixed(2) : ""))))), nomeCSV: "confronto_parole",
    });
    function carica() {
      const avv = [];
      return Promise.all(attive.map((w) => (curve[w] ? curve[w] : G.curvaParola(w).then((c) => { if (c) curve[w] = c; else avv.push(w); return c; })))).then(() => {
        attive = attive.filter((w) => curve[w]);
        $("asse-avviso").textContent = avv.length ? avv.map((w) => "«" + w + "»").join(", ") + (avv.length > 1 ? " non hanno" : " non ha") + " la curva: servono almeno 1.000 volte in aula." : "";
        disegna();
      });
    }
    function disegna() {
      const serie = attive.map((w, i) => ({ w, c: curve[w], col: SERIE[i], m3: G.media3(curve[w].pm.m), vero: G.picco(curve[w].pm.m) }));
      if (serie.length) {
        const a = serie[0];
        const nome = (s, maiusc) => `<a href="parola.html?p=${s.w}" style="color:${s.col}">${G.esc(maiusc ? G.maiusc(s.c.forma) : s.c.forma)}</a>`;
        let t = `${nome(a, true)} tocca il massimo nel ${a.vero.anno}`, dal = null;
        if (serie.length > 1) {
          const b = serie[1];
          let ultimo = null;
          G.ANNI.forEach((y, i) => { const p = a.c.pm.m[i], q = b.c.pm.m[i]; if (p != null && q != null && q < p) ultimo = y; });
          if (ultimo != null && ultimo >= 1946 && ultimo < 2015) dal = ultimo + 1;
          if (dal) t += `. Dal ${dal} ${nome(b, true)} non le sta più dietro`;
          const resto = serie.slice(dal ? 2 : 1);
          if (resto.length) t += (dal ? "; " : ", ") + resto.map((s) => `${nome(s)} ha la punta nel ${s.vero.anno}`).join(", ");
        }
        $("asse-tit").innerHTML = t;
      }
      $("asse-gettoni").innerHTML = serie.length > 1 ? "togli: " + serie.map((s) => `<button class="togli" type="button" style="color:${s.col}" data-w="${s.w}" aria-label="Togli ${G.esc(s.c.forma)} dal confronto">${G.esc(s.c.forma)} ×</button>`).join(" ") : "";
      document.querySelectorAll("#asse-gettoni .togli").forEach((b) => b.addEventListener("click", () => { attive = attive.filter((w) => w !== b.dataset.w); aggiornaURL(); disegna(); }));
      // le parole del confronto come voci, nella colonna accanto
      $("tre").innerHTML = serie.map((s) => `<p class="voce"><a class="lemma" href="parola.html?p=${s.w}" style="color:${s.col}">${G.esc(s.c.forma)}</a> <span class="anni">[${s.c.y0}-2022]</span>${s.c.y0 >= 1990 ? ' <i class="gram">neol.</i>' : ""} Detta ${G.num(s.c.tot)} volte. Anno di punta il <a class="lk" href="anno.html?a=${s.vero.anno}">${s.vero.anno}</a>, con ${G.num1(s.vero.val)} volte ogni milione di parole.</p>`).join("");
      fig.datum(serie);
      G.ridisegna("#asse-fig .fig-area");
    }
    G.grafico(fig, (area, w) => {
      const serie = area.datum() || [];
      const stretto = w < 560;
      const max = d3.max(serie, (s) => d3.max(s.m3, (v) => v || 0)) || 1;
      const hEp = 36, hEv = stretto ? 0 : 34, Hc = stretto ? 220 : 236, HH = hEp + hEv + Hc;
      const m = { t: hEp + hEv + 8, r: stretto ? 12 : 84, b: 22, l: 0 };
      const svg = area.append("svg").attr("width", w).attr("height", HH).attr("role", "img").attr("aria-label", "Parole a confronto, 1848-2022: " + serie.map((s) => s.c.forma).join(", "));
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, max * 1.08]).range([HH - m.b, m.t]);
      G.bandaEpoche(svg, x, 0, 20, stretto);
      d3.range(1850, 2021, 10).forEach((a) => {
        svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", 20).attr("y2", a % 50 === 0 ? 26 : 23).attr("stroke", G.GRIGIO);
        if (a % (stretto ? 50 : 20) === 0) svg.append("text").attr("x", x(a)).attr("y", 34).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(a);
      });
      if (!stretto) {
        const ev = H.eventi.filter((e) => e[2] === 1).map((e) => ({ a: +e[0].slice(0, 4) + (+e[0].slice(5, 7) - 1) / 12, t: e[1] }));
        const fine = [];
        ev.forEach((e) => {
          const xx = x(e.a), lw = e.t.length * 6;
          let r = 0; while (r < 2 && fine[r] != null && fine[r] > xx - 6) r++;
          if (r > 1) return;
          fine[r] = xx + lw;
          const yy = hEp + 11 + r * 14;
          svg.append("line").attr("x1", xx).attr("x2", xx).attr("y1", yy + 3).attr("y2", HH - m.b).attr("stroke", G.RIGA);
          svg.append("text").attr("x", xx + 3).attr("y", yy).attr("font-size", 12).attr("fill", G.GRIGIO).text(e.t);
        });
      }
      const gy = svg.append("g").attr("class", "asse");
      const tk = y.ticks(4);
      tk.forEach((v, i) => {
        gy.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null);
        gy.append("text").attr("x", m.l).attr("y", y(v) - 4).text(G.num(v) + (i === tk.length - 1 ? " volte per milione di parole" : ""));
      });
      d3.range(1860, 2021, stretto ? 50 : 20).forEach((a) => gy.append("text").attr("x", x(a)).attr("y", HH - m.b + 16).attr("text-anchor", "middle").text(a));
      G.lineeTrascrizione(svg, x, m.t, HH - m.b, "entrambi", false);
      const linea = d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]));
      const fine = [];
      serie.forEach((s, k) => {
        svg.append("path").attr("d", linea(G.ANNI.map((a, i) => [a, s.m3[i]]))).attr("fill", "none").attr("stroke", s.col).attr("stroke-width", k === 0 ? 2.4 : 1.9).attr("stroke-linejoin", "round");
        const pk = G.picco(s.m3);
        svg.append("circle").attr("cx", x(pk.anno)).attr("cy", y(pk.val)).attr("r", 3.4).attr("fill", s.col);
        if (!stretto) {
          const px = x(pk.anno);
          svg.append("text").attr("class", "etich").attr("x", px).attr("y", y(pk.val) - 7).attr("text-anchor", px > w - m.r - 60 ? "end" : "middle").attr("fill", s.col).text(s.c.forma + " " + s.vero.anno + ": " + G.num1(s.vero.val));
        }
        const ult = G.ANNI.map((a, i) => [a, s.m3[i]]).filter((d) => d[1] != null).slice(-1)[0];
        if (ult && !stretto) fine.push({ y: y(ult[1]), x: x(ult[0]), s });
      });
      G.separa(fine, 15, m.t, HH - m.b);
      fine.forEach((f) => svg.append("text").attr("class", "etich").attr("x", f.x + 6).attr("y", f.y + 4).attr("fill", f.s.col).text(f.s.c.forma));
      const riga = area.node().parentNode.querySelector(".fig-lettura");
      const v = svg.append("line").attr("y1", m.t).attr("y2", HH - m.b).attr("stroke", G.GRIGIO).style("display", "none");
      svg.append("rect").attr("x", 0).attr("y", m.t).attr("width", w - m.r).attr("height", HH - m.t - m.b).attr("fill", "transparent")
        .on("pointermove", (e) => {
          const a = Math.max(1848, Math.min(2022, Math.round(x.invert(d3.pointer(e)[0])))), i = a - 1848;
          v.attr("x1", x(a)).attr("x2", x(a)).style("display", null);
          riga.innerHTML = "<b>" + a + "</b>: " + serie.map((s) => `<span style="color:${s.col};font-weight:700">${G.esc(s.c.forma)}</span> ${s.c.pm.m[i] == null ? "nessun dato" : G.num1(s.c.pm.m[i])}`).join(" · ") + " volte per milione";
        }).on("pointerleave", () => v.style("display", "none"));
      if (riga && !riga.innerHTML) riga.innerHTML = stretto ? serie.map((s) => `<span style="color:${s.col};font-weight:700">${G.esc(s.c.forma)} ${s.vero.anno}: ${G.num1(s.vero.val)}</span>`).join(" · ") : '<span class="grigio">Passa sul grafico per leggere i valori di un anno.</span>';
    });
    function aggiornaURL() { try { history.replaceState(null, "", attive.length ? "?p=" + attive.join(",") : location.pathname); } catch (e) { /* niente */ } }
    function leggi(t) {
      const nuove = t.split(/[,;]+/).map(G.norma).filter(Boolean);
      if (!nuove.length) return;
      attive = nuove.slice(0, 5); aggiornaURL(); carica();
    }
    $("asse-in").addEventListener("keydown", (e) => { if (e.key === "Enter") leggi(e.target.value); });
    $("asse-ok").addEventListener("click", () => leggi($("asse-in").value));
    el.querySelectorAll(".pronti a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); $("asse-in").value = a.dataset.p.replace(/,/g, ", "); leggi(a.dataset.p); }));
    return carica();
  }

  function brevi(H) {
    $("brevi").innerHTML = H.breve.slice(0, 4).map((b) => `<li>${b}</li>`).join("");
  }

  /* ---------------- i sette capitoli in una riga: titolo che spiega, parola guida, figura vera ---------------- */
  function sette(IX, D) {
    $("riga-racconto").textContent = "ogni capitolo ha la sua parola guida e la sua figura";
    $("sette").innerHTML = IX.capitoli.map((k) => {
      const a0 = k.anni[0], a1 = k.anni[k.anni.length - 1];
      return `<article class="cap"><p class="guida-cap"><i>${G.esc(minuscola(k.simbolo))}</i> · <i class="gram">cap.</i> ${k.n} · ${a0}-${a1}</p>
        <h3><a href="capitolo.html?n=${k.n}">${G.esc(k.titolo)}</a></h3>
        <div class="fig" id="cg${k.n}"></div><p class="did">${V.CAPITOLI_NOTE[k.n]}</p>
        <p class="som">${G.esc(k.sommario)}</p></article>`;
    }).join("");
    IX.capitoli.forEach((k) => V.graficoCapitolo("#cg" + k.n, +k.n, D, { h: 74, wl: 0, hp: 11, paesi: ["Austria", "Germania"] }));
  }

  /* ---------------- tavola II: amici e nemici, con guerra, pace e missione accanto ---------------- */
  function amici(H, SI, D) {
    const am = SI.storie.find((s) => s.id === "amici-e-nemici");
    if (am) $("am-titolo").textContent = am.titolo;
    $("leg").innerHTML = V.legendaStrisce();
    V.strisce("#g-strisce", D.X, { hp: 19, hf: 6, vuoto: 8, wl: 112, fsNome: 15, pesoNome: 800, sotto: false, note: [V.NOTE_STRISCE[2], V.NOTE_STRISCE[5]] });
    const gu = SI.storie.find((s) => s.id === "missione-o-guerra") || { id: "missione-o-guerra", titolo: "Missione o guerra" };
    $("guerra-pace").innerHTML = ["guerra", "pace", "missione"].map((p, i) => `<div class="voce"><p class="testa"><a class="lemma" href="parola.html?p=${p}">${p}</a> <span class="anni">punta nel ${V.annoDiPunta(H, p)}</span></p><div class="fig" id="gp${i}"></div></div>`).join("") +
      `<div class="voce"><p><b><a href="storia.html?id=${gu.id}">${G.esc(gu.titolo)}</a></b></p><div class="fig" id="g-manubri"></div><p class="did">Quanto si dice «guerra» invece di «missione», ogni cento volte. Cerchio vuoto: chi governa. Pieno: chi sta all'opposizione.</p></div>`;
    ["guerra", "pace", "missione"].forEach((p, i) => V.mini("#gp" + i, V.curvaParola(H, p), { h: 40, assi: [1848, 2022], mt: 6, sp: 1.3, punti: [{ x: V.annoDiPunta(H, p), testo: "" }], fmt: (v) => V.num(v, 0) + " per milione" }));
    V.manubri("#g-manubri", H.h68.map((r) => [r[0], r[2], r[4]]), { wl: 86, passo: 17, fmt: (v) => v });
  }

  /* ---------------- i tagli: partiti, risate e insulti, smentite ---------------- */
  function tagli(H, SI, R, I) {
    const mp = SI.storie.find((s) => s.id === "mappa-partiti-governo-opposizione");
    if (mp) $("pa-titolo").textContent = mp.titolo;
    V.scie("#g-scie", H.mappa_linee, { h: 285 });
    const ri = SI.storie.find((s) => s.id === "risate-in-aula");
    if (ri) { $("ri-titolo").textContent = ri.titolo; $("ri-titolo").href = "storia.html?id=" + ri.id; }
    V.barre("#g-risate", R.periodi.map((p, i) => [p[0], p[1], i === R.periodi.length - 1 || i === 0]), { wl: 74, passo: 17, fmt: (v) => V.num(v, v < 10 ? 1 : 0) });
    const top = (R.top || []).slice(0, 4).map((o) => `${o.pid ? `<a href="persona.html?id=${encodeURIComponent(o.pid)}">${G.esc(o.nome)}</a>` : G.esc(o.nome)} <span class="anni">${o.ila}</span>`).join(" · ");
    const ins = I && I.parole ? I.parole.slice(0, 9).map((p) => `<a href="parola.html?p=${encodeURIComponent(G.norma(p[0]))}">${G.esc(p[0])}</a>`).join(", ") : "";
    $("lingue-home").innerHTML = `<p class="voce"><b>Chi fa ridere di più:</b> ${top}. <span class="did">Risate annotate dopo un suo intervento.</span></p>` +
      (ins ? `<p class="voce"><b>Gli insulti più detti:</b> ${ins}. <a href="risate.html">→ risate e insulti</a></p>` : "") +
      `<p class="voce"><b>Le lingue:</b> il francese del Parlamento subalpino, il latino, l'inglese, le forme antiche. <a href="lingue.html">→ le lingue dell'aula</a></p>`;
    $("smentite").innerHTML = (H.smentite_txt || []).slice(0, 5).map((s) => `<li><span class="sm" aria-hidden="true">■</span> <a href="storia.html?id=${s.storia}">${G.esc(s.testo)}</a></li>`).join("");
    const tot = H.esperimenti.conti.find((r) => r[0] === "Totale");
    $("n-esp").textContent = tot ? tot[7] : "";
    V.verdetti("#g-verdetti", H.esperimenti.conti, { wl: 132, passo: 13, q: 6 });
  }

  /* ---------------- le parole ---------------- */
  function parole(H) {
    const pp = H.multipli.filter((p) => H.curve[p]).sort((p, q) => V.annoDiPunta(H, p) - V.annoDiPunta(H, q));
    $("venti").innerHTML = pp.map((p, i) => `<a class="riga-voce" href="parola.html?p=${p}"><span class="lemma">${G.esc(H.curve[p].forma || p)}</span> <span class="anni">[${V.annoDiPunta(H, p)}]</span><span class="fig" id="v${i}"></span></a>`).join("");
    pp.forEach((p, i) => V.mini("#v" + i, V.curvaParola(H, p), { h: 28, assi: false, mt: 5, sp: 1.2, punti: [{ x: V.annoDiPunta(H, p), testo: "" }], fmt: (v) => V.num(v, v < 10 ? 1 : 0) + " per milione" }));
    const tre = (q, k) => [1, 2, 3].map((j) => (j === k ? `<b>${G.num1(q[j])}</b>` : G.num1(q[j]))).join(" · ");
    const testa = `<p class="did">Volte per milione nel 1848-1900 · 1901-89 · 1990-2022</p>`;
    $("nate").innerHTML = testa + H.nate.slice(0, 12).map((q) => `<p><a class="lemma piccolo" href="parola.html?p=${encodeURIComponent(q[0])}">${G.esc(q[4] || q[0])}</a> <i class="gram">neol.</i> <span class="cifre">${tre(q, 3)}</span></p>`).join("");
    $("morte").innerHTML = testa + H.morte.slice(0, 12).map((q) => `<p><a class="lemma piccolo" href="parola.html?p=${encodeURIComponent(q[0])}">† ${G.esc(q[4] || q[0])}</a> <span class="cifre">${tre(q, 1)}</span></p>`).join("");
  }

  /* ---------------- il listino della parola dell'anno ---------------- */
  function listino(B) {
    const anni = Object.keys(B.parole_anno).map(Number).sort((a, b) => a - b);
    $("listino").innerHTML = anni.map((a) => { const w = (B.parole_anno[a] || []).find((x) => x[0].length >= 5) || (B.parole_anno[a] || [])[0]; return w ? `<a href="anno.html?a=${a}"${a % 10 === 0 ? ' class="dieci"' : ""}><span>${a}</span> ${G.esc(w[3] || w[0])}</a>` : ""; }).join("");
  }

  /* ---------------- temi, percorsi, la frase ---------------- */
  function temiPercorsi(H, B, SI, D, R, PI) {
    V.calore("#g-temi", H.temi.filter((t) => !t.proc), { n: 18, hr: 12, wl: 200 });
    const fr = SI.storie.find((s) => s.id === "repubblica-non-si-semplifica");
    if (fr) $("fr-titolo").textContent = fr.titolo;
    V.frasi("#g-frasi", B.archivi, { h: 120 });
    const cam = D.F.periodi.filter((p) => p.ramo === "camera"), d0 = cam[0], d1 = cam.find((p) => /regime/i.test(p.periodo)) || cam[cam.length - 1];
    const fc = D.L.francese.camera || {}, am = Object.keys(fc).reduce((a, b) => (fc[b] > fc[a] ? b : a), Object.keys(fc)[0]);
    const quattro = [["fascismo.html", "Il fascismo in aula", "1922-1943", `il dissenso annotato alla Camera scende da ${G.num(d0.dissenso_100, 0)} a ${G.num(d1.dissenso_100, 0)} ogni cento interventi`],
      ["esteri.html", "Amici e nemici dell'Italia", "1848-2022", `il tono dell'aula verso ${D.X.paesi.length} paesi, accanto alle alleanze e alle guerre`],
      ["lingue.html", "Le lingue dell'aula", "1848-2022", `nel ${am} il ${G.num(fc[am], 1)}% delle parole alla Camera è in francese`],
      ["risate.html", "Risate e insulti", "1848-2022", `da ${G.num(R.periodi[0][1], 0)} a ${G.num(R.periodi[R.periodi.length - 1][1], 1)} risate ogni mille interventi`]];
    const altri = (PI.percorsi || []).map((p) => [`percorso.html?id=${p.id}`, p.titolo, p.tappe + " tappe", p.domanda.replace(/<[^>]+>/g, "")]);
    $("percorsi-voci").innerHTML = quattro.concat(altri).map((p) => `<p><a class="lemma" href="${p[0]}">${G.esc(p[1])}</a> <span class="anni">[${p[2]}]</span> ${G.esc(G.maiusc(p[3]))}${/[.?!]$/.test(p[3]) ? "" : "."}</p>`).join("");
  }

  /* ---------------- vedi anche: le storie, le sezioni, chi parla di più ---------------- */
  function storie(SI, c, H) {
    $("n-storie").textContent = "le prime diciotto storie, in ordine di solidità e sorpresa";
    $("muro").innerHTML = G.tessere(SI.storie, 18);
    $("sezioni").innerHTML = [["parole.html", "Parole", c.parole], ["persone.html", "Persone", c.persone], ["partiti.html", "Partiti", c.partiti], ["legislature.html", "Legislature", c.legislature], ["anni.html", "Anni", G.ANNI.length], ["temi.html", "Temi", c.temi], ["storie.html", "Storie", c.storie], ["esperimenti.html", "Esperimenti", c.esperimenti]]
      .map((s) => `<li><a href="${s[0]}">${s[1]}</a><span>${G.num(s[2])}</span></li>`).join("");
    V.barre("#g-oratori", H.oratori.slice(0, 8).map((o) => [o[0].replace(/^(\S)\S+ /, "$1. "), o[2], !!o[3]]), { wl: 112, passo: 17, hb: 7 });
  }
})();
