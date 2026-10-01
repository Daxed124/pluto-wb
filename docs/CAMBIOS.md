# Registro de cambios

Del más reciente al más antiguo. Cada versión corresponde a uno o varios commits del repositorio, con su identificador entre paréntesis.

## 1 de octubre de 2026

### Documentación (`f694065`)
- Nuevo `docs/DISENO.md`: estilo, características, accesibilidad con contrastes medidos, arquitectura y análisis.
- Nuevos `docs/ESTADO.md`, `docs/CAMBIOS.md` y `docs/PRUEBAS.md`.
- El aviso de privacidad explica que los últimos 4 dígitos y el color de una tarjeta son opcionales.

## 30 de septiembre de 2026

### Publicación (`4c587b8`, `3a4c6ec`)
- Repositorio público `Daxed124/pluto-wb` y sitio en GitHub Pages.
- Los commits quedaron a nombre de Jonathan Olvera, con el correo privado de GitHub en vez del Gmail.
- El README usa las direcciones del sitio publicado.

### Aviso de privacidad (`58dbdd5`)
- Nombre y correo de contacto del responsable.

### Nombre nuevo, limpieza y optimización (`dcf3204`)
- La app pasa a llamarse **Pluto.WB**. Las claves internas de almacenamiento conservan el nombre anterior para no perder datos.
- La banda guilloché del encabezado pasa de 22 a 40 px.
- Solo se dibuja la pestaña visible: cada tecla pasa de 27 ms a 8.6 ms.
- Se quitan el CSS sin usar y las reglas duplicadas, y una función reemplaza tres copias del HTML de las casillas de resumen.
- Precarga de la tipografía principal.
- Herramientas de revisión en `herramientas/` y documentación en `docs/OPTIMIZACION.md`.

### Animación del encabezado (`f31e0bd`)
- La banda guilloché se mueve despacio, a unos 30 cuadros por segundo. Se pausa con la pestaña oculta y se queda quieta con "reducir movimiento".

### Cartera de tarjetas (`2dfb9da`)
- Tarjetas con aspecto de tarjeta real: color elegible, últimos 4 dígitos opcionales, deuda, límite usado y próxima fecha de pago.
- Deuda total entre tarjetas, crédito disponible, uso de límites y reparto de la deuda por tarjeta.
- Las listas muestran "Nombre ··1234" para distinguir tarjetas parecidas.
- Si se pega un número de tarjeta completo, solo se guardan los últimos 4 dígitos.

### Protección de datos (`5a7714d`, `8af015d`)
- Contraseña opcional que cifra con AES-GCM de 256 bits los datos del navegador, de Drive y de los respaldos. Incluye pantalla de candado y bloqueo automático por inactividad.
- Botón "Ocultar montos".
- Política de seguridad de contenido en todas las páginas: solo permite conexiones a Google.
- PDF.js, Tesseract.js y las tipografías pasan a estar dentro del sitio, verificados contra su huella en npm. Ya no se usan cdnjs, jsDelivr ni Google Fonts.
- La app no se muestra dentro de marcos de otros sitios.
- Las librerías se guardan en Git sin convertir saltos de línea.

### Correcciones de seguridad (`55558d5`)
- "Borrar todos mis datos" ahora borra de verdad: antes dejaba una copia recuperable.
- El CSV exportado ya no permite fórmulas de Excel.
- El archivo de recordatorios `.ics` ya no permite inyectar líneas.

### Formato de BBVA (`f191c95`)
- El lector ignora el CAT ("4.2% Sin IVA") al buscar la tasa y al detectar fechas.
- Categorías nuevas: "SUPER SERV" como gasolinera, Mercado Pago, Little Caesars y servicios digitales.
- El OCR de PDF escaneados ya no se detiene si la pestaña queda en segundo plano.

### OCR para fotos y escaneos (`19cb99a`)
- Lectura de fotos y PDF escaneados con Tesseract.js dentro del navegador.
- Fechas y montos editables en la pantalla de revisión, con aviso cuando vienen de una imagen.

### Lector de estados de cuenta (`7b299e0`)
- Subir el PDF del banco: extrae los movimientos, quita datos sensibles y descarta el archivo.
- Propone actualizar saldo, tasa, límite y fechas de la tarjeta, y agregar compras a meses.

### Primera versión (`cdfe15a`)
- Versión pública y versión personal en un solo código, publicable en GitHub Pages.
- Presupuesto, tarjetas, simulador de intereses y plan de pagos (avalancha y bola de nieve).
- En la versión personal: registro diario, meses sin intereses, fechas de corte y pago, recordatorios `.ics` y préstamos.
- Guardado en el navegador y en la carpeta oculta del Google Drive de cada persona.
- Aviso de privacidad y README con la guía de configuración.

## Antes del repositorio

- **Antes del primer commit:** primera versión como página privada de Claude (artefacto), guardada en la cuenta de Claude del usuario. Su código está en `D:\proyectos simples\cuentas-claras-claude\` y no se sigue actualizando.
