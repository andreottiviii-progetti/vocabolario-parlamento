/* Pagina di un anno: anno.html?a=1976 */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Anni" });
    G.piede();
    const el = document.getElementById("contenuto");
    const a = Math.max(1848, Math.min(2022, parseInt(G.param("a") || "1976", 10) || 1976));
    return Promise.all([G.carica("anni.json"), G.carica("base.json"), G.carica("esperimenti.json")]).then(([A, B, E]) => {
      const Y = A[a];
      document.title = a + " · Il vocabolario del Parlamento";
      document.getElementById("bric").textContent = a;
      G.dove([a, a, String(a)]);
      G.guideVicine(a > 1848 ? ["anno.html?a=" + (a - 1), String(a - 1)] : null, a < 2022 ? ["anno.html?a=" + (a + 1), String(a + 1)] : null);
      const legs = Y.leg.map((id) => B.legislature.find((l) => l.id === id)).filter(Boolean);
      const parole = (Y.parole || []).filter((x) => x[0].length >= 4);
      const p1 = parole.find((x) => x[0].length >= 5) || parole[0];
      const esp = E.elenco.filter((e) => new RegExp("\\b" + a + "\\b").test(e.titolo + " " + e.attesa + " " + e.numero));
      el.innerHTML = `
        <h1 class="titolo-pagina">${a}</h1>
        <p class="sommario">${p1 ? `La parola dell'anno è ${G.lParola(p1[0], p1[3] || p1[0])}, con ${G.num(p1[1])} volte per milione di parole.` : ""} ${Y.tot[0] || Y.tot[1] ? `L'aula conta ${G.num((Y.tot[0] + Y.tot[1]) / 1e6, 1)} milioni di parole: ${G.num(Y.tot[0] / 1e6, 1)} alla Camera, ${G.num(Y.tot[1] / 1e6, 1)} al Senato.` : "In quest'anno non ci sono sedute nei resoconti."} ${legs.length ? "Legislatura: " + legs.map((l) => G.lLeg(l.id, l.nome)).join(" e ") + "." : ""}</p>
        <section class="griglia">
          <div class="c8" id="g-anno"></div>
          <aside class="c4 fil"><h3 class="titolo-piccolo">Le parole dell'anno</h3><p class="fig-sotto">Volte per milione di parole nell'anno</p><ul class="elenco-n" id="l-parole"></ul></aside>
        </section>
        <section class="sezione griglia">
          <div class="c5"><h3 class="titolo-piccolo">Le parole che hanno il massimo in quest'anno</h3><p class="fig-sotto">Anno di punta della curva, media di Camera e Senato; in ordine di volte in tutto</p><p class="parole-nuvola" id="picchi"></p></div>
          <div class="c4 fil"><h3 class="titolo-piccolo">I temi più presenti</h3><p class="fig-sotto">Quota delle parole della Camera</p><div id="temi"></div></div>
          <div class="c3 fil"><h3 class="titolo-piccolo">Contesto</h3><p class="fig-sotto">Fatti di storia: non sono misurati dal sito</p><ul class="fatti" id="eventi"></ul>
            <h3 class="titolo-piccolo" style="margin-top:18px">Esperimenti che citano il ${a}</h3><ul class="fatti" id="esp"></ul></div>
        </section>
        <nav class="prec-succ" aria-label="Anni vicini"><span>${a > 1848 ? `<a href="anno.html?a=${a - 1}">← ${a - 1}</a>` : ""}</span><span>${a < 2022 ? `<a href="anno.html?a=${a + 1}">${a + 1} →</a>` : ""}</span></nav>`;
      document.getElementById("l-parole").innerHTML = parole.length ? parole.map((x) => `<li><span>${G.lParola(x[0], x[3] || x[0])}</span><span>${G.num(x[1])}</span></li>`).join("") : '<li class="grigio">Nessun dato</li>';
      document.getElementById("picchi").innerHTML = (Y.picchi || []).map((x) => G.lParola(x[0], x[1]) + "<small>" + G.num(x[2]) + "</small>").join(" ") || "Nessuna";
      document.getElementById("temi").innerHTML = (Y.temi || []).length ? G.barre(Y.temi.map((t, i) => [`<a href="tema.html?id=${t[0]}">${G.esc(t[1].slice(0, 30))}</a>`, t[2], i === 0]), { fmt: (v) => G.pct(v) }) : '<p class="grigio">Nessun dato</p>';
      document.getElementById("eventi").innerHTML = (Y.eventi || []).length ? Y.eventi.map((e) => `<li><b>${G.data(e[0])}</b><span class="et">${G.esc(e[1])}</span></li>`).join("") : '<li class="grigio">Nessun evento nell\'elenco del sito.</li>';
      document.getElementById("esp").innerHTML = esp.length ? esp.slice(0, 10).map((e) => `<li>${G.lEsp(e.cod)} ${G.esc(e.titolo)}<span class="et">${G.esito(e.esito)}</span></li>`).join("") : '<li class="grigio">Nessuno.</li>';
      // curve delle prime tre parole di punta, con l'anno evidenziato
      const sc = (Y.picchi || []).slice(0, 3).map((x) => x[0]);
      if (!sc.length) { document.getElementById("g-anno").innerHTML = ""; return; }
      return Promise.all(sc.map((w) => G.curvaParola(w))).then((cc) => {
        cc = cc.filter(Boolean);
        const area = G.figura("#g-anno", {
          titolo: `«${G.esc(G.maiusc(cc[0].forma))}» tocca il massimo nel ${a}`,
          sotto: "Tre parole che hanno il loro anno di punta nel " + a + ". Volte per milione di parole, media dei due rami, anno per anno.",
          csv: () => [["anno"].concat(cc.map((c) => c.w))].concat(G.ANNI.map((y, i) => [y].concat(cc.map((c) => (c.pm.m[i] == null ? "" : c.pm.m[i].toFixed(2)))))), nomeCSV: "picchi_" + a,
        });
        G.grafico(area, (ar, w) => {
          const da = Math.max(1848, a - 40), al = Math.min(2022, a + 30);
          const ss = cc.map((c, i) => ({ punti: G.ANNI.map((y, k) => [y, c.pm.m[k]]).filter((p) => p[0] >= da && p[0] <= al), colore: G.SERIE[i], sp: i === 0 ? 2.5 : 1.5, etich: c.forma }));
          const mx = d3.max(ss, (s) => d3.max(s.punti, (p) => p[1] || 0)) || 1;
          G.linee(ar, w, { x: [da, al], y: [0, mx * 1.1], serie: ss, unita: "per milione", fasce: [{ da: a - 0.5, a: a + 0.5, testo: String(a) }] });
        });
      });
    });
  });
})();
