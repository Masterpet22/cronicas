// Scene-space markers follow the actual animated fighter, including CPU turns.
export function mountFighterIndicators(scene, root) {
  const protagonist = scene.hero;
  const active = scene.add.graphics().setDepth(18);
  const selection = scene.add.graphics().setDepth(18);
  const ground = scene.add.graphics().setDepth(5);
  scene.hudActiveFighter = null;
  let activeKey = '', targetKey = '';
  const refresh = () => {
    const visible = !root.hidden && !scene.finished;
    const companionActing = scene.busy && !scene.groupExecuting && scene.companion?.pending;
    const source = scene.hudActiveFighter || (companionActing ? scene.companion.fighter : scene.turnReady ? scene.hero : null);
    const target = scene.trainingTargets?.[scene.selectedTargetIndex];
    const fighter = target?.fighter || scene.foe;
    if (target?.ring?.scene) target.ring.setDisplaySize(100, 18);
    const targetAlive = (target?.state || scene.enemy)?.hp > 0;
    const head = source?.head?.scene ? source.head.getBounds() : null;
    const sourceKey = visible && head ? `${Math.round(head.centerX)},${Math.round(head.top)}` : '';
    if (activeKey !== sourceKey) {
      activeKey = sourceKey; active.clear();
      if (sourceKey) {
        const x = head.centerX, y = head.top - 12;
        active.fillStyle(0xffc54d, 1).fillTriangle(x - 10, y - 10, x + 10, y - 10, x, y + 2);
        active.lineStyle(1, 0xffeab0, 1).strokeTriangle(x - 10, y - 10, x + 10, y - 10, x, y + 2);
      }
    }
    ground.clear();
    if (visible && protagonist?.shadow?.scene && (scene.protagonistDuringAttack || scene.player).hp > 0) {
      ground.fillStyle(0x69deff, .1).fillEllipse(protagonist.shadow.x, protagonist.shadow.y, 98, 18);
      ground.lineStyle(2, 0x75e2ff, .95).strokeEllipse(protagonist.shadow.x, protagonist.shadow.y, 98, 18);
    }
    const bounds = fighter?.head?.scene ? fighter.head.getBounds() : null;
    const key = visible && targetAlive && bounds ? `${Math.round(fighter.body.x)},${Math.round(bounds.top)},${Math.round(fighter.shadow.y)}` : '';
    if (key !== targetKey) {
      targetKey = key; selection.clear();
      if (key) {
        const left = fighter.body.x - 38, right = fighter.body.x + 38;
        const top = bounds.top - 5, bottom = fighter.shadow.y - 12, arm = 15;
        selection.lineStyle(3, 0xffcb4f, 1);
        for (const [x, y, dx, dy] of [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]]) {
          selection.beginPath().moveTo(x, y + arm * dy).lineTo(x, y).lineTo(x + arm * dx, y).strokePath();
        }
        if (!target) selection.lineStyle(2, 0xffcb4f, 1).strokeEllipse(fighter.shadow.x, fighter.shadow.y, 100, 18);
      }
    }
    active.setVisible(Boolean(sourceKey)); selection.setVisible(Boolean(key)); ground.setVisible(visible);
  };
  scene.events.on('postupdate', refresh);
  const destroy = () => {
    scene.events.off('postupdate', refresh);
    active.destroy(); selection.destroy(); ground.destroy();
    scene.hudActiveFighter = null;
  };
  scene.events.once('shutdown', destroy);
  refresh();
  return { active, selection, ground, refresh };
}
