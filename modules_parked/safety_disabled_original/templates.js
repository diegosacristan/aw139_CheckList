const TEMPLATES = {
  AW139_MISSION_V1: {
    templateId: "AW139_MISSION_V1",
    type: "MISSION",
    sections: [
      {
        name: "BRIEFING DE LA MISION",
        items: [
          { id: "m1", label: "Lider de mision - NOMBRADO", required: true },
          { id: "m2", label: "Reconocimiento del campo/sitio - REALIZADO", required: false },
          { id: "m3", label: "Meteorologia - CHEQUEADA", required: true },
          { id: "m4", label: "Alternos - VERIFICADOS", required: true },
          { id: "m5", label: "Vuelo en formacion - ESTABLECER", required: false },
          { id: "m6", label: "Tarjeta de riesgo - DILIGENCIADA", required: true },
          { id: "m7", label: "Controlador aereo - VERIFICADO", required: false },
          { id: "m8", label: "Frecuencias - ESTABLECIDAS", required: true },
          { id: "m9", label: "Mapa de riesgos - VERIFICADO", required: false },
          { id: "m10", label: "Riesgo BASH - VERIFICADO", required: false },
          { id: "m11", label: "Equipo de mision - REQUERIDO", required: false }
        ]
      }
    ],
    rules: {
      vip1: {
        makeRequiredItemId: "m2",
        addDetailsToItemId: "m2",
        detailsFields: [
          "Peligros del campo",
          "Posiciones de parqueo",
          "Entradas / salidas recomendadas",
          "Posibles amenazas"
        ]
      }
    }
  },

  AW139_CREW_V1: {
    templateId: "AW139_CREW_V1",
    type: "CREW",
    sections: [
      {
        name: "INTRODUCCION / ROLES",
        items: [
          { id: "c1", label: "Equipo personal y profesional", required: true },
          { id: "c2", label: "Autonomia / control psicofisico / ETTO", required: true },
          { id: "c3", label: "Resistencia de tripulacion (descanso)", required: true }
        ]
      },
      {
        name: "RIESGO / ORDEN",
        items: [
          { id: "c4", label: "Tarjeta de riesgo", required: true },
          { id: "c5", label: "Orden de vuelo", required: true }
        ]
      },
      {
        name: "MISION / SAFE START",
        items: [
          { id: "c6", label: "Mision (Seguridad - Cumplimiento - Servicio)", required: true },
          { id: "c7", label: "Safe Start (prisa / frustracion / fatiga / complacencia)", required: true }
        ]
      },
      {
        name: "TEM",
        items: [
          { id: "c8", label: "Amenazas identificadas y gestionadas", required: true },
          { id: "c9", label: "Errores identificados y solucionados", required: true },
          { id: "c10", label: "UAS recuperados", required: true },
          { id: "c11", label: "Cualquiera anuncia amenaza/error y actua; cross-check; proteger trayectoria; FACDEE", required: true }
        ]
      },
      {
        name: "AIRMANSHIP",
        items: [
          { id: "c12", label: "Disciplina", required: true },
          { id: "c13", label: "Habilidades y destreza", required: true },
          { id: "c14", label: "Conocimiento y conciencia situacional", required: true },
          { id: "c15", label: "Juicio", required: true }
        ]
      },
      {
        name: "EJECUCION / PLAN",
        items: [
          { id: "c16", label: "Rutas / altitudes / MEA", required: true },
          { id: "c17", label: "Tiempo estimado en ruta", required: false },
          { id: "c18", label: "Combustible y reabastecimiento", required: true },
          { id: "c19", label: "Pasajeros, abordaje y desabordaje", required: true },
          { id: "c20", label: "Meteo / engelamiento / ASHTAM", required: true },
          { id: "c21", label: "NOTAM / NANU / P-RAIM", required: false },
          { id: "c22", label: "Iluminacion", required: false },
          { id: "c23", label: "Horarios operativos aerodromos", required: false }
        ]
      },
      {
        name: "AERONAVE / EMERGENCIAS",
        items: [
          { id: "c24", label: "Equipo de mision", required: false },
          { id: "c25", label: "Criterios de servicio e inspeccion", required: false },
          { id: "c26", label: "Datos de rendimiento / restricciones", required: false },
          { id: "c27", label: "Equipo de emergencia", required: true },
          { id: "c28", label: "Procedimientos de emergencia y salida", required: true },
          { id: "c29", label: "Acciones PF/PM + responsabilidades tecnico/pasajeros", required: true },
          { id: "c30", label: "Puntos de reunion / remocion heridos / CMI", required: false },
          { id: "c31", label: "Transferencia de controles", required: true }
        ]
      },
      {
        name: "REGLAS",
        items: [
          { id: "c32", label: "Golden Rules (Volar / Navegar / Comunicar)", required: true },
          { id: "c33", label: "Regla de dos retos", required: true },
          { id: "c34", label: "FACDEE", required: true }
        ]
      }
    ]
  },

  AW139_PAX_V1: {
    templateId: "AW139_PAX_V1",
    type: "PAX",
    modes: {
      FULL: {
        sections: [
          { name: "Presentacion", items: ["Presentacion de la tripulacion"] },
          { name: "Datos de vuelo", items: ["Rutas", "Altitud", "Tiempo en ruta", "Condiciones meteorologicas"] },
          {
            name: "Procedimientos normales",
            items: [
              "Entrada y salida del helicoptero",
              "Asientos",
              "Cinturones de seguridad",
              "Movimientos dentro del helicoptero",
              "Comunicaciones internas",
              "Seguridad del equipo",
              "No fumar",
              "Oxigeno y mascara",
              "Reabastecimiento de combustible",
              "Proteccion de oidos",
              "Salida de la aeronave",
              "Equipo de supervivencia"
            ]
          },
          {
            name: "Procedimientos de emergencia",
            items: [
              "Salidas de emergencia",
              "Equipo de emergencia (crash kit, chalecos, extintor)",
              "Aterrizaje de emergencia",
              "Amarizaje forzoso"
            ]
          }
        ]
      },
      QUICK: {
        cards: [
          "No tocar controles / seguir instrucciones",
          "Cinturon y ajuste",
          "Headset / intercom basico",
          "Seguridad cerca del rotor / aproximacion",
          "Salidas de emergencia + evacuacion",
          "Brace / postura ante emergencia",
          "Equipo basico (chaleco/extintor si aplica)"
        ]
      }
    }
  },

  DEBRIEF_V1: {
    templateId: "DEBRIEF_V1",
    type: "DEBRIEF",
    fields: [
      { id: "d1", label: "Seguridad/UAS: se deterioraron margenes de seguridad?", required: true },
      { id: "d2", label: "Amenazas y errores: te preparamos? lo reparamos?", required: true },
      { id: "d3", label: "Normas: violamos SOP? Si es asi, por que?", required: true },
      { id: "d4", label: "Preguntas sin respuesta / no resuelto", required: false },
      { id: "d5", label: "Oportunidades de mejora", required: true }
    ],
    actionsEnabled: true
  }
};

window.SAFETY_TEMPLATES = { TEMPLATES };

