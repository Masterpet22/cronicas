# Interfaz de combate — referencia B

## Auditoría previa

La pantalla es `BattleScene` (Phaser 3 / Canvas), con métodos instalados desde
`battle-presentation.js`, `battle-feedback.js`, `battle-flow.js` y `battle-actions.js`.
`src/ui.js` construye barras, ranuras y tooltips. No existe un HUD DOM previo.
El lienzo lógico es 960 × 540; la cámara y el framebuffer se escalan desde
`runtime.js` y `game.js`. El escenario, los personajes y sus animaciones se
dibujan por separado de la UI, y no necesitan cambios para este trabajo.

Las barras consumen `player` / `enemy`, creados por `derivedStats` y
`createEnemyState`. Ambos tienen `chakra` y `maxChakra` reales. Los cinco
círculos son ranuras de estados (incluida Guardia), no cargas de chakra.
El antiguo sello del chakra enemigo era decorativo y ocultaba el recurso.

Las seis acciones conservan su contrato: Golpe en 1, cuatro técnicas del
loadout en 2–5, Guardia en 6. Los espacios configurables tercero y cuarto se
abren a nivel 5 y 8 (`loadoutSlotsForLevel`), no a 4 y 5 como en la ilustración.
Costes ajustados, enfriamientos, selección y ejecución pertenecen al motor.
`useJutsu` sigue siendo el único punto de ejecución para ratón/teclado/táctil.

La iniciativa es continua. Cada actor avanza con su velocidad real; al 80 %
elige acción y las técnicas preparadas recorren el último 20 %. La UI debe
representar ese avance, sin convertirlo en una cola de turnos predeterminada.
Pausa ya tiene su propia escena y ajustes. Los retratos reutilizan cabeza y
pelo existentes; los iconos de técnicas, golpe y guardia se conservan.

## Sistema visual

`hud-art.js` centraliza paleta, geometría lógica y marcos vectoriales reutilizables.
Los paneles ocupan los extremos superiores, lateral izquierdo y base central.
Se reutilizan Cinzel / Alegreya Sans locales y los recursos originales.
La fila de estados se reserva bajo las estadísticas; nunca cubre sus números.
La etiqueta central refleja iniciativa, selección, preparación y acción reales.

## Archivos modificados

- `src/battle/scenes/battle-presentation.js`: paneles superiores, retratos,
  iconos y etiquetas de estadísticas, fila de estados con tooltips, placa de fase,
  pausa, menú integrado e iniciativa con nombres y separación de marcadores.
- `src/ui.js`: nombres reales de técnicas, costes ajustados, requisitos derivados
  de las reglas de loadout, hitboxes de fila completa y selección.
- `src/battle/scenes/battle-feedback.js`: sincronización visual de vida, chakra
  enemigo, estados, Empapado, coste y enfriamiento. Sin cambios de cálculo.
- `src/battle/hud-art.js` (nuevo): tokens compartidos y marcos vectoriales.
- `src/battle/hud-accessibility.js` (nuevo): controles DOM que accionan los
  mismos botones Phaser; acceso con Tab/Enter, lectura de estadísticas y
  presentación compacta. La pausa utiliza los controles originales del juego.
- `combat-hud.css` (nuevo): foco y presentación compacta, con objetivos de al
  menos 44 px. En escritorio la imagen de la UI sigue siendo Canvas.
- `src/battle/scenes/battle-scene.js` y `pause-scene.js`: montaje y ciclo de vida
  de esas capas accesibles. Se retiran listeners y nodos al cerrar las escenas.
- `index.html` y `game.js`: carga de estilos/módulos y acceso opcional compacto
  desde la pantalla móvil. Redimensionar durante el combate conserva la partida.
- `battle-flow.js` y `battle-actions.js`: sólo versión de importación de UI.
- `tests/battle-ui.test.mjs`: actualizar expectativas visuales incompatibles con
  la nueva referencia; conservar las comprobaciones de integridad funcional.
- `scripts/verify-combat-hud.mjs`: comprobaciones reproducibles en navegador.

## Verificación

`npm test`: todas las suites pasan (reglas, snapshots de combate, iniciativa,
BattleState, arquitectura, guardados, recursos e interfaz).

`npm run smoke`: 5/6 pruebas pasan, incluyendo crear/lanzar/abandonar una partida
y completar m01, m02 y m05. La prueba restante detecta cuatro textos inferiores
a 13 px en la cabecera del Dojo (`NOVICIO`, `NIVEL`, `DEV PRUEBAS`, `DEV`). Se
reprodujo el mismo fallo sirviendo el `index.html` anterior, sin el nuevo CSS del
HUD. No se cambió esa pantalla ajena al rediseño.

El script específico del HUD comprueba tamaños táctiles y ausencia de overflow
en 1920×1080, 1600×900, 1366×768, 390×844 y 844×390; foco y tooltips; bloqueo con
ratón/atajo; vida máxima/parcial/cero/recuperación; chakra insuficiente; consumo
de una técnica real; preparación; enfriamiento; Guardia; estados con duración;
daño; pausa con la iniciativa detenida; reanudación y coincidencia de marcadores.
Los valores extremos se prueban con fixtures en un navegador aislado. La partida
del usuario no se modifica. Los encuentros de las pruebas generales se completan
con el motor real.

Las capturas y resultados están en `artifacts/combat-hud/`. Para repetir:

```powershell
node scripts/static-server.mjs
# En otra terminal:
node scripts/verify-combat-hud.mjs
```

Se compararon visualmente las capturas de escritorio y móvil. Se comprobó además
que los métodos `drawArena`, `createFighters` y `runTurnTimeline` permanecen
idénticos a los del repositorio. No se modificaron assets, cámara, animaciones,
reglas, velocidad, costes, estadísticas ni archivos del motor de daño.

## Diferencias deliberadas respecto a la ilustración

- Los nombres son Golpe veloz, Aqua Shuriken, Látigo de corriente y Guardia en
  la partida de verificación. Los huecos sin técnica se muestran como ranuras,
  con los requisitos reales NV 5 / NV 8.
- Chakra enemigo 21/21, no el 65/65 ilustrativo. Los círculos empiezan vacíos:
  sólo se iluminan cuando existe un estado real.
- Posiciones de iniciativa y placa central responden al sistema ATB existente.
  El último 20 % sigue identificado como preparación.
- Los ornamentos son vectores ligeros y la tipografía es la disponible en el
  proyecto; los detalles caligráficos no son una copia píxel a píxel.
- En teléfonos se usa una composición compacta para mantener textos y controles
  legibles, conservando el encuadre 16:9 del escenario.
