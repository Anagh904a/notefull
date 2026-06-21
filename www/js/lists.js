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
  const buttonAdd = document.getElementById("orignal-add-item-btn");
  if (currentItems.length === 0) {
    noItemsMessage.classList.remove("hidden");
  } else {
    noItemsMessage.classList.add("hidden");
  }

  if (currentItems.length >= 2 ) {
    buttonAdd.classList.remove("hidden");
} else {
  buttonAdd.classList.add('hidden');
}
   checklistContainer.innerHTML = "";
  currentItems.forEach((item) => {
  const itemDiv = document.createElement("div");
  itemDiv.innerHTML = `
<div class="checklist-item">
  <input type="checkbox"
    ${item.checked ? "checked" : ""}
    onchange="toggleCheck('${item.id}')">
  <input type="text"
  id="text-${item.id}"
    value="${item.name}"
    oninput="updateItemName('${item.id}', this.value)"
    placeholder="Type your task here..."
    style="${item.checked ? 'text-decoration: line-through; color: #94a3b8;' : ''}">
  <button onclick="removeItem('${item.id}')"><i class="fas fa-trash"></i></button>
</div>
`;
  checklistContainer.appendChild(itemDiv);
});
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
function displayLists() {
  const container = document.getElementById("listsContainerContent");
  container.innerHTML = "";
  const noListsMessage = document.getElementById("noListsMessage");
  if (lists.length === 0) {
    noListsMessage.classList.remove("hidden");
  } else {
    noListsMessage.classList.add("hidden");
  }
    lists.forEach((list) => {
      if (list.selected === undefined || list.selected === true) {
        list.selected = false;
      }
      const listDiv = document.createElement("div");
      const listDate = new Date(list.date);
      const formattedDate = formatDate(listDate);
      const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
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
      <i class="fa-solid fa-hourglass"></i> 
         <span class="remainder-text" id="list-remainder-${list.id}">  ${getReminderText(list.remainderTime)}</span>
       </div>`
      : "";
      listDiv.innerHTML = `
      <div class="list-wrapper" id="listWrapper" data-id="${list.id}">
            <input type="checkbox" id="selectBoxList" onchange="selectList('${list.id}')" class="select-box hidden">
  <div class="list" onclick="openList('${list.id}')">   
   <i class="fas fa-list"></i>
  
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
document
  .getElementById("addListButton")
  .addEventListener("click", function () {
   currentListId = null;
    showAddListSection();
  });
function addItem() {
  const newItem = {
    id: crypto.randomUUID(),
    name: "",
    checked: false
  };
  currentItems.push(newItem);
  displayChecklist();

  setTimeout(() => {
    const input = document.querySelector(
      `input[oninput*="${newItem.id}"]`
    );
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
  document.getElementById("navBar").classList.add("hidden");
}
function cancelList() {
  currentListId = null;
  document.getElementById("listTitle").value = "";
  document.getElementById("listPassword").value = "";
  document.getElementById("addListSection").classList.add("hidden");
  showSection("combinedContainer");
  displayNotes();
  displayLists();
  document.getElementById("listPasswordModalr").classList.add("hidden");
  document.getElementById("navBar").classList.remove("hidden");
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
  displayLists();
  showSection("combinedContainer");
  currentListId = null;
  const modal = document.getElementById("listPasswordModalr");
  if (modal) modal.classList.add("hidden");
document.getElementById('navBar').classList.remove("hidden");
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
  }
}