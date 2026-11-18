import { advanceTimelineProgress, millisecondsToTimelineThreshold } from "./timeline.js?v=0.69.0";

// Every participant keeps its own clock and reserved action. The selected target
// is deliberately absent: changing selection must never reset anyone's turn.
export function nextGroupTimelineStep(participants) {
  const alive = participants.filter(unit => unit.alive);
  if (!alive.length) return null;
  const timings = alive.map(unit => ({ ...unit, duration: millisecondsToTimelineThreshold(
    unit.progress, unit.speed, unit.action, unit.initiative) }));
  const duration = Math.min(...timings.map(unit => unit.duration));
  const arrivals = timings.filter(unit => Math.abs(unit.duration - duration) < .5)
    .sort((a, b) => {
      const priority = unit => unit.action ? 0 : unit.id === "player" ? 2 : 1;
      return priority(a) - priority(b) || (a.id === "player" ? -1 : b.id === "player" ? 1 : a.index - b.index);
    });
  return { duration, arrival: arrivals[0], progress: Object.fromEntries(timings.map(unit => [unit.id,
    advanceTimelineProgress(unit.progress, unit.speed, duration, unit.action, unit.initiative)])) };
}
