# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: weapon-equipment.spec.mjs >> shuriken inicial: equipo, venta, recompra y animaciones reales con el kunai del cursor
- Location: tests\weapon-equipment.spec.mjs:16:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  locator('[data-training-page="next"]')
Expected: enabled
Received: disabled
Timeout:  8000ms

Call log:
  - Expect "toBeEnabled" locator('[data-training-page="next"]') with timeout 8000ms
  - waiting for locator('[data-training-page="next"]')
    18 × locator resolved to <button disabled type="button" data-training-page="next" aria-label="Página siguiente de movimientos">›</button>
       - unexpected value "disabled"

```

```yaml
- main:
  - region "Juego de combate por turnos":
    - region "Interfaz de combate":
      - strong: ARMERO
      - text: PV
      - progressbar "Vida"
      - text: 105/105CH
      - progressbar "Chakra"
      - text: 80/80
      - strong: MARIONETA DE ENTRENAMIENTO
      - text: PV
      - progressbar "Vida"
      - text: 10000/10000CH
      - progressbar "Chakra"
      - text: 0/0
      - status:
        - strong: TURNO DE ARMERO
        - button "Pausar combate (Escape)": Ⅱ
        - button "Abrir objetos de misión" [disabled]: Objetos
      - text: FÍSICAS
      - button "Cambiar a habilidades elementales (0)" [pressed]
      - status: Tabla física. Golpe veloz y Guardia permanecen en 1 y 6.
      - button "1. Golpe veloz, 0 CH" [pressed]: Golpe veloz 0 CH
      - button "2. Golpe de arma, Kunai equilibrado, 0 PV": Golpe de arma 0 PV
      - button "3. Shuriken, Shuriken, 0 PV": Shuriken 0 PV
      - button "4. Sin más movimientos, —" [disabled]: Sin más movimientos —
      - button "5. Sin más movimientos, —" [disabled]: Sin más movimientos —
      - button "6. Guardia, 0 CH": Guardia 0 CH
      - status: "Entrenamiento libre: usa la tabla de ataques. La marioneta no ataca y los recursos se restauran en cada prueba. Puedes volver al Dojo desde la pausa."
```

# Test source

```ts
  1  | import { expect } from "@playwright/test";
  2  | 
  3  | export async function trainingAction(page, id) {
  4  |   if (!["strike", "guard"].includes(id)) {
  5  |     const table = ["weapon_strike", "throwable_strike"].includes(id) || id.startsWith("physical_") ? "physical" : "elemental";
  6  |     if (await page.locator(".combat-access").getAttribute("data-skill-table") !== table) {
  7  |       await page.locator("[data-skill-table-switch]").click();
  8  |     }
  9  |     const previous = page.locator('[data-training-page="previous"]');
  10 |     while (await previous.isVisible() && await previous.isEnabled()) await previous.click();
  11 |   }
  12 |   const action = page.locator(`[data-combat-action][data-action-id="${id}"]`);
  13 |   for (let i = 0; i < 20 && !await action.count(); i++) {
  14 |     const next = page.locator('[data-training-page="next"]');
> 15 |     await expect(next).toBeEnabled(); await next.click();
     |                        ^ Error: expect(locator).toBeEnabled() failed
  16 |   }
  17 |   await expect(action).toHaveAttribute("aria-disabled", "false");
  18 |   return action;
  19 | }
  20 | 
  21 | export async function trainingReady(page) {
  22 |   await expect(page.locator('[data-combat-action="6"]')).toHaveAttribute("aria-disabled", "false", { timeout: 25000 });
  23 | }
  24 | 
```