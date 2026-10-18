# Roadmap — Crónicas del Sello

## Visión

Crear un RPG 2D por turnos que conserve la sensación de formar un combatiente, aprender técnicas y superar misiones, manteniendo un alcance viable para una sola persona y una computadora modesta.

La identidad visual se apoyará en poses reutilizables, sellos encadenados, efectos elementales, sonido y movimiento de cámara. No se producirá animación cuadro por cuadro para cada ataque.

## Estado actual: primera saga jugable

El alcance vigente se resume en [`docs/ESTADO_ACTUAL.md`](docs/ESTADO_ACTUAL.md). Las cronologías anteriores se conservan como banco de ideas y no describen la campaña conectada al juego.

- [x] Escena de combate de escritorio con marco lógico `16:9`.
- [x] Vida, chakra y turnos.
- [x] Seis acciones con costes, velocidad, precisión y funciones diferentes.
- [x] Secuencias de sellos configuradas por datos.
- [x] Ejecución interactiva mediante `QWER / ASDF / ZXCV` y ratón.
- [x] Calidad de ejecución con bonificación por secuencia perfecta.
- [x] Modo automático opcional y preferencia persistente.
- [x] Presentación superior para jutsus normales.
- [x] Presentación oscura para una técnica especial.
- [x] Contraataque enemigo y recuperación de chakra.
- [x] Victoria, derrota y reinicio.
- [x] Sonidos sintetizados y efectos temporales.

## Fase 1 — Vertical slice de combate

Objetivo: producir una batalla corta cuya estrategia y presentación ya representen el juego final.

**Estado: completada.**

- [x] Separar los sistemas de combate, interfaz, personajes y datos en módulos.
- [x] Incorporar Guardia, velocidad por acción y enfriamientos visibles.
- [x] Añadir quemadura, aturdimiento, herida y veneno.
- [x] Incorporar precisión, evasión y el estado Sellado con penalización de precisión.
- [x] Evitar residuos de opacidad cuando coinciden varios impactos.
- [x] Incorporar afinidades elementales moderadas: 15 % de ventaja y 10 % de resistencia.
- [x] Crear tres enemigos con estadísticas, afinidades y patrones distintos.
- [x] Crear un jefe con dos fases y cambio de patrón.
- [x] Añadir una variante manual sin límite de tiempo como opción de accesibilidad.
- [x] Acelerar automáticamente las secuencias de técnicas ya vistas.
- [x] Añadir opciones persistentes de volumen, movimiento de cámara y destellos.
- [x] Estabilizar combatientes geométricos avanzados con piezas animables.

**Criterio de salida cumplido:** la ruta de cuatro encuentros dura aproximadamente 10 a 15 minutos a ritmo normal y admite estrategias basadas en afinidades/estados o en velocidad/defensa.

## Fase 2 — Progresión del personaje

- [x] Creación de nombre, aspecto y afinidad inicial.
- [x] Experiencia, niveles y atributos.
- [x] Biblioteca de 37 técnicas distribuida entre afinidades básicas y combinadas.
- [x] Equipamiento sencillo: arma, protector y accesorio.
- [x] Pantalla para preparar cuatro técnicas antes de combatir.
- [x] Guardado local versionado.
- [x] Recompensas y economía sin compras reales.

**Estado: completada.**

**Criterio de salida cumplido:** el jugador puede crear un personaje, completar combates y tomar decisiones permanentes de progresión.

## Fase 3 — Demo jugable

- [x] Una aldea ilustrada con nueve edificios interactivos, resaltado por hover y navegación por teclado.
- [x] Primera saga con cinco misiones principales consecutivas: `m01`, `m02`, `m03`, `m04` y `m05`.
- [x] Catálogo declarativo separado para misiones principales y secundarias, con requisitos, actividades y efectos.
- [x] Catálogo de diálogo traducible y ciclo exclusivo de montaje/desmontaje de vistas.
- [x] Dos misiones secundarias integradas en la progresión: Kagemori y el médico errante.
- [ ] Expandir la campaña con nuevas sagas y misiones después de estabilizar el contenido actual.
- [x] Diálogos y tutorial breve.
- [x] Reparto visual por ubicación con conversaciones y guías contextuales.
- [x] Música, efectos y mezcla de audio.

**Estado: primera saga jugable; expansión planificada.**

**Criterio de salida parcialmente cumplido:** las cinco misiones principales y las dos secundarias forman el contenido vigente. Antes de ampliar la campaña se deben estabilizar sus rutas, decisiones, recompensas y continuidad de guardado.

## Fase 4 — Identidad visual propia

- [x] Diseñar un vocabulario propio para los sellos.
- [x] Reemplazar la cuadrícula provisional por la nueva hoja de doce símbolos.
- [x] Diseñar una hoja técnica con cuerpo masculino, femenino, piezas, capas, anclajes y variantes.
- [ ] Exportar cuerpos y prendas ilustrados realmente compatibles desde una plantilla artística común.
- [ ] Separar el arte definitivo en cuerpo, rostro, cabello delantero/trasero, ropa, calzado y arma.
- [x] Preparar cinco movimientos reutilizables mediante transformaciones: reposo, ataque, técnica, impacto y derrota.
- [x] Crear una biblioteca ligera de efectos por elemento.
- [x] Definir guía de color, interfaz y tipografía.

**Estado: pausada mientras se valida el diseño definitivo.**

**Criterio de salida pendiente:** el juego usa una marioneta raster provisional y los atlas de personalización permanecen archivados como experimentos. La fase solo se considerará terminada cuando la apariencia del Dojo se represente también en combate y todas las combinaciones ilustradas compartan anatomía y anclajes verificables. También se debe confirmar la autoría o licencia de la hoja de símbolos proporcionada.

## Fase 5 — Servicios en línea, solo después de validar la demo

- [ ] Autenticación y recuperación de cuenta.
- [ ] Guardado de personaje en servidor.
- [ ] Validación de recompensas y economía fuera del cliente.
- [ ] Clasificaciones y desafíos asíncronos.
- [ ] Telemetría respetuosa para estudiar abandono y dificultad.
- [ ] Evaluar PvP autoritativo; no implementarlo por defecto.

## Fuera de alcance inicial

- Mundo abierto.
- Combate en tiempo real.
- Clanes y chat global.
- Mercado entre jugadores.
- PvP competitivo en vivo.
- Cientos de técnicas.
- Animación cuadro por cuadro para cada jutsu.
- Monetización antes de comprobar que el juego es divertido.

## Próximo hito

Pulir arquitectura, combate, balance e interfaz sobre la marioneta provisional; en paralelo, producir y validar una plantilla artística real antes de integrar la apariencia personalizable en combate.

## Bloqueador obligatorio antes de 1.0

- [ ] Eliminar el botón **PRUEBAS**, la pantalla `renderDebugTools`, sus estilos y las pruebas que exigen su presencia. Estas herramientas alteran la partida y solo deben existir durante el desarrollo.
