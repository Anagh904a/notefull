let currentItems = [];
let currentListId = null;
let lists = [];
localforage.getItem("lists").then(storedLists => {
  lists = storedLists || [];

  listsMap = {};
  lists.forEach(list => {
    listsMap[list.id] = list;
  });

  displayLists(); // optional but usually needed
});

async function initLists() {
  lists = await localforage.getItem("lists") || [];
  displayLists();
}
initLists();

function rebuildLists() {
listsMap = {};
lists.forEach(l => listsMap[l.id] = l);
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
const index = currentItems.findIndex(i => i.id === itemId);
if (index !== -1) {
  currentItems.splice(index, 1);
  displayChecklist();
} else {
  showToastError('Corrupted')
}

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
      listDiv.innerHTML = `
  <div class="list" onclick="openList('${list.id}')">   
   <i class="fas fa-list"></i>
  <span class="list-date">${formattedDate}</span>
  <div class="note-header">
    <h4>${list.title}</h4>
    ${loclIndicator}
    </div>
  ${progressHTML} 
  <button class="delete-btn" onclick="deleteList('${list.id}'); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
  `;
      container.appendChild(listDiv);
    });

}
async function deleteList(listId) {
  const list = listsMap[listId];
  const index = lists.findIndex(l => l.id === listId);
  if (list.password) {
    document.getElementById("deleteListPasswordModal").classList.remove("hidden");
    document.getElementById("deleteListPasswordModal").dataset.listId =
      list.id;
  } else {
    if (confirm("Are you sure you want to delete this list?")) {
      lists.splice(index, 1);
      await localforage.setItem("lists", lists);
      displayLists();
    }
  }
  rebuildLists();
  displayLists();
}
function openList(listId) {
  const list = listsMap[listId];
  
  if (list.password) {
    document.getElementById("listPasswordModal").dataset.listId =
      list.id;
    document.getElementById("listPasswordModal").classList.remove("hidden");
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
  const itemText = document.getElementById("itemTextl");
  itemText.querySelector("h2").textContent = `Manage your ${list.title}`;
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

  // focus the newly added item
  setTimeout(() => {
    const input = document.querySelector(
      `input[oninput*="${newItem.id}"]`
    );
    if (input) input.focus();
  }, 10);
}
function showAddListSection() {
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
  document.getElementById("addListSection").classList.remove("hidden");
  document.getElementById("addNoteSection").classList.add("hidden");
  showSection('addListSection');
  if (currentListId !== null) {
    const list = listsMap[currentListId];
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
  } else {
    document.getElementById("listTitle").value = "";
    currentItems = [];
    displayChecklist();
  }
  const itemText = document.getElementById("itemTextl");
  itemText.querySelector("h2").textContent = "Create a new List";
  closeModal('addOptionsModal');
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
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
  document.getElementById("nav").classList.remove("hidden");
  document.getElementById("add").classList.remove("hidden");
}
async function saveList() {
  const titleElem = document.getElementById("listTitle");
  const title = titleElem ? titleElem.value.trim() : "Untitled List";
  const passwordElem = document.getElementById("listPassword");
  const password = passwordElem ? passwordElem.value.trim() : "";
  const date = new Date();
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

  const listData = {
     id,
    title: title,
    items: JSON.parse(JSON.stringify(sanitizedItems)),
    password: password,
    date: formattedDate
  
  };
  const index = lists.findIndex(l => l.id === id);

if (index !== -1) {
  lists[index] = listData;
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
 
document.getElementById('nav').classList.remove("hidden");
document.getElementById('add').classList.remove("hidden");
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
async function deleteListVerifyPassword() {
  const passwordInput = document.getElementById("deleteListPasswordInput").value;
  const modal = document.getElementById("deleteListPasswordModal");
const listId = modal.dataset.listId;

const index = lists.findIndex(l => l.id === listId);
  console.log("List Index:", index);
  const list = listsMap[listId];
  if (!list) {
    console.error("List not found at index:", index);
    return;
  }
  if (passwordInput === list.password) {
    lists.splice(index, 1);
    await localforage.setItem("lists", lists);
    document.getElementById("deleteListPasswordModal").classList.add("hidden");
    document.getElementById("listPasswordModal").classList.add("hidden");
    rebuildLists();
    displayLists();
  } else {
    showToastError("Incorrect password!");
    const sound = document.getElementById("errorSound");
    sound.play();
  }

}