const $ = (selector) => document.querySelector(selector);

const DOSE_GRACE_MINUTES = 15;

const calendarState = {
  viewDate: new Date(),
  openDateKey: "",
  lastMedications: [],
  lastSelectedPetId: "",
};

export const ui = {
  authPortal: $("#authPortal"),
  ownerPortal: $("#ownerPortal"),
  tabLogin: $("#tabLogin"),
  tabSignup: $("#tabSignup"),
  signupFields: $("#signupFields"),
  authSubmitBtn: $("#authSubmitBtn"),
  welcomeGreeting: $("#welcomeGreeting"),
  petFilterBar: $("#petFilterBar"),
  petSelector: $("#petSelector"),
  medList: $("#medList"),
  calendarGrid: $("#calendarGrid"),
  dynamicTimeContainer: $("#dynamicTimeContainer"),
  petModal: $("#petModal"),
  editPetModal: $("#editPetModal"),
};

export function setAuthMode(mode) {
  const isSignup = mode === "signup";

  ui.signupFields.classList.toggle("hidden", !isSignup);
  ui.authSubmitBtn.textContent = isSignup ? "Create my account" : "Log in";

  ui.tabLogin.className = isSignup
    ? "w-1/2 py-2.5 rounded-xl font-black text-sm text-stone-500 hover:text-stone-800 transition-all"
    : "w-1/2 py-2.5 rounded-xl font-black text-sm bg-white text-[#CC5500] shadow-sm transition-all";

  ui.tabSignup.className = isSignup
    ? "w-1/2 py-2.5 rounded-xl font-black text-sm bg-white text-[#CC5500] shadow-sm transition-all"
    : "w-1/2 py-2.5 rounded-xl font-black text-sm text-stone-500 hover:text-stone-800 transition-all";
}

export function showDashboard(ownerName) {
  ui.authPortal.classList.add("hidden");
  ui.ownerPortal.classList.remove("hidden");
  ui.welcomeGreeting.textContent = `Hi, ${ownerName}`;
}

export function showAuth() {
  ui.authPortal.classList.remove("hidden");
  ui.ownerPortal.classList.add("hidden");
}

export function renderPetControls(pets, selectedPetId) {
  ui.petSelector.innerHTML = "";
  ui.petFilterBar.innerHTML = "";

  if (pets.length === 0) {
    ui.petSelector.innerHTML = "<option>No pets yet</option>";
    ui.petFilterBar.innerHTML = '<span class="text-sm font-bold text-stone-400">No pets yet</span>';
    return;
  }

  pets.forEach((pet, index) => {
    const option = document.createElement("option");
    option.value = pet.id;
    option.textContent = pet.name;
    option.selected = pet.id === selectedPetId;
    ui.petSelector.append(option);

    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center gap-1";

    const filterButton = document.createElement("button");
    filterButton.type = "button";
    filterButton.dataset.action = "select-pet";
    filterButton.dataset.petId = pet.id;
    filterButton.className = pet.id === selectedPetId
      ? "px-4 py-2 rounded-xl text-white font-black text-sm shadow-sm"
      : "px-4 py-2 rounded-xl bg-stone-100 text-stone-500 font-black text-sm hover:bg-stone-200";
    filterButton.style.backgroundColor = pet.id === selectedPetId ? pet.color : "";
    filterButton.textContent = pet.name;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.action = "edit-pet";
    editButton.dataset.petIndex = index;
    editButton.className = "w-9 h-9 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-400 font-black text-xs";
    editButton.textContent = "Edit";
    editButton.title = `Edit ${pet.name}`;

    wrapper.append(filterButton, editButton);
    ui.petFilterBar.append(wrapper);
  });
}

export function renderTimeInputs(frequency) {
  const counts = {
    daily: 1,
    "twice-daily": 2,
    "thrice-daily": 3,
    weekly: 1,
    monthly: 1,
    "as-needed": 0,
  };

  const count = counts[frequency] ?? 1;

  if (count === 0) {
    ui.dynamicTimeContainer.innerHTML = '<p class="text-xs font-bold text-stone-400 px-1">No set dose times needed. You can still keep notes and track inventory.</p>';
    return;
  }

  ui.dynamicTimeContainer.innerHTML = Array.from({ length: count }, (_, index) => `
    <div>
      <label class="block text-xs font-bold text-stone-500 mb-1 px-1">Dose time ${index + 1}</label>
      <input type="time" class="dose-time w-full p-3 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-[#CC5500]" required value="${defaultDoseTime(index, count)}" />
    </div>
  `).join("");
}

export function renderMedications(medications, pets, selectedPetId) {
  const visibleMeds = medications.filter((med) => med.petId === selectedPetId);

  ui.medList.className = "grid sm:grid-cols-2 xl:grid-cols-3 gap-3";

  if (!selectedPetId) {
    ui.medList.innerHTML = emptyState("Add a pet before making a medication plan.");
    return;
  }

  if (visibleMeds.length === 0) {
    ui.medList.innerHTML = emptyState("No medications yet for this pet.");
    return;
  }

  ui.medList.innerHTML = visibleMeds.map((med) => renderMedicationCard(med, pets)).join("");
}

export function renderCalendar(medications, selectedPetId) {
  calendarState.lastMedications = medications;
  calendarState.lastSelectedPetId = selectedPetId;
  ui.calendarGrid.className = "space-y-4";

  if (!selectedPetId) {
    ui.calendarGrid.innerHTML = emptyCalendarState("Add a pet to see medication history.");
    return;
  }

  const petMeds = medications.filter((med) => med.petId === selectedPetId);
  const petName = getSelectedPetName();
  const year = calendarState.viewDate.getFullYear();
  const month = calendarState.viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = firstDay.getDay();
  const monthTitle = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(firstDay);

  const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<div class="text-center text-[10px] font-black text-stone-400 uppercase tracking-wider">${day}</div>`)
    .join("");

  const blanks = Array.from({ length: firstWeekday }, () => '<div class="hidden sm:block min-h-28 rounded-2xl"></div>').join("");

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const todayKey = toDateKey(new Date());
    const isToday = dateKey === todayKey;
    const doseEntries = getDoseEntriesForDate(petMeds, dateKey);
    const refillEntries = getRefillEntriesForDate(petMeds, dateKey);
    const hasSomethingToShow = doseEntries.length > 0 || refillEntries.length > 0;
    const isOpen = calendarState.openDateKey === dateKey;
    const hasMissedOrLate = doseEntries.some((dose) => dose.status === "missed" || dose.status === "late");
    const hasGiven = doseEntries.some((dose) => dose.log?.givenAt);

    return `
      <div class="rounded-2xl border ${calendarDayClass(isToday, hasMissedOrLate, hasGiven, refillEntries.length)} p-2 min-h-28 sm:min-h-32 text-left overflow-hidden">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="font-black text-sm ${isToday ? "text-[#CC5500]" : "text-stone-600"}">${day}</p>
          ${isToday ? '<span class="text-[9px] font-black text-[#CC5500] uppercase">Today</span>' : ""}
        </div>

        ${hasSomethingToShow ? `
          <button type="button" data-action="show-calendar-details" data-date-key="${dateKey}" class="w-full text-left rounded-xl px-2 py-1.5 bg-white border border-stone-100 hover:border-[#CC5500]/40 hover:bg-orange-50 transition-all">
            <span class="block text-xs font-black text-stone-800 truncate">${escapeHtml(petName)}</span>
            <span class="block text-[10px] font-bold text-stone-400 truncate">Click for med details</span>
          </button>
        ` : '<p class="text-[10px] font-bold text-stone-300 mt-3">No tracked meds</p>'}

        ${refillEntries.length ? `
          <div class="mt-2 rounded-xl border border-red-200 bg-red-50 px-2 py-1.5">
            <p class="text-[10px] font-black text-red-700 leading-tight">Refill medication due</p>
            <p class="text-[10px] font-bold text-red-500 leading-tight truncate">${refillEntries.map((med) => escapeHtml(med.name)).join(", ")}</p>
          </div>
        ` : ""}

        ${isOpen ? renderCalendarDetails(dateKey, doseEntries, refillEntries) : ""}
      </div>
    `;
  }).join("");

  ui.calendarGrid.innerHTML = `
    <div class="bg-white rounded-[2rem] border border-stone-100 shadow-sm p-4 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button type="button" id="calendarPrevBtn" class="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-sm">Previous month</button>
        <div class="text-center">
          <h3 class="text-2xl font-black text-stone-800 tracking-tight">${monthTitle}</h3>
          <p class="text-xs font-bold text-stone-400">Click your pet's name on a date to view med history.</p>
        </div>
        <div class="flex gap-2 justify-center">
          <button type="button" id="calendarTodayBtn" class="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#CC5500] font-black text-sm">Today</button>
          <button type="button" id="calendarNextBtn" class="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-sm">Next month</button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-7 gap-2">
        ${weekdayHeaders}
        ${blanks}
        ${days}
      </div>
    </div>
  `;

  bindCalendarEvents();
}

export function openPetModal() {
  $("#modalPetName").value = "";
  $("#modalSignalment").value = "";
  $("#modalPetColor").value = "#CC5500";
  ui.petModal.classList.remove("hidden");
}

export function closePetModal() {
  ui.petModal.classList.add("hidden");
}

export function openEditPetModal(pet, index) {
  $("#editPetIndex").value = index;
  $("#editModalPetName").value = pet.name;
  $("#editModalSignalment").value = pet.signalment;
  $("#editModalPetColor").value = pet.color;
  ui.editPetModal.classList.remove("hidden");
}

export function closeEditPetModal() {
  ui.editPetModal.classList.add("hidden");
}

function bindCalendarEvents() {
  $("#calendarPrevBtn")?.addEventListener("click", () => moveCalendarMonth(-1));
  $("#calendarNextBtn")?.addEventListener("click", () => moveCalendarMonth(1));
  $("#calendarTodayBtn")?.addEventListener("click", () => {
    calendarState.viewDate = new Date();
    calendarState.openDateKey = "";
    renderCalendar(calendarState.lastMedications, calendarState.lastSelectedPetId);
  });

  ui.calendarGrid.querySelectorAll("[data-action='show-calendar-details']").forEach((button) => {
    button.addEventListener("click", () => {
      const dateKey = button.dataset.dateKey;
      calendarState.openDateKey = calendarState.openDateKey === dateKey ? "" : dateKey;
      renderCalendar(calendarState.lastMedications, calendarState.lastSelectedPetId);
    });
  });
}

function moveCalendarMonth(amount) {
  calendarState.viewDate = new Date(
    calendarState.viewDate.getFullYear(),
    calendarState.viewDate.getMonth() + amount,
    1
  );
  calendarState.openDateKey = "";
  renderCalendar(calendarState.lastMedications, calendarState.lastSelectedPetId);
}

function renderMedicationCard(med, pets) {
  const pet = pets.find((item) => item.id === med.petId);
  const schedule = med.times.length ? med.times.map(formatTime).join(", ") : "As needed";
  const refillClass = isRefillSoon(med.refillReminderDate) ? "text-red-700 bg-red-50 border-red-100" : "text-emerald-700 bg-emerald-50 border-emerald-100";
  const todayDoses = getDoseEntriesForDate([med], toDateKey(new Date()));
  const activeAlerts = getActiveAlerts(med, todayDoses);

  return `
    <article class="bg-white rounded-2xl p-3 shadow-sm border ${activeAlerts.length ? "border-red-200" : "border-stone-100"} space-y-2">
      <div class="flex justify-between gap-2 items-start">
        <div class="min-w-0">
          <p class="text-[10px] font-black uppercase tracking-wider truncate" style="color:${pet?.color ?? "#CC5500"}">${pet?.name ?? "Pet"}</p>
          <h3 class="text-base font-black text-stone-800 leading-tight truncate">${escapeHtml(med.name)}</h3>
          <p class="text-xs font-bold text-stone-400 leading-tight truncate">${escapeHtml(med.dosage)} • ${readableFrequency(med.frequency)}</p>
        </div>
        <button type="button" data-action="delete-med" data-med-id="${med.id}" class="shrink-0 w-7 h-7 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-600 font-black text-xs">X</button>
      </div>

      ${activeAlerts.length ? `
        <div class="rounded-xl border border-red-200 bg-red-50 p-2 space-y-0.5">
          ${activeAlerts.map((alert) => `<p class="text-[11px] font-black text-red-700 leading-tight">${escapeHtml(alert)}</p>`).join("")}
        </div>
      ` : ""}

      ${med.careAlert ? `
        <div class="rounded-xl border border-red-200 bg-red-50 p-2">
          <p class="text-[9px] font-black text-red-500 uppercase leading-tight">Care note</p>
          <p class="text-xs font-bold text-red-700 leading-snug">${escapeHtml(med.careAlert)}</p>
        </div>
      ` : ""}

      ${med.instructions ? `
        <div class="rounded-xl border border-stone-100 bg-stone-50 p-2">
          <p class="text-[9px] font-black text-stone-400 uppercase leading-tight">Instructions</p>
          <p class="text-xs font-bold text-stone-700 leading-snug">${escapeHtml(med.instructions)}</p>
        </div>
      ` : ""}

      <div class="grid grid-cols-3 gap-2">
        <div class="bg-stone-50 rounded-xl p-2 min-w-0">
          <p class="text-[9px] font-black text-stone-400 uppercase leading-tight">Time</p>
          <p class="text-xs font-black text-stone-700 truncate">${schedule}</p>
        </div>
        <div class="bg-stone-50 rounded-xl p-2 min-w-0">
          <p class="text-[9px] font-black text-stone-400 uppercase leading-tight">Reminder</p>
          <p class="text-xs font-black text-stone-700 truncate">${reminderText(med.reminderMinutes)}</p>
        </div>
        <div class="${refillClass} rounded-xl border p-2 min-w-0">
          <p class="text-[9px] font-black uppercase leading-tight">Refill</p>
          <p class="text-xs font-black truncate">${formatDateShort(med.refillReminderDate)}</p>
        </div>
      </div>

      ${todayDoses.length ? `
        <div class="space-y-1">
          <p class="text-[9px] font-black text-stone-400 uppercase px-1 leading-tight">Today's doses</p>
          ${todayDoses.map(renderDoseCheckbox).join("")}
        </div>
      ` : '<p class="text-xs font-bold text-stone-400 bg-stone-50 rounded-xl p-2">Use only when needed.</p>'}
    </article>
  `;
}

function renderDoseCheckbox(dose) {
  const checked = dose.log?.givenAt ? "checked" : "";
  const givenAt = dose.log?.givenAt ? `Given ${formatDateTime(dose.log.givenAt)}` : dose.statusText;
  const redState = dose.status === "missed" || dose.status === "late";
  const greenState = dose.status === "on-time";

  return `
    <label class="flex items-start gap-2 rounded-xl border p-2 cursor-pointer ${redState ? "border-red-200 bg-red-50" : greenState ? "border-emerald-200 bg-emerald-50" : "border-stone-100 bg-stone-50"}">
      <input type="checkbox" ${checked} data-action="toggle-dose" data-med-id="${dose.medId}" data-dose-key="${dose.doseKey}" class="mt-0.5 w-4 h-4 accent-[#CC5500] shrink-0">
      <span class="min-w-0">
        <span class="block text-xs font-black leading-tight ${redState ? "text-red-700" : greenState ? "text-emerald-700" : "text-stone-700"}">${formatTime(dose.time)} dose</span>
        <span class="block text-[11px] font-bold leading-tight ${redState ? "text-red-500" : greenState ? "text-emerald-600" : "text-stone-400"}">${givenAt}</span>
      </span>
    </label>
  `;
}

function renderCalendarDetails(dateKey, doseEntries, refillEntries) {
  const readableDate = formatLongDate(dateKey);
  const doseLines = doseEntries.length
    ? doseEntries.map((dose) => renderCalendarDoseDetail(dose)).join("")
    : '<p class="text-xs font-bold text-stone-400">No medication doses were scheduled for this date.</p>';

  const refillLines = refillEntries.length
    ? refillEntries.map((med) => `
      <div class="rounded-xl border border-red-200 bg-red-50 p-2">
        <p class="text-[10px] font-black text-red-500 uppercase">Refill medication due</p>
        <p class="text-xs font-black text-red-700">${escapeHtml(med.name)}</p>
      </div>
    `).join("")
    : "";

  return `
    <div class="mt-2 rounded-xl border border-stone-200 bg-white p-2 space-y-2 shadow-sm">
      <p class="text-[10px] font-black text-stone-400 uppercase tracking-wider">Details for ${readableDate}</p>
      <div class="space-y-1.5">${doseLines}</div>
      ${refillLines ? `<div class="space-y-1.5 pt-1 border-t border-stone-100">${refillLines}</div>` : ""}
    </div>
  `;
}

function renderCalendarDoseDetail(dose) {
  const wasGiven = Boolean(dose.log?.givenAt);
  const statusClass = wasGiven
    ? dose.status === "late"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"
    : dose.status === "missed"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-stone-200 bg-stone-50 text-stone-600";

  const statusText = wasGiven
    ? `Given at ${formatDateTime(dose.log.givenAt)}`
    : dose.status === "missed"
      ? "Not marked as given"
      : `Due at ${formatTime(dose.time)}`;

  return `
    <div class="rounded-xl border p-2 ${statusClass}">
      <p class="text-xs font-black leading-tight">${escapeHtml(dose.medName)}</p>
      <p class="text-[11px] font-bold leading-tight">Scheduled: ${formatTime(dose.time)}</p>
      <p class="text-[11px] font-bold leading-tight">${statusText}</p>
    </div>
  `;
}

function getDoseEntriesForDate(medications, dateKey) {
  return medications.flatMap((med) => {
    if (!med.times?.length) return [];
    if (!shouldDoseOccurOnDate(med, dateKey)) return [];

    return med.times.map((time) => {
      const doseKey = `${dateKey}|${time}`;
      const log = med.doseLog?.[doseKey];
      const status = getDoseStatus(dateKey, time, log);

      return {
        medId: med.id,
        medName: med.name,
        doseKey,
        dateKey,
        time,
        log,
        status,
        statusText: doseStatusText(status, dateKey, time),
      };
    });
  });
}

function getRefillEntriesForDate(medications, dateKey) {
  return medications.filter((med) => med.refillReminderDate === dateKey);
}

function shouldDoseOccurOnDate(med, dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const startKey = toDateKey(new Date(med.createdAt ?? `${dateKey}T00:00:00`));
  const startDate = new Date(`${startKey}T00:00:00`);

  if (date < startDate) return false;

  if (med.frequency === "weekly") {
    return date.getDay() === startDate.getDay();
  }

  if (med.frequency === "monthly") {
    return date.getDate() === startDate.getDate();
  }

  return med.frequency !== "as-needed";
}

function getDoseStatus(dateKey, time, log) {
  if (log?.givenAt) {
    return log.status ?? (new Date(log.givenAt) <= dueDateWithGrace(dateKey, time) ? "on-time" : "late");
  }

  const now = new Date();
  if (now > dueDateWithGrace(dateKey, time)) return "missed";
  return "upcoming";
}

function getActiveAlerts(med, todayDoses) {
  const alerts = [];
  const now = new Date();
  const reminderMinutes = Number(med.reminderMinutes ?? 0);

  todayDoses.forEach((dose) => {
    if (dose.status === "missed") {
      alerts.push(`${formatTime(dose.time)} dose has not been checked off yet.`);
      return;
    }

    if (dose.status === "late") {
      alerts.push(`${formatTime(dose.time)} dose was marked late.`);
      return;
    }

    const dueAt = dueDate(dose.dateKey, dose.time);
    const minutesUntilDue = Math.round((dueAt - now) / 60000);
    if (!dose.log?.givenAt && minutesUntilDue >= 0 && minutesUntilDue <= reminderMinutes) {
      alerts.push(`${formatTime(dose.time)} dose is coming up soon.`);
    }
  });

  if (isRefillSoon(med.refillReminderDate)) {
    alerts.push("Refill date is coming up soon.");
  }

  return alerts;
}

function doseStatusText(status, dateKey, time) {
  if (status === "missed") return "Not checked off on time";
  if (status === "late") return "Marked late";
  if (status === "on-time") return "Given on time";
  return `Due ${formatTime(time)}`;
}

function calendarDayClass(isToday, hasMissedOrLate, hasGiven, hasRefill) {
  if (hasRefill) return "border-red-200 bg-red-50/60";
  if (hasMissedOrLate) return "border-red-100 bg-red-50/30";
  if (hasGiven) return "border-emerald-200 bg-emerald-50/50";
  if (isToday) return "border-[#CC5500] bg-orange-50";
  return "border-stone-100 bg-stone-50/60";
}

function emptyState(message) {
  return `
    <div class="sm:col-span-2 xl:col-span-3 bg-white rounded-[1.5rem] border border-dashed border-stone-200 p-8 text-center">
      <p class="text-stone-400 font-black">${message}</p>
    </div>
  `;
}

function emptyCalendarState(message) {
  return `
    <div class="bg-white rounded-[2rem] border border-dashed border-stone-200 p-8 text-center">
      <p class="text-stone-400 font-black">${message}</p>
    </div>
  `;
}

function getSelectedPetName() {
  return ui.petSelector?.selectedOptions?.[0]?.textContent || "Pet";
}

function defaultDoseTime(index, count) {
  if (count === 1) return "08:00";
  if (count === 2) return ["08:00", "20:00"][index];
  return ["08:00", "14:00", "20:00"][index];
}

function readableFrequency(frequency) {
  const labels = {
    daily: "Once a day",
    "twice-daily": "Twice a day",
    "thrice-daily": "Three times a day",
    weekly: "Once a week",
    monthly: "Once a month",
    "as-needed": "Only when needed",
  };
  return labels[frequency] ?? frequency;
}

function reminderText(minutes) {
  const value = Number(minutes ?? 0);
  if (value === 0) return "At dose time";
  if (value === 60) return "1 hour before";
  return `${value} minutes before`;
}

function formatDateShort(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatLongDate(dateKey) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateKey}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatTime(value) {
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dueDate(dateKey, time) {
  return new Date(`${dateKey}T${time}:00`);
}

function dueDateWithGrace(dateKey, time) {
  return new Date(dueDate(dateKey, time).getTime() + DOSE_GRACE_MINUTES * 60000);
}

function isRefillSoon(value) {
  if (!value) return false;
  const refillDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAway = Math.ceil((refillDate - today) / 86400000);
  return daysAway <= 7;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}
