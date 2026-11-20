export async function receiveGuildGiftsOnPage(page) {
  const scene = page.getByRole("dialog", { name: "Los regalos de tu maestro" });
  if (!await scene.isVisible()) return;
  await scene.getByRole("button", { name: "SIGUIENTE", exact: true }).click();
  await scene.getByRole("button", { name: "RECIBIR LOS RECUERDOS", exact: true }).click();
}
