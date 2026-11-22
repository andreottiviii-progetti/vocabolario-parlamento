/* Indice degli esperimenti: esperimenti.html[?filone=...][&esito=...] */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Esperimenti" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([E, S]) => pagina(el, E, S));
  });

  function pagina(el, E, S) {
    const tot = E.conti.find((c) => c[0] === "Totale");
    let filone = G.param("filone") || "", esito = G.param("esito") || "", testo = "";
    const storiaDi = {};
    (S.storie || []).forEach((s) => (s.ipotesi || []).forEach((c) => { storiaDi[c] = storiaDi[c] || s; }));
    el.innerHTML = `
      <h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${tot[7]} esperimenti su ${E.n_ipotesi} ipotesi: ${tot[1]} reggono, ${tot[2]} in parte, ${tot[3]} smentite</h1>
      <p class="sommario">Ogni ipotesi è stata scritta prima di guardare i numeri, con la regola che l'avrebbe smentita. Il verdetto è quello della regola, alla lettera. Degli altri ${tot[4] + tot[5] + tot[6]}, ${tot[6]} sono in coda e non sono stati misurati, ${tot[5]} è solo descrittivo, ${tot[4]} ha una misura che non vale.</p>
      <p class="piccolo grigio">Quando esiste una lettura più larga del verdetto, la scheda della storia la riporta dopo e la chiama così.</p>
      <section class="griglia"><div class="c8" id="g-conti"></div>
      <aside class="c4 fil"><h3 class="titolo-piccolo">Come si legge</h3><ul class="fatti">
        <li>${G.esito("regge")}<span class="et">il risultato è quello atteso, secondo la regola fissata prima</span></li>
        <li>${G.esito("in parte")}<span class="et">regge solo una parte dell'ipotesi, o solo in una versione della misura</span></li>
        <li>${G.esito("smentita")}<span class="et">la regola dice di no: è una notizia anche questa</span></li>
        <li>${G.esito("misura non valida")}<span class="et">la misura non ha superato i controlli; descrittiva e non misurata sono gli altri due casi rari</span></li>
        <li><a href="metodo.html">Metodo e limiti</a><span class="et">la regola del verdetto, le prove con le date finte, il giudice automatico</span></li></ul></aside></section>
      <section class="sezione">
        <div class="cerca-grande"><input id="cerca" type="search" placeholder="cerca negli esperimenti: una parola, un codice" aria-label="Cerca negli esperimenti"></div>
        <div class="filtri" id="f-esito" role="group" aria-label="Esito"></div>
        <div class="filtri" id="f-filone" role="group" aria-label="Filone"></div>
        <p class="fig-sotto" id="quanti"></p>
        <div class="tab-scorre" id="tabella"></div>
      </section>`;
    // grafico dei conti
    const area = G.figura("#g-conti", {
      titolo: (() => { const r = E.conti.filter((c) => c[0] !== "Totale"); const n = r.filter((c) => c[3] > 0).length; return `${tot[3]} smentite su ${tot[7]}: ` + (n === r.length ? `in tutti i ${n} filoni almeno un esperimento è smentito` : `in ${n} filoni su ${r.length} almeno un esperimento è smentito`); })(),
      sotto: "Numero di esperimenti per esito e filone. Clicca un filone per vedere solo quello.",
      csv: () => [["filone", "regge", "in parte", "smentita", "non valida", "descrittiva", "non misurata", "totale"]].concat(E.conti), nomeCSV: "esperimenti_conti",
    });
    G.grafico(area, (a, w) => {
      const righe = E.conti.filter((c) => c[0] !== "Totale");
      const lw = w < 560 ? 140 : 340, rh = 22, unit = Math.min(18, (w - lw - 40) / d3.max(righe, (r) => r[7]));
      const svg = a.append("svg").attr("width", w).attr("height", righe.length * rh + 6).attr("role", "img").attr("aria-label", "Verdetti per filone");
      const gr = svg.append("defs").append("linearGradient").attr("id", "mezzo2");
      gr.append("stop").attr("offset", "50%").attr("stop-color", G.NERO); gr.append("stop").attr("offset", "50%").attr("stop-color", "#fff");
      righe.forEach((r, i) => {
        const yy = i * rh;
        const t = svg.append("a").attr("href", "?filone=" + encodeURIComponent(r[0])).append("text").attr("x", lw - 10).attr("y", yy + 15).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", r[0] === filone ? 800 : 400).text(w < 560 ? r[0].replace(/^Temi: /, "").slice(0, 22) : r[0]);
        t.on("click", (e) => { e.preventDefault(); filone = r[0]; aggiorna(); G.ridisegna("#g-conti .fig-area"); });
        let k = 0;
        [[r[1], G.NERO, G.NERO], [r[2], "url(#mezzo2)", G.NERO], [r[3], G.ROSSO, G.ROSSO], [r[4] + r[5] + r[6], "#fff", G.GDATI]].forEach(([n, f, s]) => {
          for (let j = 0; j < n; j++) { svg.append("rect").attr("x", lw + k * unit + 1).attr("y", yy + 5).attr("width", unit - 3).attr("height", 12).attr("fill", f).attr("stroke", s).attr("stroke-width", 1.2); k++; }
        });
        svg.append("text").attr("x", lw + k * unit + 6).attr("y", yy + 15).attr("font-size", 12).attr("fill", G.GRIGIO).text(r[7]);
      });
    });
    const esiti = ["", "regge", "in parte", "smentita", "altro"];
    function filtri() {
      document.getElementById("f-esito").innerHTML = esiti.map((x) => `<button type="button" data-v="${x}" class="${x === esito ? "attivo" : ""}">${x ? (x === "altro" ? "altri esiti" : x) : "tutti gli esiti"}</button>`).join("");
      document.getElementById("f-filone").innerHTML = [""].concat(E.filoni).map((x) => `<button type="button" data-v="${G.esc(x)}" class="${x === filone ? "attivo" : ""}">${x ? G.esc(x) : "tutti i filoni"}</button>`).join("");
      document.querySelectorAll("#f-esito button").forEach((b) => b.addEventListener("click", () => { esito = b.dataset.v; aggiorna(); }));
      document.querySelectorAll("#f-filone button").forEach((b) => b.addEventListener("click", () => { filone = b.dataset.v; aggiorna(); G.ridisegna("#g-conti .fig-area"); }));
    }
    function aggiorna() {
      filtri();
      const t = G.norma(testo) ? testo.toLowerCase() : "";
      const righe = E.elenco.filter((e) => (!filone || e.filone === filone) && (!esito || (esito === "altro" ? !["regge", "in parte", "smentita"].includes(e.esito) : e.esito === esito)) &&
        (!t || (e.cod + " " + e.titolo + " " + e.attesa + " " + e.numero).toLowerCase().includes(t)));
      document.getElementById("quanti").textContent = righe.length + " esperimenti" + (filone ? " nel filone «" + filone + "»" : "") + ". Clicca un'intestazione per ordinare.";
      G.tabella(document.getElementById("tabella"), [
        { t: "codice", k: "cod", fmt: (e) => G.lEsp(e.cod), v: (e) => e.cod.replace(/\d+/, (n) => n.padStart(3, "0")) },
        { t: "esperimento", k: "titolo", fmt: (e) => `<b>${G.esc(e.titolo)}</b>${storiaDi[e.cod] ? ` · <a href="storia.html?id=${storiaDi[e.cod].id}">la storia</a>` : ""}` },
        { t: "che cosa ci aspettavamo", k: "attesa" },
        { t: "esito", k: "esito", fmt: (e) => G.esito(e.esito) },
        { t: "numero chiave", k: "numero", fmt: (e) => G.esc(/^Vedi nota/.test(e.numero) ? "Numero non riportato nell'elenco." : e.numero) },
        { t: "filone", k: "filone" },
      ], righe);
    }
    document.getElementById("cerca").addEventListener("input", (e) => { testo = e.target.value; aggiorna(); });
    aggiorna();
  }
})();
