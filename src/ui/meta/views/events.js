import { worldDate, monthOf, monthLength, shiftMonth, calendarMonth, monthLabel, dateLabel, eventDateLabel, dateNumber, addDays, eventsBetween, plazaSchedule, EVENT_TYPES, eventProgress, eventCatalog, calendarDayComment, calendarDayActions, actOnPlazaEvent } from "../../../plaza-events.js?v=0.130.0";
import { normalizeBirthday, BIRTHDAY_MONTHS } from "../../../birthday.js?v=0.127.0";

export function createEventsView(deps) {
  let save, host, scope, today, month, selectedDay, timer = null, selectedEvent = null, message = "";
  const escape = deps.escapeHtml;
  const clock = () => worldDate();
  const schedule = () => plazaSchedule(today, eventCatalog(save));
  const monthEvents = () => eventsBetween(`${month}-01`, `${month}-${monthLength(month)}`, eventCatalog(save));
  const commentSelectedDay = () => deps.onCalendarComment?.(calendarDayComment(save, selectedDay, clock()), calendarDayActions(save, selectedDay).map(action => ({
    ...action, onSelect() {
      if (!scope?.isCurrent()) return;
      if (action.destination) return deps.onNavigate(action.destination);
      selectedEvent = action.eventKey; paint();
      const detail = host.querySelector("[data-event-detail]");
      if (!detail) return;
      detail.tabIndex = -1;
      const target = detail.querySelector("button:not(:disabled)") || detail;
      target.scrollIntoView({ block: "nearest" }); target.focus({ preventScroll: true });
    }
  })));
  const onDay = (events, day) => events.filter(event => event.startDay <= dateNumber(day) && event.endDay >= dateNumber(day));
  const typeTag = event => `<span class="event-type-tag" style="--event-color:${EVENT_TYPES[event.type].color}">${EVENT_TYPES[event.type].label}</span>`;
  const pendingTag = event => event.pending ? `<small class="event-pending">${event.pending === "server" ? "Pendiente de servidor" : "Combates por definir"}</small>` : "";
  function birthdayDialog() {
    const birthday = normalizeBirthday(save.character.birthday);
    return `<dialog class="birthday-dialog" data-birthday-dialog aria-labelledby="birthday-title"><form data-birthday-form><p class="eyebrow">CALENDARIO PERSONAL</p><h2 id="birthday-title">Mi cumpleaños</h2><p>Elige el día y mes de tu personaje. No se guarda el año de nacimiento.</p><div><label>Día<input name="birthdayDay" type="number" min="1" max="31" required value="${birthday?.day || 1}"></label><label>Mes<select name="birthdayMonth">${BIRTHDAY_MONTHS.map((name, index) => `<option value="${index + 1}" ${index + 1 === (birthday?.month || 1) ? "selected" : ""}>${name}</option>`).join("")}</select></label></div><small>Si eliges el 29 de febrero, en años no bisiestos se celebra el 28.</small><footer><button type="submit">Guardar fecha</button><button type="button" data-cancel-birthday>Cancelar</button>${birthday ? '<button type="button" data-clear-birthday>Quitar fecha</button>' : ""}</footer></form></dialog>`;
  }
  function countdown() {
    const { next, daysUntil, active } = schedule();
    return `<div class="events-countdown" role="status" data-event-countdown>${next ? `<strong>${daysUntil}<small>${daysUntil === 1 ? "día" : "días"}</small></strong><span>PARA EL PRÓXIMO EVENTO<b>${escape(next.title)}</b><small>${escape(dateLabel(next.start))}</small>${pendingTag(next)}</span>` : `<span>${active.length ? "Disfruta del evento en curso" : "Sin próximos eventos anunciados"}<b>Revisa el calendario de la plaza</b></span>`}</div>`;
  }
  function eventDetails(event) {
    const progress = eventProgress(save, event), day = dateNumber(today);
    const status = day < event.startDay ? `Comienza en ${event.startDay - day} ${event.startDay - day === 1 ? "día" : "días"}` : day > event.endDay ? "Finalizado" : "En curso";
    return `<article class="event-detail" data-event-detail="${event.id}" data-event-key="${event.key}" style="--event-color:${EVENT_TYPES[event.type].color}">${typeTag(event)}${pendingTag(event)}<h3>${escape(event.title)}</h3><p class="event-dates">${escape(eventDateLabel(event))}</p><strong class="event-status">${status}</strong><p>${escape(event.summary)}</p><p>${escape(event.description)}</p>${status === "En curso" ? `${activityContents(event)}${progress.required ? `<div class="event-activity-progress"><span>Tu participación</span><strong>${progress.count}/${progress.required}</strong><progress value="${progress.count}" max="${progress.required}" aria-label="Progreso de participación"></progress></div>` : ""}` : ""}${progress.completed ? '<p class="event-completed" role="status">✓ Participaste en esta edición</p>' : ""}</article>`;
  }
  function calendarContents() {
    const events = monthEvents(), dayEvents = onDay(events, selectedDay);
    const selected = dayEvents.find(event => event.key === selectedEvent) || dayEvents[0];
    const cells = calendarMonth(month);
    const dayPicker = dayEvents.length > 1 ? `<nav class="events-overlap" aria-label="Actividades del día">${dayEvents.map(event => `<button type="button" data-select-event="${event.key}" aria-pressed="${selected?.key === event.key}">${escape(event.title)}</button>`).join("")}</nav>` : "";
    return `<div class="events-calendar-layout"><section class="events-calendar-card" aria-label="Calendario mensual"><header class="events-month-nav"><button type="button" data-event-month="-1" aria-label="Mes anterior">‹</button><h3>${escape(monthLabel(month))}</h3><button type="button" data-event-month="1" aria-label="Mes siguiente">›</button><button type="button" data-event-today>Hoy</button></header><table class="events-calendar" aria-label="${escape(monthLabel(month))}"><thead><tr>${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => `<th scope="col">${day}</th>`).join("")}</tr></thead><tbody>${Array.from({ length: 6 }, (_, row) => `<tr>${cells.slice(row * 7, row * 7 + 7).map(day => {
      if (!day) return '<td class="event-empty-day" aria-hidden="true"></td>';
      const items = onDay(events, day);
      const marks = items.slice(0, 2);
      return `<td><button type="button" data-event-day="${day}" aria-label="${escape(dateLabel(day))}${items.length ? `: ${escape(items.map(event => event.title).join(", "))}` : ": sin eventos"}" aria-pressed="${selectedDay === day}" ${today === day ? 'aria-current="date"' : ""} tabindex="${selectedDay === day ? 0 : -1}"><span class="event-day-number">${Number(day.slice(-2))}</span><span class="event-day-marks">${marks.map(item => `<span style="--event-color:${EVENT_TYPES[item.type].color}" title="${escape(item.title)}">${escape(item.shortLabel || EVENT_TYPES[item.type].label)}</span>`).join("")}${items.length > 2 ? `<small>+${items.length - 2}</small>` : ""}</span></button></td>`;
    }).join("")}</tr>`).join("")}</tbody></table><div class="events-legend" aria-label="Tipos de evento">${Object.values(EVENT_TYPES).map(type => `<span style="--event-color:${type.color}"><i></i>${type.label}</span>`).join("")}</div><small class="events-calendar-note">Calendario anual y mensual · Hora de Bolivia · Semana de domingo a sábado.</small></section><aside class="events-agenda"><header><p class="eyebrow">${escape(dateLabel(selectedDay))}</p><h3>${selected ? "Actividades del día" : "Un día en la aldea"}</h3></header>${dayPicker}${selected ? eventDetails(selected) : '<p class="event-free-day">No hay eventos programados para este día. Consulta las fechas marcadas del mes.</p>'}<h4>Eventos de ${escape(monthLabel(month))}</h4><div class="events-month-list">${events.map(event => `<button type="button" data-select-event="${event.key}" style="--event-color:${EVENT_TYPES[event.type].color}"><small>${EVENT_TYPES[event.type].label} · ${event.start === event.end ? Number(event.start.slice(-2)) : `${Number(event.start.slice(-2))}–${Number(event.end.slice(-2))}`}</small><strong>${escape(event.title)}</strong></button>`).join("") || '<p>No hay eventos anunciados para este mes.</p>'}</div></aside></div>`;
  }
  function activityContents(event) {
    if (event.activity !== "conversation") return `<div class="event-announcement"><span aria-hidden="true">${EVENT_TYPES[event.type].symbol}</span><h4>${event.pending === "server" ? "Visita pendiente de servidor" : event.pending === "details" ? "Combates especiales por definir" : event.activity === "tower" ? "Desafío en la Torre" : "Celebración de la aldea"}</h4>${event.destination ? `<button type="button" data-event-destination="${event.destination}">${event.destination === "tower" ? "Ir a la Torre de Desafíos" : "Ver Arena de Combate"}</button>` : ""}${event.pending === "server" ? '<button type="button" disabled>Requiere conexión al servidor</button>' : ""}</div>`;
    if (event.activity === "conversation") {
      const guest = deps.npcs[event.guest];
      return `<div class="event-guest"><img src="${guest.image}?v=${deps.assetVersion}" width="1145" height="1374" alt="${escape(guest.name)}"><div><p class="eyebrow">VISITA DE LA ALDEA</p><h3>${escape(guest.name)}</h3><p>${escape(guest.title)}</p><button type="button" data-event-talk>Conversar con ${escape(guest.name)}</button></div></div>`;
    }

  }
  function contents() {
    return `<header class="events-heading"><div><h2>El calendario de la aldea</h2></div><div class="events-heading-actions"><button type="button" data-open-birthday>Mi cumpleaños</button></div></header>${countdown()}<p class="events-feedback" role="status">${escape(message)}</p><div class="events-body">${calendarContents()}</div>${birthdayDialog()}`;
  }
  function paint(focus = null) {
    if (!host) return;
    host.innerHTML = contents();
    if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
  }
  function refreshDate() {
    const next = clock();
    if (today === next) return;
    today = next; month = monthOf(today); selectedDay = today; selectedEvent = null; message = "El calendario de la aldea se ha actualizado.";
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
    commentSelectedDay();
  }
  return {
    id: "events",
    render(state) {
      save = state.save; today = clock(); month = monthOf(today); selectedDay = today; selectedEvent = null; message = "";
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
        if (button.hasAttribute("data-open-birthday")) host.querySelector("[data-birthday-dialog]").showModal();
        else if (button.hasAttribute("data-cancel-birthday")) host.querySelector("[data-birthday-dialog]").close();
        else if (button.hasAttribute("data-clear-birthday")) { save = deps.onPersist({ ...save, character: { ...save.character, birthday: null } }); message = "Fecha de cumpleaños retirada."; paint("[data-open-birthday]"); }
        else if (button.dataset.eventDestination) deps.onNavigate(button.dataset.eventDestination);
        else if (button.hasAttribute("data-event-month")) { month = shiftMonth(month, Number(button.dataset.eventMonth)); selectedDay = `${month}-01`; selectedEvent = null; paint(`[data-event-month="${button.dataset.eventMonth}"]`); commentSelectedDay(); }
        else if (button.hasAttribute("data-event-today")) selectDay(today, true);
        else if (button.dataset.eventDay) selectDay(button.dataset.eventDay, true);
        else if (button.dataset.selectEvent) {
          const chosen = monthEvents().find(item => item.key === button.dataset.selectEvent); if (!chosen) return;
          selectedEvent = chosen.key;
          if (!onDay([chosen], selectedDay).length) selectedDay = chosen.start < `${month}-01` ? `${month}-01` : chosen.start;
          paint();
          commentSelectedDay();
        } else {
          const key = button.closest("[data-event-key]")?.dataset.eventKey;
          const current = monthEvents().find(event => event.key === key);
          if (!current || current.startDay > dateNumber(clock()) || current.endDay < dateNumber(clock())) return refreshDate();
          if (button.hasAttribute("data-event-talk")) {
            const guest = deps.npcs[current.guest];
            deps.showDialogue(current.dialogue.map(text => [guest.name, text]), () => { if (scope.isCurrent()) act(current, "talk"); }, "VOLVER A LA PLAZA");
          }
        }
      });
      scope.listen(host, "submit", event => {
        if (!event.target.matches("[data-birthday-form]")) return;
        event.preventDefault();
        const data = new FormData(event.target), birthday = normalizeBirthday({ day: Number(data.get("birthdayDay")), month: Number(data.get("birthdayMonth")) });
        if (!birthday) { event.target.querySelector("input").setCustomValidity("Elige una fecha válida para este mes."); event.target.reportValidity(); return; }
        save = deps.onPersist({ ...save, character: { ...save.character, birthday } }); message = "Cumpleaños guardado en el calendario de tu personaje."; paint("[data-open-birthday]");
      });
      scope.listen(host, "change", event => {
        const form = event.target.closest("[data-birthday-form]"); if (!form) return;
        const day = form.querySelector("input"); day.setCustomValidity(""); day.max = new Date(Date.UTC(2000, Number(form.querySelector("select").value), 0)).getUTCDate();
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
