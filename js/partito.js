/* Pagina di un partito: partito.html?id=PCI */
(function () {
  "use strict";
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  G.avvia(function () {
    G.testata({ attivo: "Partiti" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = G.param("id") || "PCI";
    return Promise.all([G.carica("partiti/" + slug(id) + ".json"), G.carica("partiti/indice.json"), G.carica("base.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))])
      .then(([P, IX, B, E, S]) => pagina(el, P, IX, B, E, S))
      .catch((e) => { console.error(e); G.nonTrovato(el, "Questo partito non c'è nella mappa della Camera."); });
  });

  function pagina(el, P, IX, B, E, S) {
    const nome = P.nome;
    document.title = nome + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = nome;
    const U = P.unita;
    const colF = G.FAMIGLIA[P.famiglia] || "#E5007D";
    const chiaro = ["#FF7BAC", "#00B4D8", "#00A85A", "#F5C400", "#B8BEC7"].includes(colF);
    document.body.style.setProperty("--sez", colF); document.body.style.setProperty("--sez-s", chiaro ? "#16181D" : colF); document.body.style.setProperty("--sez-testo", chiaro ? "#16181D" : "#fff");
    G.colori();
    const da = Math.round(U[0].anno - 2.5), a = Math.min(2022, Math.round(U[U.length - 1].anno + 2.5));
    G.dove([da, a, nome + ", " + da + "-" + a]);
    const max = U.reduce((p, q) => (q.quota > p.quota ? q : p));
    const legId = (n) => "repubblica-" + n;
    const gov = P.governi.filter((g) => g[3] === "G").length;
    const storie = (S.storie || []).filter((s) => (s.partiti || []).some((x) => x === P.id || x === nome));
    const esp = E.elenco.filter((e) => (P.esperimenti || []).includes(e.cod));
    el.innerHTML = `
      <h1 class="titolo-pagina">${G.esc(nome)}</h1>
      <p class="sommario">Alla Camera in ${U.length} ${U.length === 1 ? "legislatura" : "legislature"}, ${U.length === 1 ? "la " + G.romano(U[0].leg) : "dalla " + G.romano(U[0].leg) + " alla " + G.romano(U[U.length - 1].leg)}. Il massimo è nella <a class="lk" href="legislatura.html?id=${legId(max.leg)}">${G.romano(max.leg)} legislatura</a>: ${G.pct(max.quota)} delle parole dei deputati, con ${G.num(max.n_orat)} oratori. Famiglia: ${G.esc(P.famiglia)}.${gov ? ` Al governo in ${gov} governi.` : ""}</p>
      <section class="griglia"><div class="c8" id="g-quota"></div><aside class="c4 fil"><h3 class="titolo-piccolo">Legislatura per legislatura</h3><ul class="fatti" id="fatti"></ul></aside></section>
      <section class="sezione griglia"><div class="c8" id="g-scia"></div><div class="c4 fil"><h3 class="titolo-piccolo">Da opposizione o da governo?</h3><p class="fig-sotto">Probabilità che la lingua dei suoi deputati sia «da opposizione», legislatura per legislatura, secondo il programma che riconosce il ruolo dalle parole (H67). La barra sotto è la quota di giorni passati al governo.</p><div id="g-opp"></div></div></section>
      <section class="sezione"><div class="testa"><h2>Le sue parole, con le frasi vere</h2></div><p class="sotto-titolo">Per ogni legislatura, alcune delle parole che il partito dice più del resto dell'aula, ognuna con una frase detta da un suo deputato.</p><div id="frasi-tip"></div></section>
      <section class="sezione griglia"><div class="c8" id="g-linea"></div><div class="c4 fil"><h3 class="titolo-piccolo">A chi somiglia</h3><p class="fig-sotto">Il partito di un'altra famiglia con la lingua più simile, legislatura per legislatura (somiglianza più alta = più simile)</p><ul class="elenco-n" id="somiglia"></ul></div></section>
      <section class="sezione"><div class="testa"><h2>Le parole più sue</h2></div><p class="sotto-titolo">Le parole che il partito dice più del resto dell'aula, in ogni legislatura, Camera. Tra queste ci sono anche i nomi dei suoi oratori.</p><div class="tab-scorre" id="t-tipiche"></div></section>
      <section class="sezione"><div class="testa"><h2>Che cosa guadagna e che cosa perde a ogni passaggio</h2></div><p class="sotto-titolo">Parole che salgono o scendono da una legislatura all'altra, misurate rispetto al resto dell'aula: una parola «persa» può crescere in valore assoluto se il resto dell'aula cresce di più. Accanto: volte per milione prima e dopo.</p><div class="tab-scorre" id="t-passaggi"></div></section>
      <section class="sezione griglia">
        <div class="c5"><h3 class="titolo-piccolo">Chi parla di più</h3><p class="fig-sotto">Parole dette alla Camera da deputati del partito, tutte le legislature</p><div id="oratori"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">I governi</h3><p class="fig-sotto">G al governo, A appoggio o astensione (fonte: ParlGov)</p><div class="tab-scorre" id="t-gov"></div></div>
        <div class="c3 fil"><h3 class="titolo-piccolo">Esperimenti</h3><ul class="fatti" id="colleg"></ul></div>
      </section>
      <section class="sezione"><div class="testa"><h2>Le storie</h2><span class="a-destra"><a href="storie.html">Tutte le storie</a></span></div><div id="tessere-p"></div></section>`;
    // quota per legislatura: colonne sul tempo
    const area = G.figura("#g-quota", {
      titolo: `${G.esc(nome)} arriva al ${G.pct(max.quota)} delle parole dei deputati nella ${G.romano(max.leg)} legislatura`,
      sotto: "Quota delle parole dette dai deputati come parlamentari (senza ministri e relatori), Camera, una colonna per legislatura",
      limite: "La quota non somma a 100 tra i partiti della mappa: mancano i gruppi minori.",
      csv: () => [["legislatura", "anno_medio", "quota", "oratori", "quota_governo"]].concat(U.map((u) => [u.leg, u.anno, u.quota, u.n_orat, u.gov])), nomeCSV: "quota_" + P.slug,
    });
    G.grafico(area, (ar, w) => {
      const h = w < 560 ? 220 : 280, m = { t: 26, r: 8, b: 24, l: 0 };
      const svg = ar.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Quota di parole per legislatura");
      const x = d3.scaleLinear().domain([1946, 2023]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, Math.max(0.1, max.quota * 1.15)]).range([h - m.b, m.t]);
      const g = svg.append("g").attr("class", "asse");
      y.ticks(4).forEach((v, i, arr) => { g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null); g.append("text").attr("x", 0).attr("y", y(v) - 4).text(G.pct(v, 0) + (i === arr.length - 1 ? " delle parole" : "")); });
      U.forEach((u) => {
        const lg = B.legislature.find((l) => l.id === legId(u.leg));
        const x0 = x(lg ? lg.da : u.anno - 2), x1 = x(lg ? lg.a + 1 : u.anno + 2) - 2;
        const lk = svg.append("a").attr("href", "legislatura.html?id=" + legId(u.leg));
        lk.append("rect").attr("x", x0).attr("width", Math.max(2, x1 - x0)).attr("y", y(u.quota)).attr("height", y(0) - y(u.quota)).attr("fill", u === max ? G.ROSSO : G.NERO);
        if (x1 - x0 > 26) lk.append("text").attr("x", (x0 + x1) / 2).attr("y", y(u.quota) - 4).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700).text(G.romano(u.leg));
      });
      [1950, 1970, 1990, 2010].forEach((v) => g.append("text").attr("x", x(v)).attr("y", h - 6).attr("text-anchor", "middle").text(v));
    });
    document.getElementById("fatti").innerHTML = U.map((u) => `<li><a href="legislatura.html?id=${legId(u.leg)}">${G.romano(u.leg)} legislatura</a>: <b>${G.pct(u.quota)}</b><span class="et">${G.num(u.n_orat)} oratori; al governo ${u.gov == null ? "–" : G.pct(u.gov, 0)} dei giorni</span></li>`).join("");
    // scia: dove sta il partito, legislatura per legislatura, sullo stesso piano di tutti gli altri
    G.carica("partiti/traiettorie.json").then((TR) => {
      const tutti = [].concat(...Object.values(TR.partiti));
      const mio = P.traiettoria && P.traiettoria.length ? P.traiettoria : (TR.partiti[P.id] || []);
      const area = G.figura("#g-scia", {
        titolo: `Dove sta la lingua di ${G.esc(nome)}, legislatura per legislatura`,
        sotto: "Ogni punto grigio è un partito in una legislatura (Camera, 1948-2022), sullo stesso piano: più due punti sono vicini, più usano le stesse parole. La scia colorata è questo partito; il numero è la legislatura.",
        limite: "Le due direzioni riassumono poco più di un terzo delle differenze tra i partiti; la posizione viene dalle parole, non dai voti.",
        csv: () => [["legislatura", "anno", "d1", "d2", "quota"]].concat(mio.map((q) => q.slice(0, 5))), nomeCSV: "scia_" + P.slug,
      });
      G.grafico(area, (a, w) => {
        const h = w < 560 ? 300 : 420, m = 24;
        const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Scia del partito");
        const x = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[2])).nice().range([m, w - m]);
        const y = d3.scaleLinear().domain(d3.extent(tutti, (q) => q[3])).nice().range([h - m, m]);
        svg.append("text").attr("x", m).attr("y", 14).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di destra ↑");
        svg.append("text").attr("x", m).attr("y", h - 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di sinistra ↓");
        tutti.forEach((q) => svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", 3).attr("fill", G.GDATI).attr("fill-opacity", 0.55));
        svg.append("path").attr("d", d3.line().curve(d3.curveLinear).x((q) => x(q[2])).y((q) => y(q[3]))(mio)).attr("fill", "none").attr("stroke", colF).attr("stroke-width", 3);
        mio.forEach((q, i) => {
          svg.append("circle").attr("cx", x(q[2])).attr("cy", y(q[3])).attr("r", 5 + 20 * Math.sqrt(q[4] || 0)).attr("fill", colF).attr("fill-opacity", i === mio.length - 1 ? 1 : 0.75).attr("stroke", "#fff").attr("stroke-width", 1.5);
          svg.append("text").attr("x", x(q[2]) + 8 + 20 * Math.sqrt(q[4] || 0)).attr("y", y(q[3]) + 4).attr("class", "etich").attr("fill", G.INK).text(G.romano(q[0]));
        });
      });
    });
    const OP = P.opposizione || [];
    const aop = d3.select("#g-opp");
    if (OP.length) G.grafico(aop, (a, w) => {
      const rh = 26, lw = 54, h = OP.length * rh + 24;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Probabilità di lingua da opposizione");
      const x = d3.scaleLinear().domain([0, 1]).range([lw, w - 40]);
      [0, 0.5, 1].forEach((v) => { svg.append("line").attr("x1", x(v)).attr("x2", x(v)).attr("y1", 0).attr("y2", h - 18).attr("stroke", G.RIGA); svg.append("text").attr("x", x(v)).attr("y", h - 4).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(v === 0 ? "governo" : v === 1 ? "opposizione" : "metà"); });
      OP.forEach((o, i) => {
        const yy = i * rh + 12;
        svg.append("text").attr("x", lw - 8).attr("y", yy + 4).attr("text-anchor", "end").attr("font-size", 13).attr("font-weight", 700).attr("fill", G.INK).text(G.romano(o[0]));
        svg.append("rect").attr("x", x(0)).attr("y", yy + 6).attr("width", x(o[2] || 0) - x(0)).attr("height", 4).attr("fill", G.GDATI);
        svg.append("circle").attr("cx", x(o[1])).attr("cy", yy).attr("r", 6).attr("fill", colF);
        svg.append("text").attr("x", x(o[1]) + 10).attr("y", yy + 4).attr("font-size", 12).attr("fill", G.GRIGIO).text(G.pct(o[1], 0));
      });
    }); else aop.html('<p class="grigio">Il programma di H67 non dà un punteggio per questo partito.</p>');
    const FT = P.frasi_tipiche || {};
    document.getElementById("frasi-tip").innerHTML = Object.keys(FT).length ? Object.keys(FT).sort((a, b) => a - b).map((l) => `<h3 class="titolo-piccolo" style="margin-top:22px"><a href="legislatura.html?id=repubblica-${l}">${G.romano(+l)} legislatura</a></h3><ul class="elenco-frasi">${FT[l].slice(0, 4).map((f) => `<li><span class="quando"><b>${G.esc(f[0])}</b> · ${G.data(f[1])}, ${f[2] ? (f[3] ? G.lPersona(f[3], G.oratore(f[2])) : G.esc(G.oratore(f[2]))) : "oratore non riconosciuto"}</span><q>${G.frase(f[4], [f[0]])}</q></li>`).join("")}</ul>`).join("") : '<p class="grigio">Nessuna frase disponibile.</p>';
    // linea della famiglia nel tempo, con le altre in grigio
    const area2 = G.figura("#g-linea", {
      titolo: `Dove sta la lingua della famiglia ${G.esc(P.famiglia)} rispetto alle altre`,
      sotto: "Posizione ricavata dalle parole, Camera, 1948-2022: in basso le parole della sinistra, in alto quelle della destra. Più due linee sono vicine, più le famiglie usano le stesse parole. In rosso la famiglia di questo partito." + (P.asse && P.asse.length ? " Sotto, la scala DC-PCI con il suo margine di incertezza." : ""),
      limite: "La posizione viene dalle parole, non dai voti.",
      csv: () => [["famiglia", "anno", "posizione", "scheda"]].concat([].concat(...Object.entries(IX.linee).map(([f, l]) => l.map((p) => [f, p[0], p[1], p[2]])))), nomeCSV: "linee_famiglie",
    });
    G.grafico(area2, (ar, w) => {
      const L = IX.linee, tutti = [].concat(...Object.values(L)).map((p) => p[1]), ext = d3.extent(tutti);
      const fam = P.famiglia;
      const r = G.linee(ar, w, {
        x: [1948, 2022], y: [ext[0] - 0.005, ext[1] + 0.005], yTicks: [], h: w < 560 ? 240 : 300, m: { r: w < 560 ? 60 : 120 }, etichSopra: false,
        serie: Object.keys(L).filter((f) => f !== fam).map((f) => ({ punti: L[f].map((p) => [p[0], p[1]]), colore: G.GDATI, sp: 1, etich: f })).concat(L[fam] ? [{ punti: L[fam].map((p) => [p[0], p[1]]), colore: G.ROSSO, sp: 2.5, punto: 2.5, etich: fam }] : []),
      });
      r.svg.append("text").attr("x", 0).attr("y", r.y(ext[1]) + 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di destra");
      r.svg.append("text").attr("x", 0).attr("y", r.y(ext[0]) - 4).attr("font-size", 12).attr("fill", G.GRIGIO).text("parole di sinistra");
      if (P.asse && P.asse.length) {
        const div = ar.append("div").style("margin-top", "16px");
        div.append("p").attr("class", "fig-sotto").text("Scala DC-PCI: 0 è la lingua della DC, 1 quella del PCI; anno per anno, con il margine di incertezza in grigio.");
        G.linee(div, w, { x: [1948, 1994], y: [-0.2, 1.2], yTicks: [0, 0.5, 1], h: 200, serie: [{ punti: P.asse.map((p) => [p[0], p[1]]), banda: P.asse.map((p) => [p[0], p[2], p[3]]), colore: G.ROSSO, sp: 2.5, etich: nome }] });
      }
    });
    // somiglianze
    document.getElementById("somiglia").innerHTML = U.map((u) => { const s = (P.somiglianze || {})[u.leg]; const x = s && s.altro_partito && s.altro_partito[0]; return x ? `<li><span>${G.romano(u.leg)}: ${G.lPartito(x[0], x[0].replace("Unita'", "Unità"))} (${x[1]})</span><span>${G.num(x[2], 2)}</span></li>` : ""; }).join("") || '<li class="grigio">Nessun dato</li>';
    // parole tipiche
    const legs = Object.keys(P.tipiche || {}).sort((a, b) => a - b);
    document.getElementById("t-tipiche").innerHTML = legs.length ? '<table class="fitta"><thead><tr><th>legislatura</th><th>parole più sue</th></tr></thead><tbody>' + legs.map((l) => `<tr><td><a href="legislatura.html?id=${legId(l)}">${G.romano(+l)}</a></td><td>${P.tipiche[l].slice(0, 12).map((x) => G.lParola(x[0], x[1])).join(", ")}</td></tr>`).join("") + "</tbody></table>" : '<p class="grigio">Troppe poche parole per calcolarle.</p>';
    // passaggi
    const pas = Object.entries(P.passaggi || {}).sort((a, b) => +a[0].split("-")[0] - +b[0].split("-")[0]);
    const cont = new Map((P.continuita || []).map((c) => [c[0] + "-" + c[1], c]));
    document.getElementById("t-passaggi").innerHTML = pas.length ? '<table class="fitta"><thead><tr><th>passaggio</th><th class="n">somiglianza con la legislatura prima</th><th>guadagnate</th><th>perse</th></tr></thead><tbody>' +
      pas.map(([k, v]) => { const [x, y] = k.split("-").map(Number); const c = cont.get(k); return `<tr><td>${G.romano(x)} → ${G.romano(y)}</td><td class="n">${c ? G.num(c[2], 2) + " (tra " + G.num(c[3], 2) + " e " + G.num(c[4], 2) + ")" : "–"}</td><td>${v.guadagnata.slice(0, 6).map((p) => G.lParola(p[0], p[1]) + ' <span class="grigio">' + G.num(p[2]) + "→" + G.num(p[3]) + "</span>").join(", ")}</td><td>${v.persa.slice(0, 6).map((p) => G.lParola(p[0], p[1]) + ' <span class="grigio">' + G.num(p[2]) + "→" + G.num(p[3]) + "</span>").join(", ")}</td></tr>`; }).join("") + "</tbody></table>" : '<p class="grigio">Il partito è in una sola legislatura: non ci sono passaggi.</p>';
    document.getElementById("oratori").innerHTML = P.oratori.length ? G.barre(P.oratori.slice(0, 12).map((o, i) => [G.lPersona(o[0], G.oratore(o[1])), o[2], i === 0])) : '<p class="grigio">Nessun dato</p>';
    const govS = P.governi.filter((g) => g[3] === "G" || g[3] === "A");
    document.getElementById("t-gov").innerHTML = govS.length ? '<table class="fitta"><tbody>' + govS.map((g) => `<tr><td>${G.esc(g[0])}</td><td>${g[1].slice(0, 4)}</td><td><b>${g[3]}</b></td></tr>`).join("") + "</tbody></table>" : '<p class="grigio">Mai al governo né in appoggio.</p>';
    const col = [];
    document.getElementById("tessere-p").innerHTML = storie.length ? G.tessere(storie, 8) : '<p class="grigio">Nessuna storia cita questo partito.</p>';
    esp.slice(0, 10).forEach((e) => col.push(`${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span>`));
    col.push(`<a href="partiti.html">Tutti i partiti</a>`);
    document.getElementById("colleg").innerHTML = col.map((x) => `<li>${x}</li>`).join("");
  }
})();
