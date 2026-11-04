# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: weapon-equipment.spec.mjs >> shuriken inicial: equipo, venta, recompra y animaciones reales con el kunai del cursor
- Location: tests\weapon-equipment.spec.mjs:16:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Cambiar a habilidades físicas', exact: true })

```

# Page snapshot

```yaml
- main [ref=f2e2]:
  - region "Juego de combate por turnos" [ref=f2e3]:
    - region "Interfaz de combate":
      - generic:
        - generic:
          - strong: ARMERO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 105/105
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 80/80
        - generic:
          - strong: MARIONETA DE ENTRENAMIENTO
          - generic:
            - text: PV
            - progressbar "Vida"
            - text: 10000/10000
          - generic:
            - text: CH
            - progressbar "Chakra"
            - text: 0/0
        - status:
          - strong: TURNO DE ARMERO
          - button "Pausar combate (Escape)" [ref=f2e5]: Ⅱ
          - button "Abrir objetos de misión" [disabled] [ref=f2e6]:
            - generic [ref=f2e9]: Objetos
      - generic:
        - generic [ref=f2e10]: ELEMENTALES
        - button "Cambiar a habilidades físicas (0)" [ref=f2e12]
        - status
      - generic:
        - button "1. Golpe veloz, 0 CH" [pressed] [ref=f2e16]:
          - generic [aria-hidden] [ref=f2e17]: "1"
          - generic [ref=f2e20]:
            - generic [ref=f2e21]: Golpe veloz
            - generic [ref=f2e22]: 0 CH
        - button "2. Ascuas veloces, 30 CH" [ref=f2e24]:
          - generic [aria-hidden] [ref=f2e25]: "2"
          - generic [ref=f2e28]: 火
          - generic [ref=f2e29]:
            - generic [ref=f2e30]: Ascuas veloces
            - generic [ref=f2e31]: 30 CH
        - button "3. Aliento de brasa, 42 CH" [ref=f2e33]:
          - generic [aria-hidden] [ref=f2e34]: "3"
          - generic [ref=f2e37]: 炎
          - generic [ref=f2e38]:
            - generic [ref=f2e39]: Aliento de brasa
            - generic [ref=f2e40]: 42 CH
        - button "4. Sin más movimientos, —" [disabled] [ref=f2e42]:
          - generic [aria-hidden] [ref=f2e43]: "4"
          - generic [ref=f2e45]: 封
          - generic [ref=f2e46]:
            - generic [ref=f2e47]: Sin más movimientos
            - generic [ref=f2e48]: —
        - button "5. Sin más movimientos, —" [disabled] [ref=f2e50]:
          - generic [aria-hidden] [ref=f2e51]: "5"
          - generic [ref=f2e53]: 封
          - generic [ref=f2e54]:
            - generic [ref=f2e55]: Sin más movimientos
            - generic [ref=f2e56]: —
        - button "6. Guardia, 0 CH" [ref=f2e58]:
          - generic [aria-hidden] [ref=f2e59]: "6"
          - generic [ref=f2e62]:
            - generic [ref=f2e63]: Guardia
            - generic [ref=f2e64]: 0 CH
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
> 7  |       await page.getByRole("button", { name: table === "physical" ? "Cambiar a habilidades físicas" : "Cambiar a habilidades elementales", exact: true }).click();
     |                                                                                                                                                           ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  8  |     }
  9  |     const previous = page.locator('[data-training-page="previous"]');
  10 |     while (await previous.isVisible() && await previous.isEnabled()) await previous.click();
  11 |   }
  12 |   const action = page.locator(`[data-combat-action][data-action-id="${id}"]`);
  13 |   for (let i = 0; i < 20 && !await action.count(); i++) {
  14 |     const next = page.locator('[data-training-page="next"]');
  15 |     await expect(next).toBeEnabled(); await next.click();
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