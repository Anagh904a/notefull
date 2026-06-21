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
    section.classList.add("hidden"); }); 
    document.getElementById(sectionId).classList.remove("hidden"); 
  }

   

async function openLockSection() {
try {
    await authUser();
  
} catch(err) {
    console.error(err);
}
  showSection('lockSection', 'left');
}

function movePill(el) {
    const pill = document.getElementById('pill');
    const navRect = document.getElementById('navBar').getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    pill.style.left = (elRect.left - navRect.left) + 'px';
    pill.style.width = elRect.width + 'px';
  }

  function setActive(el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    movePill(el);
  }

  window.addEventListener('load', () => {
    const active = document.querySelector('.nav-item.active');
    if (active) {
      const pill = document.getElementById('pill');
      pill.style.transition = 'none';
      movePill(active);
      requestAnimationFrame(() => { pill.style.transition = ''; });
    }
  });

  window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-item.active');
  if (active) movePill(active);
});

function showMenu(el) {
    const menu = document.getElementById("menu-notes");
 if (menu.classList.contains('show')) {
      menu.classList.remove("show");
    menu.classList.add("hide-animation");

    setTimeout(() => {
        menu.classList.remove("hide-animation");
    }, 220);
    return;
    }
    menu.classList.remove("hide-animation");
    requestAnimationFrame(() => {
        menu.classList.add("show");
    });

   
}

function hideMenu() {
    const menu = document.getElementById("menu-notes");

    if (!menu.classList.contains("show")) return;

    menu.classList.remove("show");
    menu.classList.add("hide-animation");

    setTimeout(() => {
        menu.classList.remove("hide-animation");
    }, 220);

}

document.addEventListener("click", function (e) {
    const menu = document.getElementById("menu-notes");

    if (
        !menu.contains(e.target) &&
        !e.target.closest(".menu-trigger")
    ) {
        hideMenu();
    }
});

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
    modal.classList.add('hidden');
}

function toggleSync(el) {
  const enabled = el.checked;
  localStorage.setItem("appLockEnabled", enabled);
  showToast(enabled ? "App Lock Enabled 🔐" : "App Lock Disabled");
  const status = document.getElementById("appLockStatus");
    if (status) {
      status.innerText = el.checked
        ? "🔐 App Lock is ON"
        : "🔓 App Lock is OFF";
    }
  const sound = document.getElementById("sucessSound");
  sound.play();
}

function changeMode(mode) {
  localStorage.setItem('mode', mode);
  document.getElementById('modeStatus').textContent =
    'Current Mode: ' + mode.charAt(0).toUpperCase() + mode.slice(1);
}

function toggleAdv(el) {
  const enabled = el.checked;
  localStorage.setItem("AdvSecurityEnabled", enabled);
  showToast(enabled ? "Advanced Security Enabled 🔐" : "Advanced Security Disabled");
  const status = document.getElementById("advSecurityStatus");
    if (status) {
      status.innerText = el.checked
        ? "🔐 Advanced Security is ON"
        : "🔓 Advanced Security is OFF";
    }
  const sound = document.getElementById("sucessSound");
  sound.play();
}
function forceUiLag(ms) {
    const startTime = Date.now();
    // This loop forces the CPU to work constantly, freezing the UI completely
    while (Date.now() - startTime < ms) {
        // Do nothing, just loop to block the thread
    }
}
function toggleR(el) {
setTimeout(() => {

            
            const startTime = Date.now();
            while (Date.now() - startTime < 4000) {
               }

          const text = document.getElementById('scary');
         text.classList.remove('hidden');

            // 4. Force the input to stay CHECKED and make it DISABLED
           el.checked = false;
            el.disabled = true;

            // 5. Trigger the app safety error alert
            showToastWarn("Feature-crash detected caused by incompatible driver which is newer than supported one!");
            
        }, 500);
     
        showToastError("Freeze detected! Please wait, do not close app.");
}
function loadSettingsUI() {
  const enabled = localStorage.getItem("appLockEnabled") === "true";
  const enabled2 = localStorage.getItem("AdvSecurityEnabled") === "true";
  const lockToggle = document.getElementById("appLock");
  const advSecurity = document.getElementById("advSecurity");

  if (lockToggle) {
    lockToggle.checked = enabled;
  }
  if (advSecurity) {
    advSecurity.checked = enabled;
  }
}
function showNotePassword() {
const password = document.getElementById('notePassword').value.trim();
   const title = document.getElementById('noteTitle').value.trim();
   const passwordText = document.getElementById('note-password-text');
  const note = {title, password,};
document.getElementById("notePasswordModal").classList.remove("hidden");
  if (note.title === "" && note.password === "") {
    passwordText.innerHTML = `Enter New Password for new note`;
  } else if (note.title !== "" && note.password === "") {
    passwordText.innerHTML = `Set New Pasword for ${note.title}`;
  } else if (note.title !== "" && note.password !== "") {
    passwordText.innerHTML = `Change Password of ${note.title}`;
  }
}
function showList() {
  const modal = document.getElementById("listPasswordModalr");
  const password = document.getElementById('listPassword').value.trim();
   const title = document.getElementById('listTitle').value.trim();
   const passwordText = document.getElementById('list-password-text');
  const list = { title,password,};
 modal.classList.remove("hidden");
  if (list.title === "" && list.password === "") {
    passwordText.innerHTML = `Enter New Password for new list`;
  } else if (list.title !== "" && list.password === "") {
    passwordText.innerHTML = `Set New Pasword for ${list.title}`;
  } else if (list.title !== "" && list.password !== "") {
    passwordText.innerHTML = `Change Password of ${list.title}`;
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
  const noteLabel = document.getElementById("noteS-label");
  const listsContainerContent = document.getElementById("listsContainerContent");
 const listLabel = document.getElementById("listS-label");
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
    listLabel.classList.add("hidden");
        noteLabel.classList.remove("hidden");
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
    noteLabel.classList.add("hidden");
        listLabel.classList.remove("hidden");
    displayLists();
    showSection("combinedContainer");
  } else if (filterValue === "all") {
    displayNotes();
    displayLists();
    noteLabel.classList.remove('hidden');
    listLabel.classList.remove('hidden');
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
  const buttons = document.querySelector('.filter-item.active');
  buttons.classList.remove('active');
element.classList.add('active');
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


