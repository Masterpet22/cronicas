import { searchGameDictionary } from "../../content/game-dictionary.js";

export function dictionaryEntriesMarkup(query, escape) {
  const entries = searchGameDictionary(query);
  if (!entries.length) return '<p class="dictionary-empty" role="status">No hay términos que coincidan con tu búsqueda.</p>';
  return entries.map(entry => `<article class="dictionary-entry"><small>${escape(entry.category)}</small><h4>${escape(entry.term)}</h4><p>${escape(entry.definition)}</p>${entry.aliases.length ? `<p class="dictionary-aliases">También se encuentra como: ${escape(entry.aliases.join(", "))}.</p>` : ""}</article>`).join("");
}

export function gameDictionaryMarkup(escape, query = "") {
  return `<section class="game-dictionary" data-game-dictionary><header class="archive-section-heading"><h3>Diccionario del juego</h3><p>Términos oficiales para entender tus misiones, afinidades y combates.</p></header><label>Buscar un término<input type="search" data-dictionary-search placeholder="Rango, afinidad, chakra…" value="${escape(query)}" autocomplete="off"></label><div class="dictionary-entries archive-scroll" data-dictionary-entries tabindex="0" aria-label="Términos del diccionario">${dictionaryEntriesMarkup(query, escape)}</div></section>`;
}
