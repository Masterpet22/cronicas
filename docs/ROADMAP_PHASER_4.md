# Roadmap de aprovechamiento de Phaser 4

## Objetivo

Aprovechar Phaser 4 para elevar la presentación y el rendimiento del combate sin reescribir la lógica ya estable, degradar la accesibilidad ni convertir el proyecto en una demostración de efectos costosos.

Este roadmap parte de Phaser 4.2.1 y prioriza cambios visibles, medibles y reversibles. Las estimaciones suponen trabajo de una sola persona y sirven para ordenar el alcance, no como fechas de entrega.

## Principios de implementación

- Mantener la lógica de combate independiente de la presentación.
- Considerar WebGL como ruta visual principal y conservar un fallback funcional para Canvas.
- Respetar `prefers-reduced-motion`, destellos desactivados, sacudida desactivada y modo ligero.
- Aplicar filtros e iluminación únicamente donde aporten lectura o atmósfera.
- Medir antes y después; ninguna mejora visual debe introducir errores de consola ni bloquear el progreso de una misión.
- Reutilizar los catálogos existentes de arenas, temas, técnicas y afinidades en vez de añadir condicionales por escena.

## Fase 0 — Línea base y controles de calidad

**Prioridad:** obligatoria  
**Esfuerzo estimado:** 1–2 días

### Entregables

- [x] Registrar renderer, resolución, escala, FPS medio y tiempo de frame en las herramientas de desarrollo.
- [x] Definir tres escenarios de referencia: entrada al combate, turno cargado y técnica elemental.
- [x] Capturar referencias visuales en 1366×768, 1600×900 y modo compacto.
- [x] Añadir una comprobación de que el modo ligero no activa filtros WebGL costosos.
- [x] Establecer un presupuesto de objetos, partículas y filtros por escena.

### Criterio de salida

Existe una línea base repetible para detectar regresiones visuales y de rendimiento antes de añadir efectos.

**Estado: completada el 26 de octubre de 2026.** Panel opcional en PRUEBAS, muestras JSON,
presupuestos por escena y benchmark de 27 combinaciones de escenario, tamaño y modo.
Protocolo: [`RENDIMIENTO_PHASER_4.md`](RENDIMIENTO_PHASER_4.md).
Resultados: [`../artifacts/phaser-performance/baseline.md`](../artifacts/phaser-performance/baseline.md).
La línea base se conserva para comparar los perfiles ambientales de la fase 1.

## Fase 1 — Perfiles visuales declarativos por arena

**Prioridad:** alta  
**Esfuerzo estimado:** 3–5 días

### Entregables

- [x] Crear un catálogo `BATTLE_VISUAL_PROFILES` asociado a cada entrada de `BATTLE_ARENAS`.
- [x] Declarar color ambiental, viñeta, niebla, intensidad de cámara y densidad de partículas por arena.
- [x] Crear un controlador único que aplique, actualice y destruya los efectos al cambiar de escena.
- [x] Incorporar perfiles iniciales para desfiladero, pantano y santuario lunar.
- [x] Añadir fallback sin filtros que preserve fondo, contraste y legibilidad.

### Criterio de salida

Cada arena tiene una identidad distinguible y puede cambiarse desde datos sin modificar `BattleScene`.

**Estado: completada el 26 de octubre de 2026.** Catálogo por textura, controlador común,
calidad reactiva y limpieza de objetos/texturas al salir o reiniciar. No se elevan los
presupuestos de la fase 0 ni se añaden filtros. Detalles y comandos en
[`PERFILES_VISUALES_ARENAS.md`](PERFILES_VISUALES_ARENAS.md); referencias y comparación en
[`../artifacts/phaser-phase1/comparison.md`](../artifacts/phaser-phase1/comparison.md).
La siguiente entrega pendiente es la fase 2.

## Fase 2 — Transiciones y filtros cinematográficos

**Prioridad:** alta  
**Esfuerzo estimado:** 4–6 días

### Entregables

- [ ] Implementar una transición `Wipe` inspirada en tinta para entrar y salir del combate.
- [ ] Aplicar `ColorMatrix` o `GradientMap` durante cambios de fase, golpes críticos y derrota.
- [ ] Añadir viñeta de vida crítica sin ocultar acciones ni indicadores.
- [ ] Construir presets elementales reutilizables: fuego, agua, tierra, viento y rayo.
- [ ] Centralizar la activación de filtros para impedir controladores huérfanos al destruir escenas.

### Criterio de salida

Las transiciones y técnicas tienen lenguaje visual propio, funcionan con filtros desactivados y no alteran los tiempos de la lógica de combate.

## Fase 3 — Iluminación dinámica selectiva

**Prioridad:** media-alta  
**Esfuerzo estimado:** 5–8 días

### Entregables

- [ ] Crear un prototipo de luz para fuego, relámpago y santuario lunar.
- [ ] Activar `setLighting(true)` únicamente en combatientes, proyectiles y elementos relevantes del escenario.
- [ ] Evaluar self-shadows en una sola marioneta antes de habilitarlas globalmente.
- [ ] Crear normal maps de prueba para un cuerpo, un fondo y una técnica.
- [ ] Definir altura `z`, radio, intensidad y color desde los perfiles visuales.
- [ ] Desactivar iluminación avanzada en modo ligero o cuando no exista WebGL.

### Criterio de salida

Al menos tres técnicas iluminan coherentemente personajes y escenario sin reducir de forma perceptible la fluidez del combate de referencia.

## Fase 4 — Atmósfera procedural y capas GPU

**Prioridad:** media  
**Esfuerzo estimado:** 5–8 días

### Entregables

- [ ] Prototipar `Gradient`, `Noise`, `NoiseSimplex` o `NoiseCell` para niebla, chakra y agua.
- [ ] Crear un `SpriteGPULayer` para elementos numerosos y simples: lluvia, hojas, ceniza, brasas o luciérnagas.
- [ ] Mantener partículas interactivas o de corta vida en el sistema convencional.
- [ ] Limitar actualizaciones del buffer GPU y reutilizar una textura o atlas por capa.
- [ ] Definir densidades baja, media y alta según modo visual y resolución.

### Criterio de salida

Cada arena puede mostrar una capa ambiental abundante con una sola responsabilidad y sin multiplicar objetos Phaser individuales.

## Fase 5 — Paletas y reutilización de VFX

**Prioridad:** media  
**Esfuerzo estimado:** 4–7 días

### Entregables

- [ ] Preparar una textura neutral de aura, sello y proyectil para pruebas de recoloreado.
- [ ] Usar `GradientMap` o modos de tinte para producir variantes por afinidad.
- [ ] Crear presets para afinidades básicas y combinadas.
- [ ] Comparar peso, memoria y consistencia frente a spritesheets independientes.
- [ ] Conservar recursos dedicados cuando la silueta o animación sea realmente diferente.

### Criterio de salida

Al menos una familia completa de efectos elementales comparte recursos sin perder identidad ni legibilidad.

## Fase 6 — Composición de personajes en texturas

**Prioridad:** media-baja  
**Esfuerzo estimado:** 4–7 días

### Entregables

- [ ] Medir el coste actual de capas, contenedores y draw calls de cada marioneta.
- [ ] Componer la apariencia estática en una `DynamicTexture` para retratos y resultados.
- [ ] Mantener la marioneta articulada exclusivamente donde se animan piezas independientes.
- [ ] Invalidar y regenerar la textura al cambiar cuerpo, cabello, ropa o equipo.
- [ ] Liberar las texturas generadas al destruir la partida o cambiar de personaje.

### Criterio de salida

Retratos y pantallas estáticas usan una representación compuesta visualmente equivalente y con menos objetos activos.

## Fase 7 — Exploración con Tilemap GPU

**Prioridad:** futura; no iniciar todavía  
**Esfuerzo:** requiere diseño previo

### Condiciones de entrada

- [ ] Se ha decidido reemplazar alguna navegación ilustrada por exploración libre.
- [ ] Existe un tileset definitivo con colisiones, capas y reglas de interacción.
- [ ] El prototipo demuestra que `TilemapGPULayer` aporta una ventaja real frente al mapa actual.

### Alcance posible

- [ ] Prototipo aislado de una zona exterior, sin reemplazar todavía la aldea.
- [ ] Cámara, colisiones, entradas a edificios y encuentros.
- [ ] Iluminación y atmósfera compartidas con los perfiles de combate.

### Criterio de salida

Solo se incorpora al producto si mejora la experiencia jugable; no se migrará la aldea únicamente para utilizar una API nueva.

## Orden recomendado de entregas

1. Línea base y controles de calidad.
2. Perfiles visuales por arena.
3. Transiciones y filtros cinematográficos.
4. Iluminación selectiva.
5. Atmósfera procedural y `SpriteGPULayer`.
6. Paletas reutilizables.
7. Composición de personajes.
8. Evaluación futura de exploración con `TilemapGPULayer`.

## Primer incremento propuesto

El primer incremento debe abarcar únicamente las fases 0 y 1:

- Instrumentación básica de rendimiento.
- `BATTLE_VISUAL_PROFILES`.
- Tres perfiles de arena.
- Fallback de Canvas y modo ligero.
- Pruebas visuales y smoke de entrada/salida del combate.

Este incremento crea la infraestructura que necesitarán filtros, iluminación, partículas GPU y paletas sin introducirlos todos a la vez.

## Referencias oficiales

- [Phaser 4 Rendering Concepts](https://phaser.io/tutorials/phaser-4-rendering-concepts)
- [Phaser 4 Filter System](https://phaser.io/news/2026/05/phaser-4-filter-system)
- [Phaser 4 Dynamic Lighting](https://phaser.io/news/2026/05/phaser-4-dynamic-lighting)
- [SpriteGPULayer API](https://docs.phaser.io/api-documentation/class/gameobjects-spritegpulayer)

