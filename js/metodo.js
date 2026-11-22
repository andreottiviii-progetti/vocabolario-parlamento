/* Pagina del metodo: testata, piede, calendario della trascrizione */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Metodo e limiti" });
    G.piede();
    const B = G.B || { trascrizione: { camera: [], senato: [], scrittura: { camera: [], senato: [] }, incerte: { camera: [], senato: [] } } };
    const T = B.trascrizione;
    const area = G.figura("#g-calendario", {
      titolo: `Al Senato il resoconto cambia di colpo ${T.senato.length === 2 ? "due volte" : T.senato.length + " volte"}; alla Camera nessuna data è sicura`,
      sotto: "Calendario rivisto, Camera e Senato, 1948-2022. Barra piena: cambio di trascrizione provato. Cerchio: cambio di scrittura (punteggiatura e grafie). Cerchio grigio: data incerta.",
      csv: () => [["ramo", "anno", "tipo"]].concat([].concat(...["camera", "senato"].map((r) => T[r].map((a) => [r, a, "provato"]).concat(T.scrittura[r].map((a) => [r, a, "scrittura"])).concat(T.incerte[r].map((a) => [r, a, "incerto"]))))), nomeCSV: "calendario_trascrizione",
    });
    G.grafico(area, (a, w) => {
      const h = 110, m = { l: 64, r: 12 };
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Calendario dei cambi di trascrizione");
      const x = d3.scaleLinear().domain([1946, 2022]).range([m.l, w - m.r]);
      [["Camera", "camera", 30], ["Senato", "senato", 74]].forEach(([n, k, y]) => {
        svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y).attr("y2", y).attr("stroke", G.RIGA);
        svg.append("text").attr("x", 0).attr("y", y + 4).attr("class", "etich").attr("fill", G.INK).text(n);
        T.incerte[k].forEach((an) => svg.append("circle").attr("cx", x(an)).attr("cy", y).attr("r", 4).attr("fill", "#fff").attr("stroke", G.GDATI).attr("stroke-width", 1.5));
        T.scrittura[k].forEach((an) => { svg.append("circle").attr("cx", x(an)).attr("cy", y).attr("r", 5).attr("fill", "#fff").attr("stroke", G.NERO).attr("stroke-width", 2); svg.append("text").attr("x", x(an)).attr("y", y + 20).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.INK).text(an); });
        T[k].forEach((an) => { svg.append("line").attr("x1", x(an)).attr("x2", x(an)).attr("y1", y - 10).attr("y2", y + 10).attr("stroke", G.NERO).attr("stroke-width", 4); svg.append("text").attr("x", x(an)).attr("y", y - 14).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).attr("fill", G.INK).text(an); });
      });
      [1950, 1970, 1990, 2010].forEach((an) => svg.append("text").attr("x", x(an)).attr("y", h - 2).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(an));
    });
  });
})();
