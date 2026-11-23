/* Pagina di un capitolo del racconto: capitolo.html?n=1. Testo a passi a sinistra, il grafico chiave fermo a destra. */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "" });
    G.piede();
    const el = document.getElementById("contenuto");
    const n = parseInt(G.param("n") || "1", 10);
    return Promise.all([G.carica("capitoli/" + n + ".json"), G.carica("capitoli/indice.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([C, IX, S]) => {
      document.title = C.titolo + " · Il vocabolario del Parlamento";
      document.getElementById("bric").textContent = "Capitolo " + C.n;
      if (C.anni && C.anni.length) G.dove([C.anni[0], C.anni[C.anni.length - 1], "capitolo " + C.n + ", " + C.anni.join("-")]);
      const storie = (C.storie || []).map((id) => S.storie.find((s) => s.id === id)).filter(Boolean);
      const i = IX.capitoli.findIndex((c) => +c.n === n);
      const prec = IX.capitoli[i - 1], succ = IX.capitoli[i + 1];
      const minuscola = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
      const a0 = (C.anni || [])[0], a1 = (C.anni || [])[(C.anni || []).length - 1];
      // la voce lunga: il titolo spiega di che cosa parla il capitolo, la parola guida sta accanto
      el.innerHTML = `
        <h1 class="titolo-pagina">${G.esc(C.titolo)}<span class="accanto"><span class="anni">[${a0}-${a1}]</span> <i class="gram">cap. ${C.n} di ${IX.capitoli.length} · parola guida</i> ${G.esc(minuscola(C.simbolo || ""))}</span></h1>
        <p class="sommario">${G.esc(C.sommario)}</p>
        ${C.frase ? `<p class="es cap-es">«${G.esc(C.frase.replace(/^«|»$/g, ""))}» <span>${G.esc(C.chi)}</span></p>` : ""}
        <div id="filo"></div>
        <section class="scorrimento">
          <div class="scena"><div id="g-chiave"></div></div>
          <div class="passi">${C.passi.map((p, k) => `<div class="passo" data-stato="${k + 1}"><h2 class="titolo-piccolo senso"><b class="n" aria-label="Passo ${k + 1}">${k + 1}</b> ${p.titolo}</h2>${p.testo}${p.porte ? `<p class="piccolo porte">→ ${p.porte}</p>` : ""}</div>`).join("")}</div>
        </section>
        <section class="sezione griglia">
          <div class="c4">${C.stenografo ? `<h2 class="rubrica">Il momento dello stenografo</h2><div class="voce">${C.stenografo}</div>` : ""}<h2 class="rubrica">Tre porte</h2><div class="voce">${C.porte_fondo}</div></div>
          <div class="c4 fil"><h2 class="rubrica">I verdetti toccati</h2><div class="voce">${C.verdetti}</div>${C.verso ? `<h2 class="rubrica">L'ultima riga</h2><div class="voce">${C.verso}</div>` : ""}</div>
          <div class="c4 fil"><h2 class="rubrica">Vedi anche: le storie del capitolo</h2>${G.tessere(storie, 12).replace('class="rimandi"', 'class="rimandi una"')}</div>
        </section>
        <nav class="prec-succ" aria-label="Capitoli vicini"><span>${prec ? `<a href="capitolo.html?n=${prec.n}">◂ ${G.esc(prec.titolo)}</a> <i class="gram">cap. ${prec.n}</i>` : `<a href="index.html">◂ La prima pagina</a>`}</span><span>${succ ? `<i class="gram">cap. ${succ.n}</i> <a href="capitolo.html?n=${succ.n}">${G.esc(succ.titolo)} ▸</a>` : `<a href="percorsi.html">I percorsi ▸</a>`}</span></nav>`;
      G.guideVicine(prec ? ["capitolo.html?n=" + prec.n, prec.titolo] : ["index.html", "la prima pagina"], succ ? ["capitolo.html?n=" + succ.n, succ.titolo] : ["percorsi.html", "i percorsi"]);
      G.filoDelTempo("#filo", IX.capitoli, n);
      Promise.all([G.carica("capitoli/scommesse.json"), G.carica("esperimenti.json")]).then(([SC, E]) => {
        SC.scommesse.filter((x) => x.capitolo === n).forEach((x) => { const p = el.querySelectorAll(".passo")[x.passo - 1]; if (p) G.scommessa(p, x, E); });
      }).catch(() => {});
      // il passo che si legge viene messo in evidenza (unico movimento: il grafico resta fermo e leggibile)
      const passi = el.querySelectorAll(".passo");
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((v) => v.forEach((e) => { if (e.isIntersecting) { passi.forEach((p) => p.classList.remove("attivo")); e.target.classList.add("attivo"); } }), { rootMargin: "-45% 0px -45% 0px" });
        passi.forEach((p) => io.observe(p));
      }
      return grafico(n, Array.from(passi));
    });
  });

  /* il grafico chiave del capitolo, scelto tra quelli costruiti dai dati del sito */
  function grafico(n, passi) {
    const box = "#g-chiave";
    // capitoli con un grafico che cambia stato a ogni passo (componenti in scene.js)
    if (n === 4) return G.carica("sezioni/esteri.json").then((X) => {
      const sc = G.Scena.amiciNemici(box, X), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[1], st[2], st[3], st[7], st[4], st[5], st[7], st[6], st[7]]);
      sc.stato(st[0]);
    });
    if (n === 1) return G.carica("sezioni/lingue.json").then((L) => {
      const sc = G.Scena.francese(box, L), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[1], st[2], st[3], st[4], st[5]]);
      sc.stato(st[0]);
    });
    if (n === 3) return Promise.all([G.carica("sezioni/fascismo.json"), G.Scena.primeParole(["antifascismo", "camerati", "autarchia", "razzismo", "littorio"])]).then(([F, P]) => {
      const sc = G.Scena.specchio(box, F, P), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[0], st[0], st[0], st[1], st[2], st[2], st[3], st[3], st[3]]);
      sc.stato(st[0]);
    });
    // capitoli 2, 5, 6 e 7: curve a stati (G.Scena.curve), una serie di dati diversa per ogni passo
    const SOTTO = "Il grafico cambia a ogni passo del testo; la scritta in alto dice che cosa mostra. Parole: volte per milione di parole dette in aula, Camera e Senato, media di tre anni.";
    const serieAnni = (o, k, nome, unita) => ({ id: nome, nome: nome, unita: unita, punti: G.media3(G.ANNI.map((y) => (o[y] ? o[y][k] : null))).map((v, i) => [G.ANNI[i], v]) });
    const scenaCurve = (titolo, serie, stati, mappa) => {
      const sc = G.Scena.curve(box, { titolo: titolo, sotto: SOTTO, serie: serie, stati: stati, nomeCSV: "capitolo_" + n });
      G.legaPassi(sc, passi, mappa.map((i) => stati[i]));
      sc.stato(stati[0]);
    };
    if (n === 2) return Promise.all([G.carica("sezioni/lingue.json"), G.carica("sezioni/risate.json"), G.Scena.parole(["adunque", "imperocche", "eziandio", "quistione", "sieno", "uffizio"])]).then(([L, R, W]) => {
      const wc = (L.regno.wps || {}).camera || {};
      const pw = G.ANNI.filter((y) => y <= 1922).map((y) => [y, wc[y] != null ? wc[y] : null]);
      const v = pw.filter((q) => q[1] != null), y0 = Math.floor(d3.min(v, (q) => q[1]) - 3);
      const primo = v[0], ultimo = v[v.length - 1];
      const serie = [{ id: "wps", nome: "parole per frase", unita: "parole per frase", punti: pw },
        { id: "attesa", nome: "attesa: una discesa", unita: "parole per frase", punti: [primo, ultimo] },
        serieAnni(R.serie, 0, "ilarità", "ogni mille interventi")].concat(W);
      const parole = W.map((s) => s.id);
      scenaCurve("Il Regno: la frase si accorcia di colpo, poi le parole vecchie se ne vanno", serie, [
        { mostra: ["wps"], x: [1848, 1860], y0: y0, scritta: "Parole per frase, Camera, 1848-1860" },
        { mostra: ["wps"], x: [1848, 1922], y0: y0, scritta: "Parole per frase, Camera, 1848-1922", nota: { id: "wps", x: 1861, testo: "1861, l'Unità" } },
        { mostra: ["wps", "attesa"], evid: ["wps"], tratt: ["attesa"], x: [1848, 1922], y0: y0, scritta: "attesa: una discesa · trovato: uno scalino" },
        { mostra: parole, x: [1848, 1922], fascia: { da: 1912, a: 1919, testo: "1912-19" }, scritta: "Sei parole dell'Ottocento, per milione di parole" },
        { mostra: ["ilarità"], x: [1848, 1914], scritta: "Ilarità annotata dallo stenografo, Camera (continua nel capitolo 5)" },
      ], [0, 1, 1, 2, 3, 3, 4, 3, 1]);
    });
    if (n === 5) return Promise.all([G.carica("sezioni/risate.json"), G.Scena.parole(["compagni", "camerati", "sfruttamento", "proletariato", "padronato", "capitalismo", "ambito", "provvedere", "compromesso", "solidarieta"]), G.Scena.parole(["terrorismo"], true)]).then(([R, W, T]) => {
      const serie = [serieAnni(R.serie, 0, "ilarità", "ogni mille interventi")].concat(W, T);
      const t = (T[0] || { punti: [] }).punti.filter((q) => q[0] >= 1965 && q[0] <= 1992 && q[1] != null), tm = t.reduce((a, b) => (b[1] > a[1] ? b : a), t[0] || [0, 0]);
      scenaCurve("1943-1992: le parole della Repubblica dei partiti", serie, [
        { mostra: ["compagni", "camerati"], x: [1920, 1992], fascia: { da: 1943, a: 1946, testo: "1943-46" }, scritta: "«compagni» e «camerati», per milione di parole" },
        { mostra: ["ilarità"], x: [1848, 1992], fascia: { da: 1946, a: 1992, testo: "Repubblica" }, scritta: "Ilarità annotata dallo stenografo, Camera" },
        { mostra: ["sfruttamento", "proletariato", "padronato", "capitalismo"], evid: ["sfruttamento"], x: [1946, 1992], scritta: "Le parole di classe: resta «sfruttamento»" },
        { mostra: ["ambito", "provvedere"], x: [1848, 2022], scritta: "Due parole dell'antilingua, per milione di parole" },
        { mostra: ["compromesso", "solidarieta"], x: [1960, 1992], fascia: { da: 1976, a: 1979, testo: "1976-79" }, scritta: "«compromesso» e «solidarietà», per milione di parole" },
        { mostra: ["terrorismo"], x: [1965, 1992], nota: { id: "terrorismo", x: tm[0], testo: "massimo: " + tm[0] }, scritta: "«terrorismo», per milione di parole, anno per anno" },
      ], [0, 0, 1, 2, 3, 4, 4, 5, 5]);
    });
    if (n === 6) return Promise.all([G.carica("sezioni/insulti.json"), G.Scena.parole(["mafia", "droga", "immigrazione", "extracomunitari", "emigrazione", "tangenti", "padania"]), G.Scena.parole(["tangentopoli"], true)]).then(([I, W, T]) => {
      const serie = [serieAnni(I.serie, 0, "insulti", "ogni mille parole")].concat(W, T);
      scenaCurve("1980-1994: le parole entrano in aula prima della Seconda Repubblica", serie, [
        { mostra: ["tangentopoli"], x: [1980, 2000], scritta: "«tangentopoli», per milione di parole, anno per anno" },
        { mostra: ["mafia", "droga", "immigrazione", "extracomunitari", "emigrazione"], x: [1975, 2000], scritta: "Un mondo che cambia parole, per milione di parole" },
        { mostra: ["tangentopoli", "tangenti"], x: [1980, 2000], scritta: "«tangentopoli» e «tangenti», per milione di parole" },
        { mostra: ["padania"], x: [1980, 2022], scritta: "«Padania», per milione di parole" },
        { mostra: ["insulti"], x: [1948, 2022], fascia: { da: 1994, a: 2022, testo: "dal 1994" }, scritta: "Parole d'insulto ogni mille parole, Camera e Senato" },
      ], [0, 0, 0, 1, 0, 2, 3, 4, 4]);
    });
    if (n === 7) return G.Scena.parole(["noi", "io", "cittadini", "spread", "privacy", "internet", "leader", "premier", "welfare", "extracomunitari", "clandestini", "migranti", "voi", "avete"]).then((W) => {
      scenaCurve("1994-2022: parole nuove, più «io» e più «voi»", W, [
        { mostra: ["noi", "io", "cittadini"], x: [1948, 2022], scritta: "«noi», «io», «cittadini», per milione di parole" },
        { mostra: ["spread", "privacy", "internet"], x: [1960, 2022], scritta: "Le parole nuove hanno una data: «spread», «privacy», «internet»" },
        { mostra: ["leader", "premier", "welfare"], x: [1948, 2022], scritta: "Parole inglesi, per milione di parole" },
        { mostra: ["extracomunitari", "clandestini", "migranti"], x: [1980, 2022], scritta: "Le parole cambiano ogni dieci anni: «extracomunitari», «clandestini», «migranti»" },
        { mostra: ["io"], x: [1948, 2022], fascia: { da: 2013, a: 2022, testo: "dal 2013" }, scritta: "«io», per milione di parole" },
        { mostra: ["voi", "avete"], x: [1994, 2022], fascia: { da: 2018, a: 2019, testo: "2018" }, scritta: "«voi» e «avete», per milione di parole" },
      ], [0, 1, 2, 3, 4, 4, 5, 5, 0, 0]);
    });
    if (n === 1) return G.carica("sezioni/lingue.json").then((L) => {
      const fc = L.francese.camera || {}; const anni = Object.keys(fc).map(Number).sort();
      const am = anni.reduce((a, b) => (fc[b] > fc[a] ? b : a), anni[0]);
      const area = G.figura(box, { titolo: `Nel ${am} il ${G.num(fc[am], 1)}% delle parole alla Camera è in francese`, sotto: "Quota delle parole dette in francese, Camera, 1848-1870", csv: () => [["anno", "camera_%"]].concat(anni.map((a) => [a, fc[a]])), nomeCSV: "francese" });
      G.grafico(area, (a, w) => G.linee(a, w, { x: [1848, 1870], y: [0, fc[am] * 1.2], h: 300, yFmt: (v) => G.num(v, 0) + "%", serie: [{ punti: anni.filter((y) => y <= 1870).map((y) => [y, fc[y]]), colore: G.SEZ, sp: 3, piccoEtich: { x: am, y: fc[am], testo: am + ": " + G.num(fc[am], 1) + "%" } }] }));
    });
    if (n === 2) return G.carica("sezioni/lingue.json").then((L) => {
      const w_ = L.regno.wps || {}; const pc = Object.keys(w_.camera || {}).map(Number).sort().map((y) => [y, w_.camera[y]]);
      const area = G.figura(box, { titolo: "All'Unità la frase perde 7 parole di colpo, poi resta quasi ferma", sotto: "Parole per frase, Camera, 1848-1922; la riga è il 1861", csv: () => [["anno", "parole_per_frase"]].concat(pc), nomeCSV: "frasi_regno" });
      G.grafico(area, (a, w) => { const v = pc.map((p) => p[1]).filter((x) => x != null); G.linee(a, w, { x: [1848, 1922], y: [Math.floor(d3.min(v) - 2), Math.ceil(d3.max(v) + 2)], h: 300, fasce: [{ da: 1860.9, a: 1861.1, colore: G.SEZ, testo: "1861" }], serie: [{ punti: pc, colore: G.SEZ, sp: 2.5 }], unita: "parole per frase" }); });
    });
    if (n === 3) return G.carica("sezioni/fascismo.json").then((F) => {
      const sc = F.serie.camera || {}, k = F.colonne.indexOf("b_dis_100");
      const p = Object.keys(sc).map(Number).sort().filter((y) => y <= 1943).map((y) => [y, sc[y][k]]);
      const area = G.figura(box, { titolo: "Il dissenso annotato crolla nel 1926-27", sotto: "Annotazioni di dissenso ogni cento interventi, Camera, 1913-1943", csv: () => [["anno", "dissenso_100"]].concat(p), nomeCSV: "dissenso" });
      G.grafico(area, (a, w) => G.linee(a, w, { x: [1913, 1943], y: [0, d3.max(p, (q) => q[1] || 0) * 1.1], h: 300, fasce: [{ da: 1926, a: 1943, colore: "#EEF0F2", testo: "regime" }], serie: [{ punti: p, colore: G.SEZ, sp: 3 }], unita: "ogni cento interventi" }));
    });
    if (n === 4) return G.carica("sezioni/esteri.json").then((X) => {
      const area = G.figura(box, { titolo: "Austria e Germania: amiche quando alleate, nemiche in guerra", sotto: "Tono dell'aula (sopra lo zero da nemico), media di tre anni; fasce turchesi: alleanza, rosa: guerra", csv: () => [["paese", "anno", "indice"]].concat([].concat(...["Austria", "Germania"].map((p) => Object.entries(X.indice[p] || {}).map(([y, v]) => [p, y, v[0]])))), nomeCSV: "austria_germania" });
      G.grafico(area, (a, w) => {
        const h = 300, svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Austria e Germania");
        const x = d3.scaleLinear().domain([1848, 2022]).range([0, w]);
        ["Austria", "Germania"].forEach((p, j) => {
          const y0 = j * 150, o = X.indice[p] || {}, al = X.alleanze[p] || {};
          const y = d3.scaleLinear().domain([-1, 1]).range([y0 + 130, y0 + 16]);
          Object.keys(al).forEach((k) => { const st = al[k][1]; if (st === "alleato" || st === "guerra") svg.append("rect").attr("x", x(+k)).attr("width", Math.max(1, x(+k + 1) - x(+k))).attr("y", y0 + 16).attr("height", 114).attr("fill", st === "alleato" ? "#8FD9DE" : "#F6A29F"); });
          svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", G.GRIGIO);
          const m3 = (k) => { const v = []; for (let q = k - 1; q <= k + 1; q++) if (o[q] && o[q][0] != null && o[q][3] >= 30) v.push(o[q][0]); return v.length ? d3.mean(v) : null; };
          svg.append("path").attr("d", d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]))(G.ANNI.map((k) => [k, m3(k)]))).attr("fill", "none").attr("stroke", G.INK).attr("stroke-width", 2);
          svg.append("text").attr("x", 0).attr("y", y0 + 12).attr("class", "etich").attr("fill", G.INK).text(p);
        });
      });
    });
    if (n === 5) return G.carica("partiti/traiettorie.json").then((TR) => {
      const P = TR.partiti, pci = P.PCI || [], dc = P.DC || [];
      const area = G.figura(box, { titolo: "Nel 1976-79 il PCI va verso la lingua della DC; la DC resta ferma", sotto: "Posizione dalle parole, legislatura per legislatura, Camera, 1948-1992: PCI in rosso, DC in blu, gli altri partiti in grigio", csv: () => [["partito", "legislatura", "d1", "d2"]].concat(pci.map((q) => ["PCI", q[0], q[2], q[3]])).concat(dc.map((q) => ["DC", q[0], q[2], q[3]])), nomeCSV: "pci_dc" });
      G.grafico(area, (a, w) => {
        const tutti = [].concat(...Object.values(P)); const h = 320, m = 20;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "PCI e DC");
        const x = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[2])).range([m, w - m]), y = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[3])).range([h - m, m]);
        tutti.forEach((q) => svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", 2.5).attr("fill", G.GDATI).attr("fill-opacity", 0.5));
        [[pci.filter((q) => q[0] <= 10), "#E3120B"], [dc.filter((q) => q[0] <= 10), "#1E78E6"]].forEach(([v, c]) => {
          svg.append("path").attr("d", d3.line().x((q) => x(q[2])).y((q) => y(q[3]))(v)).attr("fill", "none").attr("stroke", c).attr("stroke-width", 2.5);
          v.forEach((q) => { svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", q[0] === 7 ? 7 : 4).attr("fill", c); if (q[0] === 7 || q[0] === 1) svg.append("text").attr("x", x(q[2]) + 9).attr("y", y(q[3]) + 4).attr("class", "etich").attr("fill", G.INK).text(G.romano(q[0])); });
        });
      });
    });
    if (n === 6) return G.carica("storie/tangentopoli-entra-in-aula.json").then((St) => {
      const g = St.grafici.find((x) => x.dati && x.dati.forma === "colonne"); if (!g) return;
      const pts = g.dati.serie[0].punti || g.dati.x.map((x, i) => [x, g.dati.serie[0].v[i]]);
      const area = G.figura(box, { titolo: g.titolo, sotto: g.sotto, csv: () => [["mese", "volte"]].concat(pts), nomeCSV: "tangentopoli" });
      G.grafico(area, (a, w) => {
        const h = 300, svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "tangentopoli");
        const x = d3.scaleBand().domain(pts.map((p) => p[0])).range([0, w]).paddingInner(0.15), mx = d3.max(pts, (p) => p[1] || 0);
        const y = d3.scaleLinear().domain([0, mx * 1.1]).range([h - 22, 16]); const im = pts.reduce((b, p, i) => ((p[1] || 0) > (pts[b][1] || 0) ? i : b), 0);
        pts.forEach((p, i) => { if (p[1]) svg.append("rect").attr("x", x(p[0])).attr("width", x.bandwidth()).attr("y", y(p[1])).attr("height", y(0) - y(p[1])).attr("fill", i === im ? G.SEZ : "#CDD2D8"); if (String(p[0]).endsWith("-01")) svg.append("text").attr("x", x(p[0])).attr("y", h - 4).attr("font-size", 12).attr("fill", G.GRIGIO).text(String(p[0]).slice(0, 4)); });
        svg.append("text").attr("class", "etich").attr("x", x(pts[im][0])).attr("y", y(pts[im][1]) - 6).attr("fill", G.INK).text(G.data(String(pts[im][0])) + ": " + G.num(pts[im][1]));
      });
    });
    if (n === 7) return G.carica("partiti/m5s.json").then((P) => {
      const O = P.opposizione || [];
      const area = G.figura(box, { titolo: "Nel 2018 il M5S va al governo e smette di parlare da opposizione", sotto: "Probabilità che la lingua dei deputati M5S sia «da opposizione», per legislatura (H67)", csv: () => [["legislatura", "probabilita_opposizione"]].concat(O.map((o) => [o[0], o[1]])), nomeCSV: "m5s" });
      area.html(G.barre(O.map((o, i) => [G.romano(o[0]) + " legislatura", o[1], i === O.length - 1]), { fmt: (v) => G.pct(v, 0), max: 1 }));
    }).catch(() => {});
    return null;
  }
})();
