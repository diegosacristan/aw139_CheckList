# Changelog

## 1.1.12
- Se incrementa APP_VERSION para forzar renovacion de Service Worker y cache en todos los dispositivos.

## 1.1.11
- Rediseño visual premium estilo Apple aplicado al index principal con mejoras de motion, profundidad y fluidez.
- Safety Briefings se mueve al primer lugar del menu lateral e incorpora hub de briefings con iconografia y retorno al menu.
- Se actualiza splash screen para alinear imagen, jerarquia visual y atmosfera con la nueva estetica.
- Se incrementa APP_VERSION y se incluye styles_apple.css en precache para forzar actualizacion en todos los dispositivos.

## 1.1.10
- Hotfix de despliegue: se restablece index.html principal en la raiz del proyecto.
- Se corrige la referencia que habia dejado el index principal dentro de pac/.
- Se incrementa version para forzar renovacion del Service Worker y cache en todos los dispositivos.

## 1.1.9
- PAC vuelve a usar power_assurance_chart.png como carta por defecto.
- Se agrega rebase automatico de calibracion si la carta activa no coincide con la calibracion guardada.
- Se corrige la linea vertical de ITT indicado en la grafica PAC.

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


