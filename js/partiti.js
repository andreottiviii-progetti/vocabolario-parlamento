/* Indice dei partiti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Partiti" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("partiti/indice.json"), G.carica("partiti/distanze.json")]).then(([IX, DI]) => {
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
      // Tav. I: la distanza tra le parole di PCI e DC anno per anno, con DC e PSI come confronto (dati in partiti/distanze.json)
      const S = DI.serie, dcpci = S.find((s) => s.coppia === "DC-PCI"), dcpsi = S.find((s) => s.coppia === "DC-PSI");
      const ultimo = (s) => s.punti.filter((p) => p[1] != null).slice(-1)[0][0];
      const area = G.figura("#g-linee", {
        titolo: `Negli anni del compromesso storico la distanza tra le parole di PCI e DC si dimezza: da 100 a ${G.num(DI.legislature["7"][0], 0)}, poco sopra quella tra DC e PSI nel 1962-63 (${G.num(DI.dc_psi_1962_63, 0)}), alla vigilia del primo governo con i socialisti`,
        sotto: `Quanto si distinguono dalle parole i deputati di due partiti, alla Camera, ${dcpci.punti[0][0]}-${Math.max(ultimo(dcpci), ultimo(dcpsi))}. 0 vuol dire che usano le stesse parole e non si capisce chi è dell'uno o dell'altro; 100 è la distanza tra DC e PCI negli anni della guerra fredda (1953-68). Ogni punto è la media di tre anni. Le bande segnano due fasi del PCI.`,
        limite: "La distanza viene dalle 5.000 parole più comuni, non dai voti; il valore di ogni singolo anno è nei dati del grafico. Negli anni delle elezioni conta la parte con più deputati. Nel 1969-71 socialisti e socialdemocratici sono un partito solo: la coppia DC e PSI manca. Nel 1979 e nel 1987 cambia il modo di trascrivere i resoconti. La DC finisce nel 1994: per DS e PD non c'è un confronto uguale.",
        csv: () => [["coppia", "anno", "distanza_media_tre_anni", "distanza_anno", "oratori_DC", "oratori_altro_partito", "distinguibilita_corretta"]].concat(...S.map((s) => s.punti.map((p) => [s.coppia, p[0], p[2], p[1], p[3], p[4], p[5]]))),
        nomeCSV: "distanza_pci_dc",
      });
      G.grafico(area, (a, w) => {
        const stretto = w < 560, m3 = (s) => s.punti.map((p) => [p[0], p[2]]);
        const fasi = [[1976.5, 1979.1, "compromesso storico"], [1989.9, 1991.1, "svolta: PCI → PDS"]];
        G.linee(a, w, {
          x: [1948, 1993], y: [-12, 135], yTicks: [0, 50, 100], yFmt: (v) => G.num(v, 0), h: stretto ? 280 : 360, m: { r: stretto ? 74 : 110, t: stretto ? 40 : 30 },
          etichSopra: false, legenda: false, xPasso: stretto ? 10 : 5, unitaLettura: "media di tre anni",
          fasce: fasi.map((f) => ({ da: f[0], a: f[1] })),
          serie: [{ punti: m3(dcpsi), colore: G.FAMIGLIA.PSI, sp: 1.5, etich: "PSI e DC" }, { punti: m3(dcpci), colore: G.ROSSO, sp: 2.5, etich: "PCI e DC" }],
          dopo: (svg, x, y, h, m) => {
            // i nomi delle fasi sopra il disegno; al telefono su due righe, ognuno finisce dove finisce la sua banda
            fasi.forEach((f, k) => {
              const xt = stretto ? x(f[1]) : x(f[0]), riga = stretto ? k * 15 : 0;
              svg.append("text").attr("x", xt).attr("y", m.t - 6 - riga).attr("text-anchor", stretto ? "end" : "start").attr("class", "nota-t").attr("font-weight", 700).text(f[2]);
              svg.append("line").attr("x1", xt).attr("x2", xt).attr("y1", m.t - 18 - riga).attr("y2", m.t).attr("stroke", G.GRIGIO).attr("stroke-width", 1);
            });
            // il punto di riferimento: DC e PSI nel 1963, quando il PSI entra al governo (contesto storico, non dato del progetto)
            const p63 = dcpsi.punti.find((p) => p[0] === 1963);
            if (p63 && p63[2] != null) {
              svg.append("circle").attr("cx", x(1963)).attr("cy", y(p63[2])).attr("r", 3.5).attr("fill", G.FAMIGLIA.PSI).attr("stroke", "#fff").attr("stroke-width", 1.5);
              G.nota(svg, x(1963), y(p63[2]), x(1963), y(p63[2]) + 34, "1963: il PSI entra al governo", { maxch: stretto ? 18 : 40, anchor: stretto ? "end" : "start" });
            }
          },
        });
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
