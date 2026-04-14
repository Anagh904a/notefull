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









function navigateTo(sectionId) {
 document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });
  document.getElementById(sectionId).classList.remove("hidden"); // Show the selected section

  // Manage history stack

  currentSection = sectionId; // Update current section
 closeSidebar(); // Close sidebar if open
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
    if (confirm("Are you sure you want to continue without recovering your data? Next update will wipe your data! If you wish to protect your data from being deleted, kindly backup your data!")) {
    modal.style.display = 'none';
     } else {
      modal.classList.remove("hiddem");
     }
} else {
    modal.style.display = 'none';

}
  }

  function openRecovery() {
         closeModal('modal');
         showSection('recoverySection');
  }

async function exportDataNiotron() {
  console.log("📦 Export triggered");

  try {
    const data = await exportData();

    // 📱 If running inside Niotron
    if (window.AppInventor) {
      console.log("📱 Sending data to Niotron");
      window.AppInventor.setWebViewString(data);
    } 
    // 🌐 If running in browser
    else {
      console.log("🌐 Downloading in browser");

      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "notefull-backup.nfbackup";
      a.click();

      URL.revokeObjectURL(url);
    }

  } catch (err) {
    console.error("❌ Export failed:", err);
  }
}

  async function exportData() {
  try {
    console.log("📦 Starting export...");

    // 🟢 1. Get data
    const notes = await localforage.getItem("notes") || [];
    const lists = await localforage.getItem("lists") || [];

    // 🟢 2. Get localStorage
    const localStorageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      localStorageData[key] = localStorage.getItem(key);
    }

    // 🟢 3. Create export object
    const exportObject = {
      _meta: {
        app: "Notefull",
        version: "v4",
        exportedAt: new Date().toISOString(),
        note: "Auto-generated backup file.",
        warning: "⚠️ Sensitive data. Do not share."
      },
      data: {
        notes,
        lists,
        localStorage: localStorageData
      }
    };

    // 🔐 4. Encrypt before export
    const encrypted = await encryptData(JSON.stringify(exportObject));

    // 🟢 5. Save file
    const blob = new Blob([encrypted], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "notefull-backup.nfbackup";
    a.click();

    URL.revokeObjectURL(url);

    showToast("Encrypted backup exported 🔐");

  } catch (err) {
    console.error(err);
    showToast("Export failed ❌");
  }
}

async function encryptData(data) {
  const password = "notefull-secret-key"; // later: user PIN or derived key

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("notefull-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data)
  );

  // combine iv + encrypted
  const result = {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };

  return JSON.stringify(result);
}

async function recoverAllData() {
  try {
    const notesRecovered = localStorage.getItem("notesRecoveryCompleted") === "true";
    const listsRecovered = localStorage.getItem("listsRecoveryCompleted") === "true";

    if (notesRecovered && listsRecovered) {
      showToastError("All data already recovered!");
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
    } else if (recoveredNotes > 0) {
      showToast(`✅ Notes recovered! ${recoveredNotes} note${recoveredNotes !== 1 ? 's' : ''}`);
    } else if (recoveredLists > 0) {
      showToast(`✅ Lists recovered! ${recoveredLists} list${recoveredLists !== 1 ? 's' : ''}`);
    } else {
      showToastError("No data found to recover!");
    }

  } catch (error) {
    console.error("Recovery error:", error);
    showToastError("Recovery failed!");
  }
}

function refresh() {
  displayNotes();
  displayLists();
  showToast("Refreshed!");
showSection("combinedContainer");
const search = document.getElementById('searchInput');
  search.value = "";
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



