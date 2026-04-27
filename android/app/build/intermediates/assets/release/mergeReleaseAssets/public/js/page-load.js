window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

  // Show toast if update is due or never updated
  if (!lastUpdated || now - lastUpdated > UPDATE_INTERVAL) {
    showToast("New Definitions Available!");
      const sound = document.getElementById("alertSound");
  sound.play();
document.getElementById('updateWarn').style.display = "flex";
  }
};



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

    // Optional: status text
    const status = document.getElementById("appLockStatus");
    if (status) {
      status.innerText = appLockToggle.checked 
        ? "🔐 App Lock is ON" 
        : "🔓 App Lock is OFF";
    }

  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeModal(modal); // Close the modal
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // Hide all sections initially
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });

  // Show only the notes section on page load
  showSection("combinedContainer"); // Show the notes section

  // Load notes and lists from local storage
  displayNotes();
  displayLists();
  
});

document.addEventListener('keydown', function(event) {
    // Check if the pressed key is the 'Escape' key
    if (event.key === 'Escape') {
        
        // Prevent default browser actions (like stopping media playback)
        event.preventDefault(); 
        
        // 1. Call your primary Escape function here
   cancelNote();
    }
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


document.addEventListener('keydown', function(event) {
 
  const key = event.key;

  if (key === 'Enter') {
  addItem();
     } else if (key === 'Escape') {
   closeNotePassword();
   closeListPassword();
   closeNotePassword();
   closeDeleteListPasswordModal();
   closeWelcomeModal();
   
  } else if (event.ctrlKey && key === 's') {
   event.preventDefault(); 
    saveNote()
  }
});

