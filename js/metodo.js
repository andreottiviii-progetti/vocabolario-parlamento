/* Pagina del metodo: testata, piede, calendario della trascrizione */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Metodo e limiti" });
    G.piede();
    const area = G.figura("#g-calendario", {
      titolo: "Alla Camera il resoconto cambia regole nove volte, al Senato cinque",
      sotto: "Anni in cui cambia il modo di trascrivere, Camera e Senato, 1848-2022",
      csv: () => [["ramo", "anno"]].concat(G.TRASCR.camera.map((a) => ["camera", a])).concat(G.TRASCR.senato.map((a) => ["senato", a])), nomeCSV: "calendario_trascrizione",
    });
    G.grafico(area, (a, w) => {
      const h = 96, m = { l: 60, r: 10 };
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Calendario dei cambi di trascrizione");
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      [["Camera", G.TRASCR.camera, 24], ["Senato", G.TRASCR.senato, 60]].forEach(([n, anni, y]) => {
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y).attr("stroke", G.RIGA);
        svg.append("text").attr("x", 0).attr("y", y + 4).attr("class", "etich").text(n);
        anni.forEach((an, i) => {
          svg.append("line").attr("x1", x(an)).attr("x2", x(an)).attr("y1", y - 8).attr("y2", y + 8).attr("stroke", G.NERO).attr("stroke-width", 2);
          if (w > 700 || i % 2 === 0) svg.append("text").attr("x", x(an)).attr("y", y - 11).attr("text-anchor", "middle").attr("font-size", 12).text(an);
        });
      });
      [1848, 1900, 1950, 2022].forEach((an) => svg.append("text").attr("x", x(an)).attr("y", h - 2).attr("text-anchor", an === 1848 ? "start" : an === 2022 ? "end" : "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(an));
    });
  });
})();
