// Shared route geometry for departures, returns and travel between encounters.
export function createTravelProgress(scene, { accent, departure, destination, returning = false, depth = 10, name = "travel" }) {
  const left = 300;
  const right = 660;
  const y = 486;
  const textStyle = { fontFamily: '"Alegreya Sans", "Segoe UI", sans-serif', fontSize: "11px", color: "#d6e7e4", fontStyle: "bold" };
  const track = scene.add.rectangle((left + right) / 2, y, right - left, 3, 0xdde8e5, 0.25)
    .setDepth(depth).setName(`${name}-progress-track`);
  // A fixed width and a scaled fill keep both travel directions anchored.
  const fill = scene.add.rectangle(returning ? right : left, y, right - left, 3, accent, 0.95)
    .setOrigin(returning ? 1 : 0, 0.5).setScale(0, 1).setDepth(depth + 1).setName(`${name}-progress`);
  const origin = scene.add.circle(returning ? right : left, y, 5, accent, 0.92).setDepth(depth + 2);
  const arrival = scene.add.circle(returning ? left : right, y, 5, 0xe4efed, 0.7).setDepth(depth + 2);
  const leftLabel = scene.add.text(left, y - 20, returning ? destination : departure, textStyle)
    .setOrigin(0, 0.5).setDepth(depth + 1).setName(`${name}-route-left`);
  const rightLabel = scene.add.text(right, y - 20, returning ? departure : destination, textStyle)
    .setOrigin(1, 0.5).setDepth(depth + 1).setName(`${name}-route-right`);
  const parts = [track, fill, origin, arrival, leftLabel, rightLabel];
  return { fill, parts, destroy: () => parts.forEach(part => part.destroy()) };
}
