import { requirementMet } from "./mission-system.js?v=0.114.0";
import { MISSION_DIALOGUES } from "./content/index.js?v=0.114.0";

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
    { speaker: "kureha", text: "Los días 5, 12, 19 y 26 te esperan minijefes de agua, tierra, fuego y aire. Consulta el calendario para preparar tu visita." }
  ],
  "npc.kureha.guide": [
    { speaker: "kureha", text: "Los desafíos elementales se abren únicamente en su fecha. Tu victoria queda registrada al volver a la Torre." },
    { speaker: "kureha", text: "Cada custodio tiene su propia afinidad. Prepara tu equipo y tus técnicas en el Dojo antes del combate." },
    { speaker: "kureha", text: "Puedes repetir un desafío durante su día. Por ahora no entrega PX, monedas ni objetos y no consume tus recursos de misión." }
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
    { speaker: "goro", text: "Elige un rival y una dificultad para una exhibición contra la IA. PvP y combates clasificatorios llegarán con el modo online." }
  ],
  "npc.goro.guide": [
    { speaker: "goro", text: "Compara la afinidad principal de ambos combatientes antes de gastar chakra." },
    { speaker: "goro", text: "Los enfriamientos impiden repetir la misma técnica continuamente: prepara una segunda opción." },
    { speaker: "goro", text: "En exhibición empiezas con vida y chakra completos. No se gastan consumibles ni se entregan PX, monedas o puntos de clasificación." }
  ],
  "npc.hana.intro": [
    { speaker: "hana", text: "Hana Kogane, a tu servicio. Una bolsa llena no gana batallas, pero una compra inteligente sí puede hacerlo." },
    { speaker: "hana", text: "Puedes comprar y vender equipo, objetos, apariencia y decoraciones usando las monedas de tus misiones." }
  ],
  "npc.hana.guide": [
    { speaker: "hana", text: "Las monedas se obtienen al vencer enemigos y al completar una misión por primera vez." },
    { speaker: "hana", text: "Armas, sellos, accesorios y compañeros se equipan en el Dojo; compara su efecto antes del precio." },
    { speaker: "hana", text: "Compro a mitad de precio. Las decoraciones se colocan en el Gremio y los contratos se juegan en el tablón." }
  ],
  "npc.yuna.intro": [
    { speaker: "yuna", text: "Bienvenido. Soy Yuna Ametsuki. Incluso un ninja necesita un lugar donde bajar la guardia." },
    { speaker: "yuna", text: "Te he reservado Mi espacio. Puedes decorar sus paredes y suelos y exhibir los recuerdos de tus misiones. También puedes preparar el emblema de tu futuro clan." }
  ],
  "npc.yuna.guide": [
    { speaker: "yuna", text: "Tu progreso se guarda automáticamente en este navegador." },
    { speaker: "yuna", text: "Regresar a la aldea después de un combate permite cambiar equipo y técnicas sin perder avances." },
    { speaker: "yuna", text: "Compra colores, suelos y decoraciones en la Tienda y colócalos aquí. Cada mueble ocupa una unidad; al retirarlo queda disponible para volver a usarlo. Todo queda guardado en tu partida." }
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
    { speaker: "nao", text: "¡Nao Matsuri abre la plaza! Revisa el calendario mensual para conocer los festivales, las visitas y los eventos temporales de la aldea." },
    { speaker: "nao", text: "Selecciona una fecha para ver sus actividades junto al calendario. El contador te indica cuántos días faltan para el próximo evento." }
  ],
  "npc.nao.guide": [
    { speaker: "nao", text: "La semana empieza en domingo. Puedes elegir tu día y mes de cumpleaños con el botón Mi cumpleaños." },
    { speaker: "nao", text: "Nunca necesitarás participar en ellos para terminar la historia principal." },
    { speaker: "nao", text: "Tu participación se guarda por personaje y por edición. Puedes consultar otros meses sin perder tus avances." }
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
