# Changelog

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
