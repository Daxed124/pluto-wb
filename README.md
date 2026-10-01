# Pluto.WB

> Antes se llamaba "Cuentas Claras". Las claves internas donde se guardan los datos conservan ese nombre (`cuentas-claras.*` en el navegador y `cuentas-claras*.json` en Drive) para que nadie pierda su información ni su sincronización.

Calculadora de finanzas personales y de intereses de tarjetas de crédito. Es un sitio estático (HTML, CSS y JavaScript, sin servidor) que se publica gratis en GitHub Pages.

| Página | Dirección | Qué incluye |
|---|---|---|
| Versión pública | `https://daxed124.github.io/cuentas-claras/` | Resumen, presupuesto, tarjetas, simulador de intereses y plan de pagos. Permite elegir el país. |
| Versión personal | `https://daxed124.github.io/cuentas-claras/personal/` | Todo lo anterior, más registro diario de gastos, meses sin intereses, fechas de corte y pago, y préstamos. Viene configurada para México. |

## Dónde se guardan los datos

- **En el navegador** de cada persona, desde el primer momento.
- **En el Google Drive de cada persona**, si toca "Guardar en Google Drive". La app usa la carpeta oculta de datos de aplicación (permiso `drive.appdata`): no ve ni toca ningún otro archivo del Drive. La versión pública y la personal usan archivos distintos.
- Tú, como dueño del sitio, **no recibes ni guardas los datos de nadie**: no hay servidor ni base de datos.

La dirección de la versión personal es pública, como todo GitHub Pages, pero tus números no están en el código. Viven en tu navegador y en tu Drive. Esa página tiene `noindex` para que no salga en buscadores.

## Seguridad

- **Contraseña opcional (Tus datos → Proteger con contraseña).** Cifra con AES-GCM de 256 bits los datos del navegador, el archivo de Drive y los respaldos descargados. La llave sale de la contraseña con PBKDF2-SHA256 y 600 000 vueltas. La contraseña solo vive en la memoria de la página: **si se olvida, los datos no se pueden recuperar**. Al poner, cambiar o quitar la contraseña, la app borra el archivo viejo de Drive para que Google elimine también su historial de versiones.
- **Bloqueo automático.** Con contraseña activa, la app se bloquea tras 1, 5, 15 o 30 minutos sin uso (5 por omisión), o con "Bloquear ahora".
- **Ocultar montos.** Botón en el encabezado que cambia todas las cantidades por •••••.
- **Política de seguridad (CSP).** Solo permite cargar código del propio sitio y de `accounts.google.com/gsi/client`, y solo permite enviar datos a Google. Aunque alguien lograra inyectar código, no podría mandar los datos a otro servidor.
- **Sin servidores externos.** PDF.js, Tesseract.js, el idioma español del OCR y las tipografías están en `assets/vendor/`. Se descargaron del registro de npm y su huella SHA-512 se comparó con la oficial. Para actualizarlos, repite ese proceso; no los cambies por enlaces a CDN.
- **Contra marcos ajenos.** Si otra página intenta mostrar la app dentro de la suya, la app no se muestra.
- **Borrar todo** elimina los datos, la copia de respaldo y las preferencias del navegador y, si Drive está conectado, también el archivo de Drive.

Lo que ninguna página web puede evitar: virus o extensiones maliciosas en el dispositivo, o que alguien use tu celular desbloqueado mientras la app está abierta.

**Cuida tus cuentas:** quien controle tu GitHub puede cambiar el código que usan todos. Activa la verificación en dos pasos en GitHub y en la cuenta de Google con la que creaste el proyecto de Google Cloud.

## Subir estados de cuenta (versión personal)

En **Registro diario → Subir estado de cuenta** eliges la tarjeta o cuenta y subes el PDF que te da tu banco. También puedes arrastrarlo, o usar el botón "Actualizar con mi estado de cuenta" de cada tarjeta.

- El PDF se lee **en tu navegador** con [PDF.js](https://mozilla.github.io/pdf.js/), que viene incluido en el sitio. El archivo no se sube a ningún servidor ni se guarda. Al terminar se borra de la memoria de la página. El archivo original en tu dispositivo no se toca.
- Si el PDF tiene contraseña, la app la pide en pantalla y no la guarda.
- De cada movimiento solo se conservan **fecha, comercio, monto y categoría**. Antes de mostrarlos se quitan números de tarjeta y de cuenta, referencias, folios, RFC, CURP y correos. Las transferencias quedan solo como "Transferencia", sin el nombre de la persona.
- Todo pasa por una pantalla de revisión: los pagos y abonos, y los movimientos que ya estaban anotados, vienen sin marcar. Puedes cambiar la categoría o el nombre del comercio. Nada se guarda hasta que tocas "Agregar".
- Si el estado de cuenta es de una tarjeta, la app también propone actualizar el saldo, la tasa, el límite y los días de corte y pago, y agregar las compras a meses sin intereses que detecte.
- **Fotos y PDF escaneados:** se leen con reconocimiento de texto (OCR) usando [Tesseract.js](https://tesseract.projectnaptha.com/) dentro del navegador. La imagen tampoco sale de tu dispositivo. La primera vez se cargan desde el propio sitio el lector y el idioma español, unos 6 MB. Después quedan en caché. Puedes subir varias fotos a la vez, una por página, hasta 12 archivos. Las fechas y los montos se pueden corregir en la pantalla de revisión, porque el OCR a veces confunde números. Funciona mejor con fotos de frente, con buena luz y sin sombras.
- Cada banco usa un formato distinto. Si alguno no se lee bien, los movimientos se pueden anotar a mano.

## Archivos

```
index.html            versión pública
personal/index.html   versión personal
privacidad.html       aviso de privacidad (rellena tu nombre y tu correo)
config.js             aquí va tu ID de cliente de Google
assets/app.js         la app (cálculos, pantallas y conexión con Drive)
assets/app.css        estilos (incluye las tipografías)
assets/icono.svg      ícono
herramientas/         revisiones de código, CSS y pantallas (ver docs/OPTIMIZACION.md)
docs/OPTIMIZACION.md  qué se limpió y optimizó, herramientas evaluadas y cómo repetir las revisiones
assets/vendor/        PDF.js 4.10.38, Tesseract.js 6.0.1 (núcleo 6.0.0, español 4.0.0_best_int)
                      y tipografías Archivo e IBM Plex Mono. Licencias: Apache 2.0 y SIL OFL 1.1
```

## Mantenimiento

Antes de publicar cambios, corre las revisiones descritas en [docs/OPTIMIZACION.md](docs/OPTIMIZACION.md): ESLint para el código, `herramientas/revisar-css.js` para el CSS y `herramientas/revisar-pantallas.js` para celular, tableta y computadora.

## 1. Probarla en tu computadora

Desde esta carpeta:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080` (versión pública) o `http://localhost:8080/personal/` (versión personal). Sin el paso 2, todo funciona pero guarda solo en el navegador.

## 2. Configurar Google Drive (una sola vez, unos 15 minutos)

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con tu cuenta de Google y crea un proyecto nuevo llamado "Pluto.WB".
2. Ve a **APIs y servicios → Biblioteca**, busca **Google Drive API** y toca **Habilitar**.
3. Ve a **Google Auth Platform** (antes se llamaba "Pantalla de consentimiento de OAuth"):
   - **Branding / Información de la app:** nombre "Pluto.WB", tu correo de asistencia, y como enlaces la página principal (`https://daxed124.github.io/cuentas-claras/`) y el aviso de privacidad (`https://daxed124.github.io/cuentas-claras/privacidad.html`).
   - **Público:** elige **Externo**. Mientras esté "En prueba", solo pueden entrar las cuentas que agregues como usuarios de prueba (agrega la tuya).
   - **Acceso a datos:** agrega el permiso `https://www.googleapis.com/auth/drive.appdata`. Google lo clasifica como **no sensible**.
4. Ve a **Clientes → Crear cliente**, tipo **Aplicación web**. En **Orígenes autorizados de JavaScript** agrega:
   - `http://localhost:8080`
   - `https://daxed124.github.io`
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

Cada vez que cambies algo y hagas `git push`, GitHub Pages actualiza el sitio. Si cambias `assets/app.js` o `assets/app.css`, sube también el número de `?v=` en `index.html`, `personal/index.html` y `privacidad.html`. Así los navegadores descargan la versión nueva en lugar de usar la que tienen guardada.

## Antes de compartir la versión pública

- Pon tu nombre y tu correo de contacto en `privacidad.html`.
- Los cálculos son estimaciones: suponen tasas fijas, sin compras nuevas ni comisiones. La app lo dice en el pie de página.

## Cómo sincroniza entre dispositivos

Cada cambio guarda la fecha y hora. Al conectar Drive o volver a la pestaña, la app compara la copia del navegador con la de Drive y se queda con la más reciente. La otra queda en "Recuperar versión anterior". El acceso de Google dura una hora; después la app muestra "Reconectar" y, mientras tanto, sigue guardando en el navegador.
