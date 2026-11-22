/* Indice delle parole: ricerca, lettere, le più dette, le nuove */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Parole" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.indiceParole(), G.carica("home.json")]).then(([IX, H]) => {
      const P = IX.p;
      const vuote = new Set("che non per con una del della dei delle degli nel nella sono stato anche come questo questa piu essere alla dal dalla sia gli governo legge presidente".split(" "));
      const lettere = "abcdefghijklmnopqrstuvwxyz".split("");
      let lettera = G.param("l") || "a";
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${G.num(P.length)} parole, ognuna con la sua curva</h1>
        <p class="sommario">Sono le parole dette almeno mille volte in aula tra il 1848 e il 2022. Per ognuna: quante volte per anno, alla Camera e al Senato; la prima volta, con la data e chi la dice; l'anno di punta; chi la usa di più; le frasi vere.</p>
        <p class="piccolo grigio">Le curve contano le parole scritte nel resoconto. Una parola con due significati («camorra», «ambiente», «euro» prima dell'euro) ha una curva sola. Le parole sono scritte come le conta il programma: minuscole e senza accenti.</p>
        <div class="cerca-grande"><input id="cerca" type="search" placeholder="scrivi una parola" aria-label="Cerca una parola" autocomplete="off"><button class="bottone" id="vai" type="button">Apri</button></div>
        <p class="parole-nuvola" id="suggerimenti"></p>
        <section class="sezione griglia">
          <div class="c4"><h3 class="titolo-piccolo">Le più dette</h3><p class="fig-sotto">Volte in tutto, senza le parole vuote (articoli, preposizioni, verbi ausiliari)</p><div id="top"></div></div>
          <div class="c4 fil"><h3 class="titolo-piccolo">Arrivate dopo il 1990</h3><p class="fig-sotto">Parole la cui curva comincia dal 1990, per volte in tutto</p><div id="nuove"></div></div>
          <div class="c4 fil"><h3 class="titolo-piccolo">Scomparse prima del 1946</h3><p class="fig-sotto">Parole con l'anno di punta prima del 1900, per volte in tutto</p><div id="vecchie"></div></div>
        </section>
        <section class="sezione"><div class="testa"><h2>Dalla A alla Z</h2></div><nav class="lettere" id="lettere" aria-label="Lettere"></nav><p class="fig-sotto" id="n-lett"></p><div class="colonne-elenco" id="elenco"></div></section>`;
      const lk = (r) => G.lParola(r[0], r[1] || r[0]);
      const top = P.filter((r) => !vuote.has(r[0]) && r[0].length > 3).sort((a, b) => b[2] - a[2]).slice(0, 15);
      document.getElementById("top").innerHTML = G.barre(top.map((r, i) => [lk(r), r[2], i === 0]));
      const nuove = P.filter((r) => r[4] >= 1990).sort((a, b) => b[2] - a[2]).slice(0, 15);
      document.getElementById("nuove").innerHTML = G.barre(nuove.map((r, i) => [lk(r) + ` <span class="grigio">${r[4]}</span>`, r[2], i === 0]));
      const vecchie = P.filter((r) => r[3] < 1900 && r[0].length > 3 && !vuote.has(r[0])).sort((a, b) => b[2] - a[2]).slice(0, 15);
      document.getElementById("vecchie").innerHTML = G.barre(vecchie.map((r, i) => [lk(r) + ` <span class="grigio">${r[3]}</span>`, r[2], i === 0]));
      function elenco() {
        document.getElementById("lettere").innerHTML = lettere.map((l) => `<a href="?l=${l}" data-l="${l}" class="${l === lettera ? "attivo" : ""}">${l.toUpperCase()}</a>`).join("");
        document.querySelectorAll("#lettere a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); lettera = a.dataset.l; try { history.replaceState(null, "", "?l=" + lettera); } catch (x) { /* niente */ } elenco(); }));
        const v = P.filter((r) => r[0][0] === lettera);
        document.getElementById("n-lett").textContent = v.length + " parole con la " + lettera.toUpperCase() + ", in ordine alfabetico; accanto, le volte in tutto.";
        document.getElementById("elenco").innerHTML = v.map((r) => `<a href="parola.html?p=${r[0]}">${G.esc(r[1] || r[0])}<small>${G.num(r[2])}</small></a>`).join("");
      }
      elenco();
      const inp = document.getElementById("cerca");
      inp.addEventListener("input", () => {
        const q = G.norma(inp.value);
        if (q.length < 2) { document.getElementById("suggerimenti").innerHTML = ""; return; }
        const v = P.filter((r) => r[0].startsWith(q)).sort((a, b) => b[2] - a[2]).slice(0, 40);
        document.getElementById("suggerimenti").innerHTML = v.length ? v.map((r) => lk(r) + "<small>" + G.num(r[2]) + "</small>").join(" ") : `Nessuna parola comincia con «${G.esc(q)}».`;
      });
      const vai = () => { const q = G.norma(inp.value); if (q) location.href = "parola.html?p=" + q; };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") vai(); });
      document.getElementById("vai").addEventListener("click", vai);
    });
  });
})();
