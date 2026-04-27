function closeNotePassword() {
 document.getElementById("notePasswordModal").style.display = "none";
}

function showInfo(message) {
    const infoBox = document.getElementById('infoContainer2');
    document.getElementById('infoText').textContent = message;
    infoBox.style.display = 'flex';
  }

  function showSection(sectionId) {
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden");
  });

  document.getElementById(sectionId).classList.remove("hidden");

  }

 function updateNavbar(element) {
            // Remove 'active' class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add 'active' class to the clicked item
            element.classList.add('active');
        }











// Event listener for the Android back button functionality


window.onload = function () {
  startAiScan();
};


window.showToast = function(message, duration = 2500) {
iziToast.success({

    message: message,
    position: 'topRight',
   closeOnClick: true,

    class: 'mobile-friendly-toast'
});

}

window.showToastError = function(message, duration = 2500) {
  iziToast.error({
    title: 'Error',
      message: message,
      position: 'topRight',
   zindex: 99999,
    class: 'mobile-friendly-toast',
       closeOnClick: true,
  });
    const sound = document.getElementById("errorSound");
  sound.play();
  }

window.showToastWarn = function(message, duration = 2500) {
  iziToast.warning({
  
      message: message,
      position: 'topRight',
   zindex: 99999,
    class: 'mobile-friendly-toast',
       closeOnClick: true,
  });
  }

  function closeWelcomeModal() {
     const modal = document.getElementById('modal');
   const obj = localStorage.getItem("notesRecoveryCompleted");
   if (obj === null || obj ==="false") { 
    if (confirm("Are you sure you want to continue without recovering your data? Ignore if you are first time user!")) {
    modal.style.display = 'none';
     } else {
      modal.classList.remove("hiddem");
     }
} else {
    modal.style.display = 'none';

}
  }

async function recoverAllData() {
  try {
    const notesRecovered = localStorage.getItem("notesRecoveryCompleted") === "true";
    const listsRecovered = localStorage.getItem("listsRecoveryCompleted") === "true";

    if (notesRecovered && listsRecovered) {
      showToastError("All data already recovered!");
        const sound = document.getElementById("errorSound");
  sound.play();
      return;
    }

    let recoveredNotes = 0;
    let recoveredLists = 0;

    if (!notesRecovered) {
      const oldNotes = localStorage.getItem("notes");
      if (oldNotes) {
        const parsedNotes = JSON.parse(oldNotes);
        if (Array.isArray(parsedNotes) && parsedNotes.length > 0) {
          const existingNotes = await localforage.getItem("notes") || [];
          const mergedNotes = [...existingNotes];

          parsedNotes.forEach(oldNote => {
            const exists = mergedNotes.find(n => n.id === oldNote.id);
            if (!exists) {
              mergedNotes.push(oldNote);
              recoveredNotes++;
            }
          });

          await localforage.setItem("notes", mergedNotes);
          notes = mergedNotes;
          localStorage.setItem("notesRecoveryCompleted", "true");
        }
      }
    }

    if (!listsRecovered) {
      const oldLists = localStorage.getItem("lists");
      if (oldLists) {
        const parsedLists = JSON.parse(oldLists);
        if (Array.isArray(parsedLists) && parsedLists.length > 0) {
          const existingLists = await localforage.getItem("lists") || [];
          const mergedLists = [...existingLists];

          parsedLists.forEach(oldList => {
            const exists = mergedLists.find(l => l.listId === oldList.listId);
            if (!exists) {
              mergedLists.push(oldList);
              recoveredLists++;
            }
          });

          await localforage.setItem("lists", mergedLists);
          lists = mergedLists;
          localStorage.setItem("listsRecoveryCompleted", "true");
        }
      }
    }

    displayNotes();
    displayLists();

    if (recoveredNotes > 0 && recoveredLists > 0) {
      showToast(`✅ All data recovered! ${recoveredNotes} notes & ${recoveredLists} lists`);
        const sound = document.getElementById("sucessSound");
  sound.play();
    } else if (recoveredNotes > 0) {
      showToast(`✅ Notes recovered! ${recoveredNotes} note${recoveredNotes !== 1 ? 's' : ''}`);
            const sound = document.getElementById("sucessSound");
  sound.play();
    } else if (recoveredLists > 0) {
      showToast(`✅ Lists recovered! ${recoveredLists} list${recoveredLists !== 1 ? 's' : ''}`);
            const sound = document.getElementById("sucessSound");
  sound.play();
    } else {
      showToastError("No data found to recover!");
 
    }

  } catch (error) {
    console.error("Recovery error:", error);
    showToastError("Recovery failed!");
  }
}

function toggleSync(el) {
  const enabled = el.checked;

  localStorage.setItem("appLockEnabled", enabled);

  console.log("App Lock:", enabled);

  showToast(enabled ? "App Lock Enabled 🔐" : "App Lock Disabled");
   const sound = document.getElementById("sucessSound");
  sound.play();
}

  function loadSettingsUI() {
  const enabled = localStorage.getItem("appLockEnabled") === "true";

  const lockToggle = document.getElementById("appLock");

  if (lockToggle) {
    lockToggle.checked = enabled;
  }
}
  


function closeListPasswordModal() {
  document.getElementById("listPasswordModal").style.display = "none";
}

function closeDeleteListPasswordModal() {
  document.getElementById("deleteListPasswordModal").style.display =
    "none";
    closeListPasswordModal();
}

function showAiToast() {
    const toast = document.getElementById('aiToast');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000); // show for 4 seconds
  }



function showNotePassword() {
  document.getElementById("notePasswordModal").classList.remove("hidden");
}



function showList() {
  document.getElementById("listPasswordModalr").classList.remove("hidden");
}

function closeListPassword() {
  document.getElementById("listPasswordModalr").style.display = "none";

}


function showAddOptions() {
  document.getElementById('addOptionsModal').classList.toggle('hidden');
}

function applySortFilter(filterValue) {
  // --- Element References ---
  const notesContainer = document.getElementById("notesContainer");
  const listsContainerContent = document.getElementById("listsContainerContent");
  const noListsMessage = document.getElementById("noListsMessage"); // Assuming these exist
  const noNotesMessage = document.getElementById("noNotesMessage"); // Assuming these exist
  const combinedContainer = document.getElementById("combinedContainer");
  
  // Helper to safely check if an element exists before manipulating it

  if (filterValue === "note") {
    // 1. Clear Lists and hide list-related messages

    listsContainerContent.innerHTML = "";
    if (notes.length === 0) {
    noNotesMessage.classList.remove("hidden");
  } else {
    noNotesMessage.classList.add("hidden");
  }

  
noListsMessage.classList.add("hidden");
  displayNotes(); // Assumes this function re-renders notes into notesContainer
    
    // 3. Show the main content area
 showSection("combinedContainer");
    
  } else if (filterValue === "lists") {
    // 1. Clear Notes and hide note-related messages
    notesContainer.innerHTML = "";
    noNotesMessage.classList.add("hidden");
    if (lists.length === 0) {
      noListsMessage.classList.remove("hidden");
    } else {
      noListsMessage.classList.add("hidden");
    } 
    noNotesMessage.classList.add("hidden");
    
    // 2. Display Lists
    displayLists(); // Assumes this function re-renders lists into listsContainerContent
    
    // 3. Show the main content area
   showSection("combinedContainer");
    
   

  } else if (filterValue === "all") {
    // Display both Notes and Lists
    displayNotes();
    displayLists();
    
    // Ensure 'no message' elements are handled (e.g., re-shown if data is empty)
    if (notes.length === 0) {
      noNotesMessage.classList.remove("hidden");
    } else {
      noNotesMessage.classList.add("hidden");
    }

    if (lists.length === 0) {
      noListsMessage.classList.remove("hidden");
    } else {
      noListsMessage.classList.add("hidden");

    }
  
  }


   else if (filterValue === "date_newest" || filterValue === "date_oldest") {
    // Preserving the existing 'disabled' behavior for sorting
    alert("Sorting by date is disabled in this mode.");
  } 
}

function handleFilterChange(element, filterValue) {
  const container = document.getElementById('filterGroup');
  const glow = document.getElementById('segmentGlow');
  const allItems = container.querySelectorAll('.filter-item');

  // 1. Update Active State Class (Visual)
  allItems.forEach(item => item.classList.remove('active'));
  element.classList.add('active');

  // 2. Move and Resize the background glow (Sleek Animation)
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  // Calculate the position relative to the filter-group container
  glow.style.width = `${rect.width}px`;
  glow.style.left = `${rect.left - containerRect.left}px`;
  
  // 3. Trigger the core application logic
  applySortFilter(filterValue);
}

// 4. Initialization: Ensure the glow is placed correctly on load
window.addEventListener('DOMContentLoaded', () => {
  const activeItem = document.querySelector('.filter-item.active');
  if (activeItem) {
    // We pass the active item and its filter value ('all' initially)
    handleFilterChange(activeItem, 'all'); 
  }
})

 function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}



