AW139 Power Assurance Check — Carta digital (MVP)

1) Abre index.html en un navegador (Chrome/Edge recomendado).
2) Entra a “Admin / Calibración”:
   - (Opcional) define una clave admin y actívala.
   - Define los 3 paneles (esquinas: arriba-izq y abajo-der).
   - Calibra el eje X de cada panel (2 puntos del eje + valores reales).
   - Agrega líneas de ALT (panel 1): por lo menos cada 1000 ft.
   - Agrega líneas de OAT en panel ITT y panel NG: por lo menos cada 10°C.
   - Exporta el JSON para guardarlo.
3) Usa Inputs → “Calcular y graficar”.

Tip: SHIFT + click captura puntos para el paso actual.

Escalabilidad (mismo motor para otras cartas):
- Puedes abrir el modulo con parametros URL:
  - ?module=<id_modulo>
  - ?chart=<ruta_imagen_carta>
  - ?configVar=<nombre_variable_js_config>
  - ?config=<ruta_json_calibracion>
- Ejemplo:
  - power_assurance_app/index.html?module=pac&chart=power_assurance_chart.png&configVar=AW139_PAC_DEFAULT_CONFIG
  - power_assurance_app/index.html?module=ittchart2&chart=chart2.png&config=chart2_config.json
- Para una nueva carta:
  - Crea su JSON calibrado.
  - Publica un JS que exponga window.<configVar> = {...}
  - Registra la herramienta en CALC_TOOL_REGISTRY del index principal.
