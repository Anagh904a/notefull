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

/*document.addEventListener("click", (e) => {
  // step 1: find open modal
  const shownModal =  document.querySelector(".modal:not(.hidden)");


  // step 2: if no modal → do nothing
  if (!shownModal) return;

  // step 3: check click position
  const inside = e.target.closest(".modal-content");

  // step 4: if click outside → close
  if (!inside) {
    closeModal(shownModal.id); // or pass modal if needed
  }
}); */
