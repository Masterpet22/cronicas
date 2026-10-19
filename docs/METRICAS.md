# Métricas finales de arquitectura

Fecha: 19 de octubre de 2026. Resultado de `npm run metrics` en la rama de cierre.

| Métrica | Resultado | Umbral / referencia |
| --- | ---: | ---: |
| `game.js` | 121 líneas | máximo 150 |
| `src/meta-ui.js` | 298 líneas | máximo 300 |
| `BattleScene` | 278 líneas | máximo 800 |
| Mayor vista HTML | 400 líneas o menos | máximo 400 |
| Consultas a pasos con ID literal | 0 | 0 |
| Despachos fijos a `s01`/`s02` fuera del contenido | 0 | 0 |
| Campos de campaña en el esquema base | 20 | 36 al inicio de auditoría |
| Versión del guardado | 17 | migración v16→v17 |

`src/save.js` permanece como fachada de 539 líneas; migraciones, cursor de campaña, maestro/personaje y almacenamiento de ranuras se encuentran en `src/save/`.

## Validación final

- `npm test`: 17 suites correctas.
- `npm run smoke`: 4 recorridos correctos, incluida la finalización de `m01` y `m05`.
- Las tres fixtures v16 migran a v17 conservando el progreso y los hechos no derivados.
- La arquitectura de contenido no duplica definiciones: las misiones y sus diálogos están junto a cada misión, agregados por `content/index.js`.

Esta línea base mide estructura y pruebas para el siguiente objetivo de rendimiento. No se realizaron optimizaciones de assets ni de ciclo de vida de Phaser como parte de esta refactorización.
