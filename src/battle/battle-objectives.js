export function mountBattleObjectives(scene, utilities, objective) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'combat-access-objectives';
  button.setAttribute('aria-label', 'Ver objetivos de la misión');
  button.setAttribute('aria-haspopup', 'dialog');
  button.title = 'Objetivos de la misión';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V3m0 1c5-4 11 4 16 0v12c-5 4-11-4-16 0"/></svg>';
  utilities.append(button);
  let dialog = null;
  const restoreFocus = () => { if (!dialog && button.isConnected) button.focus({ preventScroll: true }); };
  const close = () => {
    if (!dialog) return;
    const current = dialog; dialog = null;
    if (current.open) current.close();
    objective.remove(); current.remove();
    scene.events.once('resume', restoreFocus);
    scene.scene.resume();
  };
  button.addEventListener('click', () => {
    if (dialog || scene.finished || !scene.scene.isActive()) return;
    dialog = document.createElement('dialog');
    dialog.className = 'combat-objectives-dialog';
    dialog.setAttribute('aria-label', 'Objetivos de la misión');
    const dismiss = document.createElement('button'); dismiss.type = 'button';
    dismiss.textContent = 'Volver al combate'; dismiss.dataset.objectivesClose = '';
    dismiss.addEventListener('click', close);
    dialog.append(objective, dismiss);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Tab') { event.preventDefault(); dismiss.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    });
    const current = dialog;
    dialog.addEventListener('close', () => { if (dialog === current) close(); });
    scene.game.canvas.parentElement.append(dialog);
    scene.scene.pause(); dialog.showModal(); dismiss.focus();
  });
  scene.events.once('shutdown', () => {
    dialog?.remove(); dialog = null; objective.remove();
    scene.events.off('resume', restoreFocus);
  });
  return { refresh() { button.disabled = Boolean(scene.finished); } };
}
