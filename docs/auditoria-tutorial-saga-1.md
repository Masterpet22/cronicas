# Auditoría y corrección de la formación de Novicio

Revisión del 4 de noviembre de 2026. Alcance: las siete misiones de Futuro prometedor, preparación, acompañamiento, controles reales y recuperación de la partida. Las capturas aportadas son evidencia del problema visual y narrativo; no constituyen instrucciones de implementación.

## Diagnóstico

El problema no era la falta de texto. El tutorial confundía visitar una interfaz con aprender una acción y concentraba demasiadas reglas antes de permitir probarlas. Además, sus capas de narración no tenían una exclusión común. Tener pruebas que verificaban esas pantallas no demostraba que la secuencia fuese comprensible.

| Hallazgo | Consecuencia para alguien que empieza | Corrección |
| --- | --- | --- |
| Kunai y shuriken equipados desde la creación; se exigía confirmarlos otra vez. | No se distinguían inventario, selección y equipo. | Los personajes nuevos poseen ambos objetos en el inventario y parten con esas dos ranuras vacías. La preparación comprueba el equipo real. |
| La visita al selector podía acreditar acciones sin un cambio de equipo. | Un clic se presentaba como aprendizaje. | Se registra la mutación del equipo, no la apertura del selector. Las partidas que ya tienen equipo preparado satisfacen el requisito sin repetirlo. |
| Los eventos buscaban coincidencias en todos los pasos de preparación. | Una acción fuera de orden podía acreditar un objetivo futuro. | Solo el paso pendiente acepta su evento; los requisitos materiales se comprueban contra el estado actual. |
| La ficha del maestro se acreditaba al abrirla. | La guía avanzaba detrás de una ventana todavía abierta. | El objetivo se acredita al cerrar la ficha; la guía espera durante la consulta. |
| Introducción de local, conversación ambiental y guía podían competir. | Dos figuras y dos instrucciones a la vez, como en la primera captura. | La guía cede durante la introducción, el briefing, las decisiones, la consulta del maestro y la pausa. Reutiliza al habitante presente en lugar de añadir un recorte de su cuerpo. |
| Ren presentaba la práctica y los encuentros en el bosque. | El jefe de la aldea parecía desplazarse con la misión sin justificación. | Ren recibe y encarga en el Cuartel. El maestro asignado acompaña y explica en campo; los responsables locales hablan en su propio lugar. |
| Seis pantallas de teoría antes del primer golpe. | El jugador debía memorizar vida, chakra, pasivas, turnos y fases antes de actuar. | Dos explicaciones iniciales: vida y momento de decisión. Chakra y preparación aparecen al ejecutar la técnica; los enfriamientos, después de usarla. |
| La práctica conservaba el personaje y el cuadro grande delante del combate. | El acompañamiento tapaba lo que se intentaba enseñar. | El maestro habla mediante subtítulos, sin cuerpo superpuesto, encabezado de tarea ni contador. Las conversaciones de aldea usan globos sobre personajes apoyados en el suelo. |
| El botón de la explicación ejecutaba la acción. | Se podía recorrer la formación pulsando siempre el mismo botón. | Durante una práctica se enfoca directamente el control real y se retira el botón auxiliar. El jugador debe pulsar el control o su tecla. |
| Kagemori exigía quitar y reponer técnicas, comprar dos pociones y vender una antes de investigar. | La investigación se detenía para hacer trámites sin una necesidad inmediata. | Kagemori enseña crecimiento e investigación. La poción se compra antes del Desfiladero, donde se usa. La venta sigue disponible en la tienda sin convertirse en una barrera de campaña. |
| Al terminar una preparación desaparecía la ayuda. | No quedaba claro cómo continuar con el encargo. | Se muestra el destino siguiente y un acceso directo; al estar preparado, se indica volver al Cuartel. |
| Era posible retirar todas las técnicas antes de la primera salida. | La práctica elemental se quedaba sin acción válida. | La preparación inicial también exige una técnica elemental y señala cómo equiparla si falta. |
| Una práctica de quemadura podía reintroducir el estado después de haberla realizado. | Reanudar contradecía el aprendizaje guardado. | La quemadura inicial solo se aplica mientras falta la práctica de limpieza. |
| La explicación de atributos y PR se repetía en cada subida. | Un concepto ya enseñado volvía a interrumpir el combate. | El maestro explica la primera subida; las siguientes conservan el informe numérico y su confirmación. |

## Criterios de diseño

Se aplican instrucciones breves en contexto, una acción observable por objetivo, controles visibles y reutilizables, ritmo decidido por el jugador y comprobación del resultado. No se interpreta «Continuar» como demostración de una habilidad.

Referencias de primera mano consultadas:

- [Xbox Accessibility Guideline 109: objetivos y tutoriales](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/109): tutoriales interactivos y objetivos comprensibles.
- [Game Accessibility Guidelines: ayuda contextual](https://gameaccessibilityguidelines.com/include-contextual-in-game-helpguidancetips/): introducir conceptos gradualmente, durante su uso.
- [Nielsen Norman Group: reconocimiento frente a recuerdo](https://www.nngroup.com/articles/recognition-and-recall/): mantener disponibles las señales necesarias para actuar.

Estas pautas orientan el diseño; no sustituyen una prueba de comprensión con personas que nunca hayan jugado.

## Secuencia resultante

| Módulo | Necesidad narrativa | Aprendizaje principal |
| --- | --- | --- |
| Tras las huellas del gato | Prepararse y recuperar el gato robado. | Equipar objetos, conocer al acompañante, decidir al llegar el turno, atacar, defenderse, usar equipo y ejecutar una técnica. |
| El silencio de Kagemori | Seguir el rastro de los saqueadores. | Usar el crecimiento obtenido, aprender y preparar un taijutsu e investigar. |
| Asalto al Desfiladero | Entrar en la cantera y afrontar una decisión. | Comprar una poción porque se necesitará, curar una herida, pagar el coste de un taijutsu y decidir sobre el teniente. |
| El médico errante | Encontrar a Haru y entender el mapa. | Elegir rutas conectadas, resolver sus incidentes y descifrar sin cuenta atrás. |
| El umbral de los cuervos | Preparar la infiltración con información. | Consultar registros, reconocer el ciclo elemental y aplicarlo. |
| El corazón de la guarida | Sobrevivir en las galerías. | Identificar y limpiar estados; observar las diferencias entre descansar y conservar suministros. |
| El jefe de los bandidos | Enfrentarse a Raizen. | Reunir equipo e información, combinar ataque y defensa y responder a la segunda fase. |

## Cómo se controla el guion

Sí: esta formación se puede controlar paso a paso sin usar temporizadores arbitrarios como prueba de aprendizaje.

- `src/content/sagas/futuro-prometedor/tutorial.js` declara el orden de preparación, lugar, objetivo, selector del control, evento y condición de estado. Su versión es 3.
- `src/tutorial-system.js` resuelve el primer requisito pendiente. Una acción futura no salta pasos. Los objetos consumidos cuya práctica ya se realizó no se exigen otra vez para reanudar.
- `src/ui/meta/tutorial-controls.js` resuelve el control concreto según la pestaña y la ventana abiertas: primero la pestaña, luego la ranura o el hexágono y finalmente la opción o el botón.
- `src/content/sagas/futuro-prometedor/combat-lessons.js` declara introducciones y acciones de cada módulo: tipo de acción, objeto, tabla y lección que se acredita.
- `src/battle/combat-tutorial.js` congela las explicaciones, permite la acción prevista y espera su ejecución. Durante la práctica mantiene la protección de vida; al acabar avisa de que el duelo vuelve a sus reglas normales.
- `src/tutorial-speakers.js` decide el interlocutor por lugar. Ningún evento de combate necesita usar a Ren como sustituto del maestro.
- `campaign.sagaTutorial.completed` conserva las lecciones. La migración acredita el contenido de misiones ya ganadas sin retirar equipo, monedas o progreso de campaña.

Para añadir un paso, hay que definir qué necesidad lo justifica, qué acción realiza el jugador, qué cambio observable demuestra el éxito y qué ocurre al recargar o abandonar. Si solo requiere un estado que ya existe, la guía debe reconocerlo en vez de inventar una confirmación.

## Revisión visual posterior

La revisión inicial todavía conservaba figuras flotantes y fichas de objetivos. Se retiró esa presentación: el habitante ya presente habla con un globo, con los pies apoyados en el suelo. En combate y en las subidas de nivel, el maestro habla mediante subtítulos sin un cuerpo superpuesto. Se reescribió el inicio como conversación, se ocultaron títulos y contadores de lecciones y se retiró el botón auxiliar durante las prácticas.

Se aprobaron nueve casos distintos de navegador, incluyendo ambos maestros, la distribución de 1280 × 720, el recorrido de preparación, el primer combate completo, atributos, encuentros y subida de nivel. También pasaron las pruebas unitarias de saga, arquitectura, pausa, escritorio e interfaz de combate. Capturas revisadas: [aldea](../artifacts/tutorial-dialogue-review/aldea.png) y [combate](../artifacts/tutorial-dialogue-review/combate.png).

## Verificación funcional anterior

- 56 archivos de pruebas unitarias ejecutados y aprobados, incluyendo progresión, migración, equipo, economía, acciones y arquitectura.
- 34 casos distintos de navegador aprobados entre la pasada general y las comprobaciones focalizadas. Cubren preparación real, orden, conversaciones excluyentes, ajustes, investigación, consulta de información, objetos, estados, fase de Raizen, repaso con ambos modos de sellos, subidas posteriores y regresiones de comercio y armas.
- Inspección visual de [la introducción del Cuartel](../artifacts/tutorial-redesign-review/cuartel.png), [el regreso desde el Dojo](../artifacts/tutorial-redesign-review/equipo.png), [el briefing sin otra guía superpuesta](../artifacts/tutorial-redesign-review/briefing.png) y [la práctica sobre el control real](../artifacts/tutorial-redesign-review/practica.png).
- Los módulos posteriores se verifican desde puntos de campaña preparados. Esta comprobación no equivale a observar una partida humana continua desde la creación hasta el final.

## Comprobación de comprensión pendiente de usuarios

Una prueba con principiantes debe observar si pueden: explicar la diferencia entre poseer y equipar; identificar a su acompañante; encontrar el siguiente destino sin ayuda externa; ejecutar cada control sin pulsar «Continuar» por inercia; reconocer cuándo el combate está detenido; y completar la siguiente misión aplicando lo aprendido. Las pruebas automatizadas verifican comportamiento y presentación, no garantizan que cualquier persona lo entienda.
