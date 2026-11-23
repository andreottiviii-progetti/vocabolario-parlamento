/* Prime volte: la cronologia delle parole della modernita' */
(function () {
  "use strict";
  // Elenco ragionato delle parole e delle espressioni della modernita' (scelta editoriale; le date e le frasi vengono dai dati).
  const PAROLE = ["telegrafo", "ferrovia", "telefono", "fotografia", "automobile", "aeroplano", "radio", "cinematografo", "frigorifero", "televisione",
    "satellite", "computer", "elaboratore", "informatica", "fotocopiatrice", "videocassetta", "internet", "telefonino", "cellulare", "web", "email", "euro",
    "spread", "smartphone", "facebook", "twitter", "google", "algoritmo", "bitcoin", "covid", "lockdown", "privacy", "globalizzazione", "ecologia", "inquinamento",
    "femminicidio", "migranti", "tangentopoli", "casta"];
  const ESPR = ["energia atomica", "bomba atomica", "cervello elettronico", "calcolatore elettronico", "televisione a colori", "personal computer",
    "posta elettronica", "telefono cellulare", "carta di credito", "banda larga", "commercio elettronico", "social network", "intelligenza artificiale",
    "realta virtuale", "cambiamenti climatici", "effetto serra", "guerra fredda", "compromesso storico", "mani pulite", "questione morale", "seconda repubblica"];
  G.avvia(function () {
    G.testata({ attivo: "Prime volte" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all(PAROLE.map((w) => G.schedaPrime(w).then((s) => (s ? { k: w, s, espr: false } : null))).concat(ESPR.map((e) => G.espressione(e).then((s) => (s ? { k: e, s, espr: true } : null)))))
      .then((tutte) => {
        const v = tutte.filter((x) => x && x.s.p && x.s.p.length && !(x.s.senso && x.s.senso.stato === "non nuova")).sort((a, b) => (a.s.p[0][0] < b.s.p[0][0] ? -1 : 1));
        const incerte = tutte.filter((x) => x && x.s.senso && x.s.senso.stato === "incerta");
        const vecchie = tutte.filter((x) => x && x.s.senso && x.s.senso.stato === "non nuova");
        el.innerHTML = `<h1 class="titolo-pagina">Prime volte</h1>
          <p class="sommario">La prima volta che l'aula dice «${G.esc(v[0] ? v[0].s.f || v[0].k : "")}» è il ${v[0] ? G.data(v[0].s.p[0][0]) : ""}; l'ultima parola nuova di questo elenco arriva il ${v.length ? G.data(v[v.length - 1].s.p[0][0]) : ""}. Per ogni parola: la data, chi la dice, la frase.</p>
          <p class="piccolo grigio">Come si sceglie la prima volta: dal primo anno in cui la parola si dice almeno tre volte in tre anni. Le comparse più vecchie e isolate sono spesso errori di lettura della scansione: dove ci sono, sono segnalate. Per le parole di questo elenco le prime comparse sono state rilette da un programma: la data è la prima nel senso di oggi (la moneta per «euro», la rete per «banda larga»), e accanto c'è la data che dava la regola. Cerca qualunque parola detta almeno 10 volte con la casella in alto.</p>
          <div class="cerca-grande" style="margin-top:24px"><input id="cerca-pv" type="search" placeholder="una parola o un'espressione: la sua prima volta" aria-label="Cerca la prima volta di una parola"><button class="bottone" id="vai-pv" type="button">Cerca</button></div>
          <ol class="cronologia" id="crono"></ol>`;
        document.getElementById("crono").innerHTML = v.map((x) => {
          const p = x.s.p[0], f = x.s.f || x.k;
          const voce = x.s.p.find((q) => q[5]) || p;
          return `<li><span class="c-anno">${p[0].slice(0, 4)}</span><div><h3><a href="parola.html?p=${encodeURIComponent(x.k)}">${G.esc(f)}</a> <small class="grigio">${G.num(x.s.t)} volte in tutto</small></h3>${G.voceVolta(voce === p ? p : [p[0], p[1], p[2], p[3], p[4], "", ""], [f, x.k])}${voce !== p ? `<p class="piccolo">La prima frase leggibile: ${G.voceVolta(voce, [f, x.k])}</p>` : ""}${G.notaSenso(x.s) ? `<p class="piccolo grigio">${G.notaSenso(x.s)}</p>` : ""}${x.s.g && !(x.s.senso && x.s.senso.stato !== "confermata") ? `<p class="piccolo grigio">Comparsa più vecchia, ${G.data(x.s.g[0])}: probabile errore di lettura del testo stampato.</p>` : ""}</div></li>`;
        }).join("") + (incerte.length ? `<li><span class="c-anno">?</span><div><h3>Incerte</h3><p>${incerte.map((x) => `<a href="parola.html?p=${encodeURIComponent(x.k)}">${G.esc(x.s.f || x.k)}</a>`).join(", ")}: prima volta nel senso di oggi incerta.</p></div></li>` : "") + (vecchie.length ? `<li><span class="c-anno">—</span><div><h3>Non sono parole nuove</h3><p>${vecchie.map((x) => `<a href="parola.html?p=${encodeURIComponent(x.k)}">${G.esc(x.s.f || x.k)}</a> (dal ${x.s.p[0] ? x.s.p[0][0].slice(0, 4) : "?"})`).join(", ")}: c'erano già prima e crescono dopo.</p></div></li>` : "");
        const vai = () => { const q = G.normaFrase(document.getElementById("cerca-pv").value); if (q) location.href = "parola.html?p=" + encodeURIComponent(q); };
        document.getElementById("vai-pv").addEventListener("click", vai);
        document.getElementById("cerca-pv").addEventListener("keydown", (e) => { if (e.key === "Enter") vai(); });
      });
  });
})();
