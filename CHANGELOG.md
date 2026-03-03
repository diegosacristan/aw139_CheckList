# Changelog

## 1.1.9
- PAC vuelve a usar power_assurance_chart.png como carta por defecto.
- Se agrega rebase automatico de calibracion si la carta activa no coincide con la calibracion guardada.
- Se corrige la linea vertical de ITT indicado en la grafica PAC.

## 1.1.7
- Se corrigiÃ³ el error de escalado (0.79x) que causaba el desfase visual.
- Se eliminÃ³ lÃ³gica legacy incompatible.
- Reseteo automÃ¡tico de calibraciones corruptas.

## 1.1.6
- Se corrigiÃ³ el desfase visual en la graficaciÃ³n de ITT indicado vs ITT mÃ¡ximo.
- Se eliminÃ³ lÃ³gica de recuperaciÃ³n de ejes redundante.
- Se forzÃ³ actualizaciÃ³n de cachÃ© (v1.1.6).

## 1.1.0
- Se agregÃ³ versionado dual: `APP_VERSION` y `CONTENT_VERSION` visibles en UI.
- Se implementÃ³ modal de **Novedades** mostrado una sola vez por versiÃ³n.
- El Service Worker usa `CACHE_NAME` con versiÃ³n de app y limpia cachÃ©s anteriores.
- Mejoras tÃ¡ctiles de checklist para operaciÃ³n en EFB/iPad.

