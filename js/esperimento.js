/* Scheda di un esperimento: esperimento.html?cod=H55a */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Esperimenti" });
    G.piede();
    const el = document.getElementById("contenuto");
    const cod = G.param("cod") || "H1";
    return Promise.all([G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([E, S]) => {
      const i = E.elenco.findIndex((e) => e.cod.toLowerCase() === cod.toLowerCase());
      if (i < 0) {
        const fam = E.elenco.filter((e) => e.cod.toLowerCase().startsWith(cod.toLowerCase()));
        if (fam.length) { location.replace("esperimento.html?cod=" + encodeURIComponent(fam[0].cod)); return; }
        return G.nonTrovato(el, "Questo esperimento non c'è nell'elenco.");
      }
      const e = E.elenco[i];
      document.title = e.cod + " " + e.titolo + " · Il vocabolario del Parlamento";
      document.getElementById("bric").textContent = e.cod;
      const base = (e.cod.match(/^H\d+/) || [e.cod])[0];
      const fratelli = E.elenco.filter((x) => x !== e && (x.cod.match(/^H\d+/) || [""])[0] === base);
      const stesso = E.elenco.filter((x) => x !== e && x.filone === e.filone && !fratelli.includes(x));
      const storie = (S.storie || []).filter((s) => (s.ipotesi || []).some((c) => c === e.cod || c === base));
      const prec = E.elenco[i - 1], succ = E.elenco[i + 1];
      setTimeout(() => G.nelRacconto("#nel-racconto", "ipotesi", e.cod), 0);
      el.innerHTML = `
        <p class="occhiello" style="margin-top:18px">${G.esc(e.filone)} · ${G.esc(e.cod)}</p>
        <h1 class="titolo-pagina" style="font-size:clamp(44px,6vw,80px)">${G.esc(e.titolo)}</h1>
        <section class="griglia">
          <div class="c8 colonna-testo">
            <h2 class="titolo-piccolo" style="margin-top:8px">Che cosa ci aspettavamo</h2><p>${G.esc(e.attesa)}</p>
            <h2 class="titolo-piccolo">Esito</h2><p style="font-size:22px">${G.esito(e.esito)}</p>
            <h2 class="titolo-piccolo">Il numero che conta</h2><p>${G.esc(/^Vedi nota/.test(e.numero) ? "Il numero non è riportato nell'elenco degli esperimenti." : e.numero)}</p>
            <div id="nel-racconto"></div>
            <p class="piccolo grigio">L'esito è quello dell'elenco degli esperimenti, alla lettera: la regola del verdetto è stata scritta prima di misurare. <a href="metodo.html">Come funziona</a></p>
          </div>
          <aside class="c4 fil">
            <h3 class="titolo-piccolo">Storie</h3><ul class="fatti">${storie.length ? storie.map((s) => `<li><a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a></li>`).join("") : '<li class="grigio">Nessuna storia per ora.</li>'}</ul>
            ${fratelli.length ? `<h3 class="titolo-piccolo" style="margin-top:18px">La stessa ipotesi</h3><ul class="fatti">${fratelli.map((x) => `<li>${G.lEsp(x.cod)} ${G.esc(x.titolo)}<span class="et">${G.esito(x.esito)}</span></li>`).join("")}</ul>` : ""}
          </aside>
        </section>
        <section class="sezione"><div class="testa"><h2>Lo stesso filone</h2><span class="a-destra"><a href="esperimenti.html?filone=${encodeURIComponent(e.filone)}">${G.esc(e.filone)}</a></span></div>
          <div class="tab-scorre"><table class="fitta"><tbody>${stesso.map((x) => `<tr><td>${G.lEsp(x.cod)}</td><td>${G.esc(x.titolo)}</td><td>${G.esito(x.esito)}</td></tr>`).join("")}</tbody></table></div></section>
        <nav class="prec-succ" aria-label="Esperimenti vicini"><span>${prec ? `<a href="esperimento.html?cod=${encodeURIComponent(prec.cod)}">← ${G.esc(prec.cod)} ${G.esc(prec.titolo)}</a>` : ""}</span><span>${succ ? `<a href="esperimento.html?cod=${encodeURIComponent(succ.cod)}">${G.esc(succ.cod)} ${G.esc(succ.titolo)} →</a>` : ""}</span></nav>`;
    });
  });
})();
