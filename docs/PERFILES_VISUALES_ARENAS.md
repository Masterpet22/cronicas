# Perfiles visuales de arena — Phaser 4, fase 1

## Contrato y selección

`src/battle/visual-profiles.js` contiene `BATTLE_VISUAL_PROFILES`. Sus claves coinciden con
`texture` en el catálogo existente `BATTLE_ARENAS` de `src/battle/runtime.js`; no hay un
segundo catálogo editable de fondos ni condiciones por misión. Añadir una arena exige
registrar su textura/fichero y su perfil. `validateBattleVisualProfiles` comprueba esa correspondencia.

| Textura | Perfil | Ambiente | Niebla | Máximo de partículas | Multiplicador de cámara |
| --- | --- | --- | --- | ---: | ---: |
| `travel-forest` | `dusk-pass` · Paso del Crepúsculo | Cálido/cobre | Polvo tenue | 6 | 0,7 |
| `bg-marsh` | `mist-marsh` · Marisma de los Juncos | Verde/azul | Bruma más ancha | 8 | 0,4 |
| `bg-moon` | `moon-shrine` · Santuario de la Luna | Índigo/violeta | Bruma fría | 6 | 0,5 |

Cada perfil declara color e intensidad ambiental, color/ancho/opacidad de viñeta,
posición/altura/color/opacidad de niebla, intensidad de cámara y densidad/vida/velocidad/color
de partículas y estilo de contacto con el suelo. Para cambiar su identidad basta editar esos
datos y recargar el juego; tampoco se conserva un condicional específico del pantano para las sombras.

## Controlador y accesibilidad

`mountArenaVisuals` en `src/battle/arena-visual-controller.js` es el único propietario del
fondo, la atmósfera y su emisor. `BattlePresentationMethods.drawArena` selecciona el fondo
y delega su montaje; ya no conserva los tres métodos de dibujo específicos por arena.

- `update({ arena })` sustituye la arena desde datos. `update()` reevalúa la calidad y la cámara.
- Actualizar sin cambios conserva los objetos y evita reconstruir capas al cambiar el volumen.
- Modo ligero o `prefers-reduced-motion` mantienen fondo, ambiente, viñeta y niebla estática,
  pero retiran el emisor ambiental y fijan la intensidad de cámara en cero.
- La preferencia de movimiento reducido se escucha en vivo; los ajustes del juego también
  notifican al controlador. Desactivar cámara deja su multiplicador en cero.
- Los impactos usan la intensidad de cámara del perfil; no cambia su daño, preparación,
  precisión, sellos, recompensas ni duración de la lógica de combate.
- No se crean filtros WebGL ni luces en esta fase. Los filtros del HUD o de los impactos
  existentes siguen sujetos a las restricciones de calidad de la fase 0.

En WebGL el ambiente usa un tinte moderado del fondo y la atmósfera usa una sola capa
geométrica. En Canvas se conserva el fondo y se rasteriza la atmósfera en una textura local
una sola vez, sin filtros. Las dos rutas conservan la identidad y el contraste; no se exige
igualdad exacta de píxeles entre renderers. La niebla es estática; las partículas aportan el
movimiento ambiental del modo normal. La atmósfera procedural animada sigue perteneciendo a fases posteriores.

El controlador usa como máximo tres objetos propios en modo normal y dos en modo simple.
Canvas usa una textura temporal de atmósfera; WebGL no crea texturas de atmósfera adicionales.
Estos recursos se incluyen en los presupuestos de la fase 0, sin elevarlos.

## Ciclo de vida

Cambiar de perfil o calidad destruye los objetos anteriores y libera sus texturas temporales.
`destroy()` es idempotente y se invoca en `shutdown`/`destroy` de la escena; retira también el
listener de movimiento reducido. El bootstrap dispone explícitamente de los controladores
al regresar a HTML, porque `Phaser.Game.destroy()` puede quedar diferido con el bucle dormido.

La prueba de reinicio encontró referencias a objetos de HUD destruidos. Se reinician las
referencias transitorias antes de reconstruirlo, para que volver a montar el combate no
intente cambiar texto o estilos de la escena anterior.

## Verificación repetible

```powershell
npm run arenas:test
npm run arenas:verify
npm run arenas:benchmark
```

- `arenas:test`: contrato y pruebas Canvas/WebGL de las tres arenas, cambios de calidad,
  movimiento reducido, sustitución de objetos, reinicio y liberación de texturas.
- `arenas:verify`: nueve capturas a 1366×768 (tres arenas × WebGL normal/ligero y Canvas)
  y JSON con recursos/errores en `artifacts/phaser-phase1/arenas/`.
- `arenas:benchmark`: las mismas 27 muestras de 3000 ms de la fase 0, en los tres tamaños
  y modos, sin tomar PNG durante la medición. Conserva intacta la línea base anterior y
  escribe `artifacts/phaser-phase1/performance/` y `artifacts/phaser-phase1/comparison.{json,md}`.

Las capturas se toman fuera de la ventana medida. La comparación comprueba renderer,
resolución, versión de Phaser, navegador y CPU; registra diferencias de frame medio y p95.
Son muestras únicas, no una prueba estadística. SwiftShader es renderizado por software;
los FPS de este entorno no representan la GPU de un jugador. No elevar los presupuestos
para ocultar una regresión ni convertir una diferencia de una sola ejecución en garantía de rendimiento.

La validación artística paralela está en `VALIDACION_PLANTILLA_ARTISTICA.md` y no se confunde
con esta fase de presentación de escenarios.

## Resultado registrado

La ejecución del 26 de octubre de 2026 cubrió las 27 combinaciones de referencia sin errores de consola ni excepciones,
omisiones ni excesos de presupuesto. Picos: 297 objetos, 34 partículas, cinco emisores y dos
filtros totales de combate (los perfiles no añaden filtros). Modo ligero: cero partículas,
emisores y filtros.

La mediana del cambio de frame medio frente a fase 0 fue −1,3 % en WebGL normal, −3,4 %
en WebGL ligero y +2,2 % en Canvas. Las muestras individuales varían: el turno cargado de
Canvas en escritorio registró mayor coste. Son observaciones de una ejecución en SwiftShader,
no prueba de una mejora estadística ni garantía para otros equipos. Consultar la tabla
completa antes de decidir futuras densidades o efectos.
