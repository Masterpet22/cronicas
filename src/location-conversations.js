// Las presentaciones se recuerdan por lugar y persona, dentro de cada partida.
const HOSTS = { headquarters: ["ren"], dojo: ["mei", "daichi"], archive: ["sayo"], shop: ["hana"], tower: ["kureha"], arena: ["goro"], inn: ["yuna"], missions: ["riku"], event: ["nao"], kagemori: ["iori", "nami"] };
const INTRO_KEYS = Object.entries(HOSTS).flatMap(([place, cast]) => cast.map(id => `${place}:${id}`));
export function normalizeIntroductions(value) {
  return [...new Set(Array.isArray(value) ? value : [])].filter(key => INTRO_KEYS.includes(key));
}
export function hasIntroduction(save, place, cast) {
  const seen = normalizeIntroductions(save.campaign?.npcIntroductions);
  return cast.every(id => seen.includes(`${place}:${id}`));
}
export function rememberIntroduction(save, place, cast) {
  return { ...save, campaign: { ...save.campaign, npcIntroductions: normalizeIntroductions([...(save.campaign?.npcIntroductions || []), ...cast.map(id => `${place}:${id}`)]) } };
}
export function retainIntroductions(next, current) {
  return { ...next, campaign: { ...next.campaign, npcIntroductions: normalizeIntroductions([...(current.campaign?.npcIntroductions || []), ...(next.campaign?.npcIntroductions || [])]) } };
}

export const NPC_IDLE_LINES = Object.freeze({
  ren: ["Una decisión serena también es parte del deber. Tómate el tiempo que necesites.", "La aldea parece tranquila. Mantenerla así requiere algo más que fuerza.", "Antes de aceptar una responsabilidad, piensa en quienes contarán contigo."],
  kureha: ["Escucha el silencio antes del desafío. También revela tus prisas.", "La cima seguirá ahí cuando estés preparado.", "Respira. El dominio comienza mucho antes del primer golpe."],
  sayo: ["Las páginas esperan con más paciencia que nosotros.", "Prefiero una anotación precisa a diez rumores emocionantes.", "A veces releer una línea revela lo que pasamos por alto."],
  daichi: ["Los pies firmes. Hasta cuando piensas, tu postura importa.", "La disciplina se entrena también en los días tranquilos.", "Piensa qué quieres conseguir con tu próximo movimiento."],
  mei: ["Podemos probar combinaciones sin prisa. Quiero que salgas con un plan.", "Una técnica favorita está bien; una segunda opción también ayuda.", "¿Te has fijado en cómo encajan tus técnicas? Ahí suele estar la respuesta."],
  goro: ["¡Hasta el público está calentando! Yo también puedo esperar… un poco.", "Me gusta un buen duelo, pero también ver a alguien prepararlo con cabeza.", "¿Escuchas la arena? Está pidiendo una buena exhibición."],
  hana: ["Mira con calma. Una compra pensada vale por dos impulsivas.", "Mi mejor cliente es el que vuelve sano del viaje.", "Puedes mirar todo lo que quieras; mirar todavía sale gratis."],
  yuna: ["Aquí puedes bajar los hombros. Este rincón es tuyo.", "Una habitación empieza a sentirse como hogar con los pequeños detalles.", "Si te quedas un rato en silencio, también me parece un buen plan."],
  riku: ["Un contrato merece leerse hasta la última línea.", "Estoy revisando rutas. Tú elige un encargo que puedas preparar bien.", "No hay prisa por partir sin saber a dónde vas."],
  nao: ["Siempre estoy pensando en la próxima celebración. ¡Alguien tiene que preparar los faroles!", "Elige una fecha y te cuento qué estamos preparando.", "Hasta los días tranquilos sirven para reunir a la aldea."],
  iori: ["Esta plaza guarda recuerdos que el fuego no pudo llevarse.", "Gracias por quedarte a escuchar."],
  nami: ["Voy a vigilar el camino mientras observas.", "Una pista pequeña también merece una segunda mirada."]
});

const changed = (before, after) => {
  if (Object.is(before, after)) return false;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return true;
  if (Array.isArray(before) !== Array.isArray(after) || Object.keys(before).length !== Object.keys(after).length) return true;
  return Object.keys(before).some(key => !Object.hasOwn(after, key) || changed(before[key], after[key]));
};
export function locationChangeComment(place, before, after, npcId, items = {}) {
  if (place === "shop") {
    const ids = new Set([...Object.keys(before.inventory.items), ...Object.keys(after.inventory.items)]);
    const id = [...ids].find(key => before.inventory.items[key] !== after.inventory.items[key]);
    if (!id) return null;
    const quantity = (after.inventory.items[id] || 0) - (before.inventory.items[id] || 0), name = items[id]?.name || "objeto";
    return quantity > 0 ? `Buena compra: ${name}${quantity > 1 ? ` ×${quantity}` : ""}. Ya lo tienes en tus objetos; que te sea útil.` : `He recibido ${name}${quantity < -1 ? ` ×${-quantity}` : ""}. Las monedas de la venta ya están en tu bolsa.`;
  }
  if (place === "inn") {
    const a = before.guild.room, b = after.guild.room;
    if (a.wall !== b.wall) return "Ese color de pared le da otro aire a tu rincón. Ya lo he dejado guardado.";
    if (a.floor !== b.floor) return "El suelo nuevo ya está puesto. Ahora todo lo demás puede encontrar su sitio.";
    if (a.decorations.length < b.decorations.length) return "Un detalle más que hace tuyo este lugar. La decoración ya está colocada.";
    if (a.decorations.length > b.decorations.length) return "Lo he guardado para que puedas volver a colocarlo cuando quieras.";
    if (changed(a.decorations, b.decorations)) return "Ahí queda. Puedes seguir ajustándolo hasta sentir que está en su sitio.";
    if (changed(before.guild.clanDraft, after.guild.clanDraft)) return "Tu idea de clan ya está guardada. Cuando llegue el momento, tendrá una identidad propia.";
  }
  if (place === "dojo") {
    const strict = npcId === "daichi";
    if (changed(before.loadout, after.loadout)) return strict ? "Has ajustado tus técnicas. Ahora piensa en el orden en que las usarás." : "¡Configuración actualizada! Tus técnicas ya están listas para la próxima pelea.";
    if (changed(before.equipment, after.equipment)) return strict ? "Equipo ajustado. Asegúrate de que sirva a tu estrategia." : "¡Ya llevas el equipo elegido! Mira cómo encaja con tus técnicas.";
    if (changed(before.progression.attributes, after.progression.attributes)) return strict ? "Entrenamiento registrado. Cada punto debe tener un propósito." : "Atributos actualizados. Ya puedes ver el resultado en tus estadísticas.";
    if (before.character.teleportObject !== after.character.teleportObject) return "La sustitución elegida ya está preparada para el combate.";
    if (changed(before.character.affinities, after.character.affinities) || before.inventory.extraAffinityUnlocked !== after.inventory.extraAffinityUnlocked) return "Tu configuración de afinidades ha quedado guardada. Revisa las técnicas que puedes preparar con ella.";
    if (["skinTone", "face", "hair", "top", "bottom", "shoes", "outfit", "appearance"].some(key => changed(before.character[key] ?? null, after.character[key] ?? null))) return strict ? "Cambio guardado. Sigue preparando tu estilo con intención." : "¡Cambio guardado! Así vas dando forma a tu propio estilo.";
  }
  if (place === "event") {
    if (changed(before.character.birthday, after.character.birthday)) return after.character.birthday ? "¡Cumpleaños anotado! Ya tiene su sitio en tu calendario." : "He retirado tu cumpleaños del calendario. Puedes volver a elegirlo cuando quieras.";
    if (changed(before.events.participation, after.events.participation)) return "¡Tu participación ha quedado anotada! Me alegra verte formar parte de las actividades de la aldea.";
  }
  if (place === "archive" && !before.campaign.archiveUnlocked && after.campaign.archiveUnlocked) return "El libro ha quedado registrado. A partir de ahora podremos conservar sus nuevos hallazgos.";
  return null;
}

// Solo selecciones reales de los menús; los resultados se comentan tras guardarse.
export function locationSelectionComment(target, npcId) {
  const control = target.closest?.("button");
  if (!control || control.disabled) return null;
  const data = control.dataset;
  if (data.arenaRival) return `¡${control.querySelector("strong")?.textContent || "Rival elegido"}! Ya tienes oponente. Revisa sus estadísticas antes del duelo.`;
  if (data.arenaDifficulty) return `Dificultad ${control.textContent.trim()}. ¡Quiero verte darlo todo!`;
  if (data.arenaTab === "online") return "¡También tengo ganas de esos duelos! El multijugador llegará cuando conectemos la arena al servidor.";
  if (data.guildTab === "clans") return "Podemos preparar tu nombre y tu emblema desde ahora. Reunir al clan vendrá con la conexión online.";
  if (data.shopMode === "sell") return "Veamos qué quieres vender. Te pagaré la mitad de su precio; lo que tienes en uso debe quedar libre primero.";
  if (data.shopMode === "buy") return "Aquí tienes el catálogo. Revisa el precio y las unidades antes de decidir.";
  if (data.shopCategory) return `Veamos ${control.textContent.trim().toLowerCase()}. Los precios están a la vista, como debe ser.`;
  if (data.saga) return "Has elegido una saga. Revisa sus encargos y prepara cada paso antes de partir.";
  if (control.hasAttribute("data-back-sagas")) return "Aquí tienes las sagas de nuevo. Cada una reúne un camino de nuestra historia.";
  if (data.dojoTab) {
    const topics = { equipment: "Tu arma, sello, accesorio y compañero forman tu equipo.", techniques: "Estas son las técnicas que llevas y las que puedes aprender.", statistics: "Aquí puedes revisar tus atributos y distribuir los puntos disponibles.", appearance: "Aquí eliges cómo quieres presentarte al mundo." };
    return `${npcId === "daichi" ? "Con atención. " : "Vamos a ello. "}${topics[data.dojoTab] || "Revisa tu configuración."}`;
  }
  return null;
}
