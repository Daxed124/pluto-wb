# Optimización y limpieza de Pluto.WB

Para el estilo, las características y el análisis general de la app, ver [DISENO.md](DISENO.md).

Revisión del 1 de octubre de 2026. El objetivo era quitar código basura y hacer la app más ligera sin perder ninguna función ni cambiar nada de lo que se ve.

## Resumen

| Qué | Antes | Después |
|---|---|---|
| Tiempo de la app al escribir cada tecla (mediana / peor caso) | 27 ms / 43 ms | 8.6 ms / 13 ms |
| Clases de CSS sin usar | 1 (`.nowrap`) | 0 |
| Reglas de CSS duplicadas | 2 | 0 |
| Bloques de código repetidos (casillas de resumen) | 3 copias | 1 función (`tilesHTML`) |
| Variables o funciones sin usar (ESLint) | 0 | 0 |
| Desbordes horizontales a 320, 768 y 1280 px | 0 | 0 |

Los tiempos se midieron en una computadora de escritorio con los datos de ejemplo de la versión personal. En un celular económico pueden ser 3 o 4 veces mayores, por eso importa la mejora: antes podían pasar de 100 ms por tecla, lo que ya se siente lento.

## Cambios

1. **Solo se dibuja la pestaña que se ve.** Antes, cada tecla recalculaba y redibujaba las 7 pestañas, incluidas gráficas y simulaciones de hasta 50 años. Ahora `renderOutputs()` marca todas las pestañas como pendientes y solo dibuja la visible. `mostrarTab()` dibuja la que se abre si estaba pendiente. El resultado en pantalla es idéntico.
2. **Casillas de resumen con una sola función.** `tilesHTML()` reemplaza tres copias del mismo HTML en Resumen, Préstamos y Registro diario.
3. **CSS sin basura.** Se quitó `.nowrap`, que dejó de usarse cuando las fechas de la revisión de estados de cuenta se volvieron editables. Se juntaron en una sola regla las dos de `.card-ed` y el fondo duplicado de `.tcard-chip`.
4. **Precarga de la tipografía principal.** Las páginas piden Archivo antes de leer el CSS, así el título no parpadea al cargar.
5. **Banda del encabezado.** Pasó de 22 a 40 px de alto y está animada. Dibuja unos 30 cuadros por segundo, se pausa sola cuando la pestaña no se ve y queda quieta si el sistema pide reducir movimiento.
6. **Nombre nuevo: Pluto.WB.** Se cambió en los títulos, el logotipo, el candado, el aviso de privacidad, los archivos descargados y el calendario. Las claves internas donde se guardan los datos (`cuentas-claras.*` en el navegador y `cuentas-claras*.json` en Drive) **no se cambiaron a propósito**: así nadie pierde sus datos ni la sincronización.

## Herramientas evaluadas

| Herramienta | Para qué sirve | Decisión |
|---|---|---|
| **ESLint 10** | Encuentra variables y funciones sin usar, referencias rotas y código inalcanzable | **Se adoptó** como revisión, sin instalarlo en el proyecto: se corre con `npx`. Configuración en `herramientas/eslint.config.mjs` |
| **Script propio de CSS** (`herramientas/revisar-css.js`) | Encuentra clases e ids del CSS que no usa el código, y reglas duplicadas | **Se adoptó.** PurgeCSS hace algo parecido, pero borra el CSS automáticamente; con clases que se arman en JavaScript eso es riesgoso, así que se prefirió solo detectar y decidir a mano |
| **Script de pantallas** (`herramientas/revisar-pantallas.js`) | Recorre todas las pestañas y avisa si algo se sale de la pantalla | **Se adoptó.** Se pega en la consola del navegador |
| **esbuild** (minificador) | Reduce el tamaño de `app.js` y `app.css` | **No por ahora.** Ahorraría unos 9 KB comprimidos de 192 KB de la primera carga (alrededor del 5%), y obligaría a compilar antes de cada publicación. Si la app crece mucho, conviene hacerlo con una GitHub Action |
| **Lighthouse** (Chrome) | Auditoría de rendimiento, accesibilidad y buenas prácticas | **Recomendado** para revisar el sitio ya publicado: en Chrome, F12, pestaña Lighthouse |
| **React, Vue, Svelte u otro framework de interfaz** | Organizar apps grandes | **No.** Agregaría peso y obligaría a reescribir todo, sin una mejora visible para quien la usa. La app ya carga en 192 KB comprimidos, sin depender de ningún servidor externo |

Ya estaban optimizados desde antes:
- El lector de PDF (1.7 MB) y el de fotos (6 MB) **solo se cargan cuando alguien sube un estado de cuenta**, nunca al abrir la app.
- GitHub Pages comprime los archivos automáticamente.
- Las tipografías solo descargan los caracteres que se usan.

## Cómo repetir la revisión

Desde la carpeta del proyecto:

```bash
npx -y eslint@10 -c herramientas/eslint.config.mjs assets/app.js config.js
```

```bash
node herramientas/revisar-css.js .
```

Para la adaptación a pantallas, abre la app, pon la ventana en 320, 768 y 1280 px de ancho (en Chrome: F12 y el botón de dispositivo), y pega `herramientas/revisar-pantallas.js` en la consola.

Para medir el tiempo por tecla, en la consola de la pestaña Tarjetas:

```js
const i = document.querySelector('[data-k="saldo"]'), t = [];
for (let n = 0; n < 10; n++) { i.value = 30000 + n; const a = performance.now(); i.dispatchEvent(new Event('input', { bubbles:true })); t.push(performance.now() - a); }
console.log('mediana ms:', t.sort((a, b) => a - b)[5].toFixed(1));
```

Después de cambiar `assets/app.js` o `assets/app.css`, sube el número `?v=` en `index.html`, `personal/index.html` y `privacidad.html`.
