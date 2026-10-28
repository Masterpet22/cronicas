# Plan de reparaciones de rendimiento y ciclo de vida

Fecha de apertura: 27 de octubre de 2026
Rama de trabajo: `reparaciones`
Estado general: **en ejecución; R1 a R6 completadas**

## Propósito

Este documento registra las reparaciones acordadas a partir de los avisos observados en DevTools y de la revisión de los cambios recientes en las transiciones. Su función es mantener el alcance, el orden, las pruebas y los criterios de aceptación antes de modificar el runtime.

Documentar una reparación aquí no autoriza su implementación. Cada bloque comenzará únicamente cuando se solicite de forma explícita.

## Evidencia inicial

Los síntomas reportados son:

- varias inicializaciones de Phaser 4.2.1 durante una sesión;
- solicitudes repetidas de fondos y partes del personaje;
- recursos declarados con `preload` que no se consumen poco después de cargar la ventana;
- advertencias por lecturas frecuentes de Canvas 2D con `getImageData()`;
- llamadas a `setTintFill()`, API eliminada en Phaser 4;
- intentos de pausar la escena `battle` cuando ya no se encuentra en ejecución;
- pausas y variación de FPS durante cambios de pantalla.

La captura de red no basta para considerar cada solicitud un fallo: respuestas `304` y accesos desde caché pueden ser normales. La reparación se dará por válida por su efecto medido, no solo por reducir el número de filas de DevTools.

## Relación con las transiciones recientes

El commit `ea5d8fb` añadió transportación, nuevos recursos de teletransporte y una secuencia asíncrona para la subida de nivel.

- **Relación directa con `setTintFill()`:** la llamada ya existía en `src/battle/scenes/level-up-scene.js`, y la nueva transición añadió otra en `src/battle/level-up-transition.js`.
- **Relación posible con la pausa de `battle`:** la pausa sin validación es anterior, pero ahora ocurre después de nuevas esperas asíncronas. Esto aumenta la ventana en la que la escena puede dejar de estar activa antes de `pause()`.
- **Relación parcial con las cargas:** `queueTeleportObjects()` precarga los objetos de transportación desde viaje y combate. Usa `textures.exists()`, por lo que evita duplicados dentro de una instancia, pero los recursos se vuelven a solicitar al crear otra instancia de Phaser.
- **Sin relación directa con las recreaciones de Phaser:** `game.js` ya destruía y creaba instancias al entrar o salir de determinadas rutas.
- **Sin relación directa con `aldea.webp`:** la precarga usa `?v=0.20.0` y la vista solicita `?v=0.82.5`; son URL diferentes para el navegador.
- **Sin relación directa con Canvas:** las lecturas repetidas están en el procesamiento de iconos accesibles de `src/battle/hud-accessibility.js`.

## Reglas de ejecución

1. Registrar una línea base antes de cambiar código.
2. Realizar un bloque de reparación por vez y mantener los commits separados.
3. No mezclar cambios visuales o de jugabilidad con optimizaciones.
4. Preservar ruta, teletransporte, subida de nivel, pausa, resultados y retorno a la aldea.
5. Validar WebGL, Canvas, modo ligero y movimiento reducido cuando corresponda.
6. No elevar presupuestos de rendimiento para ocultar una regresión.
7. Actualizar este documento al iniciar y terminar cada bloque.

## Orden de reparaciones

### R1. Corregir APIs obsoletas y estados de escena

**Prioridad:** crítica
**Estado:** completado

Alcance:

- sustituir las llamadas restantes a `setTintFill()` por la API de Phaser 4 ya establecida en `MIGRACION_PHASER_4.md`;
- centralizar el tinte de relleno para impedir que una transición vuelva a introducir la API eliminada;
- validar el estado de `battle` inmediatamente antes de pausar, reanudar o detener;
- hacer que las continuaciones asíncronas abandonen su trabajo si la escena fue cerrada;
- revisar la pausa manual y la pausa provocada por la subida de nivel.

Archivos candidatos:

- `src/battle/level-up-transition.js`;
- `src/battle/scenes/level-up-scene.js`;
- `src/battle/scenes/battle-flow.js`;
- `src/battle/scenes/battle-presentation.js`;
- `src/battle/teleport-transition.js`.

Criterios de aceptación:

- no existen referencias de aplicación a `setTintFill`;
- la subida de nivel conserva el destello de relleno sólido;
- pausa, reanudación y salida rápida no generan `Cannot pause non-running Scene battle`;
- interrumpir una transición no deja promesas, objetos o listeners activos;
- las pruebas de transiciones, subida de nivel y pausa pasan.

Resultado del 27 de octubre de 2026:

- las dos llamadas restantes a `setTintFill()` se sustituyeron por `applyFillTint()`, que aplica `setTint()` y `setTintMode(Phaser.TintModes.FILL)` desde un único adaptador;
- `scene-lifecycle.js` centraliza las guardas para pausar solo escenas activas, reanudar solo escenas pausadas y detener únicamente escenas en ejecución;
- el botón de pausa y la subida de nivel vuelven a consultar el estado de `battle` inmediatamente antes de pausar;
- el menú de pausa valida también el estado antes de reanudar o detener `battle`;
- la transición de subida escucha `SHUTDOWN`, cancela sus continuaciones, retira listeners, restaura el HUD una sola vez y resuelve su promesa aunque el combate se cierre durante el destello;
- `tests/scene-lifecycle.test.mjs` cubre escenas inactivas, activas, pausadas y dormidas;
- una prueba de navegador cierra `battle` durante el destello y confirma que la promesa termina sin errores ni una escena modal huérfana;
- pasaron `npm test`, los cuatro recorridos de subida de nivel y el recorrido real que abre y cierra la pausa desde el tutorial.

### R2. Evitar recreaciones innecesarias de Phaser y reutilizar recursos

**Prioridad:** alta
**Estado:** completado

Alcance:

- inventariar cada ruta que ejecuta `new Phaser.Game()` y `destroyGameInstance()`;
- determinar qué recorridos pueden conservar una sola instancia y cambiar de escena;
- impedir lanzamientos simultáneos mediante una única promesa o estado de arranque;
- conservar correctamente guardado, resultados secundarios y retorno a las vistas HTML;
- asegurar que una instancia destruida no permanezca dormida ni conserve Canvas, audio o listeners.

Archivos candidatos:

- `game.js`;
- `src/battle/runtime.js`;
- escenas de viaje, resultados y subida de nivel.

Criterios de aceptación:

- una entrada lógica al juego no crea más de una instancia activa de Phaser;
- no aparecen banners de inicialización adicionales durante transiciones internas;
- no quedan canvas ocultos ni bucles en segundo plano al volver al metajuego;
- los recursos compartidos permanecen disponibles entre escenas compatibles;
- iniciar, abandonar, completar y repetir una misión conserva el comportamiento actual.

Resultado del 27 de octubre de 2026:

- `game.js` conserva un solo constructor de `Phaser.Game` para toda la sesión;
- al volver al metajuego se detienen las escenas, se desmonta el monitor y se duerme el bucle;
- la siguiente misión redimensiona y despierta la instancia existente, reinicia `travel` y conserva las texturas ya cargadas;
- el flujo principal y los resultados secundarios comparten el mismo catálogo de escenas;
- una prueba de navegador confirmó que dos entradas consecutivas a combate usan el mismo elemento `<canvas>`;
- `npm test` y la prueba dirigida de ciclo de vida en `tests/performance.spec.mjs` pasan.

### R3. Limitar automáticamente la resolución según el equipo

**Prioridad:** alta
**Estado:** completado

Alcance:

- revisar `configureRenderResolution()` y la interacción entre tamaño CSS, DPR y resolución física;
- definir perfiles conservadores con límites explícitos, evitando decisiones basadas en una única muestra de FPS;
- conservar el tamaño lógico de combate de 960 × 540;
- respetar modo ligero, movimiento reducido y renderer efectivo;
- evitar oscilaciones de resolución durante una misma escena.

Criterios de aceptación:

- el canvas no supera el presupuesto físico definido para equipos limitados;
- el perfil elegido queda visible en la exportación de rendimiento;
- no se degrada la legibilidad del HUD ni el encuadre;
- las pruebas cubren varios tamaños, DPR y ambos renderers;
- el p95 de frame mejora o se mantiene en los equipos de referencia.

Resultado del 27 de octubre de 2026:

- la escala máxima anterior de 4× se sustituyó por perfiles `economy` (1×), `low` (1.25×), `balanced` (1.5×) y `high` (2×);
- la selección usa `navigator.deviceMemory` y `navigator.hardwareConcurrency`; si el navegador oculta ambos datos se adopta `balanced`;
- cada perfil impone un presupuesto físico entre 518,400 y 2,073,600 píxeles;
- el perfil se fija al entrar a Phaser y no cambia durante la escena, evitando oscilaciones de resolución;
- el panel y la exportación de rendimiento incluyen ID, escala máxima y presupuesto del perfil;
- las pruebas cubren capacidades ocultas, equipos de 2/4/8 GB, varios núcleos, DPR alto, Canvas y WebGL;
- un navegador simulado con 2 GB, 2 núcleos y DPR 3 quedó limitado correctamente a 960×540.

### R4. Cargar Phaser y los módulos de combate cuando se necesiten

**Prioridad:** media-alta
**Estado:** completado

Alcance:

- conservar la carga diferida de Phaser desde `index.html` y comprobar que solo se ejecute una vez;
- estudiar la importación dinámica del runtime y de las escenas al iniciar una misión;
- separar claramente recursos del metajuego y recursos de combate;
- impedir que dos interacciones rápidas dupliquen la descarga o el arranque;
- ofrecer un estado accesible de carga y recuperación ante error.

Criterios de aceptación:

- visitar y usar el metajuego sin combatir no descarga recursos exclusivos de combate;
- la primera entrada a combate sigue mostrando una transición coherente;
- entradas posteriores reutilizan módulos ya evaluados y recursos permitidos;
- no hay doble inicialización ni errores no controlados si falla una carga.

Resultado del 27 de octubre de 2026:

- `index.html` inicia únicamente el metajuego; ya no descarga ni evalúa Phaser durante la selección de partida;
- `load-phaser.js` conserva una sola promesa compartida para el script local de Phaser y permite reintentar si la descarga falla;
- `bundle.js` agrupa las escenas y la configuración gráfica, y se importa dinámicamente al iniciar la primera misión;
- Phaser, el paquete de combate y las fuentes requeridas se cargan en paralelo antes de crear o reactivar el juego;
- las misiones posteriores reutilizan el módulo evaluado y la instancia aparcada de Phaser;
- el contenedor expone `aria-busy` durante la espera y, ante un error, se restaura el metajuego sin dejar la interfaz bloqueada;
- `tests/lazy-loading.spec.mjs` confirma que el inicio no solicita Phaser ni escenas y que la primera misión solicita Phaser exactamente una vez;
- pasaron `npm test`, la prueba específica de carga diferida, los 22 recorridos de regresión de combate y transiciones tras actualizar cuatro contratos antiguos, y el ciclo real del panel de rendimiento.

### R5. Unificar versiones de recursos y retirar precargas innecesarias

**Prioridad:** media
**Estado:** completado

Alcance:

- sustituir versiones divergentes por una fuente de versión coherente;
- corregir primero la discrepancia de `assets/village/aldea.webp` entre `index.html` y la vista de aldea;
- clasificar cada `preload` como crítico, anticipado por interacción o innecesario;
- retirar de la carga inicial los fondos de misión que no se necesitan en los primeros segundos;
- revisar las versiones de imports, hojas de estilo, sprites y fondos;
- mantener caché invalidable cuando cambie un recurso.

Criterios de aceptación:

- un mismo recurso lógico no se solicita con dos versiones durante el mismo recorrido;
- no aparecen advertencias de precarga no utilizada en los recorridos definidos;
- la imagen principal de la aldea mantiene prioridad alta y no se descarga dos veces;
- las rutas y transiciones siguen cargando sus fondos antes de mostrarlos;
- las pruebas de assets detectan versiones divergentes en el futuro.

Resultado del 27 de octubre de 2026:

- se retiraron de `index.html` las precargas de `aldea.webp` y de los tres fondos de viaje, porque no se utilizan durante la apertura ni la selección de partida;
- se conservaron las dos precargas de fuentes que sí intervienen en la primera pintura del metajuego;
- `src/asset-urls.js` concentra la versión general del metajuego y las URL compartidas por viaje, combate, subida de nivel e investigación;
- `preparation-mote.png` quedó unificado en `0.91.0` y `kagemori.webp` en `0.63.0`, evitando que una misma sesión trate cada versión como un recurso distinto;
- las escenas mantienen sus guardas de textura, por lo que cada fondo compartido se descarga una sola vez antes de mostrarse;
- `tests/resource-versions.test.mjs` falla si reaparece una precarga inicial de imagen o si un recurso estático declara más de una versión;
- la prueba de navegador confirma que los fondos no se solicitan al abrir la app, se cargan al iniciar la misión, no se duplican y no generan avisos de preload sin uso.

### R6. Reutilizar iconos procesados por Canvas

**Prioridad:** media
**Estado:** completado

Alcance:

- perfilar las lecturas de `getImageData()` de `src/battle/hud-accessibility.js`;
- crear el contexto con `{ willReadFrequently: true }` cuando el navegador lo admita;
- almacenar el resultado procesado por textura, variante, recorte y escala;
- invalidar el caché cuando cambie cualquiera de sus entradas;
- fijar un límite para evitar crecimiento indefinido de memoria.

Criterios de aceptación:

- una combinación ya procesada no repite lecturas de píxeles;
- desaparece la advertencia de `willReadFrequently` en navegadores compatibles;
- los iconos accesibles conservan forma, transparencia y texto alternativo;
- el caché tiene límites y se limpia al destruir su propietario;
- el tiempo de CPU de creación del HUD disminuye o se mantiene.

Resultado del 27 de octubre de 2026:

- el recorte de transparencia y el tinte salieron de `hud-accessibility.js` y quedaron centralizados en `icon-canvas-cache.js`;
- los contextos que ejecutan `getImageData()` se crean con `{ willReadFrequently: true }`;
- cada variante se identifica por textura, identidad de la imagen fuente, tamaño, margen y tinte, de modo que un cambio real invalida solo la entrada correspondiente;
- la caché conserva una plantilla procesada y entrega un canvas independiente a cada botón, evitando mover el mismo nodo entre controles;
- las plantillas sobreviven al aparcado y reinicio de escenas porque pertenecen a la instancia de Phaser, y se liberan cuando esa instancia emite `destroy`;
- un límite LRU de 24 variantes evita crecimiento indefinido;
- `tests/icon-canvas-cache.test.mjs` comprueba reutilización, invalidación, límite y limpieza;
- la prueba de navegador entra dos veces al mismo combate y confirma que la segunda entrada no añade lecturas de píxeles ni advertencias de Canvas.

### R7. Medir FPS, memoria, transiciones y solicitudes

**Prioridad:** transversal
**Estado:** pendiente

Alcance:

- generar una línea base antes de R1 y repetirla después de cada bloque relevante;
- ampliar las muestras existentes con tiempos de arranque, cambio de escena y regreso al metajuego;
- registrar número de instancias, canvas, recursos solicitados y bytes transferidos;
- observar memoria cuando la API del navegador esté disponible, sin convertirla en requisito universal;
- probar equipos o perfiles de capacidad distintos y registrar renderer/GPU efectiva;
- comparar siempre recorridos equivalentes.

Comandos de referencia:

```powershell
npm test
npm run smoke
npm run performance:test
npm run performance:baseline
```

Criterios de aceptación:

- existe una línea base identificada por commit, navegador, equipo, viewport, DPR y renderer;
- cada reparación incluye comparación antes/después;
- no hay errores de consola durante los recorridos de aceptación;
- los resultados no atribuyen a una GPU real mediciones obtenidas con SwiftShader;
- las mejoras se confirman en más de un tamaño o perfil de equipo.

## Recorridos mínimos de aceptación

1. Abrir la aplicación y navegar por la aldea sin iniciar Phaser.
2. Iniciar una misión con transición de ruta.
3. Iniciar una misión con transportación.
4. Cambiar entre encuentros por ruta y por teletransporte.
5. Subir de nivel durante un combate y regresar a `battle`.
6. Abrir y cerrar la pausa repetidamente durante un combate estable.
7. Intentar pausar mientras otra transición está cerrando la escena.
8. Completar una misión, mostrar resultados y regresar a la aldea.
9. Abandonar una misión y comenzar otra sin recargar la página.
10. Repetir los casos principales con WebGL, Canvas, modo ligero y movimiento reducido.

## Matriz de seguimiento

| ID | Reparación | Estado | Evidencia antes/después | Commit |
| --- | --- | --- | --- | --- |
| R1 | APIs Phaser 4 y estados de escena | Completado | Sin `setTintFill`; guardas unitarias; interrupción de subida y pausa real en navegador | Pendiente de commit |
| R2 | Ciclo de vida e instancias Phaser | Completado | `npm test`; mismo canvas tras volver y entrar de nuevo | Pendiente de commit |
| R3 | Resolución adaptativa | Completado | `npm test`; perfiles Canvas/WebGL; equipo limitado con DPR 3 | Pendiente de commit |
| R4 | Carga diferida | Completado | `npm test`; inicio sin Phaser/escenas; una carga al iniciar misión; regresiones de combate y rendimiento | Pendiente de commit |
| R5 | Versiones y precargas | Completado | `npm test`; inicio sin imágenes anticipadas; fondos compartidos solicitados una sola vez | Pendiente de commit |
| R6 | Caché de iconos Canvas | Completado | Caché LRU e invalidación verificadas; segunda entrada sin nuevos `getImageData()` | Pendiente de commit |
| R7 | Medición comparativa | Pendiente | Pendiente | — |

## Reparaciones funcionales adicionales

### F1. Reintento de misiones fallidas

**Estado:** completado
**Fecha:** 27 de octubre de 2026

- una derrota registra el progreso de la misión como `failed` antes de persistir el guardado;
- el estado sobrevive al recargar la partida y el Cuartel muestra la acción **REINTENTAR**;
- al seleccionar el reintento se repite la preparación de la misión y se crea un nuevo intento `in-progress`;
- las observaciones obtenidas para el bestiario se conservan, pero las recompensas y avances no confirmados siguen descartándose;
- las pruebas de guardado cubren la secuencia iniciar → fallar → recargar → reintentar.

## Fuera de alcance inicial

- cambiar reglas, balance, historia o recompensas;
- rediseñar visualmente las transiciones;
- reemplazar assets artísticos que no estén dañados;
- subir presupuestos de rendimiento sin evidencia;
- eliminar respuestas `304` solo por aparecer en DevTools;
- realizar todas las reparaciones en un único cambio difícil de aislar.
