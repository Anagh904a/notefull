let currentItems = [];
let editingListIndex = null;
let currentListId = null;
let lists = [];
async function initLists() {
  lists = await localforage.getItem("lists") || [];
  displayLists();
}
initLists();
function displayChecklist() {
  const checklistContainer = document.getElementById("checklistContainer");
  const noItemsMessage = document.getElementById("items-no");
  if (currentItems.length === 0) {
    noItemsMessage.classList.remove("hidden");
  } else {
    noItemsMessage.classList.add("hidden");
  }
  checklistContainer.innerHTML = "";
  currentItems.forEach((item, index) => {
    const itemDiv = document.createElement("div");
    itemDiv.innerHTML = `
<div class="checklist-item">
  <input type="checkbox" id="item-${index}" ${item.checked ? "checked" : ""} onchange="toggleCheck(${index})">
  <input type="text" id="text-${index}" value="${item.name}" oninput="currentItems[${index}].name = this.value" placeholder="Type your task here..." style="${item.checked ? 'text-decoration: line-through; color: #94a3b8;' : ''}">
  <button class="delete-btn-list" onclick="removeItem(${index})"><i class="fas fa-trash"></i> </button>
</div>
`;
    checklistContainer.appendChild(itemDiv);
  });
}
function toggleCheck(index) {
  currentItems[index].checked = !currentItems[index].checked;
  const textInput = document.getElementById(`text-${index}`);
  if (currentItems[index].checked) {
    textInput.style.textDecoration = "line-through";
    textInput.style.color = "#94a3b8";
  } else {
    textInput.style.textDecoration = "none";
    textInput.style.color = "#0f172a";
  }
}
function removeItem(index) {
  currentItems.splice(index, 1);
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
  setTimeout(() => {
    lists.forEach((list, index) => {
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
  <div class="list" onclick="openList(${index})">   
   <i class="fas fa-list"></i>
  <span class="list-date">${formattedDate}</span>
  <div class="note-header">
    <h4>${list.title}</h4>
    ${loclIndicator}
    </div>
  ${progressHTML} 
  <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
  `;
      container.appendChild(listDiv);
    });
  }, 0)
}
async function deleteList(index) {
  const list = lists[index];
  if (list.password) {
    document.getElementById("deleteListPasswordModal").classList.remove("hidden");
    document.getElementById("deleteListPasswordModal").dataset.listIndex =
      index;
  } else {
    if (confirm("Are you sure you want to delete this list?")) {
      lists.splice(index, 1);
      await localforage.setItem("lists", lists);
      displayLists();
    }
  }
  displayLists();
}
function openList(index) {
  const list = lists[index];
  if (list.password) {
    document.getElementById("listPasswordModal").dataset.listIndex =
      index;
    document.getElementById("listPasswordModal").classList.remove("hidden");
    document.getElementById("listPasswordInput").value = "";
  } else {
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
    editingListIndex = index;
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
    editingListIndex = null;
    showAddListSection();
  });
function showListsSection() {
  showSection("combinedContainer");
  displayLists();
}
function addItem() {
  currentItems.push({
    name: "",
    checked: false
  });
  displayChecklist();
  const lastIndex = currentItems.length - 1;
  setTimeout(() => {
    const lastInput = document.getElementById(`text-${lastIndex}`);
    if (lastInput) lastInput.focus();
  }, 10);
}
function showAddListSection() {
  document.querySelectorAll(".container").forEach((section) => {
  });
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
  document.getElementById("addListSection").classList.remove("hidden");
  document.getElementById("addNoteSection").classList.add("hidden");
  showSection('addListSection');
  if (editingListIndex !== null) {
    const list = lists[editingListIndex];
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
  const listData = {
    title: title,
    items: JSON.parse(JSON.stringify(sanitizedItems)),
    password: password,
    date: formattedDate,
    listId: currentListId || Date.now()
  };
  if (editingListIndex !== null) {
    lists[editingListIndex] = listData;
  } else if (currentListId) {
    const draftIndex = lists.findIndex(l => l.listId === currentListId);
    if (draftIndex !== -1) {
      lists[draftIndex] = listData;
    } else {
      lists.push(listData);
    }
  } else {
    lists.push(listData);
  }
  await localforage.setItem("lists", lists);
  showToast("Saved");
  const alertSound = document.getElementById("sucessSound");
  if (alertSound) alertSound.play();
  displayLists();
  showSection("combinedContainer");
  editingListIndex = null;
  currentListId = null;
  const modal = document.getElementById("listPasswordModalr");
  if (modal) modal.classList.add("hidden");
  if (typeof syncListToIndexedDB === "function") {
    syncListToIndexedDB(listData);
  }
  cancelNote();
}
function verifyListPassword() {
  const password = document.getElementById("listPasswordInput").value;
  const listIndex =
    document.getElementById("listPasswordModal").dataset.listIndex;
  const list = lists[listIndex];
  if (password === list.password) {
    closeModal('listPasswordModal');
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice();
    displayChecklist();
    editingListIndex = listIndex;
    showAddListSection();
    document.getElementById("listPassword").value = list.password;
  } else {
    showToastError("Incorrect password!");
    const sound = document.getElementById("errorSound");
    sound.play();
  }
}
async function deleteListVerifyPassword() {
  const passwordInput = document.getElementById(
    "deleteListPasswordInput"
  ).value;
  const index = document.getElementById("deleteListPasswordModal").dataset
    .listIndex;
  console.log("List Index:", index);
  const list = lists[index];
  if (!list) {
    console.error("List not found at index:", index);
    return;
  }
  if (passwordInput === list.password) {
    lists.splice(index, 1);
    await localforage.setItem("lists", lists);
    document.getElementById("deleteListPasswordModal").classList.add("hidden");
    document.getElementById("listPasswordModal").classList.add("hidden");
    displayLists();
  } else {
    showToastError("Incorrect password!");
    const sound = document.getElementById("errorSound");
    sound.play();
  }
}