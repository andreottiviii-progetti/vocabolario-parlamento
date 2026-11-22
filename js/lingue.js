/* Percorso: le lingue dell'aula */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("sezioni/lingue.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([L, E, S]) => {
      G.dove([1848, 1870, "il francese, 1848-1870"]);
      const fc = L.francese.camera || {};
      const anni = Object.keys(fc).map(Number).sort();
      const amax = anni.reduce((a, b) => (fc[b] > fc[a] ? b : a), anni[0]);
      const zero = anni.find((a) => a > amax && fc[a] === 0);
      const e8 = E.elenco.find((e) => e.cod === "H8"), e9 = E.elenco.find((e) => e.cod === "H9"), e7 = E.elenco.find((e) => e.cod === "H7");
      const storie = S.storie.filter((s) => ["francese-sparisce", "inglese-sale-latino-resta", "forme-antiche-unita", "semplificazione-ottocento", "cimitero-delle-parole", "parole-piu-lunghe"].includes(s.id));
      const salto = (L.salto_unita || {});
      const sv = (r) => { const v = salto[r] || {}; const k = Object.keys(v).find((x) => /grezza/i.test(x)) || Object.keys(v)[0]; return k ? v[k] : null; };
      const sc = sv("camera"), ssn = sv("senato");
      el.innerHTML = `
        <h1 class="titolo-pagina">Le lingue dell'aula</h1>
        <p class="sommario">Nel ${amax} il ${G.num(fc[amax], 1)}% delle parole dette alla Camera è in francese; dal ${zero || 1861} è zero. Poi arriva l'inglese, il latino resta, e le forme antiche dell'italiano spariscono piano, senza salti.</p>
        <section class="griglia" style="margin-top:40px">
          <div class="c4"><div class="numero-ill">${G.num(fc[amax], 1)}%</div><p class="che-cosa">delle parole dette alla Camera nel ${amax} è in francese: lo parlano i deputati della Savoia</p>${e8 ? `<p class="piccolo">${G.lEsp("H8")} ${G.esito(e8.esito)}</p>` : ""}</div>
          <div class="c8" id="g-francese"></div>
        </section>
        <section class="sezione"><div class="testa"><h2>Il francese in aula, frase per frase</h2><span class="a-destra" id="n-fr"></span></div>
          <p class="sotto-titolo">Frasi vere dette in francese alla Camera e al Senato, 1848-1870, come le scrive il resoconto.</p><ul class="elenco-frasi" id="frasi-fr"></ul><p><button class="bottone" id="altre-fr" type="button">Altre frasi</button></p></section>
        <section class="sezione"><div id="g-specchio"></div>${e9 ? `<p class="piccolo grigio">${G.lEsp("H9")} ${G.esc(e9.numero)} ${G.esito(e9.esito)}</p>` : ""}<div class="griglia" id="contributori" style="margin-top:20px"></div></section>
        <section class="sezione"><div id="g-forme"></div>${e7 ? `<p class="piccolo grigio">${G.lEsp("H7")} ${G.esc(e7.numero)} ${G.esito(e7.esito)}</p>` : ""}</section>
        <section class="sezione griglia"><div class="c6" id="g-grafie"></div><div class="c6 fil" id="g-unita"></div></section>
        <section class="sezione"><div class="testa"><h2>Le storie</h2></div>${G.tessere(storie, 6)}</section>`;
      // francese
      const a1 = G.figura("#g-francese", {
        titolo: `Il francese crolla con la Savoia: dal ${G.num(fc[amax], 1)}% nel ${amax} a zero nel ${zero || 1861}`,
        sotto: "Quota delle parole dette in francese, Camera e Senato, 1848-1870",
        limite: "Il calo comincia prima della cessione della Savoia (1860).",
        csv: () => [["anno", "camera_%", "senato_%"]].concat(anni.map((a) => [a, fc[a], (L.francese.senato || {})[a]])), nomeCSV: "francese",
      });
      G.grafico(a1, (a, w) => {
        const fs = L.francese.senato || {};
        const pc = anni.filter((y) => y <= 1875).map((y) => [y, fc[y]]), ps = Object.keys(fs).map(Number).filter((y) => y <= 1875).sort().map((y) => [y, fs[y]]);
        G.linee(a, w, { x: [1848, 1875], y: [0, d3.max(pc, (p) => p[1]) * 1.15], h: 280, yFmt: (v) => G.num(v, 0) + "%",
          fasce: [{ da: 1860, a: 1860.99, colore: "#A9BBFF", testo: "1860: la Savoia alla Francia" }],
          serie: [{ punti: pc, colore: G.SEZ, sp: 3, etich: "Camera", piccoEtich: { x: amax, y: fc[amax], testo: amax + ": " + G.num(fc[amax], 1) + "%" } }, { punti: ps, colore: G.SEZ_S, sp: 2, tratt: "8 4", etich: "Senato" }] });
      });
      // frasi
      let mostrate = 24;
      const F = L.frasi_francese;
      const fai = () => {
        document.getElementById("frasi-fr").innerHTML = F.slice(0, mostrate).map((x) => `<li><span class="quando"><b>${G.data(x[0])}</b>, ${G.ramo(x[1])}${x[2] ? ", " + G.esc(G.oratore(x[2])) : ""}</span><q lang="fr">${G.esc(x[3])}</q></li>`).join("");
        document.getElementById("n-fr").textContent = G.num(F.length) + " frasi";
        document.getElementById("altre-fr").style.display = mostrate >= F.length ? "none" : "";
      };
      document.getElementById("altre-fr").addEventListener("click", () => { mostrate += 48; fai(); });
      fai();
      // specchio inglese / francese / latino
      const Ls = L.liste;
      const serie = (k) => { const v = (Ls[k] || {}).camera || {}; const arr = G.ANNI.map((y) => (v[y] == null ? null : v[y])); return G.media3(arr); };
      const a2 = G.figura("#g-specchio", {
        titolo: "Il francese se ne va, l'inglese arriva, il latino resta",
        sotto: "Parole francesi e inglesi identiche all'originale ed espressioni latine, volte per milione di parole alla Camera, media di tre anni, 1848-2022",
        limite: "Le liste sono scritte prima di contare; le parole inglesi sono solo quelle identiche all'originale.",
        csv: () => [["anno", "inglese", "francese", "latino"]].concat(G.ANNI.map((y, i) => [y, serie("h9_en_identici")[i], serie("h9_fr_identici")[i], serie("h9_la_frasi")[i]])), nomeCSV: "lingue_straniere",
      });
      G.grafico(a2, (a, w) => {
        const en = serie("h9_en_identici"), fr = serie("h9_fr_identici"), la = serie("h9_la_frasi");
        const mx = d3.max([].concat(en, fr, la), (v) => v || 0);
        G.linee(a, w, { x: [1848, 2022], y: [0, mx * 1.1], h: w < 560 ? 240 : 320, unita: "per milione",
          serie: [{ punti: G.ANNI.map((y, i) => [y, en[i]]), colore: G.SERIE[0], sp: 3, etich: "inglese" }, { punti: G.ANNI.map((y, i) => [y, fr[i]]), colore: G.SERIE[1], sp: 2, etich: "francese" }, { punti: G.ANNI.map((y, i) => [y, la[i]]), colore: G.SERIE[2], sp: 2, etich: "latino" }] });
      });
      const C = L.contributori;
      const per = Object.keys(C).filter((k) => k.startsWith("en_tutti|"));
      document.getElementById("contributori").innerHTML = per.slice(0, 4).map((k, i) => `<div class="c3${i ? " fil" : ""}"><h3 class="titolo-piccolo">Inglese, ${G.esc(k.split("|")[1])}</h3><ul class="elenco-n">${C[k].slice(0, 10).map((x) => `<li><span>${G.lParola(G.norma(x[0]), x[0])}</span><span>${G.num(x[1])}</span></li>`).join("")}</ul></div>`).join("");
      // linee di vita delle forme antiche
      const FO = L.forme.filter((f) => f[3]).sort((a, b) => a[3] - b[3]);
      const med = FO.length ? FO[Math.floor(FO.length / 2)][3] : null;
      const a3 = G.figura("#g-forme", {
        titolo: `Le forme antiche si dimezzano una per volta: metà entro il ${med}`,
        sotto: "Per ogni forma antica dell'italiano, la linea va dal 1848 all'anno in cui la sua frequenza si dimezza; il punto è l'anno di massimo. Camera e Senato.",
        limite: "Nessun gruppo di forme sparisce negli stessi anni: le ondate attese nel 1912-19 non ci sono.",
        csv: () => [["forma", "volte", "anno_massimo", "anno_dimezzamento"]].concat(FO), nomeCSV: "forme_antiche",
      });
      G.grafico(a3, (a, w) => {
        const rh = 18, lw = 120, h = FO.length * rh + 26;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Linee di vita delle forme antiche");
        const x = d3.scaleLinear().domain([1848, 1960]).range([lw, w - 20]);
        const g = svg.append("g").attr("class", "asse");
        [1860, 1880, 1900, 1920, 1940, 1960].forEach((v) => { g.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", 0).attr("y2", h - 20); g.append("text").attr("x", x(v)).attr("y", h - 4).attr("text-anchor", "middle").text(v); });
        FO.forEach((f, i) => {
          const y = i * rh + 10;
          svg.append("a").attr("href", "parola.html?p=" + G.norma(f[0])).append("text").attr("x", lw - 8).attr("y", y + 4).attr("text-anchor", "end").attr("font-size", 13).attr("fill", G.INK).text(f[0]);
          svg.append("line").attr("x1", x(1848)).attr("x2", x(Math.min(1960, f[3]))).attr("y1", y).attr("y2", y).attr("stroke", G.SEZ_M).attr("stroke-width", 6);
          svg.append("circle").attr("cx", x(Math.min(1960, f[2]))).attr("cy", y).attr("r", 4).attr("fill", G.SEZ);
          svg.append("text").attr("x", x(Math.min(1960, f[3])) + 6).attr("y", y + 4).attr("font-size", 12).attr("fill", G.GRIGIO).text(f[3]);
        });
      });
      // grafie antiche
      const gr = L.grafie;
      const a4 = G.figura("#g-grafie", {
        titolo: "Le grafie antiche scendono regolari: quistione, uffizio e le altre",
        sotto: "Quota della forma antica sul totale delle due forme (antica e moderna), Camera, anno per anno",
        csv: () => [["anno", "quota_antica_%"]].concat(Object.entries(gr)), nomeCSV: "grafie_antiche",
      });
      G.grafico(a4, (a, w) => {
        const p = Object.keys(gr).map(Number).sort().map((y) => [y, gr[y]]);
        G.linee(a, w, { x: [1848, d3.max(p, (q) => q[0])], y: [0, 100], h: 260, yFmt: (v) => G.num(v, 0) + "%", serie: [{ punti: p, colore: G.SEZ, sp: 3, etich: "forme antiche" }] });
      });
      // il gradino dell'Unita'
      const wps = (L.regno.wps || {});
      const a5 = G.figura("#g-unita", {
        titolo: sc ? `All'Unità la frase perde ${G.num(-sc[0], 1)} parole di colpo alla Camera${ssn ? ", " + G.num(-ssn[0], 1) + " al Senato" : ""}, poi resta quasi ferma` : "Le frasi del Regno",
        sotto: "Parole per frase, Camera (piena) e Senato (tratteggio), 1848-1922. La riga verticale è il 1861.",
        limite: "Il gradino non è lo scanner: tenendo ferma la quota di errori di lettura la stima non cambia. Dopo il 1861 la Camera non ha una tendenza che regga a tutti i controlli.",
        csv: () => [["anno", "camera", "senato"]].concat(Object.keys(wps.camera || {}).map((y) => [y, (wps.camera || {})[y], (wps.senato || {})[y]])), nomeCSV: "frasi_regno",
      });
      G.grafico(a5, (a, w) => {
        const pc = Object.keys(wps.camera || {}).map(Number).sort().map((y) => [y, wps.camera[y]]), ps = Object.keys(wps.senato || {}).map(Number).sort().map((y) => [y, wps.senato[y]]);
        const v = pc.concat(ps).map((p) => p[1]).filter((x) => x != null);
        G.linee(a, w, { x: [1848, 1922], y: [Math.floor(d3.min(v) - 2), Math.ceil(d3.max(v) + 2)], h: 260, fasce: [{ da: 1860.9, a: 1861.1, colore: G.SEZ, testo: "1861" }],
          serie: [{ punti: pc, colore: G.SEZ, sp: 2.5, etich: "Camera" }, { punti: ps, colore: G.SEZ_S, sp: 2, tratt: "8 4", etich: "Senato" }], unita: "parole per frase" });
      });
    });
  });
})();
