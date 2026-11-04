const lesson = (id, title, text, view, selector, event, extra = {}) => ({ id, title, text, view, selector, event, ...extra });
export const SAGA_TUTORIAL_VERSION = 3;
export const SHARED_TUTORIAL_PRACTICES = ["enemy-encounters", "affinity-advantage", "enemy-phase", "level-up"];
export const SAGA_TUTORIAL = [
  { missionId: "m01", title: "Primer combate", unlocks: ["shop"], battle: "basics", before: [
    lesson("command", "Recibe tu primera misión", "Unos ladrones se llevaron un gato al Bosque del Este. Necesito que lo traigas de vuelta. Busca el encargo en Futuro prometedor; tu maestro te ayudará a prepararte.", "headquarters", '[data-saga="saga-1"]', { type: "saga" }),
    lesson("equipment", "Equipa tu kunai", "Te he dejado un kunai en el inventario. Colócalo en Arma antes de salir; así podrás usarlo para atacar en el bosque.", "dojo", '[data-gear-slot="weapon"]', { type: "gear", key: "weapon" }, { state: "gear", key: "weapon" }),
    lesson("throwable-equipment", "Equipa el shuriken", "Lleva también el shuriken. Colócalo en Arma arrojadiza, junto al kunai. No basta con guardarlo en la mochila: debes tenerlo preparado para lanzarlo.", "dojo", '[data-gear-slot="throwable"]', { type: "gear", key: "throwable" }, { state: "gear", key: "throwable" }),
    lesson("mentor", "Conoce a tu maestro", "Te acompañaré durante la misión. Consulta mi ficha para conocer cómo te ayuda mi enseñanza y vuelve conmigo cuando estés listo.", "dojo", '[data-open-master]', { type: "master" }),
    lesson("initial-elemental", "Prepara una técnica elemental", "Quiero que llevemos una de tus técnicas preparada. Elige una que ya conozcas y equípala; la practicaremos juntos en el bosque.", "dojo", '[data-dojo-tab="techniques"]', null, { state: "elemental" }),
    lesson("initial-kit", "Revisa el equipo para partir", "Nos falta preparar el arma o el shuriken. Revisa sus ranuras y, cuando los tengas, volveremos al Cuartel.", "dojo", '[data-dojo-tab="equipment"]', null, { state: "equipment" })
  ], practices: ["strike", "guard", "weapon", "throwable", "technique", ...SHARED_TUTORIAL_PRACTICES] },
  { missionId: "s01", title: "Preparación e investigación", before: [
    lesson("attribute", "Invierte un punto de atributo", "Has aprendido de tu primera victoria. Ven a Estadísticas y dedica un punto al atributo que prefieras. Fíjate en cómo cambia tu personaje.", "dojo", '[data-attribute]:not([disabled])', { type: "attribute" }, { state: "attribute" }),
    lesson("foundation", "Mejora Disciplina del cuerpo", "Vamos a fortalecer tu base. Busca Disciplina del cuerpo en Técnicas y mejórala con un punto de resonancia, o PR. Estos puntos sirven para aprender y mejorar habilidades.", "dojo", '[data-skill-select="physical_0"]', { type: "invest", key: "physical_0" }, { state: "investment", key: "physical_0" }),
    lesson("learn-punch", "Aprende Puño de hierro", "Con esa base ya puedo enseñarte Puño de hierro. Selecciónalo en la rama física y dedica un PR a aprenderlo.", "dojo", '[data-skill-select="physical_1"]', { type: "invest", key: "physical_1" }, { state: "investment", key: "physical_1" }),
    lesson("equip-punch", "Prepara un taijutsu", "Ya conoces Puño de hierro. Ahora prepáralo en T1 o T2 para poder usarlo. Recuerda que este esfuerzo se paga con vida, no con chakra.", "dojo", '[data-skill-select="physical_1"]', { type: "taijutsu" }, { state: "taijutsu" })
  ], practices: ["clue-cart", "clue-hall", "clue-well", "investigation"] },
  { missionId: "m02", title: "Recursos y decisiones", battle: "resources", before: [
    lesson("potion-ready", "Compra una poción de vida", "¿Vas al Desfiladero? Te recomiendo llevar una poción de vida. Cuesta 18 monedas y te permitirá curarte si te hieren.", "shop", '[data-shop-item="health_potion"]', null, { state: "item", key: "health_potion", practice: "potion" }),
    lesson("punch-ready", "Comprueba tu taijutsu", "Equipa Puño de hierro en T1 o T2. Se practicará con su coste real de vida.", "dojo", '[data-taijutsu-choose]', null, { state: "taijutsu", practice: "taijutsu" })
  ], practices: ["potion", "taijutsu", "lieutenant-choice", "relic"] },
  { missionId: "s02", title: "Rutas y descifrado", unlocks: ["archive"], before: [], practices: ["route-1", "route-2", "route-3", "cipher", "book"] },
  { missionId: "m03", title: "Información y táctica", battle: "tactics", before: [
    lesson("dictionary", "Busca en el Diccionario", "Guardo aquí los términos que usamos en la aldea. Busca Novicio, Experto o Veterano en el Diccionario; te ayudarán a distinguir el rango del nivel.", "archive", '[data-dictionary-search]', { type: "dictionary" }),
    lesson("bestiary", "Consulta las fichas", "Ven, echemos un vistazo al Bestiario. Sus páginas se completan con lo que observas en los duelos; lo que aún no sabes permanece sin revelar.", "archive", '[data-archive-tab="bestiary"]', { type: "bestiary" }),
    lesson("affinity-cycle", "Elige una ventaja elemental", "Veamos qué has aprendido: ¿contra qué elemento tiene ventaja el tuyo? Recuerda el ciclo: Fuego, Viento, Tierra, Agua y de nuevo Fuego.", "archive", '[data-archive-tab="bestiary"]', { type: "affinity-answer" }, { quiz: "affinity" }),
    lesson("element-ready", "Prepara una técnica elemental", "Vuelve al Dojo y equipa una técnica aprendida en una ranura elemental. Selecciona su hexágono y pulsa Equipar. Si ya llevas una, estás listo.", "dojo", '[data-dojo-tab="techniques"]', null, { state: "elemental", practice: "elemental" })
  ], practices: ["entry-choice", "elemental", "guard-tactics"] },
  { missionId: "m04", title: "Estados y suministros", battle: "statuses", before: [
    lesson("buy-tonic", "Prepara un purificador", "El humo de esas galerías puede hacerte daño. Lleva un tónico purificador: te ayudará a limpiar una quemadura u otro estado perjudicial.", "shop", '[data-shop-item="purifying_tonic"]', null, { state: "item", key: "purifying_tonic", practice: "cleanse" })
  ], practices: ["cleanse", "rest", "conserve", "discovery"] },
  { missionId: "m05", title: "Evaluación de la formación", battle: "final", unlocks: ["inn", "missions", "event"], before: [
    lesson("chronicle", "Revisa las consecuencias", "En Biblioteca → Crónica repasa el acceso elegido y tus hallazgos. El destino del teniente modificará el enfrentamiento final.", "archive", '[data-archive-tab="chronicle"]', { type: "chronicle" }),
    lesson("final-loadout", "Prepara tu evaluación", "Comprueba tu técnica elemental, taijutsu y equipo. La evaluación exige ejecutar una técnica y una Guardia frente a Raizen.", "dojo", '[data-dojo-tab="equipment"]', null, { state: "combat-ready", practice: "final-guard" })
  ], practices: ["final-elemental", "final-guard", "boss-phase", "graduation"] }
];
export const TUTORIAL_LESSON_IDS = [...SAGA_TUTORIAL.flatMap(course => [...course.before.map(step => step.id), ...course.practices]), "remove-technique", "equip-technique", "buy-potions", "sell-potion", "aid-buy-potions", "aid-potion-ready", "aid-buy-tonic"];
export const FIELD_LESSONS = {
  kagemori: [
    { id: "clue-cart", title: "Investiga la carreta", text: "Mira esa carreta. Los saqueadores dejaron algo atrás; acércate y examínala para que podamos seguir su rastro.", selector: '[data-clue="cart"]' },
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
