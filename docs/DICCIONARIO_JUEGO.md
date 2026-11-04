# Diccionario del juego

Referencia canónica para diálogos, interfaz y documentación. Usar el término oficial al escribir textos nuevos; las variantes solo facilitan la búsqueda. Los IDs técnicos y de partidas se conservan.

Fuente: [game-dictionary.js](../src/content/game-dictionary.js). La Biblioteca lee ese mismo catálogo. Regenerar este documento con `node scripts/generate-game-dictionary.mjs` después de editarlo.

Hay un único rango del jugador, de 1 a 3, que determina las afinidades disponibles. «Rango elemental» es una variante histórica del mismo concepto. El nivel del jugador y el nivel de técnica son progresiones distintas. Los rangos oficiales son Novicio (1), Experto (2) y Veterano (3).

## Progresión

### Saga

Arco de la historia principal que agrupa varias misiones. La saga 1, Futuro prometedor, es el tutorial.

### Misión principal

Encargo de la historia, disponible en el Cuartel General. Completarlo descubre la siguiente misión.

### Misión secundaria

Encargo opcional del Tablón de Misiones, incluidos contratos y pruebas de afinidad.

### Clase de misión

Categoría del encargo, como clase D o Especial. Es distinta del rango del jugador.

Variantes de consulta: rango de misión.

### Nivel del jugador

Progreso de experiencia, del nivel 1 al 60. Subir de nivel concede puntos de atributo y puntos de Resonancia.

Variantes de consulta: nivel de personaje.

### Rango del jugador

Hay tres rangos. Cada rango determina el número de afinidades disponibles: una, dos o tres. Los ascensos requieren el nivel y la prueba correspondientes.

Variantes de consulta: rango elemental, rango de combatiente.

### Novicio

Rango 1 del jugador. Comienza con una afinidad disponible.

Variantes de consulta: rango 1.

### Experto

Rango 2 del jugador. Permite dos afinidades y abre la Torre de Desafíos. Requiere nivel 15 y superar «El despertar de la segunda afinidad».

Variantes de consulta: rango 2.

### Veterano

Rango 3 del jugador. Permite tres afinidades. Requiere nivel 30, haber elegido la segunda afinidad y superar «La armonía de las tres afinidades».

Variantes de consulta: rango 3.

### Puntos de experiencia

PX que hacen avanzar el nivel del jugador. Los PX de afinidad se registran por separado.

Variantes de consulta: PX, XP.

### Puntos de atributo

Puntos invertidos en Vida, Fuerza, Velocidad, Chakra o Suerte desde el Dojo.

## Afinidades y técnicas

### PX de afinidad

Experiencia de cada afinidad que se exige para aprender determinadas técnicas.

### Afinidad

Elemento básico elegido por el jugador. Su orden modifica atributos y técnicas disponibles. Tener una plaza disponible no elige automáticamente su afinidad.

### Normal

Tipo sin afinidad elemental para blancos de entrenamiento y enemigos básicos. No tiene ventajas, debilidades, modificadores de atributos ni pasivas elementales. No se elige como afinidad del jugador ni se combina con elementos.

Variantes de consulta: neutro, sin afinidad.

### Afinidades básicas

Fuego, Agua, Tierra y Viento son las cuatro afinidades básicas.

Variantes de consulta: aire.

### Elemento compuesto

Elemento que combina afinidades básicas, como Vapor o Magma. No ocupa una afinidad básica adicional.

### Técnica

Habilidad aprendida y preparada en el Dojo. Las técnicas elementales pueden consumir chakra y requerir una secuencia de sellos.

Variantes de consulta: jutsu.

### Nivel de técnica

Grado de mejora de una técnica. Se escribe nivel de técnica para distinguirlo del rango del jugador.

Variantes de consulta: rango de técnica.

### Puntos de Resonancia

PR invertidos en el árbol de Resonancia para aprender y mejorar habilidades. Se obtienen dos al subir de nivel.

Variantes de consulta: PR, puntos de habilidad.

## Combate

### Vida

Reserva que disminuye al recibir daño. Los puntos de vida se abrevian PV.

Variantes de consulta: PV, HP, VID.

### Chakra

Recurso empleado al ejecutar técnicas. Sus puntos se abrevian CH.

Variantes de consulta: CH, CHK.

### Guardia

Acción que reduce el siguiente impacto y recupera chakra.

### Sellos manuales

Secuencia de símbolos que se completa con QWER / ASDF / ZXCV o con el ratón. Es distinta del sello equipado.

### Sello de equipo

Objeto equipable en la ranura de sello del Dojo. Es distinto de los símbolos usados para ejecutar técnicas.

### Enfriamiento

Espera necesaria antes de volver a utilizar una técnica.

### Estado alterado

Efecto temporal como quemadura, sangrado o aturdimiento.

### Duelo

Enfrentamiento uno contra uno. Una misión puede tener varios duelos consecutivos.

### Tablas de habilidades

La tabla elemental contiene tus técnicas preparadas; la física contiene arma, shuriken y taijutsu. La tecla 0 cambia entre ambas sin consumir una acción. Golpe veloz y Guardia permanecen en 1 y 6.

Variantes de consulta: ventana de habilidades, tabla física, tabla elemental.

### Fase de jefe

Cambio de patrón y atributos del mismo jefe durante un duelo, como la fase II al llegar a la mitad de vida. No inicia otro encuentro ni reinicia tu vida o tus enfriamientos.

Variantes de consulta: fase de enemigo, fase II.

## Misiones

### Fase de misión

Tramo de una misión. En una cadena de combates, cada fase presenta un rival distinto en un duelo uno contra uno. Es diferente de una fase de jefe.

## Lugares

### Cuartel General

Centro de la historia principal y las sagas. Ren abre su acceso en el prólogo.

Variantes de consulta: cuartel.

### Dojo

Lugar para preparar técnicas, atributos, afinidades, equipo, apariencia y maestro. Disponible desde el prólogo.

### Biblioteca

Conserva el diccionario, el tutorial de combate, la crónica y el bestiario. Se abre al regresar con el libro de Haru; Sayo activa el bestiario al recibirlo.

Variantes de consulta: archivo.

### Bestiario

Registro de enemigos que se completa mediante encuentros, técnicas observadas, debilidades, victorias y documentos.

### Tienda

Comercio de Hana para comprar y vender. Se abre al completar «Tras las huellas del gato».

### Gremio

Reúne Mi espacio y la preparación de clanes. Se abre al pasar a la saga 2.

Variantes de consulta: posada.

### Tablón de Misiones

Lugar de misiones secundarias, contratos y pruebas de afinidad. Se abre al pasar a la saga 2.

Variantes de consulta: tablón.

### Plaza de Eventos

Calendario de celebraciones, visitas y actividades temporales. Se abre al pasar a la saga 2. Cada actividad conserva sus propios requisitos.

### Arena de Combate

Lugar de exhibiciones locales y futuros duelos multijugador. Requiere llegar a la saga 3 y nivel superior a 15, es decir, nivel 16 o más.

Variantes de consulta: arena.

### Torre de Desafíos

Desafíos especiales. Se abre al alcanzar el rango 2 del jugador; cada desafío conserva su fecha de apertura.

Variantes de consulta: torre.
