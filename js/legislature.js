/* Indice delle legislature */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Legislature" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("base.json").then((B) => {
      const L = B.legislature;
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">50 legislature, dal Parlamento subalpino al 2022</h1>
        <p class="sommario">Trenta del Regno, poi la Consulta e la Costituente, poi diciotto della Repubblica. Per ognuna: quanto si parla, chi parla di più, i temi che salgono e scendono, le parole dell'anno. Dal 1948 anche la mappa dei partiti e le parole di destra e di sinistra.</p>
        <p class="piccolo grigio">I partiti si conoscono solo per la Camera della Repubblica. In tutto 98 archivi: quasi tutte le legislature hanno la Camera e il Senato.</p>
        <div id="g-leg"></div>
        <section class="sezione"><div class="tab-scorre" id="tab"></div></section>`;
      const area = G.figura("#g-leg", {
        titolo: (() => { const pa = (l) => l.parole / Math.max(1, l.a - l.da + 1); const mx = L.reduce((p, q) => (pa(q) > pa(p) ? q : p)); return `La ${G.esc(mx.nome)} è la più fitta: ${G.num(pa(mx) / 1e6, 1)} milioni di parole l'anno`; })(),
        sotto: "Milioni di parole in un anno, legislatura per legislatura, Camera e Senato sommati. Ogni barra è un link.",
        csv: () => [["legislatura", "da", "a", "parole", "interventi"]].concat(L.map((l) => [l.nome, l.da, l.a, l.parole, l.turni])), nomeCSV: "legislature",
      });
      G.grafico(area, (a, w) => {
        const h = w < 560 ? 200 : 260, m = { t: 24, b: 24, r: 6 };
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Parole per anno nelle legislature");
        const x = d3.scaleLinear().domain([1848, 2023]).range([0, w - m.r]);
        const pa = (l) => l.parole / Math.max(1, l.a - l.da + 1) / 1e6;
        const y = d3.scaleLinear().domain([0, d3.max(L, pa) * 1.1]).range([h - m.b, m.t]);
        const g = svg.append("g").attr("class", "asse");
        y.ticks(4).forEach((v, i, ar) => { g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null); g.append("text").attr("x", 0).attr("y", y(v) - 4).text(G.num(v) + (i === ar.length - 1 ? " milioni di parole l'anno" : "")); });
        const mx = L.reduce((p, q) => (pa(q) > pa(p) ? q : p));
        L.forEach((l) => {
          const lk = svg.append("a").attr("href", "legislatura.html?id=" + l.id);
          lk.append("title").text(`${l.nome}, ${l.da}-${l.a}`);
          lk.append("rect").attr("x", x(l.da)).attr("width", Math.max(1.5, x(l.a + 1) - x(l.da) - 1)).attr("y", y(pa(l))).attr("height", y(0) - y(pa(l))).attr("fill", l === mx ? G.ROSSO : G.NERO);
        });
        svg.append("text").attr("class", "etich").attr("x", x(mx.da)).attr("y", y(pa(mx)) - 6).attr("text-anchor", "end").attr("fill", G.ROSSO).text(`${mx.nome}: ${G.num(pa(mx), 1)}`);
        d3.range(1860, 2021, w < 560 ? 50 : 20).forEach((v) => g.append("text").attr("x", x(v)).attr("y", h - 6).attr("text-anchor", "middle").text(v));
      });
      G.tabella(document.getElementById("tab"), [
        { t: "legislatura", k: "nome", fmt: (l) => G.lLeg(l.id, l.nome), v: (l) => l.da * 10 + l.n },
        { t: "anni", k: "da", fmt: (l) => l.da + "-" + l.a, n: true },
        { t: "epoca", k: "epoca", fmt: (l) => ({ regno: "Regno", consulta: "Consulta", costituente: "Costituente", repubblica: "Repubblica" })[l.epoca] },
        { t: "interventi", k: "turni", n: true, fmt: (l) => G.num(l.turni) },
        { t: "milioni di parole", k: "parole", n: true, fmt: (l) => G.num(l.parole / 1e6, 1) },
        { t: "parole l'anno (milioni)", k: "x", n: true, v: (l) => l.parole / Math.max(1, l.a - l.da + 1), fmt: (l) => G.num(l.parole / Math.max(1, l.a - l.da + 1) / 1e6, 1) },
      ], L);
    });
  });
})();
