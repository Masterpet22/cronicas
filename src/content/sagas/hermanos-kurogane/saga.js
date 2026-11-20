const mission = (number, title, location, encounters, extra = {}) => ({
  id: `k0${number}`, number: number + 7, sagaMissionNumber: number, category: "main", board: "headquarters", title, location,
  duration: "8–12 min", rank: "D", recommendedLevel: number + 5,
  rewardProfile: number === 5 ? "boss" : "hard", reward: { coins: 130 + number * 25 },
  arenaNumber: number, groupCombat: true, encounters,
  requirements: [{ type: "main-completed", id: number === 1 ? "m05" : `k0${number - 1}` },
    ...(number === 1 ? [{ type: "flag", id: "kuroganePrologueCompleted" }] : [])],
  dialogueId: `mission.k0${number}.briefing`,
  flow: [{ type: "dialogue" }, { type: "combat", id: `k0${number}-group` }],
  completionEffects: [], ...extra
});

export const KUROGANE_MISSIONS = [
  mission(1, "Huellas en el camino", "Camino comercial", ["kurogane_scout", "kurogane_raider"]),
  mission(2, "El campamento oculto", "Campamento del bosque", ["kurogane_scout", "kurogane_raider", "kurogane_sentry"]),
  mission(3, "La carga prohibida", "Paso de suministros", ["kurogane_raider", "kurogane_sentry", "kurogane_scout"], { protectObjective: { name: "Documentos de transporte", health: 100 } }),
  mission(4, "La sombra del hermano menor", "Refugio de ceniza", ["kurogane_tatsu", "kurogane_raider", "kurogane_scout"]),
  mission(5, "El juramento de los Kurogane", "Santuario antiguo", ["kurogane_scout", "kurogane_raider", "kurogane_sentry", "kurogane_renji", "kurogane_tatsu"], { waves: [3, 2], sagaFinal: true })
];

export const KUROGANE_SAGA = { id: "saga-2", number: 2, title: "Los hermanos Kurogane", subtitle: "Compañeros, grupos y una amenaza regional", missionIds: KUROGANE_MISSIONS.map(m => m.id) };

const line = (speaker, text) => ({ speaker, text });
export const KUROGANE_DIALOGUES = {
  "mission.k01.briefing": [line("ren", "La caída de Raizen no detuvo los robos. Renji y Tatsu Kurogane mueven suministros por el camino comercial. No conocemos su vínculo con Raizen: investigad los hechos."), line("ren", "Haruto Kazehara y Akari Mizunose son novicios de tu generación. Solo puedo autorizar un equipo de dos; elige quién te acompañará durante toda esta operación."), line("master", "Toca un rival para seleccionarlo, o usa Tab y Enter. Cada combatiente tiene su reloj; tu compañero actuará por su cuenta. La misión termina al derrotar a todo el grupo.")],
  "mission.k02.briefing": [line("ren", "La nota recuperada señala un campamento. Hay tres guardias simultáneos: priorizad objetivos y compartid la presión."), line("master", "Cambiar de objetivo no consume acción ni reinicia la vida, los estados o la preparación de nadie.")],
  "mission.k03.briefing": [line("ren", "Interceptad el cargamento robado. Un mensajero sitúa a Renji bajo las órdenes de Cuervo Negro. Los bandidos intentarán quemar los documentos de transporte."), line("master", "Protege la carga con Guardia: reduce también el siguiente ataque contra los documentos. Akari puede reforzarlos con su barrera. Si su integridad llega a cero, habrá que reintentar.")],
  "mission.k04.briefing": [line("ren", "Los documentos sitúan a Tatsu en un refugio de ceniza. Capturadlo e interrogadlo; combatirá junto a dos secuaces."), line("master", "No persigas al jefe sin mirar a sus acompañantes. Tu compañero también puede caer; si tú caes, la misión fracasa.")],
  "mission.k05.briefing": [line("ren", "La retirada de los hermanos conduce a un santuario. Superad a sus tres guardianes y capturad a Renji y Tatsu. Necesitamos información sobre Cuervo Negro."), line("master", "Con ambos hermanos en pie, Renji puede proteger a Tatsu y Tatsu responde cuando hieren gravemente a Renji. Decide a quién neutralizar primero.")]
};

export const KUROGANE_OUTCOMES = {
  k01: "Entre los suministros aparece una nota: el siguiente traslado saldrá de un campamento oculto. El equipo informa a Ren antes de continuar.",
  k02: "Los materiales no pertenecen a simples salteadores. Un registro menciona órdenes de un superior ajeno a la banda. Haruto y Akari comparan sus hallazgos en el Cuartel.",
  k03: "Recuperáis parte de los documentos; los primeros folios ya estaban quemados cuando llegasteis. Las órdenes confirman que los Kurogane trabajan para Cuervo Negro.",
  k04: "Tatsu: «¡Renji os estará esperando en el santuario…!» Una barrera de tierra corta el paso. Renji rescata a Tatsu y ambos escapan; el equipo asegura la zona y registra la ubicación.",
  k05: "Los hermanos quedan capturados y con vida. Renji acepta hablar: Cuervo Negro utilizó a la banda para preparar una operación regional; desconoce quién dirige la organización. «Nosotros solo éramos dos piezas reemplazables. El Cuervo Negro ya consiguió lo que buscaba»."
};

export const COMPANION_REACTIONS = {
  haruto: ["¡Intentad seguirnos el ritmo! Algún día dirigiré esta aldea.", "No pude abrirme paso solo. La próxima vez esperamos el uno por el otro.", "Casi me lanzo tras el mensajero. Los documentos importan más que lucirme.", "Me confié y les dejé una salida. No volveré a separar al equipo.", "Esta vez cubriré tu espalda. Capturémoslos juntos."],
  akari: ["Observaré cómo decides. La disciplina nos mantendrá con vida.", "Tu elección del objetivo abrió el paso. Cooperar cambia el resultado.", "No puedo vigilar todos los ángulos. Confiaré en que cubras el otro lado.", "No había previsto esa barrera. Tendremos que adaptar el plan.", "Voy contigo. A veces ayudar exige actuar antes de tener todas las respuestas."]
};
export const COMPANION_BRIEFINGS = {
  haruto: ["¡Verás de qué es capaz un Kazehara! No pienso quedarme atrás.", "Esta vez no me adelantaré sin avisarte. Veamos cómo se reparten los guardias.", "Si atacan los documentos, me pondré entre ellos y la carga.", "Tatsu no podrá con nosotros. Lo tenemos cerca… aunque no debemos separarnos.", "Primero observamos, después actuamos juntos. Yo cubriré tu espalda."],
  akari: ["Todavía no conozco tu forma de combatir. Empecemos por observar al grupo.", "Elegir juntos los objetivos nos ayudará contra tres rivales.", "Yo vigilaré la carga; confío en que cubras el otro flanco.", "Tenemos una ubicación, pero dejaré margen para lo que no podamos prever.", "No tenemos todas las respuestas. Aun así, sé que puedo contar contigo."]
};

export const KUROGANE_PREREQUISITE = "m05";
export const KUROGANE_FINALE = "k05";
export const GUILD_GIFT_NOTICE = "story:guild-gift-delivery";
export const GUILD_GIFT_DIALOGUE = [
  "Este lugar será tuyo. Quiero entregarte dos recuerdos de tu formación: un bonsái del aprendiz y una insignia de novicio.",
  "El bonsái te recordará que crecer exige paciencia. La insignia, el camino que ya has recorrido. Son tuyos: colócalos donde te sientas en casa. Yuna te enseñará a preparar la habitación."
];
export const COMPANION_PRESENTATION = [
  ["Haruto Kazehara", "¡Cuando mi nombre sea conocido en toda la aldea, podrás decir que luchaste a mi lado desde el principio! Mi clan siempre ha llevado los mensajes más lejos; yo quiero dirigir la aldea."],
  ["Akari Mizunose", "Si diriges así, destruirás medio pueblo. Soy del clan Mizunose: el poder sin disciplina no sirve de nada. Prefiero ser alguien en quien todos puedan confiar."],
  ["Ren Arashiro", "Solo puedo autorizar un equipo de dos. El compañero que elijas permanecerá a tu lado durante las cinco misiones."]
];
export const COMPANION_SELECTION_RESPONSE = {
  haruto: "¡Excelente! ¡Sabía que reconocerías el talento cuando lo vieras! ¡Vamos a detener a esos bandidos!",
  akari: "De acuerdo. Analizaré la situación antes de cada enfrentamiento. Procura no correr riesgos innecesarios."
};
