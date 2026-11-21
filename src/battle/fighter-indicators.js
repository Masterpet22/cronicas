export function drawTargetCorners(graphics, left, top, right, bottom, arm, width) {
  graphics.lineStyle(width, 0xffcb4f, 1);
  const corners = [[left, top, 1, 1], [right, top, -1, 1]];
  if (bottom != null) corners.push([left, bottom, 1, -1], [right, bottom, -1, -1]);
  for (const [x, y, dx, dy] of corners) {
    graphics.beginPath().moveTo(x, y + arm * dy).lineTo(x, y).lineTo(x + arm * dx, y).strokePath();
  }
}

// Scene-space markers follow the actual animated fighter, including CPU turns.
export function mountFighterIndicators(scene, root) {
  const protagonist = scene.hero;
  const active = scene.add.graphics().setDepth(18);
  const selection = scene.add.graphics().setDepth(18);
  const ground = scene.add.graphics().setDepth(5);
  const targetGround = scene.add.graphics().setDepth(5);
  scene.hudActiveFighter = null;
  let activeKey = '', targetKey = '';
  const refresh = () => {
    const visible = !root.hidden && !scene.finished;
    const companionActing = scene.busy && !scene.groupExecuting && scene.companion?.pending;
    const source = scene.hudActiveFighter || (companionActing ? scene.companion.fighter : scene.turnReady ? scene.hero : null);
    const target = scene.trainingTargets?.[scene.selectedTargetIndex];
    const fighter = target?.fighter || scene.foe;
    const targetAlive = (target?.state || scene.enemy)?.hp > 0 && !target?.retired;
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
    const shadow = fighter?.shadow;
    const key = visible && targetAlive && bounds && shadow?.visible
      ? `${Math.round(bounds.centerX)},${Math.round(bounds.top)},${Math.round(shadow.x)},${Math.round(shadow.y)}` : '';
    if (key !== targetKey) {
      targetKey = key; selection.clear(); targetGround.clear();
      if (key) {
        drawTargetCorners(selection, bounds.centerX - 29, bounds.top - 5, bounds.centerX + 29, null, 10, 2);
        targetGround.lineStyle(1.8, 0xffcb4f, .95).strokeEllipse(shadow.x, shadow.y + 2, 96, 17);
      }
    }
    active.setVisible(Boolean(sourceKey)); selection.setVisible(Boolean(key));
    targetGround.setVisible(Boolean(key)); ground.setVisible(visible);
  };
  scene.events.on('postupdate', refresh);
  const destroy = () => {
    scene.events.off('postupdate', refresh);
    active.destroy(); selection.destroy(); ground.destroy(); targetGround.destroy();
    scene.hudActiveFighter = null;
  };
  scene.events.once('shutdown', destroy);
  refresh();
  return { active, selection, ground, targetGround, refresh };
}
