# Saga 1 — Futuro prometedor

**Estado: diseño vigente de la campaña jugable.**

Revisión de formación v3: consulta la [auditoría de secuencia, coherencia y controles](auditoria-tutorial-saga-1.md).

Documento de diseño narrativo y tutorial para las siete misiones principales `m01`, `s01`, `m02`, `s02`, `m03`, `m04` y `m05`. Esta es la campaña completa disponible hoy. Consulta también [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md).

## Reglas de la saga

- Todos los combates son duelos **uno contra uno**. Si hay varios adversarios, se enfrentan de manera consecutiva y con una transición entre encuentros.
- El maestro acompaña, aconseja y concede una ventaja pasiva, pero no entra al campo de batalla.
- El avatar masculino comienza con **Mei Hayate** y el femenino con **Daichi Kazan**.
- La opción de cambiar de maestro aparece desde el principio en Personalización, bloqueada hasta completar la saga 1.
- Al terminar la saga, el maestro deja de estar ligado al tipo de cuerpo y puede elegirse libremente.
- Toda misión muestra viaje de salida, regreso a la aldea y pantalla de resultados, incluso si se falla o abandona.

## Progresión de lugares

Los edificios permanecen visibles en el mapa. Un lugar bloqueado muestra su requisito al enfocarlo con teclado o ratón y no permite entrar; los accesos desde el calendario y el Dojo respetan la misma regla.

| Momento | Acceso | Introducción narrativa |
| --- | --- | --- |
| Prólogo | Cuartel General y Dojo | Ren recibe al jugador; su maestro explica la preparación. El briefing del gato confirma el acceso al Cuartel. |
| Regreso victorioso de «Tras las huellas del gato» | Tienda | Sayo anuncia la apertura del comercio de Hana en el epílogo. El briefing de Kagemori recuerda comprar suministros. |
| Regreso de «El médico errante» con el libro | Biblioteca | Haru envía al jugador a Sayo. La Biblioteca ofrece diccionario y repaso; entregar el libro activa el bestiario y permite continuar hacia la guarida. |
| Final de la saga 1 / paso a saga 2 | Gremio, Tablón de Misiones y Plaza de Eventos | Ren anuncia estos accesos en el briefing de Raizen; se conceden al completar la saga. La aldea muestra el aviso de nuevos accesos. |
| Paso a saga 3 y nivel superior a 15 | Arena de Combate | Exige completar la saga 2 y nivel 16 o más. La introducción de su misión se escribirá con la saga 2. |
| Rango 2 del jugador o superior | Torre de Desafíos | Se concede con el ascenso tras la prueba de la segunda afinidad. Kureha recuerda el rango y las fechas de cada desafío. |

Solo la saga 1 tiene misiones actualmente. La Arena permanece bloqueada hasta que se incorpore y complete la saga 2. Los servicios de saga 2 ya se pueden visitar al terminar la primera saga; no se añaden misiones ficticias para simular las sagas futuras.

Las reglas están en `src/content/village-progression.js`; `src/village-progression.js` consulta el historial real y el catálogo ordenado de sagas. No se concede acceso por leer un diálogo, fallar o abandonar. Las partidas anteriores recalculan los accesos desde sus misiones y pruebas completadas.

## Rangos y lenguaje

El jugador tiene **tres rangos**: rango 1, **Novicio**, con una afinidad disponible; rango 2, **Experto**, con dos; rango 3, **Veterano**, con tres. Los requisitos existentes se conservan: nivel 15 y prueba de la segunda afinidad para rango 2; nivel 30, segunda afinidad elegida y prueba de la tercera para rango 3. El ascenso habilita la plaza; la afinidad se elige en el Dojo.

«Rango elemental» es una denominación histórica del rango del jugador, no una progresión independiente. «Nivel del jugador», «nivel de técnica» y «clase de misión» se distinguen en el [diccionario del juego](DICCIONARIO_JUEGO.md), que también está disponible en la Biblioteca.

## Maestros

### Mei Hayate — Disciplina defensiva

- Reduce en 2 puntos cada impacto directo recibido.
- Su función tutorial es enseñar supervivencia, guardia y lectura del rival.

### Daichi Kazan — Fuerza de la montaña

- Añade 3 puntos al daño de todos los ataques.
- Su función tutorial es enseñar presión ofensiva y administración del chakra.

Estas bonificaciones nunca convierten el combate en un enfrentamiento grupal.

## Reparto provisional de antagonistas

- **Teniente de la cantera:** no tiene nombre. La decisión consiste en «Interrogar y perdonar» o «Eliminar».
- **Akumori, Capataz del Cuervo:** minijefe de la misión 3. Al ser vencido deja caer el mapa cifrado.
- **Raizen Kurogane, Señor de los Cuervos:** jefe de la misión 7 y antagonista final de la saga. El nombre es provisional.

## Formación de Novicio: siete módulos jugables

La saga completa es el tutorial. El maestro asignado y el guardián del lugar explican cada práctica en el diálogo del personaje. No hay un cartel permanente sobre el mapa: la ayuda se puede cerrar y recuperar con «Pedir ayuda al maestro». Cada indicación marca el control real, se actualiza al cambiar de pestaña y distingue entre seleccionar un hexágono y pulsar el botón de su ficha. Las introducciones, los briefings y las ventanas de consulta suspenden la guía para mantener una sola conversación visible. La preparación se comprueba antes de abrir el briefing; las prácticas de combate se acreditan al terminar la acción real. Leer una explicación o pulsar Continuar no acredita un ataque, una compra ni una pista.

| Misión | Preparación en la aldea | Práctica y fases de misión | Acceso relacionado |
| --- | --- | --- | --- |
| 1 · `m01` · Tras las huellas del gato | Abrir la saga en el Cuartel; equipar kunai y shuriken desde el inventario en Dojo → Equipo; leer y cerrar la ficha del maestro. Las partidas nuevas empiezan con arma y arrojadiza sin equipar; las existentes conservan su equipo. | Primer duelo: vida y decisión al 80 %; Golpe veloz; Guardia; tabla física; kunai; shuriken; tabla elemental; técnica; chakra al seleccionar la técnica; preparación; sellos manuales o automáticos; enfriamientos; pausa real y reanudación. Después, segundo bandido y Varek: explicaciones al entrar en otro duelo, al aparecer la primera ventaja elemental y al cambiar el jefe de fase; la subida de nivel explica crecimiento automático, puntos de atributo y PR. Sayo anuncia el comercio de Hana al regresar. | Cuartel y Dojo, presentados desde el prólogo. La victoria abre la **Tienda**. |
| 2 · `s01` · El silencio de Kagemori | Invertir un atributo; mejorar Disciplina del cuerpo con 1 PR; desbloquear Puño de hierro con otro PR; equiparlo en T1/T2. No se exige quitar técnicas ni hacer transacciones para investigar. | Viaje y presentación de Iori y Nami; abrir y cerrar Pausa; investigar carreta, casa comunal y pozo; leer la conclusión y registrar el informe. Las pistas se guardan una a una. | Enseña el crecimiento en el **Dojo** y permite continuar la investigación. |
| 3 · `m02` · Asalto al Desfiladero del Cuervo | Comprar una poción de vida en la Tienda si no se tiene y llevar un taijutsu equipado. | Primer duelo: un rasguño leve garantizado permite usar una poción real; cambiar a tabla física y ejecutar taijutsu pagando PV. Segundo duelo: derrotar al teniente y elegir Interrogar o Eliminar con ventajas y costes visibles. Tercer duelo: Akumori, afectado por esa decisión; obtener el mapa cifrado. | Abre la búsqueda de Haru; todavía no el Bestiario. |
| 4 · `s02` · El médico errante | Leer las opciones de ruta. | Tres tramos de caminos conectados: elevado seguro, río con pista y cruce, bosque con riesgo y recursos. El bosque en el segundo tramo incluye un duelo individual. Encontrar a Haru; aprender el intercambio de sellos vecinos y las combinaciones de 3; revelar las 36 casillas, con poderes de línea al combinar 4 o más; recibir el libro; entregarlo a Sayo. | El libro permite entrar en la **Biblioteca**; entregarlo activa Bestiario y Crónica y permite continuar. |
| 5 · `m03` · El umbral de los cuervos | Buscar un término con resultados en Diccionario; abrir Bestiario; responder correctamente qué afinidad pierde contra la principal; llevar una técnica elemental equipada. | Elegir entrada principal o secreta si fue revelada; ejecutar una técnica elemental y Guardia en el primer duelo. Aplicar la información y administrar CH en los duelos restantes. La ruta secreta conserva su almacén y bonificación. | Consolida la **Biblioteca**, el ciclo elemental y las consecuencias de la cantera. |
| 6 · `m04` · El corazón de la guarida | Llevar un tónico purificador. | Primer duelo: reconocer una quemadura leve garantizada y eliminarla con el tónico real. Primera transición: Descansar, gastar 1 suministro, recuperar 70 PV/55 CH y limpiar estados. Segunda transición: Conservar, recuperar 10 PV/8 CH y mantener suministros y estados. Tras el tercer duelo, elegir prisioneros o documentos y registrar el hallazgo. | Practica estados y recursos antes del jefe. No abre servicios adicionales. |
| 7 · `m05` · El jefe de los bandidos | Consultar Crónica; comprobar arma, arrojadiza, taijutsu y técnica elemental. | Evaluación: ejecutar técnica elemental y Guardia; continuar el duelo aplicando lo aprendido; presenciar el cambio de fase de Raizen, incluso si un ataque muy fuerte iba a derrotarlo directamente; vencer, regresar y confirmar resultados. La información del teniente y los documentos mantiene sus efectos. | Completa la formación y abre **Gremio, Tablón y Plaza de Eventos** para el paso a saga 2. |

### Reglas explicadas y comprobadas

- **Combate real:** cada práctica usa el botón o atajo del HUD, su coste, preparación, sellos y enfriamiento. La guía enfoca directamente el control real; el jugador lo ejecuta desde el HUD o con su tecla. Las acciones ajenas al paso actual no lo acreditan.
- **Tiempo:** las explicaciones detienen el avance. Las prácticas respetan el sistema de turnos; mientras la guía de combate está activa, ambos combatientes conservan al menos 1 PV. Una vez cerrada, el duelo continúa con sus reglas normales.
- **Tablas:** 0 y Numpad0 alternan entre tabla física y elemental sin gastar acción ni recursos. Se ignoran durante una pausa, un diálogo o al escribir en un campo. Golpe veloz y Guardia permanecen en 1 y 6. En la tabla física se practica arma, shuriken y taijutsu; la elemental usa las técnicas preparadas en el Dojo.
- **Costes:** kunai y shuriken no consumen PV ni CH; el shuriken es reutilizable. El taijutsu consume PV y no puede dejarte a cero. Las técnicas elementales pagan CH antes de preparar los sellos. Cerrar una acción recupera 5 CH; Guardia, 25 CH en total.
- **Guardia:** reduce a la mitad el primer impacto; un fallo rival no la consume. No puede repetirse mientras siga activa. Golpe veloz concede iniciativa +1 y Guardia −1 para la siguiente recuperación; no alteran la preparación de sellos.
- **Objetos:** una poción se consume solo si recupera recursos; un purificador, si limpia estados o Empapado. Usarlos gasta una acción. Retirarse o reintentar no devuelve consumibles gastados.
- **Investigación y rutas:** solo una pista nueva o un tramo resuelto acredita el objetivo. Un cruce erróneo del río no adelanta la fase. El cifrado no tiene reloj ni límite de movimientos; pistas y reorganización evitan bloqueos.
- **Afinidades y rangos:** Normal carece de ventajas elementales. Fuego supera Viento; Viento, Tierra; Tierra, Agua; Agua, Fuego. Novicio, Experto y Veterano habilitan 1, 2 y 3 afinidades. Completar la saga no concede automáticamente Experto.

### Pausas, reintentos y compatibilidad

La primera formación no tiene un botón para omitir las prácticas. Permite pausar, cambiar ajustes y abandonar con confirmación. Escape abre la pausa; en la misión de investigación también permite cerrarla y acredita la reanudación real.

`campaign.sagaTutorial` guarda versión y lecciones realizadas. Las prácticas se conservan entre pausas, recargas, retirada y reintentos. Las recompensas provisionales se mantienen separadas: aprender una lección no concede PX, monedas ni una victoria. Un consumible cuya práctica ya terminó no se exige de nuevo para reanudar.

Las partidas anteriores acreditan las lecciones de misiones ya completadas sin retroceder su campaña. La preparación pendiente permite recuperar PR invertidos mediante una opción explícita que retira las mejoras compradas y devuelve los puntos. Si faltan monedas para los materiales obligatorios, el maestro aporta la diferencia una sola vez por práctica. La tienda protege la última unidad que todavía deba usarse en la formación.

### Repaso actualizado en la Biblioteca

La pestaña **Tutorial** contiene los siete módulos y su progreso en secciones desplegables, con desplazamiento independiente. **Repetir tutorial guiado** ejecuta el módulo de combate actualizado, incluidos arma, shuriken, cambio de tablas y pausa. Si faltan equipo o técnicas, el repaso los presta únicamente durante la práctica. No modifica equipo, misiones, encuentros, consumibles ni recompensas guardados. Se puede salir con el botón o Escape, incluso durante un sello manual.

El resto de la Biblioteca mantiene pestañas separadas para **Diccionario**, **Bestiario** y **Crónica**. El diccionario es la referencia común del lenguaje del juego.

## Claridad y rendimiento de las explicaciones

- La guía de Estadísticas señala primero la pestaña y después el botón +. La guía de Resonancia señala primero el hexágono y después MEJORAR, DESBLOQUEAR o EQUIPAR. El detalle no cambia por pasar el cursor por otra habilidad durante esta práctica.
- El foco de pausa sigue el rectángulo del botón HTML real, tanto en el HUD de escritorio como en el compacto; no usa las coordenadas de Objetos.
- Se explica el turno del enemigo y se distingue fase de misión (otro duelo) de fase II (el mismo jefe cambia patrón y atributos). El ciclo aporta 20 % de ventaja/desventaja y Normal es neutro. También se presentan los modificadores y la pasiva de la afinidad principal.
- La guía conversa con el habitante que ya está en la escena, apoyado en el suelo, mediante un globo de diálogo. No crea otra imagen del personaje ni presenta títulos de tareas. Ren presenta el encargo en el Cuartel; durante la misión el maestro habla desde fuera del duelo mediante subtítulos, sin retratos superpuestos. En las prácticas se enfoca el control real y se retira el botón auxiliar. Los títulos se conservan únicamente como etiquetas accesibles.
- La subida presenta al maestro asignado, diferencia los puntos de atributo y los PR, y recuerda que nivel y rango son avances distintos.
- Al mostrar la subida se oculta la batalla pausada. Tras la breve presentación se conserva un frame mientras se espera la confirmación. Las decisiones conservan igualmente el fondo sin redibujarlo; el teclado, el ratón y la actualización de escenas siguen activos. Volver al combate, redimensionar o modificar la calidad reactiva el dibujo cuando corresponde.
- Las suspensiones anidadas comparten un controlador para restaurar correctamente el renderizado al cerrar cualquier menú. La descripción de equipo ajusta la altura de su tarjeta, con desplazamiento interno de la lista si hace falta.

## Fuentes y verificación

- Currículo y objetivos: `src/content/sagas/futuro-prometedor/tutorial.js` y `combat-lessons.js`.
- Estado, migración y detección de cambios: `src/tutorial-system.js`.
- Guía de aldea y campo: `src/ui/meta/saga-tutorial.js`.
- Guía de combate y persistencia sin recompensas: `src/battle/combat-tutorial.js` y `tutorial-progress.js`.
- Desbloqueos: `src/content/village-progression.js` y `src/village-progression.js`.
- Pruebas: `tests/saga-tutorial.test.mjs`, `tests/saga-tutorial.spec.mjs`, `tests/combat-tutorial.spec.mjs` y pruebas de rutas/cifrado/progresión de lugares.
