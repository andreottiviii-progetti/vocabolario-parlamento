/* Indice degli anni */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Anni" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("anni.json"), G.carica("base.json")]).then(([A, B]) => {
      el.innerHTML = `<h1 class="titolo-pagina">175 anni, uno per pagina</h1>
        <p class="sommario">Per ogni anno dal 1848 al 2022: le cinque parole dette molto più del solito, i temi che occupano l'aula, le parole che in quell'anno toccano il massimo, la legislatura in corso. Dal giugno 1941 al 1945 le pagine sono vuote: non ci sono resoconti.</p>
        <div id="g-anni"></div>
        <section class="sezione"><div class="testa"><h2>La parola di ogni anno</h2></div><p class="sotto-titolo">La parola detta molto più del solito in quell'anno, tra quelle di almeno cinque lettere. Restano alcuni residui dello scanner e del resoconto.</p><div class="anni-blocco" id="blocco"></div></section>`;
      const area = G.figura("#g-anni", {
        titolo: (() => { let k = 0; B.tot[0].forEach((v, i) => { if (v + B.tot[1][i] > B.tot[0][k] + B.tot[1][k]) k = i; }); return `Il ${1848 + k} è l'anno più fitto: ${G.num((B.tot[0][k] + B.tot[1][k]) / 1e6, 1)} milioni di parole`; })(),
        sotto: "Milioni di parole contate in un anno, Camera e Senato insieme (linea scura) e la sola Camera (linea grigia), 1848-2022: interventi di parlamentari, ministri e relatori",
        limite: "Nel 1941-45 non ci sono sedute.",
        csv: () => [["anno", "parole_camera", "parole_senato"]].concat(G.ANNI.map((a, i) => [a, B.tot[0][i], B.tot[1][i]])), nomeCSV: "parole_per_anno",
      });
      G.grafico(area, (a, w) => {
        // il titolo parla del totale: la linea scura è Camera e Senato insieme, con l'anno più fitto in rosso; la grigia la sola Camera
        const tot = G.ANNI.map((y, i) => (B.tot[0][i] || B.tot[1][i] ? ((B.tot[0][i] || 0) + (B.tot[1][i] || 0)) / 1e6 : null));
        const k = d3.maxIndex(tot);
        const r = G.linee(a, w, { x: [1848, 2022], y: [0, d3.max(tot) * 1.1], unita: "milioni di parole", yFmt: (v) => G.num(v, v % 1 ? 1 : 0), serie: [
          { punti: G.ANNI.map((y, i) => [y, tot[i]]), colore: G.SCURO, sp: 2.5, etich: "Camera e Senato", piccoEtich: { x: 1848 + k, y: tot[k], colore: G.ROSSO, testo: (1848 + k) + ": " + G.num(tot[k], 1) } },
          { punti: G.ANNI.map((y, i) => [y, B.tot[0][i] ? B.tot[0][i] / 1e6 : null]), colore: G.NERO, sp: 1.5, etich: "Camera" }] });
        r.svg.selectAll("text.anno-lk").remove();
      });
      const dec = []; for (let d = 1840; d <= 2020; d += 10) dec.push(d);
      document.getElementById("blocco").innerHTML = dec.map((d) => {
        const righe = [];
        for (let a = Math.max(1848, d); a <= Math.min(2022, d + 9); a++) {
          const w = (A[a].parole || []).find((x) => x[0].length >= 5);
          righe.push(`<div><b>${a}</b>${w ? G.lParola(w[0], w[3] || w[0]) : '<a class="lk" href="anno.html?a=' + a + '">–</a>'}</div>`);
        }
        return `<div class="decennio"><h4>${d === 1840 ? "1848" : d}</h4>${righe.join("")}</div>`;
      }).join("");
      document.querySelectorAll("#blocco .decennio div b").forEach((b) => { const a = b.textContent; b.innerHTML = `<a href="anno.html?a=${a}">${a}</a>`; });
    });
  });
})();
