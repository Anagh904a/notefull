let currentItems = []; // Will now store objects like { name: 'item name', checked: true/false }
let editingListIndex = null;
let currentListId = null;



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
 
  <button class="delete-btn" onclick="removeItem(${index})"><i class="fas fa-trash"></i> Remove</button>
</div>

`;
checklistContainer.appendChild(itemDiv);
});
}

function toggleCheck(index) {
currentItems[index].checked = !currentItems[index].checked;
// Optionally, you can update localStorage or do something here if needed immediately
const textInput = document.getElementById(`text-${index}`);
  

  // 3. Update the UI visually
  if (currentItems[index].checked) {
    textInput.style.textDecoration = "line-through";
    textInput.style.color = "#94a3b8"; // Dim the color on white background
  } else {
    textInput.style.textDecoration = "none";
    textInput.style.color = "#0f172a"; // Return to original text color
  }
}


// Function to remove an item from the checklist
function removeItem(index) {
  currentItems.splice(index, 1); // Remove the item from the array
  displayChecklist(); // Update the checklist display
}

// Function to display lists
function displayLists() {
  const container = document.getElementById("listsContainerContent");
  container.innerHTML = ""; // Clear existing lists
  const noListsMessage = document.getElementById("noListsMessage"); // Get
 
  if (lists.length === 0) {
    noListsMessage.classList.remove("hidden"); // Show the no lists message
  } else {
    noListsMessage.classList.add("hidden");
  } // Hide the no lists message
  lists.forEach((list, index) => {
    const listDiv = document.createElement("div");
    const listDate = new Date(list.date); // Convert the stored date string back to a Date object
    const formattedDate = formatDate(listDate); // Format the date for display
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
}

// Function to delete a list
function deleteList(index) {
  const list = lists[index];

  // Check if the list has a password
  if (list.password) {
    // Show the password modal for deletion
    document.getElementById("deleteListPasswordModal").style.display =
      "flex";
    document.getElementById("deleteListPasswordModal").dataset.listIndex =
      index; // Set the index here
  } else {
    // If no password is required, confirm deletion
    if (confirm("Are you sure you want to delete this list?")) {
      lists.splice(index, 1); // Remove the list
      localStorage.setItem("lists", JSON.stringify(lists)); // Update local storage
      displayLists(); // Refresh the displayed lists
    }
  }
  syncListToIndexedDB(list);
  displayLists();
}

function openList(index) {
  const list = lists[index];


  // Check if the list has a password
  if (list.password) {
    // Store the index of the list being accessed in the modal
    document.getElementById("listPasswordModal").dataset.listIndex =
      index;
    document.getElementById("listPasswordModal").style.display = "flex";
    document.getElementById("listPasswordInput").value = "";
  } else {
    // If no password is required, proceed to open the list
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    editingListIndex = index;
    showAddListSection(); // Show the add list section
    document.getElementById("listPassword").value = list.password;
  }
  const itemText = document.getElementById("itemTextl");
  showSection('addListSection');
 document.getElementById('ubtn').style.display = "none";

  // Change the heading and paragraph
  itemText.querySelector("h2").textContent = "Manage your List";
 
}


document
  .getElementById("addListButton")
  .addEventListener("click", function () {
    editingListIndex = null; // Reset the editing index for a new list
    showAddListSection(); // Show the add list section for a new list
  });

const lists = JSON.parse(localStorage.getItem("lists")) || [];


// Function to show the lists section
function showListsSection() {
  showSection("combinedContainer");
  displayLists(); // Refresh the displayed lists
}

// Function to add an item to the checklist
function addItem() {
    // 1. Add a blank item to the data array
    currentItems.push({ 
        name: "", 
        checked: false 
    });

    // 2. Re-render the UI so the new empty row appears
    displayChecklist();

    // 3. Optional: Automatically focus the new input so user can type
    const lastIndex = currentItems.length - 1;
    setTimeout(() => {
        const lastInput = document.getElementById(`text-${lastIndex}`);
        if (lastInput) lastInput.focus();
    }, 10);
    
  
}

function syncListToIndexedDB(listData) {
  console.log("Trying to sync list to IndexedDB...");

  if (!db) return;
  const syncState = localStorage.getItem("syncEnabled");
  if (syncState !== "true") return;

  if (!listData.listId) {
    listData.listId = `${listData.title}-${Date.now()}`;
  }

  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(listData);
  localStorage.setItem("lastSynced", new Date().toISOString());
updateLastSyncedDisplay();
}

function showAddListSection() {
  // Hide all sections first

  document.querySelectorAll(".container").forEach((section) => {
    
  });

  // Show the add list section

   document.getElementById("nav").classList.add("hidden");
document.getElementById("addListSection").classList.remove("hidden"); // Show the add list section
document.getElementById("addNoteSection").classList.add("hidden"); // Show the add list section
showSection('addListSection');
document.getElementById('ubtn').style.display = "none";

  if (editingListIndex !== null) {
    const list = lists[editingListIndex]; // Get the list being edited
    document.getElementById("listTitle").value = list.title; // Set the input value to the list title
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    
  } else {
    // Reset for new list
    document.getElementById("listTitle").value = ""; // Clear the title input
   
    currentItems = []; // Reset current items
    displayChecklist(); // Clear the checklist display
  }

 
    const itemText = document.getElementById("itemTextl");

  itemText.querySelector("h2").textContent = "Create a new CheckList";
 closeAddOptions();
    document.getElementById("nav").classList.add("hidden");
}

// Function to cancel adding a list
function cancelList() {
  // Hide the add list section and show the lists section
  currentListId = null; // Also clear the draft list ID on cancel
document.getElementById("listTitle").value = "";
document.getElementById("listPassword").value = "";

    document.getElementById("addListSection").classList.add("hidden"); // Hide the add list section
  showSection("combinedContainer"); // Show the lists section
  displayNotes();
  displayLists();
  document.getElementById("listPasswordModalr").classList.add("hidden");
     document.getElementById("nav").classList.remove("hidden");

}


// Function to show a specific section

// Function to save a new list
function saveList() {
    const titleElem = document.getElementById("listTitle");
    const title = titleElem ? titleElem.value.trim() : "Untitled List";
    const passwordElem = document.getElementById("listPassword");
    const password = passwordElem ? passwordElem.value.trim() : "";
    
    const date = new Date();
    const formattedDate = formatDate(date);

    // Validation: Check if title exists. 
    // We allow currentItems to be saved even if empty items exist, 
    // but we filter out completely empty strings to keep the data clean.
    const sanitizedItems = currentItems.filter(item => item.name.trim() !== "");

    if (title === "" || sanitizedItems.length === 0) {
        showToastError("Enter Data!");
        const errorSound = document.getElementById("errorSound");
        if (errorSound) errorSound.play();
        return;
    }

    const listData = {
        title: title,
        items: JSON.parse(JSON.stringify(sanitizedItems)), // Deep copy of non-empty items
        password: password,
        date: formattedDate,
        listId: currentListId || Date.now() // Ensure a unique ID exists
    };

    // SAVE LOGIC
    if (editingListIndex !== null) {
        // Updating an existing list
        lists[editingListIndex] = listData;
    } else if (currentListId) {
        // Updating a draft/new list being edited
        const draftIndex = lists.findIndex(l => l.listId === currentListId);
        if (draftIndex !== -1) {
            lists[draftIndex] = listData;
        } else {
            lists.push(listData);
        }
    } else {
        // Purely new list
        lists.push(listData);
    }

    // Persist to Storage
    localStorage.setItem("lists", JSON.stringify(lists));
    
    // UI Feedback
    showToast("Saved");
    const alertSound = document.getElementById("alertSound");
    if (alertSound) alertSound.play();

    // Reset State & Navigation
    displayLists();
    showSection("combinedContainer");
    
    editingListIndex = null;
    currentListId = null; 
    
    const modal = document.getElementById("listPasswordModalr");
    if (modal) modal.classList.add("hidden");

    // Background Sync
    if (typeof syncListToIndexedDB === "function") {
        syncListToIndexedDB(listData);
    }
    
    cancelNote(); // Return to home view

}

function verifyListPassword() {
  const password = document.getElementById("listPasswordInput").value;
  const listIndex =
    document.getElementById("listPasswordModal").dataset.listIndex; // Assuming you set this when opening the modal
  const list = lists[listIndex]; // Get the list being accessed

  if (password === list.password) {
    document.getElementById("listPasswordModal").style.display = "none"; // Close the modal
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    editingListIndex = listIndex; // Update the editing list index
    showAddListSection(); // Implement this function to display the list content
    document.getElementById("listPassword").value = list.password;
  } else {
     showToastError("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}




// Function to show the delete password modal

// Function to close the delete list password mod

// Function to verify the password for deleting the list
// Function to verify the password for deleting the list
function deleteListVerifyPassword() {
  const passwordInput = document.getElementById(
    "deleteListPasswordInput"
  ).value;
  const index = document.getElementById("deleteListPasswordModal").dataset
    .listIndex; // Get the index of the list being deleted

  console.log("List Index:", index); // Debugging line

  const list = lists[index]; // Get the list being deleted

  if (!list) {
    console.error("List not found at index:", index); // Log an error if the list is undefined
    return; // Exit the function if the list is not found
  }

  if (passwordInput === list.password) {
    // If the password is correct, delete the list
    lists.splice(index, 1);
    localStorage.setItem("lists", JSON.stringify(lists));
    document.getElementById("deleteListPasswordModal").style.display =
      "none";
    document.getElementById("listPasswordModal").style.display = "none";
    displayLists();
  } else {
     showToastError("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}