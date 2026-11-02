# Sistema de combate, progresión y recompensas

Este documento es la referencia normativa del juego. El árbol y sus rutas se
detallan en [ARBOL_RESONANCIA.md](ARBOL_RESONANCIA.md). El contrato para crear
misiones está en [SISTEMA_MISIONES_DIALOGOS.md](SISTEMA_MISIONES_DIALOGOS.md).
Las reglas de este documento se aplican al contenido jugable y a las expansiones.

## Límites y monedas de progreso

| Concepto | Regla |
|---|---|
| Nivel del personaje | 1–60 |
| Rango de una habilidad | 0 bloqueada, 1–3 aprendida |
| Puntos de habilidad o PR | 0 iniciales, 2 por subida; máximo 118 |
| Puntos de atributos | 0 iniciales, 2 por subida; presupuesto separado |
| Árbol completo | 38 habilidades, una por hexágono, más el centro del personaje |
| Precio de cada rango comprado | 1 PR |
| Rangos gratuitos | 2 técnicas principales, Disciplina del cuerpo y la primera de cada nueva afinidad |
| Coste del árbol completo al rango 3 | 38 × 3 − 5 = 109 PR |
| Presupuesto para completarlo | Nivel 56: 110 PR; nivel 60: 118 PR, con 9 restantes |

Los PX de personaje suben el nivel. Los PX de afinidad habilitan el aprendizaje
de técnicas. Los PR se gastan en el Dojo para desbloquear o mejorar habilidades.
Los puntos de atributos se distribuyen por separado. Una misión entrega PX,
monedas u objetos según su ficha; los puntos de habilidad proceden de las subidas.

## Experiencia y subida de nivel

Subir desde nivel `N` cuesta `80 + 40 × N` PX. Para llegar desde nivel 1 a nivel
`L` se necesitan `(L − 1) × (20 × L + 80)` PX acumulados.

| Nivel de destino | PX desde el nivel anterior | PX acumulados desde nivel 1 |
|---:|---:|---:|
| 2 | 120 | 120 |
| 15 | 640 | 5.320 |
| 30 | 1.240 | 19.720 |
| 40 | 1.640 | 34.320 |
| 56 | 2.280 | 66.000 |
| 60 | 2.440 | 75.520 |

La experiencia sobrante se conserva y una recompensa puede producir varias
subidas. El nivel 60 detiene los PX de personaje y las nuevas concesiones por
nivel. Los PX de afinidad siguen entrenándose por el valor completo de la recompensa.

Cada subida añade +6 PV base, +1 fuerza y +3 chakra; además, +1 velocidad cada
tres subidas y +1 suerte cada cuatro. Fuego añade +1 fuerza cada dos subidas;
Agua, +1 velocidad cada dos; Tierra, +3 PV por subida; Viento, +3 chakra por subida.
Los modificadores de afinidad se aplican después de nivel, equipo y entrenamiento.
Un atributo admite como máximo `nivel + 1` puntos entrenados, con mínimo 2.

## Regla obligatoria de recompensas de experiencia

La recompensa de una misión se calcula con su **nivel recomendado fijo**, no con
el nivel del jugador. Cada misión declara `recommendedLevel` y `rewardProfile`.
La fórmula es `redondear((80 + 40 × nivel recomendado) × proporción)`.

| Perfil | Uso | Proporción de una subida |
|---|---|---:|
| `short` | Encargo corto, investigación o búsqueda | 25 % |
| `normal` | Misión de duración normal | 50 % |
| `hard` | Misión difícil | 75 % |
| `boss` | Misión larga con jefe importante | 100 % |
| `affinity` | Prueba especial que habilita una afinidad | 0 %; recompensa de desbloqueo |

Las principales de introducción, señaladas con `introductory: true`, conceden el
100 % del umbral en niveles recomendados 1–5. Esto sostiene aproximadamente una
subida por misión principal de combate. Después, la referencia son dos misiones
normales del nivel adecuado por subida. La clasificación se elige considerando
la duración y dificultad reales; incluir un enemigo jefe no clasifica por sí solo
la misión completa como `boss`.

| Nivel recomendado | Encargo corto | Normal | Difícil | Larga con jefe |
|---:|---:|---:|---:|---:|
| 10 | 120 | 240 | 360 | 480 |
| 15 | 170 | 340 | 510 | 680 |
| 30 | 320 | 640 | 960 | 1.280 |
| 40 | 420 | 840 | 1.260 | 1.680 |
| 59 | 610 | 1.220 | 1.830 | 2.440 |

Todas las cifras son PX **totales**, incluidos enemigos y finalización.

- Con combate: 60 % del presupuesto se reparte entre enemigos y 40 % al completar.
  El grupo de enemigos se redondea y la finalización recibe el resto exacto.
- El reparto entre encuentros usa pesos de dificultad: normal 1, élite 2 y jefe 3.
  Los restos de redondeo se asignan por fracción mayor y orden de encuentro.
- Una ruta que cambie el número de enemigos conserva el presupuesto de la misión.
- Sin combate: el 100 % del presupuesto se paga al completar la actividad.
- Un bono de PX, como +15 %, se aplica una vez al presupuesto total y luego se reparte.
- El HUD y el Tablón muestran el total de la misión. El informe suma los encuentros
  y la finalización; esta última no vuelve a entregar el total completo.
- La primera victoria entrega recompensas una sola vez. Repetir una misión
  completada entrega 0 PX de personaje, 0 PX de afinidad y 0 monedas.
- Las exhibiciones, el entrenamiento y las pruebas de afinidad tienen su propia
  recompensa de práctica o desbloqueo y no conceden PX de personaje ni monedas.

Las monedas por enemigo y finalización, los contratos, objetos y decisiones
narrativas tienen sus valores declarados en el contenido. El presupuesto porcentual
regula los PX, no impone una fórmula económica a las monedas.

`src/mission-rewards.js` calcula el presupuesto y el reparto. El registro de
contenido genera `reward.totalXp` y `reward.xp` (solo finalización). Los ejecutores
usan ese mismo plan con los encuentros concretos de la ruta y los bonos del equipo.

## Cobro y persistencia

En combate, PX, monedas y niveles son provisionales hasta confirmar el informe
y regresar a la aldea. Perder o retirarse descarta esas ganancias. Los consumibles
usados sí permanecen gastados. Las investigaciones y búsquedas registran su
finalización una sola vez. El historial evita duplicar pagos o desbloqueos.

La carga valida nivel, rangos, presupuesto, afinidades y predecesoras. Las
inversiones que no cumplen las condiciones se liberan como PR disponibles. El
saldo es estable al recargar y al cambiar de pantalla. El guardado se almacena
en tres partidas locales independientes y usa el esquema 29.

## Afinidades

El jugador elige los elementos y su orden. La afinidad principal aporta el 100 %
de sus modificadores, la secundaria el 50 % y la tercera el 25 %.

| Elemento | Bono principal | Penalización principal |
|---|---|---|
| Fuego | +20 % fuerza | −12 % velocidad |
| Agua | +20 % velocidad | −12 % fuerza |
| Tierra | +20 % vida | −12 % chakra |
| Viento | +20 % chakra | −12 % vida |

El ciclo es Fuego → Viento → Tierra → Agua → Fuego: +20 % de daño con ventaja,
−20 % con desventaja y 0 % en los demás casos. Se comparan las afinidades
principales de los combatientes, también en ataques físicos.

Fuego obtiene Furia al perder vida, hasta +25 % de daño. Agua aplica Empapado,
con hasta cinco cargas de −3 % de velocidad; el efecto sobre jefes se reduce a la
mitad. Tierra tiene 20 % de probabilidad de Represalia, que devuelve 30 % del daño
recibido con tope de 5 % de la vida máxima del atacante. Viento obtiene +8 de
evasión con chakra completo. La evasión tiene tope de 75 % y la velocidad efectiva
conserva al menos 70 % de su base, con mínimo 1.

La segunda afinidad exige nivel 15 y superar **El despertar de la segunda afinidad**
(un duelo). La tercera exige nivel 30, haber elegido la segunda y superar
**La armonía de las tres afinidades** (dos duelos). Las pruebas aparecen en el
Tablón al cumplir sus requisitos. Confirmar la victoria abre la ranura; el elemento
se elige en el Dojo y su primera técnica es gratuita. Perder o abandonar deja la
ranura bloqueada. Los custodios adaptan vida, fuerza y velocidad al personaje.

Varek, el jefe tutorial, usa el elemento débil frente al principal del jugador:
Fuego → Viento, Agua → Fuego, Tierra → Agua y Viento → Tierra.

## Habilidades, aprendizaje y maestría

Una habilidad requiere su casilla, afinidades activas, nivel mínimo, PX de afinidad
cuando corresponda y predecesoras al rango indicado. Cumplirlos habilita comprar
el primer rango por 1 PR. Equipo, entrenamiento y combate validan esa adquisición.
Las gratuitas se conceden al crear el personaje o elegir cada nueva afinidad.

Las técnicas iniciales permiten rangos 2 y 3 en niveles de personaje 3 y 8.
Disciplina del cuerpo los permite en 2 y 6. En las demás habilidades los rangos
2 y 3 requieren `nivel de desbloqueo + 2` y `nivel de desbloqueo + 5`.
La barrera máxima de rango es nivel 53; el presupuesto para todo el árbol se
alcanza en 56. Las 24 combinaciones y órdenes mantienen el mismo coste de 109 PR.

Las rutas exactas de cada habilidad figuran en [ARBOL_RESONANCIA.md](ARBOL_RESONANCIA.md)
y en la ficha del Dojo, con el rango requerido de cada predecesora. Las etapas
principales de técnicas son 6, 12, 24 y 40; las combinadas usan 20, 32 y 48.
Las pasivas tienen sus niveles propios según su posición y efecto.

Cada mejora de técnica añade +2 de daño y descuenta 5 puntos porcentuales del
chakra original: rango 2 añade +2/−5 % y rango 3 +4/−10 %. El coste se redondea
hacia arriba. Al rango 3 se elimina un sello. Los efectos de estado y el enfriamiento
se conservan entre rangos. Las pasivas aplican su efecto por rango aprendido.

Puño de hierro y Paso fugaz son técnicas físicas equipables en dos ranuras
independientes, T1 y T2. Consumen 8 y 5 PV, respectivamente, con 0 CH y sin sellos;
el coste no puede derrotar al usuario. Cada rango adicional añade +2 al daño.

Látigo de corriente y Muralla pétrea tienen 22 de daño y coste 40 CH. Filo de
vendaval tiene 20 de daño y coste 38 CH. Lanza abisal se aprende a nivel 40:
38 de daño, 62 CH, CD3, cuatro sellos y Sellado de un turno. Pulso sísmico también
requiere nivel 40: 40 de daño, 64 CH, CD3, cuatro sellos y Aturdido de un turno.

## Daño, precisión y estados

La base es `daño de técnica + redondear(fuerza base × 0,75)`. Se aplican fuerza de
afinidad, ciclo, Furia, calidad de sellos y crítico, y después la reducción plana.
Guardia divide el impacto protegido entre dos, redondeando hacia arriba.
La precisión y evasión resuelven si el ataque acierta.

El crítico empieza en 5 % y añade `floor(suerte efectiva × 0,8)`, con máximo 25 %;
se multiplica el daño por 1,5. Sellos perfectos añaden 10 % de daño y varios
errores dejan el multiplicador en 85 %. Sellado resta 15 puntos de precisión.
Los estados periódicos avanzan en las acciones del combatiente afectado.

## Chakra y Guardia

La base es 60 CH antes de equipo, afinidades, nivel y entrenamiento. Una acción
propia recupera 5 CH. Guardia recupera **25 CH totales** y protege el siguiente
impacto directo con reducción del 50 %. Un fallo o aturdimiento enemigo conserva
la protección; esta impide repetir Guardia para recargar varias veces.
Los estados activos conservan su duración y daño periódico.

Las técnicas iniciales cuestan 30–42 CH y las más costosas llegan a 72 CH en
rango 1. El descuento de equipo y pasivas conserva al menos la mitad del coste
después de maestría, redondeada hacia arriba. El coste se paga al confirmar la
acción; un fallo conserva el gasto. Al cambiar de rival se recupera 22 % de PV
y 18 % de chakra máximos, con mínimo 12 de cada uno, salvo recursos de misión.

## Velocidad, iniciativa y cierre de acciones

Ambos combatientes avanzan de forma independiente. El tramo 0–80 % es recuperación:
`12000 / velocidad efectiva` milisegundos, modificado por iniciativa temporal.
Cada acción asigna −1, 0 o +1 a la siguiente recuperación: ×0,9, ×1 o ×1,1 en su
velocidad. El valor reemplaza al anterior y se consume al llegar al 80 %.

La preparación elemental 80–100 % tarda
`sellos × 300 ms × 10 / velocidad efectiva`. Más sellos requieren más tiempo.
El enemigo sigue avanzando durante la preparación. Al llegar el jugador al 80 %,
la elección pausa el tiempo hasta confirmar una acción válida. Los ataques físicos
enemigos preparados usan su anticipación definida en el planificador.

Golpe veloz, shuriken, Paso fugaz y golpe rápido enemigo dan +1; Guardia, Puño de
hierro y golpe pesado enemigo dan −1. Técnicas elementales, armas y objetos dan 0.
La iniciativa temporal se limpia al reintentar y al cambiar de duelo.

`closeActionState` cierra una acción una sola vez: avanza Empapado y enfriamientos,
asigna la iniciativa, recupera el chakra correspondiente y limpia preparación y
barra del actor. El rival conserva su progreso. CD1 requiere completar otra acción
propia antes de reutilizar la técnica. Un ataque perdido por aturdimiento no concede
su iniciativa. Los estados periódicos se resuelven una vez por acción propia.

Un golpe final que derrota al último rival concede victoria si el jugador sigue
vivo, antes de un daño periódico posterior. En encuentros intermedios, los estados
se resuelven antes de avanzar; si derrotan al jugador se ofrece reintento.

## Validación y mantenimiento

- `src/progression-balance.js`: curva de nivel, crecimiento, recuperación y pesos.
- `src/mission-rewards.js`: perfiles de misión, presupuesto, bonos y reparto exacto.
- `src/skills/definitions.js`, `unlock-levels.js`, `progression.js`: rutas y compras.
- `src/affinity-system.js`, `chakra-balance.js`: afinidades, recursos y descuentos.
- `src/battle/initiative.js`, `timeline.js`, `action-resolution.js`: ritmo y cierre.
- `npm test`: comprueba reglas, presupuestos, 24 órdenes, persistencia y contenido.
- `node scripts/audit-balance.mjs --json=artifacts/balance-current.json`: informe
  reproducible de las reglas y del contenido registrado.

Las pruebas de navegador verifican compra, bloqueo, equipamiento, combate,
entrenamiento y regreso. Las cifras de daño bruto de la saga se contrastan en
las cuatro afinidades; las tasas de victoria y duración real requieren partidas
jugadas y se deben medir al ampliar el contenido.
