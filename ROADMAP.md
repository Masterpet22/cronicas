# Roadmap — Crónicas del Sello

## Visión

Crear un RPG 2D por turnos que conserve la sensación de formar un combatiente, aprender técnicas y superar misiones, manteniendo un alcance viable para una sola persona y una computadora modesta.

La identidad visual se apoyará en poses reutilizables, sellos encadenados, efectos elementales, sonido y movimiento de cámara. No se producirá animación cuadro por cuadro para cada ataque.

## Estado actual: prototipo de combate

- [x] Escena de combate adaptable al tamaño de la ventana.
- [x] Vida, chakra y turnos.
- [x] Seis acciones con costes, velocidad, precisión y funciones diferentes.
- [x] Secuencias de sellos configuradas por datos.
- [x] Ejecución interactiva mediante `QWER / ASDF / ZXCV` y controles táctiles.
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
- [x] Incorporar precisión, evasión y un efecto de sello inhibidor.
- [x] Evitar residuos de opacidad cuando coinciden varios impactos.
- [x] Incorporar afinidades elementales moderadas: 15 % de ventaja y 10 % de resistencia.
- [x] Crear tres enemigos con estadísticas, afinidades y patrones distintos.
- [x] Crear un jefe con dos fases y cambio de patrón.
- [x] Añadir una variante manual sin límite de tiempo como opción de accesibilidad.
- [x] Acelerar automáticamente las secuencias de técnicas ya vistas.
- [x] Añadir opciones persistentes de volumen, movimiento de cámara y destellos.
- [x] Sustituir los combatientes geométricos por cuerpos modulares provisionales.

**Criterio de salida cumplido:** la ruta de cuatro encuentros dura aproximadamente 10 a 15 minutos a ritmo normal y admite estrategias basadas en afinidades/estados o en velocidad/defensa.

## Fase 2 — Progresión del personaje

- [ ] Creación de nombre, aspecto y afinidad inicial.
- [ ] Experiencia, niveles y atributos.
- [ ] Biblioteca de 12 jutsus: cuatro por cada una de tres afinidades.
- [ ] Equipamiento sencillo: arma, protector y accesorio.
- [ ] Pantalla para preparar cuatro técnicas antes de combatir.
- [ ] Guardado local versionado.
- [ ] Recompensas y economía sin compras reales.

**Criterio de salida:** el jugador puede crear un personaje, completar combates y tomar decisiones permanentes de progresión.

## Fase 3 — Demo jugable

- [ ] Una aldea con selección de lugares mediante menús.
- [ ] Diez misiones, ocho enemigos y tres jefes.
- [ ] Diálogos y tutorial breve.
- [ ] Examen de ascenso de rango.
- [ ] Compañero controlado por inteligencia artificial.
- [ ] Música, efectos y mezcla de audio.
- [ ] Pruebas en equipos modestos y navegadores móviles.

**Criterio de salida:** demo de 60 a 90 minutos que puede compartirse mediante un enlace.

## Fase 4 — Identidad visual propia

- [ ] Diseñar un vocabulario original para los sellos.
- [ ] Reemplazar la cuadrícula provisional por doce ilustraciones originales.
- [ ] Crear dos cuerpos base modulares.
- [ ] Separar cabeza, torso, brazos, piernas, cabello, ropa y arma.
- [ ] Preparar cinco movimientos reutilizables: reposo, ataque, técnica, impacto y derrota.
- [ ] Crear una biblioteca de efectos por elemento.
- [ ] Definir guía de color, interfaz y tipografía.

**Criterio de salida:** ninguna imagen temporal o perteneciente a otra propiedad permanece en el juego.

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

Comenzar la Fase 2 con creación de personaje, elección de afinidad y guardado local versionado antes de ampliar la biblioteca de jutsus.
