# Saga 1 — Futuro prometedor

Documento de diseño narrativo y tutorial. Esta especificación sustituye las ideas anteriores que otorgaban el acceso inmediato a la Biblioteca al terminar la misión 2.

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

Tutorial de vida, chakra, velocidad, sellos, guardia y técnicas elementales mediante tres duelos consecutivos. El encuentro posterior con Sayo desbloquea el Tablón.

### Secundaria 1 — El silencio de Kagemori

Tutorial de exploración. El jugador investiga tres lugares y habla con Iori y Nami. Completarla desbloquea la misión principal 2.

### Misión 2 — Asalto al Desfiladero del Cuervo

1. Duelo contra un rastreador.
2. Investigación junto al maestro.
3. Duelo contra el teniente sin nombre.
4. Decisión persistente: interrogar y perdonar, o eliminar.
5. Transición.
6. Duelo contra Akumori.
7. Akumori deja caer un **mapa cifrado**.

Completar esta misión activa «El médico errante» y habilita la elección libre de maestro en Personalización. La Biblioteca todavía permanece bloqueada.

### Secundaria 2 — El médico errante

El jugador busca al doctor **Haru Takamine** para descifrar el mapa. La misión tiene tres fases y en cada una se elige una de tres rutas. Los tres tipos de evento son:

1. **Consejo:** un diálogo ofrece una recomendación útil para la búsqueda o para un tutorial posterior.
2. **Peligro:** aparece un enemigo y se libra un único duelo uno contra uno.
3. **Camino despejado:** el personaje avanza sin interrupción.

Al encontrar al doctor:

- Haru descifra el mapa y localiza la guarida.
- Entrega un libro para llevar a la Biblioteca.
- El libro funciona como bestiario: comienza incompleto y añade información al enfrentarse a cada enemigo.
- Sayo recibe el libro, abre la Biblioteca y explica el registro de enemigos.
- Se desbloquea la siguiente misión principal.

### Decisión pendiente: rutas fijas o aleatorias

Todavía no se ha decidido cómo distribuir los tres eventos durante las tres fases.

- **Fijas:** permiten diseñar mejor el ritmo y garantizar que el jugador vea los tres tutoriales.
- **Aleatorias:** mejoran la repetición, pero pueden ocultar el combate o repetir demasiadas veces el mismo evento.
- **Recomendación provisional:** primera partida con distribución fija —consejo, combate, avance— y repeticiones posteriores aleatorias sin repetir el mismo evento dos fases consecutivas.

La implementación jugable de esta misión queda detenida en este punto hasta decidir la regla. Sus datos, desbloqueo y tarjeta del Tablón ya pueden existir sin escoger una modalidad.

### Misión 3 — El umbral de los cuervos

El mapa conduce a dos accesos:

- Entrada principal, protegida por enemigos que se enfrentan uno por uno.
- Entrada secreta, revelada únicamente si el teniente fue interrogado y perdonado. Conduce al almacén que entrega la bonificación de monedas.

### Misión 4 — El corazón de la guarida

Tutorial de estados alterados, preparación mediante el bestiario y administración de vida y chakra entre duelos consecutivos.

### Misión 5 — El Señor de los Cuervos

Duelo final contra Raizen Kurogane. Si el teniente fue perdonado, aparece antes del combate, hiere a Raizen y elimina parte de su ventaja inicial como agradecimiento. Si fue eliminado, Raizen comienza en plena fuerza. Ambas rutas deben seguir siendo completables.

## Biblioteca y bestiario

El libro del doctor es el objeto que desbloquea la Biblioteca. Cada ficha progresa así:

1. Primer encuentro: nombre y apariencia.
2. Técnica observada: se registra el movimiento.
3. Debilidad descubierta: se añade la afinidad vulnerable.
4. Victoria: se completan estadísticas aproximadas y posibles recompensas.

Los datos incompletos deben mostrarse mediante campos desconocidos, no con información falsa.
