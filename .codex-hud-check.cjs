const fs = require("node:fs");

(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pages = await (await fetch("http://127.0.0.1:9223/json/list")).json();
  const page = pages.find((entry) => entry.url === "http://127.0.0.1:4173/");
  if (!page) throw new Error("No se encontró la página del juego");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const save = {
    version: 5,
    character: { name: "Akio", affinity: "fuego", affinities: ["fuego"], affinityXp: { fuego: 50, agua: 0, viento: 0, tierra: 0 }, appearance: "#68a8ff", bodyType: "male", face: 1, hair: 1, top: 1, bottom: 1, shoes: 1 },
    progression: { level: 2, xp: 0, coins: 0, attributePoints: 0, attributes: { power: 0, agility: 0, focus: 0 } },
    equipment: { weapon: "kunai", armor: "light_vest", accessory: "chakra_charm", companion: null },
    loadout: [],
    campaign: { completedMissions: [], rank: "Novicio", elementRank: 1, tutorialSeen: true, companion: null }
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await evaluate(`localStorage.setItem("cronicas-del-sello-save", ${JSON.stringify(JSON.stringify(save))}); localStorage.setItem("hud-theme", "lunar"); location.reload();`);
  await wait(2200);
  await evaluate(`document.querySelector('[data-go="headquarters"]')?.click(); true`);
  await wait(500);
  for (let index = 0; index < 5; index += 1) {
    const ready = await evaluate(`!document.querySelector("[data-stage-options]")?.hidden`);
    if (ready) break;
    await evaluate(`document.querySelector("[data-stage-next]")?.click(); true`);
    await wait(180);
  }
  await evaluate(`document.querySelector('[data-saga="saga-1"]')?.click(); true`);
  await wait(350);
  await evaluate(`document.querySelector('[data-mission="m01"]')?.click(); true`);
  await wait(250);
  for (let index = 0; index < 2; index += 1) {
    await evaluate(`document.querySelector(".dialogue-overlay button")?.click(); true`);
    await wait(220);
  }
  await wait(3300);
  const sceneState = await evaluate(`(() => { const scene = Phaser.GAMES[0]?.scene?.getScene("battle"); if (!scene) return null; scene.enemy.hp = Math.round(scene.enemy.maxHp * 0.6); scene.refreshHud(); return { active: scene.scene.isActive(), hp: scene.enemy.hp, maxHp: scene.enemy.maxHp, theme: scene.hudTheme, frameWidth: scene.hudFrames.health[0].displayWidth, playerFillWidth: scene.playerHpBar.fill.width, enemyFillWidth: scene.enemyHpBar.fill.width, enemyFillX: scene.enemyHpBar.fill.x, enemyOrigin: scene.enemyHpBar.fill.originX }; })()`);
  await wait(250);
  const lunar = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync("C:/Users/epren/AppData/Local/Temp/codex-hud-lunar-0445.png", Buffer.from(lunar.data, "base64"));
  await evaluate(`(() => { const select = document.getElementById("hud-theme"); select.value = "ancestral"; select.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);
  await wait(350);
  const ancestral = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync("C:/Users/epren/AppData/Local/Temp/codex-hud-ancestral-0445.png", Buffer.from(ancestral.data, "base64"));
  console.log(JSON.stringify(sceneState));
  socket.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
