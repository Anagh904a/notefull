
async function registerHandler() {
    const pairedDevices = Object.values(await getPairedDevices());

    console.log(
        "[SharedLists] Registering handlers for paired devices:",
        pairedDevices
    );

    for (const device of pairedDevices) {
        const deviceId = device?.deviceId;

        if (!deviceId) continue;

        onPeerMessage(
            deviceId,
            "shared-list-request",
            async (data, peer) => {
                console.log(
                    "[SharedLists] Invitation received:",
                    data,
                    peer
                );

                await receiveSharedListRequest(data);
            }
        );
           onPeerMessage(
            deviceId,
            "shared-list-request-accepted",
            async (data, peer) => {
               showToast('Your request has been accepted');
                 console.log(
                    "[SharedLists] Invitation accepted",
                    data,
                    peer
                );
               await sendSharedListSnapshot(data.deviceId, data.listId);
            }
        );
          onPeerMessage(
            deviceId,
            "shared-list-request-declined",
            async (data, peer) => {
                console.log(
                    "[SharedLists] Invitation declined",
                    data,
                    peer
                );

               showToastWarn('Your request has been declined');
            }
        );
        onPeerMessage(
            deviceId,
            "shared-list-handshake",
            async (data, peer) => {
                console.log(
                    "[SharedLists] List recieved",
                    data,
                    peer
                );

       await recieveSharedList(data);
            }
        );

    
    }
}
function receiveSharedListRequest(data) {

showToast('You have a new invitation!');

  
    sharedListRequests.push({
        requestId:
            crypto.randomUUID(),

          
            listId: data.listId,
deviceId: data.senderDeviceId,
displayName: data.senderDisplayName,
        receivedAt:
            Date.now()
    });

    renderSharedListRequests(
        sharedListRequests
    );
  
}

async function sendSharedListRequest(listId, identity, targetDevice) {
const data = {
    listId: listId,
    senderDeviceId: identity.deviceId,
    senderDisplayName: identity.displayName
};
sendPeerMessage(targetDevice, "shared-list-request", data);
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
                    
                   ${request.displayName} has sent you an inivitation to join a shared List
                </div>

            </div>

            <div class="shared-list-request__actions">

                <button class="nf-btn nf-btn--primary" onclick="acceptSharedListRequest('${request.requestId}')"> Accept and join </button>
                        
             
                <button class="nf-btn nf-btn--ghost" onclick="rejectSharedListRequest('${request.requestId}')"> Reject </button>
                   </div>
        `;

        container.appendChild(
            requestEl
        );
    });
    
}

async function acceptSharedListRequest(requestId) {


    const request =  sharedListRequests.find(item => item.requestId === requestId);


    if (!request) {
        return;
    }
    console.log(request);
    const identity = await getDeviceIdentity();
    const payload = {
        listId: request.listId,
        deviceId: identity.deviceId
    }
sendPeerMessage(request.deviceId, "shared-list-request-accepted", payload);
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
async function rejectSharedListRequest(requestId) {

    const request =  sharedListRequests.find(item => item.requestId === requestId);

    if (!request) {
        return;
    }

sendPeerMessage(request.deviceId, "shared-list-request-declined", "");

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

async function sendSharedListSnapshot(deviceId, listId) {
     const list =  sharedListsMap[listId];
    sendPeerMessage(deviceId, "shared-list-handshake", list);
     console.log('Sent', deviceId, 'shared list', list, 'succesfully');  
}




async function recieveSharedList(data) {
 console.log(
                "📥 Shared list received:",
               data
            );
          await saveSharedListStorage(data);
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

async function renderSharedListDevicePicker() {
    const deviceList = document.getElementById("deviceList");

    if (!deviceList) {
        console.error("[SharedLists] deviceList not found.");
        return;
    }

    const pairedDevices = Object.values(
        await getPairedDevices()
    );

    deviceList.innerHTML = "";

    if (!pairedDevices.length) {
        deviceList.innerHTML = `
            <div class="devices-empty">
                No paired devices found.
            </div>
        `;
        return;
    }

    pairedDevices.forEach(device => {

        if (!device?.deviceId) {
            return;
        }

        const deviceId = device.deviceId;
        const deviceName =
            device.displayName ||
            device.name ||
            deviceId;

        const row = document.createElement("label");

        row.className = "nf-device-row";

        row.innerHTML = `
            <input
                type="checkbox"
                class="nf-device-checkbox"
                value="${escapeSlHtml(deviceId)}"
            >

            <div class="nf-device-info">
                <div class="nf-device-name">
                    ${escapeSlHtml(deviceName)}
                </div>

                <div class="nf-device-id">
                    ${escapeSlHtml(deviceId)}
                </div>
            </div>
        `;

        deviceList.appendChild(row);
    });
}

async function handleAddSharedListMembers() {

    if (!currentSlId) {
        return;
    }

    const selectedDevices = [
        ...document.querySelectorAll(
            "#deviceList .nf-device-checkbox:checked"
        )
    ];

    if (!selectedDevices.length) {
        showToastError("Please select a device.");
        return;
    }

    try {

        for (const checkbox of selectedDevices) {

            const deviceId = checkbox.value;
let identity = await getDeviceIdentity();
            if (!deviceId) {
                continue;
            }

            await sendSharedListRequest(
                currentSlId, identity,
                deviceId,
          
            );

            console.log(
                "[SharedLists] Invitation sent:",
                deviceId
            );
        }

        showToast("Invitation sent");

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