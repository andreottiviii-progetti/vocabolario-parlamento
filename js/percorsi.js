/* Pagina dei percorsi */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("sezioni/fascismo.json"), G.carica("sezioni/lingue.json"), G.carica("sezioni/risate.json"), G.carica("sezioni/esteri.json")]).then(([F, L, R, X]) => {
      el.innerHTML = `<h1 class="titolo-pagina">Quattro percorsi</h1>
        <p class="sommario">Quattro strade dentro l'archivio, ognuna con i suoi grafici, le sue frasi vere e le sue storie.</p>
        <div style="margin-top:40px">${G.ingressi(F, L, R, X)}</div>`;
    });
  });
})();
