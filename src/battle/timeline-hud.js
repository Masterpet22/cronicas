import { HUD_ART } from "./hud-art.js?v=0.171.0";
import { timelineMarkerPosition } from "./timeline.js?v=0.69.0";

// The portraits can move sideways in a crowded lane. Their anchors always
// mark the exact progress used by the combat engine.
export function layoutTimelinePortraits(entries) {
  const { start, end, trackY } = HUD_ART.timeline;
  const spacing = 29;
  const lanes = [[], []];
  const positions = entries.map(entry => ({ ...entry, anchor: timelineMarkerPosition(entry.progress, start, end) }));
  for (const position of [...positions].sort((a, b) => a.anchor - b.anchor)) {
    const lane = lanes[position.lane];
    position.x = Math.max(position.anchor, (lane.at(-1)?.x ?? start - spacing) + spacing);
    position.y = trackY + (position.lane ? 15 : -15);
    lane.push(position);
  }
  for (const lane of lanes) {
    let limit = end;
    for (let index = lane.length - 1; index >= 0; index--) {
      const position = lane[index];
      position.x = Math.min(position.x, limit);
      limit = position.x - spacing;
    }
  }
  return positions;
}

export function paintTimelinePortraits(scene, entries) {
  const { trackY } = HUD_ART.timeline;
  const { links, title } = scene.timelineThemeParts;
  const next = entries.find(({ id }) => id === (scene.turnReady ? "player" : scene.busy ? null : scene.timelineNextActor));
  const caption = next ? `${scene.turnReady ? "ACTÚA" : "SIGUE"} · ${next.name}` : "ORDEN DE TURNO";
  if (title.text !== caption) {
    title.setText(caption);
    title.setScale(Math.min(1, 244 / title.width));
  }
  links.clear();
  for (const { id, anchor, x, y, place } of layoutTimelinePortraits(entries)) {
    const highlighted = id === next?.id;
    const color = highlighted ? 0xffdf92 : 0xc3a77b;
    const edge = y < trackY ? y + 11 : y - 11;
    links.lineStyle(highlighted ? 1.8 : 1, color, highlighted ? 1 : .8)
      .lineBetween(anchor, trackY, x, edge);
    links.fillStyle(color, 1).fillCircle(anchor, trackY, highlighted ? 2.7 : 1.6);
    place(x, y, highlighted);
  }
}
