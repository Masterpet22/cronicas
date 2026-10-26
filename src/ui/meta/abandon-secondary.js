export function confirmSecondaryAbandon(showMissionDecision, onConfirm) {
  showMissionDecision({
    eyebrow: "CONFIRMAR RETIRADA",
    title: "¿Abandonar la misión?",
    text: "Perderás las recompensas de esta misión y cualquier nivel mostrado antes de regresar a la aldea.",
    options: [
      { id: "continue", label: "Seguir jugando", description: "Conservar el progreso de esta misión.", primary: true },
      { id: "abandon", label: "Abandonar misión", description: "Descartar recompensas y niveles provisionales." }
    ]
  }, (choice) => { if (choice === "abandon") onConfirm(); });
}
