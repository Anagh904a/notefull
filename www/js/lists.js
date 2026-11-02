let currentItems = [];
let currentListId = null;
let lists = [];
let listsTrash = [];
let selectedLists = [];
function rebuildLists() {
listsMap = {};
lists.forEach(l => listsMap[l.id] = l);
updateAllPillsDynamically();
}


function displayChecklist() {
  const checklistContainer = document.getElementById("checklistContainer");
  const noItemsMessage = document.getElementById("items-no");
  if (currentItems.length === 0) {
    noItemsMessage.classList.remove("hidden");
  } else {
    noItemsMessage.classList.add("hidden");
  }

 
   checklistContainer.innerHTML = "";
  currentItems.forEach((item) => {
  const itemDiv = document.createElement("div");
  itemDiv.innerHTML = `
<div class="checklist-item">
<div class="drag-handle"><i class="ti ti-grip-vertical"></i></div>
  <input type="checkbox"
    ${item.checked ? "checked" : ""}
    onchange="toggleCheck('${item.id}')">
  <input type="text"
  id="text-${item.id}"
    value="${item.name}"
    oninput="updateItemName('${item.id}', this.value)"
    placeholder="Type your task here..."
    style="${item.checked ? 'text-decoration: line-through; color: #94a3b8;' : ''}">
  <button onclick="removeItem('${item.id}')"><i class="ti ti-trash"></i></button>
</div>
`;
  checklistContainer.appendChild(itemDiv);
});
}
function initChecklistTouchReorder() {
  const container = document.getElementById("checklistContainer");
  if (!container || container.dataset.reorderInit) return;
  container.dataset.reorderInit = "true";

  let draggedEl = null;
  let placeholderEl = null;
  let startTouchY = 0;
  let offsetY = 0;
  let longPressTimer = null;
  let isDragging = false;

  container.addEventListener("touchstart", (e) => {
    // Target the direct wrapper div inside checklistContainer
    const row = e.target.closest("#checklistContainer > div");
    if (!row) return;

    const target = e.target;
    const isHandle = Boolean(target.closest(".drag-handle"));
    const isInput = target.tagName === "INPUT" || target.tagName === "BUTTON";

    startTouchY = e.touches[0].clientY;

    if (isHandle) {
      startDrag(row, e.touches[0]);
    } else if (!isInput) {
      // 300ms long press on any non-input area of the item
      const touch = e.touches[0];
      longPressTimer = setTimeout(() => {
        startDrag(row, touch);
      }, 300);
    }
  }, { passive: false });

  container.addEventListener("touchmove", (e) => {
    const touch = e.touches[0];

    if (!isDragging) {
      // Cancel long press if user is scrolling normally
      if (longPressTimer && Math.abs(touch.clientY - startTouchY) > 8) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      return;
    }

    e.preventDefault(); // Prevent scrolling while dragging

    // Follow finger movement vertically
    draggedEl.style.top = `${touch.clientY - offsetY}px`;

    // Detect direct child div under the finger
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetRow = elemBelow?.closest("#checklistContainer > div");

    if (
      targetRow &&
      targetRow !== placeholderEl &&
      targetRow !== draggedEl &&
      targetRow.parentElement === container
    ) {
      const targetRect = targetRow.getBoundingClientRect();
      const midpoint = targetRect.top + targetRect.height / 2;

      if (touch.clientY < midpoint) {
        container.insertBefore(placeholderEl, targetRow);
      } else {
        container.insertBefore(placeholderEl, targetRow.nextSibling);
      }
    }
  }, { passive: false });

  function endDrag() {
    clearTimeout(longPressTimer);
    longPressTimer = null;

    if (!isDragging || !draggedEl) return;

    // Reset styles on the dragged element
    draggedEl.classList.remove("is-dragging");
    draggedEl.style.position = "";
    draggedEl.style.top = "";
    draggedEl.style.left = "";
    draggedEl.style.width = "";
    draggedEl.style.zIndex = "";
    draggedEl.style.pointerEvents = "";

    // Replace the placeholder with the moved element in the DOM
    if (placeholderEl && placeholderEl.parentNode) {
      placeholderEl.replaceWith(draggedEl);
    }

    placeholderEl = null;
    isDragging = false;

    // 1. Sync typed values before reordering
    currentItems.forEach(item => {
      const input = document.getElementById(`text-${item.id}`);
      if (input) item.name = input.value;
    });

    // 2. Read new order directly from the DOM wrapper divs
    const rows = Array.from(container.querySelectorAll("#checklistContainer > div"));
    const orderedIds = rows.map(r => {
      const input = r.querySelector('input[type="text"]');
      return input ? input.id.replace("text-", "") : null;
    }).filter(Boolean);

    // 3. Reorder currentItems array to match the DOM
    currentItems = orderedIds
      .map(id => currentItems.find(i => i.id === id))
      .filter(Boolean);
  }

  container.addEventListener("touchend", endDrag);
  container.addEventListener("touchcancel", endDrag);

  function startDrag(row, touch) {
    isDragging = true;
    draggedEl = row;

    if (document.activeElement) document.activeElement.blur();
    if (navigator.vibrate) navigator.vibrate(35);

    const rect = row.getBoundingClientRect();
    offsetY = touch.clientY - rect.top;

    // Create placeholder
    placeholderEl = row.cloneNode(true);
    placeholderEl.classList.add("is-placeholder");
    container.insertBefore(placeholderEl, row);

    // Float the dragged element
    draggedEl.classList.add("is-dragging");
    draggedEl.style.width = `${rect.width}px`;
    draggedEl.style.left = `${rect.left}px`;
    draggedEl.style.top = `${touch.clientY - offsetY}px`;
  }
}
function toggleCheck(itemId) {
  const item = currentItems.find(i => i.id === itemId);
  if (!item) return;
item.checked = !item.checked;
  const textInput = document.getElementById(`text-${itemId}`);
  if (!textInput) return;
  if (item.checked) {
    textInput.style.textDecoration = "line-through";
    textInput.style.color = "#94a3b8";
  } else {
    textInput.style.textDecoration = "none";
    textInput.style.color = "#0f172a";
  }
}
function updateItemName(itemId, value) {
  const item = currentItems.find(i => i.id === itemId);
  if (!item) return;
  item.name = value;
}
function removeItem(itemId) {
currentItems = currentItems.filter(item => item.id !== itemId);
displayChecklist();
}


function openList(listId) {
  const list = listsMap[listId];
  if(selectionMode === true) {
  return;
}
  if (list.password) {
    document.getElementById("listPasswordModal").dataset.listId =
      list.id;
      document.getElementById("listPasswordModalText").innerHTML = "Unlock " + list.title + " List 🔓";    document.getElementById("listPasswordModal").classList.remove("hidden");
    document.getElementById("listPasswordInput").value = "";
  } else {
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
   currentListId = listId;
    showAddListSection();
    document.getElementById("listPassword").value = list.password;
    showSection('addListSection');
  }
  
}
function suggestItems() {
  const listTitle = document.getElementById('listTitle')?.value.trim() || 'Checklist';
  const listItems = document.getElementById('checklistContainer');
  const thinkingIndicator = document.getElementById('thinking-ai-lists');
  const addBtn1 = document.getElementById('addItemBtn');

  if (addBtn1) addBtn1.classList.add("hidden");
  listItems.classList.add('thinking');
  if (thinkingIndicator) thinkingIndicator.classList.remove('hidden');

  // 1. CRITICAL: Sync current input values from DOM back into currentItems
  currentItems.forEach(item => {
    const input = document.getElementById(`text-${item.id}`);
    if (input) item.name = input.value;
  });

  // 2. Get list of existing task names for the AI prompt
  const items = currentItems
    .map(item => item.name.trim())
    .filter(name => name.length > 0);

  const prompt = `You are a checklist assistant. Suggest 3 to 5 missing items based on the given title and current list.
Title: "${listTitle}"
Current Items: ${JSON.stringify(items)}

Return ONLY a valid JSON array of strings. Do not include markdown blocks or extra commentary.
Example:
["Item 1", "Item 2", "Item 3"]`;

  window.Capacitor.Plugins.AIPlugin.askAI({ prompt, shortAnswer: false })
    .then(result => {
      if (result?.success && result?.response) {
        const rawText = result.response;
        const jsonMatch = rawText.match(/\[[\s\S]*?\]/);

        if (jsonMatch) {
          try {
            const suggestedArray = JSON.parse(jsonMatch[0]);

            if (Array.isArray(suggestedArray)) {
              // Existing item names in lowercase to prevent duplicates
              const existingNames = new Set(currentItems.map(i => i.name.toLowerCase().trim()));

              // 3. Append to currentItems (DO NOT overwrite or call displayChecklist inside the loop)
              suggestedArray.forEach(label => {
                const cleanLabel = typeof label === 'string' ? label.trim() : '';
                if (cleanLabel.length > 0 && !existingNames.has(cleanLabel.toLowerCase())) {
                  currentItems.push({
                    id: (window.crypto && crypto.randomUUID) 
                      ? crypto.randomUUID() 
                      : 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    name: cleanLabel,
                    checked: false
                  });
                  existingNames.add(cleanLabel.toLowerCase());
                }
              });

              // 4. Single re-render after all items are added
              displayChecklist();
            }
          } catch (parseError) {
            console.error('Failed to parse AI output as JSON:', parseError);
          }
        }
      } else {
        if (typeof closeAiThinkingModal === 'function') closeAiThinkingModal();
      }
    })
    .catch(err => {
      console.error('AI Suggestion failed:', err);
    })
    .finally(() => {
      listItems.classList.remove('thinking');
      if (thinkingIndicator) thinkingIndicator.classList.add('hidden');
      if (addBtn1) addBtn1.classList.remove("hidden");
    });
}

function getSimpleChecklist() {
  const inputs = document.querySelectorAll('#checklistContainer .checklist-item input[type="text"]');
  
  return Array.from(inputs)
    .map(input => input.value.trim())
    .filter(text => text.length > 0);
}
document
  .getElementById("addListButton")
  .addEventListener("click", function () {
   currentListId = null;
    showAddListSection();
  });
function addItem(name = "") {
  const newItem = {
    id: crypto.randomUUID(),
    name: name,
    checked: false
  };
  currentItems.push(newItem);
  displayChecklist();


  setTimeout(() => {
    const input = document.getElementById(`text-${newItem.id}`);
    if (input) input.focus();
  }, 10);
}
function showAddListSection() {
  document.getElementById("addListSection").classList.remove("hidden");
  document.getElementById("addNoteSection").classList.add("hidden");
  showSection('addListSection');
  if (currentListId !== null) {
    const list = listsMap[currentListId];
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
  } else {
    document.getElementById("listTitle").value = "  Untitled List";
    currentItems = [];
    displayChecklist();
  }
 
  closeModal('addOptionsModal');
  document.getElementById("bottomBar").classList.add("hidden");
}
function cancelList() {
  currentListId = null;
  document.getElementById("listTitle").value = "";
  document.getElementById("listPassword").value = "";
  document.getElementById("addListSection").classList.add("hidden");
  showSection("combinedContainer");
  renderItems();
  renderItems();
  document.getElementById("listPasswordModalr").classList.add("hidden");
  document.getElementById("bottomBar").classList.remove("hidden");
   const homeTab = document.querySelector('.nav-item[onclick*="combinedContainer"]');
  if (homeTab) {
    setActive(homeTab);
    showSection('combinedContainer');
  };
  }
async function saveList() {
  const titleElem = document.getElementById("listTitle");
  const title = titleElem ? titleElem.value.trim() : "Untitled List";
  const passwordElem = document.getElementById("listPassword");
  const password = passwordElem ? passwordElem.value.trim() : "";
  const date = Date.now()
  const formattedDate = formatDate(date);
  const sanitizedItems = currentItems.filter(item => item.name.trim() !== "");
 


  if (title === "" || sanitizedItems.length === 0) {
    showToastError("Enter Data!");
    const errorSound = document.getElementById("errorSound");
    if (errorSound) errorSound.play();
    return;
  }
let id = currentListId || crypto.randomUUID();
  currentListId = id;
   const existingList = listsMap[id];
  const listData = {
     id,
    title: title,
    type: "list",
    items: JSON.parse(JSON.stringify(sanitizedItems)),
    password: password,
   remainderTime: existingList?.remainderTime || null,
   repeatType: existingList?.repeatType || "once",
    remainderEnabled: existingList?.remainderEnabled || false,
    notificationId: existingList?.notificationId || null,
    date
  };
  
if (listsMap[id]) {
  listsMap[id] = listData;
      lists = lists.map(l => l.id === id ? listData : l);
  showToast('Updated');
   const alertSound = document.getElementById("sucessSound");
  if (alertSound) alertSound.play();
} else {
  lists.push(listData);
  showToast('Saved');
   const alertSound = document.getElementById("sucessSound");
  if (alertSound) alertSound.play();
}
  await localforage.setItem("lists", lists);
  rebuildLists();
  renderItems();
  showSection("combinedContainer");
  currentListId = null;
  const modal = document.getElementById("listPasswordModalr");
  if (modal) modal.classList.add("hidden");
document.getElementById('bottomBar').classList.remove("hidden");
 const homeTab = document.querySelector('.nav-item[onclick*="combinedContainer"]');
  if (homeTab) {
    setActive(homeTab);
    showSection('combinedContainer');
  };
}
function verifyListPassword() {
  const password = document.getElementById("listPasswordInput").value;
  const modal = document.getElementById("listPasswordModal");
const listId = modal.dataset.listId;
   const list = listsMap[listId];
  if (password === list.password) {
    closeModal('listPasswordModal');
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
    currentListId = listId;
    showAddListSection();
    document.getElementById("listPassword").value = list.password;
  } else {
    showToastError("Incorrect password!");
    const sound = document.getElementById("errorSound");
    sound.play();
    const btn = document.getElementById('noteForget');
    btn.classList.remove('hidden');
  }
}

function displayLists() {
  const container = document.getElementById("itemsContainer");

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
         <span class="remainder-text" id="list-remainder-${list.id}">  ${getReminderText(list.remainderTime)}</span>
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

