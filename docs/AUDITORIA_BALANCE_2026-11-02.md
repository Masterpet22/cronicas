# Auditoría de fórmulas, progresión y balance

Fecha: 2 de noviembre de 2026. Código local del proyecto, paquete 0.45.1, guardado v26.

**Referencia histórica anterior a los ajustes:** posteriormente se adaptó Varek a la debilidad frente al jugador, se bajó la reserva base de chakra a 60, se fijaron 5 CH de recuperación normal y 25 CH totales con Guardia, y se elevaron los costes de técnicas. Las reglas actuales están en `BALANCE_COMBATE.md`; este informe y `artifacts/balance-audit.json` conservan el diagnóstico previo. El script usa las reglas vigentes y el resultado posterior está en `artifacts/balance-current.json`.

**Diagnóstico: la base matemática es comprensible y está probada, pero el balance global todavía no está cerrado.** Hay incoherencias entre acciones y descripciones, desbloqueos que el contenido actual no permite alcanzar y nuevas fuentes de poder que no entran en las pruebas antiguas de balance. Conviene resolver eso antes de ajustar la vida de todos los enemigos o ampliar la campaña.

No se modificaron fórmulas, catálogos ni partidas. Esta auditoría añade un script y sus resultados para reproducir los cálculos.

## Alcance y evidencia

- Lectura de daño, afinidades, atributos, equipo, Resonancia, taijutsu, línea temporal, estados, IA, recuperación, consumibles, reintentos y recompensas.
- Liquidación de las siete misiones principales y los dos contratos mediante las funciones reales de recompensas. Para este cálculo se da por resuelta la narrativa y el puzle del médico; no se usan checkpoints que salten su recompensa.
- Cinco recorridos: entrada principal, entrada secreta, ambos con contratos y recorrido con Marca del erudito. La Marca se compra después de m01 vendiendo el amuleto inicial; los contratos se compran al final.
- Sondas sobre `executeTimelineAction` y `playerGuard`, con presentación sustituida por funciones vacías. Sirven para comprobar el orden de las operaciones sin ejecutar animaciones.
- `npm test`: pasa la batería completa existente.

Reproducción: `node scripts/audit-balance.mjs --json=artifacts/balance-audit.json`.

Los datos completos están en `artifacts/balance-audit.json`. No se han medido tasas de victoria, tiempos de animación ni experiencia de jugadores humanos. Las comparaciones de daño son referencias matemáticas; no equivalen a turnos efectivos para ganar.

## 1. Fórmulas actuales

| Sistema | Regla efectiva | Evaluación |
|---|---|---|
| PX para el siguiente nivel | `80 + 40 × nivel` | Lineal, con sobrante conservado. Adecuada para la saga actual. |
| Atributos automáticos | Por nivel ganado: +6 PV, +1 fuerza, +3 chakra; velocidad cada 3 y suerte cada 4 niveles ganados | Garantiza crecimiento sin obligar a invertir puntos. |
| Especialidad | Fuego: fuerza extra en niveles 2, 4, 6…; agua: velocidad extra en esos niveles; tierra: +3 PV por nivel; viento: +3 chakra por nivel | Agua crece en frecuencia de acciones; viento crece en un recurso actualmente abundante. |
| Entrenamiento | 2 puntos por nivel; cada punto da +10 PV, +1 fuerza, +1 velocidad, +5 chakra o +1 suerte | Un punto de fuerza aporta unos 0,75 de daño antes de multiplicadores; velocidad afecta todas las acciones. No tienen valor equivalente. |
| Límite por atributo | `máximo(2, nivel + 1)` puntos | Evita concentraciones extremas tempranas. |
| Resonancia | 3 puntos iniciales +2 por nivel; atributos y Resonancia se acumulan | La curva antigua ya no representa todo el poder disponible. |
| Daño | `técnica + round(fuerza base × 0,75)`, multiplicado por sellos, fuerza de afinidad, ciclo elemental y Furia; redondeo; crítico; reducción plana; Guardia | La fuerza porcentual multiplica también la parte fija de la técnica. No equivale a sumar 20 % únicamente al atributo fuerza. |
| Ciclo elemental | +20 % o −20 %, comparando las afinidades principales | También se aplica a golpes físicos; no consulta el elemento de la técnica usada. |
| Precisión | `clamp(precisión + modificador − evasión − penalización Sellado, 50, 100)` | Nunca hay menos de 50 % de acierto. El techo nominal de evasión 75 no siempre tiene utilidad real. |
| Crítico | `mínimo(25, 5 + floor(suerte × 0,8))` %, daño ×1,5 | Con la suerte inicial 10 se empieza en 13 %, no en 5 % efectivo. |
| Recuperación | +8 chakra al completar normalmente una acción propia; entre rivales +22 % PV y +18 % chakra, mínimo 12 | Hay excepciones de flujo y de misión explicadas abajo. |

Fuentes principales: `src/progression-balance.js`, `src/affinity-system.js`, `src/save.js:545`, `src/battle/damage.js`, `src/rules.js`.

## 2. Progresión real y contenido alcanzable

Recorrido por la entrada principal, sin contratos ni Marca del erudito, sin gastar monedas:

| Misión | PX de enemigos y cierre | Nivel al terminar | PX sobrantes | Monedas acumuladas |
|---|---:|---:|---:|---:|
| Tras las huellas del gato | 130 | 2 | 10 | 100 |
| El silencio de Kagemori | 0 | 2 | 10 | 100 |
| Asalto al Desfiladero del Cuervo | 207 | 3 | 57 | 272 |
| El médico errante | 45 | 3 | 102 | 302 |
| El umbral de los cuervos | 197 | 4 | 99 | 447 |
| El corazón de la guarida | 223 | 5 | 82 | 614 |
| El jefe de los bandidos | 250 | 6 | 52 | 834 |

La curva 1→6 funciona. La misión del médico es ahora principal y obligatoria; el documento anterior todavía la trata como opcional. Kagemori ocupa 5–7 minutos anunciados sin premio de PX ni monedas: puede ser una decisión narrativa, pero corta la sensación de progreso después del tutorial.

Los contratos añaden 223 PX en total. Sin Marca, todo el contenido termina en nivel 6 con 275/320 PX. Con Marca comprada tras m01, entrada principal y ambos contratos se llega a nivel 7 con 129/360 PX.

Incluso concediendo el bono de +15 % desde la primera recompensa, el máximo teórico del catálogo es **1468 PX**. El nivel 8 requiere **1680 PX acumulados**. Por tanto:

- La cuarta ranura elemental, abierta en nivel 8, no se alcanza con las recompensas actuales.
- El contrato del sabueso recomienda nivel 8, aunque se puede comprar y jugar antes porque ese nivel no es un requisito. Su recomendación no encaja con el techo de contenido.
- La segunda afinidad requiere nivel 15/rango elemental 2 o Guardián/nivel 10. Ninguna misión vigente concede Guardián ni eleva el rango elemental. Las combinaciones elementales y buena parte del árbol quedan fuera del recorrido de una partida nueva.
- La tercera afinidad, su pergamino y los elementos de rango superior son contenido preparado para expansión, no progresión alcanzable ahora. Deben presentarse con ese alcance.
- Arena y Torre no conceden PX, y repetir misiones tampoco; no existe una actividad alternativa que cierre esa distancia.

**Recomendación:** decidir qué debe poder probarse al terminar la primera saga. Si se quiere mostrar la cuarta ranura y combinaciones, hay que conectar sus desbloqueos al presupuesto real de PX y rangos; si pertenecen a sagas futuras, comunicarlo expresamente. No hace falta acelerar todos los niveles.

## 3. Incoherencias verificadas en el combate

### Prioridad alta: velocidad de acciones instantáneas

Antes de elegir una acción, la línea temporal avanza usando únicamente la velocidad del luchador. Cuando la acción no tiene preparación, se ejecuta inmediatamente al 80 % y no vuelve a usar su `speedMod`.

Resultado: Golpe veloz (+4), Guardia (+8), Puño de hierro (−1) y Paso fugaz (+6) no difieren en tiempo por esos modificadores. A velocidad 10, Puño de hierro y Paso fugaz tienen el mismo ciclo de 1200 ms de línea temporal. La descripción de Paso fugaz promete adelantar la acción, pero no lo hace.

La velocidad de las técnicas con sellos sí cambia el tramo 80–100 %. Tener 2, 3 o 4 sellos no alarga por sí mismo ese tramo: el tiempo depende de `speedMod`, mientras la secuencia manual/automática se representa con la línea detenida.

**Pulir primero:** definir si la rapidez modifica preparación, recuperación posterior o ambas. Después calcular tiempos y comparar daño por tiempo. Ajustar el daño antes ocultaría este problema.

Fuentes: `src/battle/scenes/battle-presentation.js:601`, `src/battle/scenes/battle-flow.js:36`, `src/battle/timeline.js`, `src/skills/definitions.js`.

### Prioridad alta: Guardia anuncia +12, pero da +20

`playerGuard` añade 12 y el cierre normal de la acción añade otros 8. La sonda parte de 30 CH y termina en 50. Además de dividir el daño entre dos, Guardia evita los estados de la acción enemiga cuando el golpe acierta; esa protección adicional no aparece en su descripción breve.

Por otro lado, se retira después de cualquier acción enemiga, incluso un fallo o una acción perdida por aturdimiento. Eso contradice la promesa de proteger el «próximo impacto».

**Decisión necesaria de diseño:** +12 totales o +12 adicionales; próximo impacto recibido o próxima acción enemiga; qué estados debe bloquear. Luego alinear cálculo, texto y pruebas.

Fuentes: `src/battle/scenes/battle-actions.js:538`, `src/battle/scenes/battle-flow.js:114` y `:120`.

### Prioridad media: el golpe que derrota al rival omite el cierre normal

Después del ataque propio se llama a `resolveEnemyOutcome` antes de aplicar los estados del jugador, avanzar enfriamientos y recuperar 8 CH. Si el rival cae, se sale por anticipado. Una sonda con 3 PV y veneno de potencia 3 conserva los 3 PV cuando el desenlace devuelve éxito, y tampoco regenera chakra ni avanza la recarga.

Entre rivales la recuperación puede ocultar esto; en la última acción puede permitir ganar sin sufrir el último daño de veneno. No afirmo que esa prioridad de victoria sea incorrecta: falta convertirla en una regla deliberada y probarla junto a las demás operaciones de fin de acción.

Fuente: `src/battle/scenes/battle-flow.js:107`.

### Prioridad media: modo manual y documentación no coinciden

El README dice que los sellos manuales no tienen límite. El código concede 1200 ms por sello normal y 1500 ms en técnicas cinematográficas, excepto durante la práctica guiada. Perfecto da ×1,10, 1–2 errores ×1 y más errores ×0,85; automático da ×1.

Esto añade dificultad y una ventaja de daño dependiente de la forma de introducir los sellos. Debe medirse como una condición separada del balance automático.

Fuente: `src/battle/scenes/battle-actions.js:87` y `:146`.

## 4. Afinidades y supervivencia

Valores iniciales con cuerpo masculino, maestro asignado y equipo gratuito, sin entrenamiento ni Resonancia:

| Afinidad | PV | CH | Fuerza mostrada | Velocidad efectiva | Evasión con CH lleno |
|---|---:|---:|---:|---:|---:|
| Fuego | 100 | 120 | 14 | 8,8 | 17 |
| Agua | 100 | 120 | 11 | 12 | 17 |
| Tierra | 120 | 106 | 12 | 10 | 17 |
| Viento | 88 | 144 | 12 | 10 | 25 |

Hay identidad entre afinidades, pero la campaña favorece unas características más que otras:

- **Agua:** velocidad inicial +20 %, crecimiento adicional en velocidad y Empapado. Los tres jefes principales son fuego, de modo que tiene +20 % ofensivo y recibe ataques con −20 % elemental frente a todos ellos.
- **Viento:** menos vida, resistencia ofensiva contra esos tres jefes y mayor daño elemental recibido. Su compensación principal es chakra, que escasea poco con el sistema actual. La evasión extra solo existe con la reserva completamente llena.
- **Fuego:** fuerza porcentual aplicada al daño completo y Furia al perder PV; a cambio actúa más lento. Puede producir remontadas fuertes, pero los cálculos de la prueba de balance no incluyen esa pasiva.
- **Tierra:** reserva de vida y Represalia, que tiene 20 % de probabilidad y límites por daño y PV del atacante. La vida también aumenta las recuperaciones porcentuales, así que su ventaja defensiva se acumula.

Como referencia controlada, contra Raizen con la defensa de la ruta «eliminar», en nivel 5, sin puntos invertidos, con sellos automáticos y sin críticos, Furia ni estados:

| Afinidad / técnica | Daño por impacto | Tiempo de línea por acción | Daño bruto por segundo de línea |
|---|---:|---:|---:|
| Agua / Lanza abisal | 38 | 990 ms | 38,39 |
| Tierra / Pulso sísmico | 37 | 1466 ms | 25,24 |
| Viento / Ciclón cortante | 37 | 1466 ms | 25,24 |

Se excluyen fallos y enfriamientos: son referencias, no DPS sostenido ni pruebas de victoria. Aun así, muestran por qué comparar solo «número de impactos» oculta la ventaja de frecuencia de agua. El Filo de vendaval inicial necesita 8 impactos brutos en esa ruta, por encima del objetivo antiguo de hasta 7 contra Raizen.

**Pulir:** diversificar las afinidades de los jefes o compensar sus encuentros de forma explícita; medir daño recibido, frecuencia, estados y recursos por afinidad. No aumentar daño de viento a ciegas para corregir únicamente sus duelos contra fuego.

### La apariencia cambia el balance inicial

El cuerpo masculino asigna a Mei (+2 reducción de daño); el femenino asigna a Daichi (+3 fuerza base). Un personaje de fuego empieza respectivamente con fuerza mostrada 14 o 18 y reducción 2 o 0. La elección de maestro se desbloquea después de completar la saga.

Si ese vínculo no es una elección de diseño deliberada, conviene separar maestro y apariencia. En cualquier caso, las comparaciones de balance deben cubrir ambos perfiles.

Fuentes: `src/save/character-state.js`, `src/save.js:578`.

## 5. Chakra, técnicas, atributos y Resonancia

### El chakra ofrece poca presión con técnicas básicas

Tras una acción normal, Palma de vacío cuesta neto 1 CH; las técnicas iniciales de coste 10 cuestan neto 2. Con reservas iniciales de 106–144, recuperación entre rivales y Guardia que devuelve 20, la reserva extra de viento y las mejoras de chakra aportan menos de lo que sugieren sus cifras.

Las técnicas superiores sí gastan más y sus enfriamientos impiden usarlas siempre. Pero no hay que tratar +30 CH como una mejora equivalente a una mejora defensiva o de velocidad sin medir cuántas veces se agota realmente cada reserva. Las reducciones de coste pueden hacer que atacar mantenga o aumente el chakra.

### Hay técnicas con funciones demasiado parecidas

| Comparación | Diferencia actual | Riesgo |
|---|---|---|
| Paso del céfiro / Palma de vacío | +1 daño, +1 coste, menos precisión y añade recarga; misma rapidez | Poco incentivo para la técnica posterior, salvo umbrales concretos de daño. |
| Onda cortante / Filo de vendaval | +1 daño, +1 coste, menos precisión y pierde Herida | El desbloqueo posterior puede sentirse peor. |
| Arco de llama / Ascuas veloces | +2 daño, +2 coste, menos precisión, más lento y sin quemadura | Falta una función que justifique elegirlo. |
| Muro de marea / Muralla pétrea | Son ataques de daño directo sin protección especial | Las ramas de agua y tierra tienen menos variedad funcional que fuego y viento, que además ofrecen estados y definitivas. |

Estas son comparaciones de ficha, no dominancia absoluta en todos los umbrales de vida. Dar funciones diferentes —defensa, ruptura, prioridad, control, consumo de estados— sería más útil que variar solo dos puntos de daño.

### La defensa plana puede concentrar demasiado poder temprano

En nivel 4 hay 9 puntos de Resonancia. Es legal invertirlos en `physical_0:1`, `physical_1:1`, `physical_3:3`, el primer puente físico de la afinidad a 1 y el segundo a 3. Con Mei se alcanza **8 de reducción plana** frente a los 2 iniciales.

Los golpes enemigos tempranos y medios tienen bases de 9–13 o similares. Restar 8 a cada golpe puede recortar mucho más daño porcentual que el que añade una mejora de ataque del mismo coste. No concede invulnerabilidad: existe daño mínimo 1, golpes fuertes, críticos, Furia y daño de estados. Sí merece una comparación formal frente a construcciones de vida, ataque y velocidad.

Además, las mejoras de «ataque físico» se suman a fuerza compartida y benefician a los jutsus. No hay redistribución de Resonancia equivalente a la de atributos; una mala compra puede quedar inmovilizada en una campaña de recursos finitos.

**Pulir:** medir el beneficio marginal por punto, establecer un presupuesto para reducción plana y revisar costes/prerrequisitos. Mantener decisiones reversibles mientras se calibra el árbol facilitaría las pruebas.

## 6. Estados, recuperación e IA

- Quemadura, Herida y Veneno hacen daño fijo al terminar la acción del afectado; no escalan con fuerza ni con nivel y no se acumulan como instancias independientes. Reaplicar conserva el mayor poder y la mayor duración. Esto hace que un atacante rápido pueda renovar un estado sin cobrar todo el daño teórico de cada aplicación.
- Sellado resta 15 a precisión. Aturdimiento hace perder la acción del enemigo; los enemigos actuales no tienen técnicas que aturdan al jugador. Antes de añadirlas hay que implementar/probar también ese lado: no existe un bloqueo simétrico del turno propio por Aturdido.
- Empapado se reduce al completar acciones del afectado; el objetivo tiene hasta 5 acumulaciones, −3 % por acumulación y la mitad contra jefes. Su potencia real depende de quién actúe más, no de segundos de reloj.
- La recuperación normal entre rivales limpia `statuses`, pero no limpia `soak`. El tónico sí limpia ambos y reintentar también. Hay que decidir qué significa «limpiar estados» de manera uniforme.
- El descanso en m04 sustituye el porcentaje por +70 PV/+55 CH; conservar suministros solo da +10/+8 y no limpia estados. La elección importa mucho más que algunas mejoras de equipo.
- Los dos reintentos restauran ambos combatientes, recursos, recargas y línea temporal; mantienen los duelos previos. Esto reduce bastante la dificultad real de completar una misión y debe incluirse en las mediciones.
- La IA usa patrones deterministas, daño aleatorio y preparación para ciertas acciones. En fase II los jefes ganan +3 velocidad, +4 precisión y +2 evasión. No consumen chakra ni tienen costes/enfriamientos de técnicas propios: su barra de chakra no limita su capacidad ofensiva.
- El nivel mostrado de cada enemigo es informativo: sus atributos se fijan individualmente en el catálogo y no crecen con la fórmula de niveles del jugador. Un cambio de etiqueta de nivel no cambia su dificultad por sí mismo.

La barra enemiga y las reglas de estados necesitan un contrato claro antes de añadir más técnicas que interactúen con ellas.

## 7. Economía, decisiones y modos alternativos

- La campaña principal produce 834 monedas por entrada principal y 936 combinando interrogatorio y entrada secreta, antes de compras. Esa ruta da +102 monedas, pero pierde 28 PX por saltar un guardia; aumenta primero la dificultad de Akumori y después reduce la vida inicial de Raizen al 85 %. Es una compensación real que conviene conservar y explicar.
- El contrato de la reliquia cuesta 80 y devuelve 61 monedas contando enemigos; el del sabueso cuesta 150 y devuelve 79. Sus costes netos son 19 y 71 a cambio del equipo, además de PX. La comparación correcta incluye enemigos y recompensa de cierre.
- No hay ingreso repetible. Pociones, pergaminos, equipo y decoración compiten por un presupuesto finito. Vender devuelve la mitad; no permite deshacer económicamente una compra. Si se quiere una economía finita de saga, necesita precios y explicaciones coherentes con esa intención.
- Una poción de vida cuesta 18 y recupera 35 %; su valor aumenta con los PV máximos. Usar objetos consume una acción, y los objetos gastados siguen gastados al retirarse o reintentar. El gasto persistente está cubierto por pruebas.
- Arena adapta estadísticas al jugador, pero luego vuelve a aplicar la afinidad del rival. En Equilibrado, contra un jugador inicial con 100 PV, el rival de tierra tiene 120 PV y el de viento 88. «Equilibrado» no significa una probabilidad de victoria idéntica entre rivales. La IA tampoco copia las pasivas defensivas, equipo o repertorio del jugador.
- Torre usa el perfil Desafío, otra multiplicación de vida ×1,25 y la afinidad. Es un reto adaptativo, no una prueba independiente de progreso: mejorar el personaje también eleva al enemigo. No otorga PX ni monedas. Su escena evita la transición genérica a fase II; no corresponde asumir que use los dos patrones de los jefes de campaña.

## 8. Qué validan las pruebas y qué falta

La batería existente protege bien guardado, recompensas, migraciones, reglas puras y estructura. Que pase no demuestra equilibrio de estrategias.

La prueba `tests/progression-balance.test.mjs`:

- Cuenta impactos con la técnica inicial de más daño, sin jugar una rotación.
- No mide precisión, daño recibido, preparación, críticos, estados, recargas, consumibles, Resonancia o taijutsu.
- Para la referencia de impactos no utiliza `createEnemyState` con los modificadores de la ruta. Así omite, por ejemplo, los 3 de defensa de Raizen al eliminar al prisionero.
- Usa checkpoints para habilitar las cinco misiones de combate y omite la recompensa obligatoria del médico. Comprueba una curva parcial que ya no describe todo el recorrido narrativo.
- No compara cuerpos/maestros ni construcciones de atributos y equipo.

La prueba de Empapado en `battle-logic.test.mjs` llama `soakAfterTurn(soaked)`, aunque la función recibe un combatiente con propiedad `soak`. Por eso su expectativa de `null` no comprueba la duración normal del estado. Es una laguna de prueba, no evidencia de que Empapado desaparezca inmediatamente en el juego.

## 9. Orden propuesto para pulir

1. **Fijar contratos de reglas:** velocidad de acciones instantáneas; recuperación y consumo de Guardia; orden del final de acción; limpieza de Empapado; tiempos reales de sellos. Corregir texto y pruebas junto al comportamiento elegido.
2. **Alinear progresión y alcance:** decidir nivel de cierre y desbloqueos de esta saga; corregir recomendación del contrato; distinguir ampliación futura. Actualizar `BALANCE_COMBATE.md`, README y `ESTADO_ACTUAL.md`.
3. **Revisar fuentes de poder:** defensa plana de Resonancia, velocidad frente a fuerza, presión de chakra, cuerpo/maestro y funciones de técnicas solapadas.
4. **Calibrar encuentros:** las cuatro afinidades, ambos maestros, rutas principales/secretas y equipos modestos frente a optimizados. Diversificar jefes o medir explícitamente la penalización de repetir fuego.
5. **Añadir una matriz de combate reproducible:** semillas fijas y varias estrategias, ejecutando el mismo núcleo de reglas del juego. Medir victoria al primer intento y con reintentos, acciones, PV mínimos/finales, chakra mínimo, uso de Guardia/objetos y duración de línea temporal. Después contrastarlo con partidas humanas.

Como objetivos iniciales de medición —propuestas, no valores aprobados—: que una construcción razonable pueda terminar la saga con cualquiera de las cuatro afinidades; que ninguna acción quede invalidada por una promesa de velocidad falsa; que el chakra obligue a elegir al menos en combates largos; y que los desbloqueos anunciados para esta saga se obtengan dentro de su presupuesto real de PX.

No recomiendo retocar todos los enemigos todavía. Primero hay que hacer fiables las reglas y ampliar las mediciones; entonces los ajustes numéricos tendrán una base comparable.
