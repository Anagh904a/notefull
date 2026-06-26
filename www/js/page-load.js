
window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000;
    if (lastUpdated === null) {
    localStorage.setItem("lastUpdated", now.toString());
    return; // Exit here. Do not show the warning.
  }
  if (now - lastUpdated > UPDATE_INTERVAL) {
document.getElementById('updateWarn').classList.remove("hidden");
showToast('New Analytics Update Avaliable!');
  }
}

document.addEventListener("DOMContentLoaded",()=>{
const advSecurityState= localStorage.getItem("AdvSecurityEnabled");
const appLockState= localStorage.getItem("appLockEnabled");
if(advSecurityState===null || advSecurityState==="false") {
injectThreat({
title:"Advanced Security is Off",
sev:"med",
tip:"Enable now for screenshot/recording protection and advanced privacy! RECOMMENDED ACTION"
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
   date = new Date(date);
  

  const options = { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" };
  return date.toLocaleString("en-US", options);

}

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
  displayDeletedNotes();
  displayDeletedLists();
  syncDataWithUpdates();
rescheduleAllActiveReminders();
});
document.addEventListener("DOMContentLoaded", function () {
  startAiScan();
});
function closeModal(modal) {
  const modalId = document.getElementById(modal);
  modalId.classList.add('hidden');
}

document.addEventListener("DOMContentLoaded", function () {
  const saved = localStorage.getItem('mode') || 'balanced';
  const options = document.querySelectorAll('.mode-option');
  options.forEach(opt => {
    const label = opt.querySelector('label').textContent.trim().toLowerCase();
    if (label === saved) opt.querySelector('input').checked = true;
  });
  document.getElementById('modeStatus').textContent =
    'Current Mode: ' + saved.charAt(0).toUpperCase() + saved.slice(1);
  localStorage.setItem('mode', saved);
});


