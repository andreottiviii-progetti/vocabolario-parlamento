/* Pagina dei percorsi */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    const COL = { "prima-repubblica": ["#F56300", "#B84A00"], partiti: ["#E5007D", "#B80064"], parole: ["#2454FF", "#1B3FCC"], resoconto: ["#7B3FE4", "#5B2BB5"] };
    return Promise.all([G.carica("sezioni/fascismo.json"), G.carica("sezioni/lingue.json"), G.carica("sezioni/risate.json"), G.carica("sezioni/esteri.json"), G.carica("percorsi/indice.json").catch(() => ({ percorsi: [] }))]).then(([F, L, R, X, PI]) => {
      const n = 4 + PI.percorsi.length, nomi = ["", "", "", "", "Cinque", "Sei", "Sette", "Otto"];
      const altri = PI.percorsi.map((p) => `<div class="ingresso"><p class="testa"><a class="lemma" href="percorso.html?id=${p.id}">${G.esc(p.titolo)}</a> <span class="anni">[${p.tappe} tappe]</span></p><p>${p.domanda}</p></div>`).join("");
      el.innerHTML = `<h1 class="titolo-pagina">${nomi[n - 1] || n} percorsi</h1>
        <p class="sommario">Strade dentro l'archivio, ognuna con i suoi grafici, le sue frasi vere e le sue storie.</p>
        <section class="sezione"><div class="testa"><h2>Quattro pagine con i loro grafici</h2></div>${G.ingressi(F, L, R, X)}</section>
        ${altri ? `<section class="sezione"><div class="testa"><h2>Quattro percorsi a tappe</h2></div><div class="ingressi">${altri}</div></section>` : ""}`;
    });
  });
})();
