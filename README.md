# Cuentas Claras

Calculadora de finanzas personales y de intereses de tarjetas de crédito. Es un sitio estático (HTML, CSS y JavaScript, sin servidor) que se publica gratis en GitHub Pages.

| Página | Dirección | Qué incluye |
|---|---|---|
| Versión pública | `https://TU-USUARIO.github.io/cuentas-claras/` | Resumen, presupuesto, tarjetas, simulador de intereses y plan de pagos. Permite elegir el país. |
| Versión personal | `https://TU-USUARIO.github.io/cuentas-claras/personal/` | Todo lo anterior, más registro diario de gastos, meses sin intereses, fechas de corte y pago, y préstamos. Viene configurada para México. |

## Dónde se guardan los datos

- **En el navegador** de cada persona, desde el primer momento.
- **En el Google Drive de cada persona**, si toca "Guardar en Google Drive". La app usa la carpeta oculta de datos de aplicación (permiso `drive.appdata`): no ve ni toca ningún otro archivo del Drive. La versión pública y la personal usan archivos distintos.
- Tú, como dueño del sitio, **no recibes ni guardas los datos de nadie**: no hay servidor ni base de datos.

La dirección de la versión personal es pública, como todo GitHub Pages, pero tus números no están en el código. Viven en tu navegador y en tu Drive. Esa página tiene `noindex` para que no salga en buscadores.

## Subir estados de cuenta (versión personal)

En **Registro diario → Subir estado de cuenta** eliges la tarjeta o cuenta y subes el PDF que te da tu banco. También puedes arrastrarlo, o usar el botón "Actualizar con mi estado de cuenta" de cada tarjeta.

- El PDF se lee **en tu navegador** con [PDF.js](https://mozilla.github.io/pdf.js/), que se carga desde cdnjs. El archivo no se sube a ningún servidor ni se guarda. Al terminar se borra de la memoria de la página. El archivo original en tu dispositivo no se toca.
- Si el PDF tiene contraseña, la app la pide en pantalla y no la guarda.
- De cada movimiento solo se conservan **fecha, comercio, monto y categoría**. Antes de mostrarlos se quitan números de tarjeta y de cuenta, referencias, folios, RFC, CURP y correos. Las transferencias quedan solo como "Transferencia", sin el nombre de la persona.
- Todo pasa por una pantalla de revisión: los pagos y abonos, y los movimientos que ya estaban anotados, vienen sin marcar. Puedes cambiar la categoría o el nombre del comercio. Nada se guarda hasta que tocas "Agregar".
- Si el estado de cuenta es de una tarjeta, la app también propone actualizar el saldo, la tasa, el límite y los días de corte y pago, y agregar las compras a meses sin intereses que detecte.
- Funciona con PDF que tienen texto, que es como los descargas de la banca en línea. Si el PDF es una foto o un escaneo, la app avisa que no puede leerlo. Cada banco usa un formato distinto: si alguno no se lee bien, los movimientos se pueden anotar a mano.

## Archivos

```
index.html            versión pública
personal/index.html   versión personal
privacidad.html       aviso de privacidad (rellena tu nombre y tu correo)
config.js             aquí va tu ID de cliente de Google
assets/app.js         la app (cálculos, pantallas y conexión con Drive)
assets/app.css        estilos
assets/icono.svg      ícono
```

## 1. Probarla en tu computadora

Desde esta carpeta:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080` (versión pública) o `http://localhost:8080/personal/` (versión personal). Sin el paso 2, todo funciona pero guarda solo en el navegador.

## 2. Configurar Google Drive (una sola vez, unos 15 minutos)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google y crea un proyecto nuevo llamado "Cuentas Claras".
2. Ve a **APIs y servicios → Biblioteca**, busca **Google Drive API** y toca **Habilitar**.
3. Ve a **Google Auth Platform** (antes se llamaba "Pantalla de consentimiento de OAuth"):
   - **Branding / Información de la app:** nombre "Cuentas Claras", tu correo de asistencia, y como enlaces la página principal (`https://TU-USUARIO.github.io/cuentas-claras/`) y el aviso de privacidad (`https://TU-USUARIO.github.io/cuentas-claras/privacidad.html`).
   - **Público:** elige **Externo**. Mientras esté "En prueba", solo pueden entrar las cuentas que agregues como usuarios de prueba (agrega la tuya).
   - **Acceso a datos:** agrega el permiso `https://www.googleapis.com/auth/drive.appdata`. Google lo clasifica como **no sensible**.
4. Ve a **Clientes → Crear cliente**, tipo **Aplicación web**. En **Orígenes autorizados de JavaScript** agrega:
   - `http://localhost:8080`
   - `https://TU-USUARIO.github.io`
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) y pégalo en `config.js`:

   ```js
   window.CC_CONFIG = { googleClientId: '1234-abc.apps.googleusercontent.com' };
   ```

   Ese ID no es secreto. Google lo diseñó para ir en páginas públicas.
6. Cuando quieras que cualquier persona pueda usar la versión pública, ve a **Público → Publicar app**. Como la app solo pide un permiso no sensible, Google no exige la revisión estricta. Puede pedirte verificar la marca para mostrar el nombre y el logo.

## 3. Publicar en GitHub Pages

1. Crea un repositorio **público** llamado `cuentas-claras` en tu cuenta de GitHub y sube esta carpeta.
2. En el repositorio ve a **Settings → Pages**. En **Source** elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
3. En uno o dos minutos las páginas estarán en las direcciones de la tabla de arriba.

Cada vez que cambies algo y hagas `git push`, GitHub Pages actualiza el sitio.

## Antes de compartir la versión pública

- Pon tu nombre y tu correo de contacto en `privacidad.html`.
- Los cálculos son estimaciones: suponen tasas fijas, sin compras nuevas ni comisiones. La app lo dice en el pie de página.

## Cómo sincroniza entre dispositivos

Cada cambio guarda la fecha y hora. Al conectar Drive o volver a la pestaña, la app compara la copia del navegador con la de Drive y se queda con la más reciente. La otra queda en "Recuperar versión anterior". El acceso de Google dura una hora; después la app muestra "Reconectar" y, mientras tanto, sigue guardando en el navegador.
