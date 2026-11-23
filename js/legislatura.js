/* Pagina di una legislatura: legislatura.html?id=repubblica-7 */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Legislature" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = G.param("id") || "repubblica-7";
    return Promise.all([G.carica("legislature/" + id + ".json"), G.carica("base.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))])
      .then(([L, B, E, S]) => pagina(el, L, B, E, S))
      .catch(() => G.nonTrovato(el, "Questa legislatura non c'è."));
  });

  const nomeP = (p) => (p || "").replace("Unita'", "Unità");

  function pagina(el, L, B, E, S) {
    document.title = L.nome + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = L.nome;
    G.dove([L.da, L.a, L.nome + ", " + L.da + "-" + L.a]);
    const il = B.legislature.findIndex((l) => l.id === L.id), lp = B.legislature[il - 1], ls = B.legislature[il + 1];
    G.guideVicine(lp ? ["legislatura.html?id=" + lp.id, lp.nome] : null, ls ? ["legislatura.html?id=" + ls.id, ls.nome] : null);
    const C = L.archivi.camera, Se = L.archivi.senato;
    const oc = (L.oratori.camera || [])[0];
    const rep = L.epoca === "repubblica";
    const romano = L.n ? G.romano(L.n) : "";
    const storie = (S.storie || []).filter((s) => (s.legislature || []).includes(romano) && rep);
    const esp = E.elenco.filter((e) => (L.esperimenti || []).includes(e.cod));
    const lk = (o) => (o[0] ? G.lPersona(o[0], G.oratore(o[1])) : G.esc(G.oratore(o[1])));
    el.innerHTML = `
      <h1 class="titolo-pagina">${G.esc(L.nome)}</h1>
      <p class="sommario">${L.da}-${L.a}. ${C ? `Alla Camera ${G.num(C.turni)} interventi e ${G.num(C.parole / 1e6, 1)} milioni di parole` : ""}${C && Se ? "; " : ""}${Se ? `al Senato ${G.num(Se.turni)} interventi e ${G.num(Se.parole / 1e6, 1)} milioni di parole` : ""}.${oc ? ` Chi parla di più alla Camera è ${lk(oc)}, con ${G.num(oc[2])} parole.` : ""}</p>
      <div id="nel-racconto"></div>
      <section class="griglia">
        <div class="c8" id="g-oratori"></div>
        <aside class="c4 fil"><h3 class="titolo-piccolo">In cifre</h3><ul class="fatti" id="fatti"></ul></aside>
      </section>
      <section class="sezione griglia">
        <div class="c8"><h2 class="titolo-medio">Le parole della legislatura</h2><p class="fig-sotto">Le parole dette molto più che negli altri anni, ${L.da}-${L.a}, Camera e Senato insieme. Accanto: volte per milione in questi anni e negli altri. Tra le parole tipiche ci sono anche i nomi di chi parla di più.</p><div class="tab-scorre"><table class="fitta" id="t-tipiche"></table></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">La parola di ogni anno</h3><ul class="elenco-n" id="l-anni"></ul></div>
      </section>
      ${rep ? `<section class="sezione griglia">
        <div class="c7" id="g-mappa"></div>
        <div class="c5 fil"><h3 class="titolo-piccolo">I partiti</h3><p class="fig-sotto">Quota delle parole dei deputati (solo come parlamentari, come nella mappa) e di tutti gli interventi del partito (con ministri e relatori), Camera.</p><div class="tab-scorre" id="t-partiti"></div></div>
      </section>
      <section class="sezione griglia">
        <div class="c6"><h3 class="titolo-piccolo">Le parole della destra</h3><p class="fig-sotto">Volte per milione nel blocco di destra e nel resto dell'aula, Camera</p><div class="tab-scorre"><table class="fitta" id="t-destra"></table></div></div>
        <div class="c6 fil"><h3 class="titolo-piccolo">Le parole della sinistra</h3><p class="fig-sotto">Volte per milione nel blocco di sinistra e nel resto dell'aula, Camera</p><div class="tab-scorre"><table class="fitta" id="t-sinistra"></table></div></div>
      </section>
      <section class="sezione"><div class="testa"><h2>I governi</h2></div><div class="tab-scorre" id="t-governi"></div></section>` : ""}
      <section class="sezione griglia">
        <div class="c4"><h3 class="titolo-piccolo">I temi che salgono</h3><p class="fig-sotto">Quota delle parole della Camera in questi anni, rispetto alla media del tema in tutti i 175 anni</p><div id="temi-su"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">I temi che scendono</h3><p class="fig-sotto">Stessa misura</p><div id="temi-giu"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">Chi parla di più al Senato</h3><p class="fig-sotto">Parole dette in aula</p><div id="senato"></div></div>
      </section>
      <section class="sezione griglia">
        <div class="c8"><h3 class="titolo-piccolo">Gli esperimenti che toccano questi anni</h3><div class="tab-scorre" id="t-esp"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">Storie</h3><ul class="fatti" id="storie"></ul></div>
      </section>
      <nav class="prec-succ" aria-label="Legislature vicine"><span>${L.prec ? `<a href="legislatura.html?id=${L.prec}">← ${G.esc(nomeLeg(B, L.prec))}</a>` : ""}</span><span>${L.succ ? `<a href="legislatura.html?id=${L.succ}">${G.esc(nomeLeg(B, L.succ))} →</a>` : ""}</span></nav>`;

    G.nelRacconto("#nel-racconto", "legislature", L.id);
    // fatti
    const f = [[`<b>${L.da}-${L.a}</b>`, epoca(L.epoca)]];
    [["Camera", C], ["Senato", Se]].forEach(([n, x]) => { if (x) f.push([`<b>${G.num(x.parole / 1e6, 1)} milioni</b> di parole, ${n}`, `${G.num(x.turni)} interventi; ${G.num(x.frase, 1)} parole per frase; ${G.num(x.lettere, 2)} lettere per parola; metà degli interventi è sotto le ${G.num(x.turno_mediana)} parole`]); });
    if (rep && L.governi) f.push([`<b>${L.governi.length}</b> governi nati in questi anni`, "elenco più sotto"]);
    document.getElementById("fatti").innerHTML = f.map((x) => `<li>${x[0]}<span class="et">${x[1]}</span></li>`).join("");

    // oratori (grafico principale)
    const or = (L.oratori.camera || L.oratori.senato || []).slice(0, 15);
    const area = G.figura("#g-oratori", {
      titolo: or.length ? `${G.esc(G.oratore(or[0][1]))} dice ${G.num(or[0][2])} parole, più di chiunque altro${L.oratori.camera ? " alla Camera" : ""}` : "Chi parla di più",
      sotto: `Parole dette in aula, ${L.oratori.camera ? "Camera" : "Senato"}, ${L.da}-${L.a}; presidente e voci collettive esclusi. Nel Regno il nome è come lo scrive il resoconto.`,
      csv: () => [["oratore", "parole"]].concat(or.map((o) => [G.oratore(o[1]), o[2]])), nomeCSV: "oratori_" + L.id,
    });
    area.html(G.barre(or.map((o, i) => [lk(o), o[2], i === 0])));

    // parole tipiche
    document.getElementById("t-tipiche").innerHTML = '<thead><tr><th>parola</th><th class="n">volte</th><th class="n">per milione, questi anni</th><th class="n">negli altri anni</th></tr></thead><tbody>' +
      (L.parole_tipiche || []).slice(0, 24).map((p) => `<tr><td>${G.lParola(p[0], p[1])}</td><td class="n">${G.num(p[2])}</td><td class="n"><b>${G.num1(p[3])}</b></td><td class="n">${G.num1(p[4])}</td></tr>`).join("") + "</tbody>";
    document.getElementById("l-anni").innerHTML = Object.entries(L.parole_anno || {}).map(([a, v]) => { const x = (v || []).find((y) => y[0].length >= 5) || v[0]; return x ? `<li><span>${G.lAnno(a)}</span><span>${G.lParola(x[0], x[3] || x[0])}</span></li>` : ""; }).join("");

    if (rep) {
      const P = L.partiti || [];
      const top = P[0];
      const am = G.figura("#g-mappa", {
        titolo: top ? `${G.esc(top.nome)} dice il ${G.pct(top.quota)} delle parole dei deputati` : "La mappa dei partiti",
        sotto: "Un punto per partito: più due partiti sono vicini, più usano le stesse parole. L'area del punto è la quota di parole dette in aula.",
        limite: "La mappa parte dal 1948. I gruppi minori non ci sono. La posizione viene dalle parole, non dai voti.",
        csv: () => [["partito", "x", "y"]].concat((L.mappa || []).map((m) => [m.p, m.x, m.y])), nomeCSV: "mappa_" + L.id,
      });
      G.grafico(am, (a, w) => mappa(a, w, L.mappa || [], P));
      document.getElementById("t-partiti").innerHTML = '<table class="fitta"><thead><tr><th>partito</th><th class="n">deputati come parlamentari</th><th class="n">tutti gli interventi</th><th class="n">oratori</th><th class="n">al governo</th></tr></thead><tbody>' +
        P.map((p, i) => `<tr${i === 0 ? ' class="evid-riga"' : ""}><td>${G.lPartito(p.p, p.nome)}</td><td class="n"><b>${G.pct(p.quota)}</b></td><td class="n">${p.ricontata ? G.pct(p.ricontata[0]) : "–"}</td><td class="n">${G.num(p.n_orat)}</td><td class="n">${p.gov == null ? "–" : G.pct(p.gov, 0)}</td></tr>`).join("") +
        "</tbody></table>" + (P.length > 1 && P[0].ricontata && P.find((x) => x.ricontata && x.ricontata[0] > P[0].ricontata[0]) ? `<p class="fig-fonte">Con ministri e relatori l'ordine cambia: ${G.esc(P.slice().sort((a, b) => (b.ricontata ? b.ricontata[0] : 0) - (a.ricontata ? a.ricontata[0] : 0))[0].nome)} è primo. Al governo: quota dei giorni della legislatura.</p>` : '<p class="fig-fonte">Al governo: quota dei giorni della legislatura passati al governo.</p>');
      const dsT = (v) => '<thead><tr><th>parola</th><th class="n">blocco</th><th class="n">resto</th></tr></thead><tbody>' + (v || []).slice(0, 12).map((p) => `<tr><td>${G.lParola(p[0], p[1])}</td><td class="n"><b>${G.num(p[2])}</b></td><td class="n">${G.num(p[3])}</td></tr>`).join("") + "</tbody>";
      document.getElementById("t-destra").innerHTML = dsT((L.destra_sinistra || {}).destra);
      document.getElementById("t-sinistra").innerHTML = dsT((L.destra_sinistra || {}).sinistra);
      const presenti = new Set(P.map((p) => p.p));
      document.getElementById("t-governi").innerHTML = (L.governi || []).length ? '<table class="fitta"><thead><tr><th>governo</th><th>dal</th><th>al</th><th>al governo</th><th>appoggio o astensione</th></tr></thead><tbody>' +
        L.governi.map((g) => {
          const st = Object.entries(g.stati).filter(([p]) => presenti.has(p));
          return `<tr><td>${G.esc(g.governo)}</td><td>${G.data(g.da)}</td><td>${G.data(g.a)}</td><td>${st.filter((x) => x[1] === "G").map((x) => G.lPartito(x[0], nomeP(x[0]))).join(", ")}</td><td>${st.filter((x) => x[1] === "A").map((x) => G.lPartito(x[0], nomeP(x[0]))).join(", ")}</td></tr>`;
        }).join("") + '</tbody></table><p class="fig-fonte">Fonte dei governi: ParlGov (licenza CC BY-SA). Solo i partiti della mappa di questa legislatura.</p>' : '<p class="grigio">Nessun governo nato in questi anni.</p>';
    }
    const tb = (v) => G.barre((v || []).map((t, i) => [`<a href="tema.html?id=${t[0]}">${G.esc(t[1].slice(0, 34))}</a>`, t[3] ? t[2] / t[3] : 0, i === 0]), { fmt: (x) => G.num(x, 1) + " volte" });
    document.getElementById("temi-su").innerHTML = tb(L.temi_su);
    document.getElementById("temi-giu").innerHTML = tb(L.temi_giu);
    const os = (L.oratori.senato || []).slice(0, 12);
    document.getElementById("senato").innerHTML = os.length ? G.barre(os.map((o) => [lk(o), o[2]])) : '<p class="grigio">Il Senato non ha un archivio per questa legislatura.</p>';
    document.getElementById("t-esp").innerHTML = esp.length ? '<table class="fitta"><thead><tr><th>codice</th><th>esperimento</th><th>esito</th></tr></thead><tbody>' + esp.map((e) => `<tr><td>${G.lEsp(e.cod)}</td><td>${G.esc(e.titolo)}</td><td>${G.esito(e.esito)}</td></tr>`).join("") + "</tbody></table>" : '<p class="grigio">Nessun esperimento cita questi anni.</p>';
    document.getElementById("storie").innerHTML = storie.length ? storie.map((s) => `<li><a href="storia.html?id=${s.id}">${G.esc(s.titolo)}</a></li>`).join("") : '<li class="grigio">Nessuna storia per ora.</li>';
  }

  function nomeLeg(B, id) { const l = B.legislature.find((x) => x.id === id); return l ? l.nome : id; }
  function epoca(e) { return { regno: "Regno d'Italia (fino al 1861 Regno di Sardegna)", consulta: "Consulta nazionale, nominata", costituente: "Assemblea costituente", repubblica: "Repubblica" }[e] || e; }

  function mappa(area, w, punti, P) {
    if (!punti.length) { area.html('<p class="grigio">Mappa non disponibile.</p>'); return; }
    const h = w < 560 ? 300 : 380, m = 34;
    const svg = area.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", "Mappa dei partiti");
    const ex = d3.extent(punti, (p) => p.x), ey = d3.extent(punti, (p) => p.y);
    const x = d3.scaleLinear().domain(ex).range([m + 20, w - m - 60]);
    const y = d3.scaleLinear().domain(ey).range([h - m, m]);
    const q = new Map(P.map((p) => [p.p, p.quota]));
    const top = P[0] ? P[0].p : null;
    const r = d3.scaleSqrt().domain([0, d3.max(P, (p) => p.quota) || 0.3]).range([2, 22]);
    svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", h - 4).attr("y2", h - 4).attr("stroke", G.RIGA);
    const et = [];
    punti.forEach((p) => {
      const cx = x(p.x), cy = y(p.y), rr = r(q.get(p.p) || 0.01);
      svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", rr).attr("fill", p.p === top ? G.ROSSO : G.GDATI).attr("fill-opacity", p.p === top ? 1 : 0.85);
      et.push({ x: cx + rr + 4, y: cy + 4, t: p.p.replace("Unita'", "Unità"), top: p.p === top });
    });
    G.separa(et, 14, 12, h - 8);
    et.forEach((e) => { const a = svg.append("a").attr("href", "partito.html?id=" + encodeURIComponent(e.t.replace("Unità", "Unita'"))); a.append("text").attr("class", "etich").attr("x", e.x).attr("y", e.y).attr("fill", e.top ? G.ROSSO : G.NERO).text(e.t); });
  }
})();
