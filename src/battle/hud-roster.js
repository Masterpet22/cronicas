import { hairTextureKey, fighterAtlasKey, fighterFaceTextureKey, fighterCombatPortraitLayout, useFighterTextureRendering } from '../fighters.js?v=0.169.0';
import { enemyFighterAppearance } from '../character.js?v=0.169.0';
import { setHudText, setHudProgress, setHudAttribute } from './hud-dom.js?v=1.0.0';
import { hudPanelOrnaments } from './hud-chrome.js?v=0.169.0';
import { mountBattleObjectives } from './battle-objectives.js?v=1.0.0';

// The reference's smaller team plates reflect live participants, never a mock roster.
export function mountHudRoster(scene, root, utilities) {
  const objective = document.createElement('aside');
  objective.className = 'combat-mission-objective';
  objective.innerHTML = hudPanelOrnaments();
  const heading = document.createElement('strong');
  heading.textContent = 'Objetivo de la misión';
  const objectiveText = document.createElement('span');
  objective.append(heading, objectiveText);
  const allies = document.createElement('div');
  allies.className = 'combat-roster combat-roster-allies';
  const enemies = document.createElement('div');
  enemies.className = 'combat-roster combat-roster-enemies';
  root.append(allies, enemies);
  const objectives = mountBattleObjectives(scene, utilities, objective);

  function portrait(canvas, appearance, flipped) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 144, 144);
    const layout = fighterCombatPortraitLayout(appearance, flipped);
    ctx.save();
    ctx.translate(72, 72); ctx.scale(2, 2);
    const paint = (key, frameName, box) => {
      if (!box || !scene.textures.exists(key)) return;
      const frame = scene.textures.getFrame(key, frameName);
      if (!frame) return;
      ctx.save(); ctx.translate(box.x, box.y); ctx.scale(flipped ? -1 : 1, 1);
      ctx.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
        -box.width / 2, -box.height / 2, box.width, box.height);
      ctx.restore();
    };
    paint(fighterAtlasKey(appearance), 'cabeza', layout.head);
    paint(fighterFaceTextureKey(appearance), undefined, layout.head);
    const hair = hairTextureKey(appearance.hair);
    if (hair) paint(hair, undefined, layout.hair);
    ctx.restore();
  }
  function card(host, enemy) {
    const el = document.createElement(enemy ? 'button' : 'div');
    el.className = 'combat-roster-card';
    el.innerHTML = hudPanelOrnaments();
    if (enemy) el.type = 'button';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 144;
    canvas.setAttribute('aria-hidden', 'true');
    const info = document.createElement('div');
    info.className = 'combat-roster-info';
    const title = document.createElement('div'); title.className = 'combat-roster-title';
    const name = document.createElement('strong');
    const badge = document.createElement('small');
    title.append(name, badge);
    const meters = ['PV', 'CH'].map(label => {
      const row = document.createElement('label');
      const caption = document.createElement('span'); caption.textContent = label;
      const progress = document.createElement('progress'); progress.max = 1;
      // Enemy resources share the main enemy panel's right-hand anchor.
      progress.dir = enemy ? 'rtl' : 'ltr';
      progress.setAttribute('aria-label', label === 'PV' ? 'Vida' : 'Chakra');
      const value = document.createElement('b'); row.append(caption, progress, value); info.append(row);
      return { progress, value };
    });
    info.prepend(title); el.append(canvas, info); host.append(el);
    let index = 0, lookKey = '';
    if (enemy) el.addEventListener('click', () => scene.selectTrainingTarget(index));
    return { el, update(unit, title, appearance, level, targetIndex) {
      index = targetIndex;
      setHudText(name, title);
      setHudText(badge, enemy ? `NV ${level}` : `CPU · NV ${level}`);
      const key = JSON.stringify(appearance);
      if (lookKey !== key) { portrait(canvas, appearance, enemy); lookKey = key; }
      [[unit.hp, unit.maxHp], [unit.chakra, unit.maxChakra]].forEach(([value, max], i) => {
        setHudProgress(meters[i].progress, max > 0 ? Math.max(0, value) / max : 0);
        setHudText(meters[i].value, `${Math.max(0, value)}/${max}`);
      });
      el.classList.toggle('is-defeated', unit.hp <= 0);
      if (enemy) {
        el.disabled = unit.hp <= 0 || scene.busy || Boolean(scene.pendingActions.player);
        setHudAttribute(el, 'aria-label', `Elegir ${title}, ${unit.hp}/${unit.maxHp} PV, ${unit.chakra}/${unit.maxChakra} CH`);
      }
    } };
  }
  let allyCard;
  const enemyCards = [];
  return { refresh() {
    objectives.refresh();
    const ally = scene.companion;
    const hideAllies = !ally;
    if (allies.hidden !== hideAllies) allies.hidden = hideAllies;
    if (ally) {
      allyCard ||= card(allies, false);
      const look = { bodyType: ally.id === 'akari' ? 'female' : 'male', hair: ally.id === 'akari' ? 4 : 1, skinTone: 'medium' };
      allyCard.update(ally.state, ally.definition.name.split(' ')[0], look, scene.saveData.progression.level);
      // Keep the live team readout beside the other HUD controls at every size.
      scene.companionHud?.setVisible(false);
      if (scene.companionMarker && !scene.companionMarker.getByName('hud-face')) {
        const layout = fighterCombatPortraitLayout(look, false, 13).head;
        const face = useFighterTextureRendering(scene.add.image(layout.x, layout.y, fighterFaceTextureKey(look))
          .setDisplaySize(layout.width, layout.height).setName('hud-face'));
        scene.companionMarker.addAt(face, 2);
      }
    }
    const targets = (scene.trainingTargets || []).map((target, index) => ({ ...target, index }))
      .filter(target => target.index !== scene.selectedTargetIndex);
    enemies.hidden = !targets.length;
    targets.forEach((target, i) => {
      enemyCards[i] ||= card(enemies, true);
      enemyCards[i].el.hidden = false;
      enemyCards[i].update(target.state, target.profile.name,
        enemyFighterAppearance(target.profile), scene.enemyRankForProfile(target.profile), target.index);
    });
    enemyCards.slice(targets.length).forEach(card => { card.el.hidden = true; });
    const protect = scene.mission.protectObjective;
    const text = protect ? `Protege ${protect.name.toLowerCase()} hasta el final del combate.${scene.objective ? ` · ${scene.objective.hp}/${scene.objective.maxHp} PV` : ''}`
      : scene.mission.training ? 'Entrenamiento · practica tus técnicas.'
      : scene.mission.exhibition ? 'Derrota a tus rivales.' : 'Derrota a los enemigos y completa el combate.';
    setHudText(objectiveText, text);
  } };
}
