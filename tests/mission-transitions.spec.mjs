import { expect, test } from "@playwright/test";

async function bootTravel(page, direction, result = null, missionId = "m05") {
  // Let the app finish loading its save before the isolated scene supplies one.
  await expect(page.locator(".save-selector")).toBeVisible();
  await page.evaluate(async ({ direction, result, missionId }) => {
    const { MissionTravelScene } = await import("/src/battle/scenes/mission-travel-scene.js?v=0.98.0");
    const { battleRuntime } = await import("/src/battle/runtime.js?v=0.91.0");
    const { createCharacter, createDefaultSave } = await import("/src/save.js?v=0.94.0");
    const { ALL_MISSIONS } = await import("/src/content/index.js");
    battleRuntime.activeSave = createCharacter(createDefaultSave(), { name: "Kira", affinity: "fuego", bodyType: "male", appearance: "#315f87" });
    battleRuntime.activeMission = ALL_MISSIONS.find((mission) => mission.id === missionId);
    const secondaryResult = battleRuntime.activeMission.category === "secondary";
    battleRuntime.renderResolution = 1;
    const stage = document.createElement("div");
    stage.id = "mission-travel-test-stage";
    stage.style.cssText = "width:960px;height:540px";
    document.body.append(stage);
    const state = { stage, reached: null, payload: null, arrival: null, particles: null, departureFrame: null, game: null };
    window.__missionTravelTest = state;
    class BootScene extends window.Phaser.Scene {
      constructor() { super("boot-mission-travel"); }
      create() {
        const travel = this.scene.get("travel");
        travel.events.once(window.Phaser.Scenes.Events.CREATE, () => {
          state.arrival = travel.children.getByName("travel-arrival")?.text;
          state.particles = Boolean(travel.children.getByName("travel-atmosphere-particles"));
          const runner = travel.children.getByName("travel-runner");
          const progress = travel.children.getByName("travel-progress");
          state.departureFrame = { runnerX: runner?.x, runnerScaleX: runner?.scaleX,
            progressX: progress?.x, progressOriginX: progress?.originX,
            arenaAlpha: travel.children.getByName("travel-arena-preview")?.alpha };
        });
        this.scene.start("travel", { direction, secondaryResult, ...(result ? { result } : {}) });
      }
    }
    class DestinationScene extends window.Phaser.Scene {
      constructor() { super(direction === "toVillage" ? secondaryResult ? "secondary-results" : "results" : "battle"); }
      create(data) { state.reached = this.scene.key; state.payload = data; }
    }
    state.game = new window.Phaser.Game({ type: window.Phaser.CANVAS, parent: stage, width: 960, height: 540,
      scene: [BootScene, MissionTravelScene, DestinationScene] });
  }, { direction, result, missionId });
  await expect.poll(() => page.evaluate(() => window.__missionTravelTest.arrival), { timeout: 20_000 }).not.toBeNull();
}

test("el viaje a la misión usa parallax, cámara, partículas y llegada contextual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await bootTravel(page, "toMission");
  await expect.poll(() => page.evaluate(() => {
    const scene = window.__missionTravelTest.game.scene.getScene("travel");
    return scene.children.getByName("travel-progress")?.displayWidth > 60;
  })).toBe(true);
  const during = await page.evaluate(() => {
    const scene = window.__missionTravelTest.game.scene.getScene("travel");
    return {
      particles: Boolean(scene.children.getByName("travel-atmosphere-particles")),
      arenaPreview: Boolean(scene.children.getByName("travel-arena-preview")),
      label: scene.children.getByName("travel-mission-label")?.text,
      arrival: scene.children.getByName("travel-arrival")?.text,
      zooming: scene.cameras.main.zoom > 1
    };
  });
  expect(during).toEqual({ particles: true, arenaPreview: true, label: "MISIÓN 05 · RANGO D", arrival: "EL ENCUENTRO SE ACERCA", zooming: true });
  await expect.poll(() => page.evaluate(() => window.__missionTravelTest.game.scene.getScene("travel").children.getByName("travel-arrival")?.alpha)).toBeGreaterThan(0.9);
  await page.locator("#mission-travel-test-stage canvas").screenshot({ path: "test-results/mission-transition-preview.png" });
  await expect.poll(() => page.evaluate(() => window.__missionTravelTest.reached)).toBe("battle");
  await page.evaluate(() => {
    const state = window.__missionTravelTest;
    state.game.destroy(true);
    state.stage.remove();
    delete window.__missionTravelTest;
  });
  expect(errors).toEqual([]);
});

test("el regreso reducido llega al informe con el resultado intacto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await bootTravel(page, "toVillage", { outcome: "completed", levelUpShown: true, missionTitle: "El jefe de los bandidos" });
  await expect.poll(() => page.evaluate(() => window.__missionTravelTest.arrival)).toBe("OBJETIVO CUMPLIDO");
  expect(await page.evaluate(() => window.__missionTravelTest.particles)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__missionTravelTest.reached)).toBe("results");
  const outcome = await page.evaluate(() => {
    const state = window.__missionTravelTest;
    const payload = state.payload;
    state.game.destroy(true);
    state.stage.remove();
    delete window.__missionTravelTest;
    return payload;
  });
  expect(outcome).toMatchObject({ outcome: "completed", levelUpShown: true });
  expect(errors).toEqual([]);
});

for (const { missionId, reducedMotion, destination, arenaAlpha } of [
  { missionId: "m05", reducedMotion: "no-preference", destination: "results", arenaAlpha: 1 },
  { missionId: "s01", reducedMotion: "reduce", destination: "secondary-results", arenaAlpha: undefined }
]) {
  test(`el regreso de ${missionId} rellena la ruta hacia la izquierda sin rebasar sus extremos`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await bootTravel(page, "toVillage", { outcome: "completed", levelUpShown: true }, missionId);
    await expect.poll(() => page.evaluate(() => window.__missionTravelTest.departureFrame)).not.toBeNull();
    expect(await page.evaluate(() => window.__missionTravelTest.departureFrame)).toMatchObject({
      runnerX: 1050, runnerScaleX: -1, progressX: 660, progressOriginX: 1, arenaAlpha
    });
    await expect.poll(() => page.evaluate(() => {
      const scene = window.__missionTravelTest.game.scene.getScene("travel");
      const runner = scene.children.getByName("travel-runner");
      const progress = scene.children.getByName("travel-progress");
      return runner?.x < 420 && progress?.displayWidth > 180;
    }), { intervals: [50] }).toBe(true);
    const fill = await page.evaluate(() => {
      const progress = window.__missionTravelTest.game.scene.getScene("travel").children.getByName("travel-progress");
      const transform = progress.getWorldTransformMatrix();
      return {
        left: transform.transformPoint(-progress.displayOriginX, 0).x,
        right: transform.transformPoint(progress.width - progress.displayOriginX, 0).x
      };
    });
    expect(fill.right).toBeCloseTo(660, 3);
    expect(fill.left).toBeGreaterThanOrEqual(300);
    expect(fill.left).toBeLessThan(480);
    await page.locator("#mission-travel-test-stage canvas").screenshot({ path: `test-results/mission-return-${missionId}-preview.png` });
    await expect.poll(() => page.evaluate(() => window.__missionTravelTest.reached)).toBe(destination);
    await page.evaluate(() => {
      const state = window.__missionTravelTest;
      state.game.destroy(true);
      state.stage.remove();
      delete window.__missionTravelTest;
    });
    expect(errors).toEqual([]);
  });
}
