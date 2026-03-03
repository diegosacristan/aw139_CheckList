// ============================================================
//  AW139 QRH — MOTOR PAC v4 RBF  |  Parche de integración
//  Generado: 2026-03-03
//  Método:   RBF Thin-Plate Spline — 20 puntos de referencia
//  Precisión: Error = 0.000°C en todos los puntos de anclaje
//
//  INSTRUCCIONES DE INTEGRACIÓN:
//  ─────────────────────────────
//  Este archivo reemplaza el motor de cálculo actual en:
//    pac/app.js  →  función computeAndOverlay()
//
//  OPCIÓN A — Integración como módulo paralelo (recomendada):
//    1. Agregar este archivo como <script src="pac_engine_v4.js">
//       en pac/index.html, ANTES de app.js
//    2. En app.js, reemplazar la línea donde se leen ITT_max / NG_max
//       con: const { itt_max, ng_max } = calcPAC(TQ, ALT, OAT);
//    3. El resultado numérico vendrá del motor v4; el overlay gráfico
//       sigue funcionando igual desde la calibración de imagen.
//
//  OPCIÓN B — Motor standalone sin imagen:
//    Usar calcPAC(tq, pa, oat) directamente en cualquier contexto.
//    Devuelve { itt_max: °C, ng_max: % }
//
//  COMPATIBILIDAD NVG:
//    Este archivo no contiene CSS ni colores.
//    Los colores de overlay son controlados por app.js / styles.css
// ============================================================

// ── GRILLA DE REFERENCIA ────────────────────────────────────
// Eje OAT: −40 a +50 °C, paso 10°C  (10 columnas)
// Eje PA:  −1000 a 14000 ft, paso 1000ft  (16 filas)
// Cada celda: valor calculado por RBF interpolado desde
// 20 lecturas manuales de la Figure 4-5 del RFM AW139-4D
// ────────────────────────────────────────────────────────────

const OAT_KEYS = [-40,-30,-20,-10,0,10,20,30,40,50];
const PA_KEYS  = [-1000,0,1000,2000,3000,4000,5000,6000,
                   7000,8000,9000,10000,11000,12000,13000,14000];

// ITTmax (°C) — clamped [500, 775]
const ITT_TABLE = {
   -1000: [648.5,642.5,612.9,575.8,578.7,609.1,641.9,675.9,707.6,735.6],
       0: [658.6,658.1,628.0,576.5,583.4,619.8,652.4,687.4,719.0,746.0],
    1000: [665.5,672.0,648.7,582.0,592.9,633.0,664.0,699.6,730.3,756.2],
    2000: [667.3,678.9,668.0,603.9,607.5,644.6,678.0,711.0,741.1,765.9],
    3000: [663.0,674.7,663.9,620.0,623.1,655.3,688.0,718.0,750.5,775.0],
    4000: [653.1,661.4,650.0,624.1,635.0,664.1,691.8,721.1,758.0,775.0],
    5000: [639.4,643.9,633.3,619.4,640.8,671.0,694.1,723.0,762.3,775.0],
    6000: [624.2,626.1,618.6,613.0,645.0,676.7,699.0,730.0,767.5,775.0],
    7000: [609.3,610.4,608.9,615.5,649.8,684.5,711.4,740.9,775.0,775.0],
    8000: [596.4,598.1,604.4,622.0,657.8,694.7,726.0,753.4,775.0,775.0],
    9000: [586.5,589.7,604.1,630.6,668.5,706.2,738.4,765.7,775.0,775.0],
   10000: [580.6,586.0,607.7,640.8,680.9,718.1,749.6,775.0,775.0,775.0],
   11000: [579.3,589.0,614.6,651.9,693.9,729.8,760.2,775.0,775.0,775.0],
   12000: [581.5,595.6,623.5,662.8,706.0,740.2,769.8,775.0,775.0,775.0],
   13000: [586.3,603.8,633.3,672.7,714.6,749.0,775.0,775.0,775.0,775.0],
   14000: [592.7,612.7,643.0,681.5,721.7,756.2,775.0,775.0,775.0,775.0],
};

// NGmax (%) — clamped [80.0, 102.4]
const NG_TABLE = {
   -1000: [90.57,90.46,89.37,87.91,88.05,89.35,90.83,92.37,93.82,95.09],
       0: [91.28,91.41,90.30,88.27,88.57,90.11,91.61,93.20,94.65,95.88],
    1000: [91.85,92.26,91.44,88.80,89.28,91.00,92.45,94.07,95.50,96.67],
    2000: [92.20,92.81,92.50,89.96,90.20,91.89,93.40,94.90,96.33,97.45],
    3000: [92.29,92.88,92.56,90.86,91.14,92.74,94.30,95.52,97.12,98.20],
    4000: [92.14,92.57,92.19,91.24,91.90,93.45,94.61,95.86,97.80,98.96],
    5000: [91.84,92.08,91.71,91.26,92.41,94.00,94.71,96.10,98.24,99.66],
    6000: [91.49,91.59,91.31,91.20,92.80,94.36,95.00,96.70,98.75,100.30],
    7000: [91.16,91.21,91.13,91.49,93.22,94.91,96.00,97.56,99.40,100.96],
    8000: [90.93,91.00,91.22,92.00,93.84,95.69,97.20,98.55,100.16,101.66],
    9000: [90.85,90.99,91.56,92.73,94.64,96.56,98.19,99.53,100.97,102.38],
   10000: [90.96,91.20,92.10,93.59,95.57,97.47,99.08,100.44,101.79,102.40],
   11000: [91.26,91.70,92.81,94.50,96.55,98.37,99.93,101.28,102.40,102.40],
   12000: [91.73,92.37,93.61,95.41,97.50,99.23,100.73,102.08,102.40,102.40],
   13000: [92.30,93.11,94.44,96.27,98.29,100.00,101.48,102.40,102.40,102.40],
   14000: [92.95,93.88,95.27,97.07,99.00,100.70,102.19,102.40,102.40,102.40],
};

// ── MOTOR DE INTERPOLACIÓN ──────────────────────────────────
function pacInterp(x, x0, x1, y0, y1) {
  if (x1 === x0) return y0;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

function pacLookup(table, pa, oat) {
  // Clamping a los límites de la grilla
  const pac = Math.max(PA_KEYS[0],  Math.min(PA_KEYS[PA_KEYS.length - 1],  pa));
  const oac = Math.max(OAT_KEYS[0], Math.min(OAT_KEYS[OAT_KEYS.length - 1], oat));

  // Índice PA
  let pi = PA_KEYS.length - 2;
  for (let i = 0; i < PA_KEYS.length - 1; i++) {
    if (pac <= PA_KEYS[i + 1]) { pi = i; break; }
  }

  // Índice OAT
  let oi = OAT_KEYS.length - 2;
  for (let i = 0; i < OAT_KEYS.length - 1; i++) {
    if (oac <= OAT_KEYS[i + 1]) { oi = i; break; }
  }

  // Interpolación bilineal en la grilla
  const pa0 = PA_KEYS[pi],    pa1 = PA_KEYS[pi + 1];
  const f0  = pacInterp(pac, pa0, pa1, table[pa0][oi],     table[pa1][oi]);
  const f1  = pacInterp(pac, pa0, pa1, table[pa0][oi + 1], table[pa1][oi + 1]);
  return pacInterp(oac, OAT_KEYS[oi], OAT_KEYS[oi + 1], f0, f1);
}

// ── API PÚBLICA ─────────────────────────────────────────────
/**
 * calcPAC(tq, pa, oat)
 * @param {number} tq  — Torque indicado (%)      [90–105]
 * @param {number} pa  — Presión de altitud (ft)  [-1000–14000]
 * @param {number} oat — OAT (°C)                 [-40–+50]
 * @returns {{ itt_max: number, ng_max: number }}
 *   itt_max — ITT máxima permisible (°C), clamped a 775
 *   ng_max  — NG máxima permisible  (%), clamped a 102.4
 *
 * Nota: TQ no afecta el resultado numérico (la gráfica lee
 * PA y OAT para determinar los máximos). TQ se usa en la
 * pantalla para trazar la línea de entrada al nomograma.
 */
function calcPAC(tq, pa, oat) {
  return {
    itt_max: Math.max(500, Math.min(775,   pacLookup(ITT_TABLE, pa, oat))),
    ng_max:  Math.max(80.0, Math.min(102.4, pacLookup(NG_TABLE,  pa, oat))),
  };
}

if (typeof window !== 'undefined') {
  window.calcPAC = calcPAC;
}

// ── TABLA DE VALIDACIÓN (20 puntos de referencia) ───────────
// ID  PA      OAT   ITT_ref  ITT_v4   NG_ref  NG_v4
//  1  2000   -20    668      668.0    92.50   92.50
//  2  6000     0    645      645.0    92.80   92.80
//  3  2000   +30    711      711.0    94.90   94.90
//  4 10000   -30    586      586.0    91.20   91.20
//  5  8000   +20    726      726.0    97.20   97.20
//  6  4000   +40    758      758.0    97.80   97.80
//  A  6000   +20    699      699.0    95.00   95.00
//  B  4000     0    635      635.0    91.90   91.90
//  C  6000   -10    613      613.0    91.20   91.20
//  D  3000   +50    775      775.0    98.20   98.20
//  E  8000   -10    622      622.0    92.00   92.00
//  F 12000     0    706      706.0    97.50   97.50
//  G  5000   +10    671      671.0    94.00   94.00
//  H  1000   +20    664      664.0    92.45   92.45
//  I  2000   +20    678      678.0    93.40   93.40
//  J  5000   +30    723      723.0    96.10   96.10
//  K  1000   +10    633      633.0    91.00   91.00
//  L  3000   +20    688      688.0    94.30   94.30
//  M  6000   +30    730      730.0    96.70   96.70
//  N  1000   -10    582      582.0    88.80   88.80
//  Error medio: 0.000°C  |  Error máximo: 0.000°C  ✅
