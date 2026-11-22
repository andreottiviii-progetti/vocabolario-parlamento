/* Percorso: risate e insulti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Percorsi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("sezioni/risate.json"), G.carica("sezioni/insulti.json"), G.carica("esperimenti.json"), G.carica("storie/indice.json").catch(() => ({ storie: [] }))]).then(([R, I, E, S]) => {
      document.getElementById("dove").remove();
      const P = R.periodi, p0 = P[0], p1 = P[P.length - 1];
      const e20a = E.elenco.find((e) => e.cod === "H20a"), e20b = E.elenco.find((e) => e.cod === "H20b"), e13 = E.elenco.find((e) => e.cod === "H13");
      const media = (a, b) => { const v = Object.entries(I.serie).filter(([y]) => +y >= a && +y <= b).map(([, x]) => x[0]); return d3.mean(v); };
      const storie = S.storie.filter((s) => ["risate-in-aula", "chi-fa-ridere", "insulti-non-aumentano", "chi-parla-di-piu"].includes(s.id));
      el.innerHTML = `
        <h1 class="titolo-pagina">Risate e insulti</h1>
        <p class="sommario">Nel ${G.esc(p0[0])} lo stenografo annota l'ilarità ${G.num(p0[1], 0)} volte ogni mille interventi; nel ${G.esc(p1[0])} ${G.num(p1[1], 1)}. Gli insulti invece non aumentano: ${G.num(media(1948, 1969), 3)} ogni mille parole nel 1948-69, ${G.num(media(2008, 2022), 3)} dal 2008.</p>
        <section class="griglia" style="margin-top:40px">
          <div class="c4"><div class="numero-ill">${G.num(p0[1], 0)}→${G.num(p1[1], 1)}</div><p class="che-cosa">risate annotate ogni mille interventi, ${G.esc(p0[0])} e ${G.esc(p1[0])}</p>${e20a ? `<p class="piccolo">${G.lEsp("H20a")} ${G.esito(e20a.esito)}</p>` : ""}</div>
          <div class="c8" id="g-ila"></div>
        </section>
        <section class="sezione griglia"><div class="c6" id="g-top"></div><div class="c6 fil" id="g-efficaci"></div></section>
        <section class="sezione"><div class="testa"><h2>Le frasi che fanno ridere</h2><span class="a-destra" id="n-ris"></span></div>
          <p class="sotto-titolo">La frase che precede l'annotazione «(Ilarità)» o «(Si ride)», come la scrive il resoconto, con chi la dice e quando.</p>
          <div class="filtri" id="f-ris"></div><ul class="elenco-frasi" id="frasi-ris"></ul><p><button class="bottone" id="altre-ris" type="button">Altre risate</button></p></section>
        <section class="sezione griglia"><div class="c8" id="g-insulti"></div><div class="c4 fil"><h3 class="titolo-piccolo">Gli insulti più detti</h3><p class="fig-sotto">Volte in tutto, 1848-2022. La grandezza segue le volte.</p><p class="parole-grandi" id="parole-ins"></p></div></section>
        <section class="sezione"><div class="testa"><h2>Gli insulti detti in aula</h2><span class="a-destra" id="n-ins"></span></div>
          <p class="sotto-titolo">Citazioni dall'aula, con fonte e data: la parola può essere rivolta a qualcuno, riferita, negata o avere un altro senso («scema» è anche il verbo scemare). Scegli un decennio.</p>
          <div class="filtri" id="f-dec"></div><div class="cerca-grande"><input id="cerca-ins" type="search" placeholder="filtra per parola o per nome" aria-label="Filtra gli insulti"></div><ul class="elenco-frasi" id="frasi-ins"></ul></section>
        <section class="sezione griglia"><div class="c6" id="g-partiti"></div><div class="c6 fil" id="g-clima"></div></section>
        <section class="sezione"><div class="testa"><h2>Le storie</h2></div>${G.tessere(storie, 4)}</section>`;
      // ilarita' nel tempo
      const anni = Object.keys(R.serie).map(Number).sort();
      const a1 = G.figura("#g-ila", {
        titolo: "In aula si ride sempre meno: il calo è tutto tra il 1920 e il 1970",
        sotto: "Annotazioni di ilarità ogni mille interventi, Camera (piena) e Senato (tratteggio), media di tre anni, 1848-2022",
        limite: "Si contano le risate che lo stenografo annota: le regole per annotarle cambiano nel tempo.",
        csv: () => [["anno", "camera", "senato"]].concat(anni.map((y) => [y, R.serie[y][0], R.serie[y][1]])), nomeCSV: "ilarita",
      });
      G.grafico(a1, (a, w) => {
        const c = G.media3(G.ANNI.map((y) => (R.serie[y] ? R.serie[y][0] : null))), s = G.media3(G.ANNI.map((y) => (R.serie[y] ? R.serie[y][1] : null)));
        G.linee(a, w, { x: [1848, 2022], y: [0, d3.max(c.concat(s), (v) => v || 0) * 1.1], h: w < 560 ? 240 : 320, trascr: "entrambi", unita: "ogni mille interventi",
          serie: [{ punti: G.ANNI.map((y, i) => [y, c[i]]), colore: G.SEZ, sp: 3, etich: "Camera" }, { punti: G.ANNI.map((y, i) => [y, s[i]]), colore: G.SEZ_S, sp: 2, tratt: "8 4", etich: "Senato" }] });
      });
      const lp = (o) => (o.pid ? G.lPersona(o.pid, o.nome) : G.esc(o.nome));
      const a2 = G.figura("#g-top", { titolo: `${G.esc(R.top[0].nome)} fa ridere l'aula ${G.num(R.top[0].ila)} volte`, sotto: "Risate annotate dopo un intervento, per oratore, 1848-2022", csv: () => [["oratore", "risate", "interventi", "anni"]].concat(R.top.map((o) => [o.nome, o.ila, o.interventi, o.da + "-" + o.a])), nomeCSV: "chi_fa_ridere" });
      a2.html(G.barre(R.top.slice(0, 15).map((o, i) => [lp(o) + ` <span class="grigio">${o.da}-${o.a}</span>`, o.ila, i === 0])));
      const a3 = G.figura("#g-efficaci", { titolo: `${G.esc(R.efficaci[0].nome)} fa ridere ${G.num(R.efficaci[0].rapporto, 1)} volte più del previsto`, sotto: "Risate osservate su quelle attese per le sue parole, oratori con almeno 200.000 parole" + (e20b ? ". " + G.esc(e20b.numero) : ""), csv: () => [["oratore", "osservate_su_attese"]].concat(R.efficaci.map((o) => [o.nome, o.rapporto])), nomeCSV: "piu_efficaci" });
      a3.html(G.barre(R.efficaci.slice(0, 15).map((o, i) => [lp(o) + ` <span class="grigio">${o.da}-${o.a}</span>`, o.rapporto, i === 0]), { fmt: (v) => G.num(v, 1) + " volte" }));
      // frasi
      let ep = "", quante = 30;
      const ER = [["", "tutte"], ["Regno", "Regno"], ["Fascismo", "Fascismo"], ["Repubblica", "Repubblica"]];
      const epoca = (d) => (+d.slice(0, 4) < 1923 ? "Regno" : +d.slice(0, 4) < 1944 ? "Fascismo" : "Repubblica");
      const fr = () => {
        document.getElementById("f-ris").innerHTML = ER.map(([v, t]) => `<button type="button" data-v="${v}" class="${v === ep ? "attivo" : ""}">${t}</button>`).join("");
        document.querySelectorAll("#f-ris button").forEach((b) => b.addEventListener("click", () => { ep = b.dataset.v; quante = 30; fr(); }));
        const v = R.frasi.filter((x) => !ep || epoca(x[0]) === ep);
        const passo = Math.max(1, Math.floor(v.length / quante));
        const sel = v.filter((x, i) => i % passo === 0).slice(0, quante);
        document.getElementById("frasi-ris").innerHTML = sel.map((x) => `<li><span class="quando"><b>${G.data(x[0])}</b>, ${G.ramo(x[1])}, ${x[2] ? (x[3] ? G.lPersona(x[3], G.oratore(x[2])) : G.esc(G.oratore(x[2]))) : "oratore non riconosciuto"}${x[4] ? " (" + G.esc(x[4]) + ")" : ""}</span><q>${G.esc(x[5])}</q> <span class="grigio">(Ilarità)</span></li>`).join("");
        document.getElementById("n-ris").textContent = G.num(v.length) + " frasi";
        document.getElementById("altre-ris").style.display = quante >= v.length ? "none" : "";
      };
      document.getElementById("altre-ris").addEventListener("click", () => { quante += 60; fr(); });
      fr();
      // insulti nel tempo
      const ai = G.figura("#g-insulti", {
        titolo: `Gli insulti non aumentano: ${G.num(media(1948, 1969), 3)} ogni mille parole nel 1948-69, ${G.num(media(2008, 2022), 3)} dal 2008`,
        sotto: "Parole della lista degli insulti ogni mille parole dette in aula, Camera e Senato, media di tre anni, 1848-2022",
        limite: (e13 ? "Esperimento H13: " + e13.esito + ". " : "") + "La lista è corta e scritta prima di contare.",
        csv: () => [["anno", "insulti_per_mille_parole", "proteste_commenti_interruzioni_per_100_turni", "volte"]].concat(Object.entries(I.serie).map(([y, v]) => [y].concat(v))), nomeCSV: "insulti",
      });
      G.grafico(ai, (a, w) => {
        const v = G.media3(G.ANNI.map((y) => (I.serie[y] ? I.serie[y][0] : null)));
        G.linee(a, w, { x: [1848, 2022], y: [0, d3.max(v, (x) => x || 0) * 1.3], h: 280, unita: "ogni mille parole", yFmt: (x) => G.num(x, 2),
          serie: [{ punti: G.ANNI.map((y, i) => [y, v[i]]), colore: G.SEZ, sp: 3, etich: "insulti" }] });
      });
      const mx = I.parole[0][1];
      document.getElementById("parole-ins").innerHTML = I.parole.slice(0, 40).map((p) => `<a href="parola.html?p=${p[0]}" style="font-size:${(14 + 26 * Math.sqrt(p[1] / mx)).toFixed(0)}px">${G.esc(p[0])}</a>`).join(" ");
      const ap = G.figura("#g-partiti", { titolo: "Chi dice più insulti, alla Camera della Repubblica", sotto: "Volte in tutto, per partito di chi parla; non sono divise per le parole del partito, quindi i partiti grandi salgono", csv: () => [["partito", "volte"]].concat(I.partiti), nomeCSV: "insulti_partiti" });
      ap.html(G.barre(I.partiti.slice(0, 12).map((p, i) => [G.lPartito(p[0], p[0]), p[1], i === 0])));
      const ac = G.figura("#g-clima", { titolo: "Proteste, commenti e interruzioni annotati", sotto: "Interventi con un'annotazione di proteste, commenti o interruzioni ogni cento, Camera e Senato, media di tre anni", limite: "Il calo può venire dalle regole degli stenografi.", csv: () => [["anno", "per_100"]].concat(Object.entries(I.serie).map(([y, v]) => [y, v[1]])), nomeCSV: "clima" });
      G.grafico(ac, (a, w) => {
        const v = G.media3(G.ANNI.map((y) => (I.serie[y] ? I.serie[y][1] : null)));
        G.linee(a, w, { x: [1848, 2022], y: [0, d3.max(v, (x) => x || 0) * 1.1], h: 240, unita: "ogni cento", serie: [{ punti: G.ANNI.map((y, i) => [y, v[i]]), colore: G.SEZ_S, sp: 2.5, etich: "annotazioni" }] });
      });
      // elenco degli insulti per decennio
      const dec = Object.keys(I.decenni).map(Number).sort();
      let d = dec.includes(1990) ? 1990 : dec[dec.length - 1], filtro = "";
      document.getElementById("n-ins").textContent = G.num(I.totale) + " citazioni";
      const mostra = () => {
        document.getElementById("f-dec").innerHTML = dec.map((x) => `<button type="button" data-v="${x}" class="${x === d ? "attivo" : ""}">${x === 1840 ? "1848" : x}<small class="grigio"> ${G.num(I.decenni[x])}</small></button>`).join("");
        document.querySelectorAll("#f-dec button").forEach((b) => b.addEventListener("click", () => { d = +b.dataset.v; mostra(); }));
        G.carica("sezioni/insulti/" + d + ".json").then((V) => {
          const t = filtro.toLowerCase();
          const v = V.filter((x) => !t || (x[2] + " " + x[3] + " " + x[6]).toLowerCase().includes(t));
          document.getElementById("frasi-ins").innerHTML = v.slice(0, 120).map((x) => `<li><span class="quando"><b>${G.esc(x[2])}</b> · ${G.data(x[0])}, ${G.ramo(x[1])}, ${x[3] ? (x[4] ? G.lPersona(x[4], G.oratore(x[3])) : G.esc(G.oratore(x[3]))) : "oratore non riconosciuto"}${x[5] ? " (" + G.esc(x[5]) + ")" : ""}</span><q>${G.frase(x[6], [x[2]])}</q></li>`).join("") + (v.length > 120 ? `<li class="grigio">e altre ${G.num(v.length - 120)}: usa il filtro per trovarle.</li>` : "");
        });
      };
      document.getElementById("cerca-ins").addEventListener("input", (e) => { filtro = e.target.value; mostra(); });
      mostra();
    });
  });
})();
