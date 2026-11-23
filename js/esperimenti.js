/* Indice degli esperimenti: esperimenti.html[?filone=...][&esito=...] */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Scoperte" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([E, S]) => pagina(el, E, S));
  });

  function pagina(el, E, S) {
    const tot = E.conti.find((c) => c[0] === "Totale");
    let filone = G.param("filone") || "", esito = G.param("esito") || "", epoca = G.param("epoca") || "", testo = "";
    // l'epoca di un esperimento: gli anni scritti nell'ipotesi e nel risultato, e quelli delle sue storie
    const EPOCHE = [["regno", "Regno, 1848-1921", 1848, 1921], ["fascismo", "Fascismo, 1922-1943", 1922, 1943], ["prima", "Prima Repubblica, 1946-1993", 1944, 1993], ["seconda", "Seconda Repubblica, 1994-2022", 1994, 2022]];
    // le storie stanno sotto l'esperimento che raccontano (campo «ipotesi» dell'indice delle storie)
    const storieDi = {}, conEsp = new Set();
    E.elenco.forEach((e) => { storieDi[e.cod] = (S.storie || []).filter((s) => (s.ipotesi || []).some((c) => c === e.cod || (e.cod.startsWith(c) && !/\d$/.test(e.cod.slice(c.length, c.length + 1))))); storieDi[e.cod].forEach((s) => conEsp.add(s.id)); });
    const descrittive = (S.storie || []).filter((s) => !conEsp.has(s.id));
    const anniDi = (e) => {
      if (e._anni) return e._anni;
      const a = [].concat(...((e.attesa + " " + e.numero + " " + (storieDi[e.cod] || []).map((s) => s.occhiello).join(" ")).match(/(18[4-9]\d|19\d\d|20[0-2]\d)/g) || []).map(Number), ...(storieDi[e.cod] || []).map((s) => (s.anni || []).map(Number)));
      e._anni = a.length ? [Math.min(...a), Math.max(...a)] : [1848, 2022];
      return e._anni;
    };
    el.innerHTML = `
      <h1 class="titolo-pagina">Che cosa abbiamo scoperto</h1>
      <p class="sommario"><b>${tot[7]} esperimenti su ${E.n_ipotesi} ipotesi: ${tot[1]} reggono, ${tot[2]} in parte, ${tot[3]} smentite.</b> Qui ogni voce è un esperimento: che cosa ci aspettavamo, che cosa abbiamo trovato, il verdetto e, sotto, le storie che lo raccontano (${(S.storie || []).length} in tutto). Ogni ipotesi è stata scritta prima di guardare i numeri, con la regola che l'avrebbe smentita. Il verdetto è quello della regola, alla lettera. Degli altri ${tot[4] + tot[5] + tot[6]}, ${tot[6]} sono in coda e non sono stati misurati, ${tot[5]} è solo descrittivo, ${tot[4]} ha una misura che non vale.</p>
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
        <div class="filtri" id="f-epoca" role="group" aria-label="Epoca"></div>
        <div class="filtri" id="f-esito" role="group" aria-label="Esito"></div>
        <div class="filtri" id="f-filone" role="group" aria-label="Filone"></div>
        <p class="fig-sotto" id="quanti"></p>
        <div id="voci-esp"></div>
      </section>
      <section class="sezione"><div class="testa"><h2>Storie senza un esperimento</h2></div><p class="sotto-titolo">Lavori descrittivi: raccontano che cosa succede, senza un'ipotesi da mettere alla prova.</p>${G.tessere(descrittive, 200)}
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
      document.getElementById("f-epoca").innerHTML = [["", "tutte le epoche"]].concat(EPOCHE).map((x) => `<button type="button" data-v="${x[0]}" class="${x[0] === epoca ? "attivo" : ""}">${x[1]}</button>`).join("");
      document.querySelectorAll("#f-epoca button").forEach((b) => b.addEventListener("click", () => { epoca = b.dataset.v; aggiorna(); }));
      document.querySelectorAll("#f-esito button").forEach((b) => b.addEventListener("click", () => { esito = b.dataset.v; aggiorna(); }));
      document.querySelectorAll("#f-filone button").forEach((b) => b.addEventListener("click", () => { filone = b.dataset.v; aggiorna(); G.ridisegna("#g-conti .fig-area"); }));
    }
    function aggiorna() {
      filtri();
      const t = G.norma(testo) ? testo.toLowerCase() : "";
      const ep = EPOCHE.find((x) => x[0] === epoca);
      const righe = E.elenco.filter((e) => (!ep || (anniDi(e)[0] <= ep[3] && anniDi(e)[1] >= ep[2])) && (!filone || e.filone === filone) && (!esito || (esito === "altro" ? !["regge", "in parte", "smentita"].includes(e.esito) : e.esito === esito)) &&
        (!t || (e.cod + " " + e.titolo + " " + e.attesa + " " + e.numero).toLowerCase().includes(t)));
      document.getElementById("quanti").textContent = righe.length + " esperimenti" + (filone ? " nel filone «" + filone + "»" : "") + (ep ? ", " + ep[1] : "") + ", raggruppati per filone. Clicca un esperimento per aprirlo: che cosa ci aspettavamo, che cosa abbiamo trovato, le storie.";
      const voce = (e) => { const st = storieDi[e.cod] || []; return `<details class="esp"><summary>${G.esc(e.cod)} <b>${G.esc(e.titolo)}</b> ${G.esito(e.esito)}${st.length ? ` <span class="n-st">· ${st.length} ${st.length === 1 ? "storia" : "storie"}</span>` : ""}</summary>
        <p><i class="gram">ci aspettavamo</i> ${G.esc(e.attesa)}</p>${/^Vedi nota/.test(e.numero) ? "" : `<p><i class="gram">trovato</i> ${G.esc(e.numero)}</p>`}<p class="piccolo">${G.lEsp(e.cod)} la scheda dell'esperimento</p>${st.length ? `<div class="rimandi una">${st.map(G.voceStoria).join("")}</div>` : ""}</details>`; };
      const filoni = E.filoni.filter((f) => righe.some((e) => e.filone === f));
      document.getElementById("voci-esp").innerHTML = filoni.map((f) => `<h3 class="rubrica filone-esp">${G.esc(f)}</h3><div class="voci-esp">${righe.filter((e) => e.filone === f).map(voce).join("")}</div>`).join("");
    }
    document.getElementById("cerca").addEventListener("input", (e) => { testo = e.target.value; aggiorna(); });
    aggiorna();
  }
})();
