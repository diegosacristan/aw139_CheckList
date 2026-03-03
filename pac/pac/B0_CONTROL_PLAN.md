# B0 - Control de Implementacion PAC (anti-alucinacion)

Fecha base: 2026-03-01
Modulo: `pac/`

## 1) Alcance congelado (source of truth)
Se implementan unicamente los requisitos del usuario, en este orden:

- G1.1 `img.onerror` con mensaje visible en canvas y `statusText`
- G1.2 Sanitizacion de `innerHTML` en puntos con datos dinamicos de usuario
- G1.3 Validaciones informativas RFM antes de `computeAndOverlay()`
- G1.4 Confirmacion en `btnClearCal`
- G2.5 Pinch-to-zoom (2 touches)
- G2.6 Banner GO/NO-GO (verde/rojo/amarillo, auto-hide 30s)
- G2.7 `nearIttBand` y `nearNgBand` desde `config.tolerances`
- G3.8 Responsive tablet `<1024px` (canvas 60vh + sidebar 40vh)
- G3.9 Responsive movil `<768px` (bottom sheet colapsable)
- G4.10 Toggle Day/Night/NVG + persistencia `localStorage`
- G5.11 Admin oculto por defecto en vista operacional
- G5.12 Remover BOM
- G5.13 Corregir caracteres Unicode corruptos en `app.js`
- G5.14 Reemplazar `window.prompt()` por modal in-app

## 2) Restricciones tecnicas fijas

- No frameworks, no librerias externas.
- Mantener compatibilidad de URL params (`?module=`, `?chart=`, `?configVar=`, `?config=`).
- No alterar logica del motor PAC salvo validaciones pre-calculo solicitadas.
- Mantener `devicePixelRatio` en canvas.
- Eventos touch en `passive` cuando aplique.

## 3) Baseline verificable

- `pac/index.html`: 133 lineas
- `pac/app.js`: 1797 lineas
- `pac/styles.css`: 467 lineas
- BOM detectado:
  - `pac/app.js`: `True`
  - `pac/index.html`: `False`
  - `pac/styles.css`: `False`
  - `config.js`: `True`

## 4) Matriz de trazabilidad (estado actual)

- G1.1: Cumplido
- G1.2: Cumplido (en inserciones con datos de usuario)
- G1.3: Cumplido
- G1.4: Cumplido
- G2.5: Pendiente
- G2.6: Pendiente
- G2.7: Pendiente
- G3.8: Pendiente
- G3.9: Pendiente
- G4.10: Pendiente
- G5.11: Pendiente
- G5.12: Pendiente
- G5.13: Pendiente
- G5.14: Pendiente

## 5) Reglas de validacion por bloque

Cada bloque se cierra solo si cumple TODO:

1. Evidencia por busqueda (`rg`) de implementacion.
2. Revisión manual de flujo principal en PAC.
3. Sin regresion funcional del calculo (misma salida para mismos datos dentro de rango).
4. Entrega de archivo(s) completo(s) modificados.

## 6) Comandos de control recomendados

- Buscar riesgos pendientes:
  - `rg -n "window.prompt\(|nearIttBand|nearNgBand|img.onerror|touchstart|btnClearCal" pac/app.js pac/index.html pac/styles.css`
- Ver BOM:
  - script PowerShell de lectura de bytes EF BB BF
- Ver presencia de config embebida:
  - `rg -n "aw139_pac_chart_config.js" pac/index.html`

## 7) Nota de ejecucion

B0 queda formalizado como contrato de implementacion para evitar perdida de contexto y alucinacion entre bloques.
