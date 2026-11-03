import { ABILITY_CATALOG, ENEMY_ROSTER, SEALS, abilityAccess, canonicalAbilityId } from "../../data.js?v=1.5.0";
import { actionNeedsPreparation, millisecondsToTimelineThreshold } from "../../battle/timeline.js?v=0.69.0";
import { basicRequirements, elementName } from "../../elements.js?v=0.20.0";

export function abilityCatalogMarkup(escape) {
  const actions = Object.values(ABILITY_CATALOG);
  const rows = actions.map(action => {
    const access = abilityAccess(action.id);
    const users = Object.values(ENEMY_ROSTER).filter(profile => [...profile.pattern, ...(profile.phase2Pattern || [])]
      .some(id => canonicalAbilityId(id) === action.id)).map(profile => profile.name);
    const seals = action.seals.map(id => SEALS[id].label).join(" · ") || "Sin sellos";
    const ms = actionNeedsPreparation(action) ? Math.round(millisecondsToTimelineThreshold(.8, 10, action)) : 0;
    const required = basicRequirements(action.element);
    const affinities = required.length ? required.map(elementName).join(" + ") : "Ninguna (física)";
    return `<tr data-ability-id="${escape(action.id)}" data-ability-access="${access}"><td><strong>${escape(action.name)}</strong><small>${escape(action.id)}</small></td>
      <td>${access === "enemy-only" ? "Exclusiva de enemigos" : "Compartida"}</td><td>${escape(affinities)}</td><td>${action.cost || 0} CH${action.healthCost ? ` · ${action.healthCost} PV` : ""}</td>
      <td>${action.damage}</td><td>${escape(seals)}</td><td>${ms} ms</td><td>${action.cooldown || 0} turnos</td><td>${escape(users.join(", ") || "Sin asignar a enemigos")}</td></tr>`;
  }).join("");
  return `<section class="debug-section"><div><p class="eyebrow">COMBATE</p><h3>Catálogo de habilidades</h3></div>
    <p>${actions.length} habilidades activas. Valores de nivel 1; el daño final añade estadísticas, afinidades y defensa. Preparación a velocidad 10. Los ataques físicos no requieren sellos. Las exclusivas también exigen sus afinidades.</p>
    <details data-ability-catalog><summary>VER HABILIDADES COMPARTIDAS Y EXCLUSIVAS</summary>
    <label>Mostrar <select data-ability-filter><option value="all">Todas</option><option value="shared">Compartidas</option><option value="enemy-only">Exclusivas de enemigos</option></select></label>
    <div class="ability-catalog-scroll"><table><caption>Definiciones comunes para jugador y enemigos</caption><thead><tr><th>Habilidad</th><th>Acceso</th><th>Afinidades requeridas</th><th>Coste</th><th>Daño base</th><th>Sellos</th><th>Preparación</th><th>Recarga</th><th>Enemigos que la usan</th></tr></thead><tbody>${rows}</tbody></table></div></details></section>`;
}

export function mountAbilityCatalog(root, scope) {
  const select = root.querySelector("[data-ability-filter]");
  scope.listen(select, "change", () => {
    root.querySelectorAll("[data-ability-id]").forEach(row => {
      row.hidden = select.value !== "all" && select.value !== row.dataset.abilityAccess;
    });
  });
}
