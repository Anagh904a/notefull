let currentSlId = null;
let currentSharedItems = [];
let sharedListRequests = [];
let sharedLists = [];
let sharedListsMap = {};

let currentSharedListOwner = null;
let currentSharedListMembers = null;

function rebuildsharedLists() {
 sharedListsMap = {};
sharedLists.forEach(
        list => {
            sharedListsMap[list.id] = list;
        }
    );
}

function displaySlChecklist() {
    const checklistContainer = document.getElementById("slItemsContainer");
    const noItemsMessage = document.getElementById("sl-items-no");

    if (currentSharedItems.length === 0) {
        noItemsMessage.classList.remove('hidden');
    } else {
        noItemsMessage.classList.add('hidden');
    }
    checklistContainer.innerHTML = "";

    currentSharedItems.forEach(item => {
        const itemDiv = document.createElement("div");

        itemDiv.innerHTML = `
            <div class="checklist-item">
                <input type="checkbox" ${item.checked ? "checked" : ""} onchange="toggleSlCheck('${item.id}')">

                <input type="text" id="text-${item.id}" value="${escapeSlHtml(item.name)}" oninput="updateSlItemName('${item.id}', this.value)"
                    placeholder="Type your task here..."
                    style="${item.checked ? "text-decoration: line-through; color: #94a3b8;" : ""}">

                <button onclick="removeSlItem('${item.id}')">
                    <i class="ti ti-trash"></i>
                </button>
            </div>
        `;

        checklistContainer.appendChild(itemDiv);
    });
}

function toggleSlCheck(itemId) {
 const item = currentSharedItems.find(i => i.id === itemId);
 
 if (!item) {
        return;
    }

 item.checked = !item.checked;
 const textInput = document.getElementById(`text-${itemId}`);

    if (!textInput) {
        return;
    }

    if (item.checked) {
textInput.style.textDecoration =  "line-through";
 textInput.style.color = "#94a3b8";
 } else {
textInput.style.textDecoration =  "none";
 textInput.style.color = "#0f172a";
    }
    //SYNC 
}


function updateSlItemName(itemId, value) {
const item = currentSharedItems.find(i => i.id === itemId);

    if (!item) {
        return;
    }

    item.name = value;
    //SYNC
}

function removeSlItem(itemId) {
 currentSharedItems = currentSharedItems.filter(item => item.id !== itemId);
displaySlChecklist();
    //SYNC
}

function addSlItem() {

    const newItem = {
        id: crypto.randomUUID(),
        name: "",
        checked: false
    };

    currentSharedItems.push(newItem);
    displaySlChecklist();
    //sync 

    setTimeout(
        () => {

            const input =
                document.querySelector(
                    `input[oninput*="${newItem.id}"]`
                );

            if (input) {
                input.focus();
            }

        },
        10
    );
}




async function openSharedList(listId) {
   
    const list = sharedListsMap[listId];

    if (!list) {
        showToastError("Shared list not found");
        return;
    }

    currentSlId = list.id;
    document.getElementById("slTitle").value = list.title || "Untitled List";
    currentSharedItems = list.items.slice();
    displaySlChecklist();
    showSharedList();
   // await initializeProtocol(list);
   await showToastWarn('Shared lists do not work yet and are under development');
}


async function saveSharedList() {
    const titleElem = document.getElementById("slTitle");
    const title = titleElem ? titleElem.value.trim() : "Untitled Shared List";
    const sanitizedItems = currentSharedItems.filter(item =>
        item.name && item.name.trim() !== ""
    );

    if (title === "" || sanitizedItems.length === 0) {
        showToastError("Enter Title and at least one item!");
        const errorSound = document.getElementById("errorSound");
        if (errorSound) errorSound.play().catch(() => {});
        return;
    }

    const id = currentSlId || crypto.randomUUID();
    const existingList = sharedListsMap[id];
    const identity = await getDeviceIdentity();

    // 🟢 Keep existing ownership & members if updating; initialize them if new
    let ownerId;
    let members;

    if (existingList) {
        ownerId = existingList.ownerId || identity.deviceId;
        members = Array.isArray(existingList.members) ? existingList.members : [];
    } else {
        ownerId = identity.deviceId;
        members = [
            {
                deviceId: identity.deviceId,
                displayName: identity.displayName || "Owner",
                role: "owner"
            }
        ];
    }

    const listData = {
        id,
        title,
        type: "sharedList",
        items: JSON.parse(JSON.stringify(sanitizedItems)),
        ownerId,
        members,
        updatedAt: Date.now()
    };

    // Update in-memory collections
    if (sharedListsMap[id]) {
        sharedListsMap[id] = listData;
        sharedLists = sharedLists.map(list => list.id === id ? listData : list);
        showToast("Updated");
    } else {
        sharedLists.push(listData);
        sharedListsMap[id] = listData;
        showToast("Saved");
    }

    // Persist to offline database
    await localforage.setItem("sharedLists", sharedLists);
    rebuildsharedLists();
    renderItems();

    // 🟢 Disconnect from room when closing/saving
    if (typeof leaveCurrentSharedList === "function") {
        leaveCurrentSharedList();
    } else if (currentRoom) {
        currentRoom.leave();
        currentRoom = null;
        if (verifiedPeers) verifiedPeers.clear();
    }

    // Reset UI state
    showSection("combinedContainer");
    currentSlId = null;
    currentSharedItems = [];

    document.getElementById("bottomBar")?.classList.remove("hidden");
}
async function saveSharedListStorage(list) {


    const listData = {
        id: list.id,
        title: list.title,
          type: sharedList,
        items: list.items,
        ownerId: list.ownerId,
 members: list.members
    };


    if (sharedListsMap[list.id]) {
        sharedListsMap[list.id] = listData;
        sharedLists = sharedLists.map(sharedList => sharedList.id === list.id ? listData : sharedList);
} else {
        sharedLists.push(listData);
sharedListsMap[list.id] =  listData;
    }

    await localforage.setItem("sharedLists", sharedLists);
    rebuildsharedLists();
 renderItems();
}

async function showSharedList() {
    showSection("sharedListSection");

    if (currentSlId !== null) {
        const list = sharedListsMap[currentSlId];
if (!list) return;
 document.getElementById("slTitle").value = list.title;
currentSharedItems = list.items.map(item => ({ ...item }));
      currentOwnerId = list.ownerId;
currentMembers = list.members;
        displaySlChecklist();
    } else {
        document.getElementById("slTitle").value = "Untitled List";
        currentSharedItems = [];
        const identity = await NC.getDeviceIdentity();
         currentOwnerId = identity;
displaySlChecklist();
    }

    closeModal("addOptionsModal");
    document.getElementById("bottomBar")?.classList.add("hidden");
}



document.getElementById("deviceCancel")
    ?.addEventListener("click", () => {

        document
            .getElementById("devicePicker")
            ?.classList.add("hidden");

        document
            .querySelectorAll(
                "#deviceList .nf-device-checkbox"
            )
            .forEach(
                checkbox => {
                    checkbox.checked = false;
                }
            );

        updateSharedListAddButton();
    }); 
    async function initializeSharedLists() {
    try {
        // 1. Load saved lists from LocalForage
        const saved = await localforage.getItem("sharedLists");
        if (Array.isArray(saved)) {
            sharedLists = saved;
        }
    } catch (e) {
        console.error("Failed to load sharedLists from storage:", e);
    }

    // 2. Hydrate in-memory map & render UI
    rebuildsharedLists();
    renderItems();

}

// Auto-run on boot
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSharedLists);
} else {
    initializeSharedLists();
}
function displaysharedLists() {
    const container = document.getElementById("itemsContainer");

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
            <div
                class="list"
                onclick="openSharedList('${escapeSlHtml(list.id)}')"
            >
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

  