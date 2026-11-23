/* Indice dei partiti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Partiti" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("partiti/indice.json"), G.carica("partiti/traiettorie.json")]).then(([IX, TR]) => {
      const P = IX.partiti;
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${P.length} partiti, ${G.num(G.conti.schede_partito)} schede: a chi somiglia ognuno, legislatura per legislatura</h1>
        <p class="sommario">Ogni partito è misurato sulle parole che usa alla Camera, dal 1948 al 2022: dove sta tra sinistra e destra, a quale altro partito somiglia, quali parole guadagna e quali perde a ogni legislatura, come cambia quando passa dal governo all'opposizione.</p>
        <p class="piccolo grigio">«Parole guadagnate e perse» sono misurate rispetto al resto dell'aula: una parola può risultare persa anche se il partito la dice quanto prima, quando gli altri la dicono di più. La quota di parole non somma a cento perché mancano i gruppi minori.</p>
        <section class="sezione"><div class="testa"><h2>A chi somiglia la lingua di ogni partito</h2></div>
          <ul class="frasi-griglia" id="frasi-griglia"></ul>
          <p class="sotto-titolo">In ogni casella il partito di un'altra famiglia che parla più simile, con la legislatura in cui lo fa e la vicinanza: 0 vuol dire nessuna somiglianza; intorno a 1 è la vicinanza tipica di un partito con sé stesso nella legislatura dopo. Il colore è quello della famiglia del partito nella casella. Camera, 1948-2022; passa sopra una casella per la frase intera.</p>
          <div id="g-griglia"></div>
          <p class="fig-fonte">Fonte: resoconti stenografici di Camera e Senato. La somiglianza confronta le parole che ogni partito usa più o meno del resto dell'aula nella sua legislatura; si cercano i cinque più simili in tutte le legislature, esclusa la propria famiglia. Viene dalle parole, non dai voti.</p></section>
        <section class="sezione"><div id="g-linee"></div></section>
        <section class="sezione"><div class="testa"><h2>Tutti i partiti</h2></div><div class="tab-scorre" id="tab"></div></section>`;
      G.griglia("#g-griglia").then((D) => { if (D) document.getElementById("frasi-griglia").innerHTML = G.frasiGriglia(D).map((f) => `<li>${f}</li>`).join(""); });
      const area = G.figura("#g-linee", {
        titolo: (() => {
          const L = IX.linee, pci = L["PCI-PD"] || [];
          const d = pci.map((p) => { const altri = Object.keys(L).filter((f) => f !== "PCI-PD").map((f) => L[f].find((q) => q[3] === p[3])).filter(Boolean); return altri.length ? [p[0], d3.min(altri, (q) => Math.abs(q[1] - p[1]))] : null; }).filter(Boolean);
          if (!d.length) return "La lingua delle famiglie di partiti, 1948-2022";
          const mx = d.reduce((u, v) => (v[1] > u[1] ? v : u)), mn = d.reduce((u, v) => (v[1] < u[1] ? v : u));
          return `La lingua del PCI-PD è più lontana dal partito più vicino nel ${Math.floor(mx[0])}, più vicina nel ${Math.floor(mn[0])}`;
        })(),
        sotto: "Posizione di ogni famiglia di partiti ricavata dalle parole, Camera, 1948-2022: in basso le parole della sinistra, in alto quelle della destra. Più due linee sono vicine, più le famiglie usano le stesse parole. Le bande segnano le fasi del PCI-PD: il compromesso storico, la svolta del 1989-91 da PCI a PDS, i DS, il PD.",
        limite: "La posizione viene dalle parole, non dai voti. La mappa parte dal 1948.",
        csv: () => [["famiglia", "anno", "posizione", "scheda"]].concat([].concat(...Object.entries(IX.linee).map(([f, l]) => l.map((p) => [f, p[0], p[1], p[2]])))), nomeCSV: "linee_famiglie",
      });
      G.grafico(area, (a, w) => {
        const L = IX.linee, tutti = [].concat(...Object.values(L)).map((p) => p[1]), ext = d3.extent(tutti);
        const r = G.linee(a, w, {
          x: [1948, 2022], y: [ext[0] - 0.005, ext[1] + 0.005], yTicks: [], h: w < 560 ? 260 : 360, m: { r: w < 560 ? 60 : 130 }, etichSopra: false,
          serie: Object.keys(L).filter((f) => f !== "PCI-PD").map((f) => ({ punti: L[f].map((p) => [p[0], p[1]]), colore: G.GDATI, sp: 1, etich: f })).concat([{ punti: L["PCI-PD"].map((p) => [p[0], p[1]]), colore: G.ROSSO, sp: 2.5, punto: 2.5, etich: "PCI, poi PDS, DS e PD" }]),
        });
        // le fasi del PCI-PD (contesto storico, non dati del progetto): bande chiare con il nome scritto
        [[1976, 1979.9, "compromesso storico"], [1989, 1991.9, "svolta: PCI → PDS"], [1998, 2007.4, "DS"], [2007.8, 2022.9, "PD"]].forEach((f, k) => {
          const x0 = r.x(f[0]), x1 = r.x(f[1]);
          r.svg.insert("rect", ":first-child").attr("x", x0).attr("y", r.m.t).attr("width", Math.max(2, x1 - x0)).attr("height", r.h - r.m.t - r.m.b).attr("fill", k % 2 ? "#F1F2F4" : "#E8EAED");
          r.svg.append("text").attr("x", x0 + 3).attr("y", r.m.t + 12 + (k % 2) * 13).attr("font-size", 12).attr("font-weight", 700).attr("fill", G.INK).attr("class", "alone").text(f[2]);
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
