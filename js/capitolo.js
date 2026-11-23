/* Pagina di un capitolo del racconto: capitolo.html?n=1. Testo a passi a sinistra, il grafico chiave fermo a destra. */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "" });
    G.piede();
    const el = document.getElementById("contenuto");
    const n = parseInt(G.param("n") || "1", 10);
    return Promise.all([G.carica("capitoli/" + n + ".json"), G.carica("capitoli/indice.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([C, IX, S]) => {
      document.title = C.titolo + " · Il vocabolario del Parlamento";
      document.getElementById("bric").textContent = "Capitolo " + C.n;
      if (C.anni && C.anni.length) G.dove([C.anni[0], C.anni[C.anni.length - 1], "capitolo " + C.n + ", " + C.anni.join("-")]);
      const storie = (C.storie || []).map((id) => S.storie.find((s) => s.id === id)).filter(Boolean);
      const i = IX.capitoli.findIndex((c) => +c.n === n);
      const prec = IX.capitoli[i - 1], succ = IX.capitoli[i + 1];
      const minuscola = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);
      const a0 = (C.anni || [])[0], a1 = (C.anni || [])[(C.anni || []).length - 1];
      // la voce lunga: il titolo spiega di che cosa parla il capitolo, la parola guida sta accanto
      el.innerHTML = `
        <h1 class="titolo-pagina">${G.esc(C.titolo)}<span class="accanto"><span class="anni">[${a0}-${a1}]</span> <i class="gram">cap. ${C.n} di ${IX.capitoli.length} · parola guida</i> ${G.esc(minuscola(C.simbolo || ""))}</span></h1>
        <p class="sommario">${G.esc(C.sommario)}</p>
        ${C.frase ? `<p class="es cap-es">«${G.esc(C.frase.replace(/^«|»$/g, ""))}» <span>${G.esc(C.chi)}</span></p>` : ""}
        <div id="filo"></div>
        <section class="scorrimento">
          <div class="scena"><div id="g-chiave"></div></div>
          <div class="passi">${C.passi.map((p, k) => `<div class="passo" data-stato="${k + 1}"><h2 class="titolo-piccolo senso"><b class="n" aria-label="Passo ${k + 1}">${k + 1}</b> ${p.titolo}</h2>${p.testo}${p.porte ? `<p class="piccolo porte">→ ${p.porte}</p>` : ""}</div>`).join("")}</div>
        </section>
        <section class="sezione griglia">
          <div class="c4">${C.stenografo ? `<h2 class="rubrica">Il momento dello stenografo</h2><div class="voce">${C.stenografo}</div>` : ""}<h2 class="rubrica">Tre porte</h2><div class="voce">${C.porte_fondo}</div></div>
          <div class="c4 fil"><h2 class="rubrica">I verdetti toccati</h2><div class="voce">${C.verdetti}</div>${C.verso ? `<h2 class="rubrica">L'ultima riga</h2><div class="voce">${C.verso}</div>` : ""}</div>
          <div class="c4 fil"><h2 class="rubrica">Vedi anche: le storie del capitolo</h2>${G.tessere(storie, 12).replace('class="rimandi"', 'class="rimandi una"')}</div>
        </section>
        <nav class="prec-succ" aria-label="Capitoli vicini"><span>${prec ? `<a href="capitolo.html?n=${prec.n}">◂ ${G.esc(prec.titolo)}</a> <i class="gram">cap. ${prec.n}</i>` : `<a href="index.html">◂ La prima pagina</a>`}</span><span>${succ ? `<i class="gram">cap. ${succ.n}</i> <a href="capitolo.html?n=${succ.n}">${G.esc(succ.titolo)} ▸</a>` : `<a href="percorsi.html">I percorsi ▸</a>`}</span></nav>`;
      G.guideVicine(prec ? ["capitolo.html?n=" + prec.n, prec.titolo] : ["index.html", "la prima pagina"], succ ? ["capitolo.html?n=" + succ.n, succ.titolo] : ["percorsi.html", "i percorsi"]);
      G.filoDelTempo("#filo", IX.capitoli, n);
      Promise.all([G.carica("capitoli/scommesse.json"), G.carica("esperimenti.json")]).then(([SC, E]) => {
        SC.scommesse.filter((x) => x.capitolo === n).forEach((x) => { const p = el.querySelectorAll(".passo")[x.passo - 1]; if (p) G.scommessa(p, x, E); });
      }).catch(() => {});
      // il passo che si legge viene messo in evidenza (unico movimento: il grafico resta fermo e leggibile)
      const passi = el.querySelectorAll(".passo");
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((v) => v.forEach((e) => { if (e.isIntersecting) { passi.forEach((p) => p.classList.remove("attivo")); e.target.classList.add("attivo"); } }), { rootMargin: "-45% 0px -45% 0px" });
        passi.forEach((p) => io.observe(p));
      }
      return grafico(n, Array.from(passi));
    });
  });

  /* il grafico chiave del capitolo, scelto tra quelli costruiti dai dati del sito */
  function grafico(n, passi) {
    const box = "#g-chiave";
    // capitoli con un grafico che cambia stato a ogni passo (componenti in scene.js)
    if (n === 4) return G.carica("sezioni/esteri.json").then((X) => {
      const sc = G.Scena.amiciNemici(box, X), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[1], st[2], st[3], st[7], st[4], st[5], st[7], st[6], st[7]]);
      sc.stato(st[0]);
    });
    if (n === 1) return G.carica("sezioni/lingue.json").then((L) => {
      const sc = G.Scena.francese(box, L), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[1], st[2], st[3], st[4], st[5]]);
      sc.stato(st[0]);
    });
    if (n === 3) return Promise.all([G.carica("sezioni/fascismo.json"), G.Scena.primeParole(["antifascismo", "camerati", "autarchia", "razzismo", "littorio"])]).then(([F, P]) => {
      const sc = G.Scena.specchio(box, F, P), st = sc.stati;
      G.legaPassi(sc, passi, [st[0], st[0], st[0], st[0], st[1], st[2], st[2], st[3], st[3], st[3]]);
      sc.stato(st[0]);
    });
    // capitoli 2, 5, 6 e 7: curve a stati (G.Scena.curve), una serie di dati diversa per ogni passo
    const SOTTO = "Il grafico cambia a ogni passo del testo; la scritta in alto dice che cosa mostra. Parole: volte per milione di parole dette in aula, Camera e Senato, media di tre anni.";
    const serieAnni = (o, k, nome, unita) => ({ id: nome, nome: nome, unita: unita, punti: G.media3(G.ANNI.map((y) => (o[y] ? o[y][k] : null))).map((v, i) => [G.ANNI[i], v]) });
    const scenaCurve = (titolo, serie, stati, mappa) => {
      const sc = G.Scena.curve(box, { titolo: titolo, sotto: SOTTO, serie: serie, stati: stati, nomeCSV: "capitolo_" + n });
      G.legaPassi(sc, passi, mappa.map((i) => stati[i]));
      sc.stato(stati[0]);
    };
    if (n === 2) return Promise.all([G.carica("sezioni/lingue.json"), G.carica("sezioni/risate.json"), G.Scena.parole(["adunque", "imperocche", "eziandio", "quistione", "sieno", "uffizio"])]).then(([L, R, W]) => {
      const wc = (L.regno.wps || {}).camera || {};
      const pw = G.ANNI.filter((y) => y <= 1922).map((y) => [y, wc[y] != null ? wc[y] : null]);
      const v = pw.filter((q) => q[1] != null), y0 = Math.floor(d3.min(v, (q) => q[1]) - 3);
      const primo = v[0], ultimo = v[v.length - 1];
      const serie = [{ id: "wps", nome: "parole per frase", unita: "parole per frase", punti: pw },
        { id: "attesa", nome: "attesa: una discesa", unita: "parole per frase", punti: [primo, ultimo] },
        serieAnni(R.serie, 0, "ilarità", "ogni mille interventi")].concat(W);
      const parole = W.map((s) => s.id);
      scenaCurve("Il Regno: la frase si accorcia di colpo, poi le parole vecchie se ne vanno", serie, [
        { mostra: ["wps"], x: [1848, 1860], y0: y0, scritta: "Parole per frase, Camera, 1848-1860" },
        { mostra: ["wps"], x: [1848, 1922], y0: y0, scritta: "Parole per frase, Camera, 1848-1922", nota: { id: "wps", x: 1861, testo: "1861, l'Unità" } },
        { mostra: ["wps", "attesa"], evid: ["wps"], tratt: ["attesa"], x: [1848, 1922], y0: y0, scritta: "attesa: una discesa · trovato: uno scalino" },
        { mostra: parole, x: [1848, 1922], fascia: { da: 1912, a: 1919, testo: "1912-19" }, scritta: "Sei parole dell'Ottocento, per milione di parole" },
        { mostra: ["ilarità"], x: [1848, 1914], scritta: "Ilarità annotata dallo stenografo, Camera (continua nel capitolo 5)" },
      ], [0, 1, 1, 2, 3, 3, 4, 3, 1]);
    });
    if (n === 5) return Promise.all([G.carica("sezioni/risate.json"), G.Scena.parole(["compagni", "camerati", "sfruttamento", "proletariato", "padronato", "capitalismo", "ambito", "provvedere", "compromesso", "solidarieta"]), G.Scena.parole(["terrorismo"], true)]).then(([R, W, T]) => {
      const serie = [serieAnni(R.serie, 0, "ilarità", "ogni mille interventi")].concat(W, T);
      const t = (T[0] || { punti: [] }).punti.filter((q) => q[0] >= 1965 && q[0] <= 1992 && q[1] != null), tm = t.reduce((a, b) => (b[1] > a[1] ? b : a), t[0] || [0, 0]);
      scenaCurve("1943-1992: le parole della Repubblica dei partiti", serie, [
        { mostra: ["compagni", "camerati"], x: [1920, 1992], fascia: { da: 1943, a: 1946, testo: "1943-46" }, scritta: "«compagni» e «camerati», per milione di parole" },
        { mostra: ["ilarità"], x: [1848, 1992], fascia: { da: 1946, a: 1992, testo: "Repubblica" }, scritta: "Ilarità annotata dallo stenografo, Camera" },
        { mostra: ["sfruttamento", "proletariato", "padronato", "capitalismo"], evid: ["sfruttamento"], x: [1946, 1992], scritta: "Le parole di classe: resta «sfruttamento»" },
        { mostra: ["ambito", "provvedere"], x: [1848, 2022], scritta: "Due parole dell'antilingua, per milione di parole" },
        { mostra: ["compromesso", "solidarieta"], x: [1960, 1992], fascia: { da: 1976, a: 1979, testo: "1976-79" }, scritta: "«compromesso» e «solidarietà», per milione di parole" },
        { mostra: ["terrorismo"], x: [1965, 1992], nota: { id: "terrorismo", x: tm[0], testo: "massimo: " + tm[0] }, scritta: "«terrorismo», per milione di parole, anno per anno" },
      ], [0, 0, 1, 2, 3, 4, 4, 5, 5]);
    });
    if (n === 6) return Promise.all([G.carica("sezioni/insulti.json"), G.Scena.parole(["mafia", "droga", "immigrazione", "extracomunitari", "emigrazione", "tangenti", "padania"]), G.Scena.parole(["tangentopoli"], true)]).then(([I, W, T]) => {
      const serie = [serieAnni(I.serie, 0, "insulti", "ogni mille parole")].concat(W, T);
      scenaCurve("1980-1994: le parole entrano in aula prima della Seconda Repubblica", serie, [
        { mostra: ["tangentopoli"], x: [1980, 2000], scritta: "«tangentopoli», per milione di parole, anno per anno" },
        { mostra: ["mafia", "droga", "immigrazione", "extracomunitari", "emigrazione"], x: [1975, 2000], scritta: "Un mondo che cambia parole, per milione di parole" },
        { mostra: ["tangentopoli", "tangenti"], x: [1980, 2000], scritta: "«tangentopoli» e «tangenti», per milione di parole" },
        { mostra: ["padania"], x: [1980, 2022], scritta: "«Padania», per milione di parole" },
        { mostra: ["insulti"], x: [1948, 2022], fascia: { da: 1994, a: 2022, testo: "dal 1994" }, scritta: "Parole d'insulto ogni mille parole, Camera e Senato" },
      ], [0, 0, 0, 1, 0, 2, 3, 4, 4]);
    });
    if (n === 7) return G.Scena.parole(["noi", "io", "cittadini", "spread", "privacy", "internet", "leader", "premier", "welfare", "extracomunitari", "clandestini", "migranti", "voi", "avete"]).then((W) => {
      scenaCurve("1994-2022: parole nuove, più «io» e più «voi»", W, [
        { mostra: ["noi", "io", "cittadini"], x: [1948, 2022], scritta: "«noi», «io», «cittadini», per milione di parole" },
        { mostra: ["spread", "privacy", "internet"], x: [1960, 2022], scritta: "Le parole nuove hanno una data: «spread», «privacy», «internet»" },
        { mostra: ["leader", "premier", "welfare"], x: [1948, 2022], scritta: "Parole inglesi, per milione di parole" },
        { mostra: ["extracomunitari", "clandestini", "migranti"], x: [1980, 2022], scritta: "Le parole cambiano ogni dieci anni: «extracomunitari», «clandestini», «migranti»" },
        { mostra: ["io"], x: [1948, 2022], fascia: { da: 2013, a: 2022, testo: "dal 2013" }, scritta: "«io», per milione di parole" },
        { mostra: ["voi", "avete"], x: [1994, 2022], fascia: { da: 2018, a: 2019, testo: "2018" }, scritta: "«voi» e «avete», per milione di parole" },
      ], [0, 1, 2, 3, 4, 4, 5, 5, 0, 0]);
    });
    return null;
  }
})();
