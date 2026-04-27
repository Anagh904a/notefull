const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;

App.addListener("appStateChange", ({ isActive }) => {
  console.log(isActive ? "🟢 OPENED" : "🔴 MINIMIZED");
});

const SystemBars = window.Capacitor.Plugins.SystemBars;

if (SystemBars) {
  console.log("✅ SystemBars plugin found");

  // KEY FIX
  
  console.log("📱 Overlay disabled → WebView adjusts");

} else {
  console.error("❌ SystemBars plugin not found", new Error());
}

let backPressCount = 0;
let lastBackPressTime = 0;

function showNativeToast(msg) {
  Toast.show({
    text: msg,
    duration: 'short'
  });
}

function handleBackButton() {
  console.log("Back pressed");

  const addNoteSection = document.getElementById("addNoteSection");
  const addListSection = document.getElementById("addListSection");

  const notePasswordModal = document.getElementById("notePasswordModal");
  const listPasswordModal = document.getElementById("listPasswordModal");

  // 📝 ===== ADD NOTE SECTION =====
  if (addNoteSection && !addNoteSection.classList.contains("hidden")) {

    // 🔐 If note password modal open → close it
    if (notePasswordModal && !notePasswordModal.classList.contains("hidden")) {
      notePasswordModal.classList.add("hidden");
      return;
    }

    // 💾 If modal already closed → save note
    console.log("Saving note");
    saveNote();
    return;
  }

  // 📋 ===== ADD LIST SECTION =====
  if (addListSection && !addListSection.classList.contains("hidden")) {

    // 🔐 If list password modal open → close it
    if (listPasswordModal && !listPasswordModal.classList.contains("hidden")) {
      listPasswordModal.classList.add("hidden");
      return;
    }

    // 💾 If modal closed → save list
    console.log("Saving list");
    saveList();
    return;
  }

  // 🪟 ===== ANY OTHER MODAL =====
  const openModal = document.querySelector(".modal:not(.hidden)");
  if (openModal) {
    openModal.classList.add("hidden");
    return;
  }

  // 🚪 ===== EXIT LOGIC =====
  const now = Date.now();

  if (now - lastBackPressTime > 2000) {
    backPressCount = 0;
  }

  backPressCount++;
  lastBackPressTime = now;

  if (backPressCount === 2) {
    showNativeToast("Press again to exit");
    return;
  }

  if (backPressCount >= 3) {
    App.exitApp();
  }
}

// attach
App.addListener("backButton", handleBackButton);


const Biometric = window.Capacitor.Plugins.BiometricAuthNative;

async function startLockFlow() {
  console.log("Checking app lock...");
const welcomeModal = document.getElementById('modal');
  const overlay = document.getElementById("privacyOverlay");


  const isEnabled = localStorage.getItem("appLockEnabled") === "true";

  if (!isEnabled) {
    console.log("App Lock Disabled");
    return;
  }

  if (overlay) overlay.classList.remove("hidden");
  welcomeModal.classList.add("hidden");

  try {
    if (!Biometric) {
      throw new Error("Plugin not loaded");
    }

    // ✅ Correct availability check
    const result = await Biometric.checkBiometry();
    console.log("Biometry result:", result);

    if (!result?.isAvailable) {
      throw new Error("Biometric not available");
    }

    // ✅ Correct authentication method
    await Biometric.internalAuthenticate({
      reason: "Unlock Notefull"
    });

    console.log("Unlocked ✅");

    

  } catch (err) {
    console.log("Auth failed:", err);


  }

  if (overlay) overlay.classList.add("hidden");
  welcomeModal.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  startLockFlow();
});

