const lesson = (id, title, text, view, selector, event, extra = {}) => ({ id, title, text, view, selector, event, ...extra });
export const SAGA_TUTORIAL_VERSION = 3;
export const SHARED_TUTORIAL_PRACTICES = ["enemy-encounters", "affinity-advantage", "enemy-phase", "level-up"];
export const SAGA_TUTORIAL = [
  { missionId: "m01", title: "Primer combate", unlocks: ["shop"], battle: "basics", before: [
    lesson("command", "Recibe tu primera misión", "Tu primer encargo es recuperar un gato robado en el Bosque del Este. Abre Futuro prometedor para localizar la misión; antes de salir prepararás tu equipo con tu maestro.", "headquarters", '[data-saga="saga-1"]', { type: "saga" }),
    lesson("equipment", "Equipa tu kunai", "El kunai está en tu inventario, pero aún no lo llevas equipado. Abre Arma y elige Kunai. Así habilitas Golpe de arma en combate.", "dojo", '[data-gear-slot="weapon"]', { type: "gear", key: "weapon" }, { state: "gear", key: "weapon" }),
    lesson("throwable-equipment", "Equipa el shuriken", "Ahora abre Arma arrojadiza y elige Shuriken. Tener un objeto en el inventario no basta: debe ocupar su ranura para poder usarlo.", "dojo", '[data-gear-slot="throwable"]', { type: "gear", key: "throwable" }, { state: "gear", key: "throwable" }),
    lesson("mentor", "Conoce a tu maestro", "Abre la ficha de tu maestro, lee su ventaja y cierra la ficha para continuar. Te acompañará durante la misión y te aconsejará desde fuera del duelo.", "dojo", '[data-open-master]', { type: "master" }),
    lesson("initial-elemental", "Prepara una técnica elemental", "Selecciona una técnica aprendida y pulsa Equipar. Necesitas una técnica preparada para practicarla en el bosque.", "dojo", '[data-dojo-tab="techniques"]', null, { state: "elemental" }),
    lesson("initial-kit", "Revisa el equipo para partir", "Debes llevar arma y shuriken equipados para practicar ambos ataques. Comprueba sus ranuras antes de volver al Cuartel.", "dojo", '[data-dojo-tab="equipment"]', null, { state: "equipment" })
  ], practices: ["strike", "guard", "weapon", "throwable", "technique", "pause", ...SHARED_TUTORIAL_PRACTICES] },
  { missionId: "s01", title: "Preparación e investigación", before: [
    lesson("attribute", "Invierte un punto de atributo", "La primera victoria te concede puntos. En Estadísticas añade uno a Vida, Fuerza, Velocidad, Chakra o Suerte y observa el cambio.", "dojo", '[data-attribute]:not([disabled])', { type: "attribute" }, { state: "attribute" }),
    lesson("foundation", "Mejora Disciplina del cuerpo", "En Técnicas selecciona Disciplina del cuerpo e invierte 1 PR. Los PR se obtienen al subir de nivel y son distintos de los puntos de atributo.", "dojo", '[data-skill-select="physical_0"]', { type: "invest", key: "physical_0" }, { state: "investment", key: "physical_0" }),
    lesson("learn-punch", "Aprende Puño de hierro", "Selecciona Puño de hierro en la rama física y compra su primer nivel con 1 PR. Requiere Disciplina del cuerpo a nivel 2.", "dojo", '[data-skill-select="physical_1"]', { type: "invest", key: "physical_1" }, { state: "investment", key: "physical_1" }),
    lesson("equip-punch", "Prepara un taijutsu", "Selecciona Puño de hierro y equípalo en T1 o T2. Aprender una técnica no la prepara automáticamente. El taijutsu consume PV.", "dojo", '[data-skill-select="physical_1"]', { type: "taijutsu" }, { state: "taijutsu" })
  ], practices: ["field-pause", "clue-cart", "clue-hall", "clue-well", "investigation"] },
  { missionId: "m02", title: "Recursos y decisiones", battle: "resources", before: [
    lesson("potion-ready", "Compra una poción de vida", "En el Desfiladero aprenderás a curarte. La Tienda de Hana abrió tras rescatar al gato: compra 1 poción de vida por 18 monedas. Si ya tienes una, puedes continuar.", "shop", '[data-shop-item="health_potion"]', null, { state: "item", key: "health_potion", practice: "potion" }),
    lesson("punch-ready", "Comprueba tu taijutsu", "Equipa Puño de hierro en T1 o T2. Se practicará con su coste real de vida.", "dojo", '[data-taijutsu-choose]', null, { state: "taijutsu", practice: "taijutsu" })
  ], practices: ["potion", "taijutsu", "lieutenant-choice", "relic"] },
  { missionId: "s02", title: "Rutas y descifrado", unlocks: ["archive"], before: [], practices: ["route-1", "route-2", "route-3", "cipher", "book"] },
  { missionId: "m03", title: "Información y táctica", battle: "tactics", before: [
    lesson("dictionary", "Busca en el Diccionario", "En Biblioteca → Diccionario busca Novicio, Experto o Veterano. El rango determina tus afinidades; el nivel del jugador es otra progresión.", "archive", '[data-dictionary-search]', { type: "dictionary" }),
    lesson("bestiary", "Consulta las fichas", "Abre Bestiario. Las técnicas y debilidades desconocidas no se revelan por adelantado. Normal no tiene debilidad elemental.", "archive", '[data-archive-tab="bestiary"]', { type: "bestiary" }),
    lesson("affinity-cycle", "Elige una ventaja elemental", "Relaciona tu afinidad principal con el rival al que supera. Fuego vence a Viento; Viento a Tierra; Tierra a Agua; Agua a Fuego.", "archive", '[data-archive-tab="bestiary"]', { type: "affinity-answer" }, { quiz: "affinity" }),
    lesson("element-ready", "Prepara una técnica elemental", "Vuelve al Dojo y equipa una técnica aprendida en una ranura elemental. Selecciona su hexágono y pulsa Equipar. Si ya llevas una, estás listo.", "dojo", '[data-dojo-tab="techniques"]', null, { state: "elemental", practice: "elemental" })
  ], practices: ["entry-choice", "elemental", "guard-tactics"] },
  { missionId: "m04", title: "Estados y suministros", battle: "statuses", before: [
    lesson("buy-tonic", "Prepara un purificador", "Compra un tónico purificador. Elimina estados negativos y Empapado; solo se consume cuando tiene efecto y usarlo gasta el turno.", "shop", '[data-shop-item="purifying_tonic"]', null, { state: "item", key: "purifying_tonic", practice: "cleanse" })
  ], practices: ["cleanse", "rest", "conserve", "discovery"] },
  { missionId: "m05", title: "Evaluación de la formación", battle: "final", unlocks: ["inn", "missions", "event"], before: [
    lesson("chronicle", "Revisa las consecuencias", "En Biblioteca → Crónica repasa el acceso elegido y tus hallazgos. El destino del teniente modificará el enfrentamiento final.", "archive", '[data-archive-tab="chronicle"]', { type: "chronicle" }),
    lesson("final-loadout", "Prepara tu evaluación", "Comprueba tu técnica elemental, taijutsu y equipo. La evaluación exige ejecutar una técnica y una Guardia frente a Raizen.", "dojo", '[data-dojo-tab="equipment"]', null, { state: "combat-ready", practice: "final-guard" })
  ], practices: ["final-elemental", "final-guard", "boss-phase", "graduation"] }
];
export const TUTORIAL_LESSON_IDS = [...SAGA_TUTORIAL.flatMap(course => [...course.before.map(step => step.id), ...course.practices]), "remove-technique", "equip-technique", "buy-potions", "sell-potion", "aid-buy-potions", "aid-potion-ready", "aid-buy-tonic"];
export const FIELD_LESSONS = {
  kagemori: [
    { id: "field-pause", title: "Aprende a pausar", text: "Pulsa Pausa y después Reanudar. También puedes abrir y cerrar con Escape. Abandonar pide confirmación y descarta recompensas provisionales.", selector: "[data-mission-pause]" },
    { id: "clue-cart", title: "Investiga la carreta", text: "Selecciona la carreta y lee la pista. El contador registra hallazgos reales; puedes investigar con ratón, Tab y Enter.", selector: '[data-clue="cart"]' },
    { id: "clue-hall", title: "Relaciona el polvo gris", text: "Investiga la casa comunal. Observa qué objeto permite relacionar a los saqueadores con una cantera.", selector: '[data-clue="hall"]' },
    { id: "clue-well", title: "Reconstruye la salida", text: "Investiga el pozo y las huellas. Reunir las tres pistas abrirá la conclusión; confirma el informe para completar la misión.", selector: '[data-clue="well"]' }
  ],
  "doctor-route": [
    { id: "route-1", title: "Elige tu primer camino", text: "Solo puedes avanzar por caminos conectados. El elevado evita peligros; el río exige interpretar pistas; el bosque ofrece recursos a cambio de riesgo. No hay cuenta atrás.", selector: "[data-route]" },
    { id: "route-2", title: "Resuelve el segundo tramo", text: "Tu primera elección limita los siguientes caminos. En el río lee la pista y elige el cruce; si tomas el bosque en este tramo tendrás un duelo individual.", selector: "[data-route], [data-passage], [data-resume-route-combat]" },
    { id: "route-3", title: "Llega al campamento", text: "Completa el último camino conectado. Las métricas registran tus decisiones; dos recursos o más proporcionan un suministro adicional para las galerías.", selector: "[data-route], [data-passage]" },
    { id: "cipher", title: "Revela las 36 casillas", text: "Intercambia sellos vecinos y reúne tres iguales. Cuatro o más crean un poder de línea. No hay reloj ni límite de movimientos: usa las pistas de Haru y termina el mapa para recibir el libro.", selector: "[data-cipher-cell], [data-complete-doctor]" }
  ]
};
