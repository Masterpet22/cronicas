# Saga 1 — Futuro prometedor

**Estado: diseño vigente de la campaña jugable.**

Documento de diseño narrativo y tutorial para las misiones principales `m01`, `m02`, `m03`, `m04` y `m05`, además de las secundarias `s01` y `s02`. Esta es la campaña completa disponible hoy. Consulta también [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md).

## Reglas de la saga

- Todos los combates son duelos **uno contra uno**. Si hay varios adversarios, se enfrentan de manera consecutiva y con una transición entre encuentros.
- El maestro acompaña, aconseja y concede una ventaja pasiva, pero no entra al campo de batalla.
- El avatar masculino comienza con **Mei Hayate** y el femenino con **Daichi Kazan**.
- La opción de cambiar de maestro aparece desde el principio en Personalización, bloqueada hasta completar la saga 1.
- Al terminar la saga, el maestro deja de estar ligado al tipo de cuerpo y puede elegirse libremente.
- Toda misión muestra viaje de salida, regreso a la aldea y pantalla de resultados, incluso si se falla o abandona.

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
- **Akumori, Capataz del Cuervo:** minijefe de la misión 2. Al ser vencido deja caer el mapa cifrado.
- **Raizen Kurogane, Señor de los Cuervos:** jefe de la misión 5 y antagonista final de la saga. El nombre es provisional.

## Flujo de misiones

### Prólogo — El nuevo combatiente

Creación de partida, afinidad, maestro asignado, mapa de la aldea y acceso al Cuartel General.

### Misión 1 — Tras las huellas del gato

Tutorial guiado en 11 pasos sobre el HUD real, con foco visual en vida, chakra, barra de velocidad, golpe, guardia, técnicas, preparación, sellos, enfriamiento y pausa. El tiempo se detiene durante las explicaciones y al elegir una acción. Se practican un golpe, una guardia y una técnica en el primer duelo; la primera secuencia manual de sellos no tiene límite de tiempo. Durante la guía, ambos combatientes conservan al menos 1 PV para poder completar la práctica. Si no hay técnicas equipadas, se presta una de la afinidad del jugador solo para ese combate. Se puede omitir en cualquier momento con el botón o Escape y continuar la misión. Después siguen los tres duelos consecutivos y el encuentro con Sayo desbloquea el Tablón.

La Biblioteca ofrece «Repetir tutorial guiado» desde el inicio, incluso antes de abrir el bestiario. El repaso usa el mismo campo de batalla y la misma guía; permite salir en cualquier paso y vuelve a la Biblioteca al terminar. No registra encuentros, recompensas, misiones ni cambios de equipo.

### Secundaria 1 — El silencio de Kagemori

Tutorial de exploración. El jugador investiga tres lugares y habla con Iori y Nami. Completarla desbloquea la misión principal 2.

### Misión 2 — Asalto al Desfiladero del Cuervo

1. Duelo contra un rastreador.
2. Investigación junto al maestro.
3. Duelo contra el teniente sin nombre.
4. Decisión persistente con ventajas y costes:
   - Interrogar y perdonar revela la entrada secreta y duplica las monedas del próximo encargo, pero permite que el teniente avise y refuerce a Akumori.
   - Eliminar impide que Akumori reciba refuerzos, pero pierde la entrada secreta, la bonificación económica y la ayuda futura del teniente.
5. Transición.
6. Duelo contra Akumori.
7. Akumori deja caer un **mapa cifrado**.

Completar esta misión activa «El médico errante». La elección libre de maestro y el bestiario de la Biblioteca todavía permanecen bloqueados; el tutorial sí está disponible.

### Secundaria 2 — El médico errante

El jugador busca al doctor **Haru Takamine** para descifrar el mapa. La misión tiene tres tramos y un mapa horizontal de nueve lugares conectados, con bifurcaciones y convergencias. Solo se puede avanzar a los nodos conectados a la posición actual; los caminos visibles y las opciones jugables comparten el mismo grafo. El recorrido elegido aparece en violeta y las siguientes opciones en verde. Las decisiones actualizan peligro, tiempo, pistas y recursos, pero convergen en el mismo encuentro narrativo:

Al encontrar a Haru, el médico agradece la visita y explica cómo deshacer la tinta cifrada mediante los sellos de las habilidades. Una transición abre un tablero de 6 × 6: intercambiar vecinos para reunir tres sellos iguales revela permanentemente las casillas de una imagen del mapa situada debajo. Hay caídas y cascadas; cuatro o más sellos crean un poder de fila o columna que se activa al intercambiarlo. No hay reloj ni límite de movimientos. Haru ofrece pistas y un tablero sin jugadas se reorganiza conservando fragmentos y poderes. El guardado v17 incorpora un campo opcional `doctorRoute.cipher` con tablero, poderes, casillas reveladas, movimientos y semilla. Solo tras revelar las 36 casillas se puede recibir el libro y completar el encargo; las misiones ya completadas en partidas anteriores conservan su estado.

1. **Camino elevado:** ruta segura y lenta. Sus diálogos enseñan a valorar la preparación por encima de la rapidez.
2. **Sendero del río:** investigación breve para identificar el cruce correcto. Equivocarse aumenta tiempo y peligro sin bloquear la misión.
3. **Bosque cerrado:** ruta de mayor riesgo y recursos. En la segunda fase activa un único duelo uno contra uno sin recompensa directa repetible. Reunir al menos dos recursos concede un suministro adicional para la misión 4.

Al encontrar al doctor:

- Haru descifra el mapa y localiza la guarida.
- Entrega un libro para llevar a la Biblioteca.
- El libro funciona como bestiario: comienza incompleto y añade información al enfrentarse a cada enemigo.
- El regreso a la aldea es obligatorio y la Biblioteca se convierte en el siguiente objetivo.
- Sayo recibe el libro, abre la Biblioteca y explica el registro de enemigos.
- Se desbloquea la siguiente misión principal.

### Regla implementada: consecuencias fijas y convergentes

Cada ruta usa resultados fijos por fase. El jugador puede repetir una ruta o alternarlas y no se generan 27 historias distintas: el historial de elecciones y sus cuatro métricas conserva la variedad, mientras que todas las combinaciones conducen a Haru. Esta base permite añadir azar controlado en una repetición futura sin reescribir la misión.

### Misión 3 — El umbral de los cuervos

El mapa conduce a dos accesos:

- Entrada principal, protegida por tres enemigos que se enfrentan uno por uno.
- Entrada secreta, revelada únicamente si el teniente fue interrogado y perdonado. Evita al guardia exterior, conserva dos duelos obligatorios y conduce al almacén que entrega 90 monedas adicionales al completar la misión.
- Antes de entrar, Sayo consulta las fichas identificadas de la Biblioteca y recomienda afinidades favorables sin revelar los campos aún desconocidos.

### Misión 4 — El corazón de la guarida

Tutorial de estados alterados, preparación mediante el bestiario y administración de vida y chakra entre tres duelos consecutivos. Entre duelos se elige entre descansar —consumiendo un suministro para recuperar vida, chakra y limpiar estados— o conservarlo y avanzar con una recuperación mínima. El maestro recuerda su ventaja pasiva y aconseja la decisión. Al final se elige entre liberar prisioneros o recuperar documentos; ambas rutas incluyen la revelación de que los Cuervos son una célula de una organización mayor y desbloquean al jefe, mientras los documentos amplían su ficha.

### Misión 5 — El jefe de los bandidos

Duelo final contra Raizen Kurogane. Manipula la velocidad, anuncia sus golpes más peligrosos, aplica estados alterados y cambia de patrón al perder la mitad de su vida. Si el teniente fue perdonado, aparece antes del combate, resta un 15 % de la vida inicial de Raizen y elimina su reducción de daño como agradecimiento. Si fue eliminado, Raizen comienza con toda su vida y una reducción de 3 puntos por impacto. Ambas rutas siguen siendo completables.

## Biblioteca y bestiario

La guía de combate está disponible en la Biblioteca desde el inicio. El libro del doctor desbloquea su bestiario. Cada ficha progresa así:

1. Primer encuentro: nombre, apariencia y afiliación.
2. Técnica observada: se registra el movimiento.
3. Debilidad descubierta: se añade la afinidad vulnerable.
4. Victoria: se completan estadísticas aproximadas y posibles recompensas.

Los jefes mantienen sus estadísticas selladas después de la primera victoria. Se revelan tras un segundo encuentro o al encontrar un documento relacionado.

Los datos incompletos deben mostrarse mediante campos desconocidos, no con información falsa.
