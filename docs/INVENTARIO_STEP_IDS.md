# Inventario de decisiones por ID de paso

Fecha de corte: 2026-10-18. Se localizaron 24 decisiones de comportamiento fuera del catálogo de misiones.

| Área | Ubicación | Paso | Regla acoplada |
| --- | --- | --- | --- |
| UI previa | `game.js:186` | `lieutenant-fate` | Precarga arte y maestro para la decisión/reliquia. |
| Encuentros | `game.js:232` | `hideout-entry` | Omite el primer encuentro por entrada secreta. |
| Combate | `game.js:250` | `prisoner-intelligence` | Inicia al jefe con 85 % de vida si hubo interrogatorio. |
| Recursos | `game.js:264` | `hideout-supplies` | Habilita suministros de campo. |
| Combate | `game.js:275` | `prisoner-intelligence` | Muestra el aura de reducción de daño. |
| Tutorial | `game.js:283` | `forest-bandits` | Abre el tutorial de combate. |
| Escena | `game.js:288` | `hideout-entry` | Muestra el almacén secreto. |
| Escena | `game.js:293` | `prisoner-intelligence` | Muestra la intervención del teniente. |
| Balance | `game.js:382` | `lieutenant-fate` | Refuerza estadísticas del jefe. |
| Balance | `game.js:410` | `prisoner-intelligence` | Aplica reducción de daño al jefe. |
| Recompensa | `game.js:972` | `lieutenant-fate` | Muestra la reliquia. |
| Poscombate | `game.js:973` | `hideout-discovery` | Abre la decisión final. |
| Interludio | `game.js:986` | `canyon-traces` | Ejecuta la investigación. |
| Interludio | `game.js:987` | `lieutenant-fate` | Ejecuta la decisión del teniente. |
| Interludio | `game.js:988` | `hideout-supplies` | Ejecuta la recuperación con suministros. |
| Tutorial | `game.js:1048` | `forest-bandits` | Selecciona mensajes tutoriales. |
| Jefe | `game.js:1283` | `raizen-duel` | Selecciona el mensaje de fase II. |
| Jefe | `game.js:1677` | `raizen-duel` | Anuncia ataques pesados y tóxicos. |
| Resultado | `game.js:1924` | `forest-bandits` | Envía al epílogo de Sayo. |
| Resultado | `game.js:1942` | `lieutenant-fate` | Incluye la reliquia recuperada. |
| Resultado | `game.js:1943` | `lieutenant-fate` | Incluye la decisión de prisionero. |
| Guardado | `src/save.js:437` | `hideout-entry` | Concede monedas por entrada secreta. |
| Consejo | `src/meta-ui.js:690` | `hideout-supplies` | Cambia la recomendación táctica. |
| Lanzamiento | `src/meta-ui.js:759` | `hideout-entry` | Abre la selección de entrada. |

Las líneas son las de la línea base de la Fase 2 y pueden desplazarse durante la migración. El objetivo de salida es cero consultas por ID de paso fuera de `src/data.js`.
