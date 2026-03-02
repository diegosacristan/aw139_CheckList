/*
Antes/Despues - Ergonomia tactil CheckItem
Antes:
- Filas checklist con hit-area reducida y target principal en cuadro pequeno.
- Sin proteccion anti-scroll en touch (riesgo de check accidental durante desplazamiento).
- Sin capa de accesibilidad consistente (role/aria/focus) para filas de checklist.

Despues:
- Cada fila checklist se mejora como .check-item (min alto 56px, padding 12x16, gap vertical 8px).
- Control visual .check-toggle con hit-area 48x48 y input asociado via label for/id.
- Tap/click en toda la fila mantiene toggle existente; Enter/Espacio tambien alternan.
- Proteccion anti-scroll: si movimiento vertical touch > 8px, se bloquea el toggle de ese tap.
- aria-checked sincronizado con clase .checked sin tocar logica de progreso/persistencia.

Como validar manualmente:
1) Desktop: click en fila y en cuadrito -> alterna check; progreso sigue correcto.
2) Teclado: tab hasta fila, Enter/Espacio -> alterna y muestra foco visible.
3) iPad/touch: tap rapido marca/desmarca; al hacer scroll vertical no se marcan filas accidentalmente.
*/
(() => {
  const CHECK_ROW_SELECTOR = 'tr[onclick*="toggle("]';
  const TOUCH_SCROLL_THRESHOLD_PX = 8;
  const CLICK_BLOCK_MS = 280;
  const rowTouchState = new WeakMap();
  let rowCounter = 0;

  function isChecklistRow(row) {
    return !!row?.querySelector('.check-col .check-box');
  }

  function ensureLabelId(row) {
    const label = row.querySelector('.item-name');
    if (!label) return null;
    if (!label.id) {
      rowCounter += 1;
      label.id = `checkitem-label-${rowCounter}`;
    }
    return label.id;
  }

  function ensureCheckControl(row, labelledById) {
    const checkCol = row.querySelector('.check-col');
    if (!checkCol) return null;

    let input = checkCol.querySelector('.check-input');
    let toggleEl = checkCol.querySelector('.check-box');

    if (!input && toggleEl) {
      rowCounter += 1;
      const inputId = `checkitem-input-${rowCounter}`;

      input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'check-input';
      input.id = inputId;
      input.tabIndex = -1;
      input.setAttribute('aria-hidden', 'true');

      // Keep current visual style classes by converting the old .check-box into <label>.
      const label = document.createElement('label');
      label.className = `${toggleEl.className} check-toggle`;
      label.setAttribute('for', inputId);
      label.setAttribute('aria-hidden', 'true');

      checkCol.replaceChild(label, toggleEl);
      checkCol.insertBefore(input, label);
      toggleEl = label;
    }

    if (toggleEl && !toggleEl.classList.contains('check-toggle')) {
      toggleEl.classList.add('check-toggle');
    }

    if (input && labelledById) {
      input.setAttribute('aria-labelledby', labelledById);
    }

    return input;
  }

  function syncRowA11y(row) {
    if (!row || !row.classList.contains('check-item')) return;
    const checked = row.classList.contains('checked');
    row.setAttribute('aria-checked', checked ? 'true' : 'false');
    const input = row.querySelector('.check-input');
    if (input) input.checked = checked;
  }

  function shouldIgnoreForSecondaryControl(target) {
    if (!target) return false;
    if (target.closest('.check-toggle') || target.closest('.check-box')) return false;
    return !!target.closest('a, button, input, select, textarea, [data-no-toggle]');
  }

  function enhanceChecklistRows() {
    document.querySelectorAll(CHECK_ROW_SELECTOR).forEach((row) => {
      if (row.dataset.checkEnhanced === '1') return;
      if (!isChecklistRow(row)) return;

      row.dataset.checkEnhanced = '1';
      row.classList.add('check-item');
      row.setAttribute('role', 'checkbox');
      row.setAttribute('tabindex', '0');

      const table = row.closest('.cl-table');
      if (table) table.classList.add('checklist-table');

      const labelledById = ensureLabelId(row);
      if (labelledById) {
        row.setAttribute('aria-labelledby', labelledById);
      }
      ensureCheckControl(row, labelledById);
      syncRowA11y(row);

      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (typeof window.toggle === 'function') {
          window.toggle(row);
          syncRowA11y(row);
        }
      });
    });
  }

  document.addEventListener('touchstart', (event) => {
    const row = event.target.closest('tr.check-item');
    if (!row || !event.touches?.length) return;
    rowTouchState.set(row, {
      startY: event.touches[0].clientY,
      moved: false,
    });
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', (event) => {
    const row = event.target.closest('tr.check-item');
    if (!row || !event.touches?.length) return;
    const state = rowTouchState.get(row);
    if (!state) return;
    if (Math.abs(event.touches[0].clientY - state.startY) > TOUCH_SCROLL_THRESHOLD_PX) {
      state.moved = true;
      rowTouchState.set(row, state);
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchend', (event) => {
    const row = event.target.closest('tr.check-item');
    if (!row) return;
    const state = rowTouchState.get(row);
    if (state?.moved) {
      row.dataset.blockToggleUntil = String(Date.now() + CLICK_BLOCK_MS);
      setTimeout(() => {
        if (row.dataset.blockToggleUntil && Date.now() >= Number(row.dataset.blockToggleUntil)) {
          delete row.dataset.blockToggleUntil;
        }
      }, CLICK_BLOCK_MS + 10);
    }
    rowTouchState.delete(row);
  }, { passive: true, capture: true });

  // Capture phase to block accidental toggles before inline onclick="toggle(this)" runs.
  document.addEventListener('click', (event) => {
    const row = event.target.closest('tr.check-item');
    if (!row) return;
    if (shouldIgnoreForSecondaryControl(event.target)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const blockUntil = Number(row.dataset.blockToggleUntil || 0);
    if (blockUntil && Date.now() <= blockUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
  }, true);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue;
      const row = mutation.target;
      if (!(row instanceof HTMLElement) || !row.matches('tr.check-item')) continue;
      syncRowA11y(row);
    }
  });

  function init() {
    enhanceChecklistRows();
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
