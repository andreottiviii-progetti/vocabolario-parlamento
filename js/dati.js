/* Pagina dei dati scaricabili */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Dati" });
    G.piede();
    const el = document.getElementById("contenuto");
    return G.carica("scarica.json").then((F) => {
      const kb = (b) => (b > 1e6 ? G.num(b / 1e6, 1) + " MB" : G.num(b / 1e3) + " KB");
      const conteggi = F.filter((f) => /^conteggi_/.test(f[0]));
      const altri = F.filter((f) => !/^conteggi_/.test(f[0]));
      el.innerHTML = `<h1 class="titolo-pagina">I conteggi si possono scaricare</h1>
        <p class="sommario">Le tabelle da cui nascono i grafici del sito: le parole per anno, la mappa dei partiti, l'elenco degli esperimenti con verdetti e numeri. Sotto ogni grafico c'è anche la sua tabella. Sono file CSV in UTF-8, con la virgola come separatore.</p>
        <p class="piccolo grigio">I testi dei resoconti non sono qui: stanno nell'archivio IPSA della Fondazione Bruno Kessler (licenza CC BY 3.0). Il vocabolario di base dell'italiano usato per alcune misure non si può ripubblicare.</p>
        <section class="griglia">
          <div class="c8"><h2 class="titolo-medio">Tabelle</h2><div class="tab-scorre"><table class="fitta"><thead><tr><th>file</th><th>che cosa c'è</th><th class="n">righe</th><th class="n">peso</th></tr></thead><tbody>
            ${altri.map((f) => `<tr><td><a href="scarica/${f[0]}" download><code>${G.esc(f[0])}</code></a></td><td>${G.esc(f[3])}</td><td class="n">${G.num(f[2])}</td><td class="n">${kb(f[1])}</td></tr>`).join("")}
          </tbody></table></div>
          <h2 class="titolo-medio" style="margin-top:28px">Conteggi per parola e anno</h2><p>Le volte di ognuna delle ${G.num(G.conti.parole)} parole, anno per anno, alla Camera e al Senato: una riga per parola e ramo, una colonna per anno dal 1848 al 2022. Per avere le volte per milione si divide per il file dei denominatori. Le parole sono in ordine alfabetico, mille per file.</p>
          <div class="tab-scorre"><table class="fitta"><tbody>${conteggi.map((f) => `<tr><td><a href="scarica/${f[0]}" download><code>${G.esc(f[0])}</code></a></td><td>${G.esc(f[3])}</td><td class="n">${kb(f[1])}</td></tr>`).join("")}</tbody></table></div></div>
          <aside class="c4 fil"><h3 class="titolo-piccolo">Da dove vengono</h3><ul class="fatti">
            <li><b>Testi dei resoconti</b><span class="et">raccolta IPSA, Fondazione Bruno Kessler, licenza CC BY 3.0</span></li>
            <li><b>Oratori e partiti della Camera</b><span class="et">ItaParlCorpus, licenza CC0</span></li>
            <li><b>Elenchi dei parlamentari</b><span class="et">dati.camera.it (CC BY), dati.senato.it (CC BY 3.0), Wikidata (CC0)</span></li>
            <li><b>Governi</b><span class="et">ParlGov, licenza CC BY-SA</span></li>
            <li><b>Il sito</b><span class="et">solo conteggi, misure e frasi brevi; nessun testo completo dei resoconti</span></li></ul>
            <h3 class="titolo-piccolo" style="margin-top:18px">I due working paper</h3><p><a class="lk" href="paper.html">Pagina dei paper</a>: i PDF sono in preparazione.</p></aside>
        </section>`;
    });
  });
})();
