/* Le risate migliori: una scelta di ilarità e di insulti, fatta leggendo le frasi (non le prime in ordine di data). */
(function () {
  "use strict";
  const EPOCHE = ["Regno 1848-1900", "Regno 1901-1922", "Fascismo 1922-1943", "Repubblica 1946-1969", "Repubblica 1970-1993", "Repubblica 1994-2022"];
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("sezioni/risate_migliori.json").then((R) => {
      const chi = (r) => {
        const nome = /^(camera:p\d|senato:)/.test(r.pid || "") ? G.lPersona(r.pid, r.oratore) : G.esc(r.oratore);
        return `<span class="quando"><b>${G.data(r.data)}</b>, ${G.ramo(r.ramo)}, ${nome}${r.partito ? " (" + G.esc(r.partito) + ")" : ""}</span>`;
      };
      const voce = (r) => `<li><q>${G.esc(r.frase.replace(/^«|»$/g, ""))}</q>${chi(r)}${r.contesto ? `<span class="contesto">${G.esc(r.contesto)}</span>` : ""}</li>`;
      const blocco = (lista, tit) => EPOCHE.map((e) => { const v = lista.filter((r) => r.epoca === e); return v.length ? `<section class="epoca-ris"><h3 class="rubrica">${G.esc(e)} <span class="anni">${v.length}</span></h3><ul class="frasi-scelte">${v.map(voce).join("")}</ul></section>` : ""; }).join("");
      el.innerHTML = `<h1 class="titolo-pagina">Le risate migliori</h1>
        <p class="sommario">${R.risate.length} volte in cui l'aula ride, scelte leggendo tutte le ${G.num(R.lette || 0)} frasi seguite da «(Ilarità)» o «(Si ride)» nei resoconti: battute, botta e risposta, gaffe. Poi ${R.insulti.length} insulti, scelti allo stesso modo. Per ognuna: la data, chi parla, il partito quando si conosce, la frase com'è scritta nel resoconto.</p>
        <p class="piccolo grigio">La scelta è fatta leggendo, non contando: non dice quanto si ride, lo dice la pagina <a class="lk" href="risate.html">Risate e insulti</a>. Le frasi sono copiate dal resoconto e passano il filtro contro gli errori della scansione; tra parentesi quadre le poche correzioni di lettura. Il contesto, quando c'è, viene dallo stesso resoconto. Sono escluse le frasi razziste e sessiste usate come battuta.</p>
        <section class="sezione"><div class="testa"><h2>Le risate</h2><span class="a-destra"><a href="#insulti">vai agli insulti</a></span></div><div class="colonne-ris">${blocco(R.risate)}</div></section>
        <section class="sezione" id="insulti"><div class="testa"><h2>Gli insulti</h2><span class="a-destra"><a href="risate.html">tutti gli insulti, con la ricerca</a></span></div><div class="colonne-ris">${blocco(R.insulti)}</div></section>`;
    }).catch(() => G.nonTrovato(el, "La scelta delle risate non è disponibile."));
  });
})();
