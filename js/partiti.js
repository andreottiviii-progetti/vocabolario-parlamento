/* Indice dei partiti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Partiti" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("partiti/indice.json").then((IX) => {
      const P = IX.partiti;
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${P.length} partiti, ${G.num(G.conti.schede_partito)} schede: a chi somiglia ognuno, legislatura per legislatura</h1>
        <p class="sommario">Ogni partito è misurato sulle parole che usa alla Camera, dal 1948 al 2022: dove sta tra sinistra e destra, a quale altro partito somiglia, quali parole guadagna e quali perde a ogni legislatura, come cambia quando passa dal governo all'opposizione.</p>
        <p class="piccolo grigio">«Parole guadagnate e perse» sono misurate rispetto al resto dell'aula: una parola può risultare persa anche se il partito la dice quanto prima, quando gli altri la dicono di più. La quota di parole non somma a cento perché mancano i gruppi minori.</p>
        <div id="g-linee"></div>
        <section class="sezione"><div class="testa"><h2>Tutti i partiti</h2></div><div class="tab-scorre" id="tab"></div></section>`;
      const area = G.figura("#g-linee", {
        titolo: (() => {
          const L = IX.linee, pci = L["PCI-PD"] || [];
          const d = pci.map((p) => { const altri = Object.keys(L).filter((f) => f !== "PCI-PD").map((f) => L[f].find((q) => q[3] === p[3])).filter(Boolean); return altri.length ? [p[0], d3.min(altri, (q) => Math.abs(q[1] - p[1]))] : null; }).filter(Boolean);
          if (!d.length) return "La lingua delle famiglie di partiti, 1948-2022";
          const mx = d.reduce((u, v) => (v[1] > u[1] ? v : u)), mn = d.reduce((u, v) => (v[1] < u[1] ? v : u));
          return `La lingua del PCI-PD è più lontana dal partito più vicino nel ${Math.floor(mx[0])}, più vicina nel ${Math.floor(mn[0])}`;
        })(),
        sotto: "Posizione di ogni famiglia di partiti ricavata dalle parole, Camera, 1948-2022: in basso le parole della sinistra, in alto quelle della destra. Più due linee sono vicine, più le famiglie usano le stesse parole.",
        limite: "La posizione viene dalle parole, non dai voti. La mappa parte dal 1948.",
        csv: () => [["famiglia", "anno", "posizione", "scheda"]].concat([].concat(...Object.entries(IX.linee).map(([f, l]) => l.map((p) => [f, p[0], p[1], p[2]])))), nomeCSV: "linee_famiglie",
      });
      G.grafico(area, (a, w) => {
        const L = IX.linee, tutti = [].concat(...Object.values(L)).map((p) => p[1]), ext = d3.extent(tutti);
        const r = G.linee(a, w, {
          x: [1948, 2022], y: [ext[0] - 0.005, ext[1] + 0.005], yTicks: [], h: w < 560 ? 260 : 360, m: { r: w < 560 ? 60 : 130 }, etichSopra: false,
          serie: Object.keys(L).filter((f) => f !== "PCI-PD").map((f) => ({ punti: L[f].map((p) => [p[0], p[1]]), colore: G.GDATI, sp: 1, etich: f })).concat([{ punti: L["PCI-PD"].map((p) => [p[0], p[1]]), colore: G.ROSSO, sp: 2.5, punto: 2.5, etich: "PCI, poi PDS, DS e PD" }]),
        });
        r.svg.append("text").attr("x", 0).attr("y", r.y(ext[1]) + 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di destra");
        r.svg.append("text").attr("x", 0).attr("y", r.y(ext[0]) - 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di sinistra");
      });
      const R = (n) => G.romano(n);
      G.tabella(document.getElementById("tab"), [
        { t: "partito", k: "nome", fmt: (p) => G.lPartito(p.id, p.nome) },
        { t: "famiglia", k: "famiglia" },
        { t: "legislature", k: "legs", fmt: (p) => p.legs.map((l) => `<a href="legislatura.html?id=repubblica-${l}">${R(l)}</a>`).join(" "), v: (p) => p.legs[0] },
        { t: "anni", k: "da", n: true, fmt: (p) => p.da + "-" + Math.min(2022, p.a) },
        { t: "quota massima delle parole", k: "quota_max", n: true, fmt: (p) => G.pct(p.quota_max) },
      ], P);
    });
  });
})();
