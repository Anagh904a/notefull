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
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  element.classList.add('active');
}
window.onload = function () {
  startAiScan();
};
window.showToast = function (message, duration = 2500) {
  iziToast.success({
    message: message,
    position: 'topRight',
    closeOnClick: true,
    class: 'mobile-friendly-toast'
  });
}
window.showToastError = function (message, duration = 2500) {
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
window.showToastWarn = function (message, duration = 2500) {
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
  if (obj === null || obj === "false") {
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
      showToast(`All data recovered! ${recoveredNotes} notes & ${recoveredLists} lists`);
      const sound = document.getElementById("sucessSound");
      sound.play();
    } else if (recoveredNotes > 0) {
      showToast(`Notes recovered! ${recoveredNotes} note${recoveredNotes !== 1 ? 's' : ''}`);
      const sound = document.getElementById("sucessSound");
      sound.play();
    } else if (recoveredLists > 0) {
      showToast(`Lists recovered! ${recoveredLists} list${recoveredLists !== 1 ? 's' : ''}`);
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

function showNotePassword() {

   const password = document.getElementById('notePassword').value.trim();
   const title = document.getElementById('noteTitle').value.trim();
   const passwordText = document.getElementById('note-password-text');
  const note = {
   
    title,

    password,

  };

  document.getElementById("notePasswordModal").classList.remove("hidden");
    if (note.password == "") {
passwordText.innerHTML = `Set a new password`;
  } else {
    passwordText.innerHTML = `Change Password for ${note.title}`;
  }
}
function showList() {
  const modal = document.getElementById("listPasswordModalr");
  const password = document.getElementById('listPassword').value.trim();
   const title = document.getElementById('listTitle').value.trim();
   const passwordText = document.getElementById('list-password-text');
  const list = {
   
    title,

    password,

  };

  modal.classList.remove("hidden");
    if (note.password == "") {
passwordText.innerHTML = `Set a new password`;
  } else {
    passwordText.innerHTML = `Change Password for ${list.title}`;
  }
}

function closeListPassword() {
  document.getElementById("listPasswordModalr").classList.add("hidden");
}
function showAddOptions() {
  document.getElementById('addOptionsModal').classList.toggle('hidden');
}
function applySortFilter(filterValue) {
  const notesContainer = document.getElementById("notesContainer");
  const listsContainerContent = document.getElementById("listsContainerContent");
  const noListsMessage = document.getElementById("noListsMessage");
  const noNotesMessage = document.getElementById("noNotesMessage");
  const combinedContainer = document.getElementById("combinedContainer");
  if (filterValue === "note") {
    listsContainerContent.innerHTML = "";
    if (notes.length === 0) {
      noNotesMessage.classList.remove("hidden");
    } else {
      noNotesMessage.classList.add("hidden");
    }
    noListsMessage.classList.add("hidden");
    displayNotes();
    showSection("combinedContainer");
  } else if (filterValue === "lists") {
    notesContainer.innerHTML = "";
    noNotesMessage.classList.add("hidden");
    if (lists.length === 0) {
      noListsMessage.classList.remove("hidden");
    } else {
      noListsMessage.classList.add("hidden");
    }
    noNotesMessage.classList.add("hidden");
    displayLists();
    showSection("combinedContainer");
  } else if (filterValue === "all") {
    displayNotes();
    displayLists();
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
    alert("Sorting by date is disabled in this mode.");
  }
}
function handleFilterChange(element, filterValue) {
  const container = document.getElementById('filterGroup');
  const glow = document.getElementById('segmentGlow');
  const allItems = container.querySelectorAll('.filter-item');
  allItems.forEach(item => item.classList.remove('active'));
  element.classList.add('active');
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  glow.style.width = `${rect.width}px`;
  glow.style.left = `${rect.left - containerRect.left}px`;
  applySortFilter(filterValue);
}
window.addEventListener('DOMContentLoaded', () => {
  const activeItem = document.querySelector('.filter-item.active');
  if (activeItem) {
    handleFilterChange(activeItem, 'all');
  }
})
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
