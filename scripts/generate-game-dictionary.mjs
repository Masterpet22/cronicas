import { writeFile } from "node:fs/promises";
import { GAME_DICTIONARY } from "../src/content/game-dictionary.js";

const sections = [...new Set(GAME_DICTIONARY.map(entry => entry.category))].map(category => {
  const entries = GAME_DICTIONARY.filter(entry => entry.category === category).map(entry =>
    `### ${entry.term}\n\n${entry.definition}${entry.aliases.length ? `\n\nVariantes de consulta: ${entry.aliases.join(", ")}.` : ""}`);
  return `## ${category}\n\n${entries.join("\n\n")}`;
});
const header = `# Diccionario del juego\n\nReferencia canónica para diálogos, interfaz y documentación. Usar el término oficial al escribir textos nuevos; las variantes solo facilitan la búsqueda. Los IDs técnicos y de partidas se conservan.\n\nFuente: [game-dictionary.js](../src/content/game-dictionary.js). La Biblioteca lee ese mismo catálogo. Regenerar este documento con \`node scripts/generate-game-dictionary.mjs\` después de editarlo.\n\nHay un único rango del jugador, de 1 a 3, que determina las afinidades disponibles. «Rango elemental» es una variante histórica del mismo concepto. El nivel del jugador y el nivel de técnica son progresiones distintas. Los rangos oficiales son Novicio (1), Experto (2) y Veterano (3).\n\n`;
await writeFile(new URL("../docs/DICCIONARIO_JUEGO.md", import.meta.url), header + sections.join("\n\n") + "\n");
console.log(`Diccionario actualizado: ${GAME_DICTIONARY.length} términos.`);
