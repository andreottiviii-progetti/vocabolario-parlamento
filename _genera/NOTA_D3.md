# js/d3.min.js: d3 7.9.0 ridotto ai soli moduli usati dal sito

Il file non è più d3 intero (280 KB, 92 KB compressi) ma un pacchetto con i soli pezzi che i file `js/*.js` chiamano
(82 KB, 26 KB compressi). La versione è quella di prima (d3 7.9.0); i moduli interni sono quelli che npm risolve per d3@7.9.0:
d3-array 3.2.5, d3-selection 3.0.1, d3-shape 3.2.1, d3-scale 4.0.3, d3-interpolate 3.0.2, d3-color 3.1.1, d3-transition 3.0.2
(correzioni di patch rispetto a quelle dentro il vecchio file). Resta il nome globale `d3`.

## Nomi d3.* usati dal sito (verificati con grep su js/*.js e *.html)
scaleLinear, scaleBand, scaleSqrt, scaleLog, max, min, range, extent, mean, maxIndex, select, pointer, line, area,
curveMonotoneX, rgb, interpolateRgb. In più `selection.transition().duration()` (js/scene.js): serve d3-transition.
Arrivano da sé, come dipendenze, i metodi dei grafici (ticks, tickFormat, nice, clamp, invert, bandwidth, paddingInner,
round, step, defined, curve, y0/y1...). NON ci sono: d3.format, d3.axis*, d3.scaleTime, d3.timeFormat, d3.zoom, d3.drag...
Se un giorno un file js usa un nome nuovo, va aggiunto qui sotto e il file rifatto, altrimenti la pagina si rompe.

## Come rifarlo (cartella di appoggio FUORI dal sito, es. D:\appoggio-d3; nel sito niente node_modules né package.json)
```
cd D:\appoggio-d3
npm install --save-exact d3@7.9.0 esbuild      (una volta sola)
node costruisci.mjs                            (scrive uscita/d3.min.js; poi copiarlo in js/d3.min.js)
```
`entrata.js`:
```
import "d3-transition"; // aggiunge selection.transition() (usato da js/scene.js)
export { max, min, range, extent, mean, maxIndex } from "d3-array";
export { select, pointer } from "d3-selection";
export { line, area, curveMonotoneX } from "d3-shape";
export { scaleLinear, scaleBand, scaleSqrt, scaleLog } from "d3-scale";
export { rgb } from "d3-color";
export { interpolateRgb } from "d3-interpolate";
```
`costruisci.mjs`:
```
import { build } from "esbuild";
await build({
  entryPoints: ["entrata.js"], bundle: true, minify: true, format: "iife", globalName: "d3",
  target: "es2018", legalComments: "none", outfile: "uscita/d3.min.js",
  banner: { js: "// d3 v7.9.0 ridotto ai moduli usati dal sito (https://d3js.org, Copyright 2010-2023 Mike Bostock, licenza ISC). Elenco e comando per rifarlo: _genera/NOTA_D3.md" },
});
```
Node: qualsiasi versione recente (provato con Node 26).
