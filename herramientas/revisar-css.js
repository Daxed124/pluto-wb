// Busca clases e ids del CSS que no aparecen en el código ni en las páginas.
const fs = require('fs'), path = require('path');
const raiz = process.argv[2];
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const css = leer('assets/app.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\{[^}]*\}/g, '');
const fuentes = ['assets/app.js', 'index.html', 'personal/index.html', 'privacidad.html'].map(leer).join('\n');
const palabras = new Set(fuentes.split(/[^\w-]+/));
const clases = [...new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]))];
console.log('Clases en el CSS:', clases.length);
console.log('Clases que no aparecen en ningún lado:', clases.filter(c => !palabras.has(c)).join(', ') || 'ninguna');
const ids = [...new Set([...css.matchAll(/#([a-zA-Z][\w-]*)/g)].map(m => m[1]))].filter(i => !/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(i));
console.log('Ids que no aparecen:', ids.filter(i => !palabras.has(i)).join(', ') || 'ninguno');
const sel = [...css.matchAll(/(^|\})\s*([^{}@]+?)\s*\{/g)].map(m => m[2].trim());
const rep = [...new Set(sel.filter((r, i) => sel.indexOf(r) !== i))];
console.log('Selectores escritos más de una vez (fuera de @media):', rep.join(' | ') || 'ninguno');
