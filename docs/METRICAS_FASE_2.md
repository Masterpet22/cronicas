# Métricas de salida — Fase 2

Fecha: 2026-10-18  
Rama: `refactor/fase-2-reglas-combate`

| Métrica | Entrada | Salida | Variación |
| --- | ---: | ---: | ---: |
| Líneas `game.js` | 2562 | 2526 | -36 |
| Líneas `src/meta-ui.js` | 1281 | 1281 | 0 |
| Líneas `src/save.js` | 651 | 654 | +3 |
| Consultas de pasos con ID literal | 24 | 0 | -24 |
| Excepciones a la guardia arquitectónica | — | 0 | — |
| Casos del snapshot de combate | 0 | 60 | +60 |
| Versión de guardado | 16 | 16 | 0 |

`src/save.js` suma tres líneas porque ahora deriva los IDs de misión desde el catálogo y evalúa la bonificación declarativa de una decisión. A cambio, ya no replica IDs de contenido en migraciones, normalización o checkpoints.

La matriz de snapshot cubre las cinco misiones principales, las dos decisiones sobre el prisionero, las dos rutas de entrada y tres cantidades de suministros. Verifica encuentros, estados derivados de todos los enemigos, interludios, recursos y rasgos de presentación. Su contenido permaneció idéntico durante toda la migración.

Validación de salida:

- `npm test`: verde, incluida la guardia arquitectónica y el snapshot.
- `npm run smoke`: verde; creación de partida, lanzamiento de M01, combate, abandono y regreso a la aldea.
- `npm run metrics`: cero consultas de pasos por ID y cero despachos fijos a secundarias.
