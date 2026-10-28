import { requirementMet } from "./mission-system.js?v=0.66.0";
import { MISSION_DIALOGUES } from "./content/index.js";

export const DEFAULT_LOCALE = "es";

const es = {
  "npc.ren.intro": [
    { speaker: "ren", text: "Soy Ren Arashiro. Mientras portes el sello de esta aldea, ninguna misión será solamente tuya." },
    { speaker: "ren", text: "El Cuartel registra tu rango, tus victorias y las amenazas que todavía permanecen abiertas." }
  ],
  "npc.ren.guide": [
    { speaker: "ren", text: "Tu nivel aumenta con experiencia y cada ascenso concede puntos de atributo." },
    { speaker: "ren", text: "Las siete misiones principales se desbloquean en orden a medida que investigas a los Bandidos del Cuervo." },
    { speaker: "ren", text: "Antes de partir, revisa el Dojo y prepara las técnicas que permita tu nivel." }
  ],
  "npc.kureha.intro": [
    { speaker: "kureha", text: "Me llaman Kureha Tsukikage. La Torre no mide fuerza: revela cuánto tardas en perder el control." },
    { speaker: "kureha", text: "Sus nueve pisos abrirán cuando la campaña principal haya templado tus fundamentos." }
  ],
  "npc.kureha.guide": [
    { speaker: "kureha", text: "La Torre será una cadena de combates sin descanso completo entre pisos." },
    { speaker: "kureha", text: "Cada nivel cambiará una regla: afinidades, recuperación, velocidad o estados alterados." },
    { speaker: "kureha", text: "Todavía está en preparación; vuelve cuando el sello de acceso esté activo." }
  ],
  "npc.sayo.intro": [
    { speaker: "sayo", text: "Soy Sayo Kisaragi. Aquí una misión no termina al cobrar la recompensa: se convierte en memoria." },
    { speaker: "sayo", text: "Puedes repetir el tutorial de combate aquí cuando quieras. El bestiario se abrirá cuando me entregues el libro de Haru." }
  ],
  "npc.sayo.guide": [
    { speaker: "sayo", text: "Los registros marcados con una señal verde ya fueron completados y puedes consultarlos en el Cuartel General." },
    { speaker: "sayo", text: "La primera crónica reúne siete misiones principales conectadas en el Cuartel General." },
    { speaker: "sayo", text: "Cuando derrotes a Raizen, el desenlace de Futuro prometedor quedará inscrito aquí." }
  ],
  "npc.daichi.intro": [
    { speaker: "daichi", text: "Daichi Kazan. No distribuyas atributos para corregir una derrota; hazlo para construir una estrategia." },
    { speaker: "daichi", text: "Vida y Chakra aumentan tus reservas. Fuerza eleva el daño, Velocidad acelera tu turno y Suerte mejora la evasión y los golpes críticos." }
  ],
  "npc.daichi.guide": [
    { speaker: "daichi", text: "Tu Velocidad y la velocidad de cada acción deciden juntos el orden del turno." },
    { speaker: "daichi", text: "Guardia reduce el siguiente impacto a la mitad y recupera chakra." },
    { speaker: "daichi", text: "Una técnica poderosa que nunca acierta vale menos que un ataque preparado." }
  ],
  "npc.mei.intro": [
    { speaker: "mei", text: "Soy Mei Hayate. Yo me encargo de que salgas del Dojo con un equipo que realmente puedas usar." },
    { speaker: "mei", text: "Comienzas con dos ranuras de jutsu. Los niveles 5 y 8 abrirán una ranura adicional." }
  ],
  "npc.mei.guide": [
    { speaker: "mei", text: "Durante un jutsu manual, completa la secuencia con QWER, ASDF y ZXCV, o pulsa los sellos en pantalla." },
    { speaker: "mei", text: "Una secuencia perfecta mejora el daño; los errores lo reducen. Puedes desactivar los sellos manuales arriba del juego." },
    { speaker: "mei", text: "Fuego quema, Viento abre heridas y Relámpago puede aturdir." }
  ],
  "npc.goro.intro": [
    { speaker: "goro", text: "¡Goro Tetsugan! Aquí los errores no cuestan una campaña; cuestan orgullo." },
    { speaker: "goro", text: "La Arena servirá para practicar rotaciones, medir daño y probar equipos sin alterar tu historia." }
  ],
  "npc.goro.guide": [
    { speaker: "goro", text: "Compara la afinidad principal de ambos combatientes antes de gastar chakra." },
    { speaker: "goro", text: "Los enfriamientos impiden repetir la misma técnica continuamente: prepara una segunda opción." },
    { speaker: "goro", text: "La práctica completa llegará en una fase posterior; el recinto ya está reservado." }
  ],
  "npc.hana.intro": [
    { speaker: "hana", text: "Hana Kogane, a tu servicio. Una bolsa llena no gana batallas, pero una compra inteligente sí puede hacerlo." },
    { speaker: "hana", text: "Aquí se venderán herramientas, consumibles y mejoras usando las monedas de las misiones." }
  ],
  "npc.hana.guide": [
    { speaker: "hana", text: "Las monedas se obtienen al vencer enemigos y al completar una misión por primera vez." },
    { speaker: "hana", text: "Armas, protectores y accesorios modifican estadísticas diferentes; compara el efecto antes del precio." },
    { speaker: "hana", text: "El inventario comercial todavía está en preparación." }
  ],
  "npc.yuna.intro": [
    { speaker: "yuna", text: "Bienvenido. Soy Yuna Ametsuki. Incluso un ninja necesita un lugar donde bajar la guardia." },
    { speaker: "yuna", text: "El Gremio reunirá conversaciones con aliados y escenas que ocurren entre misiones." }
  ],
  "npc.yuna.guide": [
    { speaker: "yuna", text: "Tu progreso se guarda automáticamente en este navegador." },
    { speaker: "yuna", text: "Regresar a la aldea después de un combate permite cambiar equipo y técnicas sin perder avances." },
    { speaker: "yuna", text: "Las bonificaciones de descanso y escenas de aliados se añadirán más adelante." }
  ],
  "npc.riku.intro": [
    { speaker: "riku", text: "Riku Senda, explorador de rutas. Yo convierto rumores en contratos que puedas sobrevivir." },
    { speaker: "riku", text: "Cada ficha indica encuentros, duración estimada, experiencia y monedas." }
  ],
  "npc.riku.guide": [
    { speaker: "riku", text: "Las misiones se abren según requisitos explícitos; el Cuartel contiene la historia y este Tablón contiene encargos." },
    { speaker: "riku", text: "REPETIR permite volver a una misión superada, pero la recompensa principal solo se entrega una vez." },
    { speaker: "riku", text: "El Dojo te permite ajustar técnicas y equipo antes de partir." }
  ],
  "npc.nao.intro": [
    { speaker: "nao", text: "¡Nao Matsuri abre la plaza! Hoy está tranquila; mañana podría albergar un torneo o un mercader errante." },
    { speaker: "nao", text: "Este escenario está reservado para actividades temporales que no alteren la campaña principal." }
  ],
  "npc.nao.guide": [
    { speaker: "nao", text: "Los eventos futuros tendrán duración y recompensas claramente indicadas." },
    { speaker: "nao", text: "Nunca necesitarás participar en ellos para terminar la historia principal." },
    { speaker: "nao", text: "Por ahora, considera la plaza un adelanto del contenido posterior." }
  ],
  "npc.iori.intro": [
    { speaker: "iori", text: "Llegaste desde la Aldea del Horizonte... Soy Iori. Los bandidos atacaron al caer la noche y se llevaron cuanto pudieron cargar." },
    { speaker: "iori", text: "La plaza conserva sus huellas. Examina los lugares que tocaron antes de marcharse." }
  ],
  "npc.iori.guide": [
    { speaker: "iori", text: "La carreta pertenecía al molino. Mira qué dejaron entre las tablas." },
    { speaker: "iori", text: "Nami vio más que cualquiera de nosotros; habla con ella cuando hayas reunido las pistas." },
    { speaker: "iori", text: "El fuego comenzó en la casa comunal, pero los saqueadores ya tenían preparada su retirada." }
  ],
  "npc.nami.intro": [
    { speaker: "nami", text: "Soy Nami. Intenté seguirlos desde el bosque, pero se separaron para ocultar el rastro." },
    { speaker: "nami", text: "Si reconstruimos por dónde cruzaron la aldea, podré decirte hacia qué paso se dirigieron." }
  ],
  "npc.nami.guide": [
    { speaker: "nami", text: "Las pisadas profundas son de quienes cargaban los cofres." },
    { speaker: "nami", text: "El barro del pozo no pertenece a este valle; viene de las canteras del norte." },
    { speaker: "nami", text: "La puerta norte conduce al Desfiladero del Cuervo, aunque el camino parece terminar en una cascada." }
  ]
};

export const DIALOGUE_CATALOGS = Object.freeze({ es: Object.freeze({ ...es, ...MISSION_DIALOGUES }) });
export const DIALOGUE_PLACEMENTS = Object.freeze(Object.fromEntries(Object.keys({ ...es, ...MISSION_DIALOGUES }).map((id) => {
  const [domain, owner, context] = id.split(".");
  return [id, Object.freeze({
    surface: domain === "mission" ? (context === "briefing" ? "mission-briefing" : "mission-scene") : `location-${context}`,
    owner: domain === "mission" && context !== "briefing" ? `${owner}.${context}` : owner
  })];
})));

function interpolate(text, variables) {
  return text.replace(/\{([a-z0-9_]+)\}/gi, (_, key) => String(variables[key] ?? `{${key}}`));
}

export function getDialogue(id, { locale = DEFAULT_LOCALE, variables = {}, save = null, placement = null } = {}) {
  const catalog = DIALOGUE_CATALOGS[locale] || DIALOGUE_CATALOGS[DEFAULT_LOCALE];
  const fallback = DIALOGUE_CATALOGS[DEFAULT_LOCALE][id] || [];
  const expectedPlacement = DIALOGUE_PLACEMENTS[id];
  if (placement && (!expectedPlacement || placement.surface !== expectedPlacement.surface || placement.owner !== expectedPlacement.owner)) return [];
  return (catalog[id] || fallback)
    .filter((line) => !line.when || requirementMet(line.when, save))
    .map((line) => ({ ...line, text: interpolate(line.text, variables) }));
}

export function getMissionSceneDialogue(missionId, sceneId, options = {}) {
  return getDialogue(`mission.${missionId}.${sceneId}`, {
    ...options,
    placement: { surface: "mission-scene", owner: `${missionId}.${sceneId}` }
  });
}

export function validateDialogueReferences(missions, locale = DEFAULT_LOCALE) {
  const catalog = DIALOGUE_CATALOGS[locale] || {};
  return missions.flatMap((mission) => {
    if (!mission.dialogueId) return [];
    if (!catalog[mission.dialogueId]) return [`${mission.id}: diálogo inexistente ${mission.dialogueId}`];
    const placement = DIALOGUE_PLACEMENTS[mission.dialogueId];
    return placement?.surface === "mission-briefing" && placement.owner === mission.id ? [] : [`${mission.id}: diálogo asignado a otra ubicación`];
  });
}
