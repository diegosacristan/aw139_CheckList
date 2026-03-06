# Changelog

## 1.1.19
- Se elimina residual de gaps claros en modo NOCHE reforzando fondo oscuro continuo y quitando overlays de brillo en filas y contenedores.
- Modo NOCHE queda como arranque por defecto al abrir la app para mantener consistencia operacional.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.18
- Se fija la barra lateral en DIA y NOCHE con ancho operacional para iPad, distribución vertical completa y sin desplazamiento lateral.
- Se corrige la inestabilidad de zoom/posición al reingresar a la app con bloqueo de viewport y normalización al volver desde segundo plano.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.17
- Se reajusta la barra lateral para mejor aprovechamiento horizontal y vertical en iPad, corrigiendo escala de logo y etiquetas.
- Se corrige modo NOCHE para eliminar fondos claros residuales y recuperar continuidad visual oscura en todos los apartados.
- Se elimina el highlight conflictivo en DIA/NOCHE y se reemplaza el resaltado crítico por una variante legible sin tono café.
- Safety Briefings en NVG queda alineado al mismo layout de DIA/NOCHE y se actualiza iconografía con enfoque aeronáutico sobrio.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.16
- Resumen 1.1.13 a 1.1.16: mejora integral de interfaz para iPad con rediseño premium, ajustes de contraste y estabilidad visual por modo.
- Safety Briefings: hub optimizado con iconografía, ocultamiento de CHECK ALL y RESET en menú, y botón de regreso integrado en barra de acciones.
- T/O & LDG Profiles y paneles principales actualizados a la nueva estética manteniendo la lógica funcional existente.
- Contraste operacional reforzado: ajuste de tonos en modo DIA y restablecimiento de modo NOCHE con paleta oscura operacional.
- Modo NVG endurecido: eliminación de glare, reflejos, highlights, pulsos y animaciones para mantener luminicencia estable NVG friendly.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.15
- Se restablece modo NOCHE con paleta oscura operacional y se corrigen artefactos blancos de la estética reciente.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.14
- Se ajusta el color operacional en modo DIA para mejorar legibilidad de textos ámbar en alta iluminación y vibración.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.13
- Ajustes de calidad iPad: escalado lateral y contraste de modos DIA/NOCHE/NVG.
- Safety Briefings: se ocultan CHECK ALL y RESET en hub y el botón de regreso se integra en la barra de acciones.
- Se corrige el modal de Novedades, highlight táctil continuo y transiciones visuales para eliminar artefactos.
- T/O & LANDING PROFILES recibe adaptación visual premium consistente con el nuevo estilo.
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.12
- Se incrementa APP_VERSION para forzar renovación de Service Worker y caché en todos los dispositivos.

## 1.1.11
- Rediseño visual premium estilo Apple aplicado al index principal con mejoras de motion, profundidad y fluidez.
- Safety Briefings se mueve al primer lugar del menú lateral e incorpora hub de briefings con iconografía y retorno al menú.
- Se actualiza splash screen para alinear imagen, jerarquía visual y atmósfera con la nueva estética.
- Se incrementa APP_VERSION y se incluye styles_apple.css en precache para forzar actualización en todos los dispositivos.

## 1.1.10
- Hotfix de despliegue: se restablece index.html principal en la raíz del proyecto.
- Se corrige la referencia que había dejado el index principal dentro de pac/.
- Se incrementa versión para forzar renovación del Service Worker y caché en todos los dispositivos.

## 1.1.9
- PAC vuelve a usar power_assurance_chart.png como carta por defecto.
- Se agrega rebase automático de calibración si la carta activa no coincide con la calibración guardada.
- Se corrige la línea vertical de ITT indicado en la gráfica PAC.

## 1.1.7
- Se corrigió el error de escalado (0.79x) que causaba el desfase visual.
- Se eliminó lógica legacy incompatible.
- Reseteo automático de calibraciones corruptas.

## 1.1.6
- Se corrigió el desfase visual en la graficación de ITT indicado vs ITT máximo.
- Se eliminó lógica de recuperación de ejes redundante.
- Se forzó actualización de caché (v1.1.6).

## 1.1.0
- Se agregó versionado dual: `APP_VERSION` y `CONTENT_VERSION` visibles en UI.
- Se implementó modal de **Novedades** mostrado una sola vez por versión.
- El Service Worker usa `CACHE_NAME` con versión de app y limpia cachés anteriores.
- Mejoras táctiles de checklist para operación en EFB/iPad.
