
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
injectThreat({
title:"",
sev:"high",
tip:"PLease update NDSP for better and safer experience! CRITICAL ",
onAction:"showSection('aiSection')"
});
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initChecklistTouchReorder();
  refreshAppFilesList();
});


document.addEventListener("DOMContentLoaded",()=>{
const advSecurityState= localStorage.getItem("AdvSecurityEnabled");
const appLockState= localStorage.getItem("appLockEnabled");
if(advSecurityState===null || advSecurityState==="false") {
injectThreat({
title:"Advanced Security is Off",
sev:"med",
tip:"Enable now for screenshot/recording protection",
onAction:"showSection('lockSection')"
});
}
if(appLockState===null || appLockState==="false") {
injectThreat({
title:"App Protection is Off",
sev:"med",
tip:"Anyone can open Notefull on your device. Consider enabling App Lock",
onAction:"showSection('lockSection')"
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

function displayNotes() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  notes.forEach((note) => {
    if (note.selected === undefined || note.selected === true) {
      note.selected = false;
    }

    const noteDiv = document.createElement("div");
    const noteDate = new Date(note.date);
    const formattedDate = formatDate(noteDate);
    const lockIndicator = note.password && note.password !== "" 
      ? '<div class="lock-indicator"><i class="ti ti-lock"></i></div>' 
      : "";

    const remainderElement = note.remainderEnabled === true && note.remainderTime
      ? `<div class="remainder-pill" id="note-pill-${note.id}">
           <i class="ti ti-hourglass"></i> 
           <span class="remainder-text" id="note-remainder-${note.id}">${getReminderText(note.remainderTime)}</span>
         </div>`
      : "";

    let noteText = "";
    if (!note) {
      noteText = "Invalid Note";
    }
    const isTooLong = note.content && note.content.length > 100;
    const htmlRegex = /<\/?(br|b|strong|i|em|span|u|ins|ul|ol|li)(\s[^>]*)?\/?>/i;
    const HTML = htmlRegex.test(note.content);

    if (note.password) {
      noteText = "Locked Note";
    } else if (isTooLong) {
      noteText = "Content Too Large To Display";
    } else if (HTML) {
      noteText = "Formatted note text cannot be displayed";
    } else {
      noteText = note.content || "Empty Note";
    }

    noteDiv.innerHTML = `
      <div id="noteWrapper" class="note-wrapper" data-id="${note.id}">
        <input type="checkbox" id="selectBoxNote" onchange="selectNote('${note.id}')" class="select-box hidden">
        <div class="note" onclick="openNote('${note.id}')">
          <span class="note-date">${formattedDate}</span>   
          ${remainderElement}
          <div class="note-header">
            <h4>${note.title}</h4>
            ${lockIndicator}
          </div>
          <div class="note-text">${noteText}</div>
        </div>
      </div>
    `;
    container.appendChild(noteDiv);
  });
}

function displayLists() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  // NOTE: container.innerHTML = "" removed from here so notes are not wiped out

  lists.forEach((list) => {
    if (list.selected === undefined || list.selected === true) {
      list.selected = false;
    }

    const listDiv = document.createElement("div");
    const listDate = new Date(list.date);
    const formattedDate = formatDate(listDate);
    const loclIndicator = list.password && list.password !== "" ? ' <i class="ti ti-lock"></i>' : "";
    
    let progressHTML = "";
    if (list.items && list.items.length > 0) {
      const total = list.items.length;
      const checked = list.items.filter(item => item.checked).length;
      const percent = (checked / total) * 100;
      progressHTML = `
        <div class="list-progress">
          <small>${Math.round(percent)}% Completed</small>
          <progress value="${percent}" max="100" id="list-bar"></progress>
        </div>
      `;
    }

    const listRemainderElement = list.remainderEnabled
      ? `<div class="remainder-pill" id="list-pill-${list.id}">
           <i class="ti ti-hourglass"></i> 
           <span class="remainder-text" id="list-remainder-${list.id}">${getReminderText(list.remainderTime)}</span>
         </div>`
      : "";

    listDiv.innerHTML = `
      <div class="list-wrapper" id="listWrapper" data-id="${list.id}">
        <input type="checkbox" id="selectBoxList" onchange="selectList('${list.id}')" class="select-box hidden">
        <div class="list" onclick="openList('${list.id}')">   
          <i class="ti ti-list"></i>
          <span class="note-date">${formattedDate}</span>
          ${listRemainderElement}
          <div class="note-header">
            <h4>${list.title}</h4>
            ${loclIndicator}
          </div>
          ${progressHTML} 
        </div>
      </div>
    `;
    container.appendChild(listDiv);
  });
}

function displaysharedLists() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  sharedLists.forEach(list => {
    const listDiv = document.createElement("div");
    let progressHTML = "";

    if (list.items?.length) {
      const total = list.items.length;
      const checked = list.items.filter(item => item.checked).length;
      const percent = (checked / total) * 100;

      progressHTML = `
        <div class="list-progress">
          <small>${Math.round(percent)}% Completed</small>
          <progress value="${percent}" max="100"></progress>
        </div>
      `;
    }

    listDiv.innerHTML = `
      <div class="list" onclick="openSharedList('${escapeSlHtml(list.id)}')">
        <i class="ti ti-list"></i>
        <div class="note-header">
          <h4>${escapeSlHtml(list.title)}</h4>
        </div>
        ${progressHTML}
      </div>
    `;
    container.appendChild(listDiv);
  });
}

/**
 * Unified Coordinator: Clears once, runs active filters, 
 * and centrally controls the #noItems empty state.
 */
function renderItems(filter = 'all') {
  const container = document.getElementById('itemsContainer');
  const noItemsMessage = document.getElementById('noItems');
  if (!container) return;

  // 1. Single atomic wipe before populating
  container.innerHTML = "";

  // 2. Selectively render based on the active tab/filter
  if (filter === 'all' || filter === 'notes') {
    displayNotes();
  }
  if (filter === 'all' || filter === 'lists') {
    displayLists();
  }
  if (filter === 'all' || filter === 'shared') {
    displaysharedLists();
  }

  if (container.children.length === 0) {
    noItemsMessage?.classList.remove('hidden');
  } else {
    noItemsMessage?.classList.add('hidden');
  }
}

