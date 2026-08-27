/* ==========================================================================
   NOTEfull Shared Lists — V1
   --------------------------------------------------------------------------
Changes to make soon: remove bloat, remove unnessacry features (too mnay to remove)
   ========================================================================== 


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

        textInput.style.textDecoration =
            "line-through";

        textInput.style.color =
            "#94a3b8";

    } else {

        textInput.style.textDecoration =
            "none";

        textInput.style.color =
            "#0f172a";
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




function openSharedList(listId) {
    // UNIVERSAL 
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
}


async function saveSharedList() {

    const titleElem = document.getElementById("slTitle");

    const title = titleElem ? titleElem.value.trim() : "Untitled Shared List";


    const sanitizedItems = currentSharedItems.filter(item =>
        item.name &&
        item.name.trim() !== ""
    );


    if (title === "" || sanitizedItems.length === 0) {
        showToastError("Enter Data!");
        const errorSound = document.getElementById("errorSound");
        errorSound.play();
        return;
    }
    let id = currentSlId || crypto.randomUUID();
    currentSlId = id;
    let currentOwnerId = null;
    let currentMembers = null;
    let ownerId = null;
    let members = null;
    const existingList = sharedListsMap[id];
    const identity = await getDeviceIdentity();
    if (existingList) {
        existingList.ownerId = currentOwnerId;
        existingList.members = currentMembers;
    } else {
        identity = ownerId;
        members = null;
    }


    const listData = {
        id,
        title,
        items:
            JSON.parse(
                JSON.stringify(
                    sanitizedItems
                )
            ),
        ownerId,
 members
    };


    if (sharedListsMap[id]) {
        sharedListsMap[id] = listData;
        sharedLists = sharedLists.map(list => list.id === id ? listData : list);
showToast("Updated");
} else {
        sharedLists.push(listData );
sharedListsMap[id] =  listData;
showToast("Saved");
    }

    await localforage.setItem("sharedLists", sharedLists);
    rebuildsharedLists();
 displaysharedLists();
    showSection("combinedContainer");
currentSlId = null;

    currentOwnerId = null;
    currentMembers = null;

    document.getElementById(
        "navBar"
    )?.classList.remove(
        "hidden"
    );
}




function showSharedList() {
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
displaySlChecklist();
    }

    closeModal("addOptionsModal");
    document.getElementById("navBar")?.classList.add("hidden");
}

function canceSharedList() {
    currentSlId = null;
  currentOwnerId = null;

    document.getElementById("slTitle").value = "";

    document.getElementById("sharedListSection")?.classList.add("hidden");

    showSection("combinedContainer");

    displayNotes();
    displayLists();
    displaysharedLists();

    document.getElementById("navBar")?.classList.remove("hidden");
}

function displaysharedLists() {
    const container = document.getElementById("Slcontainer");
    const noListsMessage = document.getElementById("noSLMessage");
 container.innerHTML = "";

    if (sharedLists.length === 0) {
        noListsMessage.classList.remove("hidden");

    } else {
        noListsMessage.classList.add('hidden');
    }


    sharedLists.forEach(list => {
        const listDiv = document.createElement("div");

        const formattedDate = formatDate(
            new Date(list.updatedAt || list.date)
        );

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


function registerHandler() {

    pm.registerEvent(
        "SHARED_LIST_INVITE",
        (data, peer) => {
            receiveSharedListRequest(data, peer);
        }
    );
//can we reploace this witb notefull connect onPeerMessage? if not lets add agheler fucntion that does this kd of futionty 
    pm.registerEvent(
        "SHARED_LIST_INVITE_ACCEPTED",
        async data => {
            // existing accepted code
        }
    );

    pm.registerEvent(
        "SHARED_LIST_INVITE_REJECTED",
        data => {
            console.log(
                "Shared-list invitation rejected:",
                data.deviceId
            );
        }
    );

    pm.registerEvent(
        "SHARED_LIST_MEMBER_REMOVED",
        async data => {
            // existing member-removed code
        }
    );
}
function receiveSharedListRequest(
    data,
    peer
) {

    console.log(
        '📥 [SharedLists] INVITE RECEIVED',
        {
            data,
            peer
        }
    );
    sharedListRequests.push({
        requestId:
            crypto.randomUUID(),

        listId:
            data.listId,

        ownerDeviceId:
            data.ownerDeviceId,

        senderDeviceId:
            peer.deviceId,

        senderName:
            data.ownerName,

        receivedAt:
            Date.now()
    });

    renderSharedListRequests(
        sharedListRequests
    );
}

function renderSharedListRequests(requests = []) {

    const container =
        document.getElementById("requetsContainer");

    if (!container) {
        console.error(
            "[SharedLists] requetsContainer not found."
        );
        return;
    }

    container.innerHTML = "";

    if (!requests.length) {
        container.innerHTML = `
            <div class="requests-empty">
                No requests.
            </div>
        `;
        return;
    }

    requests.forEach(request => {

        const requestEl =
            document.createElement("div");

        requestEl.className =
            "shared-list-request";

        requestEl.innerHTML = `

            <div class="shared-list-request__info">

                <div class="shared-list-request__title">
                    Shared List Invitation
                </div>

                <div class="shared-list-request__from">
                    ${escapeSlHtml(
            request.senderName ||
            request.senderDeviceId ||
            "Unknown device"
        )}
                    invited you to a shared list.
                </div>

            </div>

            <div class="shared-list-request__actions">

                <button
                    class="nf-btn nf-btn--primary"
                    onclick="
                        acceptSharedListRequest(
                            '${escapeSlHtml(request.requestId)}'
                        )
                    "
                >
                    Accept
                </button>

                <button
                    class="nf-btn nf-btn--ghost"
                    onclick="
                        rejectSharedListRequest(
                            '${escapeSlHtml(request.requestId)}'
                        )
                    "
                >
                    Reject
                </button>

            </div>

        `;

        container.appendChild(
            requestEl
        );
    });
}

async function acceptSharedListRequest(
    requestId
) {

    const request =
        sharedListRequests.find(
            item =>
                item.requestId ===
                requestId
        );

    if (!request) {
        return;
    }

    const pm =
        window.NotefullPeerManagement;

    await pm.acceptInvite(
        request.listId,
        request.ownerDeviceId
    );

    sharedListRequests =
        sharedListRequests.filter(
            item =>
                item.requestId !==
                requestId
        );

    renderSharedListRequests(
        sharedListRequests
    );
}
async function rejectSharedListRequest(
    requestId
) {

    const request =
        sharedListRequests.find(
            item =>
                item.requestId ===
                requestId
        );

    if (!request) {
        return;
    }

    const pm =
        window.NotefullPeerManagement;

    await pm.rejectInvite(
        request.listId,
        request.ownerDeviceId
    );

    sharedListRequests =
        sharedListRequests.filter(
            item =>
                item.requestId !==
                requestId
        );

    renderSharedListRequests(
        sharedListRequests
    );
}




async function sendSharedListSnapshot(
    deviceId,
    list
) {

    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return;
    }


    await pm.sendEvent(
        deviceId,
        "SHARED_LIST_SNAPSHOT",
        {
            listId:
                list.id,

            title:
                list.title,

            items:
                list.items,

            ownerDeviceId:
                list.ownerDeviceId,

            members:
                list.members,

            date:
                list.date,

            updatedAt:
                list.updatedAt
        }
    );
}




async function registerSnapshotHandler() {

    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return;
    }


    pm.registerEvent(
        "SHARED_LIST_SNAPSHOT",
        async (
            data
        ) => {

            if (!data.listId) {
                return;
            }


            const listData = {

                id:
                    data.listId,

                title:
                    data.title,

                items:
                    data.items || [],

                ownerDeviceId:
                    data.ownerDeviceId,

                members:
                    data.members || {},

                date:
                    data.date ||
                    Date.now(),

                updatedAt:
                    data.updatedAt ||
                    Date.now()
            };


            const existingIndex =
                sharedLists.findIndex(
                    list =>
                        list.id ===
                        data.listId
                );


            if (
                existingIndex >= 0
            ) {

                sharedLists[
                    existingIndex
                ] =
                    listData;

            } else {

                sharedLists.push(
                    listData
                );
            }


            rebuildsharedLists();

            await saveSharedListsStorage();

            displaysharedLists();

            console.log(
                "📥 Shared list received:",
                data.listId
            );
        }
    );
}




async function reportSharedListActivity() {

    if (!currentSlId) {
        return;
    }


    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return;
    }


    const list =
        sharedListsMap[
        currentSlId
        ];


    if (!list) {
        return;
    }


    const me =
        await pm.getDeviceId();


 

    pm.markPeerEditing(
        currentSlId,
        me
    );
}



function setupSharedListMembersUI() {


    const deviceList =
        document.getElementById(
            "deviceList"
        );


    if (deviceList) {

        deviceList.addEventListener(
            "change",
            updateMemberAddButton
        );
    }


    const cancelButton =
        document.getElementById(
            "deviceCancel"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "devicePicker"
                    )
                    ?.classList.add(
                        "hidden"
                    );
            }
        );
    }


    const addMembersButton =
        document.getElementById(
            "addMembersBtn"
        );


    if (addMembersButton) {

        addMembersButton.addEventListener(
            "click",
            async () => {

                document
                    .getElementById(
                        "devicePicker"
                    )
                    ?.classList.remove(
                        "hidden"
                    );

                await renderMemberDevices();
            }
        );
    }
}



function getRuntimeMembers(
    listId
) {

    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return {};
    }


    return Object.fromEntries(
        pm.getMemberList(
            listId
        ).map(
            member => [
                member.deviceId,
                member
            ]
        )
    );
}


async function getLocalDeviceId() {

    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return null;
    }


    return pm.getDeviceId();
}


function escapeSlHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}




async function initializeSharedLists() {

   

    rebuildsharedLists();

    displaysharedLists();


  

    if (
        window.NotefullPeerManagement
    ) {

        registerSharedListPeerHandlers();

        await registerSnapshotHandler();
    }


    setupSharedListMembersUI();


    console.log(
        "✅ Shared Lists V1 ready."
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeSharedLists
    );

} else {

    initializeSharedLists();
} */
function switchTab(tabContainerId, tabId, sectionId) {

    const tabContainer = document.getElementById(tabContainerId);

    if (!tabContainer) return;

    tabContainer.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const container = tabContainer.parentElement;

    container.querySelectorAll('.nf-panel, .devices-section').forEach(section => {
        section.classList.add('hidden');
    });

    const tab = document.getElementById(tabId);
    const section = document.getElementById(sectionId);

    if (!tab || !section) return;

    tab.classList.add('active');
    section.classList.remove('hidden');
}


async function showAddDeviceSection() {
    document.getElementById('addDevice').classList.remove('hidden');
    document.getElementById('devices').classList.add('hidden');
const object =  await localStorage.getItem(NAME_SET);
        if (object === "false" || object === null) {
         document.getElementById('displayNameModal').classList.remove('hidden');  
    } else if (object === "true") {
         document.getElementById('displayNameModal').classList.add('add');  
    }

    document.getElementById('tabs').style.display = 'none';
    document.getElementById('mainHeading').classList.add('hidden');
    await initPairingUI();
}

function backtoDevices() {
    document.getElementById('addDevice').classList.add('hidden');
    document.getElementById('devices').classList.remove('hidden');
    document.getElementById('tabs').style.display = 'flex';
    document.getElementById('mainHeading').classList.remove('hidden');

}


function showConnectSection(method) {
    const method1 = document.getElementById('method1');
    const method2 = document.getElementById('method2');
    const text = document.getElementById('switchText');
    if (method === 'method2') {
        method1.classList.add('hidden');
        method2.classList.remove('hidden');
        text.innerText = 'See my QR code instead';
        text.onclick = function () {
            showConnectSection('method1');
        };
    } else if (method === 'method1') {
        method1.classList.remove('hidden');
        method2.classList.add('hidden');
        text.innerText = 'Scan a QR code instead';
        text.onclick = function () {
            showConnectSection('method2');
        };
    }
}

function showMembersModal() {
    document.getElementById('member-modal').classList.remove('hidden');
}
function openMembersSection() {
    showSection('membersSection');
}

/* ==========================================================================
   SHARED LIST MEMBERS UI HELPERS
   --------------------------------------------------------------------------
   UI only:
   - render member list
   - render paired devices
   - device selection
   - Add button count/state
   - member selection
   - online / editing status
   - last edited display
   - empty states
   - remove-member button wiring

   Actual P2P / invitation logic belongs to PeerManagement.
   ========================================================================== 

var selectedMemberId = null;




async function renderSharedListMembers(listId = currentSlId) {

    const list =
        sharedListsMap[listId];

    const memberList =
        document.getElementById("memberList");

    const noMembers =
        document.getElementById("noMembers");

    const totalMembers =
        document.getElementById("totalMembers");

    const onlineMembers =
        document.getElementById("onlineMembers");

    const lastEdited =
        document.getElementById("lastEdited");


    if (!memberList) {
        return;
    }


    memberList.innerHTML = "";

    selectedMemberId = null;


    if (!list) {

        if (totalMembers) {
            totalMembers.textContent = "0";
        }

        if (onlineMembers) {
            onlineMembers.textContent = "0";
        }

        if (lastEdited) {
            lastEdited.textContent = "—";
        }

        if (noMembers) {
            noMembers.classList.remove("hidden");
        }

        return;
    }


    const members =
        normalizeSharedListMembers(
            list.members
        );


    const memberArray =
        Object.values(members);


    if (totalMembers) {
        totalMembers.textContent =
            memberArray.length;
    }


    if (noMembers) {
        noMembers.classList.toggle(
            "hidden",
            memberArray.length > 0
        );
    }


    const pm =
        window.NotefullPeerManagement;


    let onlineCount = 0;


    const myDeviceId =
        pm
            ? pm.getDeviceId()
            : null;


    for (
        const member of memberArray
    ) {

        const isMe =
            member.deviceId ===
            myDeviceId;


        const online =
            pm
                ? pm.isOnline(
                    member.deviceId
                )
                : false;


        if (
            online &&
            !isMe
        ) {
            onlineCount++;
        }


        const editing =
            pm
                ? pm.isPeerActive(
                    listId,
                    member.deviceId
                )
                : false;


        const li =
            document.createElement("li");


        li.className =
            "nf-member";


        li.dataset.deviceId =
            member.deviceId;


        const owner =
            list.ownerDeviceId ===
            member.deviceId;


        li.innerHTML = `

            <button
                type="button"
                class="nf-member-row"
                data-member-id="${escapeSlHtml(
            member.deviceId
        )}"
            >

                <div class="nf-member-avatar">
                    ${escapeSlHtml(
            getMemberInitial(
                member.displayName
            )
        )}
                </div>

                <div class="nf-member-info">

                    <div class="nf-member-name">
                        ${escapeSlHtml(
            member.displayName ||
            member.deviceId
        )}

                        ${isMe
                ? `
                                    <span class="nf-member-you">
                                        You
                                    </span>
                                  `
                : ""
            }

                        ${owner
                ? `
                                    <span class="nf-member-owner">
                                        Owner
                                    </span>
                                  `
                : ""
            }

                    </div>

                    <div class="nf-member-status">

                        ${editing
                ? `
                                    <span class="nf-member-editing">
                                        Editing…
                                    </span>
                                  `
                : online
                    ? `
                                        <span class="nf-member-online">
                                            Online
                                        </span>
                                      `
                    : `
                                        <span class="nf-member-offline">
                                            Offline
                                        </span>
                                      `
            }

                    </div>

                </div>

            </button>
        `;


        const row =
            li.querySelector(
                ".nf-member-row"
            );


        row.addEventListener(
            "click",
            () => {

                selectSharedListMember(
                    member.deviceId
                );

            }
        );


        memberList.appendChild(
            li
        );
    }


    if (onlineMembers) {
        onlineMembers.textContent =
            onlineCount;
    }


    if (lastEdited) {

        lastEdited.textContent =
            formatSharedListTime(
                list.updatedAt ||
                list.date
            );
    }


    updateRemoveMemberButton(
        listId
    );
}




function normalizeSharedListMembers(
    members
) {

    if (!members) {
        return {};
    }





    if (
        !Array.isArray(members)
    ) {

        return members;
    }



    const result = {};


    for (
        const member of members
    ) {

        if (
            !member ||
            !member.deviceId
        ) {
            continue;
        }


        result[
            member.deviceId
        ] = member;
    }


    return result;
}




function selectSharedListMember(
    deviceId
) {

    selectedMemberId =
        deviceId;


    document
        .querySelectorAll(
            "#memberList .nf-member"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "selected",
                    element.dataset.deviceId ===
                    deviceId
                );

            }
        );


    updateRemoveMemberButton(
        currentSlId
    );
}


function clearSelectedMember() {

    selectedMemberId =
        null;


    document
        .querySelectorAll(
            "#memberList .nf-member.selected"
        )
        .forEach(
            element => {

                element.classList.remove(
                    "selected"
                );

            }
        );


    updateRemoveMemberButton(
        currentSlId
    );
}


function updateRemoveMemberButton(
    listId = currentSlId
) {

    const button =
        document.getElementById(
            "removeMemberBtn"
        );


    if (!button) {
        return;
    }


    const list =
        sharedListsMap[listId];


    const pm =
        window.NotefullPeerManagement;


    const isOwner =
        list &&
        pm &&
        pm.isOwner(
            listId
        );


    const selected =
        selectedMemberId;



    let disabled =
        !isOwner ||
        !selected;


    if (list && selected) {

        if (
            selected ===
            list.ownerDeviceId
        ) {
            disabled = true;
        }


        if (
            pm &&
            selected ===
            pm.getDeviceId()
        ) {
            disabled = true;
        }
    }


    button.disabled =
        disabled;
}




async function handleRemoveSelectedMember() {

    if (
        !currentSlId ||
        !selectedMemberId
    ) {
        return;
    }


    const list =
        sharedListsMap[
        currentSlId
        ];


    if (!list) {
        return;
    }


    if (
        selectedMemberId ===
        list.ownerDeviceId
    ) {
        return;
    }


    const member =
        normalizeSharedListMembers(
            list.members
        )[
        selectedMemberId
        ];


    const name =
        member?.displayName ||
        selectedMemberId;


    const confirmed =
        window.confirm(
            `Remove ${name} from this shared list?`
        );


    if (!confirmed) {
        return;
    }


    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        console.error(
            "PeerManagement unavailable."
        );
        return;
    }


    try {

        await pm.removeMember(
            currentSlId,
            selectedMemberId
        );


    
        if (
            list.members &&
            !Array.isArray(
                list.members
            )
        ) {

            delete list.members[
                selectedMemberId
            ];

        } else {

            list.members =
                (
                    list.members || []
                ).filter(
                    member =>
                        member.deviceId !==
                        selectedMemberId
                );
        }


        list.updatedAt =
            Date.now();


        await saveSharedListsStorage();


        clearSelectedMember();

        await renderSharedListMembers(
            currentSlId
        );

        showToast(
            "Member removed"
        );

    } catch (error) {

        console.error(
            "Failed to remove member:",
            error
        );

        showToastError(
            error.message ||
            "Could not remove member."
        );
    }
}




async function renderSharedListDevicePicker(
    listId = currentSlId
) {

    const deviceList =
        document.getElementById(
            "deviceList"
        );

    const noDevices =
        document.getElementById(
            "noDevices"
        );


    if (!deviceList) {
        return;
    }


    deviceList.innerHTML =
        "";


    const pm =
        window.NotefullPeerManagement;


    if (!pm) {

        showNoSharedListDevices(
            noDevices
        );

        return;
    }


    const pairedDevices =
        await pm.getOnlinePeers();


    const list =
        sharedListsMap[listId];


    const members =
        normalizeSharedListMembers(
            list?.members
        );


    const available =
        pairedDevices.filter(
            device =>
                !members[
                device.deviceId
                ]
        );


    if (
        available.length === 0
    ) {

        showNoSharedListDevices(
            noDevices
        );

        updateSharedListAddButton();

        return;
    }


    if (noDevices) {

        noDevices.classList.add(
            "nf-devices-empty--hidden"
        );
    }


    for (
        const device of
        available
    ) {

        const li =
            document.createElement(
                "li"
            );


        li.className =
            "nf-device";


        li.innerHTML = `

            <label class="nf-device-row">

                <input
                    type="checkbox"
                    class="nf-device-checkbox"
                    value="${escapeSlHtml(
            device.deviceId
        )}"
                >

                <span class="nf-device-name">
                    ${escapeSlHtml(
            device.displayName ||
            device.deviceId
        )}
                </span>

            </label>

        `;


        const checkbox =
            li.querySelector(
                ".nf-device-checkbox"
            );


        checkbox.addEventListener(
            "change",
            updateSharedListAddButton
        );


        deviceList.appendChild(
            li
        );
    }


    updateSharedListAddButton();
}


function showNoSharedListDevices(
    noDevices
) {

    if (!noDevices) {
        return;
    }


    noDevices.classList.remove(
        "nf-devices-empty--hidden"
    );
}




function getSelectedSharedListDevices() {

    return [
        ...document.querySelectorAll(
            "#deviceList .nf-device-checkbox:checked"
        )
    ].map(
        checkbox =>
            checkbox.value
    );
}


function updateSharedListAddButton() {

    const button =
        document.getElementById(
            "deviceAdd"
        );


    if (!button) {
        return;
    }


    const selected =
        getSelectedSharedListDevices();


    button.textContent =
        `Add (${selected.length})`;


    button.disabled =
        selected.length === 0;
}




async function handleAddSharedListMembers() {

    if (!currentSlId) {
        return;
    }


    const pm =
        window.NotefullPeerManagement;


    if (!pm) {
        return;
    }


    if (
        !pm.isOwner(
            currentSlId
        )
    ) {

        showToastError(
            "Only the owner can add members."
        );

        return;
    }


    const selected =
        getSelectedSharedListDevices();


    if (
        selected.length === 0
    ) {
        return;
    }


    for (
        const deviceId of
        selected
    ) {

        try {

            await pm.inviteMember(
                currentSlId,
                deviceId
            );

        } catch (error) {

            console.error(
                "Invitation failed:",
                error
            );

            showToastError(
                error.message ||
                "Invitation failed."
            );
        }
    }


   
    document
        .querySelectorAll(
            "#deviceList .nf-device-checkbox"
        )
        .forEach(
            checkbox => {
                checkbox.checked =
                    false;
            }
        );


    updateSharedListAddButton();

    showToast(
        "Invitation sent"
    );
}



function renderSharedListPermissions(
    listId = currentSlId
) {

    const permissionList =
        document.getElementById(
            "permissionList"
        );

    const noPermissions =
        document.getElementById(
            "noPermissions"
        );


    if (
        !permissionList ||
        !noPermissions
    ) {
        return;
    }



    permissionList.innerHTML =
        "";


    noPermissions.classList.remove(
        "nf-devices-empty--hidden"
    );
}



async function handleStopSharing() {

    if (!currentSlId) {
        return;
    }


    const list =
        sharedListsMap[
        currentSlId
        ];


    if (!list) {
        return;
    }


    const pm =
        window.NotefullPeerManagement;


    if (
        !pm ||
        !pm.isOwner(
            currentSlId
        )
    ) {

        showToastError(
            "Only the owner can stop sharing."
        );

        return;
    }


    const confirmed =
        window.confirm(
            "Stop sharing this list with all members?"
        );


    if (!confirmed) {
        return;
    }


    const members =
        Object.values(
            normalizeSharedListMembers(
                list.members
            )
        );


  

    for (
        const member of
        members
    ) {

        if (
            member.deviceId ===
            pm.getDeviceId()
        ) {
            continue;
        }


        if (
            pm.isOnline(
                member.deviceId
            )
        ) {

            try {

                await pm.sendEvent(
                    member.deviceId,
                    "SHARED_LIST_STOPPED",
                    {
                        listId:
                            currentSlId
                    }
                );

            } catch (error) {

                console.warn(
                    "Could not notify member:",
                    error
                );
            }
        }
    }


    

    sharedLists =
        sharedLists.filter(
            item =>
                item.id !==
                currentSlId
        );


    rebuildsharedLists();

    await saveSharedListsStorage();


    currentSlId =
        null;

  currentOwnerId =
        null;

    clearSelectedMember();

    displaysharedLists();

    canceSharedList();
}






async function refreshSharedListMembersUI(
    listId = currentSlId
) {

    await renderSharedListMembers(
        listId
    );

    await renderSharedListDevicePicker(
        listId
    );

    renderSharedListPermissions(
        listId
    );

    updateSharedListLastEdited(
        listId
    );
}

async function addMembers() {

    const picker =
        document.getElementById("devicePicker");

    if (!picker) {
        console.error(
            "[SharedLists] devicePicker not found."
        );
        return;
    }

    picker.classList.remove("hidden");

    await renderSharedListDevicePicker(
        currentSlId
    );

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
    }); */

// So, we need to refine this, major changes required, we need to modify existing system 
// of listId to actually retreive id from owner of the list or  if you are the owner , generate new one or use in storage
// we need to modify that saveList is very compplex, we need that it saves the list to all members after changes from any is reported
// It requires buidling fucntions that after receving changes silently update changes
// Functions to manage UI elemnts