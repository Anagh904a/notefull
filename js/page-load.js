window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

  // Show toast if update is due or never updated
  if (!lastUpdated || now - lastUpdated > UPDATE_INTERVAL) {
    showToast("New Definitions Available!");

  }
};

displayLists();
displayNotes();

document.addEventListener("DOMContentLoaded", () => {
  const syncToggle = document.getElementById("syncToggle");
  const syncState = localStorage.getItem("syncEnabled");

  if (syncToggle) {
    if (syncState === null || syncState === "false") {
      syncToggle.checked = false;
    } else {
      syncToggle.checked = true;
    }

    // Optional: set visual text
    const status = document.getElementById("syncStatus");
    if (status) {
      status.innerText = syncToggle.checked ? "✅ Sync is ON" : "🔄 Sync is OFF";
    }
  

   
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closePasswordModal(); // Close the modal
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
   updateAccountIcon();
    startAiScan();
    displayNotes();
    displayLists();
});

            document.addEventListener('keydown', function(event) {
  // Check the 'key' property (Modern, preferred approach)
  const key = event.key;

  if (key === 'Enter') {
    // Prevent the default browser action (like submitting a form)
    // event.preventDefault(); 
   addItem();
    
  } else if (key === 'Escape') {
    // Prevent the default browser action (like closing an active pop-up)
    // event.preventDefault(); 
    closeDeleteListPasswordModal();
    closeDeletePasswordModal();
    closeListPassword();
    closePasswordModal();
    closeAddOptions();
    closeWelcomeModal();
    cancelNote();
    cancelList();
    
  } else if (event.ctrlKey && key === 's') {
    // Example: Handling Ctrl + S (for saving)
    event.preventDefault(); // Prevents the browser's default 'Save Page' dialog
    saveNote()
    // quickSaveFunction();
  }
});