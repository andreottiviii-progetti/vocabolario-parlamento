/* Pagina di una parola: parola.html?p=tangentopoli[&con=spread,casta] */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Parole" });
    G.piede();
    const el = document.getElementById("contenuto");
    const w = G.norma(G.param("p") || "");
    const con = (G.param("con") || "").split(",").map(G.norma).filter((x) => x && x !== w).slice(0, 4);
    if (!w) { location.replace("parole.html"); return; }
    return Promise.all([G.indiceParole(), G.carica("base.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([IX, B, E, S]) => {
      if (!IX._mappa.has(w)) return nonC(el, w, IX);
      return Promise.all([G.curvaParola(w), G.schedaParola(w)].concat(con.map((c) => G.curvaParola(c)))).then((r) => pagina(el, r[0], r[1] || {}, r.slice(2).filter(Boolean), B, E, S, IX));
    });
  });

  function nonC(el, w, IX) {
    document.getElementById("bric").textContent = w;
    const simili = IX.p.filter((r) => r[0].startsWith(w.slice(0, Math.max(3, w.length - 2)))).sort((a, b) => b[2] - a[2]).slice(0, 30);
    el.innerHTML = `<h1 class="titolo-pagina">${G.esc(w)}</h1><p class="sommario">«${G.esc(w)}» non è tra le ${G.num(G.conti.parole)} parole del sito: servono almeno 1.000 volte in aula tra il 1848 e il 2022. Le parole sono scritte senza accenti e senza maiuscole.</p>` +
      (simili.length ? `<h2 class="titolo-piccolo">Parole che cominciano allo stesso modo</h2><p class="parole-nuvola">${simili.map((r) => G.lParola(r[0], r[1] || r[0]) + "<small>" + G.num(r[2]) + "</small>").join(" ")}</p>` : "") +
      `<p><a class="leggi" href="parole.html">Tutte le parole</a></p>`;
  }

  function pagina(el, C, D, altre, B, E, S, IX) {
    const w = C.w, f = C.forma;
    document.title = f + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = f;
    const tc = C.pm.nc.reduce((a, b) => a + b, 0), ts = C.pm.ns.reduce((a, b) => a + b, 0);
    const pk = G.picco(C.pm.m);
    const pv = D.pv;
    const legPk = G.legDiAnno(pk.anno, B.legislature);
    const prima = pv ? `La prima volta è il ${G.data(pv[0])}, al ${G.ramo(pv[1])}: ${pv[3] ? G.lPersona(pv[3], G.oratore(pv[2])) : G.esc(G.oratore(pv[2]))}.` : "";
    const storie = (S.storie || []).filter((s) => (s.parole || []).map(G.norma).includes(w));
    const reW = new RegExp("(^|[^a-zà-ù])" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-zà-ù]|$)", "i");
    const esp = E.elenco.filter((e) => reW.test(e.titolo + " " + e.attesa + " " + e.numero));
    el.innerHTML = `
      <h1 class="titolo-pagina"><span class="evid">${G.esc(f)}</span></h1>
      <p class="sommario">Detta <b>${G.num(C.tot)}</b> volte in aula dal ${C.y0} al 2022, ${G.num(tc)} alla Camera e ${G.num(ts)} al Senato. L'anno di punta è il <a class="lk" href="anno.html?a=${pk.anno}">${pk.anno}</a>, con ${G.num1(pk.val)} volte per milione di parole. ${prima}</p>
      <section class="griglia">
        <div class="c8">
          <div class="filtri" role="group" aria-label="Come disegnare la curva"><button type="button" data-m="m" class="attivo">Media dei due rami</button><button type="button" data-m="cs">Camera e Senato</button><button type="button" data-m="a">Anno per anno</button></div>
          <div id="g-curva"></div>
          <div class="riga-parole" style="margin-top:14px"><input id="in-con" type="search" placeholder="aggiungi parole al confronto, separate da virgola" aria-label="Parole da confrontare" autocomplete="off"><button class="bottone" id="ok-con" type="button">Confronta</button></div>
          <p class="avviso" id="avviso"></p>
        </div>
        <aside class="c4 fil"><h3 class="titolo-piccolo">In cifre</h3><ul class="fatti" id="fatti"></ul></aside>
      </section>
      <section class="sezione griglia">
        <div class="c8"><h2 class="titolo-medio">Le frasi vere</h2><p class="fig-sotto">La prima volta e alcune frasi dell'anno di punta, come sono scritte nel resoconto.</p><ul class="frasi" id="frasi"></ul></div>
        <div class="c4 fil"><h3 class="titolo-piccolo" id="tit-or">Chi la dice di più</h3><p class="fig-sotto">Volte, Camera e Senato, ${C.y0}-2022. I nomi senza link sono come li scrive il resoconto.</p><div id="oratori"></div></div>
      </section>
      <section class="sezione griglia">
        <div class="c5"><h3 class="titolo-piccolo" id="tit-pa">I partiti che la usano di più</h3><p class="fig-sotto">Volte per milione di parole del partito, Camera della Repubblica (1948-2022), partiti con almeno 2 milioni di parole.</p><div id="partiti"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">Parole con la stessa storia</h3><p class="fig-sotto">Le parole la cui curva somiglia di più a quella di «${G.esc(f)}».</p><p class="parole-nuvola" id="vicine"></p>
          <h3 class="titolo-piccolo" style="margin-top:18px">Gli anni in cui si dice di più</h3><ul class="elenco-n" id="anni-top"></ul></div>
        <div class="c3 fil"><h3 class="titolo-piccolo">Collegamenti</h3><ul class="fatti" id="colleg"></ul></div>
      </section>`;
    // fatti
    const fatti = [
      [`<b>${G.num(C.tot)}</b> volte`, `${G.num(tc)} alla Camera, ${G.num(ts)} al Senato`],
      [`<b>${pk.anno}</b>, anno di punta`, `${G.num1(pk.val)} volte per milione di parole; <a href="anno.html?a=${pk.anno}">l'anno</a>`],
    ];
    if (legPk) fatti.push([`<a href="legislatura.html?id=${legPk.id}">${G.esc(legPk.nome)}</a>`, `la legislatura dell'anno di punta (${legPk.da}-${legPk.a})`]);
    if (pv) fatti.push([`<b>${G.data(pv[0])}</b>, la prima volta`, `${G.ramo(pv[1])}, ${pv[3] ? G.lPersona(pv[3], G.oratore(pv[2])) : G.esc(G.oratore(pv[2]))}`]);
    if (D.sp) fatti.push([`<b>${G.num(D.sp[0])}</b> comparse sparse prima del ${C.y0}`, `negli anni ${D.sp[1].join(", ")}: spesso sono errori dello scanner, e non entrano nella curva`]);
    document.getElementById("fatti").innerHTML = fatti.map((x) => `<li>${x[0]}<span class="et">${x[1]}</span></li>`).join("");
    // frasi
    const forme = [f, w];
    const fr = [];
    if (pv && pv[4]) fr.push(["La prima volta", pv]);
    (D.fr || []).forEach((x) => { if (!pv || x[4] !== pv[4]) fr.push([String(x[0]).slice(0, 4) === String(pk.anno) ? "Anno di punta" : "", x]); });
    document.getElementById("frasi").innerHTML = fr.length ? fr.map(([et, x]) => `<li><span class="quando">${et ? "<b>" + et + "</b> · " : ""}${G.data(x[0])}, ${G.ramo(x[1])}, ${x[3] ? G.lPersona(x[3], G.oratore(x[2])) : G.esc(G.oratore(x[2]))}</span><q>${G.frase(x[4], forme)}</q></li>`).join("") : '<li class="grigio">Nessuna frase breve trovata.</li>';
    // oratori
    const or = (D.or || []).slice(0, 8);
    document.getElementById("oratori").innerHTML = or.length ? G.barre(or.map((o) => [o[0] ? G.lPersona(o[0], G.oratore(o[1])) : G.esc(G.oratore(o[1])), o[2]])) : '<p class="grigio">Nessun oratore principale.</p>';
    if (or.length) document.getElementById("tit-or").textContent = G.nome(or[0][1]) + " la dice " + G.num(or[0][2]) + " volte";
    // partiti
    const pa = (D.pa || []).slice(0, 8);
    document.getElementById("partiti").innerHTML = pa.length ? G.barre(pa.map((p, i) => [G.lPartito(p[0], p[0].replace("Unita'", "Unità")), p[1], i === 0]), { fmt: (v) => G.num1(v) }) + `<p class="fig-fonte">Il primo partito la dice ${G.num(pa[0][2], 1)} volte quanto la media dell'aula repubblicana.</p>` : '<p class="grigio">Troppo poche volte alla Camera della Repubblica per confrontare i partiti.</p>';
    if (pa.length) document.getElementById("tit-pa").innerHTML = `Il ${G.esc(pa[0][0].replace("Unita'", "Unità"))} la usa ${G.num(pa[0][2], 1)} volte la media`;
    // vicine
    document.getElementById("vicine").innerHTML = (D.vi || []).map((v) => { const r = IX.p[IX._mappa.get(v)]; return G.lParola(v, (r && r[1]) || v); }).join(" ");
    // anni top
    const anni = G.ANNI.map((a, i) => [a, C.pm.m[i]]).filter((x) => x[1] != null).sort((a, b) => b[1] - a[1]).slice(0, 6);
    document.getElementById("anni-top").innerHTML = anni.map((x) => `<li><span>${G.lAnno(x[0])}</span><span>${G.num1(x[1])} per milione</span></li>`).join("");
    // collegamenti
    const col = [];
    storie.forEach((s) => col.push(`<a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a><span class="et">storia</span>`));
    esp.slice(0, 8).forEach((e) => col.push(`${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span>`));
    if (legPk) col.push(`<a href="legislatura.html?id=${legPk.id}">${G.esc(legPk.nome)}</a><span class="et">legislatura</span>`);
    document.getElementById("colleg").innerHTML = col.length ? col.map((x) => `<li>${x}</li>`).join("") : '<li class="grigio">Nessuna storia o esperimento cita questa parola.</li>';

    // curva
    let modo = "m";
    let serie = [C].concat(altre);
    const area = G.figura("#g-curva", {
      titolo: "", lettura: true,
      sotto: "",
      limite: "Un anno di un ramo entra nella curva solo con almeno 300.000 parole: restano fuori quasi tutti gli anni 1934-40; nel 1941-45 non ci sono sedute.",
      csv: () => [["anno"].concat([].concat(...serie.map((s) => [s.w + "_camera_volte", s.w + "_senato_volte", s.w + "_per_milione_media"])))].concat(G.ANNI.map((a, i) => [a].concat([].concat(...serie.map((s) => [s.pm.nc[i], s.pm.ns[i], s.pm.m[i] == null ? "" : s.pm.m[i].toFixed(2)]))))),
      nomeCSV: "parola_" + w,
    });
    const box = area.node().parentNode;
    function testi() {
      const s0 = serie[0], p0 = G.picco(s0.pm.m);
      box.querySelector(".fig-tit").innerHTML = serie.length > 1 ? `<span style="color:${G.SERIE[0]}">«${G.esc(s0.forma)}»</span> tocca il massimo nel ${p0.anno}, ` + serie.slice(1).map((s, i) => `<span style="color:${G.SERIE[i + 1]}">«${G.esc(s.forma)}»</span> nel ${G.picco(s.pm.m).anno}`).join(", ") : `«${G.esc(G.maiusc(s0.forma))}» tocca il massimo nel ${p0.anno}: ${G.num1(p0.val)} volte per milione di parole`;
      box.querySelector(".fig-sotto").textContent = modo === "a" ? "Volte per milione di parole, media dei due rami, anno per anno, 1848-2022." : modo === "cs" ? "Volte per milione di parole, media mobile di tre anni: linea piena la Camera, tratteggio il Senato, 1848-2022." : "Volte per milione di parole, media dei due rami e media mobile di tre anni. Righe tratteggiate verticali: cambi di trascrizione.";
    }
    testi();
    G.grafico(area, (a, wd) => {
      const ss = [];
      serie.forEach((s, i) => {
        const col = G.SERIE[i];
        const pkk = G.picco(s.pm.m);
        if (modo === "cs") {
          ss.push({ punti: G.ANNI.map((y, k) => [y, G.media3(s.pm.c)[k]]), colore: col, sp: i === 0 ? 2.5 : 1.5, etich: s.forma + " (Camera)" });
          ss.push({ punti: G.ANNI.map((y, k) => [y, G.media3(s.pm.s)[k]]), colore: col, sp: 1.3, tratt: "4 3", etich: s.forma + " (Senato)" });
        } else {
          const v = modo === "a" ? s.pm.m : G.media3(s.pm.m);
          ss.push({ punti: G.ANNI.map((y, k) => [y, v[k]]), colore: col, sp: i === 0 ? 2.5 : 1.5, etich: s.forma, piccoEtich: { x: pkk.anno, y: v[pkk.i], testo: s.forma + " " + pkk.anno + ": " + G.num1(pkk.val) } });
        }
      });
      const y0 = d3.min(serie, (s) => s.y0);
      const da = y0 >= 1950 ? y0 - 8 : 1848;
      ss.forEach((s) => { s.punti = s.punti.filter((p) => p[0] >= da); });
      const max = d3.max(ss, (s) => d3.max(s.punti, (p) => p[1] || 0)) || 1;
      G.linee(a, wd, {
        x: [da, 2022], y: [0, max * 1.1], serie: ss, unita: "volte per milione", trascr: modo === "a" ? null : "entrambi", h: wd < 560 ? 250 : 360,
        lettura: (y) => "<b>" + y + "</b>: " + serie.map((s, i) => `<span style="color:${G.SERIE[i]};font-weight:700">${G.esc(s.forma)}</span> ${s.pm.m[y - 1848] == null ? "nessun dato" : G.num1(s.pm.m[y - 1848]) + " per milione (" + G.num(s.pm.nc[y - 1848] + s.pm.ns[y - 1848]) + " volte)"}`).join(" · "),
      });
      const riga = box.querySelector(".fig-lettura");
      if (riga && !riga.innerHTML) riga.textContent = wd < 560 ? "Tocca il grafico per leggere i valori di un anno." : "Passa sul grafico per leggere i valori di un anno.";
    });
    box.parentNode.parentNode.querySelectorAll(".filtri button").forEach((b) => b.addEventListener("click", () => {
      modo = b.dataset.m;
      box.parentNode.parentNode.querySelectorAll(".filtri button").forEach((x) => x.classList.toggle("attivo", x === b));
      testi(); G.ridisegna("#g-curva .fig-area");
    }));
    function confronta(t) {
      const nuove = t.split(/[,;]+/).map(G.norma).filter((x) => x && x !== w).slice(0, 4);
      Promise.all(nuove.map((x) => G.curvaParola(x))).then((rr) => {
        const mancano = nuove.filter((x, i) => !rr[i]);
        document.getElementById("avviso").textContent = mancano.length ? mancano.map((x) => "«" + x + "»").join(", ") + " non " + (mancano.length > 1 ? "sono" : "è") + " tra le parole del sito." : "";
        serie = [C].concat(rr.filter(Boolean));
        try { history.replaceState(null, "", "?p=" + w + (serie.length > 1 ? "&con=" + serie.slice(1).map((s) => s.w).join(",") : "")); } catch (e) { /* niente */ }
        testi(); G.ridisegna("#g-curva .fig-area");
      });
    }
    document.getElementById("in-con").addEventListener("keydown", (e) => { if (e.key === "Enter") confronta(e.target.value); });
    document.getElementById("ok-con").addEventListener("click", () => confronta(document.getElementById("in-con").value));
    if (altre.length) document.getElementById("in-con").value = altre.map((s) => s.forma).join(", ");
  }
})();
