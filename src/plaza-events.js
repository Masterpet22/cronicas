import { PLAZA_EVENTS } from "./content/plaza-events.js?v=0.123.0";
import { AFFINITY_IDS, affinityCycleModifier } from "./affinity-system.js?v=0.114.0";
export { PLAZA_EVENTS, EVENT_TYPES } from "./content/plaza-events.js?v=0.123.0";
export const EVENT_TIME_ZONE = "America/La_Paz";
const DAY = 86400000;
const pad = value => String(value).padStart(2, "0");
export const dateKey = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;
export function dateNumber(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
  const [year, month, day] = key.split("-").map(Number);
  if (year < 1970 || year > 9999) return NaN;
  const stamp = Date.UTC(year, month - 1, day), date = new Date(stamp);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day ? stamp / DAY : NaN;
}
export function worldDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
export const addDays = (key, days) => new Date((dateNumber(key) + days) * DAY).toISOString().slice(0, 10);
export const monthOf = key => key.slice(0, 7);
export function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  if (date.getUTCFullYear() < 1970 || date.getUTCFullYear() > 9999) return monthKey;
  return date.toISOString().slice(0, 7);
}
export const monthLength = monthKey => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};
export function calendarMonth(monthKey) {
  const first = `${monthKey}-01`, length = monthLength(monthKey);
  const offset = (new Date(dateNumber(first) * DAY).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => index >= offset && index < offset + length ? `${monthKey}-${pad(index - offset + 1)}` : null);
}
export const monthLabel = monthKey => new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(dateNumber(`${monthKey}-01`) * DAY));
export const dateLabel = key => new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(dateNumber(key) * DAY));
export const eventDateLabel = event => event.start === event.end ? dateLabel(event.start) : `${dateLabel(event.start)} – ${dateLabel(event.end)}`;

function occurrence(event, monthKey) {
  const recurring = event.schedule?.monthly;
  let start = event.schedule?.start, end = event.schedule?.end || start;
  if (recurring) {
    if (recurring.months && !recurring.months.includes(Number(monthKey.slice(5)))) return null;
    if (recurring.from > monthLength(monthKey)) return null;
    start = `${monthKey}-${pad(recurring.from)}`;
    const endMonth = recurring.to < recurring.from ? shiftMonth(monthKey, 1) : monthKey;
    end = `${endMonth}-${pad(Math.min(recurring.to, monthLength(endMonth)))}`;
  }
  const startDay = dateNumber(start), endDay = dateNumber(end);
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay) return null;
  return { ...event, key: `${event.id}@${start}`, start, end, startDay, endDay };
}
export function eventsBetween(first, last, catalog = PLAZA_EVENTS) {
  const startDay = dateNumber(first), endDay = dateNumber(last);
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay) return [];
  const results = new Map();
  for (const event of catalog) {
    const months = [];
    if (event.schedule?.monthly) {
      for (let month = shiftMonth(monthOf(first), -1); month <= monthOf(last);) {
        months.push(month);
        const next = shiftMonth(month, 1); if (next === month) break; month = next;
      }
    } else months.push(monthOf(first));
    for (const month of months) {
      const item = occurrence(event, month);
      if (item && item.startDay <= endDay && item.endDay >= startDay) results.set(item.key, item);
    }
  }
  return [...results.values()].sort((a, b) => a.startDay - b.startDay || a.id.localeCompare(b.id));
}
export function plazaSchedule(today, catalog = PLAZA_EVENTS) {
  const day = dateNumber(today);
  if (!Number.isFinite(day)) return { active: [], next: null, daysUntil: null };
  const active = eventsBetween(today, today, catalog), future = [];
  for (const event of catalog) {
    let month = monthOf(today);
    // Ocho años cubren el 29 de febrero incluso al cruzar un siglo no bisiesto.
    for (let attempt = 0; attempt < (event.schedule?.monthly ? 97 : 1); attempt++) {
      const candidate = occurrence(event, month);
      if (candidate && candidate.startDay > day) { future.push(candidate); break; }
      const nextMonth = shiftMonth(month, 1); if (nextMonth === month) break; month = nextMonth;
    }
  }
  const next = future.sort((a, b) => a.startDay - b.startDay || a.id.localeCompare(b.id))[0] || null;
  return { active, next, daysUntil: next ? next.startDay - day : null };
}
export function eventByKey(key, catalog = PLAZA_EVENTS) {
  if (typeof key !== "string") return null;
  const [id, start, extra] = key.split("@");
  if (extra || !Number.isFinite(dateNumber(start))) return null;
  const event = catalog.find(entry => entry.id === id);
  const result = event && occurrence(event, monthOf(start));
  return result?.key === key ? result : null;
}
export const defaultEventState = () => ({ participation: {} });
export function normalizeEventState(candidate) {
  const participation = {};
  const source = candidate?.participation && typeof candidate.participation === "object" ? candidate.participation : {};
  for (const [key, record] of Object.entries(source).sort(([a], [b]) => a.split("@")[1]?.localeCompare(b.split("@")[1] || "") || 0).slice(-120)) {
    const event = eventByKey(key);
    if (!event || !Array.isArray(record?.steps)) continue;
    let steps = [...new Set(record.steps.filter(step => Number.isInteger(step) && step >= 0 && step < event.steps))].sort((a, b) => a - b);
    if (event.activity === "quiz") steps = steps.filter((step, index) => step === index);
    participation[key] = { steps };
  }
  return { participation };
}
export function eventProgress(save, event) {
  const steps = normalizeEventState(save.events).participation[event.key]?.steps || [];
  return { steps, count: steps.length, required: event.steps, completed: steps.length >= event.steps };
}
export function eventQuizQuestion(index) {
  const target = ["fuego", "agua", "tierra"][index];
  return target && { target, answer: AFFINITY_IDS.find(id => affinityCycleModifier(id, target) > 0), options: AFFINITY_IDS };
}
export function actOnPlazaEvent(save, key, action, value, today = worldDate()) {
  const event = eventByKey(key), day = dateNumber(today);
  const fail = message => ({ ok: false, save, message });
  if (!event || !Number.isFinite(day) || day < event.startDay || day > event.endDay) return fail("Este evento no está activo. Consulta las próximas fechas del calendario.");
  const progress = eventProgress(save, event);
  if (progress.completed) return fail("Ya completaste esta edición del evento.");
  let step;
  if (event.activity === "lanterns" && action === "light" && Number.isInteger(value) && value >= 0 && value < event.steps) step = value;
  else if (event.activity === "conversation" && action === "talk") step = 0;
  else if (event.activity === "quiz" && action === "answer") {
    if (value !== eventQuizQuestion(progress.count)?.answer) return fail("Esa afinidad no tiene ventaja contra el objetivo. Puedes intentarlo de nuevo.");
    step = progress.count;
  } else return fail("Actividad no disponible.");
  if (progress.steps.includes(step)) return fail("Ese farol ya está encendido.");
  const events = normalizeEventState(save.events);
  events.participation[key] = { steps: [...progress.steps, step].sort((a, b) => a - b) };
  const completed = events.participation[key].steps.length >= event.steps;
  return { ok: true, save: { ...save, events }, completed,
    message: completed ? "¡Participación completada! Tu participación en esta edición queda guardada." : event.activity === "quiz" ? "Respuesta correcta. Continúa con la siguiente pregunta." : "Farol encendido. Tu participación se ha guardado." };
}
