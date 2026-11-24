/* Indice dei partiti */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: "Partiti" });
    G.piede();
    const el = document.getElementById("contenuto");
    return Promise.all([G.carica("partiti/indice.json"), G.carica("partiti/distanze.json")]).then(([IX, DI]) => {
      const P = IX.partiti;
      el.innerHTML = `<h1 class="titolo-pagina" style="font-size:clamp(48px,7vw,96px)">${P.length} partiti, ${G.num(G.conti.schede_partito)} schede: a chi somiglia ognuno, legislatura per legislatura</h1>
        <p class="sommario">Ogni partito è misurato sulle parole che usa alla Camera, dal 1948 al 2022: dove sta tra sinistra e destra, a quale altro partito somiglia, quali parole guadagna e quali perde a ogni legislatura, come cambia quando passa dal governo all'opposizione.</p>
        <p class="piccolo grigio">«Parole guadagnate e perse» sono misurate rispetto al resto dell'aula: una parola può risultare persa anche se il partito la dice quanto prima, quando gli altri la dicono di più. La quota di parole non somma a cento perché mancano i gruppi minori.</p>
        <section class="sezione"><div class="testa"><h2>A chi somiglia la lingua di ogni partito</h2></div>
          <ul class="frasi-griglia" id="frasi-griglia"></ul>
          <p class="sotto-titolo">In ogni casella il partito di un'altra famiglia che parla più simile, con la legislatura in cui lo fa e la vicinanza: 0 vuol dire nessuna somiglianza; intorno a 1 è la vicinanza tipica di un partito con sé stesso nella legislatura dopo. Il colore è quello della famiglia del partito nella casella. Camera, 1948-2022; tocca una casella per i partiti più simili e quelli più lontani.</p>
          <div id="g-griglia"></div>
          <p class="fig-fonte">Fonte: resoconti stenografici di Camera e Senato. La somiglianza confronta le parole che ogni partito usa più o meno del resto dell'aula nella sua legislatura; si cercano i cinque più simili in tutte le legislature, esclusa la propria famiglia. Viene dalle parole, non dai voti.</p></section>
        <section class="sezione"><div id="g-linee"></div></section>
        <section class="sezione"><div class="testa"><h2>Tutti i partiti</h2></div><div class="tab-scorre" id="tab"></div></section>`;
      Promise.all([G.griglia("#g-griglia"), G.carica("partiti/traiettorie.json").catch(() => null)]).then(([D, TR]) => { if (D) { document.getElementById("frasi-griglia").innerHTML = G.frasiGriglia(D).map((f) => `<li>${f}</li>`).join(""); dettaglioGriglia(D, TR); } });
      /* Clic (o Invio) su una casella della griglia: sotto la tabella, a sinistra i cinque partiti più simili di quella riga in
         quella legislatura, con la loro legislatura e la vicinanza (campo «somiglianze.altro_partito» della scheda partito, gli
         stessi dati della casella: nessun conto nuovo; quelli della stessa famiglia restano, in grigio, perché la tabella li salta);
         a destra i tre più lontani nella stessa legislatura: la distanza sulla mappa delle parole (partiti/traiettorie.json),
         la stessa misura dei «tre più lontani» della scheda partito, qui legislatura per legislatura, esclusa la propria famiglia. */
      function dettaglioGriglia(D, TR) {
        const box = document.getElementById("g-griglia"), tab = box.querySelector("table.griglia-somiglia");
        if (!tab) return;
        const legs = d3.range(1, 19), numDa = {};
        legs.forEach((L) => { numDa[G.romano(L)] = L; });
        const bello = (p) => p.replace("Unita'", "Unità").split("/").join("-");
        const anniDi = (r) => { const L = numDa[r]; return L && D.anni[L] ? ` <span class="nobr">(${D.anni[L][0]}-${D.anni[L][1]})</span>` : ""; };
        const coloreDi = (p) => G.FAMIGLIA[D.fam[p] || "altri"] || G.FAMIGLIA.altri;
        const linkP = (p) => (D.slug[p] ? `<a href="partito.html?id=${encodeURIComponent(p)}">${G.esc(bello(p))}</a>` : G.esc(bello(p)));
        // posizioni sulla mappa per legislatura e distanza massima tra due partiti in una stessa legislatura (scala delle barre)
        const pos = {};
        let dMax = 0;
        if (TR && TR.partiti) {
          Object.entries(TR.partiti).forEach(([n, v]) => v.forEach((r) => { (pos[r[0]] = pos[r[0]] || []).push([n, r[2], r[3]]); }));
          Object.values(pos).forEach((ps) => ps.forEach((p) => ps.forEach((q) => { dMax = Math.max(dMax, Math.hypot(p[1] - q[1], p[2] - q[2])); })));
        }
        const lontani = (ids, L) => {
          const ps = pos[L] || [], io = ps.find((p) => ids.indexOf(p[0]) >= 0);
          if (!io) return [];
          return ps.filter((p) => p[0] !== io[0] && !D.stessa(io[0], p[0])).map((p) => [p[0], Math.hypot(p[1] - io[1], p[2] - io[2])]).sort((a, b) => b[1] - a[1]).slice(0, 3);
        };
        const pan = document.createElement("div");
        pan.className = "griglia-dettaglio"; pan.id = "griglia-dettaglio"; pan.setAttribute("aria-live", "polite"); pan.hidden = true;
        tab.closest(".griglia-scorre").after(pan);
        let scelta = null;
        const chiudi = () => { pan.hidden = true; if (scelta) scelta.classList.remove("scelta"); scelta = null; };
        const riga = (k, c, chi, w, val, cl) => `<li${cl ? ` class="${cl}"` : ""}><span class="pos">${k}</span><span class="chi">${G.quadro(c)}${chi}</span><span class="barra"><i style="width:${(w * 100).toFixed(1)}%;background:${c}"></i></span><span class="val">${val}</span></li>`;
        const apri = (td, ids, L) => {
          const id = ids.find((x) => D.S[x] && (D.S[x].somiglianze || {})[String(L)]);
          const so = id && D.S[id].somiglianze[String(L)];
          if (!so) return;
          if (scelta === td && !pan.hidden) { chiudi(); return; }
          if (scelta) scelta.classList.remove("scelta");
          scelta = td; td.classList.add("scelta");
          const lista = so.altro_partito || [], max = Math.max(1.5, ...lista.map((q) => q[2]));
          const se = (so.altra_leg || []).find((q) => q[0] === id);
          const simili = lista.map((q, k) => {
            const stessa = D.stessa(id, q[0]), c = stessa ? G.GDATI : coloreDi(q[0]);
            return riga(k + 1, c, `<b>${linkP(q[0])}</b> nella ${q[1]} legislatura${anniDi(q[1])}${stessa ? " <i>stessa famiglia: la tabella lo salta</i>" : ""}`, q[2] / max, G.num(q[2], 2), stessa ? "stessa" : "");
          }).join("");
          const lo = dMax ? lontani(ids, L) : [];
          const lont = lo.map((q, k) => riga(k + 1, coloreDi(q[0]), `<b>${linkP(q[0])}</b>`, q[1] / dMax, G.num((q[1] / dMax) * 100, 0))).join("");
          const leg = `${G.romano(L)} legislatura${anniDi(G.romano(L))}`;
          pan.innerHTML = `<div class="testa-dett"><p><b>${G.esc(bello(id))} nella ${leg}</b></p><button type="button" class="chiudi" aria-label="Chiudi">×</button></div>
            <div class="due-liste"><div><h4 class="rubrica">Parla come…</h4><ol class="simili">${simili}</ol>
              <p class="nota-dett">I cinque più simili tra gli altri partiti, in qualunque legislatura; il numero è la vicinanza. ${se ? `Per confronto, ${G.esc(bello(id))} con sé stesso: ${G.num(se[2], 2)} con la ${se[1]} legislatura${anniDi(se[1])}.` : "Intorno a 1 è la vicinanza tipica di un partito con sé stesso nella legislatura dopo."}</p></div>
            ${lo.length ? `<div><h4 class="rubrica">I più lontani, nella stessa legislatura</h4><ol class="simili lontani">${lont}</ol>
              <p class="nota-dett">I tre partiti di altre famiglie più distanti sulla mappa delle parole nella ${G.romano(L)} legislatura; il numero è la distanza, 100 è la più grande trovata tra due partiti in una stessa legislatura. Le due misure non si confrontano tra loro.</p></div>` : ""}</div>`;
          pan.hidden = false;
          pan.querySelector(".chiudi").addEventListener("click", () => { const t = scelta; chiudi(); if (t) t.focus(); });
          if (pan.getBoundingClientRect().bottom > window.innerHeight) pan.scrollIntoView({ behavior: "smooth", block: "nearest" });
        };
        tab.querySelectorAll("tbody tr").forEach((tr, i) => {
          const rg = G.RIGHE_GRIGLIA[i];
          if (!rg) return;
          tr.querySelectorAll("td").forEach((td, j) => {
            const L = legs[j];
            if (td.classList.contains("vuota") || L == null) return;
            td.classList.add("apribile"); td.tabIndex = 0; td.setAttribute("role", "button");
            td.setAttribute("aria-label", `${rg[0]}, ${G.romano(L)} legislatura: i partiti più simili e più lontani`);
            td.addEventListener("click", (e) => { if (e.target.closest("a")) return; apri(td, rg[1], L); });
            td.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(td, rg[1], L); } });
          });
        });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pan.hidden) chiudi(); });
      }
      // Tav. I: la distanza tra le parole di PCI e DC anno per anno, con DC e PSI come confronto (dati in partiti/distanze.json)
      const S = DI.serie, dcpci = S.find((s) => s.coppia === "DC-PCI"), dcpsi = S.find((s) => s.coppia === "DC-PSI");
      const ultimo = (s) => s.punti.filter((p) => p[1] != null).slice(-1)[0][0];
      const area = G.figura("#g-linee", {
        titolo: `Con il compromesso storico la distanza tra le parole di PCI e DC si dimezza, da 100 a ${G.num(DI.legislature["7"][0], 0)}: ma il PCI resta sempre più lontano dalla DC dei socialisti`,
        sotto: `Quanto si distinguono dalle parole i deputati di due partiti, alla Camera, ${dcpci.punti[0][0]}-${Math.max(ultimo(dcpci), ultimo(dcpsi))}. 0 vuol dire che usano le stesse parole e non si capisce chi è dell'uno o dell'altro; 100 è la distanza tra DC e PCI negli anni della guerra fredda (1953-68). Ogni punto è la media di tre anni; sotto lo zero vuol dire che non si distinguono affatto. Le bande segnano due fasi del PCI. Nel 1962-63, alla vigilia del primo governo con i socialisti, DC e PSI erano a ${G.num(DI.dc_psi_1962_63, 0)}.`,
        limite: "La distanza viene dalle 5.000 parole più comuni, non dai voti; il valore di ogni singolo anno è nei dati del grafico. Negli anni delle elezioni conta la parte con più deputati. Nel 1969-71 socialisti e socialdemocratici sono un partito solo: la coppia DC e PSI manca. Nel 1979 e nel 1987 cambia il modo di trascrivere i resoconti. La DC finisce nel 1994: per DS e PD non c'è un confronto uguale. Al Senato il dimezzamento non si vede: DC e PCI si avvicinano piano dal 1968-72, senza un punto più basso nel 1976-79 (lettura con etichette di partito meno complete che alla Camera).",
        csv: () => [["coppia", "anno", "distanza_media_tre_anni", "distanza_anno", "oratori_DC", "oratori_altro_partito", "distinguibilita_corretta"]].concat(...S.map((s) => s.punti.map((p) => [s.coppia, p[0], p[2], p[1], p[3], p[4], p[5]]))),
        nomeCSV: "distanza_pci_dc",
      });
      G.grafico(area, (a, w) => {
        const stretto = w < 560, m3 = (s) => s.punti.map((p) => [p[0], p[2]]);
        const fasi = [[1976.5, 1979.1, "compromesso storico"], [1989.9, 1991.1, "svolta: PCI → PDS"]];
        G.linee(a, w, {
          x: [1948, 1993], y: [-12, 135], yTicks: [0, 50, 100], yFmt: (v) => G.num(v, 0), h: stretto ? 280 : 360, m: { r: stretto ? 74 : 110, t: stretto ? 40 : 30 },
          etichSopra: false, legenda: false, xPasso: stretto ? 10 : 5, unitaLettura: "media di tre anni",
          fasce: fasi.map((f) => ({ da: f[0], a: f[1] })),
          serie: [{ punti: m3(dcpsi), colore: G.FAMIGLIA.PSI, sp: 1.5, etich: "PSI e DC" }, { punti: m3(dcpci), colore: G.ROSSO, sp: 2.5, etich: "PCI e DC" }],
          dopo: (svg, x, y, h, m) => {
            // i nomi delle fasi sopra il disegno; al telefono su due righe, ognuno finisce dove finisce la sua banda
            fasi.forEach((f, k) => {
              const xt = stretto ? x(f[1]) : x(f[0]), riga = stretto ? k * 15 : 0;
              svg.append("text").attr("x", xt).attr("y", m.t - 6 - riga).attr("text-anchor", stretto ? "end" : "start").attr("class", "nota-t").attr("font-weight", 700).text(f[2]);
              svg.append("line").attr("x1", xt).attr("x2", xt).attr("y1", m.t - 18 - riga).attr("y2", m.t).attr("stroke", G.GRIGIO).attr("stroke-width", 1);
            });
            // il punto di riferimento: DC e PSI nel 1963, quando il PSI entra al governo (contesto storico, non dato del progetto)
            const p63 = dcpsi.punti.find((p) => p[0] === 1963);
            if (p63 && p63[2] != null) {
              svg.append("circle").attr("cx", x(1963)).attr("cy", y(p63[2])).attr("r", 3.5).attr("fill", G.FAMIGLIA.PSI).attr("stroke", "#fff").attr("stroke-width", 1.5);
              G.nota(svg, x(1963), y(p63[2]), x(1963), y(p63[2]) + 34, "1963: il PSI entra al governo", { maxch: stretto ? 18 : 40, anchor: stretto ? "end" : "start" });
            }
          },
        });
      });
      const R = (n) => G.romano(n);
      G.tabella(document.getElementById("tab"), [
        { t: "partito", k: "nome", fmt: (p) => G.lPartito(p.id, p.nome) },
        { t: "famiglia", k: "famiglia" },
        { t: "legislature", k: "legs", fmt: (p) => p.legs.map((l) => `<a href="legislatura.html?id=repubblica-${l}">${R(l)}</a>`).join(" "), v: (p) => p.legs[0] },
        { t: "anni", k: "da", n: true, fmt: (p) => p.da + "-" + Math.min(2022, p.a) },
        { t: "quota massima delle parole", k: "quota_max", n: true, fmt: (p) => G.pct(p.quota_max) },
      ], P);
    });
  });
})();
