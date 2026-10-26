# Pluto.WB: estilo, características y análisis

Documento de referencia de cómo se ve, cómo se comporta y por qué está hecha así la app. Los números de contraste y de tamaño se midieron sobre el código real el 1 de octubre de 2026.

## 1. Concepto

**Pluto.WB** es una calculadora de finanzas personales y de intereses de tarjetas de crédito. Es un sitio estático: no tiene servidor ni base de datos, y los datos de cada persona viven en su navegador o, si ella lo decide, en su propio Google Drive.

La idea de diseño es **un estado de cuenta que se puede usar**. De ahí salen cuatro decisiones:

- El encabezado lleva una banda de líneas finas que ondulan, inspirada en el **guilloché**, el grabado que protege billetes y cheques.
- Las cifras importantes se muestran **grandes y en una tipografía ancha**, como el total de un estado de cuenta.
- Los rótulos pequeños van en **monoespaciada en mayúsculas**, como los renglones de un recibo.
- El estado de una tarjeta se comunica con **etiquetas con ícono y texto** ("Vas bien", "Menor al mínimo"), no solo con color.

Hay dos ediciones con el mismo código:

| | Pública (`/`) | Personal (`/personal/`) |
|---|---|---|
| Pestañas | Resumen, Presupuesto, Tarjetas, Simulador, Plan de pagos (5) | Las mismas más Registro diario y Préstamos (7) |
| País | Selector de 11 países, con moneda e impuesto sobre intereses | Fijo en México |
| Extras | Cartera de tarjetas, respaldo, cifrado | Además: meses sin intereses, fechas de corte y pago, recordatorios en el calendario, lector de estados de cuenta |
| Buscadores | Indexable | `noindex` |

La edición se decide con `<html data-edicion="personal">`.

## 2. Identidad visual

### Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Títulos y cifras | **Archivo** (variable: peso 100–900, ancho 62–125%) | Logotipo, totales, títulos de bloque |
| Texto | **Archivo** al ancho normal | Párrafos, botones, campos |
| Rótulos y datos | **IBM Plex Mono** (400, 500, 600) | Etiquetas en mayúsculas, números de tabla, estado de guardado |

El recurso principal de la identidad es el **eje de ancho de Archivo**. Se usa una sola familia en tres personalidades:

- Cifras y logotipo ensanchados, entre 108% y 125%.
- Texto corrido al ancho normal.

La fuente permite anchos desde 62% (condensado), pero la interfaz no los usa.

Los pesos de los títulos van de 700 a 800. Los números en columnas usan `tabular-nums` para alinear los dígitos, y las cifras grandes usan los dígitos proporcionales de la fuente.

Las fuentes se sirven desde el propio sitio (`assets/vendor/fonts`, licencia SIL OFL 1.1) con `font-display: swap`. Cada una tiene una pila de respaldo, por lo que sin la fuente la app sigue siendo legible.

### Color

La paleta es sobria y de **neutros con un matiz verdoso** hacia el acento, no de gris puro. Hay un solo color de marca.

| Rol | Claro | Oscuro |
|---|---|---|
| Fondo de página | `#EDF0EB` | `#101413` |
| Superficie de tarjetas | `#FBFCFA` | `#171C1B` |
| Texto | `#131C19` | `#ECF1EE` |
| Texto secundario | `#46524D` | `#B6C1BC` |
| Texto atenuado | `#66726D` | `#8C9893` |
| **Acento (marca)** | `#4636A3` índigo | `#A99CF4` lila |
| Bien / Atención / Mal | `#17733E` / `#8A5600` / `#B03222` | `#4CC47A` / `#E6A83E` / `#F1806E` |

**Series de datos** (fijas, en este orden, nunca rotadas): azul `#2a78d6`, naranja `#eb6834`, verde azulado `#1baf7a` e índigo `#4a3aa7`. En modo oscuro se usan los mismos tonos ajustados para ese fondo. La combinación de las tres primeras se validó con un script de separación de color para personas con daltonismo: la distancia mínima entre colores vecinos es de 9.2 en la escala OKLab×100, donde se pide 8 o más.

**Reglas de uso**

- Los textos nunca llevan el color de una serie. El color va en una marca junto al texto: un cuadro, una línea o un punto.
- Verde, ámbar y rojo se reservan para estados y siempre llevan ícono y palabra.
- El acento se usa con moderación: botón principal, pestaña activa, enlaces y la parte ".WB" del nombre.

**Tarjetas de la cartera**: 8 colores profundos que la persona elige, todos con texto blanco con contraste de 6.4 o más:

| Color | Hex |
|---|---|
| Índigo | `#2D2A6E` |
| Petróleo | `#0E5466` |
| Bosque | `#1F5A3A` |
| Vino | `#6B1E36` |
| Cobre | `#8A3F1C` |
| Grafito | `#2F3437` |
| Oro viejo | `#7A5A12` |
| Ciruela | `#4B2462` |

### Tema claro y oscuro

La app sigue el tema del sistema con `prefers-color-scheme`. El código también admite forzarlo con `data-theme="light|dark"` en la raíz. Cada color es una variable CSS definida primero para el tema claro y luego redefinida para el oscuro, así que ningún componente tiene colores sueltos.

### Forma y espacio

- Radio de esquina de 12 px en los bloques y 8 px en los controles.
- Los bloques tienen borde de 1 px y no llevan sombra. La sombra queda para lo que "flota": las tarjetas de la cartera, la ventana de contraseña, la información flotante y los avisos.
- El espacio se organiza con `grid` y `flex` con `gap`, sin márgenes sueltos entre hermanos.
- El contenido tiene un ancho máximo de 1160 px y un margen lateral de 16 a 32 px según la pantalla.
- Los textos largos se limitan a unos 70 caracteres por línea.

## 3. Componentes

| Componente | Descripción |
|---|---|
| **Encabezado** | Rótulo, logotipo "Pluto.WB", botón "Ocultar montos", estado de guardado y botón de Drive. Debajo, la banda guilloché |
| **Banda guilloché** | Canvas de 40 px de alto con 10 curvas desplazándose despacio. Unos 30 cuadros por segundo; se pausa con la pestaña oculta y se detiene con "reducir movimiento" |
| **Pestañas** | Barra pegada arriba, con scroll horizontal en pantallas angostas, navegable con las flechas del teclado. La seleccionada lleva subrayado de 2 px |
| **Bloque (`.block`)** | Tarjeta blanca con borde. Es la unidad básica de toda la interfaz |
| **Cifra principal** | Total de 42 a 64 px en Archivo ancho (por ejemplo "Te queda libre cada mes"), con etiqueta de estado debajo |
| **Barra apilada** | Reparte el ingreso entre gastos, deudas y saldo libre, con segmentos separados por 2 px y marca de "Tu ingreso" cuando hay faltante |
| **Casillas de resumen** | Rejilla de 3 o 4 columnas separadas por líneas de 1 px, con etiqueta, valor y detalle |
| **Cartera** | Tarjetas con la proporción real de una tarjeta de plástico (1.586), chip dibujado, trama de círculos concéntricos y barra de límite usado. Se deslizan de lado. Al tocar una se abre su configuración |
| **Etiqueta de estado (`.chip`)** | Píldora con ícono ✓, ! o ✕ y texto |
| **Gráficas** | SVG propio, sin librería: líneas de 2 px, columnas con extremo redondeado de 4 px y retícula de 1 px. Etiquetas solo en puntos clave y descripción para lectores de pantalla |
| **La respuesta** | Bloque con fondo del color de marca al inicio del Simulador y del Plan de pagos. Responde en una frase la pregunta de la pestaña y se actualiza al cambiar cualquier número |
| **Historial de estados de cuenta** | Dentro de cada tarjeta (edición personal): un renglón por corte, con su etiqueta de estado, los montos y los pagos aplicados |
| **Información flotante** | Cruz y recuadro oscuro que siguen el cursor en las gráficas, y recuadro simple en barras y segmentos |
| **Tablas** | Con encabezado fijo, cifras alineadas a la derecha y scroll propio |
| **Ventana de contraseña y candado** | Ventana modal con cierre con Escape y regreso del foco al botón que la abrió, y pantalla de bloqueo a pantalla completa |
| **Aviso flotante (`toast`)** | Mensajes breves, anunciados a lectores de pantalla (`aria-live`) |

## 4. Movimiento

Hay muy poco, y casi todo respeta "reducir movimiento":

- La banda guilloché ondula (se detiene con `prefers-reduced-motion: reduce`).
- Transiciones de 150 ms en botones, pestañas y tarjetas.
- Un resaltado de 1.4 s en la tarjeta que se abre desde la cartera.

No hay carruseles ni animaciones de entrada: todo lo que se debe leer está visible desde que carga la página.

## 5. Adaptación a pantallas

| Ancho | Qué cambia |
|---|---|
| Más de 900 px | Dos columnas en bloques emparejados, simulador de 340 px más resultados, tarjeta editable en dos columnas |
| 900 px o menos | Todo en una columna |
| 720 px o menos | Casillas de resumen a 2 columnas |
| 640 px o menos | Las filas de ingresos, gastos, meses y movimientos se reordenan como fichas apiladas; desaparecen los encabezados de columna |
| 380 px o menos | Campos y casillas a una columna |

Comprobado el 1 de octubre de 2026 a **320, 768 y 1280 px**, en las dos ediciones y en todas las pestañas: **0 desbordes horizontales**.

Otros detalles:

- Respeta las áreas seguras de los celulares con muesca (`env(safe-area-inset-*)`).
- Los campos numéricos abren el teclado numérico (`inputmode`).
- Las tablas y la cartera se desplazan dentro de su propio contenedor, no en toda la página.

## 6. Accesibilidad

Contrastes medidos (relación de contraste WCAG; 4.5 es el mínimo para texto normal y 3 para elementos gráficos):

| Elemento | Claro | Oscuro |
|---|---|---|
| Texto principal | 16.9 | 15.1 |
| Texto secundario | 7.9 | 9.3 |
| Texto atenuado | 4.9 | 5.8 |
| Acento sobre superficie | 8.8 | 7.2 |
| Estados bien / atención / mal | 5.7 / 6.0 / 6.1 | 7.8 / 8.2 / 6.6 |
| Series azul / naranja / verde azulado / índigo | 4.3 / **3.1** / **2.7** / 8.3 | 4.7 / 4.4 / 5.1 / 5.5 |

Todo el texto sobre las superficies de la app cumple el mínimo de 4.5. Sobre las tarjetas de la cartera, el rótulo "Debes" (blanco al 80% de opacidad, 10.5 px) tiene 4.7 en el peor color, el oro viejo. El **único punto débil de color** son las series naranja (3.1) y verde azulado (2.7) en modo claro, que quedan en el límite o bajo el 3 recomendado para gráficos. Se mitiga porque cada serie tiene siempre una leyenda con texto y marca, la gráfica tiene su etiqueta al final de la línea, y los datos están además en tablas.

Presente en el código:

- 17 atributos `role` (`tablist`, `tab`, `tabpanel`, `dialog`, `status`…), 32 `aria-label` y 9 `aria-pressed`.
- Estado visible de foco con contorno de 2 px en el color de marca.
- Las gráficas son imágenes con descripción de texto, y el significado de los colores se repite con palabras.
- Los mensajes se anuncian con `aria-live`.
- Formularios con `label` asociado y `autocomplete` correcto, incluida la contraseña (`new-password` y `current-password`).

## 7. Características funcionales

**Cálculo**
- Intereses con IVA opcional, pago mínimo con dos fórmulas bancarias (intereses más un porcentaje del saldo, o un porcentaje del saldo) y mínimo fijo.
- Tabla mes a mes de hasta 50 años, con comparación contra el pago mínimo.
- Pago necesario para liquidar una deuda en los meses que la persona elija.
- Plan para varias tarjetas con dos métodos: **avalancha** (la tasa más alta primero) y **bola de nieve** (el saldo más pequeño primero).

**Organización**
- Presupuesto con ingresos y gastos en frecuencia mensual, quincenal, semanal o anual, convertidos a mensual.
- **Cartera** con deuda total, crédito disponible, uso del límite, intereses y pagos del mes, y reparto de la deuda entre tarjetas.

**Solo en la edición personal**
- Registro diario de gastos contra el presupuesto, con exportación a CSV.
- Meses sin intereses con su proyección a 12 meses.
- Fechas de corte y pago con aviso de vencimiento, botón "Ya pagué" y recordatorios para el calendario (archivo `.ics`).
- Préstamos con tabla de pagos y simulación de abonos extra a capital.
- **Estados de cuenta mes a mes:** cada uno se guarda como un corte de la tarjeta, y los pagos del mes siguiente se aplican al corte anterior para marcarlo como pagado completo, con el mínimo, incompleto o sin pago. También se puede anotar un pago a mano.
- **Lector de estados de cuenta** en PDF o fotos, con OCR en el navegador. Quita datos sensibles y exige revisión antes de guardar. Probado con el formato de BBVA.

**Datos y seguridad**
- Guardado automático en el navegador y, opcionalmente, en el Google Drive de la persona (carpeta oculta de la app, permiso `drive.appdata`).
- Cifrado con contraseña (AES-GCM de 256 bits), bloqueo automático por inactividad y botón "Ocultar montos".
- Respaldo descargable (cifrado si hay contraseña), versión anterior recuperable y borrado completo, incluido el archivo de Drive.
- Política de seguridad de contenido que solo permite conexiones a Google, y librerías incluidas en el sitio, sin servidores de terceros.

## 8. Arquitectura

| Archivo | Contenido | Tamaño (comprimido) |
|---|---|---|
| `assets/app.js` | Toda la lógica y las pantallas: 2 657 líneas, 148 funciones | 169 KB (52 KB) |
| `assets/app.css` | Estilos y tipografías | 33 KB (7 KB) |
| `assets/vendor/` | PDF.js, Tesseract.js, español para OCR y tipografías | 12 MB, cargados solo al usarlos |
| `index.html`, `personal/index.html` | Esqueleto de cada edición con su política de seguridad | 1 KB cada una |

La primera carga de la edición personal pesa unos **192 KB comprimidos**. El lector de PDF y el de fotos (hasta 6 MB) solo se descargan cuando alguien sube un estado de cuenta.

Funcionamiento:

- **Un solo estado** (`state`) que se normaliza al leerlo, así un archivo viejo o dañado nunca rompe la app.
- **Solo se dibuja la pestaña visible.** Las demás se marcan pendientes y se dibujan al abrirlas.
- **Sin dependencias en ejecución**, salvo PDF.js y Tesseract bajo demanda. No hay framework, paso de compilación ni gestor de paquetes.

## 9. Análisis

### Fortalezas

1. **Identidad propia y coherente.** El guilloché, la tipografía ancha y los rótulos monoespaciados hacen que parezca un documento financiero y no una plantilla genérica.
2. **Privacidad fuerte por diseño.** No hay servidor que pueda filtrar datos, y todo tiene una capa más: cifrado opcional, política de seguridad, y lectura de PDF e imágenes dentro del navegador.
3. **Rápida y ligera.** 192 KB comprimidos en la primera carga y 8.6 ms por tecla.
4. **Adaptable.** 0 desbordes de 320 a 1280 px en las 7 pestañas.
5. **Honesta con la incertidumbre.** Avisa cuando los datos vienen de un OCR, pide revisar antes de guardar, y dice que sus resultados son estimaciones.
6. **Se puede mantener sin herramientas pesadas.** Un revisor de código, uno de CSS y uno de pantallas, con instrucciones en `docs/OPTIMIZACION.md`.

### Debilidades y riesgos

| Punto | Detalle | Gravedad |
|---|---|---|
| **Un solo archivo de 2 657 líneas** | `app.js` mezcla cálculo, pantallas, Drive, cifrado y lector. Es manejable hoy, pero cada función nueva lo hace más difícil de revisar | Media |
| **Sin pruebas automáticas** | Los cálculos se probaron a mano y con scripts desechables. Un cambio futuro podría romper el simulador sin que nadie lo note | Media |
| **Lector probado con un solo banco** | Solo se validó el formato de BBVA. Cada banco acomoda distinto el estado de cuenta | Media |
| **La ventana de contraseña no atrapa el foco** | Con Tab se puede salir de la ventana hacia la página de atrás. Escape y el regreso del foco sí funcionan | Media |
| **Contraste de dos series en modo claro** | Naranja 3.1 y verde azulado 2.7, bajo el 3 recomendado para gráficos (ver sección 6) | Baja |
| **Un solo idioma** | Todo está en español de México, con fechas y monedas de `es-MX`. Los países del selector cambian moneda e impuesto, pero no el idioma ni los términos bancarios | Baja |
| **Sin selector de tema** | Solo sigue al sistema. No hay botón para cambiar entre claro y oscuro | Baja |
| **Cifrado sin recuperación** | Es intencional, pero quien olvide su contraseña pierde sus datos | Aceptada |
| **Sin pantalla de instalación** | No es una PWA: no funciona sin internet la primera vez ni se puede instalar como app | Baja |
| **Dependencia de GitHub y Google** | Si cambia la política de Drive o se compromete la cuenta de GitHub, el sitio se ve afectado | Media |

### Recomendaciones

1. **Atrapar el foco en la ventana de contraseña**, para que Tab y Mayús+Tab circulen solo dentro de ella. Es un arreglo de unas 15 líneas.
2. **Pruebas automáticas de los cálculos.** Con `node --test`, sin instalar nada, cubrir los cálculos de intereses, mínimos y plan de pagos con los casos que ya se verificaron a mano.
3. **Partir `app.js` en módulos** (`calculos`, `drive`, `cifrado`, `lector`, `pantallas`) cuando supere unas 3 500 líneas. Hoy no compensa.
4. **Probar el lector con más bancos** (Banorte, Santander, Citibanamex, HSBC, Nu) con estados de cuenta reales de quien los use, usando `?depurar` para ajustar sin perder privacidad.
5. **Reforzar el contraste de las dos series.** Oscurecer ligeramente el naranja y el verde azulado en modo claro, o agregar un trazo con patrón.
6. **PWA.** Un `manifest.json` y un service worker permitirían instalarla en el celular y usarla sin conexión, sin cambiar nada de la privacidad.
7. **Selector de tema** en el encabezado, apoyándose en `data-theme`, que ya está soportado en el CSS.
8. **Evaluar Lighthouse** con el sitio publicado y registrar los resultados en `docs/`.

### Qué no cambiar

- **Sin servidor propio.** Es la razón por la que nadie puede ver los datos de nadie.
- **Sin framework.** La app carga rápido y no depende de actualizaciones de terceros.
- **El permiso `drive.appdata`.** Es el más limitado posible y evita la verificación estricta de Google.
