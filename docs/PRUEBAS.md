# Pruebas realizadas

Registro de lo que se probó, con qué datos y qué resultado dio, entre el 30 de septiembre y el 1 de octubre de 2026. Todas las pruebas usaron datos inventados, salvo una copia de un estado de cuenta de BBVA con los datos sensibles tapados por su dueño. Ninguna prueba guardó datos reales en el repositorio.

Se probó en el navegador integrado de Claude (basado en Chromium) y con Node.js 24. **No se probó en Safari, Firefox ni en celulares reales** (ver la sección "Lo que falta probar").

## 1. Cálculos

Tarjeta de ejemplo: saldo de $28,400, tasa anual de 54%, IVA de 16% sobre intereses, y pago mínimo de intereses más 1.5% del saldo, con mínimo fijo de $200.

| Caso | Resultado | ¿Correcto? |
|---|---|---|
| Pagar solo el mínimo | 179 meses (casi 15 años), $91,393 de intereses e IVA | ✅ Coincide con el cálculo hecho a mano (unos 149 meses al 1.5% más unos 30 con el mínimo fijo) |
| Pagar $2,500 al mes | 18 meses, $15,780 de intereses e IVA | ✅ Coincide con la fórmula de anualidad (17.7 meses) |
| Pago necesario para liquidar en 12 meses | $3,244.12, y simulado da exactamente 12 meses | ✅ |
| Pagar $1,000 al mes (menos que el interés) | Marcado como "Nunca": la deuda crece | ✅ |
| Plan con 3 tarjetas y $4,500 al mes | Avalancha: 16 meses y $20,200 de intereses. Bola de nieve: 16 meses y $21,752 | ✅ Avalancha paga menos, como debe |
| Préstamo de auto: $148,000 al 13.5% con mensualidad de $5,200 | 36 meses, $38,217 de intereses e IVA. Con $1,000 extra: 29 meses y $30,497 | ✅ |
| Meses sin intereses: $12,000 a 12 meses iniciados hace 4 meses | Mensualidad de $1,000, pago 5 de 12, faltan $8,000 | ✅ |
| Compra a meses que empieza en el futuro, y otra ya terminada | No cuentan para el mes actual | ✅ |
| Fecha de pago el día 31 en un mes de 30 días | Se mueve al día 30 | ✅ |

## 2. Lector de estados de cuenta

| Prueba | Resultado |
|---|---|
| **PDF con texto inventado** (nombre, RFC, número de tarjeta, 10 movimientos, un pago, una transferencia y compras a meses) | 10 movimientos detectados. El pago quedó sin marcar. Categorías correctas (OXXO en comida, Uber en transporte, Netflix en entretenimiento, intereses en deudas). Detectó una compra a meses nueva y no repitió una que ya existía. Propuso el saldo correcto ($28,480 = pago para no generar intereses menos mensualidades) |
| Limpieza de datos sensibles en ese PDF | Se quitaron la sucursal, la referencia y el nombre de la transferencia. **Revisando los datos guardados, no apareció el número de tarjeta, el RFC, el nombre del titular ni la referencia** |
| **Foto inventada** (fondo gris, ligeramente inclinada) | 6 movimientos exactos en 8 segundos, incluida la primera descarga del lector |
| **Estado de cuenta de BBVA convertido a imágenes**, con datos tapados por su dueño (7 páginas) | Los 10 movimientos leídos sin errores en unos 95 segundos. Pagos identificados como abonos. Resumen leído: fechas de corte y límite, pago mínimo, pago para no generar intereses, límite de crédito y tasa |
| Errores encontrados con BBVA y ya corregidos | 1) Tomaba el CAT (4.2%) como tasa: ahora toma 56.62%. 2) Leía "4.2% Sin IVA" como un gasto del 4 de febrero: ya no. 3) El OCR se detenía si la pestaña quedaba en segundo plano: ya no. 4) "SUPER SERV" salía como súper: ahora es gasolinera |
| Archivos temporales | La copia del PDF de BBVA y sus imágenes se borraron al terminar. Nunca entraron a Git |

## 3. Seguridad y privacidad

| Prueba | Resultado |
|---|---|
| "Borrar todos mis datos" | Antes dejaba una copia recuperable en el navegador. Corregido: después de borrar ya no queda copia ni preferencias |
| Política de seguridad de contenido | 0 bloqueos al usar la app, leer PDF y leer fotos, en las dos versiones |
| Servidores externos | Según la lista de solicitudes del navegador y el registro del servidor, las tipografías, PDF.js, Tesseract, su núcleo y el idioma español se cargan desde el propio sitio |
| Integridad de librerías | Las 4 descargas de npm coinciden con su huella SHA-512 oficial |
| Activar contraseña | Lo guardado queda ilegible: no aparecen "Tarjeta", "Sueldo", "Renta" ni "Refrigerador". Usa PBKDF2 con 600 000 vueltas |
| Pedir la casilla de "Entiendo que si olvido…" | No deja proteger sin marcarla |
| Bloquear y reabrir | Con una contraseña equivocada muestra "Esa contraseña no es correcta". Con la correcta abre en 0.65 s y conserva el último cambio |
| Quitar contraseña | Pide la contraseña actual y rechaza una equivocada. Después los datos se guardan sin cifrar |
| Cargar un respaldo cifrado | Pide su contraseña y recupera los datos completos |
| "Ocultar montos" | Todas las cifras cambian a ••••• y vuelven al quitarlo |
| Últimos 4 dígitos | Al pegar un número completo, guarda solo los últimos 4 y avisa |
| Historial de Git antes de publicar | 0 apariciones del Gmail en los commits, y ningún dato del estado de cuenta |

## 3b. Estados de cuenta mes a mes (26 de octubre de 2026)

Dos estados de cuenta inventados de la misma tarjeta, con formato de BBVA. **Agosto:** corte 21 de agosto, $1,500 para no generar intereses, mínimo $300, fecha límite 11 de septiembre. **Septiembre:** corte 21 de septiembre, con dos pagos, de $1,000 el 6 de septiembre y de $500 el 10 de septiembre.

| Prueba | Resultado |
|---|---|
| Subir agosto y luego septiembre | Agosto quedó **Pagado completo** con los dos pagos de septiembre. El aviso final lo dijo: "El estado de cuenta del 21 ago quedó: pagado completo" |
| Datos de la tarjeta | Se actualizaron solos con septiembre: saldo $754.60, tasa 56.62%, límite $18,300, corte el día 21, pago el día 12 |
| Gastos duplicados | No se duplicaron. Los pagos se guardaron aparte, sin contarse como gastos |
| Septiembre sin estado de cuenta de octubre (con la fecha límite vencida) | Aparece como **Sin pago registrado**, con la indicación de subir el siguiente estado de cuenta o anotar el pago |
| Subirlos en desorden (septiembre y luego agosto) | Agosto se guardó en el historial y quedó pagado, pero **no cambió** los datos de la tarjeta, que siguieron con los de septiembre. La revisión avisó que era un estado de cuenta anterior |
| Anotar a mano $754.60 el 5 de octubre | Septiembre pasó a **Pagado completo** |
| Simulador: respuesta con $2,500 al mes y con $300 al mes | Con $2,500: "terminas en abr 2028 y pagas $15,180 de intereses… Te ahorras $74,820". Con $300: "la deuda nunca se acaba" |
| Plan: respuesta con cada método | Avalancha: libre en ene 2028 con $19,503 de intereses. Bola de nieve: feb 2028 con $20,960 |
| Desbordes a 320 px en las 7 pestañas | 0 |
| ESLint y CSS sin usar | 0 avisos, 0 clases |

## 4. Pantallas y rendimiento

| Prueba | Resultado |
|---|---|
| Desbordes horizontales a 320, 768 y 1280 px, en las dos versiones y todas las pestañas | 0 |
| Errores en la consola | 0 en todas las pruebas finales |
| Tiempo por tecla (pestaña Tarjetas, datos de ejemplo) | De 27 ms (peor caso 43) a 8.6 ms (peor caso 13) |
| Todas las pestañas al día después de editar en otra | ✅ El saldo cambiado en Tarjetas aparece en Resumen y en el Simulador |
| Revisión de código con ESLint | 0 avisos |
| CSS sin usar | 0 clases |

## 5. Sitio publicado

| Prueba | Resultado |
|---|---|
| Páginas, `app.js`, `config.js` y el lector de PDF | Responden con código 200 y el tipo de archivo correcto |
| Versión personal en línea | Carga con el nombre y el logotipo nuevos, 7 pestañas y tipografías propias |
| OCR en línea | Leyó una foto de prueba en 3 s, cargando todo desde `/pluto-wb/` |
| Despliegue del 1 de octubre | Confirmado con la API de GitHub. No se pudo abrir el sitio desde la computadora de prueba por un error local de certificados |

## Lo que falta probar

| Qué | Por qué no se probó |
|---|---|
| **Guardar y sincronizar con Google Drive**, incluido el inicio de sesión con la política de seguridad activa | Todavía no hay ID de cliente de Google |
| PDF protegido con contraseña | No había un archivo de prueba con contraseña |
| Estados de cuenta de otros bancos | Solo se tuvo el formato de BBVA |
| Fotos reales tomadas con celular | Solo se usaron imágenes generadas |
| Safari (iPhone, Mac), Firefox y celulares reales | El entorno de prueba solo tenía un navegador basado en Chromium |
| Lector de pantalla (NVDA, VoiceOver) | No se usó uno; la accesibilidad se revisó en el código y con contrastes medidos |
| Auditoría con Lighthouse | Pendiente; está en las recomendaciones |

## Cómo repetir las pruebas

- **Código y CSS:** ver los comandos en [OPTIMIZACION.md](OPTIMIZACION.md).
- **Pantallas:** pega `herramientas/revisar-pantallas.js` en la consola del navegador.
- **Lector de estados de cuenta:** abre la versión personal con `?depurar` (por ejemplo `personal/?depurar#diario`). En la consola, `window.CC_DEPURAR` da acceso a las funciones del lector para ver qué texto se obtiene de cada banco.
