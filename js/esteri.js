/* Percorso: amici e nemici dell'Italia, 1848-2022 */
(function () {
  "use strict";
  const ALLEATO = "#8FD9DE", GUERRA = "#F6A29F";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("sezioni/esteri.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([X, E, S]) => {
      document.getElementById("dove").remove();
      const PAESI = ["Austria", "Germania", "Francia", "Gran Bretagna", "Russia/URSS", "Stati Uniti", "Jugoslavia", "Etiopia"];
      const storie = S.storie.filter((s) => s.filone === "Esteri ed Europa");
      const e39 = E.elenco.filter((e) => /^H39|^H78|^H77|^H72|^H71/.test(e.cod));
      const media3 = (o, a) => { const v = []; for (let y = a - 1; y <= a + 1; y++) if (o[y] && o[y][0] != null) v.push(o[y][0]); return v.length ? d3.mean(v) : null; };
      // fatto per il titolo: Austria piu' ostile e piu' amica
      el.innerHTML = `
        <h1 class="titolo-pagina">Amici e nemici dell'Italia, 1848-2022</h1>
        <p class="sommario">Per ogni paese e ogni anno, quante volte l'aula ne parla con parole ostili o amichevoli. Sotto ogni linea, le alleanze e le guerre vere: si vede quando le parole seguono i trattati e quando li anticipano o li smentiscono.</p>
        <section style="margin-top:14px"><div id="scena-an"></div><div id="bottoni-an"></div></section>
        <section class="sezione"><div class="testa"><h2>Otto paesi, 175 anni</h2></div>
          <p class="sotto-titolo">Indice dalle parole vicine al nome del paese, Camera e Senato, media di tre anni: sopra lo zero l'aula ne parla più da nemico, sotto più da amico. Fasce turchesi: anni di alleanza; fasce rosa: anni di guerra (Correlates of War). La tacca grigia in basso è il fascismo.</p>
          <div class="multipli" id="paesi" style="grid-template-columns:repeat(4,minmax(0,1fr))"></div>
          <p class="fig-fonte">Fonte: resoconti stenografici di Camera e Senato; alleanze e guerre: Correlates of War (Formal Alliances 4.1, Inter-State War 4.0). Il conteggio delle parole vicine sbaglia il segno in una parte delle frasi (non capisce le negazioni): per alcuni paesi c'è anche il giudice automatico, più sotto.</p></section>
        <section class="sezione"><div id="g-nemico"></div></section>
        <section class="sezione griglia"><div class="c7" id="g-pci"></div><div class="c5 fil" id="g-giudice"></div></section>
        <section class="sezione"><div class="testa"><h2>Le frasi delle svolte</h2></div><ul class="elenco-frasi" id="frasi"></ul></section>
        <section class="sezione"><div class="testa"><h2>Le storie degli esteri</h2></div>${G.tessere(storie, 8)}</section>
        <section class="sezione"><div class="testa"><h2>Gli esperimenti</h2></div><div class="tab-scorre"><table class="fitta"><tbody>${e39.map((e) => `<tr><td>${G.lEsp(e.cod)}</td><td>${G.esc(e.titolo)}</td><td>${G.esito(e.esito)}</td><td>${G.esc(e.numero)}</td></tr>`).join("")}</tbody></table></div></section>`;
      const scAN = G.Scena.amiciNemici("#scena-an", X);
      G.bottoniStati("#bottoni-an", scAN, ["Germania 1916 e 1940", "Austria e Stati Uniti fino al 1914", "la Triplice", "la Germania", "URSS e Stati Uniti fino al 1968", "Jugoslavia e Alto Adige", "Russia 2022", "tutto"]);
      document.getElementById("paesi").innerHTML = PAESI.map((p, i) => {
        const o = X.indice[p] || {};
        const anni = Object.keys(o).map(Number).filter((y) => (o[y][3] || 0) >= 30);
        const mx = anni.reduce((a, b) => ((media3(o, b) || -9) > (media3(o, a) || -9) ? b : a), anni[0]);
        return `<div class="mul"><h4>${G.esc(p)}</h4><div class="tot">più ostile nel ${mx}</div><div id="pa${i}"></div></div>`;
      }).join("");
      PAESI.forEach((p, i) => G.grafico("#pa" + i, (a, w) => paese(a, w, p, X, media3, i < 4)));
      // nemico principale anno per anno
      const NA = X.nemico_anno.filter((r) => r[1] && r[1].charAt(0) !== "(");
      const a2 = G.figura("#g-nemico", {
        titolo: (() => { const conta = {}; NA.forEach((r) => { conta[r[1]] = (conta[r[1]] || 0) + 1; }); const primi = Object.keys(conta).sort((a, b) => conta[b] - conta[a]).slice(0, 3); const ord = primi.sort((a, b) => NA.find((r) => r[1] === a)[0] - NA.find((r) => r[1] === b)[0]); return "Il nemico principale cambia con la storia: " + ord.join(", poi ") + " sono quelli che lo sono più a lungo"; })(),
        sotto: "Una riga per paese: una tacca rossa per ogni anno in cui è il paese di cui l'aula parla più da nemico (punteggio di ostilità più alto), Camera e Senato. A destra, quanti anni in tutto.",
        csv: () => [["anno", "nemico", "punteggio", "amico", "punteggio_amico"]].concat(X.nemico_anno), nomeCSV: "nemico_principale",
      });
      G.grafico(a2, (a, w) => {
        // una riga per paese, una tacca rossa per ogni anno in cui è il nemico principale: nessun colore per paese
        const conta = {}; NA.forEach((r) => { conta[r[1]] = (conta[r[1]] || 0) + 1; });
        const paesi = Object.keys(conta).filter((p) => conta[p] >= 2).sort((p, q) => NA.find((r) => r[1] === p)[0] - NA.find((r) => r[1] === q)[0]);
        const rh = 19, lw = w < 560 ? 92 : 130, top = 30, h = top + paesi.length * rh + 22;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Nemico principale per anno");
        const x = d3.scaleLinear().domain([1848, 2023]).range([lw, w]);
        G.bandaEpoche(svg, x, 0, 20, w < 560);
        paesi.forEach((p, k) => {
          const y0 = top + k * rh;
          svg.append("line").attr("x1", lw).attr("x2", w).attr("y1", y0 + rh / 2).attr("y2", y0 + rh / 2).attr("stroke", G.RIGA);
          svg.append("text").attr("x", lw - 8).attr("y", y0 + rh / 2 + 4).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", 700).attr("fill", G.INK).text(p);
          svg.append("text").attr("x", w).attr("y", y0 + rh / 2 - 3).attr("text-anchor", "end").attr("font-size", 12).attr("fill", G.GRIGIO).text(conta[p] + (conta[p] === 1 ? " anno" : " anni"));
          NA.filter((r) => r[1] === p).forEach((r) => svg.append("rect").attr("x", x(r[0])).attr("y", y0 + 3).attr("width", Math.max(1.5, x(r[0] + 1) - x(r[0]) - 0.6)).attr("height", rh - 6).attr("fill", G.ROSSO).append("title").text(`${r[0]}: il nemico principale è ${p}`));
        });
        [1860, 1900, 1940, 1980, 2020].forEach((y) => svg.append("text").attr("x", x(y)).attr("y", h - 4).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(y));
      });
      // PCI e DC su URSS e Stati Uniti
      const PP = X.partiti.filter((r) => ["PCI", "DC"].includes(r[2]) && ["Russia/URSS", "Stati Uniti"].includes(r[1]));
      const GI = X.giudice_urss_usa || {};
      const a3 = G.figura("#g-pci", {
        titolo: "Sull'URSS e sugli Stati Uniti PCI e DC parlano all'opposto, se si legge bene",
        sotto: "Tono verso il paese, 1948-1968: sopra lo zero da nemico, sotto da amico. Cerchio vuoto: conteggio delle parole vicine; cerchio pieno: giudice automatico (con il suo margine di incertezza).",
        limite: "Con le parole vicine il PCI risultava quasi neutrale verso l'URSS: era un errore della misura, che non capisce le negazioni.",
        csv: () => [["periodo", "paese", "partito", "indice_parole", "basso", "alto"]].concat(PP), nomeCSV: "pci_dc_urss_usa",
      });
      G.grafico(a3, (a, w) => {
        const righe = [];
        ["Russia/URSS", "Stati Uniti"].forEach((p) => ["PCI", "DC"].forEach((pt) => {
          const l = PP.find((r) => r[1] === p && r[2] === pt && r[0].startsWith("1948"));
          const gk = GI[p] ? GI[p][pt.toLowerCase()] : null;
          righe.push({ et: pt + " su " + (p === "Russia/URSS" ? "URSS" : p), lx: l ? l[3] : null, g: gk });
        }));
        const rh = 46, lw = 150, h = righe.length * rh + 30;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "PCI e DC su URSS e Stati Uniti");
        const x = d3.scaleLinear().domain([-1, 1]).range([lw, w - 20]);
        const g = svg.append("g").attr("class", "asse");
        [-1, -0.5, 0, 0.5, 1].forEach((v) => { g.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", 0).attr("y2", h - 22).attr("class", v === 0 ? "zero" : null); g.append("text").attr("x", x(v)).attr("y", h - 6).attr("text-anchor", "middle").text(v === -1 ? "amico" : v === 1 ? "nemico" : G.num(v, 1)); });
        righe.forEach((r, i) => {
          const y = i * rh + 20;
          const col = r.et.startsWith("PCI") ? "#E3120B" : "#1E78E6";
          svg.append("text").attr("x", lw - 10).attr("y", y + 5).attr("text-anchor", "end").attr("font-size", 14).attr("font-weight", 700).attr("fill", G.INK).text(r.et);
          if (r.g) svg.append("line").attr("x1", x(r.g[1])).attr("x2", x(r.g[2])).attr("y1", y).attr("y2", y).attr("stroke", col).attr("stroke-opacity", 0.35).attr("stroke-width", 8);
          if (r.lx != null && r.g) svg.append("line").attr("x1", x(r.lx)).attr("x2", x(r.g[0])).attr("y1", y).attr("y2", y).attr("stroke", G.GDATI).attr("stroke-dasharray", "3 3");
          if (r.lx != null) svg.append("circle").attr("cx", x(r.lx)).attr("cy", y).attr("r", 6).attr("fill", "#fff").attr("stroke", col).attr("stroke-width", 2);
          if (r.g) { svg.append("circle").attr("cx", x(r.g[0])).attr("cy", y).attr("r", 7).attr("fill", col); svg.append("text").attr("x", x(r.g[0])).attr("y", y - 12).attr("text-anchor", "middle").attr("font-size", 12.5).attr("font-weight", 700).attr("fill", col).text(G.num(r.g[0], 2)); }
        });
      });
      const GP = X.giudice_paesi;
      const a4 = G.figura("#g-giudice", {
        titolo: (() => { const ok = GP.filter((r) => r[3] > 0).map((r) => r[0]); return ok.length ? "Col giudice, il tono segue le alleanze vere per " + ok.join(" e ") : "Col giudice, il tono non segue le alleanze vere"; })(),
        sotto: "Quanto il tono letto dal giudice automatico segue lo stato vero (alleato, neutrale, in guerra): pendenza con il suo margine di incertezza, per paese",
        csv: () => [["paese", "frasi", "pendenza", "basso", "alto", "correlazione"]].concat(GP), nomeCSV: "giudice_paesi",
      });
      a4.html(G.barre(GP.map((r, i) => [G.esc(r[0]) + ` <span class="grigio">(${G.num(r[1])} frasi)</span>`, Math.max(0, r[2]), r[3] > 0]), { fmt: (v) => G.num(v, 2) }) + '<p class="fig-fonte">In evidenza i paesi in cui il margine di incertezza non tocca lo zero. Pendenze negative o nulle sono mostrate a zero.</p>');
      document.getElementById("frasi").innerHTML = X.frasi.map((f) => `<li><span class="quando"><b>${G.esc(f[0])}</b> · ${G.esc(f[1])} · ${G.data(f[2])}, ${G.ramo(f[3])}${f[4] ? ", " + G.esc(G.oratore(f[4])) : ""}</span><q>${G.frase(f[5], [f[1]])}</q></li>`).join("");
    });
  });

  function paese(area, w, p, X, media3, asse) {
    const o = X.indice[p] || {}, al = X.alleanze[p] || {};
    const h = 170, m = { t: 8, b: asse ? 18 : 6 };
    const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", p);
    const x = d3.scaleLinear().domain([1848, 2022]).range([0, w]);
    const y = d3.scaleLinear().domain([-1, 1]).range([h - m.b, m.t]);
    Object.keys(al).forEach((a) => {
      const st = al[a][1];
      if (st === "alleato" || st === "guerra") svg.append("rect").attr("x", x(+a)).attr("width", Math.max(1, x(+a + 1) - x(+a))).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", st === "alleato" ? ALLEATO : GUERRA);
    });
    svg.append("rect").attr("x", x(1922)).attr("width", x(1943) - x(1922)).attr("y", h - m.b - 4).attr("height", 4).attr("fill", "#C9CED5");
    svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", G.GRIGIO);
    const pts = G.ANNI.map((a) => [a, o[a] && (o[a][3] || 0) >= 30 ? media3(o, a) : null]);
    svg.append("path").attr("d", d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]))(pts)).attr("fill", "none").attr("stroke", G.INK).attr("stroke-width", 2);
    svg.append("text").attr("x", 2).attr("y", y(0.85)).attr("font-size", 12).attr("fill", G.GRIGIO).text("nemico");
    svg.append("text").attr("x", 2).attr("y", y(-0.92)).attr("font-size", 12).attr("fill", G.GRIGIO).text("amico");
    if (asse) [1850, 1900, 1950, 2000].forEach((a) => svg.append("text").attr("x", x(a)).attr("y", h - 3).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(a));
  }
})();
