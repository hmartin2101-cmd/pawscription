import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  closeEditPetModal,
  closePetModal,
  openEditPetModal,
  openPetModal,
  renderCalendar,
  renderMedications,
  renderPetControls,
  renderTimeInputs,
  setAuthMode,
  showAuth,
  showDashboard,
  ui,
} from "./ui-controller.js";

const firebaseConfig = {
  apiKey: "AIzaSyARkLxvBodFu_wc4SrAvO03K2VwSrRqbNA",
  authDomain: "pawscription-1a81a.firebaseapp.com",
  projectId: "pawscription-1a81a",
  storageBucket: "pawscription-1a81a.firebasestorage.app",
  messagingSenderId: "497054172299",
  appId: "1:497054172299:web:3344a9791cbdd4f936c08e",
  measurementId: "G-7ZX3V504S2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

analyticsIsSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {
    // Analytics is optional. Authentication and Firestore can still work without it.
  });

const DOSE_GRACE_MINUTES = 15;
const ALL_PETS_ID = "all";

const state = {
  authMode: "login",
  firebaseUser: null,
  userData: null,
  selectedPetId: ALL_PETS_ID,
};

const elements = {
  authForm: document.querySelector("#authForm"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmitBtn: document.querySelector("#authSubmitBtn"),
  regPetName: document.querySelector("#regPetName"),
  regSignalment: document.querySelector("#regSignalment"),
  regPetColor: document.querySelector("#regPetColor"),
  regOwnerName: document.querySelector("#regOwnerName"),
  medicationModal: document.querySelector("#medicationModal"),
  addMedicationBtn: document.querySelector("#addMedicationBtn"),
  closeMedicationModalBtn: document.querySelector("#closeMedicationModalBtn"),
  cancelMedicationModalBtn: document.querySelector("#cancelMedicationModalBtn"),
  medForm: document.querySelector("#medForm"),
  medName: document.querySelector("#medName"),
  dosage: document.querySelector("#dosage"),
  frequency: document.querySelector("#frequency"),
  medInstructions: document.querySelector("#medInstructions"),
  reminderMinutes: document.querySelector("#reminderMinutes"),
  careAlert: document.querySelector("#careAlert"),
  totalStock: document.querySelector("#totalStock"),
  refillReminderDate: document.querySelector("#refillReminderDate"),
  addPetBtn: document.querySelector("#addPetBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  closePetModalBtn: document.querySelector("#closePetModalBtn"),
  savePetModalBtn: document.querySelector("#savePetModalBtn"),
  closeEditPetModalBtn: document.querySelector("#closeEditPetModalBtn"),
  saveEditPetModalBtn: document.querySelector("#saveEditPetModalBtn"),
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  setAuthMode(state.authMode);
  renderTimeInputs(elements.frequency.value);
  setInterval(refreshDashboard, 60000);

  onAuthStateChanged(auth, async (firebaseUser) => {
    state.firebaseUser = firebaseUser;

    if (!firebaseUser) {
      state.userData = null;
      state.selectedPetId = ALL_PETS_ID;
      showAuth();
      return;
    }

    await loadUserData(firebaseUser.uid);
    refreshDashboard();
  });
}

function bindEvents() {
  ui.tabLogin.addEventListener("click", () => switchAuthMode("login"));
  ui.tabSignup.addEventListener("click", () => switchAuthMode("signup"));
  elements.authForm.addEventListener("submit", handleAuthSubmit);
  elements.logoutBtn.addEventListener("click", logout);

  elements.frequency.addEventListener("change", () => renderTimeInputs(elements.frequency.value));
  elements.medForm.addEventListener("submit", handleMedicationSubmit);

  elements.addMedicationBtn.addEventListener("click", openMedicationModal);
  elements.closeMedicationModalBtn.addEventListener("click", closeMedicationModal);
  elements.cancelMedicationModalBtn.addEventListener("click", closeMedicationModal);

  elements.medicationModal.addEventListener("click", (event) => {
    if (event.target === elements.medicationModal) {
      closeMedicationModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMedicationModal();
    }
  });

  elements.addPetBtn.addEventListener("click", openPetModal);
  elements.closePetModalBtn.addEventListener("click", closePetModal);
  elements.savePetModalBtn.addEventListener("click", saveNewPet);
  elements.closeEditPetModalBtn.addEventListener("click", closeEditPetModal);
  elements.saveEditPetModalBtn.addEventListener("click", saveEditedPet);

  ui.petFilterBar.addEventListener("click", handlePetFilterAction);
  ui.medList.addEventListener("click", handleMedicationAction);
}

function switchAuthMode(mode) {
  state.authMode = mode;
  setAuthMode(mode);
}

function openMedicationModal() {
  const user = currentUser();

  if (!user || user.pets.length === 0) {
    alert("Add a pet before adding a medication.");
    return;
  }

  if (state.selectedPetId && state.selectedPetId !== ALL_PETS_ID) {
    ui.petSelector.value = state.selectedPetId;
  } else {
    ui.petSelector.value = user.pets[0].id;
  }

  renderTimeInputs(elements.frequency.value);

  elements.medicationModal.classList.remove("hidden");
  elements.medicationModal.classList.add("flex");
}

function closeMedicationModal() {
  elements.medicationModal.classList.add("hidden");
  elements.medicationModal.classList.remove("flex");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value;

  try {
    setAuthBusy(true);

    if (state.authMode === "signup") {
      await createAccount(email, password);
    } else {
      await login(email, password);
    }
  } catch (error) {
    console.error("Firebase sign-in error:", error);
    alert(authErrorMessage(error));
  } finally {
    setAuthBusy(false);
  }
}

async function createAccount(email, password) {
  const ownerName = elements.regOwnerName.value.trim();
  const petName = elements.regPetName.value.trim();
  const signalment = elements.regSignalment.value.trim();

  if (!ownerName || !petName || !signalment) {
    alert("Please add your name and your pet's basic info.");
    return;
  }

  const result = await createUserWithEmailAndPassword(auth, email, password);
  const firstPet = {
    id: makeId("pet"),
    name: petName,
    signalment,
    color: elements.regPetColor.value,
  };

  state.firebaseUser = result.user;
  state.userData = {
    ownerName,
    email,
    pets: [firstPet],
    medications: [],
  };
  state.selectedPetId = ALL_PETS_ID;

  await saveCurrentUser();
  elements.authForm.reset();
  refreshDashboard();
}

async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  elements.authForm.reset();
}

async function logout() {
  await signOut(auth);
}

async function loadUserData(uid) {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    state.userData = {
      ownerName: auth.currentUser?.email ?? "Friend",
      email: auth.currentUser?.email ?? "",
      pets: [],
      medications: [],
    };
    await saveCurrentUser();
  } else {
    state.userData = snapshot.data();
  }

  normalizeUserData(state.userData);
  state.selectedPetId = state.userData.pets.length > 0 ? ALL_PETS_ID : "";
}

async function handleMedicationSubmit(event) {
  event.preventDefault();

  const user = currentUser();
  if (!user || user.pets.length === 0) {
    alert("Add a pet before adding a medication.");
    return;
  }

  const wasViewingAllPets = state.selectedPetId === ALL_PETS_ID;
  const weeklyDueDayInput = document.querySelector("#weeklyDueDay");
  const monthlyDueDayInput = document.querySelector("#monthlyDueDay");

  const medication = {
    id: makeId("med"),
    petId: ui.petSelector.value,
    name: elements.medName.value.trim(),
    dosage: elements.dosage.value.trim(),
    frequency: elements.frequency.value,
    dueDayOfWeek: elements.frequency.value === "weekly" && weeklyDueDayInput ? Number(weeklyDueDayInput.value) : null,
    dueDayOfMonth: elements.frequency.value === "monthly" && monthlyDueDayInput ? Number(monthlyDueDayInput.value) : null,
    times: [...document.querySelectorAll(".dose-time")].map((input) => input.value).filter(Boolean),
    instructions: elements.medInstructions.value.trim(),
    reminderMinutes: Number(elements.reminderMinutes.value),
    careAlert: elements.careAlert.value.trim(),
    totalStock: Number(elements.totalStock.value),
    refillReminderDate: elements.refillReminderDate.value,
    doseLog: {},
    createdAt: new Date().toISOString(),
  };

  user.medications.push(medication);
  state.selectedPetId = wasViewingAllPets ? ALL_PETS_ID : medication.petId;

  await saveCurrentUser();

  elements.medForm.reset();
  renderTimeInputs(elements.frequency.value);
  closeMedicationModal();
  refreshDashboard();
}

async function saveNewPet() {
  const user = currentUser();
  const name = document.querySelector("#modalPetName").value.trim();
  const signalment = document.querySelector("#modalSignalment").value.trim();
  const color = document.querySelector("#modalPetColor").value;

  if (!user) return;

  if (!name || !signalment) {
    alert("Please add both your pet's name and a short breed/profile.");
    return;
  }

  const pet = { id: makeId("pet"), name, signalment, color };
  user.pets.push(pet);
  state.selectedPetId = ALL_PETS_ID;
  await saveCurrentUser();
  closePetModal();
  refreshDashboard();
}

async function saveEditedPet() {
  const user = currentUser();
  const index = Number(document.querySelector("#editPetIndex").value);
  const pet = user?.pets[index];

  if (!pet) return;

  pet.name = document.querySelector("#editModalPetName").value.trim();
  pet.signalment = document.querySelector("#editModalSignalment").value.trim();
  pet.color = document.querySelector("#editModalPetColor").value;

  if (!pet.name || !pet.signalment) {
    alert("Please keep both your pet's name and profile filled in.");
    return;
  }

  await saveCurrentUser();
  closeEditPetModal();
  refreshDashboard();
}

function handlePetFilterAction(event) {
  const button = event.target.closest("button");
  if (!button) return;

  const user = currentUser();

  if (button.dataset.action === "select-pet") {
    state.selectedPetId = button.dataset.petId;
    refreshDashboard();
  }

  if (button.dataset.action === "edit-pet") {
    const index = Number(button.dataset.petIndex);
    openEditPetModal(user.pets[index], index);
  }
}

async function handleMedicationAction(event) {
  const doseCheckbox = event.target.closest("[data-action='toggle-dose']");
  if (doseCheckbox) {
    await toggleDose(doseCheckbox);
    return;
  }

  const deleteButton = event.target.closest("[data-action='delete-med']");
  if (!deleteButton) return;

  const user = currentUser();
  const medication = user.medications.find((med) => med.id === deleteButton.dataset.medId);
  if (!medication) return;

  const shouldDelete = confirm(`Remove ${medication.name} from this pet's plan?`);
  if (!shouldDelete) return;

  user.medications = user.medications.filter((med) => med.id !== medication.id);
  await saveCurrentUser();
  refreshDashboard();
}

async function toggleDose(checkbox) {
  const user = currentUser();
  const medication = user.medications.find((med) => med.id === checkbox.dataset.medId);
  if (!medication) return;

  medication.doseLog ??= {};
  const doseKey = checkbox.dataset.doseKey;

  if (checkbox.checked) {
    const givenAt = new Date();
    const [dateKey, doseTime] = doseKey.split("|");
    const dueAtWithGrace = dueDateWithGrace(dateKey, doseTime);

    medication.doseLog[doseKey] = {
      givenAt: givenAt.toISOString(),
      status: givenAt <= dueAtWithGrace ? "on-time" : "late",
    };
  } else {
    delete medication.doseLog[doseKey];
  }

  await saveCurrentUser();
  refreshDashboard();
}

function refreshDashboard() {
  const user = currentUser();
  if (!user) return;

  normalizeUserData(user);

  if (!state.selectedPetId && user.pets.length > 0) {
    state.selectedPetId = ALL_PETS_ID;
  }

  showDashboard(user.ownerName);
  renderPetControls(user.pets, state.selectedPetId);
  renderMedications(user.medications, user.pets, state.selectedPetId);
  renderCalendar(user.medications, user.pets, state.selectedPetId);
}

function normalizeUserData(user) {
  user.medications ??= [];
  user.pets ??= [];

  user.medications.forEach((med) => {
    med.times ??= [];
    med.doseLog ??= {};
    med.instructions ??= "";
    med.reminderMinutes ??= 15;
    med.careAlert ??= "";
    med.createdAt ??= new Date().toISOString();

    if (med.frequency === "weekly" && med.dueDayOfWeek === undefined) {
      med.dueDayOfWeek = null;
    }

    if (med.frequency === "monthly" && med.dueDayOfMonth === undefined) {
      med.dueDayOfMonth = null;
    }
  });
}

function currentUser() {
  return state.userData;
}

async function saveCurrentUser() {
  if (!state.firebaseUser || !state.userData) return;

  normalizeUserData(state.userData);

  await setDoc(doc(db, "users", state.firebaseUser.uid), {
    ...state.userData,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

function setAuthBusy(isBusy) {
  if (!elements.authSubmitBtn) {
    console.error("authSubmitBtn not found in HTML");
    return;
  }

  elements.authSubmitBtn.disabled = isBusy;
  elements.authSubmitBtn.textContent = isBusy
    ? "Please wait..."
    : state.authMode === "signup"
      ? "Create my account"
      : "Log in";
}

function authErrorMessage(error) {
  const code = error?.code ?? "";

  if (code.includes("email-already-in-use")) return "That email already has an account. Try logging in instead.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "That email and password did not match. Please try again.";
  if (code.includes("invalid-email")) return "That email address does not look right. Please check it and try again.";
  if (code.includes("weak-password")) return "Please use a password with at least 6 characters.";
  if (code.includes("operation-not-allowed")) return "Email/password sign-in is not turned on in Firebase yet. Go to Firebase Authentication > Sign-in method > Email/Password and enable it.";
  if (code.includes("unauthorized-domain")) return "This website domain is not authorized in Firebase yet. Add your GitHub Pages domain in Firebase Authentication > Settings > Authorized domains.";
  if (code.includes("api-key-not-valid") || code.includes("invalid-api-key")) return "The Firebase API key in src/main.js does not match your Firebase project. Copy the newest firebaseConfig from Firebase and paste it into main.js.";
  if (code.includes("permission-denied")) return "Firebase blocked the data save. Check Firestore Database > Rules and make sure each user can read/write their own users/{userId} document.";
  if (code.includes("failed-precondition") || code.includes("not-found")) return "Firestore may not be created yet. Go to Firebase > Firestore Database and create the database.";
  if (code.includes("unavailable")) return "Firebase is temporarily unavailable or blocked by the network. Try again in a minute.";
  if (code.includes("network-request-failed")) return "Firebase could not connect. Check your internet connection and try again.";

  return `Firebase error: ${code || "no error code"} - ${error?.message || "No message provided"}`;
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function dueDateWithGrace(dateKey, time) {
  return new Date(new Date(`${dateKey}T${time}:00`).getTime() + DOSE_GRACE_MINUTES * 60000);
}
