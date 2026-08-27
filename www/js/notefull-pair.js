/* ==========================================================================
   Notefull Connect — This is the foundational layer that is used by shared lists as of now.
   ========================================================================== */


    const KEY_IDENTITY      = 'nf_device_identity';
    const KEY_PAIRED_DEVICES = 'nf_paired_devices';
    const PAIRING_PROTOCOL  = 'notefull-connect';
    const PAIRING_LIMIT    = 10 * 60 * 1000;   // 10 min pairing window
    const TRYSTERO_CONFIG   = {
        appId: 'notefull-connect',
        relayConfig: {
            urls: [
                'wss://nos.lol/',
                'wss://nostr.wine/',
                'wss://relay.nostr.info/',
                'wss://nostr.einundzwanzig.space/',
                'wss://relay.primal.net/',
                'wss://nostr.mom/',
                'wss://nostr.oxtr.dev/',
                'wss://relay.nostr.net/',
                'wss://relay.snort.social/',
                'wss://relay.orangepill.dev/',
                'wss://nostr-pub.wellorder.net/'
            ],
            warnOnRelayFailure: false
        }
    };

    //PHASE 1 BASIC PARING LOGIC

    let activePairingSession = null;   // current pairing session (initiator)
    let activePairingRoom    = null;   // trystero room used during pairing
    let qrInstance           = null;
    const PR = {};
async function getPairedDevices() {
    return (await localforage.getItem(KEY_PAIRED_DEVICES)) || {};
}
async function generateDeviceIdentity(name) {
const existing = await localforage.getItem(KEY_IDENTITY);
const id = {
displayName: name,
userSet: true,
  deviceId: existing?.deviceId || crypto.randomUUID()
};
    showToast('Succesfully changed device name!')
    await localforage.setItem(KEY_IDENTITY, id);
    return id;
}

async function getDeviceIdentity() {
    return (await localforage.getItem(KEY_IDENTITY)) || {};
}


    async function setDisplayName() { 
        const newName = document.getElementById('displayName').value.trim();
        if (!newName || newName === "") {
            showToastError('Please enter a valid name!')
            return;
        }

await generateDeviceIdentity(newName);
document.getElementById('displayNameModal').classList.add('hidden');
localStorage.setItem(NAME_SET, true);
}




    /* ==================================================================
       2. PAIRED-DEVICE STORAGE
       ================================================================== */
    async function savePairedDevice(remote) {
        if (!remote || !remote.deviceId) return;
        const map = await getPairedDevices();
        map[remote.deviceId] = {
            deviceId:    remote.deviceId,
            displayName: remote.displayName || 'Remote Device'
};
        await localforage.setItem(KEY_PAIRED_DEVICES, map);
        await renderDeviceList();
        await openPR(remote.deviceId);
    }

    async function forgetDevice(deviceId) {
        // close persistent room first
        if (PR[deviceId]) {
            try { PR[deviceId].room.leave(); } catch (e) {}
            delete PR[deviceId];
        }
        const map = await getPairedDevices();
        if (map[deviceId]) {
            delete map[deviceId];
     
            await localforage.setItem(KEY_PAIRED_DEVICES, map);
        }
        await renderDeviceList();
    }

   /* ==================================================================
   3. PERSISTENT ROOMS — AUTO RECONNECT / RECOVERY
   ================================================================== */
   //PR = PR

function PRId(myDeviceId, remoteDeviceId) {
    const pair = [myDeviceId, remoteDeviceId].sort().join('--');
    return 'nf-persistent-' + pair;
}

const RECONNECT_INITIAL_DELAY = 1500;
const RECONNECT_MAX_DELAY = 30000;
const ROOM_HEALTH_CHECK_MS = 5000;

async function autoReconnect(remoteDeviceId) {

    const entry = PR[remoteDeviceId];

    if (!entry) {
        console.log(
            '🔄 [P2P] No room entry exists, creating one:',
            remoteDeviceId
        );

        await openPR(remoteDeviceId);
        return;
    }

   //I have actually now made that it does't open a new room evey few seconds instead it now never destroys the old room, so reconnection 
   // can connect to that old room. Stripped down recretion of roonm preventing wastegae of cpu power
  if (PR[remoteDeviceId] !== entry) {
            return;
        }

        const currentPeers = entry.room.getPeers();
            


   if (Object.keys(currentPeers).length === 0) {
        // room exists but peer left — delete stale entry and reopen
        try { entry.room.leave(); } catch (e) {}
        delete PR[remoteDeviceId];
        // in autoReconnect, before delete PR[remoteDeviceId]

        setTimeout(() => openPR(remoteDeviceId), 2000);
    }
    if (Object.keys(currentPeers).length > 0) {
console.log('Detected Active Rooms with peers conencted');

            return;
        }
}

async function openPR(remoteDeviceId) {

    if (typeof window.joinRoom !== 'function') return;

        if (PR[remoteDeviceId]) {

        console.log(
            'ℹ️ [P2P] Persistent room already exists:',
            remoteDeviceId
        );

        return;
    }


    const myId = await getDeviceIdentity();

    const roomId = PRId(
        myId.deviceId,
        remoteDeviceId
    );
    let room;

    try {

        room = window.joinRoom(
            TRYSTERO_CONFIG,
            roomId
        );

    } catch (error) {

        console.error(
            '❌ [P2P] joinRoom() failed:',
            error
        );

        autoReconnect(
            remoteDeviceId,
            'joinRoom failed'
        );

        return;
    }


    const entry = {

        room,

        onlinePeerIds: new Set(),

        reconnectDelay:
            RECONNECT_INITIAL_DELAY,

       
        createdAt: Date.now(),
actions: {}
    };


    PR[remoteDeviceId] = entry;


    room.onPeerJoin = (peerId) => {

        if (PR[remoteDeviceId] !== entry) {
            return;
        }

        console.log(
            '🟢 [P2P] PEER CONNECTED',
            {
                remoteDeviceId,
                peerId
            }
        );

        entry.onlinePeerIds.add(peerId);

        renderDeviceList();
    };

    room.onPeerLeave = (peerId) => {

        if (PR[remoteDeviceId] !== entry) {
            return;
        }

        console.warn(
            '🔴 [P2P] PEER DISCONNECTED',
            {
                remoteDeviceId,
                peerId
            }
        );

        entry.onlinePeerIds.delete(peerId);
        renderDeviceList();


       autoReconnect(
            remoteDeviceId
        );
    };

}
async function openAllPR() {

    const list =
        await Object.values(await getPairedDevices());

    console.log(
        '🔄 [P2P] Opening persistent rooms:',
        list.length
    );

    for (const dev of list) {

        try {

          await openPR(dev.deviceId);

        } catch (error) {

            console.error(
                '❌ [P2P] Failed opening room:',
                dev.deviceId,
                error
            );

        }

    }
   
}

function isDeviceOnline(deviceId) {

    const entry =
        PR[deviceId];

    if (!entry) {
        return false;
    }

    return entry.onlinePeerIds.size > 0;
}

async function reconnectAllPR() {

    console.warn(
        '🌐 [P2P] Network recovery triggered:'
    );

    const devices = Object.values(await getPairedDevices());

    for (const device of devices) {

        if (PR[device.deviceId]) {

            autoReconnect(device.deviceId);

        } else {

            openPR(
                device.deviceId
            );

        }
    }
}


/*
 * Browser / Android WebView network recovery events.
 */
window.addEventListener('online', () => {

    console.log(
        '🟢 [P2P] Network ONLINE — checking connections...'
    );

    setTimeout(() => {

        reconnectAllPR();

    }, 1000);

});


window.addEventListener('offline', () => {

    console.warn(
        '🔴 [P2P] Network OFFLINE'
    );

});
    

    /* ==================================================================
       4. PAIRING SESSION
       ================================================================== */

    async function createPairingSession() {
        const identity = await getDeviceIdentity();
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const code = String(100000 + (array[0] % 900000));

        activePairingSession = {
            protocol:             PAIRING_PROTOCOL,
            pairingSessionId:     'sess_' + code,
            initiatorDeviceId:    identity.deviceId,
            initiatorDisplayName: identity.displayName,
            code,
            expiresAt: Date.now() + PAIRING_LIMIT
        };

        return activePairingSession;
    }

    /* ==================================================================
       5. INITIATOR UI
       ================================================================== */

    async function initPairingUI() {
        cleanupPairingSession();

        const session = await createPairingSession();

        // Render code
        const codeElem = document.querySelector('.code-container .code');
        if (codeElem) codeElem.textContent = session.code;

        // Render QR
        const qrContainer = document.getElementById('qr');
        if (!qrContainer) throw new Error('Notefull Connect: #qr element not found.');
        qrContainer.innerHTML = '';
        const correctLevel =
            window.QRCode.CorrectLevel?.H !== undefined
                ? window.QRCode.CorrectLevel.H
                : 2;

        qrInstance = new window.QRCode(qrContainer, {
            text:         session.code,
            width:        210,
            height:       210,
            colorDark:    '#000000',
            colorLight:   '#ffffff',
            correctLevel
        });

        await startInitiatorListener(session);
    }

    function cleanupPairingSession() {
        if (activePairingRoom) {
            try { activePairingRoom.leave(); } catch (e) {}
            activePairingRoom = null;
        }
        activePairingSession = null;
    }

    /* ==================================================================
       6. HANDSHAKE — DEVICE A (initiator)
       ================================================================== */

    async function startInitiatorListener(session) {
        const myIdentity = await getDeviceIdentity();
        const roomId     = 'nf-pair-code-' + session.code;
        const room       = window.joinRoom(TRYSTERO_CONFIG, roomId);

        activePairingRoom = room;

        const handshake = room.makeAction('nf_pair_handshake');

        let challengeA    = null;
        let pendingDeviceB = null;

        const timeout = setTimeout(() => {
            if (activePairingSession === session) {
                try { room.leave(); } catch (e) {}
                showPairingFailure('No device connected. Check the code and make sure both devices are online.');
            }
        }, 30000);

        handshake.onMessage = async (data) => {
            if (!data || !data.type) return;

            /* PAIR_REQUEST ← Device B */
          if (data.type === 'PAIR_REQUEST') {
    if (Date.now() > session.expiresAt) {
        handshake.send({ type: 'PAIR_ERROR', reason: 'Session expired.' });
        return;
    }
    if (data.senderDeviceId === myIdentity.deviceId) {
        handshake.send({ type: 'PAIR_ERROR', reason: 'Cannot pair with itself.' });
        return;
    }

    showConnectingModal('Incoming pairing request from ' + (data.senderDisplayName || 'Device') + '...');

    const userResponse = await confirmUser();
    if (!userResponse) {
        handshake.send({ type: 'PAIR_ERROR', reason: 'Pairing declined by user.' });
        hideConnectingModal();
        return;
    }

    challengeA = crypto.randomUUID();
    pendingDeviceB = {
        deviceId:    data.senderDeviceId,
        displayName: data.senderDisplayName
    };

    handshake.send({
        type:              'PAIR_RESPONSE',
        echoChallengeB:    data.challengeB,
        challengeA,
        senderDeviceId:    myIdentity.deviceId,
        senderDisplayName: myIdentity.displayName
    });

    updateConnectingModalText('Verifying...');
}

            /* PAIR_CONFIRM ← Device B */
            else if (data.type === 'PAIR_CONFIRM') {
                if (data.echoChallengeA === challengeA && pendingDeviceB) {
                    clearTimeout(timeout);
                    await savePairedDevice(pendingDeviceB);
                    updateConnectingModalText('Paired successfully!');
                    playSound('sucessSound');
                    setTimeout(() => {
                        hideConnectingModal();
                        cleanupPairingSession();
                        if (typeof window.backtoDevices === 'function') window.backtoDevices();
                    }, 5000);
                } else {
                    clearTimeout(timeout);
                    try { room.leave(); } catch (e) {}
                    showPairingFailure('Security handshake failed.');
                }
            }
        };
    }

    /* ==================================================================
       7. HANDSHAKE — DEVICE B (receiver)
       ================================================================== */
async function confirmUser() {
    if (confirm('A device wants to pair with your device. Proceed?')) {
        return true;
    } else {
        return false;
    }


}
    async function executeReceiverPairing(payload) {
        const myIdentity = await getDeviceIdentity();

        if (!payload || payload.protocol !== PAIRING_PROTOCOL) {
            showPairingFailure('Invalid pairing code structure.');
            return;
        }
        if (!/^\d{6}$/.test(String(payload.code || ''))) {
            showPairingFailure('Invalid pairing code.');
            return;
        }
        if (Date.now() > payload.expiresAt) {
            showPairingFailure('Pairing invitation has expired.');
            return;
        }
        if (payload.initiatorDeviceId === myIdentity.deviceId) {
            showPairingFailure('Cannot pair a device with itself.');
            return;
        }

        showConnectingModal('Connecting to ' + (payload.initiatorDisplayName || 'Device') + '...');

        const roomId = 'nf-pair-code-' + payload.code;
        const room   = window.joinRoom(TRYSTERO_CONFIG, roomId);

        activePairingRoom = room;

        const handshake  = room.makeAction('nf_pair_handshake');
        const challengeB = crypto.randomUUID();

        const timeout = setTimeout(() => {
            try { room.leave(); } catch (e) {}
            showPairingFailure('Connection timed out. Ensure both devices are online.');
        }, 50000);

        handshake.onMessage = async (data) => {
            if (!data || !data.type) return;

            if (data.type === 'PAIR_ERROR') {
                clearTimeout(timeout);
                try { room.leave(); } catch (e) {}
                showPairingFailure(data.reason || 'Pairing rejected.');
                return;
            }

            if (data.type === 'PAIR_RESPONSE') {
                if (data.echoChallengeB === challengeB) {
                    updateConnectingModalText('Verifying...');

                    

handshake.send({
                        type:          'PAIR_CONFIRM',
                        echoChallengeA: data.challengeA
                    });

                    clearTimeout(timeout);

                    await savePairedDevice({
                        deviceId:    data.senderDeviceId,
                        displayName: data.senderDisplayName
                    });

                    updateConnectingModalText('Paired successfully!');
                    playSound('sucessSound');
                
                    setTimeout(() => {
                        hideConnectingModal();
                        try { room.leave(); } catch (e) {}
                        if (typeof window.backtoDevices === 'function') window.backtoDevices();
                    }, 8000);
                

                } else {
                    clearTimeout(timeout);
                    try { room.leave(); } catch (e) {}
                    showPairingFailure('Security verification failed.');
                }
            }
        };

        // Send PAIR_REQUEST only once Device A is visible in the room
        room.onPeerJoin = (peerId) => {
            handshake.send({
                type:              'PAIR_REQUEST',
                challengeB,
                senderDeviceId:    myIdentity.deviceId,
                senderDisplayName: myIdentity.displayName
            }, peerId);
        };
        
    }

    /* ==================================================================
       8. QR SCANNER
       ================================================================== */

    async function scanQr() {
        try {
            if (!window.Capacitor?.Plugins?.BarcodeScanner) {
                if (typeof showToastError === 'function') showToastError('Barcode scanner plugin not available.');
                return;
            }

            const { BarcodeScanner } = window.Capacitor.Plugins;
            const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
            if (!status.available) await BarcodeScanner.installGoogleBarcodeScannerModule();

            const result     = await BarcodeScanner.scan();
            const rawContent = result.barcodes[0]?.displayValue;
            if (!rawContent) return;

            const value = String(rawContent).trim();

            if (/^\d{6}$/.test(value)) {
                await pairWithCode(value);
                return;
            }

            let parsed;
            try { parsed = JSON.parse(value); }
            catch (e) { showPairingFailure('Invalid QR code format.'); return; }

            await executeReceiverPairing(parsed);

        } catch (err) {
            console.error('QR Scan error:', err);
            showPairingFailure('Scanning cancelled or failed.');
        }
    }

    /* ==================================================================
       9. MANUAL CODE ENTRY
       ================================================================== */

    async function pairWithCode(codeValue) {
        const code = String(codeValue || '').trim();

        if (!/^\d{6}$/.test(code)) {
            if (typeof showToastError === 'function') showToastError('Please enter a valid 6-digit code.');
            return;
        }

        const payload = {
            protocol:             PAIRING_PROTOCOL,
            pairingSessionId:     'sess_' + code,
            initiatorDeviceId: null,
initiatorDisplayName: "Device",
            code,
            expiresAt: Date.now() + PAIRING_LIMIT
        };

        showConnectingModal('Connecting with code ' + code + '...');

        try {
            await executeReceiverPairing(payload);
        } catch (err) {
            console.error('NotefullConnect: manual code pairing failed', err);
            showPairingFailure('Could not connect using that code.');
        }
    }

    

    /* ==================================================================
       10. RENDER DEVICE LIST
       Targets #deviceList inside #devices (the Manage Devices section)
       Shows: this device (top), then each paired device with online badge
       and a Forget button.
       ================================================================== */

    async function renderDeviceList() {
        // There are TWO #deviceList elements in the HTML (devices section + member modal).
        // Target the one inside #devices specifically.
        const container   = document.querySelector('#devices #deviceList');
        const noDevicesMsg = document.getElementById('noDevicesMessage');

        if (!container) return;

        const myIdentity = await getDeviceIdentity();
        const pairedList = Object.values(await getPairedDevices());

        container.innerHTML = '';

        if (pairedList.length === 0) {
            if (noDevicesMsg) noDevicesMsg.style.display = '';
        } else {
            if (noDevicesMsg) noDevicesMsg.style.display = 'none';
        }

        // ── Paired Devices ────────────────────────────────────────────
        pairedList.forEach(dev => {
            const online  = isDeviceOnline(dev.deviceId);
           const statusHtml = online
    ? '<span class="device-span online">Online</span>'
    : '<span class="device-span offline">Offline</span>';
        
            const card = document.createElement('div');
            card.className = 'list';
            card.innerHTML = `
                <i class="ti ti-devices"></i>
                <div class="note-header" style="flex:1">
                    <h4>${escapeHtml(dev.displayName)}
                      ${statusHtml}
                    </h4>
                  
                </div>
                <button onclick="forgetDevice('${escapeHtml(dev.deviceId)}')" id="forgotDeviceBtn">Forget</button>`;
            container.appendChild(card);
        });
    }

    /* ==================================================================
       11. MODAL HELPERS
       ================================================================== */

    function showConnectingModal(text) {
        const modal   = document.getElementById('connectingModal');
        const textEl  = document.getElementById('connectingText');
        if (textEl) textEl.textContent = text || 'Connecting...';
        if (modal)  modal.classList.remove('hidden');
    }

    function updateConnectingModalText(text) {
        const textEl = document.getElementById('connectingText');
        if (textEl) textEl.textContent = text;
    }

    function hideConnectingModal() {
        const modal = document.getElementById('connectingModal');
        if (modal) modal.classList.add('hidden');
    }

    function showPairingFailure(msg) {
        hideConnectingModal();
        playSound('errorSound');
        showToastError(msg);
    }

    function playSound(audioId) {
        const s = document.getElementById(audioId);
        if (s) { s.currentTime = 0; s.play().catch(() => {}); }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ==================================================================
       12. DOM SETUP
       ================================================================== */

    document.addEventListener('DOMContentLoaded', async () => {

        // Render device list immediately
        await renderDeviceList();
       //replaced event lseds b adding functiosn directly to onlick, like qr code btn given new Id and onclick="scanQr()"

        // Manual code entry — Enter key
        const codeInput = document.getElementById('enteredCode');
        if (codeInput) {
            codeInput.addEventListener('keyup', e => {
                if (e.key === 'Enter') pairWithCode(codeInput.value);
            });
        }

        // Open persistent rooms for all already-paired devices
        // Small delay so Trystero's module import resolves first
        setTimeout(openAllPR, 1000);
    });



function getConnectedPeerId(deviceId) {
    const entry = PR[deviceId];

    if (!entry?.room) return null;

    const peers = entry.room.getPeers?.() || {};
    return Object.keys(peers)[0] || null;
} 

const peerMessageActions = {};
// in openPR, after room is created:
 // action registry for this room

// replace both sendPeerMessage/onPeerMessage internal makeAction calls with:
function getOrMakeAction(entry, actionName) {
    if (!entry.actions[actionName]) {
        entry.actions[actionName] = entry.room.makeAction(actionName);
    }
    return entry.actions[actionName];
}

function sendPeerMessage(deviceId, actionName, message) {
    const entry = PR[deviceId];
    if (!entry?.room) throw new Error('Persistent room not available for ' + deviceId);

    const peerId = getConnectedPeerId(deviceId);
    if (!peerId) throw new Error('Peer is not currently connected.');

    getOrMakeAction(entry, actionName).send(message, peerId);
    return true;
}

function onPeerMessage(deviceId, actionName, handler) {
    const entry = PR[deviceId];
    if (!entry?.room) throw new Error('Persistent room not available for ' + deviceId);

    getOrMakeAction(entry, actionName).onMessage = handler;
    return true;
}