import { expect } from "@playwright/test";

export async function trainingAction(page, id) {
  if (!["strike", "guard"].includes(id)) {
    const table = ["weapon_strike", "throwable_strike"].includes(id) || id.startsWith("physical_") ? "physical" : "elemental";
    if (await page.locator(".combat-access").getAttribute("data-skill-table") !== table) {
      await page.getByRole("button", { name: table === "physical" ? "Cambiar a habilidades físicas" : "Cambiar a habilidades elementales", exact: true }).click();
    }
    const previous = page.locator('[data-training-page="previous"]');
    while (await previous.isVisible() && await previous.isEnabled()) await previous.click();
  }
  const action = page.locator(`[data-combat-action][data-action-id="${id}"]`);
  for (let i = 0; i < 20 && !await action.count(); i++) {
    const next = page.locator('[data-training-page="next"]');
    await expect(next).toBeEnabled(); await next.click();
  }
  await expect(action).toHaveAttribute("aria-disabled", "false");
  return action;
}

export async function trainingReady(page) {
  await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 25000 });
}
