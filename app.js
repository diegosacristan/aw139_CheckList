/* AW139 Power Assurance Check  digital nomogram
   - Calibration-driven: user clicks points to define panel boxes, x-axis scaling, and line equations.
   - Computation replicates manual process: TQ â†’ ALT intersection â†’ transfer Y â†’ OAT intersection â†’ read max ITT/NG.
*/
(() => {
  const qs = new URLSearchParams(window.location.search);
  const APP_MODULE = qs.get('module') || 'pac';
  const CHART_IMAGE_SRC = qs.get('chart') || window.CHART_IMAGE || 'power_assurance_chart.png';
  const DEFAULT_CONFIG_VAR = qs.get('configVar') || 'AW139_PAC_DEFAULT_CONFIG';
  const CONFIG_JSON_URL = qs.get('config') || '';

  const canvas = document.getElementById('chartCanvas');
  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('statusText');
  const hudText = document.getElementById('hudText');

  const els = {
    engine: document.getElementById('engine'),
    tq: document.getElementById('tq'),
    itt: document.getElementById('itt'),
    ng: document.getElementById('ng'),
    oat: document.getElementById('oat'),
    alt: document.getElementById('alt'),
    btnCompute: document.getElementById('btnCompute'),
    btnResetView: document.getElementById('btnResetView'),
    results: document.getElementById('results'),
    readingName: document.getElementById('readingName'),
    readingSelect: document.getElementById('readingSelect'),
    readingsInfo: document.getElementById('readingsInfo'),
    btnSaveReading: document.getElementById('btnSaveReading'),
    btnLoadReading: document.getElementById('btnLoadReading'),
    btnDeleteReading: document.getElementById('btnDeleteReading'),
    btnClearCal: document.getElementById('btnClearCal'),
    btnAdminToggle: document.getElementById('btnAdminToggle'),
    adminKey: document.getElementById('adminKey'),
    btnSetAdminKey: document.getElementById('btnSetAdminKey'),
    btnClearAdminKey: document.getElementById('btnClearAdminKey'),
    btnResetAdminKey: document.getElementById('btnResetAdminKey'),
    btnCaptureToggle: document.getElementById('btnCaptureToggle'),
    calPanel: document.getElementById('calPanel'),
    calStep: document.getElementById('calStep'),
    calValue: document.getElementById('calValue'),
    calHelp: document.getElementById('calHelp'),
    btnNext: document.getElementById('btnNext'),
    btnUndo: document.getElementById('btnUndo'),
    btnSaveLine: document.getElementById('btnSaveLine'),
    lineStatus: document.getElementById('lineStatus'),
    btnExport: document.getElementById('btnExport'),
    fileImport: document.getElementById('fileImport'),
  };

  // ---------- state ----------
  const STORAGE_KEY = `aw139_${APP_MODULE}_chart_config_v2`;
  const LEGACY_STORAGE_KEY = `aw139_${APP_MODULE}_chart_config_v1`;
  const ADMIN_KEY_STORAGE = `aw139_${APP_MODULE}_admin_key_v1`;
  const LOG_STORAGE_KEY = `aw139_${APP_MODULE}_log_v1`;
  const READINGS_STORAGE_KEY = `aw139_${APP_MODULE}_readings_v1`;
  let config = normalizeConfig(loadConfig()) || emptyConfig();
  let img = new Image();
  img.src = CHART_IMAGE_SRC;

  // view transform
  let view = { scale: 1, tx: 0, ty: 0 };
  let dragging = false;
  let last = null;

  // overlays from last compute
  let overlay = {
    points: [], // {x,y,label}
    segments: [], // {a:{x,y}, b:{x,y}, style}
    warnings: [],
    computed: null
  };

  // calibration mode
  let calMode = false;
  let adminMode = false;
  let captureMode = false;
  let calClicks = []; // raw image coords clicks for current step
  const steps = buildSteps(); // list of {id, title, help, kind}
  const lineFamilyMeta = {
    altitude: { label: 'ALT', unit: 'ft', color: 'rgba(93,181,255,0.95)' },
    oat_itt: { label: 'OAT ITT', unit: 'C', color: 'rgba(255,187,88,0.95)' },
    oat_ng: { label: 'OAT NG', unit: 'C', color: 'rgba(127,224,145,0.95)' },
  };

  // ---------- helpers ----------
  function emptyConfig() {
    return {
      version: '2.0',
      image: CHART_IMAGE_SRC,
      panels: {
        p1: { name: 'TQ vs Pressure Alt', bbox: null },
        itt: { name: 'Max ITT', bbox: null },
        ng: { name: 'Max NG', bbox: null },
      },
      axes: {
        p1_x: null,
        itt_x: null,
        ng_x: null,
      },
      lines: {
        altitude: [],      // each: {value, p1:[x,y], p2:[x,y], m, b, vertical, x_const}
        oat_itt: [],       // each: {value, p1:[x,y], p2:[x,y], m, b, vertical, x_const}
        oat_ng: [],        // each: {value, p1:[x,y], p2:[x,y], m, b, vertical, x_const}
      },
      tolerances: { itt: 5, ng: 0.2 }
    };
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    refreshStatus();
  }

  function normalizeConfig(cfg) {
    if (!cfg) return null;

    const base = emptyConfig();
    const safePanels = cfg.panels || {};
    const safeAxes = cfg.axes || {};
    const safeLines = cfg.lines || {};
    const safeTol = cfg.tolerances || {};

    const fixLine = (line) => {
      if (!line || !line.p1 || !line.p2) return line;
      if (Number.isFinite(line.m)) return line;
      const x1 = line.p1[0], y1 = line.p1[1];
      const x2 = line.p2[0], y2 = line.p2[1];
      const dx = x2 - x1;
      const m = (Math.abs(dx) < 1e-6) ? Infinity : (y2 - y1) / dx;
      const b = (m === Infinity) ? null : (y1 - m * x1);
      const points = line.points && line.points.length >= 2 ? line.points : [line.p1, line.p2];
      return { ...line, points, m, b, vertical: (m === Infinity), x_const: (m === Infinity ? x1 : null) };
    };

    const fixLines = (lines) => (lines || []).map(fixLine).filter(Boolean).sort((a,b)=>a.value-b.value);

    const normalized = {
      version: cfg.version || base.version,
      image: cfg.image || base.image,
      panels: {
        p1: { ...base.panels.p1, ...(safePanels.p1 || {}) },
        itt: { ...base.panels.itt, ...(safePanels.itt || {}) },
        ng: { ...base.panels.ng, ...(safePanels.ng || {}) },
      },
      axes: {
        p1_x: safeAxes.p1_x || safeAxes.p1 || safePanels.p1?.x_axis || base.axes.p1_x,
        itt_x: safeAxes.itt_x || safeAxes.itt || safePanels.itt?.x_axis || base.axes.itt_x,
        ng_x: safeAxes.ng_x || safeAxes.ng || safePanels.ng?.x_axis || base.axes.ng_x,
      },
      lines: {
        altitude: fixLines(safeLines.altitude || safeLines.alt_ft),
        oat_itt: fixLines(safeLines.oat_itt || safeLines.oat_c_itt),
        oat_ng: fixLines(safeLines.oat_ng || safeLines.oat_c_ng),
      },
      tolerances: {
        itt: Number.isFinite(safeTol.itt) ? safeTol.itt : (Number.isFinite(safeTol.itt_c) ? safeTol.itt_c : base.tolerances.itt),
        ng: Number.isFinite(safeTol.ng) ? safeTol.ng : (Number.isFinite(safeTol.ng_pct) ? safeTol.ng_pct : base.tolerances.ng),
      }
    };

    return normalized;
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) return JSON.parse(legacy);
      return null;
    } catch (e) { return null; }
  }

  function loadBundledConfigIfNeeded() {
    const bundled = window[DEFAULT_CONFIG_VAR];
    if (!bundled) return false;
    if (isReady()) return false;
    const normalized = normalizeConfig(bundled);
    if (!normalized) return false;
    config = normalized;
    saveConfig();
    return true;
  }

  async function loadUrlConfigIfNeeded() {
    if (!CONFIG_JSON_URL) return false;
    if (isReady()) return false;
    try {
      const res = await fetch(CONFIG_JSON_URL, { cache: 'no-store' });
      if (!res.ok) return false;
      const obj = await res.json();
      const normalized = normalizeConfig(obj);
      if (!normalized) return false;
      config = normalized;
      saveConfig();
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function logRun(computed) {
    if (!computed) return;
    const entry = {
      timestamp: new Date().toISOString(),
      inputs: {
        engine: computed.engine,
        tq: computed.TQ,
        itt: computed.ITT_ind,
        ng: computed.NG_ind,
        oat: computed.OAT,
        alt: computed.ALT
      },
      outputs: {
        itt_max: computed.ITT_max,
        ng_max: computed.NG_max,
        itt_ok: computed.ittOk,
        ng_ok: computed.ngOk,
        concluyente: computed.concluyente
      },
      config_version: config.version,
      config_image: config.image
    };
    const log = loadLog();
    log.push(entry);
    const trimmed = log.slice(-200);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  }

  function loadSavedReadings() {
    try {
      const raw = localStorage.getItem(READINGS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function saveSavedReadings(items) {
    localStorage.setItem(READINGS_STORAGE_KEY, JSON.stringify(items));
  }

  function readingTitle(item) {
    const dt = item?.timestamp ? new Date(item.timestamp) : null;
    const ts = dt && !Number.isNaN(dt.getTime())
      ? dt.toLocaleString()
      : 'sin fecha';
    const name = item?.name || 'Lectura';
    const eng = item?.inputs?.engine || '?';
    return `${name} | ENG ${eng} | ${ts}`;
  }

  function refreshReadingsUI() {
    if (!els.readingSelect || !els.readingsInfo) return;
    const items = loadSavedReadings();
    els.readingSelect.innerHTML = '';
    if (!items.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Sin lecturas guardadas';
      els.readingSelect.appendChild(opt);
      els.readingsInfo.textContent = 'Sin lecturas guardadas.';
      return;
    }
    items.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = readingTitle(item);
      els.readingSelect.appendChild(opt);
    });
    els.readingsInfo.textContent = `${items.length} lectura(s) guardada(s).`;
  }

  function snapshotFromInputs() {
    return {
      engine: String(els.engine.value),
      tq: Number(els.tq.value),
      itt: Number(els.itt.value),
      ng: Number(els.ng.value),
      oat: Number(els.oat.value),
      alt: Number(els.alt.value),
    };
  }

  function refreshStatus() {
    const ready = isReady();
    statusText.textContent = ready ? 'CALIBRACIÓN - OK: cálculos habilitados.' : 'Sin calibración completa: entra a “Admin / Calibración”.';
  }

  function isReady() {
    const p = config.panels;
    if (!p.p1.bbox || !p.itt.bbox || !p.ng.bbox) return false;
    if (!config.axes.p1_x || !config.axes.itt_x || !config.axes.ng_x) return false;
    if (config.lines.altitude.length < 2) return false;
    if (config.lines.oat_itt.length < 2) return false;
    if (config.lines.oat_ng.length < 2) return false;
    return true;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function axisKey(panelKey) {
    if (panelKey === 'p1') return 'p1_x';
    if (panelKey === 'itt') return 'itt_x';
    if (panelKey === 'ng') return 'ng_x';
    return null;
  }

  function getAxis(panelKey) {
    const key = axisKey(panelKey);
    return key ? config.axes[key] : null;
  }

  function axisRange(panelKey) {
    const ax = getAxis(panelKey);
    if (!ax) return null;
    const min = Math.min(ax.v1, ax.v2);
    const max = Math.max(ax.v1, ax.v2);
    return { min, max };
  }

  function panelYRange(panelKey) {
    const bbox = config.panels[panelKey]?.bbox;
    if (!bbox) return null;
    const min = Math.min(bbox[1], bbox[3]);
    const max = Math.max(bbox[1], bbox[3]);
    return { min, max };
  }

  function inRange(v, min, max) {
    return v >= min && v <= max;
  }

  function toCanvas(pt) {
    return { x: pt.x * view.scale + view.tx, y: pt.y * view.scale + view.ty };
  }
  function toImage(pt) {
    return { x: (pt.x - view.tx) / view.scale, y: (pt.y - view.ty) / view.scale };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    draw();
  }

  function draw() {
    if (!img.complete) return;

    // clear
    ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);

    // draw chart
    ctx.save();
    ctx.translate(view.tx, view.ty);
    ctx.scale(view.scale, view.scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    // draw panels bbox if calibrating
    if (calMode) {
      drawCalibrationOverlay();
    }

    // draw computed overlay
    drawOverlay();
  }

  function drawOverlay() {
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;

    // segments
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    for (const s of overlay.segments) {
      const a = toCanvas(s.a), b = toCanvas(s.b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = s.style || 'rgba(255,80,80,0.9)';
      ctx.stroke();
    }
    ctx.restore();

    // points
    for (const p of overlay.points) {
      const c = toCanvas(p);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.95)';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (p.label) {
        drawLabel(p.label, c.x + 8, c.y - 2);
      }
    }

    // warnings in HUD
    if (overlay.warnings.length) {
      hudText.innerHTML = overlay.warnings.map(w => `âš ï¸ ${escapeHtml(w)}`).join('<br/>');
    } else {
      hudText.textContent = calMode
        ? 'Modo Admin Activo'
        : 'Usa los inputs y calcular.';
    }
  }

  function fmtCompact(v, d = 1) {
    if (!Number.isFinite(v)) return '?';
    const p = 10 ** d;
    return String(Math.round(v * p) / p);
  }

  function drawLabel(text, x, y) {
    const padX = 5;
    const padY = 3;
    ctx.font = '11px system-ui';
    const w = ctx.measureText(text).width + padX * 2;
    const h = 16;
    ctx.fillStyle = 'rgba(245,249,255,0.82)';
    ctx.fillRect(x, y - h + 2, w, h);
    ctx.strokeStyle = 'rgba(26,37,51,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y - h + 2, w, h);
    ctx.fillStyle = 'rgba(11,15,20,0.95)';
    ctx.fillText(text, x + padX, y - padY);
  }

  function drawSavedPolyline(points, color) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    const first = toCanvas({ x: points[0][0], y: points[0][1] });
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const p = toCanvas({ x: points[i][0], y: points[i][1] });
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSavedAxis(axisKey, color) {
    const axis = config.axes[axisKey];
    if (!axis || !axis.p1 || !axis.p2) return;
    drawSavedPolyline([axis.p1, axis.p2], color);
    const points = [
      { pt: axis.p1, val: axis.v1, label: 'v1' },
      { pt: axis.p2, val: axis.v2, label: 'v2' }
    ];
    for (const item of points) {
      const c = toCanvas({ x: item.pt[0], y: item.pt[1] });
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      drawLabel(`${axisKey}.${item.label}=${fmtCompact(item.val, 1)}`, c.x + 8, c.y - 2);
    }
  }

  function drawSavedLineFamily(family) {
    const meta = lineFamilyMeta[family];
    if (!meta) return;
    const lines = config.lines[family] || [];
    lines.forEach((line) => {
      const pts = lineToPoints(line);
      if (!pts || pts.length < 2) return;
      drawSavedPolyline(pts, meta.color);
      for (const p of pts) {
        const c = toCanvas({ x: p[0], y: p[1] });
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = meta.color;
        ctx.fill();
      }
      const labelPt = pts[Math.floor(pts.length / 2)];
      const labelCanvas = toCanvas({ x: labelPt[0], y: labelPt[1] });
      drawLabel(`${meta.label}: ${fmtCompact(line.value, 1)} ${meta.unit}`, labelCanvas.x + 8, labelCanvas.y - 2);
    });
  }

  function drawSavedCalibrationGeometry() {
    const s = currentStep();
    const skipAxis = (s.kind === 'xaxis') ? axisKey(s.panel) : null;
    if (skipAxis !== 'p1_x') drawSavedAxis('p1_x', 'rgba(255,132,173,0.95)');
    if (skipAxis !== 'itt_x') drawSavedAxis('itt_x', 'rgba(255,132,173,0.95)');
    if (skipAxis !== 'ng_x') drawSavedAxis('ng_x', 'rgba(255,132,173,0.95)');
    drawSavedLineFamily('altitude');
    drawSavedLineFamily('oat_itt');
    drawSavedLineFamily('oat_ng');
  }

  function drawCalibrationOverlay() {
    const panels = config.panels;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = 'rgba(43,124,255,0.9)';
    ctx.fillStyle = 'rgba(43,124,255,0.08)';

    for (const key of ['p1', 'itt', 'ng']) {
      const bbox = panels[key].bbox;
      if (!bbox) continue;
      const [x1,y1,x2,y2] = bbox;
      const a = toCanvas({x:x1,y:y1});
      const b = toCanvas({x:x2,y:y2});
      const rx = Math.min(a.x,b.x), ry = Math.min(a.y,b.y);
      const rw = Math.abs(b.x-a.x), rh = Math.abs(b.y-a.y);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(232,238,246,0.95)';
      ctx.font = '12px system-ui';
      ctx.fillText(key.toUpperCase(), rx+8, ry+16);
      ctx.fillStyle = 'rgba(43,124,255,0.08)';
    }

    ctx.setLineDash([]);
    drawSavedCalibrationGeometry();

    // current clicks for step
    for (let i = 0; i < calClicks.length; i++) {
      const pt = calClicks[i];
      const c = toCanvas({x:pt[0], y:pt[1]});
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(43,124,255,0.9)';
      ctx.fill();
      drawLabel(String(i + 1), c.x + 8, c.y + 6);
    }

    // preview polyline while capturing
    if (calClicks.length > 1) {
      ctx.beginPath();
      const first = toCanvas({x:calClicks[0][0], y:calClicks[0][1]});
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < calClicks.length; i++) {
        const p = toCanvas({x:calClicks[i][0], y:calClicks[i][1]});
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = 'rgba(43,124,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------- calibration steps ----------
  function buildSteps() {
    return [
      { id:'p1_bbox', title:'Panel 1 bbox (TQ vs ALT)', kind:'bbox', panel:'p1',
        help:'SHIFT+click dos veces: esquina superior-izq y esquina inferior-der del Panel 1.'},
      { id:'itt_bbox', title:'Panel 2 bbox (Max ITT)', kind:'bbox', panel:'itt',
        help:'SHIFT+click dos veces: esquina superior-izq y esquina inferior-der del Panel ITT.'},
      { id:'ng_bbox', title:'Panel 3 bbox (Max NG)', kind:'bbox', panel:'ng',
        help:'SHIFT+click dos veces: esquina superior-izq y esquina inferior-der del Panel NG.'},

      { id:'p1_xaxis', title:'Eje X Panel 1 (TQ)', kind:'xaxis', panel:'p1',
        help:'Define 2 puntos sobre el eje X (TQ) + escribe el valor real de cada punto. secuencia: click punto1, escribe v1, click punto2, escribe v2.'},
      { id:'itt_xaxis', title:'Eje X Panel ITT (Max ITT)', kind:'xaxis', panel:'itt',
        help:'Igual: 2 puntos del eje X en ITT + valores reales (°C).'},
      { id:'ng_xaxis', title:'Eje X Panel NG (Max NG)', kind:'xaxis', panel:'ng',
        help:'Igual: 2 puntos del eje X en NG + valores reales (%).'},
      { id:'alt_line', title:'Agregar línea ALT (Panel 1)', kind:'line', family:'altitude',
        help:'Escribe ALT (ft) en Altura. Luego captura Múltiples puntos sobre la misma línea (de izquierda a derecha) y pulsa “Guardar línea”. Mínimo 2 puntos.'},
      { id:'oat_itt_line', title:'Agregar línea OAT (Panel ITT)', kind:'line', family:'oat_itt',
        help:'Escribe OAT (°C). Luego captura múltiples puntos sobre la misma línea (de izquierda a derecha) y pulsa “Guardar línea”. Mínimo 2 puntos.'},
      { id:'oat_ng_line', title:'Agregar línea OAT (Panel NG)', kind:'line', family:'oat_ng',
        help:'Escribe OAT (°C). Luego captura múltiples puntos sobre la misma línea (de izquierda a derecha) y pulsa “Guardar línea”. Mínimo 2 puntos.'},
    ];
  }

  function populateStepSelect() {
    els.calStep.innerHTML = '';
    steps.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${i+1}. ${s.title}`;
      els.calStep.appendChild(opt);
    });
  }

  function currentStep() {
    const id = els.calStep.value;
    return steps.find(s => s.id === id) || steps[0];
  }

  function setHelp() {
    const s = currentStep();
    els.calHelp.textContent = s.help;
  }

  function updateStepUI() {
    const s = currentStep();
    const isLine = s.kind === 'line';
    els.btnNext.disabled = isLine;
    els.btnNext.textContent = isLine ? 'No aplica' : 'Siguiente';
    els.btnSaveLine.style.display = isLine ? 'inline-block' : 'none';
    els.lineStatus.textContent = isLine ? 'Puntos capturados: 0' : '';
  }

  function clearStepClicks() {
    calClicks = [];
    updateLineStatus();
  }

  function updateLineStatus() {
    const s = currentStep();
    if (s.kind !== 'line') return;
    els.lineStatus.textContent = `Puntos capturados: ${calClicks.length}`;
  }

  function dist2(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function pointToSegmentDistanceSq(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 < 1e-9) return dist2(p, a);
    const t = clamp((apx * abx + apy * aby) / ab2, 0, 1);
    const cx = a.x + t * abx;
    const cy = a.y + t * aby;
    return dist2(p, { x: cx, y: cy });
  }

  function findEditableTarget(imgPt) {
    const thresholdPx = 10;
    const thresholdImg = thresholdPx / view.scale;
    const thresholdSq = thresholdImg * thresholdImg;
    let best = null;

    const pushBest = (candidate, d2) => {
      if (d2 > thresholdSq) return;
      if (!best || d2 < best.d2) best = { ...candidate, d2 };
    };

    for (const axisKeyName of ['p1_x', 'itt_x', 'ng_x']) {
      const axis = config.axes[axisKeyName];
      if (!axis || !axis.p1 || !axis.p2) continue;
      const p1 = { x: axis.p1[0], y: axis.p1[1] };
      const p2 = { x: axis.p2[0], y: axis.p2[1] };
      pushBest({ kind: 'axis', axisKey: axisKeyName, valueKey: 'v1' }, dist2(imgPt, p1));
      pushBest({ kind: 'axis', axisKey: axisKeyName, valueKey: 'v2' }, dist2(imgPt, p2));
    }

    for (const family of ['altitude', 'oat_itt', 'oat_ng']) {
      const lines = config.lines[family] || [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const pts = lineToPoints(line);
        if (!pts || pts.length < 2) continue;
        for (let k = 0; k < pts.length; k++) {
          const p = { x: pts[k][0], y: pts[k][1] };
          pushBest({ kind: 'line', family, index: i }, dist2(imgPt, p));
        }
        for (let k = 0; k < pts.length - 1; k++) {
          const a = { x: pts[k][0], y: pts[k][1] };
          const b = { x: pts[k + 1][0], y: pts[k + 1][1] };
          pushBest({ kind: 'line', family, index: i }, pointToSegmentDistanceSq(imgPt, a, b));
        }
      }
    }
    return best;
  }

  function sortLinesFamily(family) {
    config.lines[family].sort((a, b) => a.value - b.value);
  }

  function editCalibrationTarget(target) {
    if (!target) return false;
    if (target.kind === 'axis') {
      const axis = config.axes[target.axisKey];
      if (!axis) return false;
      const curr = axis[target.valueKey];
      const raw = window.prompt(`Nuevo valor para ${target.axisKey}.${target.valueKey}:`, String(curr));
      if (raw == null) return true;
      const v = Number(raw);
      if (!Number.isFinite(v)) {
        overlay.warnings = ['Valor inválido: debe ser numérico.'];
        draw();
        return true;
      }
      axis[target.valueKey] = v;
      saveConfig();
      overlay.warnings = [];
      hudText.textContent = `Actualizado ${target.axisKey}.${target.valueKey} = ${v}`;
      draw();
      return true;
    }
    if (target.kind === 'line') {
      const line = config.lines[target.family]?.[target.index];
      if (!line) return false;
      const raw = window.prompt(`Nuevo valor para línea ${lineFamilyMeta[target.family].label}:`, String(line.value));
      if (raw == null) return true;
      const v = Number(raw);
      if (!Number.isFinite(v)) {
        overlay.warnings = ['Valor inválido: debe ser numérico.'];
        draw();
        return true;
      }
      line.value = v;
      sortLinesFamily(target.family);
      saveConfig();
      overlay.warnings = [];
      hudText.textContent = `Línea actualizada: ${lineFamilyMeta[target.family].label} = ${v}`;
      draw();
      return true;
    }
    return false;
  }

  function undoLast() {
    const s = currentStep();
    if (s.kind === 'line') {
      if (calClicks.length > 0) {
        calClicks.pop();
        updateLineStatus();
        draw();
        return;
      } else {
        config.lines[s.family].pop();
        saveConfig();
      }
    } else if (s.kind === 'bbox') {
      config.panels[s.panel].bbox = null;
      saveConfig();
    } else if (s.kind === 'xaxis') {
      const key = axisKey(s.panel);
      if (key) config.axes[key] = null;
      saveConfig();
    }
    clearStepClicks();
    updateLineStatus();
    draw();
  }

  function commitCalibrationClick(imgPt) {
    const s = currentStep();
    // bbox flow: exactly 2 points
    if (s.kind === 'bbox') {
      overlay.warnings = [];
      calClicks.push([imgPt.x, imgPt.y]);
      if (calClicks.length === 2) {
        const [a,b] = calClicks;
        config.panels[s.panel].bbox = [a[0], a[1], b[0], b[1]];
        saveConfig();
        clearStepClicks();
        hudText.textContent = 'Bounding box guardado.';
      }
      draw();
      return;
    }

    // x-axis flow is strict: p1 -> set v1 -> p2 -> set v2
    if (s.kind === 'xaxis') {
      overlay.warnings = [];
      if (!s._stash) s._stash = { p1:null, v1:null, p2:null, v2:null };
      const st = s._stash;

      if (!st.p1) {
        st.p1 = [imgPt.x, imgPt.y];
        calClicks = [st.p1];
        els.calValue.value = '';
        els.calValue.placeholder = 'Valor v1 (ej: 100)';
        hudText.textContent = 'Punto 1 capturado. Escribe v1 y pulsa Siguiente.';
        draw();
        return;
      }

      if (st.p1 && st.v1 == null) {
        overlay.warnings = ['Primero asigna v1 y pulsa Siguiente.'];
        draw();
        return;
      }

      if (!st.p2) {
        st.p2 = [imgPt.x, imgPt.y];
        calClicks = [st.p1, st.p2];
        els.calValue.value = '';
        els.calValue.placeholder = 'Valor v2 (ej: 110)';
        hudText.textContent = 'Punto 2 capturado. Escribe v2 y pulsa Siguiente.';
        draw();
        return;
      }

      overlay.warnings = ['Ya capturaste 2 puntos para este eje. Pulsa Siguiente para guardar o Deshacer para reiniciar.'];
      draw();
      return;
    }

    // line flow: N points + explicit save
    if (s.kind === 'line') {
      overlay.warnings = [];
      calClicks.push([imgPt.x, imgPt.y]);
      updateLineStatus();
      if (calClicks.length === 1) {
        hudText.textContent = 'Captura más puntos y luego pulsa Guardar línea.';
      }
      draw();
    }
  }

  function calNext() {
    const s = currentStep();
    if (s.kind === 'line') {
      overlay.warnings = ['Para líneas no se usa “Siguiente”. Captura puntos y pulsa “Guardar línea”.'];
      draw();
      return;
    }
    if (s.kind === 'xaxis') {
      if (!s._stash) s._stash = { p1:null, v1:null, p2:null, v2:null };
      const st = s._stash;
      const v = Number(els.calValue.value);
      if (!Number.isFinite(v)) {
        overlay.warnings = ['En calibración: ingresa un número en “Valor” y presiona Siguiente.'];
        draw();
        return;
      }
      if (st.p1 && st.v1 == null) {
        st.v1 = v;
        overlay.warnings = [];
        hudText.textContent = 'Ahora SHIFT+click el segundo punto del eje X.';
        draw();
        return;
      }
      if (st.p2 && st.v2 == null) {
        st.v2 = v;
        const key = axisKey(s.panel);
        if (key) {
          config.axes[key] = { panel: s.panel, p1: st.p1, v1: st.v1, p2: st.p2, v2: st.v2 };
        }
        saveConfig();
        // reset stash
        s._stash = { p1:null, v1:null, p2:null, v2:null };
        els.calValue.value = '';
        els.calValue.placeholder = 'Ej: 7000 o 10';
        overlay.warnings = [];
        clearStepClicks();
        hudText.textContent = 'Eje X guardado.';
        draw();
        return;
      }
      overlay.warnings = ['Secuencia inválida: captura p1, asigna v1, captura p2 y asigna v2.'];
      draw();
      return;
    }
    // otherwise advance select
    const idx = steps.findIndex(x => x.id === s.id);
    els.calStep.value = steps[Math.min(idx+1, steps.length-1)].id;
    setHelp();
    updateStepUI();
    clearStepClicks();
    draw();
  }

  function makeLine(p1, p2, value) {
    // y = m x + b in image coordinates
    const x1=p1[0], y1=p1[1], x2=p2[0], y2=p2[1];
    const dx = x2-x1;
    const m = (Math.abs(dx) < 1e-6) ? Infinity : (y2-y1)/dx;
    const b = (m === Infinity) ? null : (y1 - m*x1);
    return { value, p1, p2, points: [p1, p2], m, b, vertical: (m===Infinity), x_const: (m===Infinity ? x1 : null) };
  }

  function makeLineFromPoints(points, value) {
    if (!points || points.length < 2) return null;
    const p1 = points[0];
    const p2 = points[points.length - 1];
    const base = makeLine(p1, p2, value);
    return { ...base, points: points.slice() };
  }

  // ---------- math: axes and interpolation ----------
  function panelXValueToPx(panelKey, value) {
    const ax = getAxis(panelKey);
    if (!ax) return null;
    const [x1,y1] = ax.p1;
    const [x2,y2] = ax.p2;
    // assume axis is mostly horizontal; map along x direction
    const t = (value - ax.v1) / (ax.v2 - ax.v1);
    return x1 + t * (x2 - x1);
  }

  function panelXPxToValue(panelKey, xpx) {
    const ax = getAxis(panelKey);
    if (!ax) return null;
    const [x1] = ax.p1;
    const [x2] = ax.p2;
    const t = (xpx - x1) / (x2 - x1);
    return ax.v1 + t * (ax.v2 - ax.v1);
  }

  function lineToPoints(line) {
    if (line?.points?.length >= 2) return line.points;
    if (line?.p1 && line?.p2) return [line.p1, line.p2];
    return null;
  }

  function evalLineAtX(line, x) {
    const pts = lineToPoints(line);
    if (!pts) return null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      if (x < minX || x > maxX) continue;
      const dx = x2 - x1;
      if (Math.abs(dx) < 1e-6) continue;
      const t = (x - x1) / dx;
      return y1 + t * (y2 - y1);
    }
    return null;
  }

  function solveXAtY(line, y) {
    const pts = lineToPoints(line);
    if (!pts) return null;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      if (y < minY || y > maxY) continue;
      const dy = y2 - y1;
      if (Math.abs(dy) < 1e-6) continue;
      const t = (y - y1) / dy;
      return x1 + t * (x2 - x1);
    }
    return null;
  }

  function bracketLinesByValue(lines, v) {
    if (!lines || lines.length < 2) return null;
    for (let i=0;i<lines.length-1;i++){
      if (v >= lines[i].value && v <= lines[i+1].value) {
        const low = lines[i], high = lines[i+1];
        return {low, high, u: (v-low.value)/(high.value-low.value), out:false};
      }
    }
    // out of range
    return { out:true, min: lines[0].value, max: lines[lines.length-1].value };
  }

  // ---------- computation ----------
  function computeAndOverlay() {
    overlay = { points: [], segments: [], warnings: [], computed: null };

    if (!isReady()) {
      overlay.warnings.push('Calibración incompleta: define paneles, ejes X y al menos 2 líneas de ALT y 2 de OAT (ITT y NG).');
      renderResults(null);
      draw();
      return;
    }

    const TQ = Number(els.tq.value);
    const ITT_ind = Number(els.itt.value);
    const NG_ind = Number(els.ng.value);
    const OAT = Number(els.oat.value);
    const ALT = Number(els.alt.value);

    const warnings = [];
    const inputs = [TQ, ITT_ind, NG_ind, OAT, ALT];
    if (!inputs.every(Number.isFinite)) {
      warnings.push('Inputs inválidos: revisa que todos sean numéricos.');
      overlay.warnings = warnings;
      renderResults(null);
      draw();
      return;
    }

    let outOfRange = false;

    // Step 1: x from TQ on panel1 (no extrapolation)
    const tqRange = axisRange('p1');
    let x_tq = null;
    if (!tqRange) {
      warnings.push('No se pudo leer el eje X del panel 1.');
    } else if (!inRange(TQ, tqRange.min, tqRange.max)) {
      warnings.push('TQ fuera del rango del eje calibrado.');
      outOfRange = true;
    } else {
      x_tq = panelXValueToPx('p1', TQ);
      if (x_tq == null) warnings.push('No se pudo mapear TQ a panel 1.');
    }

    // Step 2: y_transfer via ALT lines interpolation on panel1 at x_tq
    const altBracket = bracketLinesByValue(config.lines.altitude, ALT);
    let y_transfer = null;
    if (!altBracket) {
      warnings.push('Faltan líneas ALT suficientes.');
    } else if (altBracket.out) {
      warnings.push('ALT fuera del rango de la carta.');
      outOfRange = true;
    } else if (x_tq != null) {
      const y_low = evalLineAtX(altBracket.low, x_tq);
      const y_high = evalLineAtX(altBracket.high, x_tq);
      if (y_low == null || y_high == null) warnings.push('No se pudo evaluar ALT en X (línea no cubre ese X).');
      else {
        y_transfer = y_low + altBracket.u * (y_high - y_low);
      }
    }

    let yInItt = false;
    let yInNg = false;
    if (y_transfer != null) {
      const ittYR = panelYRange('itt');
      const ngYR = panelYRange('ng');
      if (ittYR && inRange(y_transfer, ittYR.min, ittYR.max)) {
        yInItt = true;
      } else {
        warnings.push('Transfer fuera del rango vertical del panel ITT.');
        outOfRange = true;
      }
      if (ngYR && inRange(y_transfer, ngYR.min, ngYR.max)) {
        yInNg = true;
      } else {
        warnings.push('Transfer fuera del rango vertical del panel NG.');
        outOfRange = true;
      }
    }

    // Step 3: ITT max via OAT lines in ITT panel (solve x at y_transfer, interpolate, convert x->value)
    const oatIttBracket = bracketLinesByValue(config.lines.oat_itt, OAT);
    let ITT_max = null;
    if (!oatIttBracket) {
      warnings.push('Faltan líneas OAT en panel ITT.');
    } else if (oatIttBracket.out) {
      warnings.push('OAT fuera del rango de la carta (panel ITT).');
      outOfRange = true;
    } else if (y_transfer != null && yInItt) {
      const x_low = solveXAtY(oatIttBracket.low, y_transfer);
      const x_high = solveXAtY(oatIttBracket.high, y_transfer);
      if (x_low == null || x_high == null) warnings.push('No se pudo resolver X en panel ITT (línea no cubre ese Y).');
      else {
        const x_itt = x_low + oatIttBracket.u * (x_high - x_low);
        ITT_max = panelXPxToValue('itt', x_itt);
        // overlay
        overlay.points.push({x:x_itt, y:y_transfer, label:'ITT max'});
      }
    }

    // Step 4: NG max via OAT lines in NG panel
    const oatNgBracket = bracketLinesByValue(config.lines.oat_ng, OAT);
    let NG_max = null;
    if (!oatNgBracket) {
      warnings.push('Faltan líneas OAT en panel NG.');
    } else if (oatNgBracket.out) {
      warnings.push('OAT fuera del rango de la carta (panel NG).');
      outOfRange = true;
    } else if (y_transfer != null && yInNg) {
      const x_low = solveXAtY(oatNgBracket.low, y_transfer);
      const x_high = solveXAtY(oatNgBracket.high, y_transfer);
      if (x_low == null || x_high == null) warnings.push('No se pudo resolver X en panel NG (línea no cubre ese Y).');
      else {
        const x_ng = x_low + oatNgBracket.u * (x_high - x_low);
        NG_max = panelXPxToValue('ng', x_ng);
        overlay.points.push({x:x_ng, y:y_transfer, label:'NG max'});
      }
    }

    // overlay for process lines
    if (x_tq != null && y_transfer != null) {
      // point at panel1 intersection
      overlay.points.push({x:x_tq, y:y_transfer, label:'Transfer'});
      // vertical segment in panel1 (from near bottom of panel1 bbox to y_transfer)
      const bbox = config.panels.p1.bbox;
      if (bbox) {
        const y_bottom = Math.max(bbox[1], bbox[3]);
        overlay.segments.push({a:{x:x_tq, y:y_bottom}, b:{x:x_tq, y:y_transfer}});
      }
      // horizontal transfer line across to ITT/NG panels (visual)
      const pItt = config.panels.itt.bbox;
      const pNg = config.panels.ng.bbox;
      if (pItt) overlay.segments.push({a:{x:x_tq, y:y_transfer}, b:{x:pItt[0], y:y_transfer}, style:'rgba(255,200,80,0.9)'});
      if (pNg) overlay.segments.push({a:{x:x_tq, y:y_transfer}, b:{x:pNg[0], y:y_transfer}, style:'rgba(255,200,80,0.9)'}); 
    }

    // comparisons
    const tolItt = config.tolerances?.itt ?? 5;
    const tolNg = config.tolerances?.ng ?? 0.2;

    const ittOk = (ITT_max == null) ? null : (ITT_ind <= ITT_max + tolItt);
    const ngOk = (NG_max == null) ? null : (NG_ind <= NG_max + tolNg);

    overlay.warnings = warnings;

    const computed = {
      engine: els.engine.value,
      TQ, ITT_ind, NG_ind, OAT, ALT,
      ITT_max, NG_max,
      ittOk, ngOk,
      tolItt, tolNg,
      concluyente: !outOfRange && (ITT_max != null) && (NG_max != null)
    };
    overlay.computed = computed;
    renderResults(computed);
    logRun(computed);
    draw();
  }

  function metricZone(indicated, maxAllowed, nearBand) {
    if (!Number.isFinite(indicated) || !Number.isFinite(maxAllowed)) return 'near';
    const delta = maxAllowed - indicated;
    if (Math.abs(delta) <= nearBand) return 'near';
    return delta > nearBand ? 'good' : 'bad';
  }

  function metricZoneLabel(zone) {
    if (zone === 'good') return 'DENTRO';
    if (zone === 'near') return 'CERCA DEL LIMITE';
    return 'EXCEDIDO';
  }

  function metricBadgeClass(zone) {
    if (zone === 'good') return 'metric-status good';
    if (zone === 'near') return 'metric-status near';
    return 'metric-status bad';
  }

  function metricGauge(indicated, maxAllowed, panelKey, zone, digits = 1) {
    const range = axisRange(panelKey) || { min: 0, max: Math.max(1, maxAllowed * 1.2) };
    const min = range.min;
    const max = (range.max === range.min) ? (range.min + 1) : range.max;
    const clampPct = (v) => clamp(((v - min) / (max - min)) * 100, 0, 100);
    const pInd = clampPct(indicated);
    const pMax = clampPct(maxAllowed);
    const marker = Math.max(0, Math.min(100, pMax));
    const fill = Math.max(0, Math.min(100, pInd));
    const roundedInd = Number.isFinite(indicated) ? indicated.toFixed(digits) : '—';
    const roundedMax = Number.isFinite(maxAllowed) ? maxAllowed.toFixed(digits) : '—';
    return `
      <div class="metric-values">Indicado: <b>${roundedInd}</b>  |  Limite: <b>${roundedMax}</b></div>
      <div class="limit-track">
        <div class="limit-fill ${zone}" style="width:${fill}%"></div>
        <div class="limit-marker" style="left:${marker}%"></div>
      </div>
    `;
  }

  function renderResults(r) {
    if (!r) {
      els.results.innerHTML = '<small>Sin resultados.</small>';
      return;
    }
    const badge = (ok) => {
      if (ok === null) return '<span class="badge warn"> DATOS NO CONCLUYENTES - VERIFIQUE LOS INPUTS</span>';
      return ok ? '<span class="badge ok">Dentro</span>' : '<span class="badge bad">Fuera</span>';
    };
    const fmt = (v, d=1) => (v==null ? '—' : (Math.round(v*10**d)/10**d).toFixed(d));
    const nearIttBand = 5;
    const nearNgBand = 1;
    const ittZone = metricZone(r.ITT_ind, r.ITT_max, nearIttBand);
    const ngZone = metricZone(r.NG_ind, r.NG_max, nearNgBand);
    const ittPam = (r.ITT_max == null) ? '—' : (r.ITT_max - r.ITT_ind).toFixed(1);
    const ngPam = (r.NG_max == null) ? '—' : (r.NG_max - r.NG_ind).toFixed(1);
    els.results.innerHTML = `
      <div class="metric-card">
        <div class="metric-head">
          <div class="metric-title">ITT (°C)</div>
          <span class="${metricBadgeClass(ittZone)}">${metricZoneLabel(ittZone)}</span>
        </div>
        ${metricGauge(r.ITT_ind, r.ITT_max, 'itt', ittZone, 0)}
        <div class="metric-values">PAM: <b>${ittPam}</b> °C</div>
      </div>
      <div class="row"><label>Estado ITT (criterio)</label><div>${badge(r.ittOk)}</div></div>
      <hr/>
      <div class="metric-card">
        <div class="metric-head">
          <div class="metric-title">NG (%)</div>
          <span class="${metricBadgeClass(ngZone)}">${metricZoneLabel(ngZone)}</span>
        </div>
        ${metricGauge(r.NG_ind, r.NG_max, 'ng', ngZone, 1)}
        <div class="metric-values">PAM: <b>${ngPam}</b> %</div>
      </div>
      <div class="row"><label>Estado NG (criterio)</label><div>${badge(r.ngOk)}</div></div>
      <hr/>
      <small>
        Tolerancias: ITT ${r.tolItt}°C, NG${r.tolNg}%.
        <br/>Semaforo visual: Verde dentro, Amarillo cerca del limite (±5°C ITT / ±1% NG), Rojo excedido.
        ${r.concluyente ? '' : '<br/>Input fuera del rango de la carta o calibración incompleta; revisa manualmente.'}
      </small>
    `;
  }

  function getAdminKey() {
    const v = localStorage.getItem(ADMIN_KEY_STORAGE);
    return v && v.length ? v : null;
  }

  function saveCurrentReading() {
    const inputs = snapshotFromInputs();
    const nums = [inputs.tq, inputs.itt, inputs.ng, inputs.oat, inputs.alt];
    if (!nums.every(Number.isFinite)) {
      overlay.warnings = ['No se puede guardar: inputs incompletos o inválidos.'];
      draw();
      return;
    }
    const out = overlay.computed ? {
      itt_max: overlay.computed.ITT_max,
      ng_max: overlay.computed.NG_max,
      itt_ok: overlay.computed.ittOk,
      ng_ok: overlay.computed.ngOk,
      concluyente: overlay.computed.concluyente
    } : null;
    const name = (els.readingName?.value || '').trim() || `PAC_${new Date().toISOString().replace(/[:.]/g,'-')}`;
    const item = {
      id: `${Date.now()}_${Math.floor(Math.random()*10000)}`,
      name,
      timestamp: new Date().toISOString(),
      inputs,
      outputs: out
    };
    const items = loadSavedReadings();
    items.unshift(item);
    saveSavedReadings(items.slice(0, 500));
    if (els.readingName) els.readingName.value = '';
    refreshReadingsUI();
    if (els.readingSelect) els.readingSelect.value = item.id;
    overlay.warnings = [];
    hudText.textContent = `Lectura guardada: ${name}`;
    draw();
  }

  function loadSelectedReading() {
    if (!els.readingSelect) return;
    const id = els.readingSelect.value;
    const items = loadSavedReadings();
    const item = items.find(x => x.id === id);
    if (!item) {
      overlay.warnings = ['Selecciona una lectura válida para cargar.'];
      draw();
      return;
    }
    els.engine.value = String(item.inputs.engine ?? '1');
    els.tq.value = String(item.inputs.tq ?? '');
    els.itt.value = String(item.inputs.itt ?? '');
    els.ng.value = String(item.inputs.ng ?? '');
    els.oat.value = String(item.inputs.oat ?? '');
    els.alt.value = String(item.inputs.alt ?? '');
    overlay.warnings = [];
    computeAndOverlay();
    hudText.textContent = `Lectura cargada: ${item.name}`;
  }

  function deleteSelectedReading() {
    if (!els.readingSelect) return;
    const id = els.readingSelect.value;
    const items = loadSavedReadings();
    const idx = items.findIndex(x => x.id === id);
    if (idx < 0) {
      overlay.warnings = ['Selecciona una lectura válida para borrar.'];
      draw();
      return;
    }
    const removed = items[idx];
    items.splice(idx, 1);
    saveSavedReadings(items);
    refreshReadingsUI();
    overlay.warnings = [];
    hudText.textContent = `Lectura borrada: ${removed.name}`;
    draw();
  }

  function setAdminMode(on) {
    adminMode = on;
    calMode = on;
    els.calPanel.style.display = on ? 'block' : 'none';
    els.btnAdminToggle.textContent = on ? 'Desactivar' : 'Activar';
    hudText.textContent = on ? 'Admin activo: SHIFT+click captura. Clic normal sobre guardados edita valor.' : 'Admin desactivado.';
    draw();
  }

  function setCaptureMode(on) {
    captureMode = on;
    els.btnCaptureToggle.textContent = on ? 'Activado' : 'Desactivado';
    hudText.textContent = on
      ? 'Captura activa: clic para capturar puntos (sin Shift). Desactiva para mover.'
      : (adminMode ? 'Admin activo: SHIFT+click captura. Clic normal sobre guardados edita valor.' : 'Admin desactivado.');
    draw();
  }

  // ---------- input events ----------
  els.btnCompute.addEventListener('click', computeAndOverlay);
  els.btnResetView.addEventListener('click', () => { view = {scale:1, tx:0, ty:0}; draw(); });
  if (els.btnSaveReading) els.btnSaveReading.addEventListener('click', saveCurrentReading);
  if (els.btnLoadReading) els.btnLoadReading.addEventListener('click', loadSelectedReading);
  if (els.btnDeleteReading) els.btnDeleteReading.addEventListener('click', deleteSelectedReading);

  els.btnAdminToggle.addEventListener('click', () => {
    overlay.warnings = [];
    if (adminMode) {
      setAdminMode(false);
      setCaptureMode(false);
      return;
    }
    const stored = getAdminKey();
    if (stored && els.adminKey.value !== stored) {
      overlay.warnings = ['Clave admin incorrecta.'];
      draw();
      return;
    }
    setAdminMode(true);
  });

  els.btnCaptureToggle.addEventListener('click', () => {
    if (!adminMode) {
      overlay.warnings = ['Activa Admin para usar modo captura.'];
      draw();
      return;
    }
    setCaptureMode(!captureMode);
  });

  els.btnSetAdminKey.addEventListener('click', () => {
    const v = (els.adminKey.value || '').trim();
    if (!v) {
      overlay.warnings = ['Ingresa una clave para guardar.'];
      draw();
      return;
    }
    localStorage.setItem(ADMIN_KEY_STORAGE, v);
    overlay.warnings = ['Clave admin guardada.'];
    draw();
  });

  els.btnClearAdminKey.addEventListener('click', () => {
    const stored = getAdminKey();
    if (stored && els.adminKey.value !== stored) {
      overlay.warnings = ['Para borrar la clave, ingresa la clave actual.'];
      draw();
      return;
    }
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    els.adminKey.value = '';
    overlay.warnings = ['Clave admin borrada.'];
    draw();
  });

  els.btnResetAdminKey.addEventListener('click', () => {
    const confirm1 = window.confirm('Esto borrará la clave admin guardada. Desea continuar?');
    if (!confirm1) return;
    const confirm2 = window.prompt('Escribe BORRAR para confirmar:');
    if (confirm2 !== 'BORRAR') {
      overlay.warnings = ['Operación cancelada.'];
      draw();
      return;
    }
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    els.adminKey.value = '';
    overlay.warnings = ['Clave admin reseteada.'];
    draw();
  });

  els.btnClearCal.addEventListener('click', () => {
    config = emptyConfig();
    saveConfig();
    overlay = { points: [], segments: [], warnings: [], computed: null };
    draw();
  });

  els.calStep.addEventListener('change', () => {
    const s = currentStep();
    if (s.kind === 'xaxis') s._stash = { p1:null, v1:null, p2:null, v2:null };
    overlay.warnings = [];
    setHelp();
    updateStepUI();
    clearStepClicks();
    draw();
  });
  els.btnNext.addEventListener('click', calNext);
  els.btnUndo.addEventListener('click', undoLast);
  els.btnSaveLine.addEventListener('click', () => {
    const s = currentStep();
    if (s.kind !== 'line') return;
    const v = Number(els.calValue.value);
    if (!Number.isFinite(v)) {
      overlay.warnings = ['En calibración: para agregar una línea debes ingresar "Valor".'];
      draw();
      return;
    }
    if (calClicks.length < 2) {
      overlay.warnings = ['Necesitas al menos 2 puntos para guardar la línea.'];
      draw();
      return;
    }
    const line = makeLineFromPoints(calClicks.slice(), v);
    if (!line) {
      overlay.warnings = ['No se pudo crear la línea: puntos inválidos.'];
      draw();
      return;
    }
    config.lines[s.family].push(line);
    config.lines[s.family].sort((a,b)=>a.value-b.value);
    saveConfig();
    clearStepClicks();
    updateLineStatus();
    overlay.warnings = [];
    hudText.textContent = 'Línea guardada. Puedes agregar otra o cambiar de paso.';
    draw();
  });
  els.btnExport.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aw139_pac_chart_config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  els.fileImport.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const obj = JSON.parse(text);
      config = normalizeConfig(obj) || emptyConfig();
      saveConfig();
      overlay.warnings = [];
      draw();
    } catch (err) {
      overlay.warnings = ['No se pudo importar JSON: formato inválido.'];
      draw();
    } finally {
      els.fileImport.value = '';
    }
  });

  // ---------- canvas interactions ----------
  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const imgBefore = toImage(mouse);
    const delta = Math.sign(e.deltaY);
    const factor = delta > 0 ? 0.9 : 1.1;
    view.scale = clamp(view.scale * factor, 0.2, 8);
    const imgAfter = toImage(mouse);
    view.tx += (imgAfter.x - imgBefore.x) * view.scale;
    view.ty += (imgAfter.y - imgBefore.y) * view.scale;
    draw();
  }

  function onDown(e) {
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (calMode && (e.shiftKey || captureMode)) {
      const imgPt = toImage(pt);
      commitCalibrationClick(imgPt);
      return;
    }
    if (calMode && !captureMode && !e.shiftKey) {
      const imgPt = toImage(pt);
      const target = findEditableTarget(imgPt);
      if (editCalibrationTarget(target)) return;
    }
    dragging = true;
    last = pt;
  }
  function onMove(e) {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    view.tx += pt.x - last.x;
    view.ty += pt.y - last.y;
    last = pt;
    draw();
  }
  function onUp() { dragging = false; last = null; }

  // touch
  function onTouchStart(e){
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    onDown({clientX:t.clientX, clientY:t.clientY, shiftKey:false, preventDefault:()=>{}});
  }
  function onTouchMove(e){
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    onMove({clientX:t.clientX, clientY:t.clientY});
  }
  function onTouchEnd(){ onUp(); }

  canvas.addEventListener('wheel', onWheel, {passive:false});
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onTouchStart, {passive:true});
  canvas.addEventListener('touchmove', onTouchMove, {passive:true});
  canvas.addEventListener('touchend', onTouchEnd, {passive:true});

  // ---------- init ----------
  populateStepSelect();
  setHelp();
  updateStepUI();
  refreshReadingsUI();
  refreshStatus();
  (async () => {
    const loadedUrl = await loadUrlConfigIfNeeded();
    const loadedBundled = loadedUrl ? false : loadBundledConfigIfNeeded();
    if (loadedUrl || loadedBundled) {
      hudText.textContent = 'Configuracion calibrada cargada automaticamente.';
      refreshStatus();
      draw();
    }
  })();

  img.onload = () => {
    // fit view to screen
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / img.width;
    const sy = rect.height / img.height;
    view.scale = Math.min(sx, sy);
    view.tx = (rect.width - img.width * view.scale) / 2;
    view.ty = (rect.height - img.height * view.scale) / 2;
    draw();
  };

  window.addEventListener('resize', resize);
  resize();
})();
