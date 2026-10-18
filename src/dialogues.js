import { requirementMet } from "./mission-system.js?v=0.66.0";

export const DEFAULT_LOCALE = "es";

const es = {
  "mission.m01.briefing": [
    { speaker: "ren", text: "Tenemos una misión de clase D. Un grupo de ladrones robó el gato de una familia de la aldea y huyó hacia el Bosque del Este." },
    { speaker: "ren", text: "Sigue sus huellas, derrota a los bandidos y trae al gato de vuelta. Parece sencillo, pero no subestimes a quien dirige el grupo." }
  ],
  "mission.m02.briefing": [
    { speaker: "ren", text: "Nami confirmó la ruta hacia el Desfiladero del Cuervo. Seguirás a los bandidos antes de que abandonen la cantera." },
    { speaker: "ren", text: "{master} irá contigo. Primero asegura el sendero; después averigüen dónde ocultan al resto del grupo." },
    { speaker: "master", text: "No buscamos una pelea innecesaria. Observa el terreno y recuerda que la información puede valer más que una victoria rápida." }
  ],
  "mission.m03.briefing": [
    { speaker: "ren", text: "Haru ubicó dos accesos a la guarida. La entrada que elijas decidirá cuántos guardianes encontrarás y qué recursos podrás recuperar." }
  ],
  "mission.m04.briefing": [
    { speaker: "ren", text: "Las galerías interiores están llenas de combatientes especializados. Administra vida, chakra y suministros entre cada duelo." }
  ],
  "mission.m05.briefing": [
    { speaker: "ren", text: "Raizen Kurogane dirige a los bandidos. Sus cambios de ritmo, ataques anunciados y estados alterados serán tu duelo final." }
  ],
  "mission.m01.combat-tutorial": [
    { speaker: "master", text: "{master}: «La barra superior muestra tu VIDA y CHAKRA. La barra inferior representa VELOCIDAD: los marcadores solo avanzan cuando comienza el turno. Las técnicas consumen chakra y pueden requerir sellos; Guardia reduce el próximo impacto y recupera chakra.»" }
  ],
  "mission.m02.prisoner-choice": [
    { speaker: "narrator", text: "El teniente está derrotado y conoce la ruta del campamento. Tu decisión quedará registrada." }
  ],
  "mission.m02.prisoner-interrogate": [
    { speaker: "narrator", text: "Obtienes la ruta y el cargamento, pero el prisionero huye: Akumori estará reforzado." }
  ],
  "mission.m02.prisoner-eliminate": [
    { speaker: "narrator", text: "Pierdes la información y un posible aliado, pero Akumori no recibirá refuerzos." }
  ],
  "mission.m02.investigation-complete": [
    { speaker: "master", text: "{master}: «El rastro converge en la vieja cantera. Sigamos.»" }
  ],
  "mission.m03.secret-warehouse": [
    { speaker: "narrator", text: "La información del teniente conduce a un acceso oculto. Evitas al guardia exterior y localizas las monedas robadas; se asegurarán al completar la misión." }
  ],
  "mission.m04.resource-choice": [
    { speaker: "master", text: "{master}: «Mide lo que todavía queda por delante. Los estados no desaparecerán si avanzas sin descansar.»" }
  ],
  "mission.m04.hideout-discovery": [
    { speaker: "narrator", text: "Tras el último duelo oyes prisioneros tras una compuerta y encuentras documentos marcados con un cuervo negro. Solo hay tiempo para asegurar uno primero." }
  ],
  "mission.m04.revelation-documents": [
    { speaker: "narrator", text: "Los documentos llevan el sello de una organización desconocida. Raizen no dirige la red: administra esta guarida para alguien que opera fuera de la región." }
  ],
  "mission.m04.revelation-prisoners": [
    { speaker: "narrator", text: "Los prisioneros confirman que Raizen recibe órdenes y suministros de una organización externa. Los bandidos del Cuervo son solamente una célula de una red mayor." }
  ],
  "mission.m05.lieutenant-intervention": [
    { speaker: "lieutenant", text: "TENIENTE: «Me perdonaste cuando pudiste acabar conmigo. Raizen no tendrá hoy toda su ventaja.»\n\nEl antiguo teniente hiere al jefe: −15 % de vida y mejora defensiva eliminada." }
  ],
  "mission.s01.briefing": [
    { speaker: "sayo", text: "Perdí el rastro de los saqueadores en la Aldea de Kagemori. El ataque fue reciente y todavía deben quedar señales de su ruta." },
    { speaker: "sayo", text: "Habla con los supervivientes e investiga la carreta, la plaza y el pozo. No busques pelea: necesitamos saber adónde llevaron lo robado." }
  ],
  "mission.s02.briefing": [
    { speaker: "sayo", text: "El mapa de Akumori está cifrado. Busca al doctor Haru Takamine; sus viajes le han enseñado a leer marcas de caminos olvidados." },
    { speaker: "sayo", text: "Tendrás que escoger una de tres rutas durante tres fases. No todas esconden peligro, pero todas te acercan al doctor." }
  ],
  "npc.ren.intro": [
    { speaker: "ren", text: "Soy Ren Arashiro. Mientras portes el sello de esta aldea, ninguna misión será solamente tuya." },
    { speaker: "ren", text: "El Cuartel registra tu rango, tus victorias y las amenazas que todavía permanecen abiertas." }
  ],
  "npc.ren.guide": [
    { speaker: "ren", text: "Tu nivel aumenta con experiencia y cada ascenso concede puntos de atributo." },
    { speaker: "ren", text: "Las cinco misiones principales se desbloquean en orden a medida que investigas a los Bandidos del Cuervo." },
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
    { speaker: "sayo", text: "La Biblioteca conserva tu campaña, rango y los capítulos que aún no has completado." }
  ],
  "npc.sayo.guide": [
    { speaker: "sayo", text: "Los registros marcados con una señal verde ya fueron completados y pueden repetirse desde el Tablón." },
    { speaker: "sayo", text: "La primera crónica reúne cinco misiones principales y dos encargos secundarios conectados." },
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
    { speaker: "yuna", text: "La Posada reunirá conversaciones con aliados y escenas que ocurren entre misiones." }
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

export const DIALOGUE_CATALOGS = Object.freeze({ es: Object.freeze(es) });
export const DIALOGUE_PLACEMENTS = Object.freeze(Object.fromEntries(Object.keys(es).map((id) => {
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
