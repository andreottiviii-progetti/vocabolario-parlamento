/* Percorso: il fascismo in aula */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("sezioni/fascismo.json"), G.carica("base.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([F, B, E, S]) => {
      G.dove([1922, 1943, "il fascismo, 1922-1943"]);
      const cam = F.periodi.filter((p) => p.ramo === "camera");
      const p0 = cam[0], p1 = cam.find((p) => /regime/i.test(p.periodo)) || cam[cam.length - 1];
      const legs = F.legislature.map((id) => B.legislature.find((l) => l.id === id)).filter(Boolean);
      const storie = S.storie.filter((s) => s.filone === "Fascismo");
      const esp = E.elenco.filter((e) => e.filone === "Fascismo");
      const h18c = E.elenco.find((e) => e.cod === "H18c");
      el.innerHTML = `
        <h1 class="titolo-pagina">Il fascismo in aula</h1>
        <p class="sommario">Dal ${G.num(p0.dissenso_100, 1)} al ${G.num(p1.dissenso_100, 1)} ogni cento interventi: alla Camera il dissenso annotato dallo stenografo sparisce tra il periodo liberale e il regime. Le parole del regime si moltiplicano, il «Lei» lascia il posto al «Voi», le sedute si svuotano di oratori.</p>
        <section class="griglia" style="margin-top:14px">
          <div class="c4"><div class="numero-ill">${G.num(p0.dissenso_100, 0)}→${G.num(p1.dissenso_100, 0)}</div><p class="che-cosa">annotazioni di dissenso ogni cento interventi alla Camera, ${G.esc(p0.periodo)} e ${G.esc(p1.periodo)}</p><h2 class="rubrica">Vedi anche: le storie</h2>${G.tessere(storie, 8).replace('class="rimandi"', 'class="rimandi una"')}</div>
          <div class="c8"><div id="scena-sp"></div><div id="bottoni-sp"></div></div>
        </section>
        <section class="sezione"><div id="g-termini"></div>${h18c ? `<p class="piccolo grigio">${G.lEsp("H18c")} ${G.esc(h18c.numero)} ${G.esito(h18c.esito)}</p>` : ""}</section>
        <section class="sezione griglia"><div class="c6" id="g-lei"></div><div class="c6 fil" id="g-oratori"></div></section>
        <section class="sezione"><div class="testa"><h2>Le parole del regime, anno per anno</h2></div><p class="sotto-titolo">Volte per milione di parole, Camera e Senato insieme. Ogni curva ha la sua scala.</p><div class="multipli" id="multipli"></div></section>
        <section class="sezione"><div class="testa"><h2>Le cinque legislature del regime</h2></div><div class="voci-riga" id="legs"></div></section>
        <section class="sezione"><div class="testa"><h2>Gli esperimenti</h2></div><div class="tab-scorre"><table class="fitta"><thead><tr><th>codice</th><th>esperimento</th><th>esito</th><th>il numero</th></tr></thead><tbody>${esp.map((e) => `<tr><td>${G.lEsp(e.cod)}</td><td>${G.esc(e.titolo)}</td><td>${G.esito(e.esito)}</td><td>${G.esc(e.numero)}</td></tr>`).join("")}</tbody></table></div></section>`;
      G.Scena.primeParole(["antifascismo", "camerati", "autarchia", "razzismo", "littorio"]).then((PP) => {
        const scSP = G.Scena.specchio("#scena-sp", F, PP);
        G.bottoniStati("#bottoni-sp", scSP, ["1913-1922", "arriva il regime", "1913-1938", "con le parole"]);
      });
      const c = F.colonne, sc = F.serie.camera || {}, ss = F.serie.senato || {};
      const col = (k) => c.indexOf(k);
      const punti = (S_, k) => Object.keys(S_).map(Number).sort().map((a) => [a, S_[a][col(k)]]);
      const T = F.termini.filter((t) => t.ramo === "camera" && t.prima != null && t.regime != null).sort((a, b) => b.regime - a.regime).slice(0, 22);
      const a2 = G.figura("#g-termini", {
        titolo: `Le parole del regime: ${T.filter((t) => t.regime > t.prima).length} su ${T.length} si dicono di più nel 1927-38 che nel 1919-22`,
        sotto: "Volte per milione di parole alla Camera: cerchio vuoto nel 1919-22, cerchio pieno nel 1927-38. Scala logaritmica.",
        csv: () => [["parola", "anno_massimo", "massimo", "media_1919_22", "media_1927_38"]].concat(T.map((t) => [t.lemma, t.anno, t.max, t.prima, t.regime])), nomeCSV: "parole_regime",
      });
      G.grafico(a2, (a, w) => {
        const rh = 22, lw = 150, h = T.length * rh + 30;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Parole del regime");
        const x = d3.scaleLog().domain([0.5, d3.max(T, (t) => Math.max(t.regime, t.prima)) * 1.3]).range([lw, w - 60]);
        const g = svg.append("g").attr("class", "asse");
        [1, 10, 100, 1000].filter((v) => v < x.domain()[1]).forEach((v) => { g.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", 0).attr("y2", h - 20); g.append("text").attr("x", x(v)).attr("y", h - 4).attr("text-anchor", "middle").text(G.num(v)); });
        T.forEach((t, i) => {
          const y = i * rh + 12, xp = x(Math.max(0.5, t.prima)), xr = x(Math.max(0.5, t.regime));
          svg.append("a").attr("href", "parola.html?p=" + G.norma(t.lemma)).append("text").attr("x", lw - 8).attr("y", y + 4).attr("text-anchor", "end").attr("font-size", 13.5).attr("fill", G.INK).text(t.lemma);
          svg.append("line").attr("x1", xp).attr("x2", xr).attr("y1", y).attr("y2", y).attr("stroke", "#5B6470").attr("stroke-width", 3);
          svg.append("circle").attr("cx", xp).attr("cy", y).attr("r", 4.5).attr("fill", "#fff").attr("stroke", G.INK).attr("stroke-width", 1.5);
          svg.append("circle").attr("cx", xr).attr("cy", y).attr("r", 5).attr("fill", G.ROSSO);
          svg.append("text").attr("x", Math.max(xp, xr) + 8).attr("y", y + 4).attr("font-size", 12.5).attr("fill", G.GRIGIO).text(G.num(t.regime, t.regime < 10 ? 1 : 0));
        });
      });
      const a3 = G.figura("#g-lei", {
        titolo: "Il «Lei» cala, il «Voi» sale", sotto: "Volte per milione di parole dei deputati e dei senatori: Lei (linea piena) e Voi (tratteggio), Camera e Senato, 1913-1943",
        limite: "Nel 1938-40 una parte dei «lei» sono errori dello scanner.", csv: () => [["anno", "lei_camera", "voi_camera"]].concat(punti(sc, "e_lei_dep_pm").map((p, i) => [p[0], p[1], punti(sc, "e_voi_dep_pm")[i][1]])), nomeCSV: "lei_voi",
      });
      G.grafico(a3, (a, w) => {
        const s1 = punti(sc, "e_lei_dep_pm"), s2 = punti(sc, "e_voi_dep_pm"), s3 = punti(ss, "e_lei_dep_pm"), s4 = punti(ss, "e_voi_dep_pm");
        const mx = d3.max([].concat(s1, s2, s3, s4), (p) => p[1] || 0);
        G.linee(a, w, { x: [1913, 1943], y: [0, mx * 1.1], h: 260, fasce: [{ da: 1938, a: 1940.9, colore: "#22252B" }],
          serie: [{ punti: s1, colore: G.ROSSO, sp: 3, etich: "Lei, Camera" }, { punti: s2, colore: "#F2F3F5", sp: 2, tratt: "6 4", etich: "Voi, Camera" }, { punti: s3, colore: G.GDATI, sp: 2, etich: "Lei, Senato" }, { punti: s4, colore: G.GDATI, sp: 2, tratt: "6 4", etich: "Voi, Senato" }], unita: "per milione" });
      });
      const a4 = G.figura("#g-oratori", {
        titolo: "Le sedute si svuotano di oratori", sotto: "Oratori per seduta, Camera, 1913-1943", csv: () => [["anno", "oratori_per_seduta"]].concat(punti(sc, "oratori_per_seduta")), nomeCSV: "oratori_per_seduta",
      });
      G.grafico(a4, (a, w) => {
        const s1 = punti(sc, "oratori_per_seduta");
        G.linee(a, w, { x: [1913, 1943], y: [0, d3.max(s1, (p) => p[1] || 0) * 1.1], h: 260, fasce: [{ da: 1926, a: 1943, colore: "#22252B" }], serie: [{ punti: s1, colore: G.ROSSO, sp: 3, etich: "oratori" }], unita: "per seduta" });
      });
      const PR = ["duce", "camerati", "fascista", "corporativo", "autarchia", "impero", "littorio", "razza", "regime", "rivoluzione"];
      Promise.all(PR.map((w) => G.curvaParola(w))).then((cc) => {
        cc = cc.filter(Boolean);
        document.getElementById("multipli").innerHTML = cc.map((c, i) => `<div class="mul"><h4><a href="parola.html?p=${c.w}">${G.esc(c.forma)}</a></h4><div class="tot">${G.num(c.tot)} volte</div><div id="fm${i}"></div></div>`).join("");
        cc.forEach((c, i) => G.grafico("#fm" + i, (a, w) => G.mini(a, w, c.pm.m, { label: c.forma, asse: i < 5, colore: "#3A3E46", linea: "#F2F3F5" })));
      });
      document.getElementById("legs").innerHTML = legs.map((l) => `<p class="voce"><a class="lemma" href="legislatura.html?id=${l.id}">${G.esc(l.nome)}</a> <span class="anni">[${l.da}-${l.a}]</span><br>${G.num(l.parole / 1e6, 1)} milioni di parole, ${G.num(l.turni)} interventi</p>`).join("");
    });
  });
})();
