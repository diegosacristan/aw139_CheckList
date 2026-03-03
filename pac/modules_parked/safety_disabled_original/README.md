# Safety Briefings - AW139

## Antes / Despues

### Antes
- No existia modulo unificado de Safety Briefings (Mission / Crew / Pax / Debrief).
- No habia persistencia estructurada por vuelo/leg para briefing/debrief/TEM.
- No habia gating operacional VIP1 ni ACK por rol para cierre.
- No habia trazabilidad consolidada exportable para Safety.

### Despues
- Se agrega modulo `safety/` embebible en la app principal con rutas hash:
  - `#/hub`
  - `#/mission/:flightId/:legId`
  - `#/crew/:flightId/:legId`
  - `#/pax/:flightId/:legId`
  - `#/debrief/:flightId/:legId`
- Persistencia offline-first en IndexedDB `safety_pwa_db` con stores:
  - `flights`
  - `briefings`
  - `tem_logs`
  - `debriefs`
- Gating implementado:
  - required items + ACK por rol para `DONE`
  - regla VIP1: item m2 obligatorio + 4 subcampos obligatorios
  - PAX QUICK permite cierre con ACK TTV/PIC
- TEM Quick Log + FACDEE opcional guardado por vuelo/leg.
- Si IndexedDB no esta disponible en el iframe, el modulo cambia automaticamente a persistencia local fallback.
- Export report imprime un consolidado (print/save as PDF) leyendo siempre de DB.
- Se integra galeria visual en Safety Hub con imagenes FACDEE y emblemas operacionales.
- En briefing de tripulacion se agrega bloque guia explicito de TEM y Airmanship.
- UX tactil `CheckItem`:
  - min-height 56px
  - padding 12x16
  - separacion 8px
  - hit-area de control 56x56
  - proteccion anti-scroll: si touch vertical > 8px no togglea

## Archivos
- `safety/index.html`
- `safety/styles.css`
- `safety/app.js`
- `safety/db.js`
- `safety/templates.js`
- `safety/assets/facdee_01.jpeg`
- `safety/assets/facdee_02.jpeg`
- `safety/assets/aguila_uno_logo.png`
- `safety/assets/fac_logo.png`

## Validacion manual
1. Abrir Safety Hub y crear vuelo + leg.
2. Verificar estados iniciales `NOT STARTED` para 4 modulos.
3. Mision: dejar required sin completar y confirmar que no deja `DONE`.
4. Cambiar missionType a `VIP1` y confirmar bloqueo si faltan detalles de m2.
5. Crew: completar items + ACK PF/PM/PIC con nombre, recargar y validar persistencia.
6. Pax QUICK: marcar tarjetas, ACK TTV/PIC, cerrar en `DONE`.
7. Debrief: completar campos, crear acciones con owner/dueDate/severity/status y recargar.
8. En touch/iPad: tap rapido cambia check; scroll vertical no dispara checks accidentales.
9. Export: generar reporte y validar secciones de Mission/Crew/Pax/TEM/Debrief.
