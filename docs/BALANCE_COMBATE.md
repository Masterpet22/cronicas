# Balance de combate y progresión de la primera saga

Estas reglas cubren los cinco combates de la saga de siete misiones principales. Las cifras editables están en `src/progression-balance.js`, `src/affinity-system.js`, `src/chakra-balance.js`, `src/data.js` y las recompensas finales de cada misión en `src/content/sagas/`.

## Experiencia y niveles

- Para subir del nivel `N` al `N + 1` se necesitan `80 + 40 × N` PX. La experiencia sobrante se conserva.
- Cada enemigo tiene una recompensa por identidad; el orden del encuentro no altera sus PX ni sus monedas. El cierre de la misión añade su recompensa propia.
- Los PX, las monedas y los niveles se calculan durante el combate, pero permanecen provisionales hasta que el jugador acepta el informe y vuelve a la aldea. Abandonar o perder los descarta. Una misión ya completada no vuelve a dar PX, PX de afinidad ni monedas al repetirse.
- La ruta principal, sin contratos ni bonos de experiencia, lleva de nivel 1 a 2, 3, 4, 5 y 6 al terminar m01…m05. Kagemori y el médico son misiones principales intermedias; el médico concede 45 PX adicionales.
- Cada nivel otorga automáticamente `+6 PV base`, `+1 fuerza base` y `+3 chakra base`; además, `+1 velocidad` cada tres niveles y `+1 suerte` cada cuatro. Fuego añade `+1 fuerza` cada dos niveles; agua, `+1 velocidad` cada dos; tierra, `+3 PV base` por nivel; viento, `+3 chakra base` por nivel. Los modificadores porcentuales de afinidad se aplican después.
- Después de vencer al rival cuya experiencia cruza el umbral, el personaje brilla con luz blanca y el humo lleva a una ventana con los valores anteriores y nuevos de los cinco atributos. Al aceptar, el humo devuelve al mismo combate si quedan rivales; los bonos funcionan allí provisionalmente. La recompensa de cierre de misión puede causar otra subida antes del regreso. Abandonar muestra una confirmación que avisa de la pérdida de recompensas y niveles vistos.
- Cada nivel también da dos puntos para distribuir en el Dojo. Un atributo puede recibir como máximo `nivel + 1` puntos, con mínimo de dos al nivel 1. Redistribuir devuelve los puntos invertidos. Al cargar una partida antigua, los puntos por encima del límite se devuelven para redistribuirlos.

## Daño y supervivencia

El daño base de una acción es `daño de la técnica + redondear(fuerza base × 0,75)`. Después se aplican la afinidad del atacante, la ventaja o desventaja elemental, la pasiva de fuego, la calidad de los sellos y el crítico. Finalmente se resta la reducción de daño y, si hay Guardia, el impacto se divide por dos redondeando hacia arriba. La precisión y la evasión deciden antes si el ataque acierta.

El crítico parte del 5 % y suma `floor(suerte efectiva × 0,8)`, con tope de 25 %. Los críticos siguen multiplicando el daño por 1,5. Una secuencia perfecta de sellos añade el 10 %; una secuencia con varios errores lo reduce al 85 %. El ciclo elemental conserva ±20 %.

Entre enemigos de una misma misión se restauran el 22 % de los PV máximos y el 18 % del chakra máximo, con mínimo de 12 de cada recurso. Las decisiones especiales de la misión pueden sustituir esa recuperación.

La reserva base de chakra es 60; se mantienen los bonos de equipo, afinidad, atributos y niveles. Al completar una acción propia se recuperan 5 CH, incluso si el golpe derrota al enemigo. Guardia es un descanso defensivo que recupera 25 CH **en total**, sustituyendo los 5 normales, y mantiene la reducción de daño del 50 %. No hay dos recuperaciones acumuladas.

Las técnicas iniciales cuestan 30–42 CH en nivel 1 y las definitivas hasta 72. Por ejemplo, Ascuas veloces cuesta 30 y deja un gasto neto de 25 después de recuperar 5; una Guardia devuelve 25. En nivel 5 cuesta 24 y deja un gasto neto de 19. Las reducciones de equipo/Resonancia no pueden rebajar el coste de una técnica a menos de la mitad del coste de su nivel actual (redondeado hacia arriba). El HUD, el Dojo y el tutorial usan las mismas reglas que el gasto real. El entrenamiento libre conserva su restauración de recursos después de cada prueba.

## Maestría y preparación

El máximo de cada habilidad es 5. Las técnicas elementales aprendidas empiezan en nivel 1 y admiten cuatro mejoras de Resonancia. Cada mejora añade +2 al daño y reduce el coste en 5 puntos porcentuales del coste original, hasta un 20 % en nivel 5. El coste se redondea hacia arriba. Al llegar a nivel 5 se elimina exactamente el último sello de la secuencia original. No cambia el enfriamiento ni el estado aplicado. Las inversiones anteriores conservan su nivel y ahora pueden seguir mejorándose. Las pasivas y los taijutsus también admiten hasta cinco niveles y conservan sus efectos por nivel; los taijutsus siguen consumiendo vida, sin chakra ni sellos.

La preparación elemental entre 80–100 % tarda `sellos × 300 ms × 10 / velocidad efectiva del personaje`. A velocidad 10, uno/dos/tres/cuatro sellos tardan 300/600/900/1200 ms. El antiguo `speedMod` del jutsu no altera ese cálculo: el número de sellos define su dificultad de preparación. El rival sigue avanzando mientras se prepara la técnica. Los ataques físicos enemigos con preparación y sin sellos mantienen su regla propia de anticipación.

Varek, jefe del combate tutorial, adapta su afinidad a la debilidad frente a la principal del jugador: fuego→viento, agua→fuego, tierra→agua y viento→tierra. Esto aplica sus atributos y pasiva de esa afinidad, conservando identidad, recompensas y patrones. Los otros jefes y los bandidos del tutorial mantienen su afinidad. La adaptación también se usa al reintentar, repetir la misión y consultar su ficha en la Biblioteca; nunca modifica el catálogo global.

Los perfiles enemigos muestran niveles 1–6 acordes con la etapa de la saga. Su vida, fuerza, precisión y patrones siguen definidos por enemigo en `src/data.js`; el número de nivel del rival es una indicación de dificultad y no aplica automáticamente los bonos del personaje jugador.

## Objetivo y control

Con la técnica inicial de mayor daño de cada afinidad, sin invertir puntos, los enemigos de la saga requieren entre 2 y 5 impactos base acertados; Raizen requiere entre 4 y 7 según afinidad. Es una referencia de daño bruto: enfriamientos, fallos, estados, guardias y habilidades desbloqueadas cambian los turnos reales. `tests/progression-balance.test.mjs` comprueba esos límites, la curva de niveles en las cuatro afinidades, el cierre de recompensas repetibles, los bonos automáticos y el límite de entrenamiento. `tests/level-up.spec.mjs` comprueba el aviso visible y accesible de subida de nivel.
