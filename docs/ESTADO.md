# Estado actual y pendientes

Actualizado el 26 de octubre de 2026.

## Dónde está publicada

| | Dirección |
|---|---|
| Versión pública | https://daxed124.github.io/pluto-wb/ |
| Versión personal | https://daxed124.github.io/pluto-wb/personal/ |
| Aviso de privacidad | https://daxed124.github.io/pluto-wb/privacidad.html |
| Código (repositorio público) | https://github.com/Daxed124/pluto-wb |

GitHub Pages publica la rama `main` desde la carpeta raíz, con HTTPS obligatorio. Cada `git push` actualiza el sitio en uno o dos minutos.

Existe además una versión anterior hecha como página de Claude (artefacto privado), cuyo código está en `D:\proyectos simples\cuentas-claras-claude\`. Esa versión no recibe las mejoras de este repositorio.

## Qué funciona hoy

| Función | Estado |
|---|---|
| Presupuesto, tarjetas, cartera, simulador y plan de pagos | ✅ Funciona |
| Registro diario, meses sin intereses, fechas de pago, recordatorios y préstamos (versión personal) | ✅ Funciona |
| Lector de estados de cuenta en PDF con texto | ✅ Funciona; probado con un estado de cuenta inventado |
| Cotejo de estados de cuenta mes a mes (historial por tarjeta, pagos aplicados al corte anterior, pago anotado a mano) | ✅ Funciona; probado con dos estados de cuenta inventados, en orden y en desorden |
| Lector de fotos y PDF escaneados (OCR) | ✅ Funciona; probado con imágenes inventadas y con un estado de cuenta de BBVA convertido a imágenes |
| Guardado en el navegador | ✅ Funciona |
| Contraseña que cifra los datos, bloqueo automático y "Ocultar montos" | ✅ Funciona |
| **Guardado en Google Drive** | ⏳ **No disponible todavía**: falta el ID de cliente de Google en `config.js`. Mientras tanto, el botón "Guardar en Google Drive" no aparece y los datos solo se guardan en el navegador |

## Pendientes

### Del dueño del proyecto

| # | Pendiente | Por qué importa | Dónde están los pasos |
|---|---|---|---|
| 1 | **Crear el ID de cliente de Google** y pegarlo en `config.js` | Sin él no hay sincronización entre dispositivos | README, sección "2. Configurar Google Drive". Orígenes autorizados: `http://localhost:8080` y `https://daxed124.github.io` |
| 2 | **Activar la verificación en dos pasos en GitHub** (Settings → Password and authentication) | Quien entre a la cuenta podría cambiar el código que usa todo el mundo | — |
| 3 | Activar la verificación en dos pasos en la cuenta de Google del proyecto de Google Cloud | Misma razón: esa cuenta controla el acceso a Drive | — |
| 4 | Cuando se quiera abrir la versión pública a cualquier persona: completar la información de la app en Google Auth Platform (página principal y aviso de privacidad) y tocar **Publicar app** | Mientras esté en modo de prueba, solo las cuentas agregadas como usuarios de prueba pueden conectar Drive | README, paso 6 de la sección de Google Drive |
| 5 | Decidir si el aviso de privacidad sigue mostrando el Gmail personal o un correo creado solo para la app | El aviso es público | `privacidad.html`, línea del responsable |

### Técnicos (recomendados en el análisis)

Están ordenados por prioridad. El detalle de cada uno está en [DISENO.md](DISENO.md), sección 9.

| # | Pendiente | Gravedad del problema que resuelve |
|---|---|---|
| 1 | Atrapar el foco dentro de la ventana de contraseña, para que Tab no salga de ella | Media |
| 2 | Pruebas automáticas de los cálculos con `node --test` | Media |
| 3 | Probar el lector de estados de cuenta con más bancos (Banorte, Santander, Citibanamex, HSBC, Nu) | Media |
| 4 | Oscurecer las series naranja y verde azulado en modo claro (contraste 3.1 y 2.7) | Baja |
| 5 | Convertir la app en PWA, para instalarla en el celular y usarla sin conexión | Baja |
| 6 | Botón para elegir tema claro u oscuro | Baja |
| 7 | Auditoría con Lighthouse del sitio publicado | — |
| 8 | Partir `app.js` en módulos cuando supere unas 3 500 líneas (hoy tiene 2 657) | Baja hoy |

Al terminar un pendiente, márcalo aquí y agrega una línea en [CAMBIOS.md](CAMBIOS.md).

## Datos de configuración

| Dato | Valor |
|---|---|
| Usuario de GitHub | Daxed124 |
| Autor de los commits | Jonathan Olvera `<198673937+Daxed124@users.noreply.github.com>` (correo privado de GitHub) |
| Permiso de Google que usa la app | `https://www.googleapis.com/auth/drive.appdata` (clasificado por Google como no sensible) |
| Claves internas de almacenamiento | `cuentas-claras.*` en el navegador; `cuentas-claras.json` y `cuentas-claras-personal.json` en Drive. **No cambiarlas**: los datos guardados se perderían |
| Versión de los archivos (`?v=`) | 18. Hay que subirla en `index.html`, `personal/index.html` y `privacidad.html` cada vez que cambien `app.js` o `app.css` |
