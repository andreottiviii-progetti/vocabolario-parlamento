/* Pagine di solo testo: testata e piede */
(function () {
  "use strict";
  G.avvia(function () {
    G.testata({ attivo: document.body.dataset.attivo || (location.pathname.indexOf("paper") >= 0 ? "Paper" : "") });
    G.piede();
  });
})();
