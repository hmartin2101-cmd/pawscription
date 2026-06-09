const $ = (selector) => document.querySelector(selector);

const DOSE_GRACE_MINUTES = 15;

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
    editButton.className = "w-9 h-9 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-400 font-black";
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
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const petMeds = medications.filter((med) => med.petId === selectedPetId);

  const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<div class="text-stone-400 uppercase text-[10px]">${day}</div>`)
    .join("");

  const blanks = Array.from({ length: firstWeekday }, () => '<div class="min-h-28 rounded-2xl"></div>').join("");

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateKey = toDateKey(new Date(year, month, day));
    const isToday = dateKey === toDateKey(today);
    const doses = getDoseEntriesForDate(petMeds, dateKey);
    const hasMissed = doses.some((dose) => dose.status === "missed" || dose.status === "late");

    return `
      <div class="min-h-28 rounded-2xl border ${calendarClass(isToday, hasMissed)} p-2 text-left overflow-hidden">
        <p class="font-black ${isToday ? "text-[#CC5500]" : "text-stone-500"}">${day}</p>
        <div class="mt-2 space-y-1">
          ${doses.length ? doses.slice(0, 4).map(renderCalendarDose).join("") : '<p class="text-[10px] font-bold text-stone-300">No doses</p>'}
          ${doses.length > 4 ? `<p class="text-[10px] font-black text-stone-400">+${doses.length - 4} more</p>` : ""}
        </div>
      </div>
    `;
  }).join("");

  ui.calendarGrid.innerHTML = weekdayHeaders + blanks + days;
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

function renderCalendarDose(dose) {
  const color = dose.status === "on-time"
    ? "text-emerald-700 bg-emerald-50"
    : dose.status === "late" || dose.status === "missed"
      ? "text-red-700 bg-red-50"
      : "text-stone-500 bg-white";

  return `<p class="truncate rounded-lg px-1.5 py-1 text-[10px] font-black ${color}">${escapeHtml(dose.medName)} ${formatTime(dose.time)}</p>`;
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

function shouldDoseOccurOnDate(med, dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const startDate = new Date(med.createdAt ?? `${dateKey}T00:00:00`);

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

function calendarClass(isToday, hasMissed) {
  if (hasMissed) return "border-red-200 bg-red-50/70";
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

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateShort(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
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
