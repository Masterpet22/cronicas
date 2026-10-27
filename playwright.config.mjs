import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["smoke.spec.mjs", "dojo-techniques.spec.mjs", "transportation.spec.mjs", "combat-tutorial.spec.mjs", "character-creator.spec.mjs", "doctor-route.spec.mjs", "doctor-cipher.spec.mjs", "elemental-effects.spec.mjs", "level-up.spec.mjs", "mission-transitions.spec.mjs", "phase-transitions.spec.mjs", "performance.spec.mjs", "arena-visuals.spec.mjs"],
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/static-server.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  }
});
