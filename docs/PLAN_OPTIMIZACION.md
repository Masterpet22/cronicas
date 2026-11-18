# Plan de optimización del juego

18 de noviembre de 2026 · Rama `optimizacion` · Base `d375ec1` · Seis pasos de implementación aplicados

La prioridad es recuperar una respuesta fluida del cursor al jugar y al abrir ventanas, empezando por la pausa. El trabajo cubre el navegador en ordenador y tablet. El objetivo de la primera ronda es reducir la carga dentro de Phaser 4 y de la interfaz HTML, con mediciones comparables para cada cambio.

## 1. Reproducir la lentitud del cursor y la pausa

En la base, la pausa conservaba un fotograma del combate y llamaba a `game.headlessStep()` en cada iteración. El cursor actualizaba su posición desde JavaScript en respuesta a `pointermove` mediante `requestAnimationFrame`. Un `MutationObserver` sobre todo `main` reevaluaba carga y diálogos al cambiar atributos como `class` y `style`.

La primera intervención trasladó el cursor kunai al navegador y dejó el shuriken de carga estático. El observador agrupa las comprobaciones de carga y el destello de clic sigue disponible. La pausa mantiene la imagen del combate y omite el paso de Phaser entre cambios. El menú responde a entradas HTML y solicita un fotograma al cambiar ajustes gráficos, redimensionar, reanudar o abandonar.

La comparación usó Chromium headless, superficie de 1280 × 720, canvas de 960 × 540, el mismo duelo de referencia y tres recorridos de ratón de 1,7 s por caso. Las cifras son medianas de las tres muestras. En WebGL se usó SwiftShader.

| Contexto | Renderer | p95 de fotograma, ms | p95 de entrada a siguiente rAF, ms | Pasos Phaser por muestra en pausa |
| --- | --- | ---: | ---: | ---: |
| Duelo | Canvas | 33,4 → 33,4 | 20,2 → 19,9 | — |
| Duelo | WebGL por software | 66,6 → 50,1 | 18,0 → 20,8 | — |
| Pausa | Canvas | 16,7 → 16,7 | 14,1 → 14,5 | 102 → 0 |
| Pausa | WebGL por software | 16,7 → 16,7 | 13,7 → 14,3 | 102 → 0 |

El menú ya estaba cerca de 60 FPS en este entorno. El p95 de entrada mide el tiempo del evento al siguiente callback de animación, mientras que la posición visible del cursor depende del navegador y del sistema. El ritmo medio del duelo quedó cerca de 40 FPS en Canvas y de 20 FPS con WebGL por software en ambas mediciones. Queda pendiente reproducir la lentitud en el equipo afectado y medir el toque en una tablet física.

Una prueba aislada del cursor simuló 25 cambios de clase y estilo del HUD y 24 eventos de ratón. Las búsquedas de estados de carga bajaron de 25 a 0 y las escrituras de posición del cursor en el DOM bajaron de 24 a 0.

Los siguientes pasos amplían la medición a más equipos, escenarios y resoluciones.

- Medir tres veces por caso en el equipo que presenta el problema y repetir una muestra en tablet. Usar la misma partida, tamaño de ventana y resolución física. Registrar el navegador, el renderer y la GPU efectiva, incluido SwiftShader si aparece.
- Repetir el mismo movimiento de puntero en el Dojo, en un duelo de campaña y contra tres rivales. Comparar antes de abrir una ventana, con la pausa visible y al reanudar. Añadir una ventana de equipo o maestro y la mochila de combate. En tablet, comprobar el retraso del toque y la respuesta del menú.
- Comparar cursor nativo y personalizado. Después comparar WebGL y Canvas a 960 × 540, con modo ligero activado y desactivado. Probar 1920 × 1080 en la misma escena para ver cuánto cambia al dibujar más píxeles. Anotar aparte la configuración habitual del equipo afectado.
- Medir p95 del tiempo por fotograma, retraso de entrada hasta el siguiente fotograma, tareas largas y renders de Phaser. Usar el perfil de Performance del navegador para separar JavaScript, estilo, layout, pintura y composición. El medidor interno sirve para comparar contextos y añade su propia carga, así que comparar con la misma instrumentación.
- Contar en pausa renders reales, avances de la línea temporal, tweens de combate, emisores, cambios del DOM y llamadas a `headlessStep`. Comprobar también qué ocurre al mover el cursor sobre botones, cambiar ajustes y abrir un diálogo encima de la pausa.

Punto de partida para repetir casos y extender la medición al Dojo de grupo. [Protocolo actual](RENDIMIENTO_PHASER_4.md) · [Prueba de ventanas](../tests/ui-windows-performance.spec.mjs) · [Prueba de pausa](../tests/performance.spec.mjs) · [Cursor](../src/game-cursor.js) · [Suspensión de renderizado](../src/battle/pause-rendering.js)

## 2. Reducir trabajo repetido

- **Cursor y pausa.** Primera intervención aplicada. Medir la experiencia en el equipo afectado y ampliar el recorrido al combate de grupo y al toque en tablet.
- **Animaciones.** El controlador prepara los fotogramas de cada propiedad al iniciar el clip y aplica los offsets directamente al personaje. Los combatientes comparten las pistas preparadas de los clips del catálogo. Las partículas de preparación reutilizan las matrices y calculan solo la posición de cada mano.
- **Medición.** Comparar coste de CPU y asignaciones con cuatro personajes, antes y después. Verificar tiempos de preparación, posición de manos y orden de turnos. En una pausa estable, el reloj de cada combatiente debe quedar fijo y el canvas no debe redibujarse por mover el cursor.

[Muestreo de animaciones](../src/animations/runtime.js) · [Presentación de combate](../src/battle/scenes/battle-presentation.js)

## 3. Actualizar la interfaz cuando cambien sus datos

- Separar los cambios del HUD en vida, chakra, objetivo, estados, recargas y disponibilidad. Escribir texto, clases y atributos de accesibilidad únicamente cuando cambie su valor. Consolidar actualizaciones repetidas por el mismo impacto o cambio de turno.
- Durante el avance de turnos, actualizar solo los elementos animados. Recalcular el estilo del contorno del marcador al cambiar la selección o el estado del rival. Actualizar los medidores HTML solo cuando cambie el valor que se muestra. Mantener disponible la selección por ratón, toque y teclado.
- Verificar que recibir un golpe, cambiar de rival y reanudar la pausa refrescan los datos correspondientes. Medir las escrituras al DOM y su impacto sobre la latencia del cursor con un duelo y con tres rivales.

[HUD accesible](../src/battle/hud-accessibility.js) · [Marcadores de grupo](../src/battle/training-targets.js)

### Antes y después en el Dojo contra tres rivales

Tres repeticiones por versión en Chromium headless con WebGL por software (SwiftShader), ventana de 1440 × 900, canvas de 960 × 540 y modo ligero desactivado. La base fue `90c1bf8`. Cada recorrido usó dos técnicas de fuego y un golpe veloz contra los tres objetivos, con golpes acertados y el mismo patrón de ataque de los rivales, incluido Muro Pétreo. Coincidieron el objetivo, los turnos, la vida y el chakra en cada final de ronda.

| Medida | Antes | Después | Cambio |
| --- | ---: | ---: | ---: |
| CPU por actualización de Muro Pétreo, incluido el anclaje | 0,165 ms | 0,069 ms | −58 % |
| CPU acumulada de Muro Pétreo en el recorrido | 5,6 ms | 2,5 ms | −55 % |
| Mutaciones del HUD HTML en el recorrido | 6.187 | 224 | −96,4 % |
| Mutaciones al pedir 120 refrescos con datos idénticos | 6.360 | 0 | −100 % |
| Tiempo de esos 120 refrescos, incluido el HUD de Phaser | 211,1 ms | 10,3 ms | −95,1 % |
| FPS del navegador | 16,23 | 16,61 | +0,38 FPS |
| p95 del intervalo entre fotogramas | 66,8 ms | 66,8 ms | 0 ms |

Las cifras son medianas de las tres repeticiones. El tiempo de Muro Pétreo mide el callback que muestrea la pose y la aplica al personaje. El recorrido cuenta las mutaciones bajo `.combat-access` durante las tres rondas. Los FPS se calcularon con los intervalos de `requestAnimationFrame`, y el p95 resume los p95 de las tres rondas de cada repetición. La mejora se concentró en el trabajo de JavaScript y del HUD. La cadencia de fotogramas quedó prácticamente igual en este renderer por software.

## 4. Agrupar texturas en atlas

Cada cuerpo carga un atlas con sus 14 piezas de piel y atuendo. El juego prepara una variante por cuerpo y tono usados, con el tinte aplicado a los fotogramas de piel. Las caras y el pelo siguen siendo capas con su carga propia, según las selecciones de la partida. Las piezas conservan su tamaño, alfa, anclajes y orden. Los retratos y los marcadores usan el fotograma de cabeza del mismo atlas.

Los atlas base miden 768 × 937 y 768 × 897. PNG y manifiesto suman aproximadamente 0,57 MB y 0,51 MB, frente a 0,74 MB y 0,68 MB de los PNG individuales de cada cuerpo. Las fuentes de arte también sirven al creador y al metajuego. Para regenerar las hojas, ejecutar `python scripts/pack-fighter-atlases.py` con Pillow y Node instalados.

### Antes y después de los atlas en el Dojo

Tres repeticiones por versión a partir de `67bcbab`. Se usaron las mismas tres rondas, ventana de 1440 × 900 y canvas de 960 × 540 de la prueba anterior, con Chromium headless y SwiftShader. Se instrumentaron las llamadas de dibujo WebGL en ambos lados. Una repetición de la base tuvo una variación en el daño. Coincidieron los turnos y objetivos.

| Medida | Antes | Después |
| --- | ---: | ---: |
| Texturas por combatiente, incluidas las cosméticas | 15–16 | 2–3 |
| Llamadas de dibujo WebGL por fotograma, escena completa | 93,49 | 38,33 |
| CPU medida por paso de Phaser | 7,60 ms | 6,89 ms |
| FPS del navegador | 16,43 | 16,30 |
| p95 del intervalo entre fotogramas | 66,7 ms | 66,7 ms |

Las llamadas de dibujo bajaron un 59 % y el tiempo de CPU por paso un 9 %. La cadencia de fotogramas quedó prácticamente igual en SwiftShader. La prueba de rendimiento se hizo con WebGL por software. La comprobación de compatibilidad cubre Canvas y WebGL.

[Carga de combatientes](../src/fighters.js) · [Generador de atlas](../scripts/pack-fighter-atlases.py) · [Rigs](../src/character-rigs.js)

## 5. Reutilizar efectos y objetos

La reserva por escena conserva hasta cuatro efectos libres por tipo. Reutiliza etiquetas de daño y de estado, impactos, pulsos, glifos, emisores elementales, destellos y objetos de sustitución. Las instancias concurrentes se mantienen independientes. Al terminar cada efecto se retira de la lista de dibujo y al salir se destruyen los objetos de la escena. El cursor también conserva una reserva pequeña de destellos.

El humo de derrota y transporte usa una textura compartida por modo de movimiento. En modo normal, cada aparición pasó de un contenedor y 14 círculos a una imagen reutilizable. Se mantuvo el momento en que desaparece el rival durante la nube.

### Antes y después de reutilizar los efectos en el Dojo

Tres repeticiones por versión a partir de `4e15a20`, con el recorrido de tres rondas contra tres rivales, ventana de 1440 × 900, canvas de 960 × 540 y Chromium headless con SwiftShader. Las creaciones son llamadas a las fábricas de objetos Phaser instrumentadas durante las rondas. El recorrido conserva turnos y objetivos. Hubo variación en el daño de una repetición por versión.

| Medida | Antes | Después |
| --- | ---: | ---: |
| Objetos creados durante las tres rondas | 139 | 52 |
| Creaciones durante la ronda de Golpe veloz | 21 | 0 |
| CPU medida por paso de Phaser | 6,36 ms | 7,01 ms |
| Llamadas de dibujo por fotograma | 38,32 | 38,32 |
| FPS del navegador | 17,34 | 16,34 |
| p95 del intervalo entre fotogramas | 66,7 ms | 66,7 ms |

Se crearon un 63 % menos de objetos. La mediana de FPS quedó un fotograma por segundo por debajo de la base en este entorno. La prueba de rendimiento mide las rondas de ataque. La desaparición con humo y su reutilización se comprueban en la prueba de derrotas del Dojo.

[Cursor y destello](../src/game-cursor.js) · [Impactos y etiquetas](../src/battle/scenes/battle-feedback.js) · [Humo](../src/battle/teleport-transition.js)

## 6. Liberar recursos fuera de uso

Al volver al Dojo, Phaser se detiene y libera los atlas, rostros, fondos y efectos del combate anterior que el recorrido más reciente dejó de usar. Las animaciones que referencian texturas retiradas también se eliminan. Se conserva la instancia de Phaser y su caché del último recorrido para que un combate repetido pueda usar los mismos recursos. El Dojo omite la precarga de fondos de campaña, de exhibición y de recompensas que no aparecen en el entrenamiento.

El combate usa el contexto de audio de Phaser y desconecta los nodos al terminar las notas. El contexto privado se cierra al desmontar la escena si el navegador necesita ese respaldo. Los manejadores de las interfaces de combate y pausa se sueltan al salir.

### Memoria en el Dojo antes y después de liberar recursos

Se hicieron diez ciclos por versión con tres rivales, alternando los tonos de piel y volviendo al tono inicial. Cada ciclo entró, pausó, reanudó y regresó al Dojo. El primer ciclo incluyó tres revanchas. Se solicitó una recolección de basura mediante CDP antes de medir el heap. La memoria de texturas es una estimación RGBA de cuatro bytes por píxel de cada fuente registrada en Phaser.

| Tras el décimo regreso | Antes | Después |
| --- | ---: | ---: |
| Texturas de Phaser registradas | 60 | 38 |
| Memoria estimada de texturas | 154,85 MB | 101,30 MB |
| Atlas de tono retenidos | 9 | 1 |
| Contextos de audio creados durante el recorrido | 14 | 1 |
| Heap de JavaScript tras recolección | 12,39 MB | 12,36 MB |

Del segundo al noveno regreso, la caché dejó de crecer con cada tono. Se mantuvo en 40 texturas y 105,23 MB estimados, con dos tonos en uso. En los diez regresos quedaron cero escenas activas, objetos visibles, emisores, filtros activos y temporizadores de combate. El total de listeners internos de escenas aparcadas se mantuvo en 168. Durante las tres revanchas se conservó el mismo contexto de audio y el mismo atlas del jugador. La reducción de 53,55 MB corresponde a las fuentes de textura registradas. El heap de JavaScript se mantuvo en un rango cercano al de la base.

En una comprobación posterior de 16 entradas con el mismo tono, el Dojo conservó un contexto de audio. Retuvo 36 texturas en los tres primeros regresos y se mantuvo en 37 desde el cuarto. El heap creció más en las primeras entradas y pasó de 12,08 a 12,20 MB entre los regresos 10 y 16. Estas muestras distinguen el tamaño de la caché de texturas del heap de JavaScript.

### FPS en el Dojo antes y después de liberar recursos

Tres repeticiones por versión frente a `01aa097`, con el mismo recorrido de tres rondas, ventana de 1440 × 900, canvas de 960 × 540 y Chromium headless con WebGL por software (SwiftShader).

| Medida | Antes | Después |
| --- | ---: | ---: |
| FPS del navegador, mediana | 16,53 | 16,52 |
| p95 del intervalo entre fotogramas | 66,7 ms | 66,7 ms |

La reducción de memoria se observó al cargar y aparcar el juego. El ritmo del combate se mantuvo prácticamente igual en el entorno medido.

El paquete de Pages generado localmente contiene unos 41,45 MB sin comprimir, frente a los 322,87 MB versionados del repositorio base. El código de desarrollo, las capturas y las fuentes de arte se conservan en Git. Se verificó la entrada al Dojo empaquetado, un combate de tres rivales y el regreso sin recursos faltantes. [Inventario de recursos](INVENTARIO_RECURSOS.md) · [Preparación de Pages](../scripts/stage-pages.mjs) · [Ciclo del juego](../src/battle/game-lifecycle.js)

## Validación de la entrega

Guardar resultados antes y después de cada fase con el mismo recorrido y configuración. El criterio de prioridad es mejorar el p95 de fotograma y de entrada en el equipo afectado y dejar el estado de combate inmóvil en pausa. Usar 60 FPS como objetivo de fluidez y 30 FPS estables como referencia mínima provisional en el equipo de menor capacidad. Reducir el trabajo en lugar de subir artificialmente el presupuesto de objetos. Repetir las comprobaciones funcionales de pausa, foco, teclado, sonido, victoria, revancha, resolución y retorno a la aldea. Ejecutar `npm test` y las pruebas de navegador que correspondan al cambio. La línea base existente de WebGL por software queda como referencia histórica.
