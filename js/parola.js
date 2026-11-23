/* Pagina di una parola: parola.html?p=tangentopoli[&con=spread,casta] */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Parole" });
    G.piede();
    const el = document.getElementById("contenuto");
    const q = G.normaFrase(G.param("p") || "");
    const w = q.replace(/ /g, "");
    const con = (G.param("con") || "").split(",").map(G.norma).filter((x) => x && x !== w).slice(0, 4);
    if (!w) { location.replace("parole.html"); return; }
    if (q.indexOf(" ") >= 0) {
      return G.espressione(q).then((S) => (S ? paginaBreve(el, q, S, true) : nonC(el, q, null)));
    }
    return Promise.all([G.indiceParole(), G.carica("base.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([IX, B, E, S]) => {
      if (!IX._mappa.has(w)) return G.schedaPrime(w).then((P) => (P ? paginaBreve(el, w, P, false) : nonC(el, w, IX)));
      return Promise.all([G.curvaParola(w), G.schedaParola(w), G.schedaPrime(w)].concat(con.map((c) => G.curvaParola(c)))).then((r) => {
        const D = r[1] || {};
        // la prima volta e le frasi passano dal filtro di qualita' dell'archivio delle prime volte
        if (r[2] && r[2].senso) { D.senso = r[2].senso; if (D.senso.stato !== "confermata") r[2].g = null; }
        if (r[2] && r[2].p && r[2].p.length) { const v = r[2].p[0]; D.pv = [v[0], v[1], v[2], v[3], v[5] || ""]; D.pv_illeggibile = !v[5]; D.prime = r[2].p; D.grezza = r[2].g; }
        else if (D.senso && D.senso.stato === "incerta") { D.pv = null; D.prime = []; }
        return pagina(el, r[0], D, r.slice(3).filter(Boolean), B, E, S, IX);
      });
    });
  });

  function nonC(el, w) {
    document.getElementById("bric").textContent = w;
    const g = G.normaFrase(w);
    const pref = g.replace(/ /g, "").slice(0, Math.max(3, g.replace(/ /g, "").length - 3));
    Promise.all([G.carica("prime/s/" + g.slice(0, 2) + ".json").catch(() => []), G.carica("prime/espressioni.json").catch(() => ({}))]).then(([Sg, E]) => {
      const simili = Sg.filter((r) => r[0].startsWith(pref)).slice(0, 30);
      const parti = g.split(" ").filter((x) => x.length > 3);
      const espr = Object.keys(E).filter((k) => parti.some((p) => k.indexOf(p) >= 0)).slice(0, 12);
      el.innerHTML = `<h1 class="titolo-pagina">${G.esc(w)}</h1><p class="sommario">«${G.esc(w)}» non ha una scheda: ${g.indexOf(" ") >= 0 ? "le espressioni di più parole sono un elenco scelto, e questa non c'è, o è detta meno di 10 volte" : "è detta meno di 10 volte in aula tra il 1848 e il 2022, o mai"}. Accenti e maiuscole non contano.</p>` +
        (simili.length ? `<h2 class="titolo-piccolo">Parole vicine</h2><p class="parole-nuvola">${simili.map((r) => G.lParola(r[0], r[1] || r[0]) + "<small>" + G.num(r[2]) + "</small>").join(" ")}</p>` : "") +
        (espr.length ? `<h2 class="titolo-piccolo" style="margin-top:18px">Espressioni con queste parole</h2><p class="parole-nuvola">${espr.map((k) => `<a class="lk" href="parola.html?p=${encodeURIComponent(k)}">${G.esc(E[k].f || k)}</a><small>${G.num(E[k].t)}</small>`).join(" ")}</p>` : "") +
        `<p style="margin-top:18px"><a class="leggi" href="parole.html">Tutte le parole</a> · <a class="leggi" href="primevolte.html">Prime volte</a></p>`;
    });
  }

  /* scheda breve: parole dette tra 10 e 999 volte, ed espressioni di piu' parole */
  function paginaBreve(el, k, S, espr) {
    const f = S.f || k;
    document.title = f + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = f;
    const p0 = S.p[0];
    return G.carica("base.json").then((B) => {
      const dec = S.d, DEC = []; for (let d = 1840; d <= 2020; d += 10) DEC.push(d);
      const totDec = DEC.map((d) => { let t = 0; for (let a = Math.max(1848, d); a <= Math.min(2022, d + 9); a++) t += (B.tot[0][a - 1848] || 0) + (B.tot[1][a - 1848] || 0); return t; });
      const pm = dec.map((n, i) => (totDec[i] ? (n / totDec[i]) * 1e6 : 0));
      const imax = pm.reduce((b, v, i) => (v > pm[b] ? i : b), 0);
      el.innerHTML = `
        <h1 class="titolo-pagina">${G.esc(f)}<span class="accanto">${p0 ? `<span class="anni">[${String(p0[0]).slice(0, 4)}-2022]</span> ` : ""}<i class="gram">${espr ? "espressione" : "voce breve, detta meno di mille volte"}</i></span></h1>
        <p class="sommario">${espr ? "Espressione detta" : "Detta"} <b>${G.num(S.t)}</b> volte in aula tra il 1848 e il 2022. ${S.senso && S.senso.stato === "incerta" ? "Prima volta nel senso di oggi: incerta. " : ""}${p0 ? `La prima volta${S.senso && S.senso.stato === "corretta" ? " nel senso di oggi" : ""} è il ${G.data(p0[0])}, ${G.alRamo(p0[1])}${p0[2] ? ", " + G.esc(G.oratore(p0[2])) : ""}.` : ""} Il decennio in cui si dice di più sono gli anni ${DEC[imax] === 1840 ? "1848-49" : DEC[imax]}.</p>
        ${G.notaSenso(S) ? `<p class="piccolo grigio">${G.notaSenso(S)}</p>` : ""}
        <section class="griglia">
          <div class="c7"><h2 class="titolo-medio">Le prime volte</h2><ul class="frasi" id="prime"></ul></div>
          <div class="c5 fil" id="g-dec"></div>
        </section>
        <p class="piccolo grigio" style="margin-top:24px">${espr ? "Le espressioni sono un elenco scelto e dichiarato nella pagina del metodo; si contano con spazio o trattino tra le parole." : "Le parole dette meno di 1.000 volte hanno questa scheda breve; quelle più frequenti hanno la curva anno per anno, chi le dice, i partiti."} La prima volta si cerca dal primo anno in cui ${espr ? "l'espressione" : "la parola"} compare almeno tre volte in tre anni.</p>`;
      const forme = [f, k];
      let h = (S.p || []).map((v, i) => `<li>${i === 0 ? (S.senso && S.senso.stato === "corretta" ? "<b>La prima volta nel senso di oggi</b> · " : "<b>La prima volta</b> · ") : ""}${G.voceVolta(v, forme)}${i === 0 && !v[5] ? '<br><span class="piccolo grigio">Testo della prima comparsa illeggibile nella scansione: sotto, le prime frasi pulite.</span>' : ""}</li>`).join("");
      if (S.sp) h += '<li class="piccolo grigio">Non arriva mai a tre volte in tre anni: queste sono le prime comparse così come sono.</li>';
      if (S.g) h += `<li class="piccolo grigio">Comparsa più vecchia, ${G.data(S.g[0])}, ${G.ramo(S.g[1])}: probabile errore di lettura del testo stampato.</li>`;
      document.getElementById("prime").innerHTML = h;
      const area = G.figura("#g-dec", {
        titolo: `Si dice di più negli anni ${DEC[imax] === 1840 ? "1848-49" : DEC[imax]}`,
        sotto: "Volte per milione di parole, decennio per decennio, Camera e Senato insieme",
        csv: () => [["decennio", "volte", "per_milione"]].concat(DEC.map((d, i) => [d, dec[i], pm[i].toFixed(3)])), nomeCSV: "decenni_" + k.replace(/ /g, "_"),
      });
      G.grafico(area, (a, w) => {
        const h2 = 240, m = { t: 20, b: 22 };
        const svg = a.append("svg").attr("width", w).attr("height", h2).attr("role", "img").attr("aria-label", "Decenni");
        const x = d3.scaleBand().domain(DEC).range([0, w]).paddingInner(0.15);
        const y = d3.scaleLinear().domain([0, d3.max(pm) || 1]).range([h2 - m.b, m.t]);
        DEC.forEach((d, i) => {
          if (pm[i] > 0) svg.append("rect").attr("x", x(d)).attr("width", x.bandwidth()).attr("y", y(pm[i])).attr("height", y(0) - y(pm[i])).attr("fill", i === imax ? G.SEZ : G.SEZ_M);
          svg.append("rect").attr("x", x(d) - (x.step() - x.bandwidth()) / 2).attr("width", x.step()).attr("y", m.t).attr("height", h2 - m.t - m.b).attr("fill", "transparent").attr("data-tip", `${G.num(pm[i], pm[i] < 10 ? 2 : 1)} per milione · ${G.num(dec[i])} volte\nanni ${d === 1840 ? "1848-49" : d + "-" + (d + 9)}`);
          if (d % 40 === 0 || d === 1840) svg.append("text").attr("x", x(d) + x.bandwidth() / 2).attr("y", h2 - 4).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(d === 1840 ? 1848 : d);
        });
        svg.append("text").attr("class", "etich").attr("x", x(DEC[imax]) + x.bandwidth() / 2).attr("y", y(pm[imax]) - 6).attr("text-anchor", "middle").attr("fill", G.INK).text(G.num(pm[imax], pm[imax] < 10 ? 2 : 1));
      });
    });
  }

  function pagina(el, C, D, altre, B, E, S, IX) {
    const w = C.w, f = C.forma;
    document.title = f + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = f;
    const tc = C.pm.nc.reduce((a, b) => a + b, 0), ts = C.pm.ns.reduce((a, b) => a + b, 0);
    const pk = G.picco(C.pm.m);
    const pv = D.pv;
    const legPk = G.legDiAnno(pk.anno, B.legislature);
    const nuovo = D.senso && D.senso.stato === "corretta";
    const prima = D.senso && D.senso.stato === "incerta" ? "Prima volta nel senso di oggi: incerta." : pv ? `La prima volta${nuovo ? " nel senso di oggi" : ""} è il ${G.data(pv[0])}, ${G.alRamo(pv[1])}: ${pv[3] ? G.lPersona(pv[3], G.oratore(pv[2])) : G.esc(G.oratore(pv[2]))}.` : "";
    const storie = (S.storie || []).filter((s) => (s.parole || []).map(G.norma).includes(w));
    const reW = new RegExp("(^|[^a-zà-ù])" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-zà-ù]|$)", "i");
    const esp = E.elenco.filter((e) => reW.test(e.titolo + " " + e.attesa + " " + e.numero));
    el.innerHTML = `
      <h1 class="titolo-pagina">${G.esc(f)}<span class="accanto"><span class="anni">[${C.y0}-2022]</span>${C.y0 >= 1990 && !(D.senso && (/non nuova|incerta/.test(D.senso.stato) || D.senso.np)) ? ' <i class="gram">neol.</i>' : ""} <i class="gram">voce con la curva anno per anno</i></span></h1>
      <p class="sommario"><b class="n">1</b> Detta <b>${G.num(C.tot)}</b> volte in aula dal ${C.y0} al 2022, ${G.num(tc)} alla Camera e ${G.num(ts)} al Senato. <b class="n">2</b> L'anno di punta è il <a class="lk" href="anno.html?a=${pk.anno}">${pk.anno}</a>, con ${G.num1(pk.val)} volte per milione di parole. ${prima ? '<b class="n">3</b> ' + prima : ""}</p>
      ${G.notaSenso({ senso: D.senso }) ? `<p class="piccolo grigio">${G.notaSenso({ senso: D.senso })}</p>` : ""}
      <div id="nel-racconto"></div>
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
    G.nelRacconto("#nel-racconto", "parole", f);
    // parole guida: la voce prima e quella dopo, in ordine alfabetico
    const iw = IX._mappa.get(w), vp = IX.p[iw - 1], vs = IX.p[iw + 1];
    G.guideVicine(vp ? ["parola.html?p=" + vp[0], vp[1] || vp[0]] : null, vs ? ["parola.html?p=" + vs[0], vs[1] || vs[0]] : null);
    // fatti
    const fatti = [
      [`<b>${G.num(C.tot)}</b> volte`, `${G.num(tc)} alla Camera, ${G.num(ts)} al Senato`],
      [`<b>${pk.anno}</b>, anno di punta`, `${G.num1(pk.val)} volte per milione di parole; <a href="anno.html?a=${pk.anno}">l'anno</a>`],
    ];
    if (legPk) fatti.push([`<a href="legislatura.html?id=${legPk.id}">${G.esc(legPk.nome)}</a>`, `la legislatura dell'anno di punta (${legPk.da}-${legPk.a})`]);
    if (pv) fatti.push([`<b>${G.data(pv[0])}</b>, la prima volta${nuovo ? " nel senso di oggi" : ""}`, `${G.ramo(pv[1])}, ${pv[3] ? G.lPersona(pv[3], G.oratore(pv[2])) : G.esc(G.oratore(pv[2]))}`]);
    if (D.pv_illeggibile) fatti.push([`Testo della prima comparsa illeggibile`, "nella scansione: la data resta, le frasi sono quelle pulite che seguono"]);
    if (D.grezza) fatti.push([`Comparsa più vecchia, ${G.data(D.grezza[0])}`, "probabile errore di lettura del testo stampato"]);
    if (D.sp) fatti.push([`<b>${G.num(D.sp[0])}</b> comparse sparse prima del ${C.y0}`, `negli anni ${D.sp[1].join(", ")}: spesso sono errori dello scanner, e non entrano nella curva`]);
    document.getElementById("fatti").innerHTML = fatti.map((x) => `<li>${x[0]}<span class="et">${x[1]}</span></li>`).join("");
    // frasi
    const forme = [f, w];
    const fr = [];
    if (pv && pv[4]) fr.push([nuovo ? "La prima volta nel senso di oggi" : "La prima volta", pv]);
    (D.prime || []).slice(1).forEach((v) => { if (v[5]) fr.push(["Le prime volte", [v[0], v[1], v[2], v[3], v[5]]]); });
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
      titolo: "", lettura: "Passa sul grafico per leggere i valori di un anno.",
      sotto: "",
      limite: "Un anno di un ramo entra nella curva solo con almeno 300.000 parole: restano fuori quasi tutti gli anni 1934-40; nel 1941-45 non ci sono sedute.",
      csv: () => [["anno"].concat([].concat(...serie.map((s) => [s.w + "_camera_volte", s.w + "_senato_volte", s.w + "_per_milione_media"])))].concat(G.ANNI.map((a, i) => [a].concat([].concat(...serie.map((s) => [s.pm.nc[i], s.pm.ns[i], s.pm.m[i] == null ? "" : s.pm.m[i].toFixed(2)]))))),
      nomeCSV: "parola_" + w,
    });
    const box = area.node().parentNode;
    function testi() {
      const s0 = serie[0], p0 = G.picco(s0.pm.m);
      box.querySelector(".fig-tit").innerHTML = serie.length > 1 ? `<span class="con-chiave">${G.chiave(G.SERIE[0])}«${G.esc(s0.forma)}»</span> tocca il massimo nel ${p0.anno}, ` + serie.slice(1).map((s, i) => `<span class="con-chiave">${G.chiave(G.SERIE[i + 1])}«${G.esc(s.forma)}»</span> nel ${G.picco(s.pm.m).anno}`).join(", ") : `«${G.esc(G.maiusc(s0.forma))}» tocca il massimo nel ${p0.anno}: ${G.num1(p0.val)} volte per milione di parole`;
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
        x: [da, 2022], y: [0, max * 1.1], serie: ss, unita: "volte per milione", trascr: modo === "a" ? null : "entrambi", scrittaTrascr: false, h: wd < 560 ? 250 : 360,
      });
      const riga = box.querySelector(".fig-lettura");
      if (riga) riga.textContent = wd < 560 ? "Tocca il grafico per leggere i valori di un anno." : "Passa sul grafico per leggere i valori di un anno.";
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
