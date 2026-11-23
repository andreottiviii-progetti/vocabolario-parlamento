/* Pagina di una persona: persona.html?id=camera:p16400 */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Persone" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = G.param("id");
    return G.carica("persone/indice.json").then((IX) => {
      const i = IX.p.findIndex((r) => r[0] === id);
      if (i < 0) return G.nonTrovato(el, "Questa persona non c'è tra gli oratori riconosciuti della Repubblica.");
      // il collegamento con primarepubblica.net è un di più: se il file non si legge, la pagina resta com'è
      const tracker = G.carica("persone/tracker.json").catch(() => null);
      return Promise.all([G.carica("persone/" + G.pad(Math.floor(i / IX.pezzo)) + ".json"), G.carica("base.json"), tracker]).then(([D, B, T]) => pagina(el, D[id], IX.p[i], B, T && T.p[id] ? T.u + "#" + T.p[id] : null));
    });
  });

  function pagina(el, P, R, B, schedaTracker) {
    const nome = G.oratore(P.nome);
    document.title = nome + " · Il vocabolario del Parlamento";
    document.getElementById("bric").textContent = nome;
    const L = P.legs;
    const legOf = (n) => B.legislature.find((l) => l.id === "repubblica-" + n);
    const da = legOf(L[0].leg), a = legOf(L[L.length - 1].leg);
    if (da && a) G.dove([da.da, a.a, nome]);
    const parole = L.reduce((s, x) => s + x.parole, 0), turni = L.reduce((s, x) => s + x.turni, 0);
    const partiti = [...new Set(L.map((x) => x.partito).filter(Boolean))];
    const ruoli = {}; L.forEach((x) => Object.entries(x.ruoli || {}).forEach(([k, v]) => { ruoli[k] = (ruoli[k] || 0) + v; }));
    const nomiRuolo = { parlamentare: "da parlamentare", governo: "da membro del governo", relatore: "da relatore" };
    const tipiche = {}; L.forEach((x) => (x.tipiche || []).forEach((t) => { tipiche[t[0]] = tipiche[t[0]] || [t[1], 0]; tipiche[t[0]][1] += t[2]; }));
    const tip = Object.entries(tipiche).sort((p, q) => q[1][1] - p[1][1]).slice(0, 24);
    const ramiTxt = (r) => (r === "camera" ? "Camera" : "Senato");
    el.innerHTML = `
      <h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${G.esc(nome)}</h1>
      <p class="sommario">${G.num(turni)} interventi e ${G.num(parole)} parole in aula, ${L.length === 1 ? "nella " + G.romano(L[0].leg) + " legislatura" : "dalla " + G.romano(L[0].leg) + " alla " + G.romano(L[L.length - 1].leg) + " legislatura"}${partiti.length ? " (" + partiti.map((p) => G.esc(p)).join(", ") + ")" : ""}.${P.wiki ? ` <a class="lk" href="https://it.wikipedia.org/?curid=${P.wiki}" rel="noopener">La pagina di Wikipedia</a>.` : ""}</p>
      ${schedaTracker ? `<p class="piccolo" id="tracker">Vita e carriera: <a class="lk" href="${G.esc(schedaTracker)}" rel="noopener">scheda su primarepubblica.net →</a></p>` : ""}
      <section class="griglia">
        <div class="c8" id="g-legs"></div>
        <aside class="c4 fil"><h3 class="titolo-piccolo">Come ha parlato</h3><ul class="fatti" id="fatti"></ul></aside>
      </section>
      <section class="sezione griglia">
        <div class="c8"><h2 class="titolo-medio">Le parole più sue</h2><p class="fig-sotto">Le parole che dice molto più del resto dell'aula nella stessa legislatura e nello stesso ramo; solo per chi ha detto almeno 3.000 parole in quella legislatura. Accanto, le volte.</p><div class="tab-scorre" id="t-tip"></div></div>
        <div class="c4 fil"><h3 class="titolo-piccolo">Tutte le legislature insieme</h3><p class="parole-nuvola" id="tip-tutte"></p></div>
      </section>`;
    // con una legislatura sola una barra non dice niente: basta il numero (revisione v7, «niente grafici a una barra»)
    if (L.length === 1) {
      const x = L[0];
      document.getElementById("g-legs").innerHTML = `<p class="numero-solo"><b>${G.num(x.parole)}</b> parole dette in aula, tutti i ruoli, nella <a href="legislatura.html?id=repubblica-${x.leg}">${G.romano(x.leg)} legislatura</a>, ${ramiTxt(x.ramo)}${x.partito ? ", " + G.esc(x.partito) : ""}.</p>`;
    }
    const area = L.length === 1 ? null : G.figura("#g-legs", {
      titolo: L.length > 1 ? (() => { const m = L.reduce((p, q) => (q.parole > p.parole ? q : p)); return `Parla di più nella ${G.romano(m.leg)} legislatura: ${G.num(m.parole)} parole`; })() : `${G.num(parole)} parole in una legislatura`,
      sotto: "Parole dette in aula per legislatura e ramo, tutti i ruoli",
      csv: () => [["legislatura", "ramo", "partito", "interventi", "parole"]].concat(L.map((x) => [x.leg, x.ramo, x.partito, x.turni, x.parole])), nomeCSV: "persona",
    });
    if (area) area.html(G.barre(L.map((x) => [`<a href="legislatura.html?id=repubblica-${x.leg}">${G.romano(x.leg)}</a> ${ramiTxt(x.ramo)}${x.partito ? ", " + (x.ramo === "camera" ? G.lPartito(x.partito.replace("Unità", "Unita'"), x.partito) : G.esc(x.partito)) : ""}`, x.parole, false])));
    const f = [[`<b>${G.num(turni)}</b> interventi`, `${G.num(Math.round(parole / Math.max(1, turni)))} parole per intervento in media`]];
    Object.entries(ruoli).sort((p, q) => q[1] - p[1]).forEach(([k, v]) => f.push([`<b>${G.num(v)}</b> interventi ${nomiRuolo[k] || k}`, ""]));
    document.getElementById("fatti").innerHTML = f.map((x) => `<li>${x[0]}${x[1] ? `<span class="et">${x[1]}</span>` : ""}</li>`).join("");
    const conTip = L.filter((x) => (x.tipiche || []).length);
    document.getElementById("t-tip").innerHTML = conTip.length ? '<table class="fitta"><thead><tr><th>legislatura</th><th>parole più sue</th></tr></thead><tbody>' + conTip.map((x) => `<tr><td><a href="legislatura.html?id=repubblica-${x.leg}">${G.romano(x.leg)}</a> ${ramiTxt(x.ramo)}</td><td>${x.tipiche.map((t) => G.lParola(t[0], t[1]) + ' <span class="grigio">' + G.num(t[2]) + "</span>").join(", ")}</td></tr>`).join("") + "</tbody></table>" : '<p class="grigio">Troppe poche parole per calcolarle.</p>';
    document.getElementById("tip-tutte").innerHTML = tip.length ? tip.map(([w, v]) => G.lParola(w, v[0]) + "<small>" + G.num(v[1]) + "</small>").join(" ") : "–";
  }
})();
