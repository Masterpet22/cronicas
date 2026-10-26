# Phaser: fase 0 frente a fase 1

Muestras únicas de 3000 ms, con el mismo escenario de referencia; el delta positivo indica mayor tiempo por frame. No es una prueba estadística ni una medición GPU.

Antes: 2026-10-26T18:59:24.800Z. Después: 2026-10-26T19:38:48.971Z.

| Referencia | Escenario | FPS antes → después | Delta frame medio | p95 ms antes → después | Pico objetos/partículas/emisores/filtros | Entorno comparable |
| --- | --- | --- | ---: | --- | --- | --- |
| 1366x768-webgl-normal | battle-entry | 11.99 → 12.08 | -0.8% | 92.5 → 88.9 | 291/0/1/1 | sí |
| 1366x768-webgl-normal | charged-turn | 11.33 → 11.46 | -1.2% | 96.2 → 99.6 | 297/21/5/1 | sí |
| 1366x768-webgl-normal | elemental-technique | 11.65 → 10.7 | 8.9% | 111 → 115 | 295/10/2/2 | sí |
| 1366x768-webgl-light | battle-entry | 11.91 → 12.17 | -2.2% | 98.5 → 97.5 | 290/0/0/0 | sí |
| 1366x768-webgl-light | charged-turn | 11.92 → 12.45 | -4.3% | 90.4 → 83.6 | 290/0/0/0 | sí |
| 1366x768-webgl-light | elemental-technique | 11.47 → 11.55 | -0.7% | 94.1 → 94.7 | 292/0/0/0 | sí |
| 1366x768-canvas-normal | battle-entry | 44.55 → 43.59 | 2.2% | 24.5 → 26.3 | 291/3/1/0 | sí |
| 1366x768-canvas-normal | charged-turn | 43.2 → 37.82 | 14.2% | 26.9 → 29.4 | 297/33/5/0 | sí |
| 1366x768-canvas-normal | elemental-technique | 43.78 → 42.37 | 3.3% | 25.5 → 26.7 | 294/15/2/0 | sí |
| 1600x900-webgl-normal | battle-entry | 9.35 → 9.68 | -3.5% | 117 → 112.6 | 291/0/1/1 | sí |
| 1600x900-webgl-normal | charged-turn | 9.1 → 9.4 | -3.2% | 119.3 → 118.2 | 297/17/5/1 | sí |
| 1600x900-webgl-normal | elemental-technique | 9.08 → 8.86 | 2.5% | 140.4 → 124.8 | 295/10/2/2 | sí |
| 1600x900-webgl-light | battle-entry | 9.3 → 9.58 | -2.9% | 115.3 → 111.6 | 290/0/0/0 | sí |
| 1600x900-webgl-light | charged-turn | 9.43 → 9.76 | -3.4% | 112.2 → 134.5 | 290/0/0/0 | sí |
| 1600x900-webgl-light | elemental-technique | 9.27 → 8.63 | 7.4% | 115.3 → 123.4 | 292/0/0/0 | sí |
| 1600x900-canvas-normal | battle-entry | 34.03 → 32.72 | 4% | 30.6 → 34 | 291/2/1/0 | sí |
| 1600x900-canvas-normal | charged-turn | 33.47 → 30.07 | 11.3% | 31.8 → 37.9 | 297/32/5/0 | sí |
| 1600x900-canvas-normal | elemental-technique | 32.48 → 33.28 | -2.4% | 33.8 → 33.6 | 294/16/2/0 | sí |
| 844x390-webgl-normal | battle-entry | 41.14 → 42.88 | -4.1% | 27 → 25.2 | 291/3/1/1 | sí |
| 844x390-webgl-normal | charged-turn | 38.27 → 38.76 | -1.3% | 28.3 → 27.4 | 297/33/5/1 | sí |
| 844x390-webgl-normal | elemental-technique | 38.89 → 39.84 | -2.4% | 29.8 → 29.5 | 295/15/2/2 | sí |
| 844x390-webgl-light | battle-entry | 40.6 → 43.09 | -5.8% | 26.2 → 24.9 | 290/0/0/0 | sí |
| 844x390-webgl-light | charged-turn | 40.05 → 43.37 | -7.6% | 28.7 → 24.8 | 290/0/0/0 | sí |
| 844x390-webgl-light | elemental-technique | 36.92 → 41.77 | -11.6% | 31.8 → 26.1 | 292/0/0/0 | sí |
| 844x390-canvas-normal | battle-entry | 60.02 → 60 | 0.1% | 17.8 → 18.1 | 291/4/1/0 | sí |
| 844x390-canvas-normal | charged-turn | 60.06 → 60 | 0.1% | 17.9 → 17.9 | 297/34/5/0 | sí |
| 844x390-canvas-normal | elemental-technique | 60.01 → 60.03 | 0% | 17.8 → 18.3 | 294/14/2/0 | sí |

Errores después: 0; excesos: 0; omitidos: 0.
