/* Pagina di un tema: tema.html?id=12 */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Temi" });
    G.piede();
    const el = document.getElementById("contenuto");
    const id = parseInt(G.param("id") || "0", 10);
    return G.carica("temi.json").then((T) => {
      const t = T.temi.find((x) => x.id === id);
      if (!t) return G.nonTrovato(el, "Questo tema non c'è.");
      document.title = t.nome + " · Il vocabolario del Parlamento";
      document.getElementById("bric").textContent = t.nome;
      let k = 0; t.q.forEach((q, i) => { if (q != null && q > (t.q[k] || 0)) k = i; });
      const picco = 1848 + k;
      G.dove([picco, picco, "anno di punta, " + picco]);
      const media = (a, b) => d3.mean(t.q.slice(a - 1848, b - 1847).filter((v) => v != null));
      const per = [["1848-1900", 1848, 1900], ["1901-1943", 1901, 1943], ["1946-1993", 1946, 1993], ["1994-2022", 1994, 2022]];
      const altri = T.temi.filter((x) => x.proc === t.proc && x.id !== t.id);
      el.innerHTML = `
        <h1 class="titolo-pagina" style="font-size:clamp(40px,6vw,80px)">${G.esc(t.nome)}</h1>
        <p class="sommario">Tema ${t.proc ? "di procedura" : "di contenuto"}, trovato da un programma tra i 40 della Camera. Il massimo è nel <a class="lk" href="anno.html?a=${picco}">${picco}</a>, con il ${G.pct(t.q[k])} delle parole dell'aula.</p>
        <section class="griglia"><div class="c8" id="g-tema"></div>
        <aside class="c4 fil"><h3 class="titolo-piccolo">Per periodo</h3><ul class="fatti">${per.map((p) => `<li><b>${G.pct(media(p[1], p[2]) || 0)}</b> delle parole<span class="et">${p[0]}, media degli anni, Camera</span></li>`).join("")}</ul>
          <h3 class="titolo-piccolo" style="margin-top:18px">Le parole più forti del tema</h3><p class="parole-nuvola">${t.parole.map((p) => G.lParola(p[0], p[1])).join(" ")}</p></aside></section>
        <section class="sezione"><div class="testa"><h2>Gli altri temi ${t.proc ? "di procedura" : "di contenuto"}</h2><span class="a-destra"><a href="temi.html">Tutti i temi</a></span></div><p class="parole-nuvola">${altri.map((x) => `<a href="tema.html?id=${x.id}">${G.esc(x.nome)}</a>`).join(" ")}</p></section>`;
      const area = G.figura("#g-tema", {
        titolo: `«${G.esc(t.nome)}» tocca il massimo nel ${picco}: ${G.pct(t.q[k])} delle parole della Camera`,
        sotto: "Quota delle parole dell'aula dedicata al tema, media mobile di tre anni: nero la Camera" + (t.qs ? ", grigio il Senato" : "") + ".",
        limite: "Bianco: anni senza sedute o con troppo poco testo.",
        csv: () => [["anno", "camera", "senato"]].concat(G.ANNI.map((a, i) => [a, t.q[i], t.qs ? t.qs[i] : ""])), nomeCSV: "tema_" + t.id,
      });
      G.grafico(area, (a, w) => {
        const qc = G.media3(t.q), qs = t.qs ? G.media3(t.qs) : null;
        const mx = d3.max(qc.concat(qs || []), (v) => v || 0) || 0.01;
        // come dice il sottotitolo: nero (grigio scuro) la Camera, grigio il Senato; in rosso il punto dell'anno di punta
        const ss = [{ punti: G.ANNI.map((y, i) => [y, qc[i]]), colore: G.SCURO, sp: 2.5, etich: qs ? "Camera" : null, nome: "Camera", piccoEtich: { x: picco, y: qc[k], colore: G.ROSSO, testo: picco + ": " + G.pct(t.q[k]) } }];
        if (qs) ss.push({ punti: G.ANNI.map((y, i) => [y, qs[i]]), colore: G.GDATI, sp: 1.5, etich: "Senato" });
        G.linee(a, w, { x: [1848, 2022], y: [0, mx * 1.15], serie: ss, yFmt: (v) => G.pct(v, 0), unita: "delle parole" });
      });
    });
  });
})();
