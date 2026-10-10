# Sistema de animación de la marioneta

## Fuente única

Todos los movimientos aprobados viven en `src/animations/clips.js`. El juego y
el laboratorio de `puppet-calibrator.html` leen ese mismo catálogo; no se deben
copiar valores de animación entre archivos.

Cada clip declara:

- `id`: identificador estable que usarán ataques y escenas.
- `state`: estado de la máquina (`idle`, `locomotion`, `action`, `hit` o
  `defeated`).
- `status`: `draft` mientras se ajusta o `integrated` cuando está aprobado.
- `loop`: indica si el movimiento se repite.
- `tracks`: transformaciones por articulación, con duración, demora y curva.

Las coordenadas neutrales de las piezas siguen viviendo exclusivamente en
`MAN_SPRITE_LAYERS`. Un clip solo guarda desplazamientos relativos; por eso una
animación nunca debe cambiar la calibración base.

## Prioridad de estados

La máquina usa este orden, de menor a mayor prioridad:

1. reposo;
2. locomoción;
3. acción, ataque, defensa o técnica;
4. daño o aturdimiento;
5. derrota.

Un estado de menor prioridad no puede interrumpir uno superior. Al terminar una
acción se restablece la pose neutral y se vuelve al reposo correspondiente.

## Flujo para crear y aprobar un clip

1. Crear el clip con `status: "draft"` en el catálogo.
2. Revisarlo en el Laboratorio de animación del calibrador, a varias velocidades.
3. Confirmar que las piezas no se separan y que la pose base no cambia.
4. Cambiar el estado a `integrated`.
5. Referenciar su `id` desde la acción, escena o estado que corresponda.
6. Agregar una prueba que compruebe la transición y ejecutar `npm test`.

## Reposos disponibles

- `idle-natural`: reposo estándar del combate.
- `idle-alert`: respiración más corta para espera activa.
- `idle-focus`: respiración lenta para diálogos o escenas tranquilas.

Los tres mantienen la pelvis y los pies inmóviles. Solo animan torso, cuello y
hombros; el giro de cabeza es deliberadamente mínimo.
