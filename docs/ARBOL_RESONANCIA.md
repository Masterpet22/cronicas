# Técnicas, afinidades y Árbol de Resonancia

## Diseño de técnicas elementales

Este diseño registra cómo se organizará el catálogo. El [árbol jugable actual](#árbol-jugable-actual) describe las casillas, las rutas y los requisitos vigentes.

- **Afinidad principal del personaje** es la primera de sus afinidades base. Cada partida admite hasta tres afinidades base distintas de entre Fuego, Agua, Tierra y Viento.
- **Nivel elemental de una técnica** indica la receta de su familia. Nivel 1 usa una afinidad base, nivel 2 combina una pareja y nivel 3 combina una familia de nivel 2 con una tercera afinidad base distinta.
- **Nivel del personaje** determina cuándo se abre un requisito. **Rango de habilidad** indica las mejoras de una habilidad individual. En el árbol actual, los rangos van de 1 a 3.
- **Técnica activa** es una acción de combate. Una **habilidad pasiva** aporta un modificador al cumplir sus requisitos. El catálogo de habilidades incluye ambas.

### Nivel 1 — Técnicas de una afinidad

Las técnicas propias de Fuego, Agua, Tierra y Viento pertenecen a la rama de su afinidad. El catálogo vigente tiene **20 técnicas elementales base** distribuidas en 6 de [Fuego](#fuego), 4 de [Agua](#agua), 4 de [Tierra](#tierra) y 6 de [Viento](#viento). Las tablas vigentes también enumeran las pasivas de cada rama y sus requisitos.

#### Roles de combate por afinidad

La propuesta del catálogo combina **ataques**, **mejoras temporales** (*buffs*) y **debilitamientos temporales** (*debuffs*). Cada afinidad base tendría al menos una técnica activa de mejora y una de debilitamiento. Ambas podrían ocupar una acción propia y aplicar su efecto sin daño directo. Los ataques que aplican un estado también tienen espacio en el catálogo.

| Afinidad | Identidad | Ejemplo de mejora | Ejemplo de debilitamiento |
|---|---|---|---|
| Fuego | Ofensiva y presión | Aumentar la fuerza propia durante varios turnos | Reducir la defensa del rival para preparar un ataque |
| Agua | Apoyo y control del ritmo | Aumentar la recuperación de chakra durante varios turnos | Ralentizar al rival |
| Tierra | Defensa y desgaste | Aumentar la resistencia propia al daño | Reducir la fuerza del rival |
| Viento | Movilidad y evasión | Aumentar la evasión propia durante varios turnos | Reducir la precisión del rival |

El resto de los movimientos define cuánto pesa cada rol en la afinidad. Las familias mixtas pueden tomar funciones de ambas afinidades de origen. Los ejemplos indican la dirección de diseño. Queda por decidir qué técnicas ocuparán esos roles, a qué objetivos podrán aplicarse y cuáles serán sus valores, duraciones, costes y recargas.

### Nivel 2 — Mezclas de dos afinidades

Cada pareja da una familia de **tres técnicas activas** en el diseño. El orden de los elementos dentro de la pareja da la misma familia.

| Afinidades base | Familia | Técnicas activas presentes en el árbol actual |
|---|---|---|
| Fuego + Agua | Vapor | Estallido de vapor |
| Fuego + Tierra | Magma | Forja de magma |
| Fuego + Viento | Rayo | Aguja de chispa, Cadena estática y Juicio del cielo |
| Agua + Tierra | Planta | Enredo esmeralda |
| Agua + Viento | Hielo | Lanza glacial |
| Tierra + Viento | Arena | Prisión de arena |

El diseño suma **18 técnicas de mezcla** en el catálogo. Una partida con tres afinidades base reúne tres parejas y puede llegar a desbloquear **9 técnicas de nivel 2**. Por ejemplo, Fuego, Agua y Tierra abren las familias Vapor, Magma y Planta. Las técnicas de las ramas base se cuentan aparte. El equipamiento en combate se rige por sus propias ranuras.

Hoy hay ocho técnicas activas repartidas entre las seis familias y el árbol completa las otras posiciones de cada pareja con pasivas. Queda por definir qué diez técnicas completarán las familias y dónde quedarán esas pasivas en el nuevo diseño. Prisión del relámpago ya tiene animación y se puede consultar en **Más animaciones**.

### Nivel 3 — Mezcla con una tercera afinidad

La receta parte de una familia de nivel 2 y suma la afinidad base que queda fuera de esa pareja. El orden en que se equipan las tres afinidades da las mismas rutas. La familia de nivel 2 que se toma como punto de partida determina el resultado.

| Afinidades base de la partida | Primera ruta | Segunda ruta | Tercera ruta |
|---|---|---|---|
| Fuego, Agua y Tierra | Vapor + Tierra → **Espora** | Magma + Agua → **Obsidiana** | Planta + Fuego → **Veneno** |
| Fuego, Agua y Viento | Vapor + Viento → **Tormenta** | Rayo + Agua → **Plasma** | Hielo + Fuego → **Niebla** |
| Fuego, Tierra y Viento | Magma + Viento → **Ceniza** | Rayo + Tierra → **Metal** | Arena + Fuego → **Vidrio** |
| Agua, Tierra y Viento | Planta + Viento → **Raíz** | Hielo + Tierra → **Cristal** | Arena + Agua → **Lodo** |

| Alcance | Familias de nivel 3 | Técnicas de nivel 3 |
|---|---:|---:|
| Catálogo completo | 12 | **24** con dos por familia |
| Compatibles con una combinación de tres afinidades | 3 | **6** candidatas |
| Desbloqueadas por partida | Una familia como máximo | **1** técnica como máximo |

La exclusividad se aplica al desbloqueo de la técnica en la partida y se conserva al guardar y recargar. El diseño reserva el **hexágono central del panal, en `(0,0)`, con el icono de yin yang ☯** para representar esa técnica. Se reutiliza la posición central del plano de 39 celdas.

El nivel de personaje requerido habilitará una **misión secundaria**. Completarla desbloqueará la técnica de nivel 3. Quedan pendientes el nivel exacto, el diseño de la misión, cómo se determina la técnica otorgada dentro de las opciones compatibles y los detalles de equipamiento. Los nombres individuales de las dos técnicas por familia, sus efectos, costes y rangos también quedan por definir. El desbloqueo por misión sigue pendiente de implementación.

### Animaciones y ficha del Dojo

El combate y la vista previa comparten la secuencia de animación. La **ficha** muestra el daño base, el estado cuando corresponda y su duración, el coste, la recarga, los sellos y los requisitos disponibles. La **reproducción** en el escenario se limita a la animación. Los datos de daño y estados se leen fuera de la escena.

Debajo de la animación, cada cuadro muestra el símbolo, el nombre y la tecla del sello. La secuencia se lee de izquierda a derecha y coincide con el orden de ejecución en combate. Se consulta el rango mostrado en la ficha, incluido el sello que se elimina al alcanzar rango 3.

**Dojo → Técnicas → Más animaciones** permite consultar técnicas del catálogo actual que carecen de casilla de Resonancia y muestras elementales. Una muestra es un recurso visual para el diseño de las familias. El catálogo jugable y sus requisitos determinan qué se puede aprender y equipar.

| Familia de nivel 3 | Recurso visual disponible para reutilizar |
|---|---|
| Espora | Muestra elemental de Espora |
| Obsidiana | Muestra elemental de Obsidiana |
| Veneno | Flor venenosa |
| Tormenta | Dominio de tormenta |
| Plasma | Muestra elemental de Plasma |
| Niebla | Muestra elemental de Niebla |
| Ceniza | Réquiem de ceniza |
| Metal | Bastión de metal |
| Vidrio | Lluvia de vidrio |
| Raíz | Raíz ancestral |
| Cristal | Prisma cristalino. Corona de escarcha queda como candidata para la segunda técnica |
| Lodo | Pendiente de animar |

Los recursos de esta tabla son referencias visuales. Las recetas anteriores registran el diseño acordado y la implementación actual sigue consultando sus propias definiciones en [`src/elements.js`](../src/elements.js) y [`src/skills/definitions.js`](../src/skills/definitions.js).

## Árbol jugable actual

Dojo → Técnicas → Árbol de Resonancia reproduce el plano de 39 hexágonos suministrado
por el usuario: 38 celdas de habilidades y una del personaje en `(0,0)`.

| Grupo | Celdas | Posición | Color |
|---|---:|---|---|
| Afinidad 1 | 8 | Izquierda | Elemento equipado en A1 |
| Afinidad 2 | 7 | Abajo | Elemento equipado en A2 |
| Afinidad 3 | 8 | Derecha | Elemento equipado en A3 |
| Físicas | 6 | Arriba | Azul |
| Afinidad 1 + 2 | 3 | Inferior izquierda | Mezcla de A1 y A2 |
| Afinidad 2 + 3 | 3 | Inferior derecha | Mezcla de A2 y A3 |
| Afinidad 1 + 3 | 3 | Cima y dos extremos superiores separados | Mezcla de A1 y A3 |
| Personaje | 1 | Centro | Color elegido por el jugador |

Las nueve columnas contienen `2,3,5,6,7,6,5,3,2` hexágonos. Los colores, técnicas e iconos corresponden a los elementos equipados. Una rama
bloqueada o sin asignar se muestra gris; las habilidades bloqueadas también.
Los pares quedan grises si falta o está bloqueada cualquiera de sus afinidades.
La mezcla usa aportes RGB iguales: rojo `#ff0000` + azul `#0000ff` da morado
`#800080`. El núcleo toma `character.appearance`; su borde, kanji e yin yang
adaptan el contraste para colores claros y oscuros. No aparecen hexágonos adicionales al progresar o cambiar de vista.

Cada hexágono representa una sola habilidad, con su propia ficha y sus tres
rangos. El centro representa al personaje y no cuenta como habilidad. El árbol
completo contiene exactamente **38 habilidades**, cualquiera que sea el orden
de los elementos: 6 físicas, 8/7/8 según la ranura de afinidad y 9 combinadas.
No hay selectores, contadores de habilidades adicionales ni habilidades ocultas
al seleccionar una casilla. Las ranuras sin afinidad muestran sus casillas
bloqueadas. La cantidad depende de la posición elegida, no del elemento.

El núcleo usa la numeración japonesa del mes de nacimiento: `一` a `十`, `十一` y
`十二`. Sin fecha válida muestra yin yang. Cambiar o quitar el cumpleaños en el
calendario actualiza el símbolo al volver al Dojo. No se guarda otra copia del mes.

## Datos, progreso y representación

- `src/skills/definitions.js`: catálogo, efectos, requisitos y configuración axial.
  Los IDs de técnicas existentes se conservan. Los IDs de pasivas dependen del
  elemento, y los de híbridas del par ordenado, nunca de la ranura equipada.
- `src/skills/progression.js`: niveles, requisitos, transacciones de puntos,
  normalización, modificadores pasivos y mejoras del daño de técnicas.
- `src/skills/colors.js`: colores de afinidades, mezclas, bloqueos y contraste del núcleo.
- `src/skills/character-symbol.js`: símbolo del núcleo derivado del cumpleaños.
- `src/skills/taijutsu.js`: desbloqueo, dos ranuras físicas independientes,
  intercambio de posiciones y conversión del nivel a una acción de combate.
- `src/skills/hex-boundaries.js`: contornos por las aristas exteriores del grupo.
  Los bordes de afinidad siguen su color incluso al estar bloqueados; las físicas
  utilizan el azul definido en `PHYSICAL_COLOR`.
- `src/ui/meta/resonance-tree.js`: representación SVG, vecindad hexagonal y
  controles de navegación. No contiene definiciones de habilidades.
- `src/ui/meta/dojo-techniques.js`: lista de técnicas, ficha, inversiones, equipamiento y catálogo de animaciones.
- `src/ui/meta/technique-preview.js` y `src/battle/technique-sequences.js`: escena de vista previa y secuencias compartidas con combate.
- `resonance-tree.css`: presentación del panal y adaptación de la ficha.

`buildSkillTree(affinities, rank)` produce nodos con coordenadas `q, r`. El nivel
actual se obtiene con `skillLevel(save, node)`, separado de la definición.
`skillTreeNodes(save)` combina ambos y expone el modelo de interfaz con `level`.
`axialToPixel` usa hexágonos de orientación plana. Solo se dibujan conexiones entre
celdas vecinas: ninguna línea atraviesa artificialmente el espacio entre ramas.
Los requisitos efectivos figuran en la ficha; todos los requisitos de un nodo
deben cumplirse. Desarrollar una rama no obliga a comprar todos sus nodos.

Los pares 1+2 y 2+3 ocupan sus tres celdas inferiores. El par 1+3 ocupa
exactamente `(0,-3)`, `(-2,-1)` y `(2,-3)`, sin unirlas ni desplazarlas a una franja.
`buildSkillTree` devuelve 38 nodos, sin habilidades anidadas. `skillTreeNodes`
añade el nivel actual y un `cellId` igual al ID de la única habilidad de la casilla.
`skillHasCell` aplica la misma disponibilidad al aprendizaje, mejoras y efectos.

## Economía y compatibilidad

El personaje comienza con **0 puntos de Resonancia y gana 2 por cada subida de nivel**,
independientes de los puntos de atributos. Los puntos disponibles se calculan a
partir del nivel (máximo 60, 118 puntos) y de las inversiones; recargar o cambiar de vista no los duplica.
Cada nodo define su coste por nivel y un máximo de tres niveles.

Cada desbloqueo o mejora cuesta **1 PR**, incluidas las definitivas. Hay cinco
rangos gratuitos: las dos técnicas iniciales de la afinidad principal, Disciplina
del cuerpo y la primera técnica de cada nueva afinidad. No dependen de los PX
para conservarse. Las demás habilidades exigen nivel, PX cuando corresponde y
el rango concreto de sus predecesoras; cumplirlos habilita comprar, sin aprender
automáticamente. El equipo, el entrenamiento y el combate validan la misma regla.

Las 38 habilidades a rango 3 cuestan `38 × 3 − 5 = 109 PR`. El nivel 56 permite
acumular 110 PR; el nivel 60, 118 PR, dejando nueve libres tras completar el árbol.
Esto se comprueba en los 24 órdenes posibles, contando también los requisitos
intermedios. Siguen siendo necesarios los PX de afinidad y las pruebas especiales.

Las técnicas iniciales admiten rango 2 desde nivel 3 y rango 3 desde nivel 8.
Disciplina del cuerpo se mejora desde niveles 2 y 6. En el resto, el rango 2 exige
`nivel de desbloqueo + 2` y el rango 3 `nivel de desbloqueo + 5`. Cada mejora de
una técnica añade +2 al daño y descuenta un 5 % del chakra original; rango 3
quita un sello. Las pasivas conservan sus efectos por rango.

El formato de guardado es 29. La carga conserva los rangos válidos y libera las
inversiones sin nivel, predecesoras o casilla. El cargador conserva nivel, PX,
misiones, afinidades, inventario y objetos. La validación no depende del orden del
JSON y recargar conserva el mismo saldo.

`taijutsuLoadout` guarda exactamente dos posiciones (ID o `null`), separadas de
`loadout`. Las ranuras vacías se guardan como `null`. No admite técnicas
bloqueadas, duplicados ni más de dos posiciones; mover una técnica a la posición
de otra intercambia ambas. Las técnicas elementales conservan su equipo.

Puño de hierro y Paso fugaz son los dos taijutsus activos asociados a los nodos
`physical_1` y `physical_2`. Aplican su bono de entrenamiento y, además,
pueden equiparse en T1 y T2 una vez desbloqueados. Cuestan 8 y 5 PV respectivamente,
sin chakra ni sellos, y no pueden dejar al personaje sin vida. Cada rango adicional
añade dos puntos de daño al movimiento equipado. En la tabla física de combate
ocupan las acciones 4 y 5, entre el arma arrojadiza y la Guardia.

La carga conserva las inversiones compatibles con las afinidades y rutas. Las
pasivas de afinidades no equipadas quedan inactivas. Las inversiones que pierden
su casilla o incumplen requisitos se liberan como puntos disponibles.

## Interacción y ampliación

Seleccionar una técnica por su nombre o por su hexágono abre su ficha. La inversión
se realiza desde su botón de desbloqueo o mejora. Las técnicas aprendidas conservan
los controles para equipar, quitar y reemplazar una ranura de combate.

- Arrastrar desplaza el árbol; la rueda amplía alrededor del cursor.
- Los controles permiten acercar, alejar, ajustar todo el árbol y centrar el núcleo.
- Tab recorre nodos; Enter o espacio seleccionan; flechas desplazan; +/− amplían;
  Inicio ajusta el panal completo.
- La cámara se conserva durante inversiones y cambios de equipo.

Para añadir habilidades, define sus requisitos y efectos en el catálogo y
asigna una celda propia, sustituyendo la habilidad de esa posición si fuera
necesario. El plano `SKILL_LAYOUT` es un contrato fijo;
ninguna ampliación automática agrega hexágonos. Mantén IDs persistentes para
conservar partidas.
Los efectos pasivos admitidos son vida, fuerza, velocidad, chakra, precisión,
evasión, reducción de daño y reducción del coste de chakra. Añadir una mecánica
nueva requiere implementar su efecto en combate y describirlo en la ficha.

Validación: `npm test` incluye `tests/resonance-tree.test.mjs`; las pruebas de
navegador están en `tests/dojo-techniques.spec.mjs`.

## Catálogo y requisitos exactos

Esta tabla enumera las opciones del catálogo. Cada personaje usa las 38 casillas
correspondientes a sus tres afinidades elegidas y su orden. Las habilidades
gratuitas omiten los requisitos de predecesoras en la ranura donde se conceden.
Los niveles indicados son de personaje; los rangos son de habilidad.

### Físicas

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Disciplina del cuerpo | 1 / 2 / 6 | Gratuita | — |
| Puño de hierro | 2 / 4 / 8 | Disciplina del cuerpo rango 2 | — |
| Paso fugaz | 3 / 5 / 8 | Disciplina del cuerpo rango 2 | — |
| Guardia inquebrantable | 8 / 10 / 13 | Puño de hierro rango 2 | — |
| Pulso certero | 12 / 14 / 17 | Puño de hierro rango 2 + Paso fugaz rango 1 | — |
| Instinto de combate | 20 / 22 / 25 | Paso fugaz rango 2 + Pulso certero rango 2 | — |

### Fuego

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Ascuas veloces | 1 / 3 / 8 | Gratuita al elegir la afinidad | 0 |
| Aliento de brasa | 1 / 3 / 8 | Ascuas veloces rango 2; gratuita en afinidad principal | 20 |
| Arco de llama | 6 / 8 / 11 | Ascuas veloces rango 2 | 60 |
| Marca ardiente | 12 / 14 / 17 | Aliento de brasa rango 2 | 110 |
| Anillo de ceniza | 24 / 26 / 29 | Arco de llama rango 2 + Marca ardiente rango 2 | 170 |
| Fénix escarlata | 40 / 42 / 45 | Anillo de ceniza rango 3 | 280 |
| Sello protector · Fuego | 16 / 18 / 21 | Aliento de brasa rango 2 + Arco de llama rango 2 | — |
| Flujo interior · Fuego | 32 / 34 / 37 | Marca ardiente rango 2 + Anillo de ceniza rango 2 | — |

### Agua

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Aqua Shuriken | 1 / 3 / 8 | Gratuita al elegir la afinidad | 0 |
| Látigo de corriente | 1 / 3 / 8 | Aqua Shuriken rango 2; gratuita en afinidad principal | 20 |
| Muro de marea | 6 / 8 / 11 | Aqua Shuriken rango 2 | 75 |
| Lanza abisal | 40 / 42 / 45 | Muro de marea rango 3 + Paso elemental · Agua rango 2 | 150 |
| Sello protector · Agua | 12 / 14 / 17 | Látigo de corriente rango 2 | — |
| Flujo interior · Agua | 20 / 22 / 25 | Muro de marea rango 2 | — |
| Paso elemental · Agua | 32 / 34 / 37 | Muro de marea rango 2 + Flujo interior · Agua rango 2 | — |
| Dominio · Agua | 48 / 50 / 53 | Lanza abisal rango 3 + Paso elemental · Agua rango 2 | — |

### Tierra

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Puño de roca | 1 / 3 / 8 | Gratuita al elegir la afinidad | 0 |
| Muralla pétrea | 1 / 3 / 8 | Puño de roca rango 2; gratuita en afinidad principal | 20 |
| Púa tectónica | 6 / 8 / 11 | Puño de roca rango 2 | 75 |
| Pulso sísmico | 40 / 42 / 45 | Púa tectónica rango 3 + Paso elemental · Tierra rango 2 | 150 |
| Sello protector · Tierra | 12 / 14 / 17 | Muralla pétrea rango 2 | — |
| Flujo interior · Tierra | 20 / 22 / 25 | Púa tectónica rango 2 | — |
| Paso elemental · Tierra | 32 / 34 / 37 | Púa tectónica rango 2 + Flujo interior · Tierra rango 2 | — |
| Dominio · Tierra | 48 / 50 / 53 | Pulso sísmico rango 3 + Paso elemental · Tierra rango 2 | — |

### Viento

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Palma de vacío | 1 / 3 / 8 | Gratuita al elegir la afinidad | 0 |
| Filo de vendaval | 1 / 3 / 8 | Palma de vacío rango 2; gratuita en afinidad principal | 20 |
| Paso del céfiro | 6 / 8 / 11 | Palma de vacío rango 2 | 60 |
| Onda cortante | 12 / 14 / 17 | Filo de vendaval rango 2 | 110 |
| Agujas del norte | 24 / 26 / 29 | Paso del céfiro rango 2 + Onda cortante rango 2 | 170 |
| Ciclón cortante | 40 / 42 / 45 | Agujas del norte rango 3 | 280 |
| Sello protector · Viento | 16 / 18 / 21 | Filo de vendaval rango 2 + Paso del céfiro rango 2 | — |
| Flujo interior · Viento | 32 / 34 / 37 | Onda cortante rango 2 + Agujas del norte rango 2 | — |

### Combinadas

| Habilidad | Nivel para rangos 1/2/3 | Predecesoras | PX de afinidad |
|---|---|---|---:|
| Estallido de vapor | 20 / 22 / 25 | Muro de marea rango 2 + Arco de llama rango 2 | 120 |
| Sello dual · Agua + Fuego | 32 / 34 / 37 | Muro de marea rango 2 + Arco de llama rango 2 + Estallido de vapor rango 2 | — |
| Sincronía · Agua + Fuego | 48 / 50 / 53 | Muro de marea rango 2 + Arco de llama rango 2 + Sello dual · Agua + Fuego rango 3 | — |
| Forja de magma | 20 / 22 / 25 | Arco de llama rango 2 + Púa tectónica rango 2 | 140 |
| Sello dual · Fuego + Tierra | 32 / 34 / 37 | Arco de llama rango 2 + Púa tectónica rango 2 + Forja de magma rango 2 | — |
| Sincronía · Fuego + Tierra | 48 / 50 / 53 | Arco de llama rango 2 + Púa tectónica rango 2 + Sello dual · Fuego + Tierra rango 3 | — |
| Aguja de chispa | 20 / 22 / 25 | Arco de llama rango 2 + Paso del céfiro rango 2 | 90 |
| Cadena estática | 32 / 34 / 37 | Arco de llama rango 2 + Paso del céfiro rango 2 + Aguja de chispa rango 2 | 210 |
| Juicio del cielo | 48 / 50 / 53 | Arco de llama rango 2 + Paso del céfiro rango 2 + Cadena estática rango 3 | 320 |
| Enredo esmeralda | 20 / 22 / 25 | Muro de marea rango 2 + Púa tectónica rango 2 | 115 |
| Sello dual · Agua + Tierra | 32 / 34 / 37 | Muro de marea rango 2 + Púa tectónica rango 2 + Enredo esmeralda rango 2 | — |
| Sincronía · Agua + Tierra | 48 / 50 / 53 | Muro de marea rango 2 + Púa tectónica rango 2 + Sello dual · Agua + Tierra rango 3 | — |
| Lanza glacial | 20 / 22 / 25 | Muro de marea rango 2 + Paso del céfiro rango 2 | 130 |
| Sello dual · Agua + Viento | 32 / 34 / 37 | Muro de marea rango 2 + Paso del céfiro rango 2 + Lanza glacial rango 2 | — |
| Sincronía · Agua + Viento | 48 / 50 / 53 | Muro de marea rango 2 + Paso del céfiro rango 2 + Sello dual · Agua + Viento rango 3 | — |
| Prisión de arena | 20 / 22 / 25 | Púa tectónica rango 2 + Paso del céfiro rango 2 | 135 |
| Sello dual · Tierra + Viento | 32 / 34 / 37 | Púa tectónica rango 2 + Paso del céfiro rango 2 + Prisión de arena rango 2 | — |
| Sincronía · Tierra + Viento | 48 / 50 / 53 | Púa tectónica rango 2 + Paso del céfiro rango 2 + Sello dual · Tierra + Viento rango 3 | — |
