/* Home: la pagina del vocabolario illustrato.
   Frontespizio con la definizione, tavola I (parole a confronto, a scelta), la riga dei sette capitoli,
   tavola II (amici e nemici), i tagli (partiti, risate, smentite), le parole, il listino della parola dell'anno,
   temi e percorsi, i rimandi alle storie. Tutti i numeri vengono da dati/. */
(function () {
  "use strict";
  const PREDEF = ["patria", "europa", "crisi"];
  const PRONTI = [["guerra", "pace"], ["compagni", "camerati", "popolo"], ["divorzio", "aborto", "droga"], ["mafia", "terrorismo", "emergenza"], ["tangentopoli", "spread", "casta"]];
  const $ = (id) => document.getElementById(id);
  const minuscola = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  const SERIE = G.SERIE; // blu, rosso, verde, viola, arancio: la tavolozza controllata di comune.js
  let PSG = {}; // prime volte nel senso di oggi, con i nomi propri segnati

  G.avvia(function () {
    G.PIGRO = true; // i grafici fuori schermo si disegnano quando ci si avvicina (comune.js, G.quandoVicino)
    G.testata({ compatta: false });
    G.piede();
    G.suggerisci($("q"), $("sugg-home"));
    // Tutte le richieste partono insieme (index.html le ha già avviate con i preload) e ogni pezzo della pagina si disegna
    // appena ha i suoi dati, senza aspettare gli altri. Le cifre che la home usa a pezzi di file grandi stanno dentro
    // home.json, voce «veloce» (le prepara _genera/g11_home_veloce.py): se mancano si torna ai file interi.
    const C = (p) => G.carica(p);
    const pH = C("home.json").then((H) => { G.PACCO = H.veloce || null; return H; });
    const pB = C("base.json");
    const pIX = C("capitoli/indice.json"), pSI = C("storie/indice.json");
    const pD = pH.then((H) => V.datiCapitoli(H.veloce));
    const pR = pH.then((H) => (H.veloce ? H.veloce.risate : C("sezioni/risate.json")));
    const pPS = pH.then((H) => (H.veloce ? H.veloce.senso : C("prime/senso.json").catch(() => ({}))));
    const pGV = C("sezioni/h68_governi.json").catch(() => ({}));
    const pPI = C("percorsi/indice.json").catch(() => ({ percorsi: [] }));
    const pRM = C("sezioni/risate_migliori.json").catch(() => null);
    const quando = (nome, dip, f) => Promise.all(dip).then((v) => f(...v)).catch((e) => { console.error(nome, e); });
    return Promise.all([
      quando("tavola I", [pH, pB, pPS], (H, B, PS) => { PSG = PS || {}; brevi(H); return asse(H); }),
      quando("capitoli", [pIX, pD], (IX, D) => sette(IX, D)),
      quando("tavole II e III", [pH, pSI, pD, pGV], (H, SI, D, GV) => amici(H, SI, D, GV)),
      quando("tagli", [pH, pSI, pR], (H, SI, R) => tagli(H, SI, R)),
      quando("parole", [pH, pPS], (H, PS) => parole(H, PS)),
      quando("listino", [pB], (B) => listino(B)),
      quando("percorsi e frase", [pB, pSI, pD, pR, pPI, pRM], (B, SI, D, R, PI, RM) => percorsiFrase(B, SI, D, R, PI, RM)),
      quando("storie", [pSI, pB, pH], (SI, B, H) => storie(SI, B.conti, H)),
      quando("chiusa", [pIX], (IX) => {
        $("riga-steno").textContent = minuscola(IX.riga) + ".";
        $("chiusa-frasi").innerHTML = `<i class="es">«${G.esc(IX.prologo)}»</i> <span class="anni">la prima riga del primo resoconto, 8 maggio 1848</span> · <i class="es">«${G.esc(IX.chiusa)}»</i> <span class="anni">la frase che chiude il racconto, 20 luglio 2022</span>`;
      }),
    ]);
  }, { subito: true });

  /* ---------------- tavola I: parole a confronto, scelte dal lettore ---------------- */
  function asse(H) {
    const el = $("asse");
    const da = G.param("p");
    let attive = (da ? da.split(",").map(G.norma).filter(Boolean) : PREDEF).slice(0, 5);
    const curve = {};
    el.insertAdjacentHTML("beforeend", `<div class="confronto-riga"><label for="asse-in" class="nascosto">Parole da confrontare</label><input id="asse-in" type="search" placeholder="altre parole, separate da una virgola" autocomplete="off"><button class="bottone" id="asse-ok" type="button">Confronta</button><span id="asse-gettoni"></span>
      <span class="pronti">oppure: ${PRONTI.map((p) => `<a href="?p=${p.join(",")}" data-p="${p.join(",")}">${p.join(", ")}</a>`).join("")}</span><span class="avviso" id="asse-avviso" role="status"></span></div>
      <div id="asse-fig"></div>`);
    const fig = G.figura("#asse-fig", {
      titolo: null, lettura: "Passa sul grafico per leggere i valori di un anno.",
      fonte: "Volte ogni milione di parole, media di Camera e Senato e di tre anni. Tratteggio: anni in cui cambia la trascrizione.",
      limite: "Gli anni con meno di 300.000 parole in un ramo non sono disegnati: nel 1934-40 lo sono quasi tutti, nel 1941-45 non ci sono sedute.",
      csv: () => [["anno"].concat(attive)].concat(G.ANNI.map((a, i) => [a].concat(attive.map((w) => (curve[w] && curve[w].pm.m[i] != null ? curve[w].pm.m[i].toFixed(2) : ""))))), nomeCSV: "confronto_parole",
    });
    function carica() {
      const avv = [];
      return Promise.all(attive.map((w) => (curve[w] ? curve[w] : G.curvaParola(w).then((c) => { if (c) curve[w] = c; else avv.push(w); return c; })))).then(() => {
        attive = attive.filter((w) => curve[w]);
        $("asse-avviso").textContent = avv.length ? avv.map((w) => "«" + w + "»").join(", ") + (avv.length > 1 ? " non hanno" : " non ha") + " la curva: servono almeno 1.000 volte in aula." : "";
        disegna();
      });
    }
    function disegna() {
      const serie = attive.map((w, i) => ({ w, c: curve[w], col: SERIE[i], m3: G.media3(curve[w].pm.m), vero: G.picco(curve[w].pm.m) }));
      if (serie.length) {
        const a = serie[0];
        // nel titolo la parola porta il colore della sua linea: fa da legenda (scelta del sito, 23/11)
        const nome = (s, maiusc) => `<a class="parola-col" style="color:${s.col}" href="parola.html?p=${s.w}">${G.esc(maiusc ? G.maiusc(s.c.forma) : s.c.forma)}</a>`;
        let t = `${nome(a, true)} tocca il massimo nel ${a.vero.anno}`, dal = null;
        if (serie.length > 1) {
          const b = serie[1];
          let ultimo = null;
          G.ANNI.forEach((y, i) => { const p = a.c.pm.m[i], q = b.c.pm.m[i]; if (p != null && q != null && q < p) ultimo = y; });
          if (ultimo != null && ultimo >= 1946 && ultimo < 2015) dal = ultimo + 1;
          if (dal) t += `. Dal ${dal} ${nome(b, true)} non le sta più dietro`;
          const resto = serie.slice(dal ? 2 : 1);
          if (resto.length) t += (dal ? "; " : ", ") + resto.map((s) => `${nome(s)} ha la punta nel ${s.vero.anno}`).join(", ");
        }
        $("asse-tit").innerHTML = t;
      }
      $("asse-gettoni").innerHTML = serie.length > 1 ? "togli: " + serie.map((s) => `<button class="togli" type="button" data-w="${s.w}" aria-label="Togli ${G.esc(s.c.forma)} dal confronto">${G.chiave(s.col)}${G.esc(s.c.forma)} ×</button>`).join(" ") : "";
      document.querySelectorAll("#asse-gettoni .togli").forEach((b) => b.addEventListener("click", () => { attive = attive.filter((w) => w !== b.dataset.w); aggiornaURL(); disegna(); }));
      // le parole del confronto come voci, nella colonna accanto
      $("tre").innerHTML = serie.map((s) => `<p class="voce">${G.chiave(s.col)}<a class="lemma" href="parola.html?p=${s.w}">${G.esc(s.c.forma)}</a> <span class="anni">[${s.c.y0}-2022]</span>${s.c.y0 >= 1990 && !(PSG[s.w] && (PSG[s.w].np || /non nuova|incerta/.test(PSG[s.w].stato))) ? ' <i class="gram">neol.</i>' : ""} Detta ${G.num(s.c.tot)} volte. Anno di punta il <a class="lk" href="anno.html?a=${s.vero.anno}">${s.vero.anno}</a>, con ${G.num1(s.vero.val)} volte ogni milione di parole.</p>`).join("");
      fig.datum(serie);
      G.ridisegna("#asse-fig .fig-area");
    }
    G.grafico(fig, (area, w) => {
      const serie = area.datum() || [];
      const stretto = w < 560;
      const max = d3.max(serie, (s) => d3.max(s.m3, (v) => v || 0)) || 1;
      const hEp = 36, hEv = stretto ? 0 : 34, Hc = stretto ? 220 : 236, HH = hEp + hEv + Hc;
      const m = { t: hEp + hEv + 8, r: stretto ? 12 : 84, b: 22, l: 0 };
      const svg = area.append("svg").attr("width", w).attr("height", HH).attr("role", "img").attr("aria-label", "Parole a confronto, 1848-2022: " + serie.map((s) => s.c.forma).join(", "));
      const x = d3.scaleLinear().domain([1848, 2022]).range([m.l, w - m.r]);
      const y = d3.scaleLinear().domain([0, max * 1.08]).range([HH - m.b, m.t]);
      G.bandaEpoche(svg, x, 0, 20, stretto);
      d3.range(1850, 2021, 10).forEach((a) => {
        svg.append("line").attr("x1", x(a)).attr("x2", x(a)).attr("y1", 20).attr("y2", a % 50 === 0 ? 26 : 23).attr("stroke", G.GRIGIO);
        if (a % (stretto ? 50 : 20) === 0) svg.append("text").attr("x", x(a)).attr("y", 34).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(a);
      });
      if (!stretto) {
        const ev = H.eventi.filter((e) => e[2] === 1).map((e) => ({ a: +e[0].slice(0, 4) + (+e[0].slice(5, 7) - 1) / 12, t: e[1] }));
        const fine = [];
        ev.forEach((e) => {
          const xx = x(e.a), lw = e.t.length * 6;
          let r = 0; while (r < 2 && fine[r] != null && fine[r] > xx - 6) r++;
          if (r > 1) return;
          fine[r] = xx + lw;
          const yy = hEp + 11 + r * 14;
          svg.append("line").attr("x1", xx).attr("x2", xx).attr("y1", yy + 3).attr("y2", HH - m.b).attr("stroke", G.RIGA);
          svg.append("text").attr("x", xx + 3).attr("y", yy).attr("font-size", 12).attr("fill", G.GRIGIO).text(e.t);
        });
      }
      const gy = svg.append("g").attr("class", "asse");
      const tk = y.ticks(4);
      tk.forEach((v, i) => {
        gy.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(v)).attr("y2", y(v)).attr("class", v === 0 ? "zero" : null);
        gy.append("text").attr("x", m.l).attr("y", y(v) - 4).text(G.num(v) + (i === tk.length - 1 ? " volte per milione di parole" : ""));
      });
      d3.range(1860, 2021, stretto ? 50 : 20).forEach((a) => gy.append("text").attr("x", x(a)).attr("y", HH - m.b + 16).attr("text-anchor", "middle").text(a));
      G.lineeTrascrizione(svg, x, m.t, HH - m.b, "entrambi", false);
      const linea = d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]));
      const fine = [], sopra = svg.append("g");
      serie.forEach((s, k) => {
        svg.append("path").attr("d", linea(G.ANNI.map((a, i) => [a, s.m3[i]]))).attr("fill", "none").attr("stroke", s.col).attr("stroke-width", 2.25).attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
        const pk = G.picco(s.m3);
        sopra.append("circle").attr("cx", x(pk.anno)).attr("cy", y(pk.val)).attr("r", 4).attr("fill", s.col).attr("stroke", "#fff").attr("stroke-width", 2);
        if (!stretto) {
          const px = x(pk.anno);
          sopra.append("text").attr("class", "etich").attr("x", px).attr("y", y(pk.val) - 9).attr("text-anchor", px > w - m.r - 60 ? "end" : "middle").attr("fill", G.INK).text(s.c.forma + " " + s.vero.anno + ": " + G.num1(s.vero.val));
        }
        const ult = G.ANNI.map((a, i) => [a, s.m3[i]]).filter((d) => d[1] != null).slice(-1)[0];
        if (ult && !stretto) fine.push({ y: y(ult[1]), x: x(ult[0]), s });
      });
      sopra.raise();
      G.separa(fine, 15, m.t, HH - m.b);
      fine.forEach((f) => { G.chiaveSVG(sopra, f.x + 5, f.y, f.s.col); sopra.append("text").attr("class", "etich").attr("x", f.x + 21).attr("y", f.y + 4).attr("fill", G.INK).text(f.s.c.forma); });
      // i numeri dell'asse sopra le linee, con l'alone bianco
      const gt = svg.append("g").attr("class", "asse");
      gy.selectAll("text").each(function () { this.classList.add("alone"); gt.node().appendChild(this); });
      // il mirino: i punti stanno sulle linee (media di tre anni), il riquadro scrive il valore vero dell'anno, come la tabella dei dati
      G.mirino(svg, x, y, serie.map((s) => ({ nome: s.c.forma, colore: s.col, punti: G.ANNI.map((a, i) => [a, s.m3[i]]), leggi: G.ANNI.map((a, i) => [a, s.c.pm.m[i]]) })), { fmt: G.num1, unita: "volte per milione di parole, anno per anno" });
      const riga = area.node().parentNode.querySelector(".fig-lettura");
      if (riga && stretto) riga.innerHTML = serie.map((s) => `<span>${G.chiave(s.col)}<b>${G.esc(s.c.forma)}</b> ${s.vero.anno}: ${G.num1(s.vero.val)}</span>`).join(" · ");
    }, { manuale: true }); // si disegna solo quando arrivano le curve (disegna → G.ridisegna)
    function aggiornaURL() { try { history.replaceState(null, "", attive.length ? "?p=" + attive.join(",") : location.pathname); } catch (e) { /* niente */ } }
    function leggi(t) {
      const nuove = t.split(/[,;]+/).map(G.norma).filter(Boolean);
      if (!nuove.length) return;
      attive = nuove.slice(0, 5); aggiornaURL();
      serveSenso().then(carica);
    }
    // lo stato «parola nuova» dentro home.json copre le parole della home; per le altre si legge il file intero
    function serveSenso() {
      return G.PACCO && G.PACCO.curve && attive.every((w) => G.PACCO.curve[w]) ? Promise.resolve() : G.carica("prime/senso.json").then((PS) => { PSG = PS || {}; }).catch(() => {});
    }
    $("asse-in").addEventListener("keydown", (e) => { if (e.key === "Enter") leggi(e.target.value); });
    $("asse-ok").addEventListener("click", () => leggi($("asse-in").value));
    el.querySelectorAll(".pronti a").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); $("asse-in").value = a.dataset.p.replace(/,/g, ", "); leggi(a.dataset.p); }));
    return serveSenso().then(carica);
  }

  function brevi(H) {
    $("brevi").innerHTML = H.breve.slice(0, 4).map((b) => `<li>${b}</li>`).join("");
  }

  /* ---------------- i sette capitoli in una riga: titolo che spiega, parola guida, figura vera ---------------- */
  function sette(IX, D) {
    $("riga-racconto").textContent = "ogni capitolo ha la sua parola guida e la sua figura";
    $("sette").innerHTML = IX.capitoli.map((k) => {
      const a0 = k.anni[0], a1 = k.anni[k.anni.length - 1];
      return `<article class="cap"><p class="guida-cap"><i>${G.esc(minuscola(k.simbolo))}</i> · <i class="gram">cap.</i> ${k.n} · ${a0}-${a1}</p>
        <h3><a href="capitolo.html?n=${k.n}">${G.esc(k.titolo)}</a></h3>
        <div class="fig" id="cg${k.n}"></div><p class="did">${V.CAPITOLI_NOTE[k.n]}</p>
        <p class="som">${G.esc(k.sommario)}</p></article>`;
    }).join("");
    IX.capitoli.forEach((k) => V.graficoCapitolo("#cg" + k.n, +k.n, D, { h: 74, wl: 0, hr: 52, paesi: ["Germania"] }));
  }

  /* ---------------- tavola II: amici e nemici; tavola III: missione o guerra, con chi governa ---------------- */
  function amici(H, SI, D, GV) {
    const am = SI.storie.find((s) => s.id === "amici-e-nemici");
    if (am) $("am-titolo").textContent = am.titolo;
    // versione scelta: le linee sopra e sotto lo zero; le altre due restano per il confronto (?amici=celle, ?amici=strisce)
    const v = G.param("amici");
    if (v === "celle") { $("leg").innerHTML = V.legendaGradini(); V.amiciCelle("#g-strisce", D.X, { hr: 24, wl: 112 }); }
    else if (v === "strisce") { $("leg").innerHTML = V.legendaStrisce(); V.strisce("#g-strisce", D.X, { hp: 19, hf: 6, vuoto: 8, wl: 112, fsNome: 15, pesoNome: 800, sotto: false, note: [V.NOTE_STRISCE[2], V.NOTE_STRISCE[5]] }); }
    else { $("leg").innerHTML = V.legendaLinee(); V.amiciLinee("#g-strisce", D.X, { hr: 40, wl: 112 }); }
    G.bottoneCSV("#g-strisce", "amici_nemici", () => [["paese", "anno", "indice_media_tre_anni", "stato_vero"]].concat([].concat(...["Austria", "Germania", "Francia", "Gran Bretagna", "Russia/URSS", "Stati Uniti", "Jugoslavia"].map((p) => { const t = V.tonoPaese(D.X, p), al = D.X.alleanze[p] || {}; return G.ANNI.map((a) => [p, a, t[a] != null ? t[a].toFixed(3) : "", (al[a] || [])[1] || ""]); }))));
    manubri(H, SI, GV);
  }
  function manubri(H, SI, GV) {
    const righe = H.h68.filter((r) => r[1] != null);
    // come nel verdetto dell'esperimento: la Bosnia ha troppo poche parole e non si conta tra le operazioni col segno atteso
    const piu = righe.filter((r) => r[4] > r[2] && r[0] !== "Bosnia").length;
    $("gu-titolo").textContent = `Chi sta all'opposizione dice «guerra» più di chi governa: succede in ${piu} operazioni militari su ${righe.length}`;
    $("gu-did").innerHTML = "Su cento volte che si parla dell'operazione, quante si dice «guerra» invece di «missione» o «operazione» (entro 30 parole dal nome del paese), Camera. Ogni intervento conta dalla parte in cui stava chi parlava quel giorno. <a href=\"storia.html?id=missione-o-guerra\">La storia →</a>";
    G.bottoneCSV("#g-manubri", "missione_o_guerra", [["operazione", "guerra_su_100_chi_governa", "guerra_su_100_opposizione"]].concat(righe.map((r) => [r[0], r[2], r[4]])));
    V.fig("#g-manubri", (a, w) => {
      const T = V.tema, passo = 46, mt = 30, h = mt + righe.length * passo + 4, wl = 0;
      const svg = a.append("svg").attr("width", w).attr("height", h).attr("viewBox", `0 0 ${w} ${h}`).attr("role", "img").attr("aria-label", "Missione o guerra: quota di «guerra» detta da chi governa e da chi sta all'opposizione, operazione per operazione").style("display", "block").style("overflow", "visible");
      const x = d3.scaleLinear().domain([0, 100]).range([wl + 4, w - 30]);
      [0, 25, 50, 75, 100].forEach((t) => { svg.append("line").attr("x1", x(t)).attr("x2", x(t)).attr("y1", mt - 6).attr("y2", h).attr("stroke", T.riga); svg.append("text").attr("x", x(t)).attr("y", mt - 10).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", T.grigio).attr("text-anchor", t === 100 ? "end" : "middle").attr("x", t === 100 ? x(t) + 30 : x(t)).text(t + (t === 100 ? " volte su 100" : "")); });
      // la spiegazione dentro il grafico
      svg.append("circle").attr("cx", x(0) + 4).attr("cy", 6).attr("r", 4.5).attr("fill", "#fff").attr("stroke", T.ink).attr("stroke-width", 1.4);
      svg.append("text").attr("x", x(0) + 12).attr("y", 10).attr("font-size", 12.5).attr("fill", T.ink).text("chi governa");
      svg.append("circle").attr("cx", x(0) + 96).attr("cy", 6).attr("r", 4.5).attr("fill", T.evid);
      svg.append("text").attr("x", x(0) + 104).attr("y", 10).attr("font-size", 12.5).attr("fill", T.ink).text("chi sta all'opposizione");
      righe.forEach((r, i) => {
        const g = GV[r[0]] || {}, y0 = mt + i * passo, cy = y0 + 25;
        const una = (g.governi || []).length && (g.governi.length <= 2) && !(g.tecnico || []).length;
        svg.append("text").attr("x", wl).attr("y", y0 + 11).attr("font-size", 13).attr("font-weight", 800).attr("fill", T.ink).text(r[0].replace(/ \d{4}(-\d{2})?$/, "") + (g.da ? " " + g.da.slice(0, 4) + (g.a.slice(0, 4) !== g.da.slice(0, 4) ? "-" + g.a.slice(2, 4) : "") : ""));
        const chi = una ? `gov. ${g.governi.join(", ")}: ${g.governo.slice(0, 5).join(", ")} · opp.: ${g.opposizione.slice(0, 4).join(", ")}` : g.governi ? `${g.governi.length > 3 ? g.governi[0] + " … " + g.governi[g.governi.length - 1] : g.governi.join(", ")}: maggioranze diverse` : "";
        // al telefono i governi non stanno accanto al nome: si leggono nel riquadro della riga
        if (w >= 560) { const t = svg.append("text").attr("x", x(0) + 168 > w - 30 ? wl : wl + 0).attr("y", y0 + 11).attr("font-size", 11.5).attr("fill", T.grigio).attr("text-anchor", "end").attr("x", w).text(chi.length > 70 ? chi.slice(0, 68) + "…" : chi);
        t.append("title").text(chi); }
        svg.append("rect").attr("x", 0).attr("y", y0).attr("width", w).attr("height", passo).attr("fill", "transparent").attr("data-tip", `${r[4]} chi sta all'opposizione · ${r[2]} chi governa\n${r[0]}${chi ? ": " + chi : ""}`);
        const qm = r[2], qo = r[4], forte = r[6] > 0, nonMis = r[0] === "Bosnia";
        svg.append("line").attr("x1", x(qm)).attr("x2", x(qo)).attr("y1", cy).attr("y2", cy).attr("stroke", T.dati).attr("stroke-width", forte ? 3 : 2).attr("stroke-dasharray", nonMis ? "3 3" : null);
        svg.append("circle").attr("cx", x(qm)).attr("cy", cy).attr("r", 5).attr("fill", "#fff").attr("stroke", T.ink).attr("stroke-width", 1.4).append("title").text(`${r[0]}: chi governa dice «guerra» ${qm} volte su 100`);
        svg.append("circle").attr("cx", x(qo)).attr("cy", cy).attr("r", 5).attr("fill", T.evid).append("title").text(`${r[0]}: chi sta all'opposizione dice «guerra» ${qo} volte su 100`);
        const dx = qo >= qm ? 9 : -9;
        svg.append("text").attr("x", x(qo) + dx).attr("y", cy + 4).attr("text-anchor", dx > 0 ? "start" : "end").attr("font-size", 12.5).attr("font-weight", 700).attr("fill", T.ink).text(qo);
        svg.append("text").attr("x", x(qm) - dx).attr("y", cy + 4).attr("text-anchor", dx > 0 ? "end" : "start").attr("font-size", 12).attr("fill", T.grigio).text(qm);
        if (nonMis) svg.append("text").attr("x", x(100)).attr("y", cy + 4).attr("text-anchor", "end").attr("font-size", 11.5).attr("fill", T.grigio).text("troppo poche parole");
      });
    });
  }

  /* ---------------- i tagli: partiti, chi fa ridere più del previsto, smentite ---------------- */
  function tagli(H, SI, R) {
    const mp = SI.storie.find((s) => s.id === "mappa-partiti-governo-opposizione");
    G.griglia("#g-somiglia-home", { righe: ["PCI, PDS, DS, PD", "MSI, AN, FdI", "FI, PdL", "Lega", "M5S"], legs: d3.range(13, 19), lite: true });
    const E = (R.efficaci || []).slice(0, 8), b = E[0];
    if (b) {
      const attese = b.ila / b.rapporto;
      $("ri-titolo").textContent = `${b.nome} fa ridere l'aula ${G.num(b.rapporto, 1)} volte più del previsto`;
      $("ri-spiega").innerHTML = `Che cosa vuol dire. Ogni anno lo stenografo annota un certo numero di risate ogni mille parole dette in aula. Se ${G.esc(b.nome)} facesse ridere come un parlamentare qualunque di quegli anni, con le sue ${G.num(b.parole)} parole avremmo circa ${G.num(attese, attese < 10 ? 1 : 0)} ${Math.round(attese) === 1 ? "risata" : "risate"}: è il previsto. Lo stenografo ne ha annotate ${G.num(b.ila)}: ${G.num(b.rapporto, 1)} volte tanto.`;
    }
    V.barre("#g-risate", E.map((o, i) => [o.nome.length > 24 ? o.nome.slice(0, 23) + "…" : o.nome, o.rapporto, i === 0]), { wl: 150, passo: 19, fmt: (v) => V.num(v, 1) + " volte" });
    G.bottoneCSV("#g-risate", "risate_piu_del_previsto", [["oratore", "risate_osservate_su_attese"]].concat(E.map((o) => [o.nome, o.rapporto])));
    $("smentite").innerHTML = (H.smentite_txt || []).slice(0, 5).map((s) => `<li><span class="sm" aria-hidden="true">■</span> <a href="storia.html?id=${s.storia}">${G.esc(s.testo)}</a></li>`).join("");
    const tot = H.esperimenti.conti.find((r) => r[0] === "Totale");
    $("n-esp").textContent = tot ? tot[7] : "";
    V.verdetti("#g-verdetti", H.esperimenti.conti, { wl: 132, passo: 13, q: 6 });
    G.bottoneCSV("#g-verdetti", "esperimenti_conti", [["filone", "regge", "in parte", "smentita", "non valida", "descrittiva", "non misurata", "totale"]].concat(H.esperimenti.conti));
  }

  /* ---------------- le parole ---------------- */
  function parole(H, PS) {
    const pp = H.multipli.filter((p) => H.curve[p]).sort((p, q) => V.annoDiPunta(H, p) - V.annoDiPunta(H, q));
    $("venti").innerHTML = pp.map((p, i) => `<a class="riga-voce" href="parola.html?p=${p}"><span class="lemma">${G.esc(H.curve[p].forma || p)}</span> <span class="anni">[${V.annoDiPunta(H, p)}]</span><span class="fig" id="v${i}"></span></a>`).join("");
    pp.forEach((p, i) => V.mini("#v" + i, V.curvaParola(H, p), { h: 28, assi: false, mt: 5, sp: 1.2, punti: [{ x: V.annoDiPunta(H, p), testo: "" }], fmt: (v) => V.num(v, v < 10 ? 1 : 0) + " per milione" }));
    // coppie: la parola della lista accanto a quella che la sostituisce, sulla stessa scala, con l'anno del sorpasso
    // (primo anno da cui la seconda resta sopra la prima per tre anni, curve del sito: media di Camera e Senato e di tre anni)
    const COPPIE = { emigrazione: ["immigrazione", "emigranti-immigrati-sorpasso"], telegrafo: ["telefono", "tecnologia-ritardo"] };
    Object.keys(COPPIE).forEach((p) => {
      const i = pp.indexOf(p), el = document.getElementById("v" + i);
      if (i < 0 || !el) return;
      const [q, storia] = COPPIE[p], riga = el.closest(".riga-voce");
      G.curvaParola(q).then((C) => {
        if (!C) return;
        const A = G.media3(H.curve[p].m.slice()), Bq = G.media3(C.pm.m);
        let sorp = null;
        for (let k = 0; k < 172 && sorp == null; k++) if ([0, 1, 2].every((j) => A[k + j] != null && Bq[k + j] != null && Bq[k + j] > A[k + j])) sorp = k;
        const box = document.createElement("div");
        box.className = "coppia";
        box.innerHTML = `<p class="coppia-testa">${G.chiave(G.SCURO)}<a class="lemma" href="parola.html?p=${p}">${G.esc(H.curve[p].forma || p)}</a> <span class="fr">e</span> ${G.chiave(G.ROSSO)}<a class="lemma" href="parola.html?p=${q}">${G.esc(C.forma || q)}</a>${sorp != null ? ` <span class="anni">sorpasso nel ${1848 + sorp}</span>` : ""}</p><div class="fig" id="coppia-${p}"></div><p class="did">Volte per milione di parole, media di Camera e Senato e di tre anni; il punto è il primo anno da cui la seconda resta sopra.${p === "emigrazione" ? ` Con la misura dell'esperimento il sorpasso cade nel 1988: <a href="storia.html?id=${storia}">la storia</a>.` : storia ? ` <a href="storia.html?id=${storia}">La storia</a>.` : ""}</p>`;
        riga.replaceWith(box);
        V.fig("#coppia-" + p, (a, w) => {
          const T = V.tema, h = 64, mb = 14, mt = 8;
          const svg = a.append("svg").attr("width", w).attr("height", h).attr("role", "img").attr("aria-label", `${p} e ${q}, volte per milione di parole, 1848-2022${sorp != null ? ", sorpasso nel " + (1848 + sorp) : ""}`);
          const x = d3.scaleLinear().domain([1848, 2022]).range([1, w - 1]);
          const mx = d3.max(A.concat(Bq), (v) => v || 0) || 1, y = d3.scaleLinear().domain([0, mx * 1.05]).range([h - mb, mt]);
          const linea = d3.line().defined((d) => d != null).x((d, k) => x(1848 + k)).y((d) => y(d));
          svg.append("line").attr("x1", 0).attr("x2", w).attr("y1", h - mb).attr("y2", h - mb).attr("stroke", T.dati);
          svg.append("path").attr("d", linea(A)).attr("fill", "none").attr("stroke", G.SCURO).attr("stroke-width", 1.5);
          svg.append("path").attr("d", linea(Bq)).attr("fill", "none").attr("stroke", G.ROSSO).attr("stroke-width", 1.5);
          if (sorp != null) {
            const px = x(1848 + sorp), py = y(Bq[sorp]);
            svg.append("circle").attr("cx", px).attr("cy", py).attr("r", 4).attr("fill", G.ROSSO).attr("stroke", "#fff").attr("stroke-width", 2);
            svg.append("text").attr("x", px + (px > w * 0.6 ? -6 : 6)).attr("y", py - 6).attr("text-anchor", px > w * 0.6 ? "end" : "start").attr("font-size", 12).attr("font-weight", 700).attr("fill", T.ink).attr("class", "alone").text(`${1848 + sorp}: ${G.num1(Bq[sorp])} contro ${G.num1(A[sorp])}`);
          }
          [1848, 1900, 1950, 2022].forEach((t, j) => svg.append("text").attr("x", x(t)).attr("y", h - 2).attr("text-anchor", j === 0 ? "start" : j === 3 ? "end" : "middle").attr("font-size", 11.5).attr("fill", T.grigio).text(t));
          G.mirino(svg, x, y, [{ nome: H.curve[p].forma || p, colore: G.SCURO, punti: A.map((v, k) => [1848 + k, v]) }, { nome: C.forma || q, colore: G.ROSSO, punti: Bq.map((v, k) => [1848 + k, v]) }], { fmt: G.num1, unita: "volte per milione di parole" });
        });
      });
    });
    const tre = (q, k) => [1, 2, 3].map((j) => (j === k ? `<b>${G.num1(q[j])}</b>` : G.num1(q[j]))).join(" · ");
    // «neol.» solo per le parole davvero nuove: la prima volta nel senso di oggi viene dalla lettura delle prime comparse
    const neol = (w) => { const x = PS[w]; return x && !x.np && (x.stato === "confermata" || x.stato === "corretta") ? ` <i class="gram" title="parola nuova: prima volta nel senso di oggi ${x.nuova ? x.nuova[0].slice(0, 4) : ""}">neol. ${x.nuova ? x.nuova[0].slice(0, 4) : ""}</i>` : ""; };
    $("nate").innerHTML = `<p class="did">Volte per milione nel 1848-1900 · 1901-89 · 1990-2022. <i>neol.</i> e l'anno: parola nuova, con la prima volta nel senso di oggi; le altre c'erano già.</p>` + H.nate.filter((q) => !(PS[q[0]] && PS[q[0]].np)).slice(0, 12).map((q) => `<p><a class="lemma piccolo" href="parola.html?p=${encodeURIComponent(q[0])}">${G.esc(q[4] || q[0])}</a>${neol(q[0])} <span class="cifre">${tre(q, 3)}</span></p>`).join("");
    $("morte").innerHTML = `<p class="did">Volte per milione nel 1848-1900 · 1901-89 · 1990-2022</p>` + H.morte.slice(0, 12).map((q) => `<p><a class="lemma piccolo" href="parola.html?p=${encodeURIComponent(q[0])}">† ${G.esc(q[4] || q[0])}</a> <span class="cifre">${tre(q, 1)}</span></p>`).join("");
  }

  /* ---------------- il listino della parola dell'anno ---------------- */
  function listino(B) {
    const anni = Object.keys(B.parole_anno).map(Number).sort((a, b) => a - b);
    $("listino").innerHTML = anni.map((a) => { const w = (B.parole_anno[a] || []).find((x) => x[0].length >= 5) || (B.parole_anno[a] || [])[0]; return w ? `<a href="anno.html?a=${a}"${a % 10 === 0 ? ' class="dieci"' : ""}><span>${a}</span> ${G.esc(w[3] || w[0])}</a>` : ""; }).join("");
  }

  /* ---------------- percorsi, la frase, tre risate scelte ---------------- */
  function percorsiFrase(B, SI, D, R, PI, RM) {
    const fr = SI.storie.find((s) => s.id === "repubblica-non-si-semplifica");
    if (fr) $("fr-titolo").textContent = fr.titolo;
    V.frasi("#g-frasi", B.archivi, { h: 150 });
    G.bottoneCSV("#g-frasi", "parole_per_frase", [["archivio", "ramo", "da", "a", "parole_per_frase"]].concat(B.archivi.filter((r) => r.frase).map((r) => [r.nome || r.id || "", r.ramo, r.da, r.a, r.frase])));
    const cam = D.F.periodi.filter((p) => p.ramo === "camera"), d0 = cam[0], d1 = cam.find((p) => /regime/i.test(p.periodo)) || cam[cam.length - 1];
    const fc = D.L.francese.camera || {}, am = Object.keys(fc).reduce((a, b) => (fc[b] > fc[a] ? b : a), Object.keys(fc)[0]);
    const quattro = [["fascismo.html", "Il fascismo in aula", "1922-1943", `il dissenso annotato alla Camera scende da ${G.num(d0.dissenso_100, 0)} a ${G.num(d1.dissenso_100, 0)} ogni cento interventi`],
      ["esteri.html", "Amici e nemici dell'Italia", "1848-2022", `il tono dell'aula verso ${D.X.paesi.length} paesi, accanto alle alleanze e alle guerre`],
      ["lingue.html", "Le lingue dell'aula", "1848-2022", `nel ${am} il ${G.num(fc[am], 1)}% delle parole alla Camera è in francese`],
      ["risate.html", "Risate e insulti", "1848-2022", `da ${G.num(R.periodi[0][1], 0)} a ${G.num(R.periodi[R.periodi.length - 1][1], 1)} risate ogni mille interventi`]];
    const altri = (PI.percorsi || []).map((p) => [`percorso.html?id=${p.id}`, p.titolo, p.tappe + " tappe", p.domanda.replace(/<[^>]+>/g, "")]);
    $("percorsi-voci").innerHTML = quattro.concat(altri).map((p) => `<p><a class="lemma" href="${p[0]}">${G.esc(p[1])}</a> <span class="anni">[${p[2]}]</span> ${G.esc(G.maiusc(p[3]))}${/[.?!]$/.test(p[3]) ? "" : "."}</p>`).join("");
    // tre risate della scelta, di tre epoche diverse
    const ep = [], tre = [];
    ((RM && RM.risate) || []).forEach((r) => { if (tre.length < 3 && ep.indexOf(r.epoca) < 0 && r.frase.length < 190) { ep.push(r.epoca); tre.push(r); } });
    $("risate-scelte").innerHTML = tre.map((r) => `<p class="es">«${G.esc(r.frase.replace(/^«|»$/g, ""))}» <span>${G.esc(r.oratore)}${r.partito ? " (" + G.esc(r.partito) + ")" : ""}, ${G.ramo(r.ramo)}, ${G.data(r.data)}</span></p>`).join("");
  }

  /* ---------------- vedi anche: le storie più interessanti, epoche e verdetti mescolati ---------------- */
  function storie(SI, c, H) {
    // si parte dalle storie più interessanti e più solide (campi «interesse» e «forza» dell'indice delle storie);
    // al massimo tre per epoca, e almeno quattro smentite, così le epoche e i verdetti si mescolano
    const epoca = (s) => (s.occhiello || "").split(",")[0];
    const ord = SI.storie.slice().sort((a, b) => (+b.interesse || 0) - (+a.interesse || 0) || (+b.forza || 0) - (+a.forza || 0) || (+a.n || 0) - (+b.n || 0));
    const scelte = [], perEpoca = {};
    // le storie nuove (gli esperimenti più recenti, in fondo all'indice): le quattro più interessanti entrano sempre
    const nMax = d3.max(SI.storie, (s) => +s.n || 0), nuove = ord.filter((s) => +s.n > nMax - 21).slice(0, 4);
    nuove.forEach((s) => { scelte.push(s); perEpoca[epoca(s)] = (perEpoca[epoca(s)] || 0) + 1; });
    ord.filter((s) => s.verdetto === "smentita" && scelte.indexOf(s) < 0).slice(0, 4).forEach((s) => { scelte.push(s); perEpoca[epoca(s)] = (perEpoca[epoca(s)] || 0) + 1; });
    ord.forEach((s) => { if (scelte.length < 18 && scelte.indexOf(s) < 0 && (perEpoca[epoca(s)] || 0) < 3) { scelte.push(s); perEpoca[epoca(s)] = (perEpoca[epoca(s)] || 0) + 1; } });
    scelte.sort((a, b) => ((a.anni || [])[0] || 0) - ((b.anni || [])[0] || 0));
    $("n-storie").textContent = "diciotto storie scelte tra le più sorprendenti e le più solide, con le quattro più nuove, di epoche diverse, in ordine di tempo";
    $("muro").innerHTML = G.tessere(scelte, 18);
    $("sezioni").innerHTML = [["parole.html", "Parole", c.parole], ["persone.html", "Persone", c.persone], ["partiti.html", "Partiti", c.partiti], ["legislature.html", "Legislature", c.legislature], ["anni.html", "Anni", G.ANNI.length], ["temi.html", "Temi", c.temi], ["esperimenti.html", "Storie", c.storie], ["esperimenti.html", "Esperimenti", c.esperimenti]]
      .map((s) => `<li><a href="${s[0]}">${s[1]}</a><span>${G.num(s[2])}</span></li>`).join("");
    V.barre("#g-oratori", H.oratori.slice(0, 8).map((o) => [o[0].replace(/^(\S)\S+ /, "$1. "), o[2], !!o[3]]), { wl: 112, passo: 17, hb: 7 });
    G.bottoneCSV("#g-oratori", "chi_parla_di_piu", [["oratore", "interventi"]].concat(H.oratori.map((o) => [o[0], o[2]])));
  }
})();
