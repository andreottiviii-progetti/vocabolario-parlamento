/* Pagina di un percorso (percorso.html?id=...): domanda, apertura, grafico d'ingresso, tappe fatte di storie.
   I testi vengono da dati/percorsi/<id>.json (g6, da PERCORSI.md del progetto); i numeri dei grafici dai dati del sito. */
(function () {
  "use strict";
  const COLORE = { "prima-repubblica": ["#F56300", "#B84A00"], partiti: ["#E5007D", "#B80064"], parole: ["#2454FF", "#1B3FCC"], resoconto: ["#7B3FE4", "#5B2BB5"] };
  const ANNI = { "prima-repubblica": "1948-1994", partiti: "1948-2022", parole: "1848-2022", resoconto: "1848-2022" };

  function primeVolte(sel, lista) {
    return G.Scena.primeParole(lista).then((P) => {
      const area = G.figura(sel, {
        titolo: "Quando entra in aula una parola: la data della prima volta",
        sotto: "Prima comparsa stabile nei resoconti di Camera e Senato (almeno 3 volte in 3 anni), 1848-2022. Ogni quadretto è una parola; il nome porta alla sua scheda.",
        limite: "Una comparsa più antica e isolata può essere un errore di lettura del testo stampato: la scheda della parola la segnala.",
        csv: () => [["parola", "prima_volta"]].concat(P.map((p) => [p.forma, p.data])), nomeCSV: "prime_volte",
      });
      G.grafico(area, (a, w) => {
        const stretto = w < 560, righe = stretto ? 7 : 5, h = 60 + righe * 34;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Prime volte");
        const x = d3.scaleLinear().domain([1848, 2022]).range([6, w - 6]), y0 = h - 30;
        svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", y0).attr("y2", y0).attr("stroke", G.INK);
        d3.range(1860, 2021, stretto ? 40 : 20).forEach((v) => svg.append("text").attr("x", x(v)).attr("y", h - 10).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(v));
        P.forEach((p, i) => {
          const anno = +p.data.slice(0, 4), xx = x(anno), yy = y0 - 24 - (i % righe) * 34;
          svg.append("line").attr("x1", xx).attr("x2", xx).attr("y1", yy + 4).attr("y2", y0).attr("stroke", "#CDD2D8");
          svg.append("rect").attr("x", xx - 4).attr("y", y0 - 4).attr("width", 8).attr("height", 8).attr("fill", G.SEZ).attr("data-tip", `${G.data(p.data)}\nla prima volta di «${p.forma}»`);
          const fine = xx > w - 150;
          svg.append("a").attr("href", "parola.html?p=" + encodeURIComponent(G.norma(p.forma))).append("text").attr("class", "etich alone").attr("x", xx + (fine ? -4 : 4)).attr("y", yy).attr("text-anchor", fine ? "end" : "start").attr("fill", G.INK).text("«" + p.forma + "» " + anno);
        });
      });
    });
  }



  function calendario(sel) {
    const area = G.figura(sel, {
      titolo: "Quando cambia il modo di scrivere il resoconto",
      sotto: "Camera e Senato, 1948-2022. Tratteggio: cambi di trascrizione provati; puntini: cambi di scrittura (punteggiatura e grafie). Le date incerte non si disegnano.",
      limite: "Le date vengono dal calendario rivisto del progetto: alla Camera i cambi di trascrizione non si possono datare con sicurezza.",
      csv: () => [["ramo", "anno", "cambio"]].concat([].concat(...["camera", "senato"].map((r) => (G.TRASCR[r] || []).map((a) => [r, a, "trascrizione"]).concat(((G.SCRITTURA || {})[r] || []).map((a) => [r, a, "scrittura"]))))), nomeCSV: "calendario_resoconto",
    });
    G.grafico(area, (a, w) => {
      const h = 170, svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Calendario del resoconto");
      const x = d3.scaleLinear().domain([1948, 2022]).range([70, w - 10]);
      [["camera", "Camera", 20], ["senato", "Senato", 90]].forEach(([r, nome, y0]) => {
        svg.append("line").attr("x1", x(1948)).attr("x2", x(2022)).attr("y1", y0 + 50).attr("y2", y0 + 50).attr("stroke", G.RIGA);
        svg.append("text").attr("x", 0).attr("y", y0 + 30).attr("font-weight", 800).attr("font-size", 14).attr("fill", G.INK).text(nome);
        G.lineeTrascrizione(svg, x, y0, y0 + 50, r, false);
      });
      const tutte = Array.from(new Set([].concat(G.TRASCR.camera, G.TRASCR.senato, (G.SCRITTURA || {}).camera || [], (G.SCRITTURA || {}).senato || []))).filter((v) => v >= 1948).sort();
      tutte.forEach((v) => svg.append("text").attr("x", x(v)).attr("y", h - 6).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.INK).text(v));
    });
  }

  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = G.param("id") || "";
    return G.carica("percorsi/" + id.replace(/[^a-z-]/g, "") + ".json").then((P) => {
      // impianto del vocabolario: nessun colore per percorso, i segni restano nel blu delle voci
      const col = [G.SEZ, G.SEZ_S];
      document.title = P.titolo + " · Il vocabolario del Parlamento";
      const br = document.querySelector(".briciole");
      if (br) br.innerHTML = `<a href="index.html">Home</a> › <a href="percorsi.html">Percorsi</a> › ${G.esc(P.titolo)}`;
      const tappe = P.tappe.map((t, i) => `<li class="tappa">
          <span class="t-num">${i + 1}</span>
          <div>${t.storie.map((s) => `<p class="t-occ">${G.esc(s.occhiello)}${s.verdetto && s.verdetto !== "descrittiva" ? " · " + G.esito(s.verdetto) : ""}</p><h3><a class="lk" href="storia.html?id=${encodeURIComponent(s.id)}">${G.esc(s.titolo)}</a></h3>`).join("")}
          ${t.nota ? `<p>${t.nota}</p>` : ""}</div>
        </li>${t.passaggio ? `<li class="passaggio"><p>${t.passaggio}</p></li>` : ""}`).join("");
      el.innerHTML = `<p class="occhiello">Percorso · ${ANNI[P.id] || ""}</p>
        <h1 class="titolo-pagina">${G.esc(P.titolo)}</h1>
        <p class="sommario">${P.domanda}</p>
        ${P.apertura ? `<div class="apertura" style="border-left-color:${col[0]}">${P.apertura}</div>` : ""}
        ${P.tesi ? `<p class="colonna-testo">${P.tesi}</p>` : ""}
        <section class="sezione"><div id="g-ingresso"></div></section>
        <section class="sezione"><div class="testa"><h2>${P.tappe.length} tappe</h2></div><ol class="tappe" style="--col:${col[0]}">${tappe}</ol></section>
        ${P.lato.length ? `<section class="sezione"><div class="testa"><h2>Storie vicine</h2></div><ul class="lista-lato">${P.lato.map((s) => `<li><a class="lk" href="storia.html?id=${encodeURIComponent(s.id)}">${G.esc(s.titolo)}</a></li>`).join("")}</ul></section>` : ""}
        <section class="sezione" id="fondo"></section>`;
      const fondo = document.getElementById("fondo");
      if (P.id === "prima-repubblica" || P.id === "partiti") {
        G.carica("partiti/traiettorie.json").then((TR) => (P.id === "partiti" ? G.griglia("#g-ingresso") : G.griglia("#g-ingresso", { righe: ["PCI, PDS, DS, PD", "DC", "PSI"], legs: d3.range(1, 12) })));
      }
      if (P.id === "parole") {
        primeVolte("#g-ingresso", ["camorra", "maffia", "telefono", "automobile", "aviazione", "televisione", "immigrati", "computer", "privacy", "spread", "ndrangheta", "ambientalismo", "tangentopoli", "internet", "femminicidio", "smartphone", "covid"]);
        fondo.innerHTML = `<div class="testa"><h2>Quando entra in aula una parola?</h2></div><form class="cerca-grande" action="parola.html" role="search"><label for="cp">Scrivi una parola</label> <input id="cp" name="p" autocomplete="off" placeholder="per esempio: smartphone"> <button class="bottone" type="submit">Cerca</button></form>`;
      }
      if (P.id === "resoconto") {
        calendario("#g-ingresso");
        G.carica("esperimenti.json").then((E) => {
          const c = { regge: 0, "in parte": 0, smentita: 0 };
          E.elenco.forEach((e) => { if (e.esito in c) c[e.esito]++; });
          fondo.innerHTML = `<div class="testa"><h2>Metodo e limiti</h2></div><p class="colonna-testo">${E.elenco.length} esperimenti: ${c.regge} reggono, ${c["in parte"]} in parte, ${c.smentita} smentiti. ${G.esito("regge")} ${G.esito("in parte")} ${G.esito("smentita")}</p><p><a class="lk" href="metodo.html">Metodo e limiti</a> · <a class="lk" href="esperimenti.html">Tutti gli esperimenti</a></p>`;
        });
      }
    }).catch(() => G.nonTrovato(el, "Percorso non trovato."));
  });
})();
