/* Home: asse del tempo, apertura, piccoli multipli, partiti, anni, legislature, esperimenti, temi, elenchi */
(function () {
  "use strict";
  const PREDEF = ["patria", "europa", "crisi"];
  const PRONTI = [["guerra", "pace"], ["compagni", "camerati", "popolo"], ["divorzio", "aborto", "droga"], ["mafia", "terrorismo", "emergenza"], ["tangentopoli", "spread", "casta"]];

  G.avvia(function () {
    G.testata({ compatta: false });
    G.piede();
    return Promise.all([G.carica("home.json"), G.carica("base.json"), G.indiceParole()]).then(([H, B, IX]) => {
      testa(B);
      asse(H, B, IX);
      percorsi();
      esteriHome();
      G.carica("partiti/traiettorie.json").then((TR) => G.scie("g-scie-home", TR));
      G.carica("storie/indice.json").then((S) => { document.getElementById("muro").innerHTML = G.tessere(S.storie, 8); });
      const ap = apertura(H);
      multipli(H);
      partitiEGuerra(H);
      anni(H, B);
      legislature(H, B);
      esperimenti(H);
      temi(H);
      elenchi(H, B);
      return ap;
    });
  });

  /* ---------------- apertura: una frase vera, grande, e le parole degli anni che scorrono ---------------- */
  function testa(B) {
    const pa = Object.keys(B.parole_anno).map(Number).sort();
    const voci = pa.map((a) => { const w = (B.parole_anno[a] || []).find((x) => x[0].length >= 5); return w ? `<a href="anno.html?a=${a}">${a} <b>${G.esc(w[3] || w[0])}</b></a>` : ""; }).filter(Boolean);
    document.getElementById("scorre").innerHTML = voci.join("") + voci.join("");
    G.carica("capitoli/indice.json").then((IX) => {
      G.filoDelTempo("#filo-home", IX.capitoli, 0);
      document.getElementById("capitoli-home").innerHTML = IX.capitoli.map((c) => `<li><span class="n">${c.n}</span><div><h3><a href="capitolo.html?n=${c.n}">${G.esc(c.titolo)}</a> <small class="grigio">(${(c.anni || []).join("-")})</small></h3>${c.simbolo ? `<p class="chi">«${G.esc(c.simbolo)}»</p>` : ""}<p>${G.esc(c.sommario)} <a class="leggi" href="capitolo.html?n=${c.n}">Leggi il capitolo</a></p></div></li>`).join("");
      if (IX.chiusa) { document.getElementById("chiusa-frase").textContent = "«" + IX.chiusa + "»"; document.getElementById("chiusa-chi").innerHTML = 'Camera, 20 luglio 2022, l\'ultima legislatura dell\'archivio. <a class="lk" href="parole.html">Entra nell\'archivio</a>'; }
    });
  }
  function percorsi() {
    Promise.all([G.carica("sezioni/fascismo.json"), G.carica("sezioni/lingue.json"), G.carica("sezioni/risate.json"), G.carica("sezioni/esteri.json")])
      .then(([F, L, R, X]) => { document.getElementById("ingressi").innerHTML = G.ingressi(F, L, R, X); }).catch(() => {});
  }
  function esteriHome() {
    G.carica("sezioni/esteri.json").then((X) => {
      const PA = ["Austria", "Germania", "Russia/URSS", "Stati Uniti"];
      const media3 = (o, a) => { const v = []; for (let y = a - 1; y <= a + 1; y++) if (o[y] && o[y][0] != null) v.push(o[y][0]); return v.length ? d3.mean(v) : null; };
      document.getElementById("esteri-mini").innerHTML = PA.map((p, i) => `<div class="mul"><h4><a href="esteri.html">${G.esc(p)}</a></h4><div id="em${i}"></div></div>`).join("");
      PA.forEach((p, i) => G.grafico("#em" + i, (a, w) => {
        const o = X.indice[p] || {}, al = X.alleanze[p] || {};
        const h = 150, svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", p);
        const x = d3.scaleLinear().domain([1848, 2022]).range([0, w]), y = d3.scaleLinear().domain([-1, 1]).range([h - 18, 6]);
        Object.keys(al).forEach((k) => { const st = al[k][1]; if (st === "alleato" || st === "guerra") svg.append("rect").attr("x", x(+k)).attr("width", Math.max(1, x(+k + 1) - x(+k))).attr("y", 6).attr("height", h - 24).attr("fill", st === "alleato" ? "#8FD9DE" : "#F6A29F"); });
        svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", G.GRIGIO);
        const pts = G.ANNI.map((k) => [k, o[k] && (o[k][3] || 0) >= 30 ? media3(o, k) : null]);
        svg.append("path").attr("d", d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]))(pts)).attr("fill", "none").attr("stroke", G.INK).attr("stroke-width", 2);
        [1850, 1900, 1950, 2000].forEach((k) => svg.append("text").attr("x", x(k)).attr("y", h - 3).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(k));
        svg.append("text").attr("x", 2).attr("y", y(0.8)).attr("font-size", 12).attr("fill", G.GRIGIO).text("nemico");
      }));
    }).catch(() => {});
  }

  /* ---------------- 5. asse del tempo ---------------- */
  function asse(H, B, IX) {
    const el = document.getElementById("asse");
    const da = G.param("p");
    let attive = (da ? da.split(",").map(G.norma).filter(Boolean) : PREDEF).slice(0, 5);
    const curve = {};
    el.innerHTML = `<h2 class="titolo-asse" id="asse-tit"></h2>
      <div class="riga-parole"><input id="asse-in" type="search" placeholder="scrivi fino a cinque parole, separate da una virgola" aria-label="Parole da confrontare" autocomplete="off"><button class="bottone" id="asse-ok" type="button">Confronta</button><span id="asse-gettoni"></span></div>
      <p class="pronti">Altri confronti: ${PRONTI.map((p) => `<a href="?p=${p.join(",")}" data-p="${p.join(",")}">${p.join(", ")}</a>`).join("")}</p>
      <p class="avviso" id="asse-avviso"></p>
      <div id="asse-fig"></div><div class="fatti-parole" id="asse-fatti"></div>`;
    const fig = G.figura("#asse-fig", {
      titolo: null, lettura: true,
      sotto: "Volte per milione di parole, media dei due rami e media mobile di tre anni. Righe tratteggiate: anni in cui cambia la trascrizione alla Camera o al Senato.",
      limite: "Gli anni con meno di 300.000 parole in un ramo non sono disegnati: nel 1934-40 lo sono quasi tutti, nel 1941-45 non ci sono sedute. Nell'Ottocento lo scanner sbaglia più spesso.",
      csv: () => [["anno"].concat(attive)].concat(G.ANNI.map((a, i) => [a].concat(attive.map((w) => (curve[w] ? fmtCSV(curve[w].pm.m[i]) : ""))))), nomeCSV: "confronto_parole",
    });
    function fmtCSV(v) { return v == null ? "" : v.toFixed(2); }
    function carica() {
      const avv = [];
      return Promise.all(attive.map((w) => (curve[w] ? curve[w] : G.curvaParola(w).then((c) => { if (c) curve[w] = c; else avv.push(w); return c; })))).then(() => {
        attive = attive.filter((w) => curve[w]);
        document.getElementById("asse-avviso").textContent = avv.length ? avv.map((w) => "«" + w + "»").join(", ") + (avv.length > 1 ? " non sono" : " non è") + " tra le parole del sito: servono almeno 1.000 volte in aula. Controlla come è scritta, oppure prova una forma vicina." : "";
        disegna();
      });
    }
    function disegna() {
      const serie = attive.map((w, i) => ({ w, c: curve[w], col: G.SERIE[i], m3: G.media3(curve[w].pm.m), vero: G.picco(curve[w].pm.m) }));
      // titolo-notizia ricavato dai dati
      const tit = document.getElementById("asse-tit");
      if (serie.length) {
        const a = serie[0];
        const nomeA = `<a href="parola.html?p=${a.w}" style="color:${a.col}">«${G.esc(G.maiusc(a.c.forma))}»</a>`;
        let t = `${nomeA} tocca il massimo nel ${a.vero.anno}`;
        let dal = null;
        if (serie.length > 1) {
          const b = serie[1];
          let ultimo = null;
          G.ANNI.forEach((y, i) => { const p = a.c.pm.m[i], q = b.c.pm.m[i]; if (p != null && q != null && q < p) ultimo = y; });
          if (ultimo != null && ultimo >= 1946 && ultimo < 2015) dal = ultimo + 1;
          if (dal) t += `. Dal ${dal} <a href="parola.html?p=${b.w}" style="color:${b.col}">«${G.esc(G.maiusc(b.c.forma))}»</a> non le sta più dietro`;
          const resto = serie.slice(dal ? 2 : 1);
          if (resto.length) t += (dal ? "; " : ", ") + resto.map((s) => `<a href="parola.html?p=${s.w}" style="color:${s.col}">«${G.esc(s.c.forma)}»</a> ha la punta nel ${s.vero.anno}`).join(", ");
        }
        tit.innerHTML = t;
      }
      document.getElementById("asse-gettoni").innerHTML = serie.map((s) => `<button class="gettone" type="button" style="background:${s.col};color:${G.testoSu(s.col)}" data-w="${s.w}" aria-label="Togli ${G.esc(s.c.forma)}">${G.esc(s.c.forma)}<small>picco ${s.vero.anno}</small><span aria-hidden="true">×</span></button>`).join(" ");
      document.querySelectorAll("#asse-gettoni .gettone").forEach((b) => b.addEventListener("click", () => { attive = attive.filter((w) => w !== b.dataset.w); aggiornaURL(); disegna(); }));
      document.getElementById("asse-fatti").innerHTML = serie.map((s) => `<div><b style="color:${G.SCURO[String(s.col).toUpperCase()] || s.col}">${G.esc(s.c.forma)}</b>: ${G.num(s.c.tot)} volte. Anno di punta ${G.lAnno(s.vero.anno)} (${G.num1(s.vero.val)} per milione). Dal ${s.c.y0} in curva. <a class="lk" href="parola.html?p=${s.w}">La scheda</a></div>`).join("");
      fig.datum(serie);
      G.ridisegna("#asse-fig .fig-area");
    }
    G.grafico(fig, (area, w) => {
      const serie = area.datum() || [];
      const stretto = w < 560;
      const max = d3.max(serie, (s) => d3.max(s.m3, (v) => v || 0)) || 1;
      // striscia delle epoche sopra la curva
      const hEp = 40, hEv = stretto ? 0 : 54;
      const Hc = stretto ? 250 : 360;
      const HH = hEp + hEv + Hc;
      const m = { t: hEp + hEv + 10, r: stretto ? 12 : 110, b: 26, l: 0 };
      const svg = area.append("svg").attr("width", w).attr("height", HH).attr("role", "img").attr("aria-label", "Confronto di parole 1848-2022");
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, max * 1.08]).range([HH - m.b, m.t]);
      G.bandaEpoche(svg, x, 0, 22, stretto);
      d3.range(1850, 2021, 10).forEach((a) => {
        svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", 22).attr("y2", a % 50 === 0 ? 28 : 25).attr("stroke", G.GRIGIO);
        if (a % (stretto ? 50 : 20) === 0) svg.append("text").attr("x", x(a)).attr("y", 38).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(a);
      });
      // eventi di peso 1, su tre livelli
      if (!stretto) {
        const ev = H.eventi.filter((e) => e[2] === 1).map((e) => ({ a: +e[0].slice(0, 4) + (+e[0].slice(5, 7) - 1) / 12, t: e[1] }));
        const fine = [];
        ev.forEach((e) => {
          const xx = x(e.a), lw = e.t.length * 6.3;
          let r = 0; while (r < 3 && fine[r] != null && fine[r] > xx - 6) r++;
          if (r > 2) return;
          fine[r] = xx + lw;
          const yy = hEp + 12 + r * 15;
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
      d3.range(1860, 2021, stretto ? 50 : 20).forEach((a) => gy.append("text").attr("x", x(a)).attr("y", HH - m.b + 17).attr("text-anchor", "middle").text(a));
      G.lineeTrascrizione(svg, x, m.t, HH - m.b, "entrambi", !stretto);
      const linea = d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]));
      const fine = [];
      serie.forEach((s, k) => {
        svg.append("path").attr("d", linea(G.ANNI.map((a, i) => [a, s.m3[i]]))).attr("fill", "none").attr("stroke", s.col).attr("stroke-width", k === 0 ? 2.5 : 1.8).attr("stroke-linejoin", "round");
        const pk = G.picco(s.m3);
        svg.append("circle").attr("cx", x(pk.anno)).attr("cy", y(pk.val)).attr("r", 3).attr("fill", s.col);
        if (!stretto) {
          const px = x(pk.anno);
          svg.append("text").attr("class", "etich").attr("x", px).attr("y", y(pk.val) - 7).attr("text-anchor", px > w - m.r - 60 ? "end" : "middle").attr("fill", s.col).text(s.c.forma + " " + s.vero.anno + ": " + G.num1(s.vero.val));
        }
        const ult = G.ANNI.map((a, i) => [a, s.m3[i]]).filter((d) => d[1] != null).slice(-1)[0];
        if (ult && !stretto) fine.push({ y: y(ult[1]), x: x(ult[0]), s });
      });
      G.separa(fine, 15, m.t, HH - m.b);
      fine.forEach((f) => svg.append("text").attr("class", "etich").attr("x", f.x + 6).attr("y", f.y + 4).attr("fill", f.s.col).text(f.s.c.forma));
      // lettura
      const riga = area.node().parentNode.querySelector(".fig-lettura");
      const v = svg.append("line").attr("y1", m.t).attr("y2", HH - m.b).attr("stroke", G.NERO).style("display", "none");
      svg.append("rect").attr("x", 0).attr("y", m.t).attr("width", w - m.r).attr("height", HH - m.t - m.b).attr("fill", "transparent")
        .on("pointermove", (e) => {
          const a = Math.max(1848, Math.min(2022, Math.round(x.invert(d3.pointer(e)[0])))), i = a - 1848;
          v.attr("x1", x(a)).attr("x2", x(a)).style("display", null);
          riga.innerHTML = "<b>" + a + "</b>: " + serie.map((s) => `<span style="color:${s.col};font-weight:700">${G.esc(s.c.forma)}</span> ${s.c.pm.m[i] == null ? "nessun dato" : G.num1(s.c.pm.m[i])}`).join(" · ") + " volte per milione";
        }).on("pointerleave", () => v.style("display", "none"));
      if (riga && !riga.innerHTML) riga.innerHTML = stretto ? serie.map((s) => `<span style="color:${s.col};font-weight:700">${G.esc(s.c.forma)} ${s.vero.anno}: ${G.num1(s.vero.val)}</span>`).join(" · ") : "Passa sul grafico per leggere i valori di un anno.";
    });
    function aggiornaURL() { try { history.replaceState(null, "", attive.length ? "?p=" + attive.join(",") : location.pathname); } catch (e) { /* niente */ } }
    function leggi(t) {
      const nuove = t.split(/[,;]+/).map(G.norma).filter(Boolean);
      if (!nuove.length) return;
      attive = nuove.slice(0, 5); aggiornaURL(); carica();
    }
    document.getElementById("asse-in").addEventListener("keydown", (e) => { if (e.key === "Enter") leggi(e.target.value); });
    document.getElementById("asse-ok").addEventListener("click", () => leggi(document.getElementById("asse-in").value));
    el.querySelectorAll(".pronti a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("asse-in").value = a.dataset.p.replace(/,/g, ", "); leggi(a.dataset.p); }));
    return carica();
  }

  /* ---------------- 6. apertura e in breve ---------------- */
  function apertura(H) {
    document.getElementById("in-breve").innerHTML = H.breve.map((b) => `<li>${b}</li>`).join("") + '<li><a href="storie.html"><b>Tutte le storie</b></a></li>';
    // la storia d'apertura è la prima dell'indice delle storie; il grafico è il suo primo grafico con dati
    return G.carica("storie/indice.json").then((IX) => {
      const prima = IX.storie[0];
      if (!prima) return;
      const medie = ["mappa-partiti-governo-opposizione", "missione-o-guerra"];
      return Promise.all([G.carica("storie/" + prima.id + ".json")].concat(medie.map((id) => G.carica("storie/" + id + ".json").catch(() => null)))).then(([St, m1, m2]) => {
        const link = "storia.html?id=" + St.id;
        document.getElementById("apertura").innerHTML = `<p class="occhiello">${G.esc(St.occhiello)}</p>
          <h2><a href="${link}">${G.esc(St.titolo)}</a></h2><p class="sommario">${G.esc(St.sottotitolo)}</p><div id="g-apertura"></div>
          <p style="margin-top:12px"><a class="leggi" href="${link}">Leggi la storia</a>${St.parole && St.parole[0] ? ` · <a class="leggi" href="parola.html?p=${G.norma(St.parole[0])}">La scheda della parola</a>` : ""}</p>`;
        [[m1, "#m-mappa"], [m2, "#m-guerra"]].forEach(([m, sel]) => {
          const el = document.querySelector(sel);
          if (!m || !el) return;
          el.querySelector("h2 a").textContent = m.titolo;
          el.querySelector("h2 a").href = "storia.html?id=" + m.id;
          el.querySelector(".somm-media").textContent = m.sottotitolo;
        });
        const g = (St.grafici || []).find((x) => x.dati && x.dati.forma === "colonne");
        if (!g) return;
        const D = g.dati;
        const pts = D.serie[0].punti ? D.serie[0].punti : D.x.map((x, i) => [x, D.serie[0].v[i]]);
        const area = G.figura("#g-apertura", { titolo: g.titolo, sotto: g.sotto, limite: g.limite, csv: () => [["mese", "volte"]].concat(pts), nomeCSV: St.id });
        G.grafico(area, (ar, w) => {
          const h = w < 560 ? 230 : 300, m = { t: 24, r: 6, b: 24, l: 0 };
          const svg = ar.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", g.titolo.replace(/<[^>]+>/g, ""));
          const x = d3.scaleBand().domain(pts.map((p) => p[0])).range([m.l, w - m.r]).paddingInner(0.18);
          const mx = d3.max(pts, (p) => p[1] || 0) || 1;
          const y = d3.scaleLinear().domain([0, mx * 1.08]).nice().range([h - m.b, m.t]);
          const ga = svg.append("g").attr("class", "asse");
          const tk = y.ticks(4);
          tk.forEach((v, i) => { ga.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null); ga.append("text").attr("x", 0).attr("y", y(v) - 4).text(G.num(v) + (i === tk.length - 1 ? " volte al mese" : "")); });
          const im = pts.reduce((b, p, i) => ((p[1] || 0) > (pts[b][1] || 0) ? i : b), 0);
          pts.forEach((p, i) => {
            if (p[1]) svg.append("rect").attr("x", x(p[0])).attr("width", x.bandwidth()).attr("y", y(p[1])).attr("height", y(0) - y(p[1])).attr("fill", i === im ? G.ROSSO : G.NERO);
            if (String(p[0]).endsWith("-01")) ga.append("text").attr("x", x(p[0])).attr("y", h - m.b + 17).attr("fill", G.NERO).attr("font-weight", 700).text(String(p[0]).slice(0, 4));
          });
          const pk = pts[im], px = x(pk[0]) + x.bandwidth() / 2;
          G.nota(svg, px, y(pk[1]), px + 14, y(pk[1]) + 6, G.data(String(pk[0])) + ": " + G.num(pk[1]) + " volte", { bold: true });
        });
      });
    });
  }

  /* ---------------- 7. venti parole ---------------- */
  function multipli(H) {
    const el = document.getElementById("multipli");
    const lista = H.multipli.map((w) => ({ w, d: H.curve[w] })).filter((x) => x.d).sort((a, b) => a.d.picco - b.d.picco);
    el.innerHTML = lista.map((x, i) => `<div class="mul"><h4><a href="parola.html?p=${x.w}">${G.esc(x.d.forma)}</a></h4><div class="tot">${G.num(x.d.tot)} volte</div><a href="parola.html?p=${x.w}" aria-label="${G.esc(x.d.forma)}"><div class="mm" id="mm${i}"></div></a></div>`).join("");
    lista.forEach((x, i) => G.grafico("#mm" + i, (a, w) => G.mini(a, w, x.d.m, { piccoAnno: x.d.picco, label: x.d.forma, asse: i < 5 })));
  }

  /* ---------------- 8. partiti e missione o guerra ---------------- */
  function partitiEGuerra(H) {
    const area = G.figura("#g-mappa", {
      titolo: "La linea del PCI, poi PDS, DS e PD, tra le altre famiglie",
      sotto: "Posizione di ogni partito ricavata dalle parole che usa, per legislatura, Camera, 1948-2022: per ogni famiglia il partito più grande. Più due partiti sono vicini, più usano le stesse parole.",
      limite: "La mappa parte dal 1948; i gruppi minori non ci sono; la posizione viene dalle parole, non dai voti.",
      csv: () => [["famiglia", "anno", "posizione", "scheda"]].concat([].concat(...Object.entries(H.mappa_linee).map(([f, l]) => l.map((p) => [f, p[0], p[1], p[2]])))), nomeCSV: "mappa_partiti",
    });
    G.grafico(area, (a, w) => {
      const L = H.mappa_linee;
      const tutti = [].concat(...Object.values(L)).map((p) => p[1]);
      const ext = d3.extent(tutti);
      const stretto = w < 560;
      const r = G.linee(a, w, {
        x: [1948, 2022], y: [ext[0] - 0.005, ext[1] + 0.005], yTicks: [], h: stretto ? 260 : 330, m: { r: stretto ? 60 : 120, l: 0 }, etichSopra: false,
        serie: Object.keys(L).filter((f) => f !== "PCI-PD").map((f) => ({ punti: L[f].map((p) => [p[0], p[1]]), colore: G.GDATI, sp: 1, etich: f })).concat([{ punti: L["PCI-PD"].map((p) => [p[0], p[1]]), colore: G.ROSSO, sp: 2.5, punto: 2.5, etich: "PCI, poi PDS, DS e PD" }]),
      });
      r.svg.append("text").attr("x", 0).attr("y", r.y(ext[1]) + 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di destra");
      r.svg.append("text").attr("x", 0).attr("y", r.y(ext[0]) - 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di sinistra");
    });
    const area2 = G.figura("#g-manubri", {
      titolo: "Chi sta all'opposizione dice «guerra» più di chi governa in 7 operazioni su 10",
      sotto: "Quota di «guerra» su «guerra» più «missione» e «operazione», entro 30 parole dal nome del paese. Maggioranza (pallino bianco) e opposizione (rosso), Camera.",
      limite: "Solo l'Iraq ha un margine che non tocca lo zero. La Bosnia non è misurabile.",
      csv: () => [["operazione", "parole_maggioranza", "quota_maggioranza", "parole_opposizione", "quota_opposizione", "differenza", "basso", "alto", "anno"]].concat(H.h68), nomeCSV: "missione_guerra",
    });
    G.grafico(area2, (a, w) => manubri(a, w, H.h68));
  }
  function manubri(area, w, righe) {
    const rh = 26, lw = w < 400 ? 92 : 112, top = 6, h = righe.length * rh + top + 22;
    const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Missione o guerra");
    const x = d3.scaleLinear().domain([0, 100]).range([lw, w - 14]);
    const g = svg.append("g").attr("class", "asse");
    [0, 25, 50, 75, 100].forEach((v) => { g.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", top).attr("y2", h - 18).attr("stroke", G.RIGA); g.append("text").attr("x", x(v)).attr("y", h - 4).attr("text-anchor", "middle").text(v + (v === 100 ? "%" : "")); });
    righe.forEach((r, i) => {
      const yy = top + i * rh + rh / 2;
      const [op, , qm, , qo, , lo] = r;
      const nonMis = op === "Bosnia", forte = lo > 0;
      svg.append("text").attr("x", lw - 8).attr("y", yy + 4).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", forte ? 800 : 400).attr("fill", nonMis ? G.GRIGIO : G.NERO).text(op);
      svg.append("line").attr("x1", x(qm)).attr("x2", x(qo)).attr("y1", yy).attr("y2", yy).attr("stroke", G.NERO).attr("stroke-width", forte ? 2.5 : 1.2).attr("stroke-dasharray", nonMis ? "3 3" : null);
      svg.append("circle").attr("cx", x(qm)).attr("cy", yy).attr("r", 5).attr("fill", "#fff").attr("stroke", G.NERO).attr("stroke-width", 1.5);
      svg.append("circle").attr("cx", x(qo)).attr("cy", yy).attr("r", 5).attr("fill", G.ROSSO);
      const sx = qo >= qm;
      svg.append("text").attr("x", x(qo) + (sx ? 9 : -9)).attr("y", yy + 4).attr("text-anchor", sx ? "start" : "end").attr("font-size", 12).attr("font-weight", 700).attr("fill", G.ROSSO).attr("class", "alone").text(qo);
    });
  }

  /* ---------------- 9. parola dell'anno ---------------- */
  function anni(H, B) {
    const el = document.getElementById("anni-blocco");
    const dec = []; for (let d = 1840; d <= 2020; d += 10) dec.push(d);
    el.innerHTML = dec.map((d) => {
      const righe = [];
      for (let a = Math.max(1848, d); a <= Math.min(2022, d + 9); a++) {
        const w = (B.parole_anno[a] || []).find((x) => x[0].length >= 5);
        if (w) righe.push(`<div><b>${String(a).slice(2)}</b><a class="lk" href="anno.html?a=${a}">${G.esc(w[3] || w[0])}</a></div>`);
      }
      return `<div class="decennio"><h4>${d === 1840 ? "1848" : d}</h4>${righe.join("")}</div>`;
    }).join("");
  }

  /* ---------------- 10. legislature sullo stesso asse ---------------- */
  function legislature(H, B) {
    const area = G.figura("#g-legislature", {
      titolo: (() => { const pa = (l) => l.parole / Math.max(1, l.a - l.da + 1); const c = B.archivi.filter((l) => l.ramo === "camera"); const m = (e) => d3.mean(c.filter((l) => l.epoca === e), pa); return `Dalla Repubblica la Camera parla ${G.num(m("repubblica") / m("regno"), 1)} volte più che nel Regno`; })(),
      sotto: "Milioni di parole dette in aula in un anno, legislatura per legislatura: sopra la Camera, sotto il Senato. Ogni barra è un link.",
      csv: () => [["legislatura", "ramo", "da", "a", "parole", "interventi"]].concat(B.archivi.map((l) => [l.id, l.ramo, l.da, l.a, l.parole, l.turni])), nomeCSV: "legislature",
    });
    G.grafico(area, (a, w) => {
      const stretto = w < 560;
      const m = { l: 0, r: stretto ? 12 : 110 };
      const h = 190, mid = 95;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Legislature");
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      const perAnno = (l) => l.parole / Math.max(1, l.a - l.da + 1);
      const max = d3.max(B.archivi, perAnno);
      const y = d3.scaleLinear().domain([0, max]).range([0, 78]);
      svg.append("line").attr("x1", 0).attr("x2", w - m.r).attr("y1", mid).attr("y2", mid).attr("stroke", G.NERO);
      B.archivi.forEach((l) => {
        const x0 = x(l.da), x1 = Math.max(x0 + 1.5, x(l.a + 1) - 1);
        const hh = y(perAnno(l));
        const lk = svg.append("a").attr("href", "legislatura.html?id=" + l.leg);
        lk.append("title").text(`${l.nome}, ${G.ramo(l.ramo)}, ${l.da}-${l.a}: ${G.num(perAnno(l) / 1e6, 1)} milioni di parole l'anno`);
        lk.append("rect").attr("x", x0).attr("width", x1 - x0).attr("y", l.ramo === "camera" ? mid - hh : mid).attr("height", hh).attr("fill", l.leg === "repubblica-7" ? G.ROSSO : G.NERO);
      });
      svg.append("text").attr("x", 0).attr("y", 12).attr("class", "etich").text("Camera");
      svg.append("text").attr("x", 0).attr("y", h - 26).attr("class", "etich").text("Senato");
      const cm = B.archivi.filter((l) => l.ramo === "camera").reduce((p, q) => (perAnno(q) > perAnno(p) ? q : p));
      if (!stretto) G.nota(svg, x(cm.da + 1), mid - y(perAnno(cm)), x(cm.da) - 30, 30, `${cm.nome}: ${G.num(perAnno(cm) / 1e6, 1)} milioni di parole l'anno`, { anchor: "end", maxch: 22 });
      d3.range(1860, 2021, stretto ? 50 : 20).forEach((aa) => svg.append("text").attr("x", x(aa)).attr("y", h - 4).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(aa));
    });
  }

  /* ---------------- 11. esperimenti ---------------- */
  function esperimenti(H) {
    const C = H.esperimenti.conti;
    const righe = C.filter((c) => c[0] !== "Totale");
    const tot = C.find((c) => c[0] === "Totale");
    document.getElementById("esp-tit").innerHTML = `<a href="esperimenti.html">Su ${tot[7]} esperimenti, ${tot[3]} smentiscono quello che ci aspettavamo</a>`;
    document.getElementById("esp-somm").innerHTML = `Ogni ipotesi è stata scritta prima di guardare i dati, con la regola del verdetto fissata in anticipo. ${tot[1]} reggono, ${tot[2]} reggono in parte, ${tot[3]} cadono. Le altre ${tot[4] + tot[5] + tot[6]} non hanno un verdetto.`;
    const area = G.figura("#g-esperimenti", {
      titolo: "I verdetti, filone per filone", sotto: "Numero di esperimenti per esito: nero regge, mezzo pieno in parte, rosso smentita, vuoto gli altri",
      csv: () => [["filone", "regge", "in parte", "smentita", "non valida", "descrittiva", "non misurata", "totale"]].concat(C), nomeCSV: "esperimenti_conti",
    });
    G.grafico(area, (a, w) => {
      const lw = w < 560 ? 130 : 330, rh = 22;
      const svg = a.append("svg").attr("width", w).attr("height", righe.length * rh + 6).attr("role", "img").attr("aria-label", "Verdetti per filone");
      const unit = Math.min(18, (w - lw - 40) / d3.max(righe, (r) => r[7]));
      const defs = svg.append("defs");
      const pat = defs.append("linearGradient").attr("id", "mezzo");
      pat.append("stop").attr("offset", "50%").attr("stop-color", G.NERO); pat.append("stop").attr("offset", "50%").attr("stop-color", "#fff");
      righe.forEach((r, i) => {
        const yy = i * rh;
        svg.append("a").attr("href", "esperimenti.html?filone=" + encodeURIComponent(r[0])).append("text").attr("x", lw - 10).attr("y", yy + 15).attr("text-anchor", "end").attr("font-size", 13).text(w < 560 ? r[0].replace(/^Temi: /, "").slice(0, 20) : r[0]);
        let k = 0;
        [[r[1], G.NERO, G.NERO], [r[2], "url(#mezzo)", G.NERO], [r[3], G.ROSSO, G.ROSSO], [r[4] + r[5] + r[6], "#fff", G.GDATI]].forEach(([n, f, s]) => {
          for (let j = 0; j < n; j++) { svg.append("rect").attr("x", lw + k * unit + 1).attr("y", yy + 5).attr("width", unit - 3).attr("height", 12).attr("fill", f).attr("stroke", s).attr("stroke-width", 1.2); k++; }
        });
        svg.append("text").attr("x", lw + k * unit + 6).attr("y", yy + 15).attr("font-size", 12).attr("fill", G.GRIGIO).text(r[7]);
      });
    });
    const sm = H.smentite_txt && H.smentite_txt.length ? H.smentite_txt.map((e) => `<li>${G.lEsp(e.cod)} <a href="storia.html?id=${e.storia}">${G.esc(e.testo)}</a> ${G.esito(e.esito)}</li>`) : H.esperimenti.smentite.map((e) => `<li>${G.lEsp(e.cod)} <b>${G.esc(e.titolo)}.</b> ${G.esc(e.attesa)} ${G.esito(e.esito)}</li>`);
    document.getElementById("smentite").innerHTML = sm.join("");
  }

  /* ---------------- 12. temi ---------------- */
  function temi(H) {
    const T = H.temi.filter((t) => !t.proc).map((t) => {
      const v = t.q;
      let k = 0; v.forEach((q, i) => { if (q != null && q > (v[k] || 0)) k = i; });
      return { t, picco: 1848 + k, max: v[k] || 1 };
    }).sort((a, b) => a.picco - b.picco);
    const area = G.figura("#g-temi", {
      titolo: "Le province nell'Ottocento, la guerra nel 1917, l'emergenza nel 2020: ogni tema ha il suo anno",
      sotto: "Quota delle parole della Camera dedicata a ciascuno dei 27 temi di contenuto, anno per anno. Ogni riga ha la sua scala: nero è il suo anno di punta, in rosso. I temi li trova un programma; i nomi sono scritti a mano.",
      limite: "Bianco: anni senza sedute o con troppo poco testo.",
      csv: () => [["tema"].concat(G.ANNI)].concat(H.temi.map((t) => [t.nome].concat(t.q))), nomeCSV: "temi",
    });
    G.grafico(area, (a, w) => {
      const stretto = w < 560;
      const lw = stretto ? 120 : 260, rw = stretto ? 0 : 50, rh = 15;
      const svg = a.append("svg").attr("width", w).attr("height", T.length * rh + 22).attr("role", "img").attr("aria-label", "Temi anno per anno");
      const x = d3.scaleLinear().domain([1848, 2023]).range([lw, w - rw]);
      const cw = Math.max(0.6, x(1849) - x(1848));
      const passi = ["#FFFFFF", "#D6F2E3", "#8FDDB5", "#2FBF7A", "#007A41"];
      T.forEach((o, i) => {
        const yy = i * rh;
        svg.append("a").attr("href", "tema.html?id=" + o.t.id).append("text").attr("x", lw - 6).attr("y", yy + 11).attr("text-anchor", "end").attr("font-size", 12.5).text(stretto ? o.t.nome.slice(0, 18) : o.t.nome.slice(0, 44));
        o.t.q.forEach((q, k) => {
          if (q == null) return;
          const r = q / o.max;
          const c = 1848 + k === o.picco ? "#16181D" : passi[Math.min(4, Math.floor(r * 4.999))];
          if (c !== "#FFFFFF") svg.append("rect").attr("x", x(1848 + k)).attr("y", yy).attr("width", cw + 0.3).attr("height", rh - 1).attr("fill", c);
        });
        if (!stretto) svg.append("text").attr("x", w - rw + 6).attr("y", yy + 11).attr("font-size", 12).attr("font-weight", 700).attr("fill", "#007A41").text(o.picco);
      });
      d3.range(1860, 2021, stretto ? 50 : 20).forEach((aa) => svg.append("text").attr("x", x(aa)).attr("y", T.length * rh + 16).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(aa));
    });
  }

  /* ---------------- 13. elenchi ---------------- */
  function elenchi(H) {
    const mx = H.oratori[0][2];
    document.getElementById("g-oratori").innerHTML = G.barre(H.oratori.slice(0, 15).map((o) => [o[1] ? G.lPersona(o[1], o[0]) : G.esc(o[0]), o[2], o[3]]), { max: mx });
    const riga = (x) => `<tr><td>${G.lParola(x[0], x[4] || x[0])}</td><td class="n">${G.num1(x[1])}</td><td class="n">${G.num1(x[2])}</td><td class="n"><b>${G.num1(x[3])}</b></td></tr>`;
    const th = '<thead><tr><th>parola</th><th class="n">1848-1900</th><th class="n">1901-89</th><th class="n">1990-2022</th></tr></thead>';
    document.getElementById("t-nate").innerHTML = th + "<tbody>" + H.nate.slice(0, 16).map(riga).join("") + "</tbody>";
    document.getElementById("t-morte").innerHTML = th + "<tbody>" + H.morte.slice(0, 16).map(riga).join("") + "</tbody>";
    const lp = H.picchi.slice().sort((a, b) => a[1] - b[1]);
    document.getElementById("l-picchi").innerHTML = '<ul class="elenco-n">' + lp.map((p) => `<li><span>${G.lParola(p[0], p[2])}</span><span>${G.lAnno(p[1])}</span></li>`).join("") + "</ul>";
  }
})();
