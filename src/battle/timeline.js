export const TIMELINE_READY = 0.8;
export const TIMELINE_COMPLETE = 1;
export const TIMELINE_BASE_SPEED = 10;
export const TIMELINE_BASE_READY_MS = 1200;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function actionNeedsPreparation(action) {
  return Boolean(action?.preparation || action?.seals?.length);
}

export function timelineRate(speed, action = null) {
  const actionModifier = action ? finite(action.speedMod) : 0;
  const effectiveSpeed = Math.max(1, finite(speed, TIMELINE_BASE_SPEED) + actionModifier);
  return (TIMELINE_READY / TIMELINE_BASE_READY_MS) * (effectiveSpeed / TIMELINE_BASE_SPEED);
}

export function timelineThreshold(action = null) {
  return actionNeedsPreparation(action) ? TIMELINE_COMPLETE : TIMELINE_READY;
}

export function millisecondsToTimelineThreshold(progress, speed, action = null) {
  const current = clamp(finite(progress), 0, TIMELINE_COMPLETE);
  const threshold = timelineThreshold(action);
  if (current >= threshold) return 0;
  return (threshold - current) / timelineRate(speed, action);
}

export function advanceTimelineProgress(progress, speed, elapsedMs, action = null) {
  const threshold = timelineThreshold(action);
  return Math.min(threshold, clamp(finite(progress), 0, TIMELINE_COMPLETE) + timelineRate(speed, action) * Math.max(0, finite(elapsedMs)));
}

export function timelineMarkerPosition(progress, start, end) {
  return finite(start) + (finite(end) - finite(start)) * clamp(finite(progress), 0, TIMELINE_COMPLETE);
}

export function timelineMilestones(start, end) {
  return [0.2, 0.4, 0.6, 0.8].map((progress) => timelineMarkerPosition(progress, start, end));
}
