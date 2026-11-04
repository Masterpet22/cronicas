import { PLAYER_RANK_LABELS } from "../player-rank.js";
// Fuente canónica del lenguaje visible. Las variantes son referencias de búsqueda,
// no nombres alternativos para nuevos textos. No sustituir IDs de guardado.
const entry = (id, term, category, definition, aliases = []) => Object.freeze({ id, term, category, definition, aliases: Object.freeze(aliases) });
export const GAME_DICTIONARY = Object.freeze([
  entry("saga", "Saga", "Progresión", "Arco de la historia principal que agrupa varias misiones. La saga 1, Futuro prometedor, es el tutorial."),
  entry("mission", "Misión principal", "Progresión", "Encargo de la historia, disponible en el Cuartel General. Completarlo descubre la siguiente misión."),
  entry("secondary", "Misión secundaria", "Progresión", "Encargo opcional del Tablón de Misiones, incluidos contratos y pruebas de afinidad."),
  entry("mission-class", "Clase de misión", "Progresión", "Categoría del encargo, como clase D o Especial. Es distinta del rango del jugador.", ["rango de misión"]),
  entry("player-level", "Nivel del jugador", "Progresión", "Progreso de experiencia, del nivel 1 al 60. Subir de nivel concede puntos de atributo y puntos de Resonancia.", ["nivel de personaje"]),
  entry("player-rank", "Rango del jugador", "Progresión", "Hay tres rangos. Cada rango determina el número de afinidades disponibles: una, dos o tres. Los ascensos requieren el nivel y la prueba correspondientes.", ["rango elemental", "rango de combatiente"]),
  entry("rank-1", PLAYER_RANK_LABELS[1], "Progresión", "Rango 1 del jugador. Comienza con una afinidad disponible.", ["rango 1"]),
  entry("rank-2", PLAYER_RANK_LABELS[2], "Progresión", "Rango 2 del jugador. Permite dos afinidades y abre la Torre de Desafíos. Requiere nivel 15 y superar «El despertar de la segunda afinidad».", ["rango 2"]),
  entry("rank-3", PLAYER_RANK_LABELS[3], "Progresión", "Rango 3 del jugador. Permite tres afinidades. Requiere nivel 30, haber elegido la segunda afinidad y superar «La armonía de las tres afinidades».", ["rango 3"]),
  entry("experience", "Puntos de experiencia", "Progresión", "PX que hacen avanzar el nivel del jugador. Los PX de afinidad se registran por separado.", ["PX", "XP"]),
  entry("affinity-xp", "PX de afinidad", "Afinidades y técnicas", "Experiencia de cada afinidad que se exige para aprender determinadas técnicas."),
  entry("affinity", "Afinidad", "Afinidades y técnicas", "Elemento básico elegido por el jugador. Su orden modifica atributos y técnicas disponibles. Tener una plaza disponible no elige automáticamente su afinidad."),
  entry("normal-affinity", "Normal", "Afinidades y técnicas", "Tipo sin afinidad elemental para blancos de entrenamiento y enemigos básicos. No tiene ventajas, debilidades, modificadores de atributos ni pasivas elementales. No se elige como afinidad del jugador ni se combina con elementos.", ["neutro", "sin afinidad"]),
  entry("basic-elements", "Afinidades básicas", "Afinidades y técnicas", "Fuego, Agua, Tierra y Viento son las cuatro afinidades básicas.", ["aire"]),
  entry("composite", "Elemento compuesto", "Afinidades y técnicas", "Elemento que combina afinidades básicas, como Vapor o Magma. No ocupa una afinidad básica adicional."),
  entry("technique", "Técnica", "Afinidades y técnicas", "Habilidad aprendida y preparada en el Dojo. Las técnicas elementales pueden consumir chakra y requerir una secuencia de sellos.", ["jutsu"]),
  entry("technique-level", "Nivel de técnica", "Afinidades y técnicas", "Grado de mejora de una técnica. Se escribe nivel de técnica para distinguirlo del rango del jugador.", ["rango de técnica"]),
  entry("resonance", "Puntos de Resonancia", "Afinidades y técnicas", "PR invertidos en el árbol de Resonancia para aprender y mejorar habilidades. Se obtienen dos al subir de nivel.", ["PR", "puntos de habilidad"]),
  entry("attribute-points", "Puntos de atributo", "Progresión", "Puntos invertidos en Vida, Fuerza, Velocidad, Chakra o Suerte desde el Dojo."),
  entry("health", "Vida", "Combate", "Reserva que disminuye al recibir daño. Los puntos de vida se abrevian PV.", ["PV", "HP", "VID"]),
  entry("chakra", "Chakra", "Combate", "Recurso empleado al ejecutar técnicas. Sus puntos se abrevian CH.", ["CH", "CHK"]),
  entry("guard", "Guardia", "Combate", "Acción que reduce el siguiente impacto y recupera chakra."),
  entry("seals", "Sellos manuales", "Combate", "Secuencia de símbolos que se completa con QWER / ASDF / ZXCV o con el ratón. Es distinta del sello equipado."),
  entry("equipment-seal", "Sello de equipo", "Combate", "Objeto equipable en la ranura de sello del Dojo. Es distinto de los símbolos usados para ejecutar técnicas."),
  entry("cooldown", "Enfriamiento", "Combate", "Espera necesaria antes de volver a utilizar una técnica."),
  entry("status", "Estado alterado", "Combate", "Efecto temporal como quemadura, sangrado o aturdimiento."),
  entry("duel", "Duelo", "Combate", "Enfrentamiento uno contra uno. Una misión puede tener varios duelos consecutivos."),
  entry("skill-tables", "Tablas de habilidades", "Combate", "La tabla elemental contiene tus técnicas preparadas; la física contiene arma, shuriken y taijutsu. La tecla 0 cambia entre ambas sin consumir una acción. Golpe veloz y Guardia permanecen en 1 y 6.", ["ventana de habilidades", "tabla física", "tabla elemental"]),
  entry("mission-phase", "Fase de misión", "Misiones", "Tramo de una misión. En una cadena de combates, cada fase presenta un rival distinto en un duelo uno contra uno. Es diferente de una fase de jefe."),
  entry("boss-phase", "Fase de jefe", "Combate", "Cambio de patrón y atributos del mismo jefe durante un duelo, como la fase II al llegar a la mitad de vida. No inicia otro encuentro ni reinicia tu vida o tus enfriamientos.", ["fase de enemigo", "fase II"]),
  entry("headquarters", "Cuartel General", "Lugares", "Centro de la historia principal y las sagas. Ren abre su acceso en el prólogo.", ["cuartel"]),
  entry("dojo", "Dojo", "Lugares", "Lugar para preparar técnicas, atributos, afinidades, equipo, apariencia y maestro. Disponible desde el prólogo."),
  entry("archive", "Biblioteca", "Lugares", "Conserva el diccionario, el tutorial de combate, la crónica y el bestiario. Se abre al regresar con el libro de Haru; Sayo activa el bestiario al recibirlo.", ["archivo"]),
  entry("bestiary", "Bestiario", "Lugares", "Registro de enemigos que se completa mediante encuentros, técnicas observadas, debilidades, victorias y documentos."),
  entry("shop", "Tienda", "Lugares", "Comercio de Hana para comprar y vender. Se abre al completar «Tras las huellas del gato»."),
  entry("inn", "Gremio", "Lugares", "Reúne Mi espacio y la preparación de clanes. Se abre al pasar a la saga 2.", ["posada"]),
  entry("missions", "Tablón de Misiones", "Lugares", "Lugar de misiones secundarias, contratos y pruebas de afinidad. Se abre al pasar a la saga 2.", ["tablón"]),
  entry("event", "Plaza de Eventos", "Lugares", "Calendario de celebraciones, visitas y actividades temporales. Se abre al pasar a la saga 2. Cada actividad conserva sus propios requisitos."),
  entry("arena", "Arena de Combate", "Lugares", "Lugar de exhibiciones locales y futuros duelos multijugador. Requiere llegar a la saga 3 y nivel superior a 15, es decir, nivel 16 o más.", ["arena"]),
  entry("tower", "Torre de Desafíos", "Lugares", "Desafíos especiales. Se abre al alcanzar el rango 2 del jugador; cada desafío conserva su fecha de apertura.", ["torre"])
]);

export const GAME_TERMS = Object.freeze(Object.fromEntries(GAME_DICTIONARY.map(({ id, term }) => [id, term])));
export function searchGameDictionary(query = "") {
  const simplify = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
  const needle = simplify(query);
  return GAME_DICTIONARY.filter(item => simplify([item.term, item.category, item.definition, ...item.aliases].join(" ")).includes(needle));
}
