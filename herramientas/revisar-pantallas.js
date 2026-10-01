/* Revisión de adaptación a pantallas de Pluto.WB.
   Cómo usarlo: abre la app, ajusta el ancho de la ventana (o usa el modo dispositivo de
   las herramientas de desarrollo con 320, 768 y 1280 px), pega este archivo en la consola y
   presiona Enter. Recorre todas las pestañas y avisa si algo se sale de la pantalla
   fuera de las zonas que tienen su propio desplazamiento (tablas y cartera). */
(async () => {
  const desc = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const dentroDeScroll = el => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') return true;
    }
    return false;
  };
  const problemas = [];
  for (const tab of document.querySelectorAll('[role=tab]')) {
    tab.click();
    await new Promise(r => setTimeout(r, 250));
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    const fuera = [...panel.querySelectorAll('*'), ...document.querySelectorAll('header *, footer *')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !dentroDeScroll(el);
    });
    if (document.documentElement.scrollWidth > innerWidth || fuera.length) {
      problemas.push({ pestaña: tab.textContent, elementos: [...new Set(fuera.map(desc))].slice(0, 5).join(', ') });
    }
  }
  document.querySelector('[role=tab]').click();
  console.log(`Ancho ${innerWidth}px: ` + (problemas.length ? 'hay desbordes' : 'sin desbordes'));
  if (problemas.length) console.table(problemas);
})();
