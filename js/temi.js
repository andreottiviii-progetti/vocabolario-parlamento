/* Indice dei temi e atlanti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Temi" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("temi.json"), G.carica("esperimenti.json")]).then(([T, E]) => {
      const temi = T.temi;
      const atl = E.filoni.filter((f) => /^Temi|Esteri/.test(f));
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">40 temi trovati da un programma, 27 di contenuto e 13 di procedura</h1>
        <p class="sommario">Un programma raggruppa le parole che compaiono insieme e ne ricava i temi; i nomi li abbiamo dati noi. Per ogni tema: quanta parte dell'aula occupa anno per anno e le sue parole. Accanto ai temi automatici ci sono gli atlanti degli esperimenti: mafie, terrorismo, Europa, migrazioni, Mezzogiorno, Chiesa, lavoro, colonie, debito, donne, diritti, media, energia, emergenza, tasse, droga, scuola, calcio.</p>
        <p class="piccolo grigio">I temi sono misurati sulla Camera. L'attenzione cambia a strappi, e una parte degli strappi è caso: vedi la <a href="storia.html?id=agenda-a-scatti">storia sull'agenda</a>.</p>
        <div id="g-calore"></div>
        <section class="sezione"><div class="testa"><h2>I temi uno per uno</h2></div><div class="tab-scorre" id="tab"></div></section>
        <section class="sezione"><div class="testa"><h2>Gli atlanti</h2></div><p class="sotto-titolo">Gli esperimenti sui temi, raccolti per argomento: mafie, Europa, migrazioni, colonie, terrorismo, donne, media, energia e gli altri.</p><div class="griglia" id="atlanti"></div></section>`;
      const conPicco = temi.map((t) => { let k = 0; t.q.forEach((q, i) => { if (q != null && q > (t.q[k] || 0)) k = i; }); return Object.assign({ picco: 1848 + k, max: t.q[k] || 1 }, t); });
      const cont = conPicco.filter((t) => !t.proc).sort((a, b) => a.picco - b.picco);
      const area = G.figura("#g-calore", {
        titolo: "Le province nell'Ottocento, la guerra nel 1917, l'emergenza nel 2020: ogni tema ha il suo anno",
        sotto: "Quota delle parole della Camera per ognuno dei 27 temi di contenuto, anno per anno. Ogni riga ha la sua scala: più scuro, più se ne parla; in rosso il suo anno di punta.",
        limite: "Bianco: anni senza sedute o con troppo poco testo.",
        csv: () => [["tema"].concat(G.ANNI)].concat(temi.map((t) => [t.nome].concat(t.q))), nomeCSV: "temi",
      });
      G.grafico(area, (a, w) => {
        const stretto = w < 560, lw = stretto ? 120 : 280, rw = stretto ? 0 : 50, rh = 16;
        const svg = a.append("svg").attr("width", w).attr("height", cont.length * rh + 22).attr("role", "img").attr("aria-label", "Temi anno per anno");
        const x = d3.scaleLinear().domain([1848, 2023]).range([lw, w - rw]);
        const cw = Math.max(0.6, x(1849) - x(1848));
        const passi = ["#FFFFFF", "#E6E8EB", "#BFC4CB", "#858C96", "#454B53"]; // grigi: più scuro, più se ne parla; in rosso l'anno di punta
        cont.forEach((o, i) => {
          const yy = i * rh;
          svg.append("a").attr("href", "tema.html?id=" + o.id).append("text").attr("x", lw - 6).attr("y", yy + 12).attr("text-anchor", "end").attr("font-size", 12.5).text(stretto ? o.nome.slice(0, 18) : o.nome.slice(0, 46));
          o.q.forEach((q, k) => {
            if (q == null) return;
            const c = 1848 + k === o.picco ? G.ROSSO : passi[Math.min(4, Math.floor((q / o.max) * 4.999))];
            if (c !== "#FFFFFF") svg.append("rect").attr("x", x(1848 + k)).attr("y", yy).attr("width", cw + 0.3).attr("height", rh - 1).attr("fill", c).append("title").text(`${o.nome}, ${1848 + k}: ${G.pct(q)} delle parole`);
          });
          if (!stretto) svg.append("text").attr("x", w - rw + 6).attr("y", yy + 12).attr("font-size", 12).attr("font-weight", 700).attr("fill", G.INK).text(o.picco);
        });
        d3.range(1860, 2021, stretto ? 50 : 20).forEach((v) => svg.append("text").attr("x", x(v)).attr("y", cont.length * rh + 16).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", G.GRIGIO).text(v));
      });
      G.tabella(document.getElementById("tab"), [
        { t: "tema", k: "nome", fmt: (t) => `<a href="tema.html?id=${t.id}">${G.esc(t.nome)}</a>` },
        { t: "tipo", k: "proc", fmt: (t) => (t.proc ? "procedura" : "contenuto") },
        { t: "anno di punta", k: "picco", n: true, fmt: (t) => G.lAnno(t.picco) },
        { t: "quota massima", k: "max", n: true, fmt: (t) => G.pct(t.max) },
        { t: "forma", k: "x", fmt: (t) => G.miniSVG(t.q, 110, 22), v: (t) => t.picco },
        { t: "parole più forti", k: "parole", fmt: (t) => t.parole.slice(0, 6).map((p) => G.lParola(p[0], p[1])).join(", ") },
      ], conPicco, { ord: 2, verso: 1 });
      document.getElementById("atlanti").innerHTML = atl.map((f, i) => {
        const es = E.elenco.filter((e) => e.filone === f);
        return `<div class="c4${i % 3 ? " fil" : ""}"><h3 class="titolo-piccolo"><a href="esperimenti.html?filone=${encodeURIComponent(f)}">${G.esc(f.replace(/^Temi: /, ""))}</a></h3><ul class="fatti">${es.map((e) => `<li>${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span></li>`).join("")}</ul></div>`;
      }).join("");
    });
  });
})();
