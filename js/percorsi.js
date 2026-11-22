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
      const altri = PI.percorsi.map((p) => `<a class="ingresso" href="percorso.html?id=${p.id}" style="--col:${COL[p.id][0]};--col-s:${COL[p.id][1]}"><span class="t-occ">Percorso · ${p.tappe} tappe</span><span class="grande">${p.tappe}</span><div><h3>${G.esc(p.titolo)}</h3><p>${p.domanda}</p></div></a>`).join("");
      el.innerHTML = `<h1 class="titolo-pagina">${nomi[n - 1] || n} percorsi</h1>
        <p class="sommario">Strade dentro l'archivio, ognuna con i suoi grafici, le sue frasi vere e le sue storie.</p>
        <div style="margin-top:40px">${G.ingressi(F, L, R, X)}</div>
        ${altri ? `<div class="ingressi" style="margin-top:24px">${altri}</div>` : ""}`;
    });
  });
})();
