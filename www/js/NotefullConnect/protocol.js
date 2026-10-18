/* ==========================================================================
   Notefull Connect — Operates on Web RTC and Web Sockets technologies
   ========================================================================== */
//Block 1   (Variables and constants)]
 const KEY_IDENTITY = 'nf_device_identity';
  const KEY_PAIRED_DEVICES = 'nf_paired_devices';
  const    KEY_NAME_SET = 'nf_name_set';
    const PAIRING_PROTOCOL = 'notefull-connect';
   const PAIRING_LIMIT = 10 * 60 * 1000;
const firebaseConfig = {
    apiKey: "AIzaSyBetuYa5d2jyX7iw7gSkR_qdIGUlZj0r_8",
    authDomain: "notefull-17415.firebaseapp.com",
    databaseURL: "https://notefull-17415-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "notefull-17415",
    storageBucket: "notefull-17415.firebasestorage.app",
    messagingSenderId: "202328382997",
    appId: "1:202328382997:web:9aae6344c6fd03d284381c",
  };
    let activePairingSession = null;  
    let activePairingRoom    = null;  
    let qrInstance           = null;
    // PROTOCOL
const NC = {
     peers: {},
PROTOCOL_VERSION: '1.0',
   
    rtcConfig: {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
        ]
    },
    nostrRelays: [
        'wss://relay.damus.io',
        'wss://nostr.mom',
        'wss://nos.lol'
    ],
    relaySockets: [],
    _nostrTools: null,
    _nostrSk: null,
//BLOCK 2   (UNCHANGED FUNCTIONS/HELPER)
async getPairedDevices() {
    return (await localforage.getItem(KEY_PAIRED_DEVICES)) || {};
},
async generateDeviceIdentity(name) {
const existing = await localforage.getItem(KEY_IDENTITY);
const id = {
displayName: name,
userSet: true,
  deviceId: existing?.deviceId || crypto.randomUUID()
};
    showToast('Succesfully changed device name!')
    await localforage.setItem(KEY_IDENTITY, id);
    return id;
},

async getDeviceIdentity() {
    return (await localforage.getItem(KEY_IDENTITY)) || {};
},


    async setDisplayName() { 
        const newName = document.getElementById('displayName').value.trim();
        if (!newName || newName === "") {
            showToastError('Please enter a valid name!')
            return;
        }

await this.generateDeviceIdentity(newName);
document.getElementById('displayNameModal').classList.add('hidden');
localStorage.setItem(KEY_NAME_SET, true);
},

async savePairedDevice(remote) {
     if (!remote || !remote.deviceId) return;
        const map = await this.getPairedDevices();
        map[remote.deviceId] = {
            deviceId:    remote.deviceId,
            displayName: remote.displayName || 'Remote Device'
};
        await localforage.setItem(KEY_PAIRED_DEVICES, map);
        await etc.renderDeviceList();
       },
       async forgetDevice(deviceId) {
const map = await this.getPairedDevices();
if (map[deviceId]) {
    delete map[deviceId];
    await localforage.setItem(KEY_PAIRED_DEVICES, map);
    await etc.renderDeviceList();
} else {
    console.log('Inavild Device Id');
    showToastError('Failed to remove device! Make sure device was paired');
}
       },

     /* ==================================================================
       BLOCK 3: NOSTR WEBSOCKET SIGNALING ENGINE (EPHEMERAL KIND 25001)
       ================================================================== */

/* ==================================================================
       BLOCK 3: NOSTR WEBSOCKET SIGNALING ENGINE (FIXED & STABILIZED)
       ================================================================== */

    async getNostr() {
        if (!this._nostrTools) {
            this._nostrTools = await import('https://esm.sh/nostr-tools@2.7.2/pure');
        }
        return this._nostrTools;
    },

    async getNostrKey() {
        if (!this._nostrSk) {
            const tools = await this.getNostr();
            this._nostrSk = tools.generateSecretKey();
        }
        return this._nostrSk;
    },

    // Connects to public Nostr relays safely without overwriting in-flight sockets
    connectSignaling() {
        // Prevent reconnecting if sockets are already OPEN or CONNECTING
        const hasActive = this.relaySockets.length > 0 && this.relaySockets.some(
            ws => ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING
        );
        if (hasActive) return;

        this.relaySockets = this.nostrRelays.map(url => {
            const ws = new WebSocket(url);
            ws.onopen = () => console.log(`%c[NC-Nostr] Relay connected: ${url}`, "color: #10b981;");
            ws.onerror = () => console.warn(`[NC-Nostr] Relay unreachable: ${url}`);
            return ws;
        });
    },

    disconnectSignaling() {
        this.relaySockets.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, "NC Idle");
            }
        });
        this.relaySockets = [];
    },

    // Queues message until the WebSocket finishes its handshake
    _sendToRelay(ws, payload) {
        const msg = JSON.stringify(payload);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
        } else if (ws.readyState === WebSocket.CONNECTING) {
            ws.addEventListener('open', () => {
                if (ws.readyState === WebSocket.OPEN) ws.send(msg);
            }, { once: true });
        }
    },

    async sendSignal(roomId, recipientDeviceId, signalData) {
        const tools = await this.getNostr();
        const sk = await this.getNostrKey();
        const myIdentity = await this.getDeviceIdentity();

        const event = tools.finalizeEvent({
            kind: 25001, // Ephemeral: relays broadcast to subscribers and never save to disk
            created_at: Math.floor(Date.now() / 1000),
            tags: [
                ["t", roomId] // Pure deterministic room tag
            ],
            content: JSON.stringify({
                sender: myIdentity.deviceId,
                recipient: recipientDeviceId,
                signal: signalData,
                timestamp: Date.now()
            })
        }, sk);

        console.log(`📤 [NC-Nostr] Sent signal (${signalData.type}) for room: ${roomId}`);
        this.connectSignaling();
        this.relaySockets.forEach(ws => this._sendToRelay(ws, ["EVENT", event]));
    },

    listenSignals(roomId, myDeviceId, onSignal) {
        const subId = "sub_" + Math.random().toString(36).slice(2, 9);
        const seenEventIds = new Set();
        this.connectSignaling();

        const messageHandler = (e) => {
            try {
                const msg = JSON.parse(e.data);
                // Nostr subscription response format: ["EVENT", subId, eventObject]
                if (msg[0] !== "EVENT" || msg[1] !== subId) return;

                const event = msg[2];
                if (seenEventIds.has(event.id)) return; // Prevent duplicate relay echos
                seenEventIds.add(event.id);

                const data = JSON.parse(event.content);

                // Ignore echoes from self
                if (data.sender === myDeviceId) return;

                // Ensure message is destined for this device or generic to room
                if (data.recipient && data.recipient !== myDeviceId) return;

                console.log(`📥 [NC-Nostr] Signal arrived (${data.signal?.type || 'candidate'}) from ${data.sender}`);

                if (typeof onSignal === 'function') {
                    onSignal(data.signal, data.sender);
                }
            } catch (err) {
                console.error("[NC-Nostr] Signal parsing error:", err);
            }
        };

        // Attach listener & send REQ subscription filter to all relays
        this.relaySockets.forEach(ws => {
            ws.addEventListener('message', messageHandler);
            this._sendToRelay(ws, [
                "REQ",
                subId,
                {
                    kinds: [25001],
                    "#t": [roomId]
                }
            ]);
        });

        // Return an inboxRef with .off() so Block 4 / leaveConnection cleanly detaches it
        return {
            subId,
            off: () => {
                this.relaySockets.forEach(ws => {
                    ws.removeEventListener('message', messageHandler);
                    this._sendToRelay(ws, ["CLOSE", subId]);
                });
            }
        };
    },

 

    //BLOCK 4   (CORE NOTEFULL CONNECT)

getDeterministicRoom(idA, idB) {
        return 'nf-room-' + [idA, idB].sort().join('--');
    },

    initDC(targetId, channel) {
        if (!this.peers[targetId]) return;
        this.peers[targetId].dc = channel;

        channel.onopen = () => {
            console.log(`⚡ [NC] Direct P2P Wire OPEN with: ${targetId}`);
            // Sever Firebase connection immediately once direct wire is up
           

            if (typeof etc !== 'undefined' && typeof etc.renderDeviceList === 'function') {
                etc.renderDeviceList();
            }
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log(`📥 [NC] Received from ${targetId}:`, message);

                if (typeof this.messageHandler === 'function') {
                    this.messageHandler(message, targetId);
                }
            } catch (err) {
                console.error("[NC] Error parsing peer message:", err);
            }
        };

        channel.onclose = () => {
            console.log(`🔌 [NC] Direct wire CLOSED for: ${targetId}`);
            };

        channel.onerror = (err) => {
            console.error(`[NC] DC error on ${targetId}:`, err);
        };
    },

   async connectToDevice(targetDeviceId) {
        const myIdentity = await this.getDeviceIdentity();
        const myId = myIdentity.deviceId;
        if (!myId || !targetDeviceId || myId === targetDeviceId) return;

        // 1. Guard against duplicate calls or in-flight races
        const existing = this.peers[targetDeviceId];
        if (existing) {
            if (existing.dc && existing.dc.readyState === 'open') {
                console.log(`[NC] Direct wire already open with ${targetDeviceId}`);
                return;
            }
            if (existing.isConnecting) {
                console.log(`[NC] Handshake already in progress with ${targetDeviceId}. Skipping duplicate.`);
                return;
            }
        }

        const roomId = this.getDeterministicRoom(myId, targetDeviceId);
        const isPolite = myId > targetDeviceId;

        const pc = new RTCPeerConnection(this.rtcConfig);
        const peerEntry = {
            pc,
            dc: null,
            isPolite,
            makingOffer: false,
            ignoreOffer: false,
            roomId,
            isConnecting: true,
            inboxRef: null,
            candidateQueue: [] // Holds early ICE candidates
        };
        this.peers[targetDeviceId] = peerEntry;

        this.connectSignaling();

        // 2. Exchange ICE Candidates
        pc.onicecandidate = ({ candidate }) => {
            if (candidate && pc.signalingState !== 'closed') {
                this.sendSignal(roomId, targetDeviceId, {
                    type: 'candidate',
                    candidate: candidate.toJSON()
                });
            }
        };

        // 3. Perfect Negotiation Offer
        pc.onnegotiationneeded = async () => {
            try {
                if (pc.signalingState === 'closed') return;
                peerEntry.makingOffer = true;
                await pc.setLocalDescription();
                await this.sendSignal(roomId, targetDeviceId, {
                    type: 'description',
                    description: pc.localDescription.toJSON()
                });
            } catch (err) {
                console.error("[NC] Negotiation error:", err);
            } finally {
                peerEntry.makingOffer = false;
            }
        };

        // 4. DataChannel Setup
        if (!isPolite) {
            const dc = pc.createDataChannel('notefull-wire', { ordered: true });
            this.initDC(targetDeviceId, dc);
        } else {
            pc.ondatachannel = (event) => {
                this.initDC(targetDeviceId, event.channel);
            };
        }

        // 5. Signal Listener with Safe Execution & Candidate Buffering
        peerEntry.inboxRef = this.listenSignals(roomId, myId, async (signal, senderId) => {
            if (senderId !== targetDeviceId) return;
            if (!pc || pc.signalingState === 'closed') return;

            try {
                if (signal.type === 'description') {
                    const desc = signal.description;
                    const offerCollision = desc.type === 'offer' &&
                        (peerEntry.makingOffer || pc.signalingState !== 'stable');

                    peerEntry.ignoreOffer = !isPolite && offerCollision;
                    if (peerEntry.ignoreOffer) return;

                    await pc.setRemoteDescription(desc);

                    // Remote description is set: safely flush buffered candidates
                    while (peerEntry.candidateQueue.length > 0) {
                        const queuedCandidate = peerEntry.candidateQueue.shift();
                        try {
                            await pc.addIceCandidate(queuedCandidate);
                        } catch (e) {
                            console.warn("[NC] Queued candidate failed:", e);
                        }
                    }

                    if (desc.type === 'offer') {
                        if (pc.signalingState === 'closed') return;
                        await pc.setLocalDescription();
                        await this.sendSignal(roomId, targetDeviceId, {
                            type: 'description',
                            description: pc.localDescription.toJSON()
                        });
                    }
                } else if (signal.type === 'candidate') {
                    // Buffer candidate if remote SDP is not yet applied
                    if (!pc.remoteDescription || !pc.remoteDescription.type) {
                        peerEntry.candidateQueue.push(signal.candidate);
                    } else {
                        try {
                            await pc.addIceCandidate(signal.candidate);
                        } catch (err) {
                            if (!peerEntry.ignoreOffer) throw err;
                        }
                    }
                }
            } catch (err) {
                console.error("[NC] Signal processing error:", err);
            }
        });

        // 6. Lifecycle Monitoring
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                peerEntry.isConnecting = false;
            } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                this.leaveConnection(targetDeviceId);
            }
        };
    },

   leaveConnection(targetDeviceId) {
        const peer = this.peers[targetDeviceId];
        if (!peer) return;

        // Unhook Firebase signaling listener
        if (peer.inboxRef) {
            peer.inboxRef.off();
            peer.inboxRef = null;
        }

        // Close peer connection cleanly
        if (peer.dc) {
            peer.dc.onclose = null;
            peer.dc.onerror = null;
            peer.dc.close();
        }
        if (peer.pc) {
            peer.pc.onconnectionstatechange = null;
            peer.pc.close();
        }

        this.getDeviceIdentity().then(id => {
            if (id?.deviceId && peer.roomId) {
                this.cleanupSignaling(peer.roomId, id.deviceId);
            }
        }).catch(() => {});

        delete this.peers[targetDeviceId];
        console.log(`🔌 [NC] Wire severed with: ${targetDeviceId}`);

        if (typeof etc !== 'undefined' && typeof etc.renderDeviceList === 'function') {
            etc.renderDeviceList();
        }
    },

    sendMsg(targetDeviceId, message) {
        const peer = this.peers[targetDeviceId];
        if (peer && peer.dc && peer.dc.readyState === 'open') {
            peer.dc.send(JSON.stringify(message));
            return true;
        }
        return false;
    },

    broadcast(message) {
        const payload = JSON.stringify(message);
        let sent = 0;
        for (const id in this.peers) {
            if (this.peers[id]?.dc?.readyState === 'open') {
                this.peers[id].dc.send(payload);
                sent++;
            }
        }
        return sent;
    },

    //BLOCK 4   (Pairing)

/* ==================================================================
       BLOCK 5: PAIRING HANDSHAKE & UTILITIES (NATIVE ENGINE)
       ================================================================== */

    async startInitiatorListener(session) {
        const myIdentity = await this.getDeviceIdentity();
        const code       = String(session.code);
        const pairRef    = this.getDB().ref('nf_pairing/' + code);

        activePairingSession = session;
        this.connectSignaling();

        let challengeA     = null;
        let pendingDeviceB = null;

        // 1. Register the pairing session node in Firebase
        await pairRef.set({
            initiator: {
                deviceId:    myIdentity.deviceId,
                displayName: myIdentity.displayName || 'Device',
                expiresAt:   session.expiresAt
            }
        });

        const timeout = setTimeout(() => {
            if (activePairingSession === session) {
                pairRef.off();
                pairRef.remove();
               }
        }, 30000);

        // 2. Listen for Receiver's Handshake steps
        pairRef.on('value', async (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // STEP 1: Incoming PAIR_REQUEST from Receiver
            if (data.request && !challengeA) {
                const req = data.request;

                if (Date.now() > session.expiresAt) {
                    await pairRef.child('response').set({ type: 'PAIR_ERROR', reason: 'Session expired.' });
                    return;
                }
                if (req.senderDeviceId === myIdentity.deviceId) {
                    await pairRef.child('response').set({ type: 'PAIR_ERROR', reason: 'Cannot pair with itself.' });
                    return;
                }

                if (typeof etc !== 'undefined' && etc.showConnectingModal) {
                    etc.showConnectingModal('Incoming pairing request from ' + (req.senderDisplayName || 'Device') + '...');
                }

                // Confirm prompt with user
                const userResponse = typeof etc !== 'undefined' && etc.confirmUser 
                    ? await etc.confirmUser() 
                    : confirm('Pair with ' + (req.senderDisplayName || 'Device') + '?');

                if (!userResponse) {
                    await pairRef.child('response').set({ type: 'PAIR_ERROR', reason: 'Pairing declined by user.' });
                    if (typeof etc !== 'undefined' && etc.hideConnectingModal) etc.hideConnectingModal();
                    return;
                }

                challengeA = crypto.randomUUID();
                pendingDeviceB = {
                    deviceId:    req.senderDeviceId,
                    displayName: req.senderDisplayName
                };

                // Send PAIR_RESPONSE to Receiver
                await pairRef.child('response').set({
                    type:              'PAIR_RESPONSE',
                    echoChallengeB:    req.challengeB,
                    challengeA,
                    senderDeviceId:    myIdentity.deviceId,
                    senderDisplayName: myIdentity.displayName || 'Device'
                });

                if (typeof etc !== 'undefined' && etc.updateConnectingModalText) {
                    etc.updateConnectingModalText('Verifying...');
                }
            }

            // STEP 2: Incoming PAIR_CONFIRM from Receiver
            else if (data.confirm && challengeA && pendingDeviceB) {
                const conf = data.confirm;

                if (conf.echoChallengeA === challengeA) {
                    clearTimeout(timeout);
                    pairRef.off();
                    await pairRef.remove(); // Handshake complete, clear node

                    await this.savePairedDevice(pendingDeviceB);

                    // Connect native WebRTC wire immediately
                    await this.connectToDevice(pendingDeviceB.deviceId);

                    
                       etc.updateConnectingModalText('Verified Succesfully! Connecting..');
                       etc.playSound('sucessSound');
                  
 setTimeout(() => {
                      etc.updateConnectingModalText('Connected succesfully!');
                    }, 3000);
                    setTimeout(() => {
                       etc.hideConnectingModal();
                      etc.backtoDevices();
                    }, 4000);
                } else {
                    clearTimeout(timeout);
                    pairRef.off();
                    if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                        etc.showPairingFailure('Security handshake failed.');
                    }
                }
            }
        });
    },

    async executeReceiverPairing(payload) {
        const myIdentity = await this.getDeviceIdentity();

        if (!payload || payload.protocol !== PAIRING_PROTOCOL) {
            if (typeof etc !== 'undefined' && etc.showPairingFailure) etc.showPairingFailure('Invalid pairing code structure.');
            return;
        }
        if (!/^\d{6}$/.test(String(payload.code || ''))) {
            if (typeof etc !== 'undefined' && etc.showPairingFailure) etc.showPairingFailure('Invalid pairing code.');
            return;
        }

        if (typeof etc !== 'undefined' && etc.showConnectingModal) {
            etc.showConnectingModal('Connecting to ' + (payload.initiatorDisplayName || 'Device') + '...');
        }

        const code       = String(payload.code);
        const pairRef    = this.getDB().ref('nf_pairing/' + code);
        const challengeB = crypto.randomUUID();

        this.connectSignaling();

        const timeout = setTimeout(() => {
            pairRef.off();
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Connection timed out. Ensure both devices are online.');
            }
        }, 30000);

        // Verify session existence in Firebase
        const snap = await pairRef.get();
        const sessionData = snap.val();

        if (!sessionData || !sessionData.initiator) {
            clearTimeout(timeout);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Invalid or expired pairing code.');
            }
            return;
        }

        if (Date.now() > sessionData.initiator.expiresAt) {
            clearTimeout(timeout);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Pairing invitation has expired.');
            }
            return;
        }

        if (sessionData.initiator.deviceId === myIdentity.deviceId) {
            clearTimeout(timeout);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Cannot pair a device with itself.');
            }
            return;
        }

        // 1. Send PAIR_REQUEST into Firebase
        await pairRef.child('request').set({
            challengeB,
            senderDeviceId:    myIdentity.deviceId,
            senderDisplayName: myIdentity.displayName || 'Device'
        });

        // 2. Listen for Initiator's PAIR_RESPONSE
        pairRef.child('response').on('value', async (responseSnap) => {
            const data = responseSnap.val();
            if (!data) return;

            if (data.type === 'PAIR_ERROR') {
                clearTimeout(timeout);
                pairRef.off();
                if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                    etc.showPairingFailure(data.reason || 'Pairing rejected.');
                }
                return;
            }

            if (data.type === 'PAIR_RESPONSE') {
                if (data.echoChallengeB === challengeB) {
                    if (typeof etc !== 'undefined' && etc.updateConnectingModalText) {
                        etc.updateConnectingModalText('Verifying...');
                    }

                    // Send PAIR_CONFIRM back
                    await pairRef.child('confirm').set({
                        echoChallengeA: data.challengeA
                    });

                    clearTimeout(timeout);
                    pairRef.off();

                    await this.savePairedDevice({
                        deviceId:    data.senderDeviceId,
                        displayName: data.senderDisplayName
                    });

                    // Connect native WebRTC wire immediately
                    await this.connectToDevice(data.senderDeviceId);

                   
                      etc.updateConnectingModalText('Verifed Succesfully! Connecting to device..');
                      etc.playSound('sucessSound');
                    
setTimeout(() => {
                      etc.updateConnectingModalText('Connected Succesfully!');
                      
                    }, 3000);
                    setTimeout(() => {
                        if (typeof etc !== 'undefined' && etc.hideConnectingModal) etc.hideConnectingModal();
                        if (typeof window.backtoDevices === 'function') window.backtoDevices();
                    }, 4000);

                } else {
                    clearTimeout(timeout);
                    pairRef.off();
                    if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                        etc.showPairingFailure('Security verification failed.');
                    }
                }
            }
        });
    },

    async scanQr() {
        try {
            if (!window.Capacitor?.Plugins?.BarcodeScanner) {
                if (typeof etc !== 'undefined' && etc.showToastError) {
                    etc.showToastError('Barcode scanner plugin not available.');
                }
                return null;
            }

            const { BarcodeScanner } = window.Capacitor.Plugins;
            const status = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
            if (!status.available) await BarcodeScanner.installGoogleBarcodeScannerModule();

            const result = await BarcodeScanner.scan();
            const rawContent = result.barcodes?.[0]?.displayValue;
            if (!rawContent) return null;

            return String(rawContent).trim();
        } catch (err) {
            console.error('[NC] QR Scan error:', err);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Scanning cancelled or failed.');
            }
            return null;
        }
    },

    async pairWithCode(codeValue) {
        const code = String(codeValue || '').trim();

        if (!/^\d{6}$/.test(code)) {
            if (typeof etc !== 'undefined' && etc.showToastError) {
                etc.showToastError('Please enter a valid 6-digit code.');
            }
            return;
        }

        const payload = {
            protocol:             PAIRING_PROTOCOL,
            pairingSessionId:     'sess_' + code,
            initiatorDeviceId:    null,
            initiatorDisplayName: "Device",
            code,
            expiresAt:            Date.now() + PAIRING_LIMIT
        };

        try {
            await this.executeReceiverPairing(payload);
        } catch (err) {
            console.error('[NC] Code pairing failed:', err);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Could not connect using that code.');
            }
        }
    },

    // Check if direct P2P wire is currently active with a device
    getConnectedPeerId(deviceId) {
        const peer = this.peers[deviceId];
        if (peer && peer.dc && peer.dc.readyState === 'open') {
            return deviceId;
        }
        return null;
    }

};
window.NC = NC;
