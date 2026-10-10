export const TRANSFORM_PROPERTIES = Object.freeze(["x", "y", "angle", "scaleX", "scaleY", "alpha"]);

export function addAnimationOffsets(base, offsets = {}) {
  return Object.fromEntries(Object.entries(offsets).map(([property, value]) => [property, base[property] + value]));
}

export function animationEase(progress, ease = "Sine.inOut") {
  const clamped = Math.max(0, Math.min(1, progress));
  if (ease.startsWith("Cubic")) return 1 - Math.pow(1 - clamped, 3);
  if (ease.startsWith("Quad")) return 1 - Math.pow(1 - clamped, 2);
  if (ease.startsWith("Back")) {
    const overshoot = 1.70158;
    return 1 + (overshoot + 1) * Math.pow(clamped - 1, 3) + overshoot * Math.pow(clamped - 1, 2);
  }
  return (1 - Math.cos(Math.PI * clamped)) / 2;
}

export function animationTrackProgress(track, elapsed, loop) {
  const time = Math.max(0, elapsed - (track.delay || 0));
  if (loop) {
    const cycle = track.yoyo ? track.duration * 2 : track.duration;
    let progress = (time % cycle) / track.duration;
    if (track.yoyo && progress > 1) progress = 2 - progress;
    return animationEase(progress, track.ease);
  }
  let progress = time / track.duration;
  if (track.yoyo) progress = progress <= 1 ? progress : Math.max(0, 2 - progress);
  else progress = Math.min(1, progress);
  return animationEase(progress, track.ease);
}

export function sampleAnimationPose(clip, elapsed) {
  const pose = {};
  clip.tracks.forEach((track) => {
    const enterDuration = track.from ? Number(clip.enterDuration || 0) : 0;
    const entering = enterDuration > 0 && elapsed < enterDuration;
    const progress = entering
      ? animationEase(elapsed / enterDuration, "Cubic.out")
      : animationTrackProgress(track, elapsed - enterDuration, clip.loop);
    pose[track.target] ||= {};
    Object.entries(track.to || {}).forEach(([property, end]) => {
      const from = Number(track.from?.[property] || 0);
      pose[track.target][property] = entering ? from * progress : from + (end - from) * progress;
    });
    Object.entries(track.from || {}).forEach(([property, start]) => {
      if (!(property in (track.to || {}))) pose[track.target][property] = start;
    });
  });
  return pose;
}

export function animationClipDuration(clip) {
  return Number(clip.enterDuration || 0) + Math.max(...clip.tracks.map((track) =>
    (track.delay || 0) + track.duration * (track.yoyo ? 2 : 1)
  ));
}
