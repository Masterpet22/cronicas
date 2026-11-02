# Árbol de Resonancia

El Dojo → Técnicas reproduce exactamente el plano de 39 hexágonos suministrado
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

El catálogo conserva sus habilidades, mejoras y requisitos anteriores. Las que
exceden las posiciones del plano quedan vinculadas a una celda existente y se
consultan en su ficha con **Técnicas de esta celda**. Las ranuras sin afinidad
mantienen sus celdas bloqueadas.

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
- `src/ui/meta/dojo-techniques.js`: ficha contextual, inversiones y equipamiento.
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
Las técnicas de tres elementos, las maestrías físicas y los cruces físicos de
versiones anteriores se conservan como técnicas vinculadas, sin alterar el plano.

`buildSkillTree` devuelve solo las 38 celdas de habilidades, cada una con sus
`linkedSkills`. `skillTreeNodes` expone las habilidades y sus niveles con un
`cellId` compartido. El renderizado mantiene una sola celda por `cellId`, también
al seleccionar una habilidad vinculada.

## Economía y compatibilidad

El personaje dispone de **3 puntos de Resonancia iniciales y 2 por nivel ganado**,
independientes de los puntos de atributos. Los puntos disponibles se calculan a
partir del nivel y de las inversiones; recargar o cambiar de vista no los duplica.
Cada nodo define su coste por nivel y un máximo de cinco niveles.

Las técnicas existentes mantienen su aprendizaje por nivel y PX de afinidad.
Aprender una técnica concede su primer nivel; cada mejora comprada añade dos
puntos de daño base y reduce el consumo un 5 % del coste original. Al nivel 5,
la reducción alcanza el 20 % y la técnica usa un sello menos. Cada sello suma
300 ms de preparación a velocidad 10; la velocidad del personaje escala ese
tiempo. El Dojo muestra el daño, coste efectivo y número de sellos del nivel
actual. Las especializaciones pasivas se desbloquean
y mejoran con puntos, y sus efectos se aplican en `derivedStats` al crear al
combatiente. Los híbridos requieren progreso en ambas afinidades y, cuando está
definida, la técnica híbrida anterior.

Se guarda únicamente `progression.resonance.investments`, un mapa de ID a cantidad
de niveles comprados. Las partidas sin este campo se normalizan con inversiones
vacías: conservan técnicas aprendidas, ranuras, atributos y equipo. No se necesita
cambiar la versión del formato por este campo opcional. La normalización descarta
IDs desconocidos, rangos no finitos y cantidades negativas, limita los máximos y
el gasto total al presupuesto del personaje.

`taijutsuLoadout` guarda exactamente dos posiciones (ID o `null`), separadas de
`loadout`. Las partidas anteriores reciben dos ranuras vacías. No admite técnicas
bloqueadas, duplicados ni más de dos posiciones; mover una técnica a la posición
de otra intercambia ambas. Las técnicas elementales conservan su equipo.

Puño de hierro y Paso fugaz son los dos taijutsus activos asociados a los nodos
`physical_1` y `physical_2`. Conservan sus bonos de entrenamiento previos; además,
pueden equiparse en T1 y T2 una vez desbloqueados. Cuestan 8 y 5 PV respectivamente,
sin chakra ni sellos, y no pueden dejar al personaje sin vida. Cada rango adicional
añade dos puntos de daño al movimiento equipado. En la tabla física de combate
ocupan las acciones 4 y 5, entre el arma arrojadiza y la Guardia.

Cambiar o reordenar afinidades conserva las inversiones. Las pasivas de afinidades
no equipadas quedan inactivas y se recuperan al volver a equiparlas. No se
reembolsa ni reinicia silenciosamente el progreso.

## Interacción y ampliación

Pasar el cursor muestra una ficha temporal; seleccionar fija la ficha. La inversión
se realiza desde su botón de desbloqueo o mejora. Las técnicas aprendidas conservan
los controles para equipar, quitar y reemplazar una ranura de combate.

- Arrastrar desplaza el árbol; la rueda amplía alrededor del cursor.
- Los controles permiten acercar, alejar, ajustar todo el árbol y centrar el núcleo.
- Tab recorre nodos; Enter o espacio seleccionan; flechas desplazan; +/− amplían;
  Inicio ajusta el panal completo.
- La cámara se conserva durante inversiones y cambios de equipo.

Para añadir habilidades, define sus requisitos y efectos en el catálogo y
vincúlalas a una celda existente. El plano `SKILL_LAYOUT` es un contrato fijo;
ninguna ampliación automática agrega hexágonos. Mantén IDs persistentes para
conservar partidas.
Los efectos pasivos admitidos son vida, fuerza, velocidad, chakra, precisión,
evasión, reducción de daño y reducción del coste de chakra. Añadir una mecánica
nueva requiere implementar su efecto en combate y describirlo en la ficha.

Validación: `npm test` incluye `tests/resonance-tree.test.mjs`; las pruebas de
navegador están en `tests/dojo-techniques.spec.mjs`.
