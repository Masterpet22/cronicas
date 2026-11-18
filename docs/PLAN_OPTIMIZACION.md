# Plan de optimización del juego

18 de noviembre de 2026 · Rama `optimizacion` · Base `d375ec1` · Implementación pendiente

La prioridad es recuperar una respuesta fluida del cursor al jugar y al abrir ventanas, empezando por la pausa. El trabajo cubre el navegador en ordenador y tablet. El objetivo de la primera ronda es reducir la carga dentro de Phaser 4 y de la interfaz HTML, con mediciones comparables para cada cambio.

## 1. Reproducir la lentitud del cursor y la pausa

La pausa ya conserva un fotograma del combate mediante `suspendPauseRendering` y llama a `game.headlessStep()` mientras la imagen está estable. Sigue habiendo un bucle por fotograma. El cursor personalizado oculta el del navegador y actualiza su posición con `pointermove` y `requestAnimationFrame`. Además, un `MutationObserver` sobre todo `main` reevalúa el estado de carga y los diálogos cuando cambian atributos como `class` y `style`. Son rutas concretas para investigar la latencia descrita.

- Medir tres veces por caso en el equipo que presenta el problema y repetir una muestra en tablet. Usar la misma partida, tamaño de ventana y resolución física. Registrar el navegador, el renderer y la GPU efectiva, incluido SwiftShader si aparece.
- Repetir el mismo movimiento de puntero en el Dojo, en un duelo de campaña y contra tres rivales. Comparar antes de abrir una ventana, con la pausa visible y al reanudar. Añadir una ventana de equipo o maestro y la mochila de combate. En tablet, comprobar el retraso del toque y la respuesta del menú.
- Comparar cursor nativo y personalizado. Después comparar WebGL y Canvas a 960 × 540, con modo ligero activado y desactivado. Probar 1920 × 1080 en la misma escena para ver cuánto cambia al dibujar más píxeles. Anotar aparte la configuración habitual del equipo afectado.
- Medir p95 del tiempo por fotograma, retraso de entrada hasta el siguiente fotograma, tareas largas y renders de Phaser. Usar el perfil de Performance del navegador para separar JavaScript, estilo, layout, pintura y composición. El medidor interno sirve para comparar contextos y añade su propia carga, así que comparar con la misma instrumentación.
- Contar en pausa renders reales, avances de la línea temporal, tweens de combate, emisores, cambios del DOM y llamadas a `headlessStep`. Comprobar también qué ocurre al mover el cursor sobre botones, cambiar ajustes y abrir un diálogo encima de la pausa.

Punto de partida para repetir casos y extender la medición al Dojo de grupo. [Protocolo actual](RENDIMIENTO_PHASER_4.md) · [Prueba de ventanas](../tests/ui-windows-performance.spec.mjs) · [Prueba de pausa](../tests/performance.spec.mjs) · [Cursor](../src/game-cursor.js) · [Suspensión de renderizado](../src/battle/pause-rendering.js)

## 2. Reducir trabajo repetido

- **Cursor y pausa.** Probar el cursor nativo primero como referencia y alternativa de bajo coste. Si se conserva el cursor del juego, limitar el observador a cambios de carga y apertura de diálogos, agrupar las comprobaciones y evitar lecturas de layout y búsquedas por todo `main` al cambiar el HUD. Comparar el coste del filtro de sombra del cursor. Con la pausa visible, retirar actualizaciones e interacciones del combate que sigan activas y evaluar qué parte del bucle puede dormirse mientras el menú HTML conserva teclado y puntero. Solicitar un render al abrir el menú, cambiar resolución, redimensionar o restaurar el contexto gráfico.
- **Animaciones.** Ordenar fotogramas e indexar propiedades al preparar cada clip. Reutilizar esas tablas en el muestreo de poses, que hoy ordena fotogramas y filtra pistas en cada llamada. Medir también los cálculos de matrices de los efectos unidos a las manos cuando varios rivales se preparan.
- **Medición.** Comparar coste de CPU y asignaciones con cuatro personajes, antes y después. Verificar tiempos de preparación, posición de manos y orden de turnos. En una pausa estable, el reloj de cada combatiente debe quedar fijo y el canvas no debe redibujarse por mover el cursor.

[Muestreo de animaciones](../src/animations/runtime.js) · [Presentación de combate](../src/battle/scenes/battle-presentation.js)

## 3. Actualizar la interfaz cuando cambien sus datos

- Separar los cambios del HUD en vida, chakra, objetivo, estados, recargas y disponibilidad. Escribir texto, clases y atributos de accesibilidad únicamente cuando cambie su valor. Consolidar actualizaciones repetidas por el mismo impacto o cambio de turno.
- Durante el avance de turnos, actualizar solo los elementos animados. Recalcular el estilo del contorno del marcador al cambiar la selección o el estado del rival. Actualizar los medidores HTML solo cuando cambie el valor que se muestra. Mantener disponible la selección por ratón, toque y teclado.
- Verificar que recibir un golpe, cambiar de rival y reanudar la pausa refrescan los datos correspondientes. Medir las escrituras al DOM y su impacto sobre la latencia del cursor con un duelo y con tres rivales.

[HUD accesible](../src/battle/hud-accessibility.js) · [Marcadores de grupo](../src/battle/training-targets.js)

## 4. Agrupar texturas en atlas

- Hacer un piloto con las piezas que los combatientes dibujan juntos. Mantener un mapa de nombres, recortes, origen y orden de capas. Prever variantes de piel y ropa sin duplicar toda la hoja por cada combinación. Separar fondos grandes y efectos que se cargan ocasionalmente. Las secuencias que ya son hojas de sprites se evalúan aparte.
- Generar atlas pequeños por familia y cargar solo los necesarios. Mantener el alfa, los anclajes y el orden de las piezas en ambos cuerpos, así como la coleta y los tonos de piel. Verificar el Dojo, el combate, los viajes y los retratos, con WebGL y Canvas.
- Comparar cambios de textura, llamadas de dibujo, tiempo de primera carga y memoria estimada de texturas decodificadas. Conservar el piloto si reduce el coste que se midió y mantiene el presupuesto de memoria en tablet.

[Carga de combatientes](../src/fighters.js) · [Rigs](../src/character-rigs.js) · [Validación artística](VALIDACION_PLANTILLA_ARTISTICA.md)

## 5. Reutilizar efectos y objetos

- Medir primero qué se crea y destruye con mayor frecuencia. Empezar con el destello del clic, las etiquetas de daño y los impactos repetidos. Probar un conjunto pequeño con un límite fijo. Para el humo, comparar reutilizar una textura dibujada una vez con reconstruir todos sus círculos al aparecer.
- Al devolver un efecto al conjunto, detener tweens, emisores, callbacks y temporizadores y restablecer posición, alfa, profundidad y estado. Vaciar el conjunto al desmontar una escena cuando los efectos le pertenezcan.
- Repetir ataques, clics y reapariciones del Dojo. Verificar que el número de objetos se estabiliza, que no quedan efectos activos al salir y que cada efecto vuelve a verse completo al reutilizarlo.

[Cursor y destello](../src/game-cursor.js) · [Impactos y etiquetas](../src/battle/scenes/battle-feedback.js) · [Humo](../src/battle/teleport-transition.js)

## 6. Liberar recursos fuera de uso

- Medir escenas, listeners, temporizadores, filtros, emisores, audio y texturas antes y después de diez ciclos de entrar, pausar, reanudar y volver al Dojo. Añadir varios ciclos de revancha. Distinguir memoria residente de los recursos que se mantienen a propósito para la siguiente entrada.
- Eliminar referencias de escenas desmontadas. Limitar las cachés de variantes gráficas solo después de medir su crecimiento y conservar los recursos compartidos necesarios para evitar nuevas descargas en cada combate. La instancia ya se aparca al regresar a la aldea. Comprobar que también se detienen los efectos y observadores ligados a la escena anterior.
- Resolver la limpieza de disco por separado. Retirar primero trazas archivables y separar del paquete de publicación las fuentes y evidencias que solo se usan en desarrollo. Verificar los recursos que dependen de rutas dinámicas y de pruebas antes de retirar archivos. [Inventario de recursos](INVENTARIO_RECURSOS.md) · [Ciclo del juego](../game.js)

## Validación de la entrega

Guardar resultados antes y después de cada fase con el mismo recorrido y configuración. El criterio de prioridad es mejorar el p95 de fotograma y de entrada en el equipo afectado y dejar el estado de combate inmóvil en pausa. Usar 60 FPS como objetivo de fluidez y 30 FPS estables como referencia mínima provisional en el equipo de menor capacidad. Reducir el trabajo en lugar de subir artificialmente el presupuesto de objetos. Repetir las comprobaciones funcionales de pausa, foco, teclado, sonido, victoria, revancha, resolución y retorno a la aldea. Ejecutar `npm test` y las pruebas de navegador que correspondan al cambio. La línea base existente de WebGL por software queda como referencia histórica.
