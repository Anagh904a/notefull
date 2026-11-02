const etc = {
       playSound(audioId) {
        const s = document.getElementById(audioId);
        if (s) { s.currentTime = 0; s.play().catch(() => {}); }
    },

showConnectingModal(text) {
        const modal   = document.getElementById('connectingModal');
        const textEl  = document.getElementById('connectingText');
        if (textEl) textEl.textContent = text || 'Connecting...';
        if (modal)  modal.classList.remove('hidden');
    },

  updateConnectingModalText(text) {
        const textEl = document.getElementById('connectingText');
        if (textEl) textEl.textContent = text;
    },

   hideConnectingModal() {
        const modal = document.getElementById('connectingModal');
        if (modal) modal.classList.add('hidden');
    },

 showPairingFailure(msg) {
        this.hideConnectingModal();
        this.playSound('errorSound');
        showToastError(msg);
    },
      escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
    switchTab(tabContainerId, tabId, sectionId) {

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
},


async showAddDeviceSection() {
    document.getElementById('addDevice').classList.remove('hidden');
    document.getElementById('devices').classList.add('hidden');
const object = localStorage.getItem(KEY_NAME_SET);
        if (object === "false" || object === null) {
         document.getElementById('displayNameModal').classList.remove('hidden');  
    } else if (object === "true") {
         document.getElementById('displayNameModal').classList.add('hidden');  
    }

    document.getElementById('tabs').style.display = 'none';
    document.getElementById('mainHeading').classList.add('hidden');
    await this.initPairingUI();
},

backtoDevices() {
    document.getElementById('addDevice').classList.add('hidden');
    document.getElementById('devices').classList.remove('hidden');
    document.getElementById('tabs').style.display = 'flex';
    document.getElementById('mainHeading').classList.remove('hidden');

},

showConnectSection(method) {
    const method1 = document.getElementById('method1');
    const method2 = document.getElementById('method2');
    const text = document.getElementById('switchText');
    if (method === 'method2') {
        method1.classList.add('hidden');
        method2.classList.remove('hidden');
        text.innerText = 'See my QR code or pairing code instead';
        text.onclick = function () {
            etc.showConnectSection('method1');
        };
    } else if (method === 'method1') {
        method1.classList.remove('hidden');
        method2.classList.add('hidden');
        text.innerText = 'Scan a QR code instead';
        text.onclick = function () {
            etc.showConnectSection('method2');
        };
    }
},

showMembersModal() {
    document.getElementById('member-modal').classList.remove('hidden');
},
openMembersSection() {
    showSection('membersSection');
}, 
 async renderDeviceList() {
        // There are TWO #deviceList elements in the HTML (devices section + member modal).
        // Target the one inside #devices specifically.
        const container   = document.querySelector('#devices #deviceList');
        const noDevicesMsg = document.getElementById('noDevicesMessage');

        if (!container) return;

        const pairedList = Object.values(await NC.getPairedDevices());

        container.innerHTML = '';

        if (pairedList.length === 0) {
            if (noDevicesMsg) noDevicesMsg.style.display = '';
        } else {
            if (noDevicesMsg) noDevicesMsg.style.display = 'none';
        }

        // ── Paired Devices ────────────────────────────────────────────
        pairedList.forEach(dev => {
            const online  = NC.getConnectedPeerId(dev.deviceId);
           const statusHtml = online
    ? '<span class="device-span online">Online</span>'
    : '<span class="device-span offline">Offline</span>';
        
            const card = document.createElement('div');
            card.className = 'list';
            card.innerHTML = `
                <i class="ti ti-devices"></i>
                <div class="note-header" style="flex:1">
                    <h4>${this.escapeHtml(dev.displayName)}
                      ${statusHtml}
                    </h4>
                  
                </div>
                <button onclick="NC.forgetDevice('${this.escapeHtml(dev.deviceId)}')" id="forgotDeviceBtn">Forget</button>`;
            container.appendChild(card);
        });
    },
      async createPairingSession() {
        const identity = await NC.getDeviceIdentity();
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
    },

   async initPairingUI() {
        this.cleanupPairingSession();

        const session = await this.createPairingSession();

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

        await NC.startInitiatorListener(session);
    },
cleanupPairingSession() {
        if (activePairingSocket) {
            try { activePairingSocket.close(); } catch (e) {}
            activePairingSocket = null;
        }
        activePairingSession = null;
    },
     
    async confirmUser() {
        if (await showConfirmToast({
            title: 'Accept Pairing Request?',
            message: 'A device has requested pairing with your device. Proceed?',
            timeout: 15000 // 15 seconds so user actually has time to tap Accept!
        })) {
            return true;
        } else {
            return false;
        }
    },

async scanMethod() {
    const result = await NC.scanQr();
  await NC.pairWithCode(result);
  showToast()
}
      
};
window.etc = etc;
document.addEventListener('DOMContentLoaded', async () => {
    // Render device list and initiate background WebRTC connections to paired peers
    await etc.renderDeviceList();
    await NC.connectAllPairedDevices();

    // Manual code entry — Enter key
    const codeInput = document.getElementById('enteredCode');
    if (codeInput) {
        codeInput.addEventListener('keyup', e => {
            if (e.key === 'Enter') NC.pairWithCode(codeInput.value);
        });
    }
});