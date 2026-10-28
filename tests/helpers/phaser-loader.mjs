export async function ensurePhaser(page) {
  await page.evaluate(async () => {
    const { loadPhaser } = await import("/src/battle/load-phaser.js?v=1.0.0");
    await loadPhaser();
  });
}
