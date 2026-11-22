/* Elenco delle storie */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Storie" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("storie/indice.json").then((IX) => {
      const S = IX.storie;
      const conta = (v) => S.filter((s) => s.verdetto === v).length;
      let filtro = "";
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${S.length} storie: un risultato, un grafico, il suo limite</h1>
        <p class="sommario">Ogni storia racconta un esperimento: che cosa ci aspettavamo, che cosa abbiamo trovato, quanto è solido. Le smentite sono storie come le altre. In testa le più solide e le più sorprendenti. Qui ${conta("regge")} reggono, ${conta("in parte")} reggono in parte, ${conta("smentita")} sono smentite.</p>
        <div class="filtri" id="filtri" role="group" aria-label="Verdetto"></div>
        <ol class="elenco-storie" id="lista"></ol>`;
      function fai() {
        document.getElementById("filtri").innerHTML = [["", "tutte"], ["regge", "regge"], ["in parte", "in parte"], ["smentita", "smentita"], ["altro", "descrittive e altre"]].map(([v, t]) => `<button type="button" data-v="${v}" class="${v === filtro ? "attivo" : ""}">${t}</button>`).join("");
        document.querySelectorAll("#filtri button").forEach((b) => b.addEventListener("click", () => { filtro = b.dataset.v; fai(); }));
        const v = S.filter((s) => !filtro || (filtro === "altro" ? !["regge", "in parte", "smentita"].includes(s.verdetto) : s.verdetto === filtro));
        document.getElementById("lista").innerHTML = v.map((s) => `<li><span class="num">${s.n}</span><div><p class="occhiello">${G.esc(s.occhiello)}</p><h3><a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a></h3><p>${G.esc(s.sottotitolo)}</p></div><div>${G.esito(s.verdetto || "descrittiva")}<br><span class="piccolo grigio">${(s.ipotesi || []).map((c) => `<a class="lk" href="esperimento.html?cod=${encodeURIComponent(c)}">${G.esc(c)}</a>`).join(", ")}</span></div></li>`).join("");
      }
      fai();
    });
  });
})();
