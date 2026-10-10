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
- `requires`: objetivos del rig que deben existir para poder reproducirlo.
- `restore`: opcional; permite encadenar fases que mantienen la pose, como la
  preparación y el impacto de un puñetazo.

Al cargar el módulo, `schema.js` valida identificadores, estados, requisitos,
duraciones, objetivos y propiedades numéricas. Un clip inválido detiene la
carga con un diagnóstico concreto en vez de fallar silenciosamente en combate.

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

La reproducción se conecta al combate mediante funciones semánticas de
`src/fighters.js`. Las reacciones compartidas deben usar
`playFighterDamageReaction`, que acepta cualquier marioneta (jugador, rival o
futuros aliados); los clips no deben acoplarse a una escena o bando concreto.
Los combatientes que todavía no tienen rig articulado usan una reacción de
cuerpo completo como degradación compatible, así ningún tipo de cuerpo queda
sin respuesta visual mientras se añaden sus articulaciones.

## Reposos disponibles

- `idle-natural`: reposo estándar del combate.
- `idle-alert`: respiración más corta para espera activa.
- `idle-focus`: respiración lenta para diálogos o escenas tranquilas.

Los tres mantienen la pelvis y los pies inmóviles. Solo animan torso, cuello y
hombros; el giro de cabeza es deliberadamente mínimo.

## Defensa y daño

- `guard-hold`: postura sostenida con el brazo derecho delantero cubriendo el
  pecho y el rostro; el brazo trasero permanece libre.
- `guard-impact`: retroceso breve que conserva los brazos cubriendo el cuerpo.
- `hit-light`: reacción corta para daño normal.
- `hit-heavy`: reacción de cuerpo completo para golpes de al menos 16 % de la
  vida máxima, con un mínimo de 10 puntos.

El laboratorio calcula la jerarquía de la marioneta en cada fotograma. Las
rotaciones del hombro arrastran codo, muñeca y mano, y las rotaciones de cadera
arrastran rodilla, tobillo y pie, igual que en el rig de Phaser.

Los nombres `derecho` e `izquierdo` siempre describen el lado anatómico del
personaje. Los dos PNG de brazo superior fueron exportados con los nombres
intercambiados, por lo que el catálogo usa `assetId` para corregirlos sin
renombrar ni duplicar archivos.

## Runtime compartido

`runtime.js` contiene el muestreo temporal, las curvas y el cálculo de duración
que comparten Phaser y el Laboratorio. `rig.js` contiene las articulaciones,
sus relaciones padre-hijo y la asociación entre piezas y huesos. El juego y el
calibrador son adaptadores de presentación; no mantienen copias de esas reglas.

La carrera (`run-cycle` y su variante simple) y las tres fases del puñetazo
(`punch-prepare`, `punch-release`, `punch-recover`) viven ahora en el catálogo,
por lo que pueden revisarse en el Laboratorio igual que defensa y daño.
