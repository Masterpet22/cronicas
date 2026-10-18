# Métricas de arquitectura

## Línea base — Fase 0

Medición reproducible sobre `e730d0e` (versión `0.45.1`), antes de reorganizar código de producción.

| Métrica | Valor inicial |
| --- | ---: |
| Líneas `game.js` | 2562 |
| Líneas `src/meta-ui.js` | 1281 |
| Líneas `src/save.js` | 651 |
| Llamadas `missionHasStep`/`missionStep` con ID literal | 24 |
| Despachos fijos a `s01`/`s02` fuera de `data.js` | 7 |
| Campos en `campaign` (`createDefaultSave`) | 36 |
| `SAVE_VERSION` | 16 |

La medición ejecutable es `npm run metrics`. Los despachos fijos cuentan líneas de control de flujo que comparan `missionId` o `.id` directamente con `s01`/`s02`; no cuentan datos, migraciones ni aserciones de pruebas.

El documento de planificación estimaba unas 35 llamadas con ID de paso y 43 campos de campaña. La medición directa del commit de referencia produce 24 y 36, respectivamente; estos valores reproducibles son la línea base para comparar las fases siguientes.
