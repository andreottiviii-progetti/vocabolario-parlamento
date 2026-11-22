/* Indice delle persone */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Persone" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("persone/indice.json").then((IX) => {
      const P = IX.p.map((r) => ({ id: r[0], nome: r[1], rami: r[2], da: r[3], a: r[4], partito: r[5], turni: r[6], parole: r[7] }));
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${G.num(P.length)} oratori della Repubblica, ${G.num(P.filter((p) => p.turni >= 100).length)} con almeno cento interventi</h1>
        <p class="sommario">Per ognuno: interventi e parole per legislatura, alla Camera e al Senato, gli incarichi, le parole che usa più degli altri. I nomi vengono dagli elenchi ufficiali di Camera e Senato.</p>
        <p class="piccolo grigio">Si conta ciò che il resoconto attribuisce a una persona. Una parte degli omonimi non si può distinguere e resta fuori. Il Regno non c'è: lì il resoconto dà quasi sempre solo il cognome.</p>
        <section class="griglia"><div class="c8" id="g-top"></div><aside class="c4 fil"><h3 class="titolo-piccolo">In cifre</h3><ul class="fatti" id="fatti"></ul></aside></section>
        <section class="sezione"><div class="cerca-grande"><input id="cerca" type="search" placeholder="cerca un nome o un partito" aria-label="Cerca una persona" autocomplete="off"></div><p class="fig-sotto" id="quanti"></p><div class="tab-scorre" id="tab"></div></section>`;
      const top = P.slice().sort((a, b) => b.parole - a.parole).slice(0, 15);
      const area = G.figura("#g-top", {
        titolo: `${G.esc(G.oratore(top[0].nome))} dice ${G.num(top[0].parole / 1e6, 1)} milioni di parole, più di chiunque altro`,
        sotto: "Parole dette in aula, Camera e Senato della Repubblica, 1948-2022 (tutti i ruoli: parlamentare, ministro, relatore; il Presidente d'aula escluso)",
        csv: () => [["persona", "parole", "interventi"]].concat(top.map((p) => [p.nome, p.parole, p.turni])), nomeCSV: "persone_top",
      });
      area.html(G.barre(top.map((p, i) => [G.lPersona(p.id, G.oratore(p.nome)), p.parole, i === 0])));
      const nC = P.filter((p) => p.rami.includes("C")).length, nS = P.filter((p) => p.rami.includes("S")).length, nCS = P.filter((p) => p.rami === "CS").length;
      document.getElementById("fatti").innerHTML = [[G.num(nC), "persone hanno parlato alla Camera"], [G.num(nS), "al Senato"], [G.num(nCS), "in tutti e due i rami"], [G.num(P.filter((p) => p.turni >= 100).length), "hanno almeno 100 interventi"]].map((x) => `<li><b>${x[0]}</b><span class="et">${x[1]}</span></li>`).join("");
      const tab = document.getElementById("tab");
      const col = [
        { t: "persona", k: "nome", fmt: (p) => G.lPersona(p.id, G.oratore(p.nome)), v: (p) => p.nome.split(" ").slice(-1)[0].toLowerCase() },
        { t: "ramo", k: "rami", fmt: (p) => p.rami.replace("CS", "Camera e Senato").replace("C", "Camera").replace("S", "Senato") },
        { t: "legislature", k: "da", n: true, fmt: (p) => (p.da === p.a ? G.romano(p.da) : G.romano(p.da) + "-" + G.romano(p.a)) },
        { t: "partito o gruppo", k: "partito", fmt: (p) => G.esc((p.partito || "").replace("Unita'", "Unità")) },
        { t: "interventi", k: "turni", n: true, fmt: (p) => G.num(p.turni) },
        { t: "parole", k: "parole", n: true, fmt: (p) => G.num(p.parole) },
      ];
      function fai(q) {
        const t = (q || "").toLowerCase().trim();
        const v = t ? P.filter((p) => (p.nome + " " + p.partito).toLowerCase().includes(t)) : P.slice().sort((a, b) => b.turni - a.turni);
        document.getElementById("quanti").textContent = t ? v.length + " persone trovate" + (v.length > 300 ? ", le prime 300" : "") + "." : "Le 300 persone con più interventi. Scrivi un nome per cercare tra tutte.";
        G.tabella(tab, col, v.slice(0, 300), { ord: t ? -1 : 4, verso: -1 });
      }
      document.getElementById("cerca").addEventListener("input", (e) => fai(e.target.value));
      fai("");
    });
  });
})();
