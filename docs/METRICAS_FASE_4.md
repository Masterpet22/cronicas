# Métricas de la Fase 4 · Combate y estado

Fecha de cierre: 19 de octubre de 2026.

## Resultado estructural

| Indicador | Entrada | Salida |
| --- | ---: | ---: |
| Líneas no vacías de `game.js` | 2316 | 112 |
| Líneas no vacías de `BattleScene` | integrada en `game.js` | 278 |
| Módulos bajo `src/battle/` | 0 | 17 |
| Pruebas smoke de navegador | 2 | 4 |

La escena principal quedó por debajo del límite de 800 líneas y el punto de entrada por debajo del límite de 150 líneas. La presentación, las acciones, el flujo de misión y el feedback se instalaron como colaboraciones explícitas de `BattleScene`; las escenas Phaser restantes también viven en módulos independientes.

## Estado y lógica pura

- `BattleState` documenta y serializa el estado mutable del combate.
- Daño, turnos, recompensas y creación de enemigos se prueban sin Phaser ni DOM.
- Los snapshots de combate anteriores siguen vigentes.
- El runtime compartido tiene una sola identidad de módulo en todos los imports.

## Verificación

- `npm test`: 16 suites ejecutadas, todas correctas.
- `npm run smoke`: 4 recorridos correctos en 2,3 minutos.
- Los recorridos nuevos completan `m01` y `m05`, verifican su persistencia y fallan ante errores de consola o excepciones de página.
- El recorrido de `m01` incluye investigación y encuentros; el de `m05` atraviesa la intervención previa y las fases del jefe.

No se introdujeron cambios deliberados en balance, recompensas, contenido ni reglas de campaña durante esta fase.
