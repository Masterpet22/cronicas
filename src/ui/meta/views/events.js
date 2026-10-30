import { worldDate, monthOf, monthLength, shiftMonth, calendarMonth, monthLabel, dateLabel, eventDateLabel, dateNumber, addDays, eventsBetween, plazaSchedule, EVENT_TYPES, eventProgress, eventQuizQuestion, actOnPlazaEvent } from "../../../plaza-events.js?v=0.123.0";
import { elementName } from "../../../elements.js?v=0.20.0";

export function createEventsView(deps) {
  let save, host, scope, today, month, selectedDay, timer = null, selectedEvent = null, liveKey = null, forceCalendar = false, message = "";
  const escape = deps.escapeHtml;
  const clock = () => worldDate();
  const schedule = () => plazaSchedule(today);
  const monthEvents = () => eventsBetween(`${month}-01`, `${month}-${monthLength(month)}`);
  const onDay = (events, day) => events.filter(event => event.startDay <= dateNumber(day) && event.endDay >= dateNumber(day));
  const typeTag = event => `<span class="event-type-tag" style="--event-color:${EVENT_TYPES[event.type].color}">${EVENT_TYPES[event.type].label}</span>`;
  function countdown() {
    const { next, daysUntil, active } = schedule();
    return `<div class="events-countdown" role="status" data-event-countdown>${next ? `<strong>${daysUntil}<small>${daysUntil === 1 ? "día" : "días"}</small></strong><span>PARA EL PRÓXIMO EVENTO<b>${escape(next.title)}</b><small>${escape(dateLabel(next.start))}</small></span>` : `<span>${active.length ? "Disfruta del evento en curso" : "Sin próximos eventos anunciados"}<b>Revisa el calendario de la plaza</b></span>`}</div>`;
  }
  function eventDetails(event) {
    const progress = eventProgress(save, event), day = dateNumber(today);
    const status = day < event.startDay ? `Comienza en ${event.startDay - day} ${event.startDay - day === 1 ? "día" : "días"}` : day > event.endDay ? "Finalizado" : "En curso";
    return `<article class="event-detail" style="--event-color:${EVENT_TYPES[event.type].color}">${typeTag(event)}<h3>${escape(event.title)}</h3><p class="event-dates">${escape(eventDateLabel(event))}</p><strong class="event-status">${status}</strong><p>${escape(event.summary)}</p><p>${escape(event.description)}</p>${progress.completed ? '<span class="event-participated">✓ Participaste en esta edición</span>' : ""}${status === "En curso" ? `<button type="button" data-open-live="${event.key}">Ir al evento</button>` : ""}</article>`;
  }
  function calendarContents() {
    const events = monthEvents(), dayEvents = onDay(events, selectedDay);
    const selected = dayEvents.find(event => event.key === selectedEvent) || dayEvents[0];
    const cells = calendarMonth(month);
    return `<div class="events-calendar-layout"><section class="events-calendar-card" aria-label="Calendario mensual"><header class="events-month-nav"><button type="button" data-event-month="-1" aria-label="Mes anterior">‹</button><h3>${escape(monthLabel(month))}</h3><button type="button" data-event-month="1" aria-label="Mes siguiente">›</button><button type="button" data-event-today>Hoy</button></header><table class="events-calendar" aria-label="${escape(monthLabel(month))}"><thead><tr>${["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(day => `<th scope="col">${day}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: 6 }, (_, row) => `<tr>${cells.slice(row * 7, row * 7 + 7).map(day => {
      if (!day) return '<td class="event-empty-day" aria-hidden="true"></td>';
      const items = onDay(events, day);
      const labels = [...new Set(items.map(event => event.type))];
      return `<td><button type="button" data-event-day="${day}" aria-label="${escape(dateLabel(day))}${items.length ? `: ${escape(items.map(event => event.title).join(", "))}` : ": sin eventos"}" aria-pressed="${selectedDay === day}" ${today === day ? 'aria-current="date"' : ""} tabindex="${selectedDay === day ? 0 : -1}"><span class="event-day-number">${Number(day.slice(-2))}</span><span class="event-day-marks">${labels.map(type => `<span style="--event-color:${EVENT_TYPES[type].color}" title="${EVENT_TYPES[type].label}">${EVENT_TYPES[type].label}</span>`).join("")}</span></button></td>`;
    }).join("")}</tr>`).join("")}</tbody></table><div class="events-legend" aria-label="Tipos de evento">${Object.values(EVENT_TYPES).map(type => `<span style="--event-color:${type.color}"><i></i>${type.label}</span>`).join("")}</div><small class="events-calendar-note">Programa mensual de la aldea · Fechas según la hora de Bolivia.</small></section><aside class="events-agenda"><header><p class="eyebrow">${escape(dateLabel(selectedDay))}</p><h3>${selected ? "Evento seleccionado" : "Un día en la aldea"}</h3></header>${selected ? eventDetails(selected) : '<p class="event-free-day">No hay eventos programados para este día. Consulta las fechas marcadas del mes.</p>'}${dayEvents.length > 1 ? `<div class="events-overlap">${dayEvents.map(event => `<button type="button" data-select-event="${event.key}">${escape(event.title)}</button>`).join("")}</div>` : ""}<h4>Eventos de ${escape(monthLabel(month))}</h4><div class="events-month-list">${events.map(event => `<button type="button" data-select-event="${event.key}" style="--event-color:${EVENT_TYPES[event.type].color}"><small>${EVENT_TYPES[event.type].label} · ${Number(event.start.slice(-2))}–${Number(event.end.slice(-2))}</small><strong>${escape(event.title)}</strong></button>`).join("") || '<p>No hay eventos anunciados para este mes.</p>'}</div></aside></div>`;
  }
  function liveActivity(event) {
    const progress = eventProgress(save, event);
    if (event.activity === "lanterns") return `<div class="event-lanterns" role="group" aria-label="Faroles del festival">${["Valor", "Amistad", "Camino"].map((label, index) => `<button type="button" data-light-lantern="${index}" class="${progress.steps.includes(index) ? "is-lit" : ""}" aria-label="${progress.steps.includes(index) ? "Farol encendido" : "Encender farol"}: ${label}" ${progress.steps.includes(index) ? "disabled" : ""}><span class="event-paper-lantern" aria-hidden="true">灯</span><strong>${label}</strong><small>${progress.steps.includes(index) ? "Encendido" : "Encender"}</small></button>`).join("")}</div>`;
    if (event.activity === "conversation") {
      const guest = deps.npcs[event.guest];
      return `<div class="event-guest"><img src="${guest.image}?v=${deps.assetVersion}" width="1145" height="1374" alt="${escape(guest.name)}"><div><p class="eyebrow">INVITADA DE LA ALDEA</p><h3>${escape(guest.name)}</h3><p>${escape(guest.title)}</p><button type="button" data-event-talk>Conversar con ${escape(guest.name)}</button></div></div>`;
    }
    if (progress.completed) return '<div class="event-quiz-complete"><span aria-hidden="true">✦</span><h3>Has dominado el ciclo elemental</h3><p>Las tres respuestas son correctas. Vuelve en la próxima edición para participar de nuevo.</p></div>';
    const question = eventQuizQuestion(progress.count);
    return `<div class="event-quiz"><small>PREGUNTA ${progress.count + 1} DE ${event.steps}</small><h3>¿Qué afinidad básica tiene ventaja al atacar a ${elementName(question.target)}?</h3><div role="group" aria-label="Respuesta al desafío">${question.options.map(id => `<button type="button" data-event-answer="${id}"><img src="${deps.elementIcon(id)}" width="40" height="40" alt="">${elementName(id)}</button>`).join("")}</div></div>`;
  }
  function liveContents(active) {
    const event = active.find(item => item.key === liveKey) || active[0]; liveKey = event.key;
    const progress = eventProgress(save, event);
    const daysLeft = event.endDay - dateNumber(today);
    return `<section class="event-live" data-live-event="${event.id}" style="--event-color:${EVENT_TYPES[event.type].color}">${active.length > 1 ? `<nav class="events-live-tabs" aria-label="Eventos en curso">${active.map(item => `<button type="button" data-open-live="${item.key}" aria-pressed="${item.key === event.key}">${escape(item.title)}</button>`).join("")}</nav>` : ""}<div class="event-live-layout"><div class="event-live-stage"><header>${typeTag(event)}<span class="event-live-now">EN CURSO</span><h3>${escape(event.title)}</h3><p>${escape(event.summary)}</p></header>${liveActivity(event)}<div class="event-activity-progress"><span>Tu participación</span><strong>${progress.count}/${progress.required}</strong><progress value="${progress.count}" max="${progress.required}" aria-label="Progreso de participación"></progress></div>${progress.completed ? '<p class="event-completed" role="status">✓ Ya completaste esta edición. Tu participación queda guardada en esta partida.</p>' : ""}</div><aside class="event-live-info"><p class="eyebrow">PLAZA DEL HORIZONTE</p><h3>Información del evento</h3><p>${escape(event.description)}</p><dl><div><dt>Fechas</dt><dd>${escape(eventDateLabel(event))}</dd></div><div><dt>Duración restante</dt><dd>${daysLeft === 0 ? "Último día: termina hoy" : `${daysLeft} ${daysLeft === 1 ? "día" : "días"} hasta el último día`}</dd></div></dl><p class="event-participation-note">Estas actividades son opcionales y no gastan monedas ni objetos. Cada edición guarda su propia participación.</p><button type="button" data-event-calendar>Consultar calendario</button></aside></div></section>`;
  }
  function contents() {
    const { active } = schedule(), live = active.length > 0 && !forceCalendar;
    return `<header class="events-heading"><div><p class="eyebrow">NAO MATSURI · PLAZA DE EVENTOS</p><h2>${live ? "La aldea está de evento" : "El calendario de la aldea"}</h2></div>${active.length && forceCalendar ? '<button type="button" data-return-live>Volver al evento en curso</button>' : ""}</header>${countdown()}<p class="events-feedback" role="status">${escape(message)}</p><div class="events-body">${live ? liveContents(active) : calendarContents()}</div>`;
  }
  function paint(focus = null) {
    if (!host) return;
    host.innerHTML = contents();
    if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  }
  function refreshDate() {
    const next = clock();
    if (today === next) return;
    today = next; month = monthOf(today); selectedDay = today; selectedEvent = null; forceCalendar = false; message = "El calendario de la aldea se ha actualizado.";
    paint();
  }
  function act(event, action, value) {
    refreshDate();
    const result = actOnPlazaEvent(save, event.key, action, value, clock());
    if (result.ok) save = deps.onPersist(result.save);
    message = result.message; today = clock(); paint();
  }
  function selectDay(day, focus = false) {
    if (!Number.isFinite(dateNumber(day))) return;
    month = monthOf(day); selectedDay = day; selectedEvent = null;
    paint(focus ? `[data-event-day="${day}"]` : null);
  }
  return {
    id: "events",
    render(state) {
      save = state.save; today = clock(); month = monthOf(today); selectedDay = today; selectedEvent = null; liveKey = null; forceCalendar = false; message = "";
      return `<section class="events-plaza" aria-label="Calendario y eventos de la aldea">${contents()}</section>`;
    },
    mount(root, viewScope) {
      host = root.querySelector(".events-plaza"); scope = viewScope;
      timer = window.setInterval(refreshDate, 30000);
      scope.onCleanup(() => { window.clearInterval(timer); timer = null; host = null; });
      scope.listen(document, "visibilitychange", () => { if (!document.hidden) refreshDate(); });
      scope.listen(window, "focus", refreshDate);
      scope.listen(host, "click", event => {
        const button = event.target.closest("button"); if (!button || button.disabled) return;
        if (button.hasAttribute("data-event-month")) { month = shiftMonth(month, Number(button.dataset.eventMonth)); selectedDay = `${month}-01`; selectedEvent = null; paint(`[data-event-month="${button.dataset.eventMonth}"]`); }
        else if (button.hasAttribute("data-event-today")) selectDay(today, true);
        else if (button.dataset.eventDay) selectDay(button.dataset.eventDay, true);
        else if (button.dataset.selectEvent) {
          const chosen = monthEvents().find(item => item.key === button.dataset.selectEvent); if (!chosen) return;
          selectedEvent = chosen.key; selectedDay = chosen.start < `${month}-01` ? `${month}-01` : chosen.start; paint();
        } else if (button.hasAttribute("data-event-calendar")) { forceCalendar = true; month = monthOf(today); selectedDay = today; paint("[data-event-today]"); }
        else if (button.hasAttribute("data-return-live") || button.dataset.openLive) { forceCalendar = false; liveKey = button.dataset.openLive || null; paint(); }
        else {
          const active = schedule().active, current = active.find(item => item.key === liveKey) || active[0]; if (!current) return refreshDate();
          if (button.hasAttribute("data-light-lantern")) act(current, "light", Number(button.dataset.lightLantern));
          if (button.dataset.eventAnswer) act(current, "answer", button.dataset.eventAnswer);
          if (button.hasAttribute("data-event-talk")) {
            const guest = deps.npcs[current.guest];
            deps.showDialogue(current.dialogue.map(text => [guest.name, text]), () => { if (scope.isCurrent()) act(current, "talk"); }, "VOLVER A LA PLAZA");
          }
        }
      });
      scope.listen(host, "keydown", event => {
        if (!event.target.matches("[data-event-day]")) return;
        const change = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (change) { event.preventDefault(); selectDay(addDays(event.target.dataset.eventDay, change), true); }
      });
    },
    dispose() { window.clearInterval(timer); timer = null; host = null; }
  };
}
