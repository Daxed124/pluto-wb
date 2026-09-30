/* Cuentas Claras — código compartido por la versión pública (index.html)
   y la personal (personal/index.html). La personal activa con window.CC_EDICION = 'personal':
   registro diario, meses sin intereses, fechas de pago y préstamos. */
(function () {
'use strict';

/* ================= configuración ================= */
const PERSONAL = window.CC_EDICION === 'personal';
const CFG = window.CC_CONFIG || {};
const CLIENT_ID = String(CFG.googleClientId || '').trim();
const DRIVE_OK = /\.apps\.googleusercontent\.com$/.test(CLIENT_ID);
const PREFIJO = PERSONAL ? 'cuentas-claras.personal' : 'cuentas-claras';
const LS_KEY = PREFIJO + '.v1', LS_TAB = PREFIJO + '.tab', LS_DRIVE = PREFIJO + '.drive';
const LS_RESPALDO = PREFIJO + '.respaldo', LS_CAT = PREFIJO + '.ultima-cat';
const ARCHIVO = PERSONAL ? 'cuentas-claras-personal.json' : 'cuentas-claras.json';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/* ================= utilidades ================= */
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const byId = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const num = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
const uid = () => Math.random().toString(36).slice(2, 10);
const plural = (n, s, p) => n + ' ' + (n === 1 ? s : p);
const pad2 = n => String(n).padStart(2, '0');
function hoy(){ const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
const isoDia = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const ymDe = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1);
const esYM = v => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const esISO = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
function ymAdd(ym, n){ const p = ym.split('-').map(Number); return ymDe(new Date(p[0], p[1] - 1 + n, 1)); }
function ymDiff(a, b){ const x = a.split('-').map(Number), y = b.split('-').map(Number); return (y[0] - x[0]) * 12 + (y[1] - x[1]); }
function parseISO(s){ const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
const diasMes = (y, m) => new Date(y, m + 1, 0).getDate();
const limpia = s => s.replace(/\./g, '').replace(/,/g, '').replace(/\sde\s/g, ' ');
const fechaCorta = d => limpia(d.toLocaleDateString('es-MX', { day:'numeric', month:'short' }));
const mesCorto = d => limpia(d.toLocaleDateString('es-MX', { month:'short' }));
function ymTxt(ym){ const p = ym.split('-').map(Number); return limpia(new Date(p[0], p[1] - 1, 1).toLocaleDateString('es-MX', { month:'long', year:'numeric' })); }
function ymCorto(ym){ const p = ym.split('-').map(Number); return limpia(new Date(p[0], p[1] - 1, 1).toLocaleDateString('es-MX', { month:'short' })); }
const diaTxt = iso => limpia(parseISO(iso).toLocaleDateString('es-MX', { weekday:'short', day:'numeric', month:'short' }));
function fecha(n){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return limpia(d.toLocaleDateString('es-MX', { month:'short', year:'numeric' })); }

const CATS = ['Vivienda','Comida','Transporte','Servicios','Salud','Educación','Deudas y préstamos','Entretenimiento','Ropa y cuidado personal','Ahorro e inversión','Otros'];
const FRECS = { mensual:['Mensual', 1], quincenal:['Quincenal', 2], semanal:['Semanal', 52 / 12], anual:['Anual', 1 / 12] };
const TIPOS = { personal:'Personal', auto:'Automotriz', nomina:'Nómina', hipoteca:'Hipotecario', otro:'Otro' };
// f: escala de los montos de ejemplo respecto a pesos mexicanos. Solo sirve para que el ejemplo se vea razonable.
const PAISES = {
  MX:{ n:'México', moneda:'MXN', iva:16, f:1, tasas:[54, 72, 38] },
  CO:{ n:'Colombia', moneda:'COP', iva:0, f:220, tasas:[28, 31, 25] },
  AR:{ n:'Argentina', moneda:'ARS', iva:0, f:60, tasas:[70, 85, 60] },
  CL:{ n:'Chile', moneda:'CLP', iva:0, f:50, tasas:[30, 36, 24] },
  PE:{ n:'Perú', moneda:'PEN', iva:0, f:0.2, tasas:[60, 80, 45] },
  EC:{ n:'Ecuador', moneda:'USD', iva:0, f:0.055, tasas:[16, 17, 15] },
  GT:{ n:'Guatemala', moneda:'GTQ', iva:0, f:0.42, tasas:[36, 48, 30] },
  DO:{ n:'República Dominicana', moneda:'DOP', iva:0, f:3.3, tasas:[48, 60, 40] },
  US:{ n:'Estados Unidos', moneda:'USD', iva:0, f:0.055, tasas:[24, 29, 21] },
  ES:{ n:'España', moneda:'EUR', iva:0, f:0.05, tasas:[20, 24, 18] },
  OT:{ n:'Otro país (dólares)', moneda:'USD', iva:0, f:0.055, tasas:[30, 40, 25] }
};

/* ================= datos ================= */
function paisDetectado(){
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
  for (const l of langs) { const m = /^(es|en)-([A-Za-z]{2})$/.exec(l || ''); if (m && PAISES[m[2].toUpperCase()]) return m[2].toUpperCase(); }
  return 'MX';
}
function redondo(x){
  if (x < 10) return Math.round(x * 100) / 100;
  if (x < 100) return Math.round(x);
  const p = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / p) * p;
}
function nuevaTarjeta(nombre){
  return { id:uid(), nombre:nombre || 'Nueva tarjeta', saldo:0, tasa:0, limite:0, minTipo:'int', minPct:1.5, minFijo:200, pago:0, diaCorte:0, diaPago:0, pagadoHasta:'', msi:[] };
}
function nuevoPrestamo(){
  return { id:uid(), nombre:'Nuevo préstamo', tipo:'personal', saldo:0, tasa:0, pago:0, extra:0, diaPago:0, conIva:true, pagadoHasta:'' };
}
function ejemplo(pais){
  pais = PERSONAL ? 'MX' : (PAISES[pais] ? pais : 'MX');
  const P = PAISES[pais], f = v => redondo(v * P.f), t = P.tasas, ym = ymDe(hoy());
  const tarjetas = [
    { id:uid(), nombre:'Tarjeta clásica', saldo:f(28400), tasa:t[0], limite:f(40000), minTipo:'int', minPct:1.5, minFijo:f(200), pago:f(2500), diaCorte:3, diaPago:23, pagadoHasta:'', msi:[] },
    { id:uid(), nombre:'Tarjeta de tienda departamental', saldo:f(6900), tasa:t[1], limite:f(10000), minTipo:'int', minPct:1.5, minFijo:f(200), pago:f(800), diaCorte:12, diaPago:2, pagadoHasta:'', msi:[] },
    { id:uid(), nombre:'Tarjeta digital', saldo:f(12300), tasa:t[2], limite:f(25000), minTipo:'int', minPct:1.5, minFijo:f(200), pago:f(1200), diaCorte:20, diaPago:10, pagadoHasta:'', msi:[] }
  ];
  const s = {
    v:2, ejemplo:true, pais, moneda:P.moneda, iva:P.iva, actualizado:null,
    ingresos:[
      { id:uid(), concepto:'Sueldo', frec:'quincenal', monto:f(PERSONAL ? 14000 : 9500) },
      { id:uid(), concepto:'Trabajos por fuera', frec:'mensual', monto:f(2500) }
    ],
    gastos:[
      { id:uid(), concepto:'Renta', cat:'Vivienda', frec:'mensual', monto:f(6500) },
      { id:uid(), concepto:'Súper y mercado', cat:'Comida', frec:'semanal', monto:f(950) },
      { id:uid(), concepto:'Luz, agua, gas e internet', cat:'Servicios', frec:'mensual', monto:f(1350) },
      { id:uid(), concepto:'Transporte y gasolina', cat:'Transporte', frec:'mensual', monto:f(1800) },
      { id:uid(), concepto:'Plan de celular', cat:'Servicios', frec:'mensual', monto:f(399) },
      { id:uid(), concepto:'Salidas y streaming', cat:'Entretenimiento', frec:'mensual', monto:f(1100) },
      { id:uid(), concepto:'Ahorro de emergencia', cat:'Ahorro e inversión', frec:'quincenal', monto:f(400) }
    ],
    tarjetas, prestamos:[], movimientos:[],
    plan:{ presupuesto:null, metodo:'avalancha' }
  };
  if (PERSONAL) {
    tarjetas[0].msi = [
      { id:uid(), desc:'Refrigerador', monto:12000, meses:12, inicio:ymAdd(ym, -4) },
      { id:uid(), desc:'Celular', monto:8400, meses:6, inicio:ymAdd(ym, -1) }
    ];
    tarjetas[2].msi = [{ id:uid(), desc:'Boletos de avión', monto:5400, meses:3, inicio:ym }];
    s.prestamos = [{ id:uid(), nombre:'Crédito de auto', tipo:'auto', saldo:148000, tasa:13.5, pago:5200, extra:0, diaPago:15, conIva:true, pagadoHasta:'' }];
    const d = hoy().getDate();
    const M = [[1,'Comida','Súper',1150,'debito'],[2,'Transporte','Gasolina',600,0],[4,'Entretenimiento','Cine',320,2],[5,'Comida','Comida en la calle',180,'efectivo'],[8,'Servicios','Internet',549,'debito'],[9,'Comida','Súper',980,0],[12,'Transporte','Uber',145,2],[15,'Vivienda','Renta',6500,'debito'],[16,'Salud','Farmacia',260,'efectivo'],[19,'Comida','Mercado',430,'efectivo'],[22,'Entretenimiento','Streaming',219,2],[24,'Transporte','Gasolina',650,0]];
    s.movimientos = M.filter(m => m[0] <= d).map(m => ({ id:uid(), fecha:ym + '-' + pad2(m[0]), cat:m[1], nota:m[2], monto:m[3], metodo:typeof m[4] === 'number' ? tarjetas[m[4]].id : m[4] }));
  }
  return s;
}
function enBlanco(prev){
  return {
    v:2, ejemplo:false, pais:(prev && prev.pais) || 'MX', moneda:(prev && prev.moneda) || 'MXN', iva:prev ? prev.iva : 0, actualizado:null,
    ingresos:[{ id:uid(), concepto:'Sueldo', frec:'mensual', monto:0 }],
    gastos:[{ id:uid(), concepto:'', cat:'Vivienda', frec:'mensual', monto:0 }],
    tarjetas:[nuevaTarjeta('Mi tarjeta')], prestamos:[], movimientos:[],
    plan:{ presupuesto:null, metodo:'avalancha' }
  };
}
function normalizar(s){
  if (!s || typeof s !== 'object') return null;
  const arr = a => Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : [];
  const n = v => Number(v) || 0;
  const str = v => String(v == null ? '' : v).slice(0, 200);
  const id = v => String(v || uid()).slice(0, 40);
  const dia = v => { const d = Math.round(Number(v) || 0); return d >= 1 && d <= 31 ? d : 0; };
  return {
    v:2, ejemplo:!!s.ejemplo,
    pais: PAISES[s.pais] ? s.pais : 'MX',
    moneda: typeof s.moneda === 'string' && /^[A-Z]{3}$/.test(s.moneda) ? s.moneda : 'MXN',
    iva: n(s.iva),
    actualizado: typeof s.actualizado === 'string' ? s.actualizado : null,
    ingresos: arr(s.ingresos).map(x => ({ id:id(x.id), concepto:str(x.concepto), frec:FRECS[x.frec] ? x.frec : 'mensual', monto:n(x.monto) })),
    gastos: arr(s.gastos).map(x => ({ id:id(x.id), concepto:str(x.concepto), cat:CATS.includes(x.cat) ? x.cat : 'Otros', frec:FRECS[x.frec] ? x.frec : 'mensual', monto:n(x.monto) })),
    tarjetas: arr(s.tarjetas).map(c => ({
      id:id(c.id), nombre:str(c.nombre), saldo:n(c.saldo), tasa:n(c.tasa), limite:n(c.limite),
      minTipo:c.minTipo === 'pct' ? 'pct' : 'int', minPct:c.minPct == null ? 1.5 : n(c.minPct), minFijo:c.minFijo == null ? 200 : n(c.minFijo),
      pago:n(c.pago), diaCorte:dia(c.diaCorte), diaPago:dia(c.diaPago), pagadoHasta:esISO(c.pagadoHasta) ? c.pagadoHasta : '',
      msi: arr(c.msi).map(p => ({ id:id(p.id), desc:str(p.desc), monto:n(p.monto), meses:Math.max(1, Math.round(n(p.meses)) || 1), inicio:typeof p.inicio === 'string' ? p.inicio.slice(0, 7) : ymDe(hoy()) }))
    })),
    prestamos: arr(s.prestamos).map(p => ({
      id:id(p.id), nombre:str(p.nombre), tipo:TIPOS[p.tipo] ? p.tipo : 'personal', saldo:n(p.saldo), tasa:n(p.tasa), pago:n(p.pago), extra:n(p.extra),
      diaPago:dia(p.diaPago), conIva:p.conIva !== false, pagadoHasta:esISO(p.pagadoHasta) ? p.pagadoHasta : ''
    })),
    movimientos: arr(s.movimientos).map(m => ({ id:id(m.id), fecha:esISO(m.fecha) ? m.fecha : isoDia(hoy()), monto:n(m.monto), cat:CATS.includes(m.cat) ? m.cat : 'Otros', nota:str(m.nota), metodo:typeof m.metodo === 'string' ? m.metodo.slice(0, 40) : 'efectivo', origen:m.origen === 'estado' ? 'estado' : undefined })),
    plan:{ presupuesto:s.plan && s.plan.presupuesto != null ? n(s.plan.presupuesto) : null, metodo:s.plan && s.plan.metodo === 'bola' ? 'bola' : 'avalancha' }
  };
}
const tiempo = s => (s && Date.parse(s.actualizado)) || 0;

/* ================= almacenamiento local ================= */
const local = {
  ok: (() => { try { localStorage.setItem('_cc', '1'); localStorage.removeItem('_cc'); return true; } catch (e) { return false; } })(),
  get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v){ try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k){ try { localStorage.removeItem(k); } catch (e) {} }
};
let state = (() => {
  try { const raw = local.get(LS_KEY); if (raw) { const s = normalizar(JSON.parse(raw)); if (s) return s; } } catch (e) {}
  return ejemplo(paisDetectado());
})();

/* ================= Google Drive ================= */
const drive = { estado: DRIVE_OK ? 'off' : 'sin-config', token:null, exp:0, client:null, fileId:null, mod:null, writing:false, pending:false, guardando:false };
let pendienteToken = null, saveT = null;

function cargarGIS(){
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
  document.head.appendChild(s);
}
const gisListo = () => !!(window.google && google.accounts && google.accounts.oauth2);
function esperarGIS(){
  return new Promise((ok, err) => {
    const t0 = Date.now();
    (function mira(){ if (gisListo()) ok(); else if (Date.now() - t0 > 8000) err({ tipo:'gis' }); else setTimeout(mira, 120); })();
  });
}
function tokenClient(){
  if (!drive.client) drive.client = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID, scope: SCOPE,
    callback: r => {
      const p = pendienteToken; pendienteToken = null; if (!p) return;
      if (r && r.access_token && google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) {
        drive.token = r.access_token; drive.exp = Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60000; p.ok();
      } else p.err({ tipo: r && r.access_token ? 'sin-permiso' : 'rechazado' });
    },
    error_callback: e => { const p = pendienteToken; pendienteToken = null; if (p) p.err({ tipo: (e && e.type) || 'rechazado' }); }
  });
  return drive.client;
}
// Se llama directo desde un clic para que el navegador permita la ventana de Google.
function pedirToken(){
  return new Promise((ok, err) => {
    const ir = () => { pendienteToken = { ok, err }; tokenClient().requestAccessToken({ prompt:'' }); };
    if (gisListo()) ir(); else esperarGIS().then(ir, err);
  });
}
const tokenValido = () => !!drive.token && Date.now() < drive.exp;
async function api(url, opts){
  opts = opts || {};
  const r = await fetch(url, Object.assign({}, opts, { headers:Object.assign({ Authorization:'Bearer ' + drive.token }, opts.headers || {}) }));
  if (!r.ok) throw { code:r.status };
  return r;
}
async function buscarArchivo(){
  const q = encodeURIComponent("name='" + ARCHIVO + "' and trashed=false");
  const r = await api('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=10&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)&q=' + q);
  const j = await r.json();
  return (j.files || [])[0] || null;
}
async function leerArchivo(id){ const r = await api('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media'); return r.json(); }
async function crearArchivo(json){
  const b = 'cc' + uid() + uid();
  const meta = { name:ARCHIVO, parents:['appDataFolder'], mimeType:'application/json' };
  const body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + b + '\r\nContent-Type: application/json\r\n\r\n' + json + '\r\n--' + b + '--';
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', { method:'POST', headers:{ 'Content-Type':'multipart/related; boundary=' + b }, body });
  return r.json();
}
async function actualizarArchivo(id, json){
  const r = await api('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media&fields=id,modifiedTime', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:json });
  return r.json();
}

async function conectarDrive(){
  if (!DRIVE_OK) { toast('Esta copia de la app todavía no tiene configurado Google Drive.'); return; }
  const antes = drive.estado === 'conectando' ? 'off' : drive.estado;
  drive.estado = 'conectando'; renderCuenta();
  try {
    await pedirToken();
    const f = await buscarArchivo();
    drive.estado = 'ok';
    if (f) {
      drive.fileId = f.id; drive.mod = f.modifiedTime;
      const rem = normalizar(await leerArchivo(f.id));
      if (rem && tiempo(rem) >= tiempo(state)) {
        if (tiempo(state) > 0) local.set(LS_RESPALDO, JSON.stringify(state));
        state = rem; local.set(LS_KEY, JSON.stringify(state)); sim.fuente = null;
        renderAll();
        toast('Listo. Cargamos tus datos guardados en Google Drive.');
      } else {
        if (rem) local.set(LS_RESPALDO, JSON.stringify(rem));
        await guardarAhora();
        toast(rem ? 'Guardamos en Drive los cambios más recientes de este dispositivo. La versión anterior quedó como respaldo.' : 'Listo. Tus datos se guardan en tu Google Drive.');
      }
    } else {
      await guardarAhora();
      toast('Listo. A partir de ahora tus datos se guardan en tu Google Drive.');
    }
    local.set(LS_DRIVE, '1');
  } catch (e) {
    const t = e && e.tipo;
    if (t === 'popup_closed' || t === 'rechazado') { drive.estado = antes; toast('No se conectó Google Drive. Puedes intentarlo cuando quieras.'); }
    else if (t === 'popup_failed_to_open') { drive.estado = antes; toast('Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes para este sitio e intenta de nuevo.'); }
    else if (t === 'sin-permiso') { drive.estado = antes; toast('Para guardar en Drive tienes que marcar la casilla de permiso en la ventana de Google.'); }
    else if (e && e.code === 401) { drive.estado = 'expirado'; }
    else { drive.estado = 'error'; toast('No pudimos conectar con Google Drive. Revisa tu internet e intenta de nuevo.'); }
  }
  renderCuenta();
}
async function guardarAhora(){
  const json = JSON.stringify(state);
  local.set(LS_KEY, json);
  if (drive.estado !== 'ok') { drive.guardando = false; renderCuenta(); return; }
  if (!tokenValido()) { drive.estado = 'expirado'; drive.guardando = false; renderCuenta(); return; }
  if (drive.writing) { drive.pending = true; return; }
  drive.writing = true; drive.guardando = true; renderCuenta();
  try {
    const r = drive.fileId ? await actualizarArchivo(drive.fileId, json) : await crearArchivo(json);
    drive.fileId = r.id || drive.fileId; drive.mod = r.modifiedTime || drive.mod;
  } catch (e) {
    if (e && e.code === 401) drive.estado = 'expirado';
    else if (e && e.code === 404) { drive.fileId = null; drive.pending = true; }
    else drive.estado = 'error';
  } finally {
    drive.writing = false;
    if (drive.pending && drive.estado === 'ok') { drive.pending = false; guardarAhora(); }
    else { drive.pending = false; drive.guardando = false; renderCuenta(); }
  }
}
async function revisarRemoto(){
  if (drive.estado !== 'ok' || !tokenValido() || drive.writing || saveT) return;
  try {
    const f = await buscarArchivo();
    if (!f || f.modifiedTime === drive.mod) return;
    drive.fileId = f.id; drive.mod = f.modifiedTime;
    const rem = normalizar(await leerArchivo(f.id));
    if (rem && tiempo(rem) > tiempo(state) && !saveT) {
      state = rem; local.set(LS_KEY, JSON.stringify(state)); renderAll();
      toast('Actualizamos tus datos con los cambios que hiciste en otro dispositivo.');
    }
  } catch (e) { if (e && e.code === 401) { drive.estado = 'expirado'; renderCuenta(); } }
}
function desconectarDrive(aviso){
  try { if (drive.token && gisListo()) google.accounts.oauth2.revoke(drive.token, () => {}); } catch (e) {}
  drive.token = null; drive.exp = 0; drive.fileId = null; drive.mod = null; drive.estado = 'off';
  local.del(LS_DRIVE); renderCuenta();
  if (aviso !== false) toast('Desconectaste Google Drive. Tus datos siguen en este navegador.');
}
async function borrarDeDrive(){
  if (drive.estado !== 'ok' || !tokenValido()) { toast('Primero conecta Google Drive para poder borrar tu archivo.'); return; }
  try {
    const f = drive.fileId ? { id:drive.fileId } : await buscarArchivo();
    if (f) await api('https://www.googleapis.com/drive/v3/files/' + f.id, { method:'DELETE' });
    desconectarDrive(false);
    toast('Borramos tus datos de Google Drive y desconectamos la app. Siguen en este navegador.');
  } catch (e) { toast('No pudimos borrar el archivo de Drive. Intenta de nuevo.'); }
}

function cambiado(){
  state.actualizado = new Date().toISOString();
  local.set(LS_KEY, JSON.stringify(state));
  if (drive.estado === 'ok') { drive.guardando = true; renderCuenta(); }
  clearTimeout(saveT);
  saveT = setTimeout(() => { saveT = null; guardarAhora(); }, 1200);
}
window.addEventListener('pagehide', () => { if (saveT) { clearTimeout(saveT); saveT = null; guardarAhora(); } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') revisarRemoto(); });

/* ================= formato ================= */
const fmtCache = new Map();
function nf(key, opts){
  if (!fmtCache.has(key)) {
    let f;
    try { f = new Intl.NumberFormat('es-MX', opts); }
    catch (e) {
      const o = Object.assign({}, opts); delete o.currencyDisplay;
      try { f = new Intl.NumberFormat('es-MX', o); } catch (e2) { f = new Intl.NumberFormat('es-MX', { maximumFractionDigits:2 }); }
    }
    fmtCache.set(key, f);
  }
  return fmtCache.get(key);
}
const cur = extra => Object.assign({ style:'currency', currency:state.moneda, currencyDisplay:'narrowSymbol' }, extra || {});
const m2 = x => nf('m2' + state.moneda, cur()).format(x || 0);
const m0 = x => nf('m0' + state.moneda, cur({ maximumFractionDigits:0, minimumFractionDigits:0 })).format(Math.round(x) || 0);
const mc = x => nf('mc' + state.moneda, cur({ notation:'compact', maximumFractionDigits:1 })).format(x || 0);
const pct = (x, d) => nf('p' + (d || 0), { style:'percent', maximumFractionDigits:d || 0 }).format(x || 0);
const tasaTxt = v => nf('t', { maximumFractionDigits:2 }).format(Number(v) || 0) + '%';
function dur(n){
  if (!Number.isFinite(n)) return 'Nunca';
  if (n <= 0) return 'Ya está pagada';
  const a = Math.floor(n / 12), m = n % 12;
  return [a ? plural(a, 'año', 'años') : '', m ? plural(m, 'mes', 'meses') : ''].filter(Boolean).join(' y ');
}
const durS = s => s.nunca ? 'Nunca' : (s.tope ? 'Más de 50 años' : dur(s.meses));
const mensual = it => num(it.monto) * (FRECS[it.frec] || FRECS.mensual)[1];
const chip = (k, t) => `<span class="chip ${k}"><i aria-hidden="true">${k === 'good' ? '✓' : k === 'warn' ? '!' : '✕'}</i>${esc(t)}</span>`;

/* ================= cálculos ================= */
function minPago(c, b, r, t){
  if (b <= 0) return 0;
  const i = b * r, iv = i * t, due = b + i + iv;
  const pc = (Number(c.minPct) || 0) / 100;
  let p = c.minTipo === 'pct' ? due * pc : i + iv + b * pc;
  p = Math.max(p, num(c.minFijo));
  return Math.min(p, due);
}
function simular(c, iva, modo, pagoFijo){
  const r = num(c.tasa) / 1200, t = num(iva) / 100;
  let b = num(c.saldo), lim = 600, nunca = false, ti = 0, tv = 0, tp = 0;
  const rows = [];
  for (let m = 1; m <= lim && b > 0.005; m++) {
    const i = b * r, iv = i * t, due = b + i + iv;
    const p = modo === 'min' ? minPago(c, b, r, t) : Math.min(num(pagoFijo), due);
    const cap = p - i - iv;
    b = due - p; if (b < 0.005) b = 0;
    rows.push({ m, p, i, iv, cap, b });
    ti += i; tv += iv; tp += p;
    if (cap <= 1e-9 && b > 0 && !nunca) { nunca = true; lim = Math.min(lim, 120); }
  }
  const done = b <= 0.005;
  return { rows, meses: done ? rows.length : Infinity, ti, tv, tp, nunca: !done && nunca, tope: !done && !nunca };
}
function pagoPara(saldo, tasa, iva, n){
  const rr = num(tasa) / 1200 * (1 + num(iva) / 100), B = num(saldo);
  n = Math.max(1, Math.round(n));
  if (!B) return 0;
  if (rr === 0) return B / n;
  return B * rr / (1 - Math.pow(1 + rr, -n));
}
function planear(cards, iva, presupuesto, metodo){
  const t = num(iva) / 100;
  const cs = cards.map(c => ({ c, id:c.id, r:num(c.tasa) / 1200, b:num(c.saldo), fin:null, ti:0 }));
  const serie = [sum(cs, x => x.b)];
  let ti = 0, m = 0;
  while (m < 600 && cs.some(x => x.b > 0.005)) {
    m++;
    let disp = presupuesto;
    for (const x of cs) {
      if (x.b <= 0.005) continue;
      const pmin = minPago(x.c, x.b, x.r, t);
      const i = x.b * x.r, iv = i * t;
      x.b += i + iv; x.ti += i + iv; ti += i + iv;
      const p = Math.min(pmin, x.b);
      x.b -= p; disp -= p;
    }
    if (disp > 0) {
      const orden = cs.filter(x => x.b > 0.005).sort(metodo === 'avalancha' ? (a, b) => (b.r - a.r) || (a.b - b.b) : (a, b) => (a.b - b.b) || (b.r - a.r));
      for (const x of orden) { if (disp <= 0) break; const p = Math.min(disp, x.b); x.b -= p; disp -= p; }
    }
    for (const x of cs) if (x.b <= 0.005 && x.fin === null) { x.b = 0; x.fin = m; }
    serie.push(sum(cs, x => x.b));
  }
  const done = cs.every(x => x.b <= 0.005);
  return { meses: done ? m : Infinity, ti, serie, orden: cs.map(x => ({ id:x.id, fin:x.fin, ti:x.ti })).sort((a, b) => (a.fin == null ? 1e9 : a.fin) - (b.fin == null ? 1e9 : b.fin)) };
}
/* meses sin intereses */
function msiInfo(p){
  const n = Math.max(1, Math.round(num(p.meses)) || 1), cuota = num(p.monto) / n;
  const ym = ymDe(hoy()), ini = esYM(p.inicio) ? p.inicio : ym;
  const k = ymDiff(ini, ym) + 1; // número de mensualidad que toca este mes
  const activa = k >= 1 && k <= n;
  const restantes = k > n ? 0 : (k < 1 ? n : n - k + 1);
  return { n, cuota, k, activa, restantes, pendiente:cuota * restantes, fin:ymAdd(ini, n - 1), ini };
}
const msiMes = c => sum(c.msi || [], p => { const i = msiInfo(p); return i.activa ? i.cuota : 0; });
const msiPendiente = c => sum(c.msi || [], p => msiInfo(p).pendiente);
function msiNota(p){
  if (!num(p.monto)) return '';
  const i = msiInfo(p);
  if (i.k < 1) return `Mensualidad de ${m2(i.cuota)} · empieza en ${ymTxt(i.ini)}`;
  if (i.k > i.n) return `Ya la terminaste de pagar en ${ymTxt(i.fin)}`;
  return `Mensualidad de ${m2(i.cuota)} · este mes pagas la ${i.k} de ${i.n} · terminas en ${ymTxt(i.fin)}`;
}
function msiProyeccion(meses){
  const ym = ymDe(hoy()), out = [];
  for (let j = 0; j < meses; j++) {
    const det = [];
    state.tarjetas.forEach(c => {
      const v = sum(c.msi || [], p => { const i = msiInfo(p), kk = i.k + j; return kk >= 1 && kk <= i.n ? i.cuota : 0; });
      if (v > 0) det.push([c.nombre || 'Tarjeta', v]);
    });
    out.push({ mes:ymAdd(ym, j), tot:sum(det, d => d[1]), det });
  }
  return out;
}
function analizar(c){
  const r = num(c.tasa) / 1200, t = num(state.iva) / 100, b = num(c.saldo);
  const i = b * r, iv = i * t, due = b + i + iv;
  return {
    b, i, iv, due, r, t,
    min: minPago(c, b, r, t),
    pago: Math.min(num(c.pago), due),
    sMin: simular(c, state.iva, 'min'),
    sTu: num(c.pago) > 0 && b > 0 ? simular(c, state.iva, 'fijo', num(c.pago)) : null,
    util: num(c.limite) > 0 ? b / num(c.limite) : null,
    msi: PERSONAL ? msiMes(c) : 0,
    msiPend: PERSONAL ? msiPendiente(c) : 0
  };
}
function analizarPrestamo(p){
  const ivaP = p.conIva ? num(state.iva) : 0;
  const r = num(p.tasa) / 1200, t = ivaP / 100, b = num(p.saldo);
  const i = b * r, iv = i * t;
  const base = { saldo:b, tasa:p.tasa };
  const s = num(p.pago) > 0 && b > 0 ? simular(base, ivaP, 'fijo', num(p.pago)) : null;
  const sx = s && num(p.extra) > 0 ? simular(base, ivaP, 'fijo', num(p.pago) + num(p.extra)) : null;
  const pagoMes = b > 0 ? Math.min(num(p.pago) + num(p.extra), b + i + iv) : 0;
  return { b, i, iv, ivaP, s, sx, pagoMes, cap: Math.min(num(p.pago), b + i + iv) - i - iv };
}
function estadoTarjeta(a){
  if (a.b <= 0) return ['good', 'Sin deuda'];
  if (a.pago <= 0) return ['warn', 'Sin pago planeado'];
  if (a.pago + 0.005 < a.min) return ['bad', 'Menor al mínimo'];
  if (a.sTu && (a.sTu.nunca || a.sTu.tope)) return ['bad', 'No cubre intereses'];
  if (a.sTu && a.sTu.meses > 36) return ['warn', 'Más de 3 años'];
  return ['good', 'Vas bien'];
}
function proximoVenc(dia, pagadoHasta){
  const h = hoy();
  for (let k = 0; k < 14; k++) {
    const base = new Date(h.getFullYear(), h.getMonth() + k, 1);
    const f = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, diasMes(base.getFullYear(), base.getMonth())));
    if (f >= h && isoDia(f) > (pagadoHasta || '')) return f;
  }
  return h;
}

/* ================= tooltip y avisos ================= */
let tipSrc = null, toastT = null;
function showTip(html, x, y, src){
  const tip = byId('tip');
  tip.innerHTML = html; tip.hidden = false; tipSrc = src;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let L = x + 14, T = y + 14;
  if (L + w > innerWidth - 8) L = x - w - 14;
  if (L < 8) L = 8;
  if (T + h > innerHeight - 8) T = y - h - 14;
  if (T < 8) T = 8;
  tip.style.left = L + 'px'; tip.style.top = T + 'px';
}
function hideTip(){ const tip = byId('tip'); if (tip) tip.hidden = true; tipSrc = null; }
function toast(msg){
  const t = byId('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 5500);
}

/* ================= gráficas ================= */
function niceTicks(max){
  if (!(max > 0)) return [0, 1];
  const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const s = [1, 2, 2.5, 5, 10].find(k => k * p >= raw) * p;
  const top = Math.ceil(max / s - 1e-9) * s, out = [];
  for (let v = 0; v <= top + s / 2; v += s) out.push(v);
  return out;
}
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
  for (const en of entries) {
    const el = en.target;
    if (el._draw && en.contentRect.width > 0 && Math.abs(en.contentRect.width - (el._w || 0)) > 1) el._draw();
  }
}) : null;
function observar(el){ if (ro && !el._obs) { ro.observe(el); el._obs = true; } }

function lineChart(el, series, opt){
  opt = opt || {};
  el._draw = () => drawLines(el, series, opt);
  observar(el); el._draw();
}
function drawLines(el, series, opt){
  const W = Math.round(el.clientWidth || 640), H = opt.h || 260;
  el._w = W;
  const pl = 62, pr = 20, pt = 26, pb = 30, iw = W - pl - pr, ih = H - pt - pb;
  const cap = opt.cap || 360;
  const data = series.map(s => s.data.slice(0, cap + 1));
  const N = Math.max(1, ...data.map(d => d.length - 1));
  const maxY = Math.max(1, ...data.map(d => Math.max(0, ...d)));
  const yt = niceTicks(maxY), top = yt[yt.length - 1];
  const X = m => pl + (m / N) * iw, Y = v => pt + ih - (Math.max(0, v) / top) * ih;
  const step = [1, 2, 3, 6, 12, 24, 36, 60, 120].find(s => N / s <= 6) || 120;
  const years = step >= 12;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opt.aria || '')}">`;
  yt.forEach(v => {
    s += `<line class="${v === 0 ? 'ax' : 'gl'}" x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`;
    s += `<text class="tk" x="${pl - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${esc(mc(v))}</text>`;
  });
  for (let m = 0; m <= N; m += step) s += `<text class="tk" x="${X(m).toFixed(1)}" y="${H - 9}" text-anchor="middle">${years ? m / 12 : m}</text>`;
  s += `<text class="tk" x="${pl - 8}" y="${H - 9}" text-anchor="end">${years ? 'año' : 'mes'}</text>`;
  data.forEach((d, si) => {
    if (d.length < 2) return;
    const path = d.map((v, m) => (m ? 'L' : 'M') + X(m).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
    s += `<path d="${path}" fill="none" style="stroke:var(${series[si].v})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  const labels = [];
  data.forEach((d, si) => {
    if (!d.length) return;
    const e = d.length - 1, truncated = series[si].data.length - 1 > cap;
    const x = X(e), y = Y(d[e]);
    if (!truncated) s += `<circle class="ed" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" style="fill:var(${series[si].v})"/>`;
    const txt = opt.endLabel ? opt.endLabel(si, truncated) : '';
    if (txt) labels.push({ x, y, txt });
  });
  labels.sort((a, b) => a.x - b.x).forEach((l, i, arr) => {
    const prev = arr[i - 1];
    if (prev && Math.abs(prev.x - l.x) < 110 && Math.abs(prev.y - l.y) < 18) return;
    const anchor = l.x > W - 90 ? 'end' : (l.x < pl + 50 ? 'start' : 'middle');
    s += `<text class="el" x="${l.x.toFixed(1)}" y="${(l.y - 11).toFixed(1)}" text-anchor="${anchor}">${esc(l.txt)}</text>`;
  });
  s += `<line class="xh" x1="0" x2="0" y1="${pt}" y2="${pt + ih}" visibility="hidden"/>`;
  series.forEach((sr, si) => { s += `<circle class="hd" data-i="${si}" r="4.5" visibility="hidden" style="fill:var(${sr.v})"/>`; });
  s += `<rect class="hit" x="${pl}" y="${pt}" width="${Math.max(0, iw)}" height="${ih}" fill="transparent"/></svg>`;
  el.innerHTML = s;
  const svg = el.querySelector('svg'), hit = svg.querySelector('.hit'), xh = svg.querySelector('.xh'), dots = $$('.hd', svg);
  const move = ev => {
    const bb = svg.getBoundingClientRect();
    const x = (ev.clientX - bb.left) * (W / bb.width);
    const m = Math.max(0, Math.min(N, Math.round((x - pl) / iw * N)));
    xh.setAttribute('x1', X(m)); xh.setAttribute('x2', X(m)); xh.setAttribute('visibility', 'visible');
    let html = `<div class="th">${m === 0 ? 'Hoy' : 'Mes ' + m + ' · ' + esc(fecha(m))}</div>`;
    data.forEach((d, si) => {
      const dot = dots[si], has = m < d.length;
      if (has) { dot.setAttribute('cx', X(m)); dot.setAttribute('cy', Y(d[m])); dot.setAttribute('visibility', 'visible'); }
      else dot.setAttribute('visibility', 'hidden');
      const val = has ? m2(d[m]) : (series[si].data.length > d.length ? '—' : (opt.after ? opt.after(si) : 'Pagada'));
      html += `<div class="tr"><span class="lkey" style="background:var(${series[si].v})"></span>${esc(series[si].name)}: <b>${esc(val)}</b></div>`;
    });
    showTip(html, ev.clientX, ev.clientY, 'c');
  };
  const leave = () => { xh.setAttribute('visibility', 'hidden'); dots.forEach(d => d.setAttribute('visibility', 'hidden')); if (tipSrc === 'c') hideTip(); };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', leave);
}
function colChart(el, items, opt){
  opt = opt || {};
  el._draw = () => drawCols(el, items, opt);
  observar(el); el._draw();
}
function drawCols(el, items, opt){
  const W = Math.round(el.clientWidth || 600), H = opt.h || 200;
  el._w = W;
  const pl = 56, pr = 10, pt = 22, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(1, ...items.map(i => i.v)), yt = niceTicks(max), top = yt[yt.length - 1];
  const band = iw / items.length, bw = Math.min(24, band * 0.62);
  const Y = v => pt + ih - (v / top) * ih;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opt.aria || '')}">`;
  yt.forEach(v => {
    s += `<line class="${v === 0 ? 'ax' : 'gl'}" x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`;
    s += `<text class="tk" x="${pl - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${esc(mc(v))}</text>`;
  });
  const every = band < 34 ? 2 : 1;
  let iMax = 0; items.forEach((it, i) => { if (it.v > items[iMax].v) iMax = i; });
  items.forEach((it, i) => {
    const x = pl + band * i + (band - bw) / 2, h = (it.v / top) * ih, y = pt + ih - h;
    if (it.v > 0) {
      const r = Math.min(4, h, bw / 2);
      s += `<path d="M${x.toFixed(1)},${(y + h).toFixed(1)}V${(y + r).toFixed(1)}Q${x.toFixed(1)},${y.toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)}H${(x + bw - r).toFixed(1)}Q${(x + bw).toFixed(1)},${y.toFixed(1)} ${(x + bw).toFixed(1)},${(y + r).toFixed(1)}V${(y + h).toFixed(1)}Z" style="fill:var(${opt.v || '--s1'})"/>`;
      if (i === 0 || i === iMax) s += `<text class="el" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${esc(mc(it.v))}</text>`;
    }
    if (i % every === 0) s += `<text class="tk" x="${(pl + band * i + band / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle">${esc(it.label)}</text>`;
    s += `<rect x="${(pl + band * i).toFixed(1)}" y="${pt}" width="${band.toFixed(1)}" height="${ih}" fill="transparent" data-tip="${esc(it.tip)}"/>`;
  });
  el.innerHTML = s + '</svg>';
}

/* ================= plantilla de la página ================= */
const TABS = [
  { id:'resumen', n:'Resumen' },
  PERSONAL && { id:'diario', n:'Registro diario' },
  { id:'presupuesto', n:'Presupuesto' },
  { id:'tarjetas', n:'Tarjetas' },
  PERSONAL && { id:'prestamos', n:'Préstamos' },
  { id:'simulador', n:'Simulador de intereses' },
  { id:'plan', n:'Plan de pagos' }
].filter(Boolean);
const TAB_IDS = TABS.map(t => t.id);
const ICONO_DRIVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1FA463" d="M8.2 3h7.6l6.2 10.8h-7.6z"/><path fill="#4285F4" d="M22 13.8 18.2 20.5H5.8l3.8-6.7z"/><path fill="#FFD04B" d="M8.2 3 2 13.8l3.8 6.7L12 9.7z"/></svg>';

function panel(id, inner, lede){
  return `<section class="panel" id="tab-${id}" role="tabpanel" aria-labelledby="t-${id}" hidden>${lede ? `<p class="lede">${lede}</p>` : ''}${inner}</section>`;
}
function shellHTML(){
  const pais = PERSONAL ? '' : `<label class="inline-fld" for="cfg-pais">País <select id="cfg-pais">${Object.keys(PAISES).map(k => `<option value="${k}">${esc(PAISES[k].n)}</option>`).join('')}</select></label>`;
  return `
<header class="top">
  <div class="wrap top-row">
    <div class="brand">
      <p class="label">${PERSONAL ? 'Mis finanzas · versión personal' : 'Finanzas personales · intereses de tarjetas'}</p>
      <h1 class="wordmark">Cuentas <span>Claras</span></h1>
    </div>
    <div class="top-tools">${pais}<div class="cuenta" id="cuenta"></div></div>
  </div>
  <canvas class="guilloche" id="guilloche" aria-hidden="true"></canvas>
</header>
<div class="tabs-bar"><nav class="wrap tabs" role="tablist" aria-label="Secciones">
  ${TABS.map(t => `<button class="tab" role="tab" type="button" id="t-${t.id}" data-tab="${t.id}" aria-controls="tab-${t.id}" aria-selected="false" tabindex="-1">${t.n}</button>`).join('')}
</nav></div>
<main class="wrap">
  <div class="banner" id="demo-banner" hidden>
    <p><strong>Estos son datos de ejemplo.</strong> Cambia los montos por los tuyos o empieza con todo en blanco. Lo que escribas se guarda solo.${DRIVE_OK ? ' Si ya usas la app en otro dispositivo, conecta tu Google Drive para traer tus datos.' : ''}</p>
    <div class="banner-actions">
      <button class="btn" id="btn-blanco" type="button">Empezar en blanco</button>
      <button class="btn-quiet" id="btn-ocultar" type="button">Ya son mis datos</button>
    </div>
  </div>
  ${panel('resumen', resumenHTML())}
  ${PERSONAL ? panel('diario', diarioHTML(), 'Anota cada gasto el día que lo haces. Aquí ves cuánto llevas del mes y en qué categorías te estás pasando de tu presupuesto.') : ''}
  ${panel('presupuesto', presupuestoHTML(), 'Anota lo que ganas y lo que planeas gastar cada mes. Si te pagan por quincena o por semana, elige la frecuencia y la app lo convierte a mensual. Los pagos de tarjetas' + (PERSONAL ? ' y préstamos' : '') + ' van aparte.')}
  ${panel('tarjetas', tarjetasHTML(), 'Copia los datos de tu estado de cuenta. Por cada tarjeta verás cuánto te cobran de intereses este mes y cuánto tardas en liquidarla si pagas solo el mínimo o si pagas lo que tú decidas.')}
  ${PERSONAL ? panel('prestamos', prestamosHTML(), 'Tus créditos de auto, personales, de nómina o hipotecarios. Ve cuánto te falta, cuándo terminas y cuánto te ahorras si abonas de más a capital.') : ''}
  ${panel('simulador', simuladorHTML(), 'Prueba distintos pagos y mira mes a mes cuánto se va en intereses y cuánto baja tu deuda. Lo que cambies aquí no modifica tus tarjetas.')}
  ${panel('plan', planHTML(), 'Si tienes varias tarjetas: cada mes pagas el mínimo de todas y el dinero que sobra lo mandas a una sola. Cuando la liquidas, lo que le pagabas pasa a la siguiente. Aquí comparas dos formas de elegir el orden.')}
</main>
<footer class="wrap foot">
  <section class="datos" aria-labelledby="datos-t">
    <h2 id="datos-t">Tus datos</h2>
    <p id="datos-donde"></p>
    <div class="foot-actions">
      <button class="btn-quiet" id="btn-respaldo" type="button">Descargar respaldo</button>
      <button class="btn-quiet" id="btn-importar" type="button">Cargar respaldo</button>
      <button class="btn-quiet" id="btn-recuperar" type="button" hidden>Recuperar versión anterior</button>
      <button class="btn-quiet" id="btn-desconectar" type="button" hidden>Desconectar Google Drive</button>
      <button class="btn-quiet" id="btn-borrar-drive" type="button" hidden>Borrar mis datos de Drive</button>
      <button class="btn-quiet" id="btn-ejemplo" type="button">Cargar datos de ejemplo</button>
      <button class="btn-quiet" id="btn-borrar" type="button">Borrar todos mis datos</button>
    </div>
  </section>
  <p class="foot-legal">Los resultados son estimaciones: suponen una tasa fija, sin compras nuevas, comisiones ni cargos por pago tardío. No son asesoría financiera; revisa tu estado de cuenta para los montos exactos.${PERSONAL ? '' : ' <a href="privacidad.html">Aviso de privacidad</a>'}</p>
</footer>
<div class="tip" id="tip" hidden></div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<input type="file" id="f-importar" accept="application/json,.json" hidden>`;
}
function resumenHTML(){
  return `
  <div class="block hero">
    <div class="hero-main">
      <p class="label" id="r-libre-l">Te queda libre cada mes</p>
      <p class="hero-num" id="r-libre">$0</p>
      <div id="r-libre-chip"></div>
      <p class="hero-sub" id="r-libre-sub"></p>
    </div>
    <div class="split">
      <p class="label">A dónde se va tu ingreso</p>
      <div class="st-wrap"><div class="stack" id="r-stack"></div><div id="r-stack-mark"></div></div>
      <ul class="legend" id="r-stack-legend"></ul>
    </div>
  </div>
  ${PERSONAL ? `<article class="block"><header class="block-head"><h2>Próximos pagos</h2><button class="btn-quiet" type="button" id="btn-ics">Agregar recordatorios a mi calendario</button></header><div id="r-pagos"></div></article>` : ''}
  <div class="tiles" id="r-tiles"></div>
  <div class="grid-2">
    <article class="block">
      <header class="block-head"><h2>Gastos por categoría</h2><p class="label">Presupuesto al mes</p></header>
      <div class="hbars" id="r-cats"></div>
      ${PERSONAL ? '<p class="insight" id="r-real"></p>' : ''}
    </article>
    <article class="block">
      <header class="block-head"><h2>Tus tarjetas</h2><button class="link" type="button" data-go="tarjetas">Editar tarjetas</button></header>
      <div class="table-wrap"><table class="tbl" id="r-cards"></table></div>
      <p class="insight" id="r-insight" hidden></p>
    </article>
  </div>
  ${PERSONAL ? `<article class="block"><header class="block-head"><h2>Tus préstamos</h2><button class="link" type="button" data-go="prestamos">Editar préstamos</button></header><div class="table-wrap"><table class="tbl" id="r-prest"></table></div></article>` : ''}`;
}
function presupuestoHTML(){
  return `
  <div class="grid-2">
    <article class="block">
      <header class="block-head"><h2>Ingresos</h2><p class="total" id="p-ing-total"></p></header>
      <div id="p-ingresos"></div>
      <button class="btn-quiet btn-add" type="button" data-add="ingresos">+ Agregar ingreso</button>
    </article>
    <article class="block">
      <header class="block-head"><h2>Gastos</h2><p class="total" id="p-gas-total"></p></header>
      <div id="p-gastos"></div>
      <button class="btn-quiet btn-add" type="button" data-add="gastos">+ Agregar gasto</button>
    </article>
  </div>
  <p class="balance-line" id="p-balance"></p>`;
}
function tarjetasHTML(){
  return `
  <div class="block cfg-row">
    <label class="fld" for="cfg-iva"><span class="fld-l">Impuesto sobre intereses</span><span class="in-suffix"><input class="in num" id="cfg-iva" type="number" inputmode="decimal" min="0" step="any" placeholder="0"><span>%</span></span></label>
    <p class="fld-h">En México los bancos cobran 16% de IVA sobre los intereses. Si en tu país no aplica, déjalo en 0.</p>
  </div>
  ${PERSONAL ? `<article class="block"><header class="block-head"><h2>Mensualidades a meses sin intereses</h2><p class="label">Próximos 12 meses</p></header><div class="chart" id="t-msi-chart" style="min-height:190px"></div><p class="fld-h" id="t-msi-sum"></p></article>` : ''}
  <div class="cards" id="t-cards"></div>
  <button class="btn-quiet btn-add" type="button" data-add="tarjetas">+ Agregar tarjeta</button>
  <p class="foot-note">La tasa anual aparece en tu estado de cuenta como “tasa de interés anual ordinaria”. Los cálculos suponen que ya no haces compras nuevas con la tarjeta y que la tasa no cambia.</p>`;
}
function prestamosHTML(){
  return `
  <div class="tiles" id="pr-tiles"></div>
  <div class="cards" id="pr-list"></div>
  <button class="btn-quiet btn-add" type="button" data-add="prestamos">+ Agregar préstamo</button>
  <p class="foot-note">El saldo pendiente y la tasa vienen en tu estado de cuenta o en la app de tu banco. El cálculo supone una tasa fija y mensualidades iguales. Antes de abonar a capital, pregunta a tu banco si lo aplica para reducir el plazo.</p>`;
}
function diarioHTML(){
  return `
  <form class="block" id="d-form" autocomplete="off">
    <header class="block-head"><h2>Anotar un gasto</h2></header>
    <div class="quick-grid">
      <label class="fld" for="d-monto"><span class="fld-l">Monto</span><input class="in num" id="d-monto" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></label>
      <label class="fld" for="d-cat"><span class="fld-l">Categoría</span><select class="in" id="d-cat">${CATS.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label>
      <label class="fld" for="d-metodo"><span class="fld-l">Pagaste con</span><select class="in" id="d-metodo"></select></label>
      <label class="fld" for="d-fecha"><span class="fld-l">Fecha</span><input class="in" id="d-fecha" type="date"></label>
      <label class="fld quick-nota" for="d-nota"><span class="fld-l">Nota</span><input class="in" id="d-nota" maxlength="120" placeholder="Ej. Súper, gasolina, comida"></label>
      <button class="btn" type="submit">Anotar gasto</button>
    </div>
    <p class="fld-h" id="d-msg" role="status"></p>
  </form>
  <article class="block" id="imp-block">
    <header class="block-head"><h2>Subir estado de cuenta</h2><p class="label">PDF o fotos</p></header>
    <p class="note-line">El archivo o las fotos se leen aquí mismo, en tu navegador: no se suben a ningún servidor ni se guardan, y la app los descarta en cuanto termina de leerlos. De cada gasto solo guardamos la fecha, el comercio, el monto y la categoría, y solo los que tú confirmes. Los números de tarjeta, referencias, RFC y nombres en transferencias se quitan antes.</p>
    <div class="imp-row">
      <label class="fld" for="imp-cuenta"><span class="fld-l">¿De qué tarjeta o cuenta es?</span><select class="in" id="imp-cuenta"></select></label>
      <button class="btn" type="button" id="imp-elegir">Elegir PDF o fotos</button>
      <input type="file" id="imp-file" accept="application/pdf,.pdf,image/*" multiple hidden>
    </div>
    <div class="imp-drop" id="imp-drop">o arrastra aquí tu PDF o las fotos de tu estado de cuenta</div>
    <p class="fld-h">Con fotos o PDF escaneados, la app reconoce el texto de la imagen. La primera vez descarga el lector (unos 6 MB) y tarda unos segundos por página. Para mejores resultados, toma la foto de frente, con buena luz y sin sombras. Si tienes varias páginas, súbelas juntas.</p>
    <form class="imp-clave" id="imp-clave" autocomplete="off" hidden>
      <p class="fld-h" id="imp-clave-msg"></p>
      <div class="cfg-row">
        <label class="sr" for="imp-clave-in">Contraseña del PDF</label>
        <input class="in" id="imp-clave-in" type="password" autocomplete="off" style="max-width:260px" placeholder="Contraseña del PDF">
        <button class="btn" type="submit">Abrir</button>
        <button class="btn-quiet" type="button" id="imp-clave-no">Cancelar</button>
      </div>
    </form>
    <p class="note-line" id="imp-estado" role="status"></p>
    <div id="imp-revision" hidden></div>
  </article>
  <div class="month-nav">
    <button class="btn-quiet" type="button" data-mes="-1" aria-label="Mes anterior">‹</button>
    <h2 id="d-mes"></h2>
    <button class="btn-quiet" type="button" data-mes="1" aria-label="Mes siguiente">›</button>
    <button class="btn-quiet push" type="button" id="btn-csv">Descargar este mes (CSV)</button>
  </div>
  <div class="tiles tiles-4" id="d-tiles"></div>
  <div class="grid-2">
    <article class="block"><header class="block-head"><h2>Contra tu presupuesto</h2></header><div id="d-cats"></div></article>
    <article class="block"><header class="block-head"><h2>Movimientos</h2><p class="label" id="d-count"></p></header><div id="d-lista"></div></article>
  </div>`;
}
function simuladorHTML(){
  const n = (id, label, suf) => `<label class="fld" for="${id}"><span class="fld-l">${label}</span>${suf ? `<span class="in-suffix"><input class="in num" id="${id}" type="number" inputmode="decimal" min="0" step="any" placeholder="0"><span>${suf}</span></span>` : `<input class="in num" id="${id}" type="number" inputmode="decimal" min="0" step="any" placeholder="0">`}</label>`;
  return `
  <div class="sim-grid">
    <article class="block">
      <header class="block-head"><h2>Datos de la deuda</h2></header>
      <label class="fld" for="s-fuente"><span class="fld-l">Tomar datos de</span><select class="in" id="s-fuente"></select></label>
      <div class="fields">
        ${n('s-saldo', 'Saldo')}${n('s-tasa', 'Tasa anual', '%')}${n('s-pago', 'Tu pago mensual')}${n('s-iva', 'Impuesto s/ intereses', '%')}
        <fieldset class="fld-set">
          <legend class="fld-l">Cómo calcula el banco el pago mínimo</legend>
          <select class="in" id="s-mintipo" aria-label="Fórmula del pago mínimo"><option value="int">Intereses + un % del saldo</option><option value="pct">Un % del saldo total</option></select>
          <div class="fld-row">
            <label class="fld" for="s-minpct"><span class="fld-h">% del saldo</span><span class="in-suffix"><input class="in num" id="s-minpct" type="number" inputmode="decimal" min="0" step="any" placeholder="0"><span>%</span></span></label>
            <label class="fld" for="s-minfijo"><span class="fld-h">Mínimo fijo</span><input class="in num" id="s-minfijo" type="number" inputmode="decimal" min="0" step="any" placeholder="0"></label>
          </div>
        </fieldset>
      </div>
      <div class="goal">
        <label class="fld" for="s-meta"><span class="fld-l">¿En cuántos meses quieres terminar de pagarla?</span><input class="in num" id="s-meta" type="number" inputmode="numeric" min="1" max="360" step="1"></label>
        <p id="s-meta-out"></p>
        <button class="btn" id="s-meta-use" type="button">Usar este pago</button>
      </div>
    </article>
    <div class="sim-results">
      <article class="block">
        <header class="block-head"><h2>Pago mínimo contra tu pago</h2></header>
        <div class="table-wrap"><table class="tbl" id="s-cmp"></table></div>
        <div class="verdict" id="s-verdict"></div>
      </article>
      <article class="block">
        <header class="block-head"><h2>Saldo pendiente mes a mes</h2>
          <ul class="legend"><li><span class="lkey" style="background:var(--s1)"></span>Tu pago</li><li><span class="lkey" style="background:var(--s2)"></span>Solo el mínimo</li></ul>
        </header>
        <div class="chart" id="s-chart"></div>
        <p class="chart-note" id="s-chart-note" hidden></p>
      </article>
      <article class="block">
        <header class="block-head"><h2>Tabla de pagos</h2>
          <div class="seg" role="group" aria-label="Qué tabla ver"><button type="button" data-tabla="tu" aria-pressed="true">Con tu pago</button><button type="button" data-tabla="min" aria-pressed="false">Solo el mínimo</button></div>
        </header>
        <div class="table-wrap scroll-y"><table class="tbl" id="s-table"></table></div>
      </article>
    </div>
  </div>`;
}
function planHTML(){
  return `
  <article class="block">
    <label class="fld" for="pl-presupuesto"><span class="fld-l">¿Cuánto puedes pagar en total a tus tarjetas cada mes?</span></label>
    <div class="cfg-row">
      <input class="in num" id="pl-presupuesto" type="number" inputmode="decimal" min="0" step="any" style="max-width:220px">
      <button class="btn-quiet" id="pl-auto" type="button" hidden>Usar la suma de mis pagos</button>
    </div>
    <p class="fld-h" id="pl-hint"></p>
  </article>
  <p class="empty" id="pl-empty" hidden>Escribe el saldo de al menos una tarjeta en la pestaña Tarjetas para armar tu plan.</p>
  <div class="stack-y" id="pl-body">
    <p class="alert" id="pl-warn" hidden></p>
    <div class="grid-2" id="pl-methods"></div>
    <p class="base-line" id="pl-base"></p>
    <article class="block">
      <header class="block-head"><h2>Deuda total mes a mes</h2>
        <ul class="legend"><li><span class="lkey" style="background:var(--s1)"></span>Avalancha</li><li><span class="lkey" style="background:var(--s2)"></span>Bola de nieve</li></ul>
      </header>
      <div class="chart" id="pl-chart"></div>
    </article>
    <article class="block"><header class="block-head"><h2 id="pl-orden-t">Orden de pago</h2></header><ol class="orden" id="pl-orden"></ol></article>
  </div>`;
}

/* ================= editores ================= */
function opts(list, sel){ return list.map(([v, t]) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
const frecOpts = sel => opts(Object.keys(FRECS).map(k => [k, FRECS[k][0]]), sel);
const catOpts = sel => opts(CATS.map(c => [c, c]), sel);
const notaMensual = x => x.frec !== 'mensual' && num(x.monto) > 0 ? 'Equivale a ' + m2(mensual(x)) + ' al mes' : '';
const attrs = (col, x, k) => `id="${col}-${esc(x.id)}-${k}" data-col="${col}" data-id="${esc(x.id)}" data-k="${k}"`;
const attrsM = (c, p, k) => `id="msi-${esc(p.id)}-${k}" data-col="msi" data-parent="${esc(c.id)}" data-id="${esc(p.id)}" data-k="${k}"`;
const numVal = v => (v === 0 || v == null) ? '' : esc(v);
function campo(col, x, k, label, suf, hint, extra){
  const input = `<input class="in num" type="number" inputmode="decimal" min="0" step="any" ${extra || ''} ${attrs(col, x, k)} value="${numVal(x[k])}" placeholder="0">`;
  return `<label class="fld" for="${col}-${esc(x.id)}-${k}"><span class="fld-l">${label}</span>${suf ? `<span class="in-suffix">${input}<span>${suf}</span></span>` : input}${hint ? `<span class="fld-h">${hint}</span>` : ''}</label>`;
}

function renderIngresos(){
  const el = byId('p-ingresos');
  if (!state.ingresos.length) { el.innerHTML = '<p class="empty">Todavía no hay ingresos. Agrega tu sueldo u otras entradas de dinero.</p>'; return; }
  el.innerHTML = `<div class="brow brow-ing brow-head" aria-hidden="true"><span>Concepto</span><span>Frecuencia</span><span>Monto</span><span></span></div>` +
    state.ingresos.map(x => `<div class="brow brow-ing">
      <input class="in" ${attrs('ingresos', x, 'concepto')} value="${esc(x.concepto)}" placeholder="Ej. Sueldo" aria-label="Concepto del ingreso">
      <select class="in" ${attrs('ingresos', x, 'frec')} aria-label="Frecuencia">${frecOpts(x.frec)}</select>
      <input class="in num" type="number" inputmode="decimal" min="0" step="any" ${attrs('ingresos', x, 'monto')} value="${numVal(x.monto)}" placeholder="0" aria-label="Monto">
      <button class="icon-btn" type="button" data-del="ingresos" data-id="${esc(x.id)}" aria-label="Quitar ${esc(x.concepto || 'ingreso')}">×</button>
      <p class="brow-note" id="note-${esc(x.id)}">${esc(notaMensual(x))}</p>
    </div>`).join('');
}
function renderGastos(){
  const el = byId('p-gastos');
  if (!state.gastos.length) { el.innerHTML = '<p class="empty">Todavía no hay gastos. Empieza por los fijos: renta, servicios, transporte.</p>'; return; }
  el.innerHTML = `<div class="brow brow-gas brow-head" aria-hidden="true"><span>Concepto</span><span>Categoría</span><span>Frecuencia</span><span>Monto</span><span></span></div>` +
    state.gastos.map(x => `<div class="brow brow-gas">
      <input class="in" ${attrs('gastos', x, 'concepto')} value="${esc(x.concepto)}" placeholder="Ej. Renta" aria-label="Concepto del gasto">
      <select class="in" ${attrs('gastos', x, 'cat')} aria-label="Categoría">${catOpts(x.cat)}</select>
      <select class="in" ${attrs('gastos', x, 'frec')} aria-label="Frecuencia">${frecOpts(x.frec)}</select>
      <input class="in num" type="number" inputmode="decimal" min="0" step="any" ${attrs('gastos', x, 'monto')} value="${numVal(x.monto)}" placeholder="0" aria-label="Monto">
      <button class="icon-btn" type="button" data-del="gastos" data-id="${esc(x.id)}" aria-label="Quitar ${esc(x.concepto || 'gasto')}">×</button>
      <p class="brow-note" id="note-${esc(x.id)}">${esc(notaMensual(x))}</p>
    </div>`).join('');
}
function msiHTML(c){
  const rows = (c.msi || []).map(p => `<div class="mrow">
      <input class="in m-desc" ${attrsM(c, p, 'desc')} value="${esc(p.desc)}" placeholder="Ej. Refrigerador" aria-label="Qué compraste">
      <input class="in num m-monto" type="number" inputmode="decimal" min="0" step="any" ${attrsM(c, p, 'monto')} value="${numVal(p.monto)}" placeholder="Monto total" aria-label="Monto total de la compra">
      <span class="in-suffix m-meses"><input class="in num" type="number" inputmode="numeric" min="1" max="60" step="1" ${attrsM(c, p, 'meses')} value="${numVal(p.meses)}" aria-label="Número de meses"><span>m</span></span>
      <input class="in m-ini" type="month" ${attrsM(c, p, 'inicio')} value="${esc(p.inicio)}" placeholder="AAAA-MM" aria-label="Mes del primer pago">
      <button class="icon-btn" type="button" data-del="msi" data-parent="${esc(c.id)}" data-id="${esc(p.id)}" aria-label="Quitar ${esc(p.desc || 'compra')}">×</button>
      <p class="brow-note" id="msi-note-${esc(p.id)}">${esc(msiNota(p))}</p>
    </div>`).join('');
  return `<div class="msi-sec">
    <div class="msi-head"><p class="fld-l">Compras a meses sin intereses</p><p class="fld-h" id="msi-tot-${esc(c.id)}"></p></div>
    ${rows ? `<div class="mrow mrow-head" aria-hidden="true"><span>Compra</span><span>Monto total</span><span>Meses</span><span>Primer pago</span><span></span></div>${rows}` : '<p class="fld-h">No tienes compras a meses en esta tarjeta.</p>'}
    <button class="btn-quiet btn-add" type="button" data-add="msi" data-parent="${esc(c.id)}">+ Agregar compra a meses sin intereses</button>
  </div>`;
}
function renderTarjetasEd(){
  const el = byId('t-cards');
  if (!state.tarjetas.length) { el.innerHTML = '<p class="empty">No tienes tarjetas registradas. Agrega una para ver cuánto te cuesta.</p>'; return; }
  el.innerHTML = state.tarjetas.map(c => `<article class="card-ed">
    <div class="card-ed-head">
      <label class="sr" for="tarjetas-${esc(c.id)}-nombre">Nombre de la tarjeta</label>
      <input class="card-name" ${attrs('tarjetas', c, 'nombre')} value="${esc(c.nombre)}" placeholder="Nombre de la tarjeta">
      <button class="btn-quiet" type="button" data-del="tarjetas" data-id="${esc(c.id)}">Quitar</button>
    </div>
    <div class="card-ed-body">
      <div class="fields">
        ${campo('tarjetas', c, 'saldo', PERSONAL ? 'Saldo que genera intereses' : 'Saldo actual', '', PERSONAL ? 'Sin contar las compras a meses' : '')}
        ${campo('tarjetas', c, 'tasa', 'Tasa de interés anual', '%')}
        ${campo('tarjetas', c, 'pago', PERSONAL ? 'Tu pago mensual al saldo' : 'Tu pago mensual', '', PERSONAL ? 'Las mensualidades a meses se suman aparte' : 'Lo que piensas pagar cada mes')}
        ${campo('tarjetas', c, 'limite', 'Límite de crédito', '', 'Opcional')}
        ${PERSONAL ? campo('tarjetas', c, 'diaCorte', 'Día de corte', '', 'Del 1 al 31', 'max="31"') + campo('tarjetas', c, 'diaPago', 'Día límite de pago', '', 'Del 1 al 31', 'max="31"') : ''}
        <fieldset class="fld-set">
          <legend class="fld-l">Cómo calcula tu banco el pago mínimo</legend>
          <select class="in" ${attrs('tarjetas', c, 'minTipo')} aria-label="Fórmula del pago mínimo">
            <option value="int"${c.minTipo === 'int' ? ' selected' : ''}>Intereses + un % del saldo</option>
            <option value="pct"${c.minTipo === 'pct' ? ' selected' : ''}>Un % del saldo total</option>
          </select>
          <div class="fld-row">
            ${campo('tarjetas', c, 'minPct', '<span class="fld-h">% del saldo</span>', '%')}
            ${campo('tarjetas', c, 'minFijo', '<span class="fld-h">Mínimo fijo</span>')}
          </div>
          <p class="fld-h">Viene en tu estado de cuenta. Si no lo encuentras, deja 1.5% y el mínimo fijo que cobre tu banco.</p>
        </fieldset>
      </div>
      <div class="aviso" id="out-${esc(c.id)}"></div>
    </div>
    ${PERSONAL ? msiHTML(c) : ''}
  </article>`).join('');
}
function renderPrestamosEd(){
  const el = byId('pr-list'); if (!el) return;
  if (!state.prestamos.length) { el.innerHTML = '<p class="empty">No tienes préstamos registrados. Agrega tu crédito de auto, personal, de nómina o hipotecario.</p>'; return; }
  el.innerHTML = state.prestamos.map(p => `<article class="card-ed">
    <div class="card-ed-head">
      <label class="sr" for="prestamos-${esc(p.id)}-nombre">Nombre del préstamo</label>
      <input class="card-name" ${attrs('prestamos', p, 'nombre')} value="${esc(p.nombre)}" placeholder="Nombre del préstamo">
      <button class="btn-quiet" type="button" data-del="prestamos" data-id="${esc(p.id)}">Quitar</button>
    </div>
    <div class="card-ed-body">
      <div class="fields">
        <label class="fld" for="prestamos-${esc(p.id)}-tipo"><span class="fld-l">Tipo de crédito</span><select class="in" ${attrs('prestamos', p, 'tipo')}>${opts(Object.keys(TIPOS).map(k => [k, TIPOS[k]]), p.tipo)}</select></label>
        ${campo('prestamos', p, 'saldo', 'Saldo pendiente')}
        ${campo('prestamos', p, 'tasa', 'Tasa de interés anual', '%')}
        ${campo('prestamos', p, 'pago', 'Mensualidad')}
        ${campo('prestamos', p, 'diaPago', 'Día de pago', '', 'Del 1 al 31', 'max="31"')}
        ${campo('prestamos', p, 'extra', 'Abono extra a capital al mes', '', 'Opcional: para ver cuánto te ahorras')}
        <label class="check fld-full" for="prestamos-${esc(p.id)}-conIva"><input type="checkbox" ${attrs('prestamos', p, 'conIva')}${p.conIva ? ' checked' : ''}> Me cobran IVA sobre los intereses</label>
        <p class="fld-h fld-full">Los créditos de auto, personales y de nómina suelen cobrar IVA sobre los intereses; los hipotecarios no. Revisa tu tabla de amortización.</p>
      </div>
      <div class="aviso" id="out-pr-${esc(p.id)}"></div>
    </div>
    <details class="amort" data-prest="${esc(p.id)}"><summary>Ver tabla de pagos</summary><div id="pr-tabla-${esc(p.id)}"></div></details>
  </article>`).join('');
}

/* ================= salidas ================= */
function avisoHTML(c, a){
  if (a.b <= 0 && !a.msi) return '<p class="empty">Escribe el saldo de la tarjeta para ver cuánto te cuesta.</p>';
  const conIva = a.t > 0;
  const kv = `<p class="label">Este mes</p><dl class="kv">
      ${a.b > 0 ? `<div><dt>Interés</dt><dd>${esc(m2(a.i))}</dd></div>` : ''}
      ${a.b > 0 && conIva ? `<div><dt>IVA sobre el interés</dt><dd>${esc(m2(a.iv))}</dd></div>` : ''}
      ${a.msi ? `<div><dt>Mensualidades a meses</dt><dd>${esc(m2(a.msi))}</dd></div>` : ''}
      <div><dt>Pago mínimo</dt><dd>${esc(m2(a.min + a.msi))}</dd></div>
      <div><dt>Pago para no generar intereses</dt><dd>${esc(m2(a.b + a.msi))}</dd></div>
      ${PERSONAL && (a.pago || a.msi) ? `<div><dt>Vas a pagar en total</dt><dd>${esc(m2(a.pago + a.msi))}</dd></div>` : ''}
    </dl>`;
  let compras = '';
  if (PERSONAL) {
    const ym = ymDe(hoy()), g = sum(state.movimientos.filter(m => m.metodo === c.id && m.fecha.slice(0, 7) === ym), m => num(m.monto));
    if (g > 0) compras = `<p class="note-line">Este mes anotaste <b>${esc(m2(g))}</b> de compras con esta tarjeta en tu registro diario. Se sumarán a tu próximo estado de cuenta.</p>`;
  }
  if (a.b <= 0) return kv + '<p class="note-line">No tienes saldo que genere intereses en esta tarjeta.</p>' + compras;
  const colMin = `<div class="cmp-col"><p class="label"><span class="lkey" style="background:var(--s2)"></span>Si solo pagas el mínimo</p>
      <p class="cmp-big">${esc(durS(a.sMin))}</p>
      <p class="cmp-sub">${a.sMin.nunca ? 'El mínimo no alcanza a cubrir los intereses.' : `${esc(m0(a.sMin.ti + a.sMin.tv))} de intereses${conIva ? ' e IVA' : ''}${a.sMin.tope ? '' : ' · terminas en ' + esc(fecha(a.sMin.meses))}`}</p></div>`;
  const colTu = !a.sTu
    ? `<div class="cmp-col"><p class="label"><span class="lkey" style="background:var(--s1)"></span>Con tu pago</p><p class="cmp-big">—</p><p class="cmp-sub">Escribe cuánto piensas pagar al mes.</p></div>`
    : `<div class="cmp-col"><p class="label"><span class="lkey" style="background:var(--s1)"></span>Con tu pago de ${esc(m0(a.pago))}</p>
      <p class="cmp-big">${esc(durS(a.sTu))}</p>
      <p class="cmp-sub">${a.sTu.nunca ? 'Tu pago no cubre los intereses: la deuda crece cada mes.' : `${esc(m0(a.sTu.ti + a.sTu.tv))} de intereses${conIva ? ' e IVA' : ''}${a.sTu.tope ? '' : ' · terminas en ' + esc(fecha(a.sTu.meses))}`}</p></div>`;
  let nota = '';
  if (a.sTu && a.pago + 0.005 < a.min) nota = `<p class="note-line">${chip('bad', 'Menor al mínimo')} Tu pago es menor al mínimo de este mes (${esc(m2(a.min))}). El banco te cobraría una comisión por pago tardío.</p>`;
  else if (a.sTu && !a.sTu.nunca && !a.sTu.tope) {
    if (a.sMin.nunca || a.sMin.tope) nota = `<p class="note-line">${chip('good', 'Buen pago')} Con el puro mínimo tardarías décadas. Con tu pago la liquidas en ${esc(dur(a.sTu.meses))}.</p>`;
    else {
      const ahorro = (a.sMin.ti + a.sMin.tv) - (a.sTu.ti + a.sTu.tv), menos = a.sMin.meses - a.sTu.meses;
      if (ahorro > 1) nota = `<p class="note-line">${chip('good', 'Te ahorras ' + m0(ahorro))} en intereses y terminas ${esc(dur(menos))} antes que pagando solo el mínimo.</p>`;
    }
  }
  let meter = '';
  if (a.util != null) {
    const u = a.util, k = u < 0.3 ? 'good' : u < 0.7 ? 'warn' : 'bad';
    const txt = u < 0.3 ? 'Bien: usar menos del 30% ayuda a tu historial de crédito.' : u < 0.7 ? 'Alto: intenta bajarlo a menos del 30%.' : 'Muy alto: estás cerca de tu límite.';
    meter = `<div class="meter"><div class="meter-top"><span>Usas <b>${esc(pct(u))}</b> de tu límite de ${esc(m0(num(c.limite)))}</span>${chip(k, k === 'good' ? 'Sano' : k === 'warn' ? 'Alto' : 'Muy alto')}</div>
      <div class="meter-track ${k}" data-tip="${esc(m0(a.b) + ' de ' + m0(num(c.limite)))}"><div class="meter-fill" style="width:${Math.min(100, u * 100).toFixed(1)}%"></div></div>
      <p class="fld-h">${txt}</p></div>`;
  }
  return kv + `<div class="cmp">${colMin}${colTu}</div>` + nota + compras + meter +
    `<button class="link" type="button" data-sim="${esc(c.id)}">Ver mes a mes en el simulador</button>` +
    (PERSONAL ? `<button class="link" type="button" data-imp="${esc(c.id)}">Actualizar con mi estado de cuenta (PDF)</button>` : '');
}
function avisoPrestamo(p, a){
  if (a.b <= 0) return '<p class="empty">Escribe el saldo pendiente del crédito.</p>';
  const conIva = a.ivaP > 0;
  const kv = `<p class="label">Este mes</p><dl class="kv">
      <div><dt>Interés</dt><dd>${esc(m2(a.i))}</dd></div>
      ${conIva ? `<div><dt>IVA sobre el interés</dt><dd>${esc(m2(a.iv))}</dd></div>` : ''}
      <div><dt>Mensualidad</dt><dd>${esc(m2(num(p.pago)))}</dd></div>
      <div><dt>Lo que baja tu deuda</dt><dd${a.cap < 0 ? ' class="neg"' : ''}>${esc(m2(a.cap))}</dd></div>
    </dl>`;
  if (!a.s) return kv + '<p class="note-line">Escribe tu mensualidad para calcular cuándo terminas.</p>';
  if (a.s.nunca) return kv + `<p class="note-line">${chip('bad', 'No cubre intereses')} Con esta mensualidad la deuda no baja. Revisa que el saldo y la tasa estén bien escritos.</p>`;
  const col1 = `<div class="cmp-col"><p class="label">Con tu mensualidad</p><p class="cmp-big">${esc(durS(a.s))}</p>
    <p class="cmp-sub">${esc(m0(a.s.ti + a.s.tv))} de intereses${conIva ? ' e IVA' : ''} por pagar${a.s.tope ? '' : ' · terminas en ' + esc(fecha(a.s.meses))}</p></div>`;
  const col2 = a.sx
    ? `<div class="cmp-col"><p class="label">Abonando ${esc(m0(num(p.extra)))} extra</p><p class="cmp-big">${esc(durS(a.sx))}</p>
      <p class="cmp-sub">${esc(m0(a.sx.ti + a.sx.tv))} de intereses${conIva ? ' e IVA' : ''}${a.sx.tope ? '' : ' · terminas en ' + esc(fecha(a.sx.meses))}</p></div>`
    : `<div class="cmp-col"><p class="label">Con abono extra</p><p class="cmp-big">—</p><p class="cmp-sub">Escribe un abono extra al mes para ver cuánto te ahorras.</p></div>`;
  let nota = '';
  if (a.sx && !a.s.tope && !a.sx.tope) {
    const ah = (a.s.ti + a.s.tv) - (a.sx.ti + a.sx.tv);
    if (ah > 1) nota = `<p class="note-line">${chip('good', 'Te ahorras ' + m0(ah))} en intereses y terminas ${esc(dur(a.s.meses - a.sx.meses))} antes.</p>`;
  }
  return kv + `<div class="cmp">${col1}${col2}</div>` + nota;
}
function tablaPrestamo(p){
  const el = byId('pr-tabla-' + p.id); if (!el) return;
  const a = analizarPrestamo(p), s = a.sx || a.s;
  if (!s || !s.rows.length) { el.innerHTML = '<p class="empty">Escribe el saldo, la tasa y la mensualidad para ver la tabla.</p>'; return; }
  const conIva = a.ivaP > 0;
  el.innerHTML = `<p class="amort-cap">${a.sx ? `Con tu mensualidad más ${esc(m0(num(p.extra)))} de abono extra` : 'Con tu mensualidad'}${s.rows.length >= 600 ? ' (primeros 50 años)' : ''}</p>
  <div class="table-wrap scroll-y"><table class="tbl"><thead><tr><th class="n">Mes</th><th>Fecha</th><th class="n">Pago</th><th class="n">Interés</th>${conIva ? '<th class="n">IVA</th>' : ''}<th class="n">A capital</th><th class="n">Saldo</th></tr></thead><tbody>` +
    s.rows.map(r => `<tr><td class="n">${r.m}</td><td>${esc(fecha(r.m))}</td><td class="n">${esc(m2(r.p))}</td><td class="n">${esc(m2(r.i))}</td>${conIva ? `<td class="n">${esc(m2(r.iv))}</td>` : ''}<td class="n${r.cap < 0 ? ' neg' : ''}">${esc(m2(r.cap))}</td><td class="n">${esc(m2(r.b))}</td></tr>`).join('') +
    `</tbody></table></div>`;
}
function renderPrestamosOut(AP){
  const tiles = byId('pr-tiles'); if (!tiles) return;
  const deuda = sum(state.prestamos, p => AP.get(p.id).b);
  const pagos = sum(state.prestamos, p => AP.get(p.id).pagoMes);
  const intm = sum(state.prestamos, p => { const a = AP.get(p.id); return a.i + a.iv; });
  const fin = state.prestamos.map(p => AP.get(p.id)).filter(a => a.s && Number.isFinite(a.s.meses)).map(a => (a.sx || a.s).meses);
  tiles.innerHTML = [
    ['Deuda en préstamos', m0(deuda), plural(state.prestamos.filter(p => num(p.saldo) > 0).length, 'crédito activo', 'créditos activos')],
    ['Pagas al mes', m0(pagos), 'Mensualidades más abonos extra'],
    ['Intereses este mes', m0(intm), fin.length ? 'Terminas el último en ' + fecha(Math.max(...fin)) : 'Escribe tus mensualidades']
  ].map(([l, v, s]) => `<div class="tile"><p class="label">${esc(l)}</p><p class="tile-v">${esc(v)}</p><p class="tile-s">${esc(s)}</p></div>`).join('');
  state.prestamos.forEach(p => {
    const el = byId('out-pr-' + p.id); if (el) el.innerHTML = avisoPrestamo(p, AP.get(p.id));
    const d = document.querySelector(`details[data-prest="${CSS.escape(p.id)}"]`);
    if (d && d.open) tablaPrestamo(p);
  });
}

function renderResumen(A, AP){
  const ing = sum(state.ingresos, mensual), gas = sum(state.gastos, mensual);
  const pagosTar = sum(state.tarjetas, c => A.get(c.id).pago);
  const msiTot = sum(state.tarjetas, c => A.get(c.id).msi);
  const pagosPre = PERSONAL ? sum(state.prestamos, p => AP.get(p.id).pagoMes) : 0;
  const deudas = pagosTar + msiTot + pagosPre;
  const libre = ing - gas - deudas;
  const deudaTar = sum(state.tarjetas, c => A.get(c.id).b);
  const msiPend = sum(state.tarjetas, c => A.get(c.id).msiPend);
  const deudaPre = PERSONAL ? sum(state.prestamos, p => AP.get(p.id).b) : 0;
  const intTar = sum(state.tarjetas, c => { const a = A.get(c.id); return a.i + a.iv; });
  const intPre = PERSONAL ? sum(state.prestamos, p => { const a = AP.get(p.id); return a.i + a.iv; }) : 0;
  const minTot = sum(state.tarjetas, c => A.get(c.id).min);
  const ahorro = sum(state.gastos.filter(g => g.cat === 'Ahorro e inversión'), mensual);
  const conLim = state.tarjetas.filter(c => num(c.limite) > 0);
  const limTot = sum(conLim, c => num(c.limite)), deudaLim = sum(conLim, c => A.get(c.id).b);

  byId('r-libre-l').textContent = libre < 0 ? 'Te falta cada mes' : 'Te queda libre cada mes';
  byId('r-libre').textContent = m0(Math.abs(libre));
  let k, t;
  if (ing <= 0) { k = 'warn'; t = 'Agrega tus ingresos'; }
  else if (libre < 0) { k = 'bad'; t = 'Gastas más de lo que ganas'; }
  else if (libre < ing * 0.1) { k = 'warn'; t = 'Margen ajustado'; }
  else { k = 'good'; t = 'Buen margen'; }
  byId('r-libre-chip').innerHTML = chip(k, t);
  const nombreDeudas = PERSONAL ? 'pagos de deudas' : 'pagos de tarjetas';
  byId('r-libre-sub').textContent = libre < 0
    ? `Tus gastos (${m0(gas)}) y ${nombreDeudas} (${m0(deudas)}) suman más que tu ingreso de ${m0(ing)}.`
    : `Es lo que sobra de tu ingreso de ${m0(ing)} después de gastos (${m0(gas)}) y ${nombreDeudas} (${m0(deudas)}).`;

  const total = Math.max(ing, gas + deudas), st = byId('r-stack'), lg = byId('r-stack-legend'), mk = byId('r-stack-mark');
  if (total <= 0) {
    st.innerHTML = ''; st.classList.add('is-empty'); mk.innerHTML = '';
    lg.innerHTML = '<li class="muted">Agrega ingresos y gastos en Presupuesto para ver esta barra.</li>';
  } else {
    st.classList.remove('is-empty');
    const segs = (PERSONAL
      ? [['Gastos', gas, '--s1'], ['Tarjetas y meses', pagosTar + msiTot, '--s2'], ['Préstamos', pagosPre, '--s4'], ['Te queda libre', Math.max(0, libre), '--s3']]
      : [['Gastos', gas, '--s1'], ['Pagos a tarjetas', pagosTar, '--s2'], ['Te queda libre', Math.max(0, libre), '--s3']]).filter(x => x[1] > 0);
    st.innerHTML = segs.map(([n, v, c]) => `<span class="st-seg" style="flex:${v.toFixed(2)} 1 0;background:var(${c})" data-tip="${esc(n + ': ' + m0(v) + (ing > 0 ? ' (' + pct(v / ing) + ' de tu ingreso)' : ''))}"></span>`).join('');
    mk.innerHTML = libre < 0 && ing > 0 ? `<span class="st-mark" style="left:${(ing / total * 100).toFixed(2)}%"><span>Tu ingreso</span></span>` : '';
    lg.innerHTML = segs.map(([n, v, c]) => `<li><span class="sw" style="background:var(${c})"></span>${esc(n)} <b>${esc(m0(v))}</b>${ing > 0 ? `<span class="muted">${esc(pct(v / ing))}</span>` : ''}</li>`).join('') +
      (libre < 0 ? `<li><span class="sw sw-mark"></span>Te faltan <b>${esc(m0(-libre))}</b></li>` : '');
  }

  const nIng = state.ingresos.filter(x => num(x.monto) > 0).length;
  const nTar = state.tarjetas.filter(c => num(c.saldo) > 0).length;
  const libreAh = ahorro + Math.max(0, libre);
  const intMes = intTar + intPre;
  const tiles = [
    ['Ingresos al mes', m0(ing), nIng ? plural(nIng, 'fuente de ingreso', 'fuentes de ingreso') : 'Sin ingresos registrados'],
    ['Gastos al mes', m0(gas), ing > 0 ? pct(gas / ing) + ' de tu ingreso' : 'Sin ingresos para comparar'],
    PERSONAL
      ? ['Pagos de deudas', m0(deudas), `Tarjetas ${m0(pagosTar)} · meses ${m0(msiTot)} · préstamos ${m0(pagosPre)}`]
      : ['Pagos a tarjetas', m0(pagosTar), 'Los mínimos suman ' + m0(minTot)],
    PERSONAL
      ? ['Deuda total', m0(deudaTar + msiPend + deudaPre), `Tarjetas ${m0(deudaTar)} · meses ${m0(msiPend)} · préstamos ${m0(deudaPre)}`]
      : ['Deuda en tarjetas', m0(deudaTar), limTot > 0 ? 'Usas ' + pct(deudaLim / limTot) + ' de tus límites' : plural(nTar, 'tarjeta con saldo', 'tarjetas con saldo')],
    ['Intereses este mes', m0(intMes), intMes > 0 ? 'Unos ' + m0(intMes * 12) + ' al año si la deuda no baja' : 'No pagas intereses'],
    ['Ahorro al mes', m0(libreAh), ing > 0 ? pct(libreAh / ing) + ' de tu ingreso, contando lo que te queda libre' : 'Ahorro programado más lo que queda libre']
  ];
  byId('r-tiles').innerHTML = tiles.map(([l, v, s]) => `<div class="tile"><p class="label">${esc(l)}</p><p class="tile-v">${esc(v)}</p><p class="tile-s">${esc(s)}</p></div>`).join('');

  const cats = new Map();
  state.gastos.forEach(g => { const v = mensual(g); if (v > 0) cats.set(g.cat, (cats.get(g.cat) || 0) + v); });
  const lista = Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  const maxC = lista.length ? lista[0][1] : 0;
  byId('r-cats').innerHTML = lista.length ? lista.map(([n, v]) => `<div class="hb">
      <span class="hb-name">${esc(n)}</span>
      <span class="hb-track"><span class="hb-bar" style="width:calc((100% - 8.5rem) * ${(v / maxC).toFixed(4)})" data-tip="${esc(n + ': ' + m2(v) + ' al mes · ' + pct(v / gas) + ' de tus gastos')}"></span><span class="hb-val">${esc(m0(v))} <span>${esc(pct(v / gas))}</span></span></span>
    </div>`).join('') : '<p class="empty">Agrega tus gastos en la pestaña Presupuesto.</p>';

  const real = byId('r-real');
  if (real) {
    const ym = ymDe(hoy()), g = sum(state.movimientos.filter(m => m.fecha.slice(0, 7) === ym), m => num(m.monto));
    real.innerHTML = `En tu registro diario llevas <b>${esc(m0(g))}</b> gastados este mes${gas > 0 ? ` de <b>${esc(m0(gas))}</b> presupuestados (${esc(pct(g / gas))})` : ''}. <button class="link" type="button" data-go="diario">Ver registro diario</button>`;
  }

  const tb = byId('r-cards');
  if (!state.tarjetas.length) tb.innerHTML = '<tbody><tr><td class="empty">Agrega una tarjeta en la pestaña Tarjetas.</td></tr></tbody>';
  else tb.innerHTML = `<thead><tr><th>Tarjeta</th><th class="n">Saldo</th><th class="n">Tasa anual</th><th class="n">Interés del mes</th><th class="n">La liquidas en</th><th>Estado</th></tr></thead><tbody>` +
    state.tarjetas.map(c => { const a = A.get(c.id), e = estadoTarjeta(a); return `<tr>
      <td class="tn">${esc(c.nombre || 'Sin nombre')}</td><td class="n">${esc(m0(a.b))}</td><td class="n">${esc(tasaTxt(c.tasa))}</td>
      <td class="n">${esc(m2(a.i + a.iv))}</td><td class="n">${a.b <= 0 ? '—' : a.sTu ? esc(durS(a.sTu)) : '—'}</td><td>${chip(e[0], e[1])}</td></tr>`; }).join('') + '</tbody>';

  const cara = state.tarjetas.filter(c => num(c.saldo) > 0).sort((x, y) => num(y.tasa) - num(x.tasa))[0];
  const ins = byId('r-insight');
  if (cara && num(cara.tasa) > 0) {
    const costo = 1000 * num(cara.tasa) / 1200 * (1 + num(state.iva) / 100);
    ins.innerHTML = `Tu tarjeta más cara es <b>${esc(cara.nombre || 'sin nombre')}</b>: con ${esc(tasaTxt(cara.tasa))} anual, cada ${esc(m0(1000))} que le debes te cuesta <b>${esc(m2(costo))}</b> de intereses al mes.`;
    ins.hidden = false;
  } else ins.hidden = true;

  const tp = byId('r-prest');
  if (tp) {
    if (!state.prestamos.length) tp.innerHTML = '<tbody><tr><td class="empty">No tienes préstamos registrados.</td></tr></tbody>';
    else tp.innerHTML = `<thead><tr><th>Crédito</th><th class="n">Saldo</th><th class="n">Tasa anual</th><th class="n">Mensualidad</th><th class="n">Te falta</th><th class="n">Terminas en</th></tr></thead><tbody>` +
      state.prestamos.map(p => { const a = AP.get(p.id), s = a.sx || a.s; return `<tr>
        <td class="tn">${esc(p.nombre || 'Sin nombre')}</td><td class="n">${esc(m0(a.b))}</td><td class="n">${esc(tasaTxt(p.tasa))}</td><td class="n">${esc(m0(num(p.pago)))}</td>
        <td class="n">${s ? esc(durS(s)) : '—'}</td><td class="n">${s && Number.isFinite(s.meses) ? esc(fecha(s.meses)) : '—'}</td></tr>`; }).join('') + '</tbody>';
  }
}
function renderTotalesPresupuesto(){
  const ing = sum(state.ingresos, mensual), gas = sum(state.gastos, mensual);
  byId('p-ing-total').innerHTML = `${esc(m0(ing))} <small>al mes</small>`;
  byId('p-gas-total').innerHTML = `${esc(m0(gas))} <small>al mes</small>`;
  const d = ing - gas;
  byId('p-balance').innerHTML = d >= 0
    ? `Ingresos menos gastos: <b>${esc(m0(d))}</b> al mes, antes de pagar tus ${PERSONAL ? 'deudas' : 'tarjetas'}.`
    : `Tus gastos superan tus ingresos por <b>${esc(m0(-d))}</b> al mes, sin contar ${PERSONAL ? 'tus deudas' : 'las tarjetas'}.`;
}
function renderMsi(){
  state.tarjetas.forEach(c => {
    (c.msi || []).forEach(p => { const n = byId('msi-note-' + p.id); if (n) n.textContent = msiNota(p); });
    const t = byId('msi-tot-' + c.id);
    if (t) { const mes = msiMes(c), pend = msiPendiente(c); t.textContent = pend > 0 ? `Este mes: ${m2(mes)} · te faltan ${m0(pend)}` : ''; }
  });
  const el = byId('t-msi-chart'); if (!el) return;
  const pr = msiProyeccion(12), pend = sum(state.tarjetas, msiPendiente);
  if (pend <= 0) {
    el._draw = null; el.style.minHeight = '0';
    el.innerHTML = '<p class="empty">No tienes compras a meses sin intereses. Agrégalas en cada tarjeta.</p>';
    byId('t-msi-sum').textContent = ''; return;
  }
  el.style.minHeight = '190px';
  colChart(el, pr.map(x => ({ label:ymCorto(x.mes), v:x.tot, tip:ymTxt(x.mes) + ': ' + m0(x.tot) + x.det.map(d => '\n' + d[0] + ': ' + m0(d[1])).join('') })), { v:'--s2', h:190, aria:'Mensualidades a meses sin intereses de los próximos 12 meses' });
  byId('t-msi-sum').textContent = `Este mes pagas ${m0(pr[0].tot)} en mensualidades a meses. En total te faltan ${m0(pend)}.`;
}
function renderPagos(A){
  const el = byId('r-pagos'); if (!el) return;
  const h = hoy(), items = [];
  state.tarjetas.forEach(c => {
    if (!c.diaPago) return;
    const a = A.get(c.id); if (a.b <= 0 && !a.msi) return;
    const corte = c.diaCorte ? proximoVenc(c.diaCorte, '') : null;
    items.push({ tipo:'tarjeta', id:c.id, nombre:c.nombre || 'Tarjeta', f:proximoVenc(c.diaPago, c.pagadoHasta), ph:c.pagadoHasta,
      meta:`Para no generar intereses: ${m0(a.b + a.msi)} · Mínimo: ${m0(a.min + a.msi)}` + (corte ? ` · Próximo corte: ${fechaCorta(corte)}` : '') });
  });
  state.prestamos.forEach(p => {
    if (!p.diaPago || num(p.saldo) <= 0) return;
    items.push({ tipo:'prestamo', id:p.id, nombre:p.nombre || 'Préstamo', f:proximoVenc(p.diaPago, p.pagadoHasta), ph:p.pagadoHasta,
      meta:`Mensualidad: ${m0(num(p.pago))}` + (num(p.extra) ? ` + abono extra ${m0(num(p.extra))}` : '') });
  });
  items.sort((a, b) => a.f - b.f);
  if (!items.length) { el.innerHTML = '<p class="empty">Escribe el día límite de pago de tus tarjetas y préstamos para ver aquí qué pagos se acercan.</p>'; return; }
  const deshacer = items.filter(it => it.ph && (h - parseISO(it.ph)) / 86400000 < 40);
  el.innerHTML = '<ul class="pagos">' + items.map(it => {
    const dias = Math.round((it.f - h) / 86400000);
    const k = dias <= 2 ? 'bad' : dias <= 7 ? 'warn' : '';
    const txt = dias === 0 ? 'Vence hoy' : dias === 1 ? 'Vence mañana' : `En ${dias} días`;
    return `<li class="pago"><div class="pago-fecha"><b>${it.f.getDate()}</b><span>${esc(mesCorto(it.f))}</span></div>
      <div><p class="o-name">${esc(it.nombre)}</p><p class="o-meta">${esc(it.meta)}</p></div>
      <div class="pago-s">${k ? chip(k, txt) : `<span class="muted">${esc(txt)}</span>`}<button class="btn-quiet" type="button" data-pagado="${it.tipo}|${esc(it.id)}|${isoDia(it.f)}">Ya pagué</button></div></li>`;
  }).join('') + '</ul>' +
  deshacer.map(it => `<p class="fld-h">Marcaste como pagado ${esc(it.nombre)} (${esc(fechaCorta(parseISO(it.ph)))}). <button class="link" type="button" data-deshacer="${it.tipo}|${esc(it.id)}">Deshacer</button></p>`).join('');
}

/* registro diario */
let diarioMes = ymDe(hoy());
function metodoTxt(m){
  if (m === 'efectivo') return 'Efectivo';
  if (m === 'debito') return 'Débito o transferencia';
  const c = state.tarjetas.find(t => t.id === m);
  return c ? (c.nombre || 'Tarjeta') : 'Tarjeta que ya quitaste';
}
function renderDiario(){
  const sel = byId('d-metodo'); if (!sel) return;
  const prev = sel.value || 'debito';
  sel.innerHTML = opts([['efectivo', 'Efectivo'], ['debito', 'Débito o transferencia']].concat(state.tarjetas.map(c => [c.id, c.nombre || 'Tarjeta sin nombre'])), prev);
  if (!sel.value) sel.value = 'debito';
  const ic = byId('imp-cuenta'), icPrev = ic.value;
  ic.innerHTML = opts(state.tarjetas.map(c => [c.id, c.nombre || 'Tarjeta sin nombre']).concat([['debito', 'Cuenta de débito o nómina']]), icPrev);
  if (!ic.value) ic.selectedIndex = 0;
  const fd = byId('d-fecha'); if (!fd.value) fd.value = isoDia(hoy());
  byId('d-mes').textContent = ymTxt(diarioMes);

  const movs = state.movimientos.filter(m => m.fecha.slice(0, 7) === diarioMes).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const gastado = sum(movs, m => num(m.monto));
  const pres = sum(state.gastos, mensual);
  const p = diarioMes.split('-').map(Number), dim = diasMes(p[0], p[1] - 1);
  const actual = diarioMes === ymDe(hoy()), futuro = diarioMes > ymDe(hoy());
  const trans = actual ? hoy().getDate() : dim;
  const conTarjeta = sum(movs.filter(m => state.tarjetas.some(c => c.id === m.metodo)), m => num(m.monto));
  const queda = pres - gastado;
  byId('d-tiles').innerHTML = [
    ['Gastado', m0(gastado), plural(movs.length, 'movimiento', 'movimientos') + (conTarjeta ? ` · ${m0(conTarjeta)} con tarjeta` : '')],
    ['Presupuesto del mes', m0(pres), 'Tus gastos planeados en Presupuesto'],
    [queda >= 0 ? 'Te queda' : 'Te pasaste por', m0(Math.abs(queda)), pres > 0 ? pct(gastado / pres) + ' del presupuesto usado' : 'Sin presupuesto para comparar'],
    actual ? ['Al ritmo de hoy', m0(trans ? gastado / trans * dim : 0), 'Lo que gastarías al cerrar el mes'] : ['Promedio por día', m0(futuro ? 0 : gastado / dim), 'Gasto del mes entre ' + dim + ' días']
  ].map(([l, v, s]) => `<div class="tile"><p class="label">${esc(l)}</p><p class="tile-v">${esc(v)}</p><p class="tile-s">${esc(s)}</p></div>`).join('');

  const pc = new Map(), gc = new Map();
  state.gastos.forEach(g => { const v = mensual(g); if (v > 0) pc.set(g.cat, (pc.get(g.cat) || 0) + v); });
  movs.forEach(m => gc.set(m.cat, (gc.get(m.cat) || 0) + num(m.monto)));
  const cats = CATS.filter(c => pc.has(c) || gc.has(c)).sort((a, b) => (pc.get(b) || 0) - (pc.get(a) || 0) || (gc.get(b) || 0) - (gc.get(a) || 0));
  byId('d-cats').innerHTML = cats.length ? cats.map(c => {
    const pr = pc.get(c) || 0, g = gc.get(c) || 0, r = pr > 0 ? g / pr : (g > 0 ? 2 : 0);
    const k = pr <= 0 ? 'warn' : r > 1 ? 'bad' : r >= 0.8 ? 'warn' : 'good';
    const ch = pr <= 0 ? chip('warn', 'Sin presupuesto') : r > 1 ? chip('bad', 'Te pasaste por ' + m0(g - pr)) : r >= 0.8 ? chip('warn', 'Casi al límite') : '';
    return `<div class="catrow"><div class="meter-top"><span><b>${esc(c)}</b> · ${esc(m0(g))}${pr > 0 ? ' de ' + esc(m0(pr)) : ''}</span>${ch}</div>
      <div class="meter-track ${k}"><div class="meter-fill" style="width:${Math.min(100, r * 100).toFixed(1)}%"></div></div></div>`;
  }).join('') : '<p class="empty">Agrega tus gastos planeados en Presupuesto para comparar.</p>';

  byId('d-count').textContent = movs.length ? plural(movs.length, 'movimiento', 'movimientos') : '';
  const grupos = new Map();
  movs.forEach(m => { if (!grupos.has(m.fecha)) grupos.set(m.fecha, []); grupos.get(m.fecha).push(m); });
  byId('d-lista').innerHTML = grupos.size ? Array.from(grupos.entries()).map(([f, ms]) => `<div class="dia">
      <p class="dia-h"><span>${esc(diaTxt(f))}</span><b>${esc(m0(sum(ms, m => num(m.monto))))}</b></p>
      <ul class="movs">${ms.map(m => `<li class="mov"><div class="mov-t"><p class="mov-c">${esc(m.nota || m.cat)}</p><p class="mov-n">${esc((m.nota ? m.cat + ' · ' : '') + metodoTxt(m.metodo))}</p></div><span class="mov-m">${esc(m2(m.monto))}</span><button class="icon-btn" type="button" data-delmov="${esc(m.id)}" aria-label="Borrar ${esc(m.nota || m.cat)}">×</button></li>`).join('')}</ul>
    </div>`).join('') : `<p class="empty">No hay gastos anotados en ${esc(ymTxt(diarioMes))}.</p>`;
}

/* simulador */
const sim = { fuente:null, saldo:0, tasa:0, iva:0, minTipo:'int', minPct:1.5, minFijo:200, pago:0, meta:12, tabla:'tu' };
const SIM_KEYS = { 's-saldo':'saldo', 's-tasa':'tasa', 's-iva':'iva', 's-mintipo':'minTipo', 's-minpct':'minPct', 's-minfijo':'minFijo', 's-pago':'pago', 's-meta':'meta' };
function simDesdeTarjeta(id){
  const c = state.tarjetas.find(t => t.id === id);
  if (!c) return false;
  Object.assign(sim, { fuente:id, saldo:num(c.saldo), tasa:num(c.tasa), iva:num(state.iva), minTipo:c.minTipo, minPct:Number(c.minPct) || 0, minFijo:Number(c.minFijo) || 0, pago:num(c.pago) });
  return true;
}
function simInputs(){
  byId('s-saldo').value = sim.saldo || ''; byId('s-tasa').value = sim.tasa || ''; byId('s-iva').value = sim.iva || '';
  byId('s-mintipo').value = sim.minTipo; byId('s-minpct').value = sim.minPct || ''; byId('s-minfijo').value = sim.minFijo || '';
  byId('s-pago').value = sim.pago || ''; byId('s-meta').value = sim.meta || '';
}
function renderSimFuente(){
  const sel = byId('s-fuente');
  if (sim.fuente && sim.fuente !== 'propio' && !state.tarjetas.some(c => c.id === sim.fuente)) sim.fuente = null;
  if (!sim.fuente) {
    const first = state.tarjetas.find(c => num(c.saldo) > 0) || state.tarjetas[0];
    if (!first || !simDesdeTarjeta(first.id)) Object.assign(sim, { fuente:'propio', saldo:redondo(20000 * (PAISES[state.pais] || PAISES.MX).f), tasa:45, iva:num(state.iva), pago:redondo(1500 * (PAISES[state.pais] || PAISES.MX).f) });
    simInputs();
  }
  sel.innerHTML = state.tarjetas.map(c => `<option value="${esc(c.id)}">${esc(c.nombre || 'Sin nombre')}</option>`).join('') + '<option value="propio">Valores propios</option>';
  sel.value = sim.fuente;
}
function renderSim(){
  const c = { saldo:sim.saldo, tasa:sim.tasa, minTipo:sim.minTipo, minPct:sim.minPct, minFijo:sim.minFijo };
  const conIva = num(sim.iva) > 0;
  const sMin = simular(c, sim.iva, 'min');
  const sTu = num(sim.pago) > 0 ? simular(c, sim.iva, 'fijo', sim.pago) : null;
  const cell = (s, f) => s ? f(s) : '—';
  const fin = s => s.nunca || s.tope ? '—' : fecha(s.meses);
  byId('s-cmp').innerHTML = `<thead><tr><th></th><th class="n"><span class="lkey" style="background:var(--s2)"></span> Solo el mínimo</th><th class="n"><span class="lkey" style="background:var(--s1)"></span> Tu pago</th></tr></thead><tbody>
    <tr><td>Pago del primer mes</td><td class="n">${esc(m2(sMin.rows[0] ? sMin.rows[0].p : 0))}</td><td class="n">${esc(cell(sTu, s => m2(s.rows[0] ? s.rows[0].p : 0)))}</td></tr>
    <tr><td>Tiempo para liquidar</td><td class="n">${esc(durS(sMin))}</td><td class="n">${esc(cell(sTu, durS))}</td></tr>
    <tr><td>${conIva ? 'Intereses + IVA' : 'Intereses'}</td><td class="n">${esc(sMin.nunca ? '—' : m2(sMin.ti + sMin.tv))}</td><td class="n">${esc(cell(sTu, s => s.nunca ? '—' : m2(s.ti + s.tv)))}</td></tr>
    <tr><td>Total que pagas</td><td class="n">${esc(sMin.nunca ? '—' : m2(sMin.tp))}</td><td class="n">${esc(cell(sTu, s => s.nunca ? '—' : m2(s.tp)))}</td></tr>
    <tr><td>Terminas en</td><td class="n">${esc(fin(sMin))}</td><td class="n">${esc(cell(sTu, fin))}</td></tr></tbody>`;

  const v = byId('s-verdict');
  const minHoy = sMin.rows[0] ? sMin.rows[0].p : 0;
  if (!num(sim.saldo)) v.innerHTML = '<p class="muted">Escribe un saldo para simular.</p>';
  else if (!sTu) v.innerHTML = '<p class="muted">Escribe tu pago mensual para compararlo con el mínimo.</p>';
  else if (sTu.nunca) v.innerHTML = `${chip('bad', 'La deuda crece')} <span>Con ${esc(m2(sim.pago))} al mes no cubres ni los intereses (${esc(m2(sTu.rows[0].i + sTu.rows[0].iv))}). Necesitas pagar más.</span>`;
  else if (sim.pago + 0.005 < minHoy) v.innerHTML = `${chip('bad', 'Menor al mínimo')} <span>Tu pago es menor que el mínimo de ${esc(m2(minHoy))}. El banco te cobraría comisión por pago tardío.</span>`;
  else if (sMin.nunca || sMin.tope) v.innerHTML = `${chip('good', 'Buen pago')} <span>Pagando solo el mínimo tardarías más de 50 años. Con ${esc(m2(sim.pago))} al mes terminas en ${esc(dur(sTu.meses))}.</span>`;
  else {
    const ah = (sMin.ti + sMin.tv) - (sTu.ti + sTu.tv);
    v.innerHTML = ah > 1
      ? `${chip('good', 'Te ahorras ' + m0(ah))} <span>de intereses y terminas ${esc(dur(sMin.meses - sTu.meses))} antes que pagando solo el mínimo.</span>`
      : '<span>Tu pago es casi igual al mínimo.</span>';
  }

  const d0 = num(sim.saldo), serie = s => [d0].concat(s.rows.map(r => r.b));
  const series = [], sims = [];
  if (sTu) { series.push({ name:'Tu pago', v:'--s1', data:serie(sTu) }); sims.push(sTu); }
  series.push({ name:'Solo el mínimo', v:'--s2', data:serie(sMin) }); sims.push(sMin);
  lineChart(byId('s-chart'), series, {
    aria:'Saldo pendiente mes a mes con tu pago y con el pago mínimo',
    endLabel:(i, trunc) => trunc ? 'Sigue después de 30 años' : (sims[i].nunca ? 'No baja' : durS(sims[i]))
  });
  const note = byId('s-chart-note');
  if (sMin.rows.length > 360) { note.hidden = false; note.textContent = 'La gráfica muestra hasta 30 años. Con el pago mínimo la deuda sigue después de eso.'; }
  else note.hidden = true;

  const n = Math.max(1, Math.min(360, Math.round(Number(sim.meta) || 12)));
  const need = Math.ceil(pagoPara(sim.saldo, sim.tasa, sim.iva, n) * 100) / 100;
  const mo = byId('s-meta-out'), mu = byId('s-meta-use');
  if (!num(sim.saldo)) { mo.textContent = 'Escribe un saldo para calcularlo.'; mu.hidden = true; }
  else {
    mu.hidden = false; mu.dataset.pago = need;
    mo.innerHTML = `Para terminar en ${esc(dur(n))} necesitas pagar <b>${esc(m2(need))}</b> al mes. Pagarías ${esc(m0(need * n - num(sim.saldo)))} de intereses${conIva ? ' e IVA' : ''}.` +
      (need + 0.005 < minHoy ? ` Es menos que el mínimo de este mes (${esc(m2(minHoy))}), así que el banco te pedirá al menos el mínimo.` : '');
  }

  $$('[data-tabla]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tabla === sim.tabla)));
  const s = sim.tabla === 'min' ? sMin : sTu;
  const tb = byId('s-table');
  if (!s || !s.rows.length) { tb.innerHTML = `<tbody><tr><td class="empty">${sim.tabla === 'tu' ? 'Escribe tu pago mensual para ver la tabla.' : 'Escribe un saldo para ver la tabla.'}</td></tr></tbody>`; return; }
  const tCap = sum(s.rows, r => r.cap);
  tb.innerHTML = `<thead><tr><th class="n">Mes</th><th>Fecha</th><th class="n">Pago</th><th class="n">Interés</th>${conIva ? '<th class="n">IVA</th>' : ''}<th class="n">A tu deuda</th><th class="n">Saldo</th></tr></thead><tbody>` +
    s.rows.map(r => `<tr><td class="n">${r.m}</td><td>${esc(fecha(r.m))}</td><td class="n">${esc(m2(r.p))}</td><td class="n">${esc(m2(r.i))}</td>${conIva ? `<td class="n">${esc(m2(r.iv))}</td>` : ''}<td class="n${r.cap < 0 ? ' neg' : ''}">${esc(m2(r.cap))}</td><td class="n">${esc(m2(r.b))}</td></tr>`).join('') +
    `</tbody><tfoot><tr><td colspan="2">Total</td><td class="n">${esc(m2(s.tp))}</td><td class="n">${esc(m2(s.ti))}</td>${conIva ? `<td class="n">${esc(m2(s.tv))}</td>` : ''}<td class="n">${esc(m2(tCap))}</td><td class="n">${esc(m2(s.rows[s.rows.length - 1].b))}</td></tr></tfoot>`;
}

/* plan */
function renderPlan(A){
  const cards = state.tarjetas.filter(c => num(c.saldo) > 0);
  const sumPagos = sum(cards, c => num(c.pago)), sumMin = sum(cards, c => A.get(c.id).min);
  const inp = byId('pl-presupuesto'), auto = state.plan.presupuesto == null;
  const pres = auto ? sumPagos : state.plan.presupuesto;
  if (document.activeElement !== inp) inp.value = pres ? String(Math.round(pres * 100) / 100) : '';
  byId('pl-auto').hidden = auto;
  byId('pl-hint').innerHTML = `Tus pagos planeados suman <b>${esc(m0(sumPagos))}</b>. Los pagos mínimos de este mes suman <b>${esc(m0(sumMin))}</b>.${PERSONAL ? ' Las mensualidades a meses sin intereses van aparte.' : ''}`;
  const body = byId('pl-body'), empty = byId('pl-empty');
  if (!cards.length) { body.hidden = true; empty.hidden = false; return; }
  body.hidden = false; empty.hidden = true;

  const av = planear(cards, state.iva, pres, 'avalancha'), bn = planear(cards, state.iva, pres, 'bola');
  const warn = byId('pl-warn');
  if (pres + 0.5 < sumMin) { warn.hidden = false; warn.textContent = `Con ${m0(pres)} no alcanzas a cubrir los pagos mínimos (${m0(sumMin)}). El banco te cobraría comisiones. Sube tu presupuesto al menos a ${m0(sumMin)}.`; }
  else if (!Number.isFinite(av.meses)) { warn.hidden = false; warn.textContent = `Con ${m0(pres)} al mes la deuda no termina de bajar: los intereses se comen casi todo tu pago. Prueba con un monto mayor.`; }
  else warn.hidden = true;

  const tarjeta = (key, titulo, regla, r, otro) => {
    const on = state.plan.metodo === key, ok = Number.isFinite(r.meses);
    const mejor = ok && Number.isFinite(otro.meses) && r.ti < otro.ti - 0.5;
    return `<article class="method${on ? ' on' : ''}">
      <div class="method-head"><h3>${titulo}</h3>${mejor ? chip('good', 'Menos intereses') : ''}</div>
      <p>${regla}</p>
      <dl class="kv kv-3">
        <div><dt>Sin deudas en</dt><dd>${esc(ok ? dur(r.meses) : 'No alcanza')}</dd></div>
        <div><dt>Fecha</dt><dd>${esc(ok ? fecha(r.meses) : '—')}</dd></div>
        <div><dt>Intereses totales</dt><dd>${esc(ok ? m0(r.ti) : '—')}</dd></div>
      </dl>
      <button class="btn-quiet" type="button" data-metodo="${key}" aria-pressed="${on}">${on ? 'Viendo este orden' : 'Ver este orden'}</button>
    </article>`;
  };
  byId('pl-methods').innerHTML =
    tarjeta('avalancha', 'Avalancha', 'Primero la tarjeta con la <b>tasa más alta</b>. Es la forma de pagar menos intereses en total.', av, bn) +
    tarjeta('bola', 'Bola de nieve', 'Primero la tarjeta con el <b>saldo más pequeño</b>. Liquidas tarjetas más rápido y eso ayuda a no rendirse.', bn, av);

  const mins = cards.map(c => A.get(c.id).sMin);
  const baseNunca = mins.some(s => s.nunca || s.tope);
  const baseMeses = Math.max(...mins.map(s => s.meses)), baseInt = sum(mins, s => s.ti + s.tv);
  const mejor = [av, bn].filter(r => Number.isFinite(r.meses)).sort((a, b) => a.ti - b.ti)[0];
  let base = baseNunca
    ? 'Si solo pagaras los mínimos, tardarías más de 50 años en salir de tus tarjetas.'
    : `Si solo pagaras los mínimos, tardarías <b>${esc(dur(baseMeses))}</b> y pagarías <b>${esc(m0(baseInt))}</b> de intereses.`;
  if (mejor && !baseNunca && baseInt - mejor.ti > 1) base += ` Con este plan te ahorras <b>${esc(m0(baseInt - mejor.ti))}</b>.`;
  if (Number.isFinite(av.meses) && Number.isFinite(bn.meses) && Math.abs(av.ti - bn.ti) <= 0.5) base += ' Con tus tarjetas, los dos métodos dan casi el mismo resultado.';
  byId('pl-base').innerHTML = base;

  lineChart(byId('pl-chart'), [{ name:'Avalancha', v:'--s1', data:av.serie }, { name:'Bola de nieve', v:'--s2', data:bn.serie }],
    { aria:'Deuda total mes a mes con los métodos avalancha y bola de nieve', after:() => 'Sin deudas' });

  const r = state.plan.metodo === 'bola' ? bn : av;
  byId('pl-orden-t').textContent = 'Orden de pago · ' + (state.plan.metodo === 'bola' ? 'bola de nieve' : 'avalancha');
  byId('pl-orden').innerHTML = r.orden.map((o, i) => {
    const c = state.tarjetas.find(t => t.id === o.id) || {};
    return `<li><span class="o-n">${i + 1}</span>
      <div><p class="o-name">${esc(c.nombre || 'Sin nombre')}</p>
      <p class="o-meta">${esc(m0(num(c.saldo)))} · ${esc(tasaTxt(c.tasa))} anual · ${esc(m0(o.ti))} de intereses${o.fin != null ? ' · la liquidas en el mes ' + o.fin : ''}</p></div>
      ${o.fin != null ? `<span class="stamp">Pagada<small>${esc(fecha(o.fin))}</small></span>` : chip('bad', 'No se liquida')}</li>`;
  }).join('');
}

/* cuenta y datos */
function renderCuenta(){
  const el = byId('cuenta'); if (!el) return;
  const e = drive.estado, visto = !!local.get(LS_DRIVE);
  let s, txt, btn = '';
  if (e === 'ok') { s = drive.guardando ? 'saving' : 'cuenta'; txt = drive.guardando ? 'Guardando en Drive…' : 'Guardado en tu Google Drive'; }
  else if (e === 'conectando') { s = 'saving'; txt = 'Conectando con Google…'; }
  else if (e === 'expirado') { s = 'warn'; txt = 'Tu sesión de Google venció'; btn = `<button class="btn-g" type="button" data-drive="conectar">${ICONO_DRIVE}Reconectar</button>`; }
  else if (e === 'error') { s = 'error'; txt = 'No se pudo guardar en Drive'; btn = `<button class="btn-g" type="button" data-drive="conectar">${ICONO_DRIVE}Reintentar</button>`; }
  else {
    s = local.ok ? 'local' : 'none';
    txt = local.ok ? 'Guardado en este navegador' : 'Este navegador no permite guardar';
    if (e === 'off') btn = `<button class="btn-g" type="button" data-drive="conectar">${ICONO_DRIVE}${visto ? 'Sincronizar con Google Drive' : 'Guardar en Google Drive'}</button>`;
  }
  el.innerHTML = `<span class="save" data-s="${s}" role="status">${esc(txt)}</span>${btn}`;
  const conectado = e === 'ok' || e === 'expirado' || e === 'error';
  byId('btn-desconectar').hidden = !conectado;
  byId('btn-borrar-drive').hidden = e !== 'ok';
  byId('btn-recuperar').hidden = !local.get(LS_RESPALDO);
  byId('datos-donde').textContent = e === 'ok'
    ? 'Tus datos están en este navegador y en una carpeta oculta de tu Google Drive que solo esta app puede abrir. Nadie más los ve, tampoco quien hizo la app. Si usas la app en otro dispositivo, conecta la misma cuenta de Google.'
    : e === 'sin-config'
      ? 'Tus datos se guardan solo en este navegador. Si lo limpias o cambias de dispositivo, los pierdes: descarga un respaldo de vez en cuando.'
      : 'Tus datos se guardan solo en este navegador. Si lo limpias o cambias de dispositivo, los pierdes. Guárdalos en tu Google Drive o descarga un respaldo.';
}
function descargar(nombre, contenido, tipo){
  const url = URL.createObjectURL(new Blob([contenido], { type:tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function descargarCSV(){
  const movs = state.movimientos.filter(m => m.fecha.slice(0, 7) === diarioMes).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if (!movs.length) { toast('No hay gastos anotados en ' + ymTxt(diarioMes) + '.'); return; }
  const q = v => '"' + String(v).replace(/"/g, '""') + '"';
  const filas = [['Fecha', 'Categoría', 'Nota', 'Pagado con', 'Monto']].concat(movs.map(m => [m.fecha, m.cat, m.nota, metodoTxt(m.metodo), num(m.monto).toFixed(2)]));
  descargar('gastos-' + diarioMes + '.csv', '\ufeff' + filas.map(f => f.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
}
function descargarICS(){
  const items = state.tarjetas.filter(c => c.diaPago).map(c => ({ id:c.id, dia:c.diaPago, nombre:c.nombre || 'tarjeta' }))
    .concat(state.prestamos.filter(p => p.diaPago && num(p.saldo) > 0).map(p => ({ id:p.id, dia:p.diaPago, nombre:p.nombre || 'préstamo' })));
  if (!items.length) { toast('Primero escribe el día límite de pago de tus tarjetas o préstamos.'); return; }
  const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cuentas Claras//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  items.forEach(it => {
    const f = proximoVenc(it.dia, ''), sig = new Date(f); sig.setDate(sig.getDate() + 1);
    const dias = []; for (let d = 28; d <= it.dia; d++) dias.push(d);
    const rr = it.dia > 28 ? `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dias.join(',')};BYSETPOS=-1` : `RRULE:FREQ=MONTHLY;BYMONTHDAY=${it.dia}`;
    L.push('BEGIN:VEVENT', `UID:${it.id}-pago@cuentas-claras`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${isoDia(f).replace(/-/g, '')}`, `DTEND;VALUE=DATE:${isoDia(sig).replace(/-/g, '')}`, rr,
      `SUMMARY:${icsEsc('Pagar ' + it.nombre)}`,
      `DESCRIPTION:${icsEsc('Fecha límite de pago. Revisa el monto en Cuentas Claras o en tu estado de cuenta.')}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Pagar ' + it.nombre)}`, 'TRIGGER:-P1DT15H', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  descargar('cuentas-claras-pagos.ics', L.join('\r\n'), 'text/calendar;charset=utf-8');
  toast('Abre el archivo descargado para agregar los recordatorios a tu calendario. Te avisa dos días antes de cada pago.');
}
function importar(file){
  const rd = new FileReader();
  rd.onload = () => {
    let raw = null;
    try { raw = JSON.parse(String(rd.result)); } catch (e) {}
    const s = raw && (Array.isArray(raw.ingresos) || Array.isArray(raw.tarjetas)) ? normalizar(raw) : null;
    if (!s) { toast('Ese archivo no es un respaldo de Cuentas Claras.'); return; }
    local.set(LS_RESPALDO, JSON.stringify(state));
    s.ejemplo = false; reemplazar(s);
    toast('Cargamos tu respaldo. Tus datos anteriores quedaron en “Recuperar versión anterior”.');
  };
  rd.readAsText(file);
}

/* ================= estados de cuenta en PDF =================
   Todo ocurre en el navegador. El PDF no se sube a ningún lado: se lee con PDF.js,
   se sacan los movimientos, se limpian los datos sensibles y el archivo se descarta.
   Solo se guardan los movimientos que la persona confirma. */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/';
let pdfjsProm = null, claveResolver = null, imp = null;
function cargarPdfjs(){
  if (!pdfjsProm) pdfjsProm = import(PDFJS + 'pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs'; return m; })
    .catch(() => { pdfjsProm = null; throw { tipo:'cdn' }; });
  return pdfjsProm;
}
async function lineasDePDF(bytes, avance){
  const pdfjs = await cargarPdfjs();
  const task = pdfjs.getDocument({ data:bytes, isEvalSupported:false, disableFontFace:true, enableXfa:false, stopAtErrors:false });
  task.onPassword = (update, reason) => {
    pedirClave(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD).then(pw => { if (pw == null) task.destroy(); else update(pw); });
  };
  let pdf = null;
  try {
    pdf = await task.promise;
    const filas = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ x:it.transform[4], y:it.transform[5], s:it.str }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      let cur = null;
      for (const it of items) {
        if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y:it.y, partes:[] }; filas.push(cur); }
        cur.partes.push(it);
      }
      page.cleanup();
    }
    const lineas = filas.map(l => l.partes.sort((a, b) => a.x - b.x).map(p => p.s).join(' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (lineas.join('').replace(/\s/g, '').length >= 60) return { lineas, ocr:false };
    // Sin texto: es un escaneo. Se dibuja cada página y se lee con reconocimiento de texto.
    const n = Math.min(pdf.numPages, 10), worker = await crearOCR(avance), out = [];
    try {
      for (let p = 1; p <= n; p++) {
        avance(`Este PDF es un escaneo. Leyendo la página ${p} de ${n}…`);
        const page = await pdf.getPage(p);
        const v1 = page.getViewport({ scale:1 }), vp = page.getViewport({ scale:Math.min(3, 2000 / v1.width) });
        const cv = document.createElement('canvas');
        cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        await page.render({ canvasContext:ctx, viewport:vp }).promise;
        try { out.push(...await ocrCanvas(worker, cv)); } finally { cv.width = 0; cv.height = 0; page.cleanup(); }
      }
    } finally { Promise.resolve(worker.terminate()).catch(() => {}); }
    return { lineas:out, ocr:true };
  } finally {
    try { if (pdf) await pdf.destroy(); } catch (e) {}
    try { await task.destroy(); } catch (e) {}
  }
}

/* Reconocimiento de texto (OCR) para fotos y escaneos, con Tesseract.js dentro del navegador. */
const TESS_JS = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/';
const TESS_OPTS = {
  workerPath: TESS_JS + 'worker.min.js',
  corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
  langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa@1.0.0/4.0.0_best_int'
};
let tessProm = null;
function cargarTesseract(){
  if (!tessProm) tessProm = new Promise((ok, err) => {
    if (window.Tesseract) { ok(window.Tesseract); return; }
    const s = document.createElement('script');
    s.src = TESS_JS + 'tesseract.min.js'; s.async = true;
    s.onload = () => window.Tesseract ? ok(window.Tesseract) : err({ tipo:'cdn' });
    s.onerror = () => { tessProm = null; s.remove(); err({ tipo:'cdn' }); };
    document.head.appendChild(s);
  });
  return tessProm;
}
async function crearOCR(avance){
  const T = await cargarTesseract();
  avance('Preparando el lector de imágenes (la primera vez descarga unos 6 MB)…');
  try {
    return await T.createWorker('spa', 1, Object.assign({ logger: m => { if (m && m.status === 'recognizing text') avance(null, m.progress); } }, TESS_OPTS));
  } catch (e) { throw { tipo:'cdn' }; }
}
async function ocrCanvas(worker, cv){
  const r = await worker.recognize(cv, {}, { text:true, blocks:true });
  return lineasDeOCR(r.data || {});
}
// Corrige confusiones típicas del OCR en números: O por 0, l por 1, espacios dentro de montos, coma decimal.
function limpiarOCR(s){
  return s.replace(/[|]/g, ' ')
    .replace(/^[lI](?=\d)/, '1')
    .replace(/(\d)[Oo](?=\d)/g, (m, d) => d + '0').replace(/(\d)[Oo](?=\d)/g, (m, d) => d + '0')
    .replace(/(\d)[lI](?=\d)/g, (m, d) => d + '1')
    .replace(/\$\s+/g, '$')
    .replace(/(\d)\s*,\s*(\d{3})(?!\d)/g, '$1,$2')
    .replace(/(\d)\s*\.\s*(\d{2})(?!\d)/g, '$1.$2')
    .replace(/(\d{1,3}(?:,\d{3})*),(\d{2})(?!\d)/g, '$1.$2')
    .replace(/\s+/g, ' ').trim();
}
// Junta en una sola fila los renglones que el OCR separó por columnas (fecha, comercio, monto).
function lineasDeOCR(data){
  const ls = [];
  (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => {
    const t = String(l.text || '').trim();
    if (t && l.bbox) ls.push({ t, x0:l.bbox.x0, y0:l.bbox.y0, y1:l.bbox.y1 });
  })));
  if (!ls.length) return String(data.text || '').split('\n').map(limpiarOCR).filter(Boolean);
  ls.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
  const filas = [];
  for (const l of ls) {
    const yc = (l.y0 + l.y1) / 2, h = Math.max(1, l.y1 - l.y0), f = filas[filas.length - 1];
    if (f && Math.abs(f.yc - yc) < Math.max(f.h, h) * 0.55) f.partes.push(l);
    else filas.push({ yc, h, partes:[l] });
  }
  return filas.map(f => limpiarOCR(f.partes.sort((a, b) => a.x0 - b.x0).map(p => p.t).join(' '))).filter(Boolean);
}
async function canvasDeImagen(file){
  let src;
  try { src = await createImageBitmap(file); }
  catch (e) {
    src = await new Promise((ok, err) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); err({ tipo:'imagen' }); };
      img.src = url;
    });
  }
  const w0 = src.width, h0 = src.height, k = Math.min(3200 / Math.max(w0, h0), Math.max(1, 2000 / w0));
  const cv = document.createElement('canvas');
  cv.width = Math.round(w0 * k); cv.height = Math.round(h0 * k);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.filter = 'grayscale(1) contrast(1.25)';
  ctx.drawImage(src, 0, 0, cv.width, cv.height);
  if (src.close) src.close();
  return cv;
}
function pedirClave(incorrecta){
  return new Promise(res => {
    const f = byId('imp-clave'), inp = byId('imp-clave-in');
    byId('imp-clave-msg').textContent = incorrecta
      ? 'Esa contraseña no abrió el archivo. Intenta de nuevo.'
      : 'Este estado de cuenta tiene contraseña. Escribe la que te dio tu banco; no la guardamos.';
    f.hidden = false; inp.value = ''; inp.focus();
    claveResolver = v => { claveResolver = null; inp.value = ''; f.hidden = true; res(v); };
  });
}

const MESES = { ene:1, enero:1, jan:1, feb:2, febrero:2, mar:3, marzo:3, abr:4, abril:4, apr:4, may:5, mayo:5, jun:6, junio:6, jul:7, julio:7, ago:8, agosto:8, aug:8, sep:9, sept:9, set:9, septiembre:9, setiembre:9, oct:10, octubre:10, nov:11, noviembre:11, dic:12, diciembre:12, dec:12 };
const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const RE_FECHA_INI = /^(\d{1,2})[\s\-\/.]+(\d{1,2}|[A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?(?:[\s\-\/.]+(\d{4}|\d{2})(?![\d,.]))?/;
const RE_FECHA_EN = /(\d{1,2})[\s\-\/.]+(\d{1,2}|[A-Za-zÁÉÍÓÚáéíóú]{3,10})\.?[\s\-\/.]+(?:de\s+)?(\d{4}|\d{2})(?![\d,.])/i;
const reMontos = () => /([-+])?\s?\$?\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)(\s?(?:-(?!\d)|CR\b))?/gi;
const montoDe = a => parseFloat(a[2].replace(/,/g, '') + '.' + a[3]);
const RE_ABONO = /\b(SU PAGO|PAGO RECIBIDO|GRACIAS POR SU PAGO|PAGO TDC|PAGO A TARJETA|PAGO TARJETA|PAGO INTERBANCARIO|ABONO|DEVOLUCION|BONIFICACION|REEMBOLSO|CASHBACK|DEPOSITO|RECIBIDO|RECIBIDA|NOMINA|REVERSO|CANCELACION)\b/;
const REGLAS_CAT = [
  ['Deudas y préstamos', /INTERES|COMISION|\bIVA\b|ANUALIDAD|CARGO POR|PENALIZA/],
  ['Transporte', /UBER(?!\s*EATS)|DIDI(?!\s*FOOD)|CABIFY|PEMEX|GASOLIN|SHELL|MOBIL|\bBP\b|G500|OXXO GAS|HIDROSINA|CASETA|IAVE|TELEPEAJE|PASE URBANO|ESTACIONAM|\bMETRO\b|\bADO\b|VOLARIS|VIVA ?AEROBUS|AEROMEXICO|AUTOBUS/],
  ['Comida', /WALMART|WAL-MART|SORIANA|CHEDRAUI|LA COMER|\bHEB\b|H-E-B|COSTCO|\bSAMS\b|SAM'S|SUPERAMA|AURRERA|CITY MARKET|FRESKO|OXXO|7-ELEVEN|7 ELEVEN|CIRCLE K|RESTAUR|TACO|STARBUCKS|UBER ?EATS|RAPPI|DIDI ?FOOD|DOMINO|MCDONALD|BURGER|\bKFC\b|LITTLE CAESAR|\bVIPS\b|\bTOKS\b|CAFE|PANADER|CARNICER|POLLO|PIZZA|SUSHI|\bSUPER\b|MERCADO\b/],
  ['Servicios', /TELMEX|TELCEL|AT&T|MOVISTAR|\bIZZI\b|TOTALPLAY|MEGACABLE|\bCFE\b|\bSKY\b|\bAGUA\b|NATURGY|GAS NATURAL|\bBAIT\b|INTERNET/],
  ['Entretenimiento', /NETFLIX|SPOTIFY|DISNEY|\bHBO\b|\bMAX\b|PRIME ?VIDEO|AMAZON PRIME|APPLE\.COM|GOOGLE|YOUTUBE|CINEPOLIS|CINEMEX|TICKETMASTER|STEAM|PLAYSTATION|XBOX|NINTENDO|\bBAR\b|CANTINA/],
  ['Salud', /FARMAC|BENAVIDES|SIMILARES|SAN PABLO|HOSPITAL|MEDIC|DOCTOR|LABORATORIO|CHOPO|DENTAL|OPTICA/],
  ['Ropa y cuidado personal', /LIVERPOOL|PALACIO DE HIERRO|SUBURBIA|\bZARA\b|H&M|C&A|SHEIN|\bNIKE\b|ADIDAS|PULL ?(AND|&) ?BEAR|BERSHKA|SEPHORA|ESTETIC|BARBER|PRICE SHOES|INNOVASPORT/],
  ['Educación', /COLEGIAT|UNIVERSIDAD|ESCUELA|UDEMY|COURSERA|PLATZI|LIBRERI|GANDHI/],
  ['Vivienda', /HOME DEPOT|\bIKEA\b|MUEBLE|RENTA\b|MANTENIMIENTO|FERRETER/]
];
const catDe = up => { for (const [c, re] of REGLAS_CAT) if (re.test(up)) return c; return 'Otros'; };
function fechaDe(d, mo, y, ref){
  const day = +d, month = /^\d+$/.test(mo) ? +mo : MESES[sinAcentos(mo).toLowerCase()];
  if (!month || month > 12 || day < 1 || day > 31) return null;
  let year;
  if (y) year = y.length === 2 ? 2000 + +y : +y;
  else { year = ref.getFullYear(); if (month > ref.getMonth() + 1) year--; }
  if (year < 2000 || year > 2100) return null;
  const f = new Date(year, month - 1, day);
  return f.getMonth() === month - 1 ? f : null;
}
// Quita lo que no debe guardarse: correos, RFC, CURP, números de tarjeta, referencias y nombres en transferencias.
function limpiarDesc(s){
  if (/SPEI|TRANSFER|TRASPASO/i.test(s)) return /RECIB|DEPOSIT/i.test(s) ? 'Transferencia recibida' : 'Transferencia';
  return (' ' + s + ' ')
    .replace(/\S+@\S+/g, ' ')
    .replace(/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi, ' ')
    .replace(/\b[A-Z]{4}\d{6}[A-Z]{6}[A-Z0-9]{2}\b/gi, ' ')
    .replace(/\b(REF(ERENCIA)?|AUT(ORIZACI[OÓ]N)?|FOLIO|RASTREO|CUENTA|CTA|TARJETA|TDC|RFC|CLABE|CURP)\b[\s:.#-]*[\w*-]*/gi, ' ')
    .replace(/(?:[*•]{2,}|\b[xX]{3,})[\s-]*\d*/g, ' ')
    .replace(/\d(?:[\s-]?\d){3,}/g, ' ')
    .replace(/[^\p{L}\p{N}&.,'\/\- ]/gu, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 60);
}
function resumenEstado(texto){
  const ventana = re => { const m = re.exec(texto); return m ? texto.slice(m.index + m[0].length, m.index + m[0].length + 160) : null; };
  const monto = re => { const w = ventana(re); if (!w) return null; const a = reMontos().exec(w); return a ? montoDe(a) : null; };
  const fechaV = re => { const w = ventana(re); if (!w) return null; const a = RE_FECHA_EN.exec(w); return a ? fechaDe(a[1], a[2], a[3], hoy()) : null; };
  const pctV = re => { const w = ventana(re); if (!w) return null; const a = /(\d{1,3}(?:\.\d{1,4})?)\s?%/.exec(w); const v = a ? parseFloat(a[1]) : null; return v > 0 && v < 200 ? v : null; };
  return {
    pagoNoInt: monto(/pago\s+para\s+no\s+generar\s+intereses/i),
    pagoMin: monto(/pago\s+m[ií]nimo/i),
    saldo: monto(/saldo\s+(?:deudor\s+)?(?:total|al\s+corte|nuevo|actual)/i),
    limite: monto(/l[ií]mite\s+de\s+cr[eé]dito/i),
    corte: fechaV(/fecha\s+(?:de\s+)?corte/i) || fechaV(/periodo\b[^\n]{0,60}?\bal\b/i),
    limitePago: fechaV(/fecha\s+l[ií]mite\s+de\s+pago|pagar\s+antes\s+de/i),
    tasa: pctV(/tasa\s+(?:de\s+inter[eé]s\s+)?(?:ordinaria\s+)?anual(?:\s+ordinaria)?/i)
  };
}
function lineaMovimiento(ln, ref){
  let s = ln.trim(), m = RE_FECHA_INI.exec(s), f = null;
  if (m) f = fechaDe(m[1], m[2], m[3], ref);
  else { m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) f = fechaDe(m[3], m[2], m[1], ref); }
  if (!f) return null;
  s = s.slice(m[0].length).trim();
  const m2 = RE_FECHA_INI.exec(s);
  if (m2 && fechaDe(m2[1], m2[2], m2[3], ref)) s = s.slice(m2[0].length).trim();
  const re = reMontos(), montos = [];
  let a;
  while ((a = re.exec(s))) montos.push({ i:a.index, v:montoDe(a), neg:a[1] === '-' || !!(a[4] && a[4].trim()) });
  if (!montos.length) return null;
  let desc = s.slice(0, montos[0].i);
  const cuotas = /\b(\d{1,2})\s+de\s+(\d{1,2})\b/i.exec(s);
  if (cuotas && montos.length >= 2) {
    const k = +cuotas[1], n = +cuotas[2];
    if (n >= 2 && n <= 60 && k >= 1 && k <= n) return { msi:{ desc:limpiarDesc(desc.replace(cuotas[0], ' ')), monto:montos[0].v, meses:n, k } };
  }
  const up = sinAcentos(desc).toUpperCase();
  if (/\b(SALDO|TOTAL|SUBTOTAL|PAGO MINIMO|LIMITE|PERIODO|FECHA)\b/.test(up)) return null;
  const nota = limpiarDesc(desc);
  if (nota.replace(/[^\p{L}]/gu, '').length < 2 || !(montos[0].v > 0)) return null;
  const abono = montos[0].neg || RE_ABONO.test(up);
  return { fecha:isoDia(f), desc:nota, monto:montos[0].v, abono, cat:abono ? 'Otros' : catDe(up) };
}
function analizarEstado(lineas, cuenta){
  const res = resumenEstado(lineas.join('\n'));
  let ref = hoy();
  if (res.corte) ref = res.corte;
  else if (res.limitePago) { ref = new Date(res.limitePago); ref.setDate(ref.getDate() - 20); }
  const movs = [], msi = [];
  for (const ln of lineas) {
    const t = lineaMovimiento(ln, ref);
    if (!t) continue;
    if (t.msi) msi.push(t.msi);
    else {
      t.dup = state.movimientos.some(x => x.fecha === t.fecha && Math.abs(num(x.monto) - t.monto) < 0.005 && x.metodo === cuenta);
      t.on = !t.abono && !t.dup;
      movs.push(t);
    }
  }
  const c = state.tarjetas.find(x => x.id === cuenta), cambios = [], msiNuevas = [];
  if (c) {
    const ymRef = ymDe(ref);
    msi.forEach(p => {
      if (c.msi.some(q => Math.abs(num(q.monto) - p.monto) < 1 && num(q.meses) === p.meses)) return;
      if (msiNuevas.some(q => Math.abs(q.monto - p.monto) < 1 && q.meses === p.meses)) return;
      msiNuevas.push(Object.assign(p, { inicio:ymAdd(ymRef, -(p.k - 1)), on:true }));
    });
    const cuotaNuevas = sum(msiNuevas, p => p.monto / p.meses);
    const base = res.pagoNoInt != null ? res.pagoNoInt : res.saldo;
    if (base != null) {
      const v = Math.max(0, Math.round((base - msiMes(c) - cuotaNuevas) * 100) / 100);
      if (Math.abs(v - num(c.saldo)) > 0.5) cambios.push({ k:'saldo', base, label:'Saldo que genera intereses', txt:m2(v), antes:m2(num(c.saldo)), on:true });
    }
    if (res.tasa != null && Math.abs(res.tasa - num(c.tasa)) > 0.001) cambios.push({ k:'tasa', v:res.tasa, label:'Tasa de interés anual', txt:tasaTxt(res.tasa), antes:tasaTxt(c.tasa), on:true });
    if (res.limite != null && Math.abs(res.limite - num(c.limite)) > 0.5) cambios.push({ k:'limite', v:res.limite, label:'Límite de crédito', txt:m0(res.limite), antes:num(c.limite) ? m0(num(c.limite)) : 'sin dato', on:true });
    if (res.corte && res.corte.getDate() !== c.diaCorte) cambios.push({ k:'diaCorte', v:res.corte.getDate(), label:'Día de corte', txt:'día ' + res.corte.getDate(), antes:c.diaCorte ? 'día ' + c.diaCorte : 'sin dato', on:true });
    if (res.limitePago && res.limitePago.getDate() !== c.diaPago) cambios.push({ k:'diaPago', v:res.limitePago.getDate(), label:'Día límite de pago', txt:'día ' + res.limitePago.getDate(), antes:c.diaPago ? 'día ' + c.diaPago : 'sin dato', on:true });
  }
  const info = [];
  if (res.pagoMin != null) info.push('pago mínimo ' + m2(res.pagoMin));
  if (res.pagoNoInt != null) info.push('pago para no generar intereses ' + m2(res.pagoNoInt));
  if (res.limitePago) info.push('fecha límite ' + fechaCorta(res.limitePago));
  return { cuenta, movs, msi:msiNuevas, cambios, info:info.length ? 'Tu estado de cuenta dice: ' + info.join(' · ') + '.' : '' };
}
const esPDF = f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf';
const esImagen = f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|gif|heic|heif)$/i.test(f.name);
async function procesarArchivos(lista){
  const est = byId('imp-estado'), files = Array.from(lista || []);
  byId('imp-file').value = '';
  if (!files.length) return;
  if (files.length > 12) { est.textContent = 'Sube máximo 12 archivos a la vez.'; return; }
  const malo = files.find(f => !esPDF(f) && !esImagen(f));
  if (malo) { est.textContent = `No podemos leer “${malo.name}”. Sube un PDF o fotos en JPG o PNG.`; return; }
  if (files.some(f => f.size > 25 * 1024 * 1024)) { est.textContent = 'Algún archivo pesa más de 25 MB. Descarga de tu banco solo el estado de cuenta del mes.'; return; }
  const cuenta = byId('imp-cuenta').value;
  imp = null; renderRevision();
  let base = 'Leyendo en tu navegador…';
  const avance = (msg, p) => { if (msg) base = msg; est.textContent = base + (p != null ? ' ' + Math.round(p * 100) + '%' : ''); };
  avance(base);
  let lineas = [], ocr = false, worker = null;
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (esPDF(f)) {
        let bytes = new Uint8Array(await f.arrayBuffer());
        try { const r = await lineasDePDF(bytes, avance); lineas = lineas.concat(r.lineas); ocr = ocr || r.ocr; }
        finally { try { bytes.fill(0); } catch (e) {} bytes = null; }
      } else {
        if (!worker) worker = await crearOCR(avance);
        avance(files.length > 1 ? `Leyendo la foto ${i + 1} de ${files.length}…` : 'Leyendo la foto…');
        const cv = await canvasDeImagen(f);
        try { lineas = lineas.concat(await ocrCanvas(worker, cv)); } finally { cv.width = 0; cv.height = 0; }
        ocr = true;
      }
    }
  } catch (e) {
    est.textContent = e && e.tipo === 'cdn' ? 'No pudimos cargar el lector. Revisa tu conexión a internet e intenta de nuevo.'
      : e && e.tipo === 'imagen' ? 'No pudimos abrir esa imagen. Usa fotos en JPG o PNG.'
      : e && e.name === 'PasswordException' ? 'No abrimos el archivo porque hace falta su contraseña.'
      : 'No pudimos leer el archivo. Intenta de nuevo o descarga de tu banco el estado de cuenta en PDF.';
    return;
  } finally {
    if (worker) Promise.resolve(worker.terminate()).catch(() => {});
    if (claveResolver) claveResolver(null);
  }
  const plural2 = files.length > 1;
  if (!lineas.length) { est.textContent = 'No encontramos texto. Si es una foto, tómala de frente, con buena luz y sin sombras.'; return; }
  const r = analizarEstado(lineas, cuenta);
  lineas.length = 0; lineas = null;
  if (!r.movs.length && !r.msi.length && !r.cambios.length) {
    est.textContent = ocr
      ? `Leímos ${plural2 ? 'las imágenes' : 'la imagen'}, pero no reconocimos movimientos. Prueba con una foto más nítida, de frente y con buena luz, o anótalos a mano. Ya ${plural2 ? 'se descartaron' : 'se descartó'}.`
      : 'Leímos el archivo, pero no encontramos movimientos. Puede que tu banco use un formato que la app todavía no reconoce. El archivo ya se descartó.';
    return;
  }
  r.ocr = ocr; imp = r;
  est.textContent = `Listo. ${plural2 ? 'Los archivos ya se descartaron' : 'El archivo ya se descartó'}; esto es lo que encontramos. Nada se guarda hasta que lo confirmes.`;
  renderRevision();
}
function renderRevision(){
  const el = byId('imp-revision'); if (!el) return;
  if (!imp) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const c = state.tarjetas.find(t => t.id === imp.cuenta);
  const g = imp.movs.filter(m => !m.abono), ab = imp.movs.filter(m => m.abono), dups = imp.movs.filter(m => m.dup);
  let h = '';
  if (imp.movs.length) h += `<p class="note-line">Encontramos <b>${plural(imp.movs.length, 'movimiento', 'movimientos')}</b>: ${plural(g.length, 'cargo', 'cargos')} por <b>${esc(m0(sum(g, m => m.monto)))}</b>` +
    (ab.length ? ` y ${plural(ab.length, 'pago o abono', 'pagos o abonos')} que dejamos sin marcar` : '') +
    (dups.length ? `. ${dups.length === 1 ? 'Uno ya estaba' : dups.length + ' ya estaban'} en tu registro` : '') + '. Desmarca lo que no quieras agregar.</p>';
  if (imp.info) h += `<p class="fld-h">${esc(imp.info)}</p>`;
  if (imp.ocr) h += `<p class="note-line">${chip('warn', 'Leído de una imagen')} Revisa las fechas y los montos antes de agregar: el reconocimiento de texto a veces confunde números, como un 8 con un 3.</p>`;
  if (c && imp.cambios.length) h += `<fieldset class="imp-sec"><legend class="fld-l">Actualizar ${esc(c.nombre || 'tu tarjeta')}</legend>` +
    imp.cambios.map((x, i) => `<label class="check"><input type="checkbox" data-impc="${i}"${x.on ? ' checked' : ''}><span>${esc(x.label)}: <b>${esc(x.txt)}</b> <span class="muted">(ahora ${esc(x.antes)})</span></span></label>`).join('') + '</fieldset>';
  if (c && imp.msi.length) h += `<fieldset class="imp-sec"><legend class="fld-l">Compras a meses sin intereses</legend>` +
    imp.msi.map((p, i) => `<label class="check"><input type="checkbox" data-impmsi="${i}"${p.on ? ' checked' : ''}><span>${esc(p.desc || 'Compra a meses')} · ${esc(m0(p.monto))} a ${p.meses} meses <span class="muted">(vas en el pago ${p.k} de ${p.meses})</span></span></label>`).join('') + '</fieldset>';
  if (imp.movs.length) h += `<div class="table-wrap scroll-y"><table class="tbl imp-tbl"><thead><tr>
      <th><input type="checkbox" id="imp-todos" aria-label="Marcar todos los cargos"${g.every(m => m.on) ? ' checked' : ''}></th><th>Fecha</th><th>Comercio</th><th>Categoría</th><th class="n">Monto</th></tr></thead><tbody>` +
    imp.movs.map((m, i) => `<tr class="${m.on ? '' : 'off'}">
      <td><input type="checkbox" data-impm="${i}"${m.on ? ' checked' : ''} aria-label="Agregar ${esc(m.desc)}"></td>
      <td><input class="in in-sm" type="date" data-impf="${i}" value="${esc(m.fecha)}" aria-label="Fecha"></td>
      <td><input class="in in-sm" data-impd="${i}" value="${esc(m.desc)}" maxlength="60" aria-label="Comercio">${m.abono ? '<span class="tag">Pago o abono</span>' : ''}${m.dup ? '<span class="tag">Ya estaba anotado</span>' : ''}</td>
      <td><select class="in in-sm" data-impcat="${i}" aria-label="Categoría">${catOpts(m.cat)}</select></td>
      <td class="n"><input class="in in-sm num" type="number" inputmode="decimal" min="0" step="0.01" data-impmonto="${i}" value="${m.monto}" aria-label="Monto"></td></tr>`).join('') + '</tbody></table></div>';
  h += '<div class="imp-acc"><button class="btn" type="button" id="imp-ok"></button><button class="btn-quiet" type="button" id="imp-no">Descartar todo</button></div>';
  el.innerHTML = h;
  botonImp();
}
function botonImp(){
  const b = byId('imp-ok'); if (!b || !imp) return;
  const sel = imp.movs.filter(m => m.on && m.monto > 0), extra = imp.cambios.some(x => x.on) || imp.msi.some(p => p.on);
  b.textContent = sel.length ? `Agregar ${plural(sel.length, 'gasto', 'gastos')} (${m0(sum(sel, m => m.monto))})` : extra ? 'Actualizar mi tarjeta' : 'Nada marcado';
  b.disabled = !sel.length && !extra;
}
function confirmarImp(){
  if (!imp) return;
  const sel = imp.movs.filter(m => m.on && m.monto > 0);
  sel.forEach(m => state.movimientos.push({ id:uid(), fecha:m.fecha, monto:m.monto, cat:m.cat, nota:limpiarDesc(m.desc), metodo:imp.cuenta, origen:'estado' }));
  const c = state.tarjetas.find(t => t.id === imp.cuenta);
  let nMsi = 0, nCamb = 0;
  if (c) {
    imp.msi.filter(p => p.on).forEach(p => { c.msi.push({ id:uid(), desc:p.desc, monto:p.monto, meses:p.meses, inicio:p.inicio }); nMsi++; });
    imp.cambios.filter(x => x.on).forEach(x => {
      c[x.k] = x.k === 'saldo' ? Math.max(0, Math.round((x.base - msiMes(c)) * 100) / 100) : x.v;
      if (x.k === 'diaPago') c.pagadoHasta = '';
      nCamb++;
    });
  }
  if (sel.length) diarioMes = sel.map(m => m.fecha.slice(0, 7)).sort().pop();
  imp = null; renderRevision();
  byId('imp-estado').textContent = '';
  renderAll(); cambiado();
  const partes = [];
  if (sel.length) partes.push(plural(sel.length, 'gasto', 'gastos'));
  if (nMsi) partes.push(plural(nMsi, 'compra a meses', 'compras a meses'));
  toast((partes.length ? 'Agregamos ' + partes.join(' y ') : 'Listo') + (nCamb ? '. Actualizamos los datos de tu tarjeta' : '') + '. El PDF no se guardó.');
}

/* ================= render general ================= */
function analisis(){ return new Map(state.tarjetas.map(c => [c.id, analizar(c)])); }
function analisisPrestamos(){ return new Map(state.prestamos.map(p => [p.id, analizarPrestamo(p)])); }
const simEnfocado = () => { const a = document.activeElement; return !!(a && SIM_KEYS[a.id]); };
function renderOutputs(){
  const A = analisis(), AP = PERSONAL ? analisisPrestamos() : new Map();
  renderResumen(A, AP);
  renderTotalesPresupuesto();
  state.tarjetas.forEach(c => { const el = byId('out-' + c.id); if (el) el.innerHTML = avisoHTML(c, A.get(c.id)); });
  if (PERSONAL) { renderMsi(); renderPrestamosOut(AP); renderDiario(); renderPagos(A); }
  renderSimFuente();
  if (sim.fuente && sim.fuente !== 'propio') { simDesdeTarjeta(sim.fuente); if (!simEnfocado()) simInputs(); }
  renderSim();
  renderPlan(A);
  byId('demo-banner').hidden = !state.ejemplo;
}
function renderAll(){
  const sp = byId('cfg-pais'); if (sp) sp.value = state.pais;
  byId('cfg-iva').value = state.iva || '';
  renderIngresos(); renderGastos(); renderTarjetasEd();
  if (PERSONAL) renderPrestamosEd();
  renderOutputs();
  renderCuenta();
}
function reemplazar(nuevo){ state = nuevo; sim.fuente = null; renderAll(); cambiado(); }

/* ================= eventos ================= */
const TEXTO = new Set(['concepto', 'nombre', 'frec', 'cat', 'minTipo', 'desc', 'inicio', 'tipo']);
function itemDe(el){
  const col = el.dataset.col, id = el.dataset.id;
  if (col === 'msi') { const c = state.tarjetas.find(t => t.id === el.dataset.parent); return c ? c.msi.find(x => x.id === id) : null; }
  const list = state[col];
  return Array.isArray(list) ? list.find(x => x.id === id) : null;
}
function impInput(el){
  if (!imp) return;
  const d = el.dataset;
  if (el.id === 'imp-todos') { imp.movs.forEach(m => { if (!m.abono) m.on = el.checked; }); renderRevision(); return; }
  if ('impm' in d) { const m = imp.movs[+d.impm]; if (m) { m.on = el.checked; el.closest('tr').className = m.on ? '' : 'off'; } }
  else if ('impd' in d) { const m = imp.movs[+d.impd]; if (m) m.desc = el.value.slice(0, 60); }
  else if ('impcat' in d) { const m = imp.movs[+d.impcat]; if (m) m.cat = el.value; }
  else if ('impf' in d) { const m = imp.movs[+d.impf]; if (m && esISO(el.value)) m.fecha = el.value; }
  else if ('impmonto' in d) { const m = imp.movs[+d.impmonto]; if (m) m.monto = Math.max(0, Math.round((Number(el.value) || 0) * 100) / 100); }
  else if ('impc' in d) { const x = imp.cambios[+d.impc]; if (x) x.on = el.checked; }
  else if ('impmsi' in d) { const p = imp.msi[+d.impmsi]; if (p) p.on = el.checked; }
  botonImp();
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'imp-todos' || (el.dataset && ['impm', 'impd', 'impcat', 'impc', 'impmsi', 'impf', 'impmonto'].some(k => k in el.dataset))) { impInput(el); return; }
  if (el.dataset && el.dataset.col) {
    const it = itemDe(el); if (!it) return;
    const k = el.dataset.k;
    if (el.type === 'checkbox') it[k] = el.checked;
    else if (TEXTO.has(k)) it[k] = el.value;
    else it[k] = el.value === '' ? 0 : Number(el.value) || 0;
    if (el.dataset.col === 'ingresos' || el.dataset.col === 'gastos') { const n = byId('note-' + it.id); if (n) n.textContent = notaMensual(it); }
    renderOutputs(); cambiado(); return;
  }
  if (el.id === 'cfg-pais') {
    const P = PAISES[el.value] || PAISES.MX;
    if (state.ejemplo) state = ejemplo(el.value);
    else Object.assign(state, { pais:el.value, moneda:P.moneda, iva:P.iva });
    sim.fuente = null; renderAll(); cambiado(); return;
  }
  if (el.id === 'cfg-iva') { state.iva = Number(el.value) || 0; renderOutputs(); cambiado(); return; }
  if (el.id === 'pl-presupuesto') { state.plan.presupuesto = el.value === '' ? null : (Number(el.value) || 0); renderPlan(analisis()); cambiado(); return; }
  if (el.id === 's-fuente') { if (el.value === 'propio') sim.fuente = 'propio'; else simDesdeTarjeta(el.value); simInputs(); renderSim(); return; }
  const sk = SIM_KEYS[el.id];
  if (sk) {
    sim[sk] = sk === 'minTipo' ? el.value : (Number(el.value) || 0);
    if (sk !== 'meta' && sim.fuente !== 'propio') { sim.fuente = 'propio'; byId('s-fuente').value = 'propio'; }
    renderSim();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'f-importar' && e.target.files && e.target.files[0]) { importar(e.target.files[0]); e.target.value = ''; }
  if (e.target.id === 'imp-file' && e.target.files && e.target.files.length) procesarArchivos(e.target.files);
});
document.addEventListener('submit', e => {
  if (e.target.id === 'imp-clave') { e.preventDefault(); if (claveResolver) claveResolver(byId('imp-clave-in').value); return; }
  if (e.target.id !== 'd-form') return;
  e.preventDefault();
  const monto = Number(byId('d-monto').value), msg = byId('d-msg');
  if (!(monto > 0)) { msg.textContent = 'Escribe cuánto gastaste.'; byId('d-monto').focus(); return; }
  const f = esISO(byId('d-fecha').value) ? byId('d-fecha').value : isoDia(hoy());
  const m = { id:uid(), fecha:f, monto, cat:byId('d-cat').value, nota:byId('d-nota').value.trim().slice(0, 120), metodo:byId('d-metodo').value };
  state.movimientos.push(m);
  local.set(LS_CAT, m.cat);
  diarioMes = f.slice(0, 7);
  byId('d-monto').value = ''; byId('d-nota').value = '';
  msg.textContent = `Anotado: ${m2(monto)} en ${m.cat}.`;
  renderOutputs(); cambiado();
  byId('d-monto').focus();
});
document.addEventListener('toggle', e => {
  const d = e.target;
  if (d.tagName === 'DETAILS' && d.dataset.prest && d.open) { const p = state.prestamos.find(x => x.id === d.dataset.prest); if (p) tablaPrestamo(p); }
}, true);

function agregar(col, parent){
  let it, focusId;
  if (col === 'ingresos') it = { id:uid(), concepto:'', frec:'mensual', monto:0 };
  else if (col === 'gastos') it = { id:uid(), concepto:'', cat:'Otros', frec:'mensual', monto:0 };
  else if (col === 'tarjetas') it = nuevaTarjeta('Tarjeta ' + (state.tarjetas.length + 1));
  else if (col === 'prestamos') it = nuevoPrestamo();
  else if (col === 'msi') {
    const c = state.tarjetas.find(t => t.id === parent); if (!c) return;
    it = { id:uid(), desc:'', monto:0, meses:12, inicio:ymDe(hoy()) };
    c.msi.push(it); focusId = 'msi-' + it.id + '-desc';
  }
  if (col !== 'msi') state[col].push(it);
  if (col === 'ingresos') renderIngresos();
  else if (col === 'gastos') renderGastos();
  else if (col === 'prestamos') renderPrestamosEd();
  else renderTarjetasEd();
  renderOutputs(); cambiado();
  const f = byId(focusId || (col + '-' + it.id + '-' + (col === 'tarjetas' || col === 'prestamos' ? 'nombre' : 'concepto')));
  if (f) { f.focus(); if (col === 'tarjetas' || col === 'prestamos') f.select(); }
}
function quitar(col, id, parent){
  if (col === 'msi') { const c = state.tarjetas.find(t => t.id === parent); if (c) c.msi = c.msi.filter(x => x.id !== id); }
  else state[col] = state[col].filter(x => x.id !== id);
  if (col === 'ingresos') renderIngresos();
  else if (col === 'gastos') renderGastos();
  else if (col === 'prestamos') renderPrestamosEd();
  else renderTarjetasEd();
  renderOutputs(); cambiado();
}
function dosPasos(btn, texto, fn){
  if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; fn(); return; }
  btn.dataset.orig = btn.textContent; btn.dataset.armed = '1'; btn.textContent = texto;
  setTimeout(() => { if (btn.dataset.armed) { delete btn.dataset.armed; btn.textContent = btn.dataset.orig; } }, 4000);
}
function listaDe(tipo){ return tipo === 'prestamo' ? state.prestamos : state.tarjetas; }

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.tab) { mostrarTab(d.tab); return; }
  if (d.drive) { conectarDrive(); return; }
  if (d.add) { agregar(d.add, d.parent); return; }
  if (d.del) { quitar(d.del, d.id, d.parent); return; }
  if (d.go) { mostrarTab(d.go); window.scrollTo({ top:0 }); return; }
  if (d.imp) {
    mostrarTab('diario');
    byId('imp-cuenta').value = d.imp;
    byId('imp-file').click();
    byId('imp-block').scrollIntoView({ block:'start' });
    return;
  }
  if (d.sim) { simDesdeTarjeta(d.sim); simInputs(); renderSimFuente(); renderSim(); mostrarTab('simulador'); window.scrollTo({ top:0 }); return; }
  if (d.tabla) { sim.tabla = d.tabla; renderSim(); return; }
  if (d.metodo) { state.plan.metodo = d.metodo; renderPlan(analisis()); cambiado(); return; }
  if (d.mes) { diarioMes = ymAdd(diarioMes, Number(d.mes)); renderDiario(); return; }
  if (d.delmov) { state.movimientos = state.movimientos.filter(m => m.id !== d.delmov); renderOutputs(); cambiado(); return; }
  if (d.pagado) {
    const p = d.pagado.split('|'), it = listaDe(p[0]).find(x => x.id === p[1]);
    if (it) { it.pagadoHasta = p[2]; renderOutputs(); cambiado(); }
    return;
  }
  if (d.deshacer) {
    const p = d.deshacer.split('|'), it = listaDe(p[0]).find(x => x.id === p[1]);
    if (it) { it.pagadoHasta = ''; renderOutputs(); cambiado(); }
    return;
  }
  switch (b.id) {
    case 'btn-blanco': reemplazar(enBlanco(state)); break;
    case 'btn-ocultar': state.ejemplo = false; byId('demo-banner').hidden = true; cambiado(); break;
    case 'btn-ejemplo': dosPasos(b, 'Reemplaza tus datos. ¿Seguro?', () => { local.set(LS_RESPALDO, JSON.stringify(state)); reemplazar(ejemplo(state.pais)); }); break;
    case 'btn-borrar': dosPasos(b, 'Toca otra vez para borrar todo', () => { local.set(LS_RESPALDO, JSON.stringify(state)); reemplazar(enBlanco(state)); }); break;
    case 'btn-respaldo': descargar('cuentas-claras' + (PERSONAL ? '-personal' : '') + '-' + isoDia(hoy()) + '.json', JSON.stringify(state, null, 2), 'application/json'); break;
    case 'btn-importar': byId('f-importar').click(); break;
    case 'btn-recuperar': {
      let r = null; try { r = normalizar(JSON.parse(local.get(LS_RESPALDO))); } catch (err) {}
      if (!r) { toast('No hay una versión anterior guardada.'); break; }
      local.set(LS_RESPALDO, JSON.stringify(state)); reemplazar(r);
      toast('Recuperamos la versión anterior. Si fue un error, toca el mismo botón para regresar.');
      break;
    }
    case 'btn-desconectar': desconectarDrive(); break;
    case 'btn-borrar-drive': dosPasos(b, 'Toca otra vez para borrar tu archivo de Drive', borrarDeDrive); break;
    case 'btn-ics': descargarICS(); break;
    case 'imp-elegir': byId('imp-file').click(); break;
    case 'imp-ok': confirmarImp(); break;
    case 'imp-no': imp = null; renderRevision(); byId('imp-estado').textContent = 'Descartamos todo. No se guardó nada.'; break;
    case 'imp-clave-no': if (claveResolver) claveResolver(null); break;
    case 'btn-csv': descargarCSV(); break;
    case 'pl-auto': state.plan.presupuesto = null; renderPlan(analisis()); cambiado(); break;
    case 's-meta-use':
      sim.pago = Number(b.dataset.pago) || 0; sim.fuente = 'propio';
      byId('s-fuente').value = 'propio'; byId('s-pago').value = sim.pago; renderSim();
      break;
  }
});
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (t) showTip(esc(t.dataset.tip).replace(/\n/g, '<br>'), e.clientX, e.clientY, 'g');
  else if (tipSrc === 'g') hideTip();
});
window.addEventListener('scroll', () => { if (tipSrc) hideTip(); }, { passive:true });

/* pestañas */
function mostrarTab(t){
  if (!TAB_IDS.includes(t)) t = 'resumen';
  $$('[role="tab"]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  TAB_IDS.forEach(x => { byId('tab-' + x).hidden = x !== t; });
  local.set(LS_TAB, t);
  try { history.replaceState(null, '', '#' + t); } catch (e) {}
  hideTip();
}

/* banda guilloché */
function dibujarGuilloche(){
  const cv = byId('guilloche'), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4636A3';
  ctx.lineWidth = 0.75; ctx.globalAlpha = 0.42;
  for (let k = 0; k < 10; k++) {
    const ph = k / 10 * Math.PI * 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 1.5) {
      const y = h / 2 + h * 0.4 * Math.sin(x / 26 + ph) * (0.55 + 0.45 * Math.sin(x / 170 + ph / 3));
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/* ================= arranque ================= */
byId('app').innerHTML = shellHTML();
if (PERSONAL) {
  const uc = local.get(LS_CAT); if (uc && CATS.includes(uc)) byId('d-cat').value = uc;
  const zona = byId('imp-block'), marca = byId('imp-drop');
  ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); marca.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); marca.classList.remove('over'); }));
  zona.addEventListener('drop', e => { const fs = e.dataTransfer && e.dataTransfer.files; if (fs && fs.length) procesarArchivos(fs); });
}
document.querySelector('.tabs').addEventListener('keydown', e => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const btns = $$('[role="tab"]'), i = btns.indexOf(document.activeElement);
  if (i < 0) return;
  const n = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
  n.focus(); mostrarTab(n.dataset.tab); e.preventDefault();
});
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (TAB_IDS.includes(t)) mostrarTab(t); });
let gT;
window.addEventListener('resize', () => { clearTimeout(gT); gT = setTimeout(dibujarGuilloche, 120); });
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', dibujarGuilloche); } catch (e) {}
renderAll();
const h0 = (location.hash || '').slice(1);
mostrarTab(TAB_IDS.includes(h0) ? h0 : (local.get(LS_TAB) || 'resumen'));
dibujarGuilloche();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(dibujarGuilloche);
if (DRIVE_OK) cargarGIS();
})();
