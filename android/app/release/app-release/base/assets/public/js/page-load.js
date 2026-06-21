window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000;
  if (!lastUpdated || now - lastUpdated > UPDATE_INTERVAL) {
    showToast("New Definitions Available!");
    const sound = document.getElementById("alertSound");
    sound.play();
    document.getElementById('updateWarn').classList.remove("hidden");
  }
};

document.addEventListener("DOMContentLoaded",()=>{

const advSecurityState= localStorage.getItem("AdvSecurityEnabled");
const appLockState= localStorage.getItem("appLockEnabled");

if(advSecurityState===null || advSecurityState==="false") {


injectThreat({
title:"Advanced Security is Off",
sev:"med",
tip:"Enable now for screenshot/recording proetction and extra protection"
});

}

if(appLockState===null || appLockState==="false") {

injectThreat({
title:"App Protection is Off",
sev:"med",
tip:"Anyone can open Notefull on your device. Consider enabling App Lock"
});

}

});

function formatDate(date) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}
displayLists();
displayNotes();
document.addEventListener("DOMContentLoaded", () => {
  const appLockToggle = document.getElementById("appLock");
  const appLockState = localStorage.getItem("appLockEnabled");
  if (appLockToggle) {
    if (appLockState === null || appLockState === "false") {
      appLockToggle.checked = false;
    } else {
      appLockToggle.checked = true;
    }
    const status = document.getElementById("appLockStatus");
    if (status) {
      status.innerText = appLockToggle.checked
        ? "🔐 App Lock is ON"
        : "🔓 App Lock is OFF";
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const advSecurity = document.getElementById("advSecurity");
  const advSecurityState = localStorage.getItem("AdvSecurityEnabled");
  if (advSecurity) {
    if (advSecurityState === null || advSecurityState === "false") {
      advSecurity.checked = false;
    } else {
      advSecurity.checked = true;
    }
    const status = document.getElementById("advSecurityStatus");
    if (status) {
      status.innerText = advSecurity.checked
        ? "🔐 Advanced Security is ON"
        : "🔓 Advanced Security is OFF";
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden");
  });
  showSection("combinedContainer");
  displayNotes();
  displayLists();
});
document.addEventListener("DOMContentLoaded", function () {
  startAiScan();
  displayNotes();
  displayLists();
});
function closeModal(modal) {
  const modalId = document.getElementById(modal);
  modalId.classList.add('hidden');
}


