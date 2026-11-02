/* ==========================================================================
   Notefull Connect v2 — Protocol Core (Cloudflare Edge + WebRTC Wire)
   ========================================================================== */

const SIGNAL_URL = "wss://notefull-connect.mastiwithanagh.workers.dev";
const KEY_IDENTITY = 'nf_device_identity';
const KEY_PAIRED_DEVICES = 'nf_paired_devices';
const KEY_NAME_SET = 'nf_name_set';
const PAIRING_PROTOCOL = 'notefull-connect';
const PAIRING_LIMIT = 10 * 60 * 1000;

let activePairingSession = null;
let activePairingSocket = null;
let activePairingRoom = null;
let qrInstance = null;

const NC = {
    peers: {},
    PROTOCOL_VERSION: '2.0',

    rtcConfig: {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" }
        ]
    },

    // ── Helper & Storage Methods ──
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
        if (typeof showToast === 'function') showToast('Successfully changed device name!');
        await localforage.setItem(KEY_IDENTITY, id);
        return id;
    },

    // Guaranteed to always return a valid deviceId even before user sets a name
    async getDeviceIdentity() {
        let existing = await localforage.getItem(KEY_IDENTITY);
        if (!existing || !existing.deviceId) {
            existing = {
                displayName: existing?.displayName || 'Device',
                userSet: Boolean(existing?.userSet),
                deviceId: crypto.randomUUID()
            };
            await localforage.setItem(KEY_IDENTITY, existing);
        }
        return existing;
    },

    async setDisplayName() {
        const input = document.getElementById('displayName');
        const newName = input ? input.value.trim() : '';
        if (!newName) {
            if (typeof showToastError === 'function') showToastError('Please enter a valid name!');
            return;
        }

        await this.generateDeviceIdentity(newName);
        const modal = document.getElementById('displayNameModal');
        if (modal) modal.classList.add('hidden');
        localStorage.setItem(KEY_NAME_SET, true);
    },

    async savePairedDevice(remote) {
        if (!remote || !remote.deviceId) return;
        const map = await this.getPairedDevices();
        map[remote.deviceId] = {
            deviceId: remote.deviceId,
            displayName: remote.displayName || 'Remote Device'
        };
        await localforage.setItem(KEY_PAIRED_DEVICES, map);
        if (typeof etc !== 'undefined' && typeof etc.renderDeviceList === 'function') {
            await etc.renderDeviceList();
        }
    },

    async forgetDevice(deviceId) {
        const map = await this.getPairedDevices();
        if (map[deviceId]) {
            delete map[deviceId];
            await localforage.setItem(KEY_PAIRED_DEVICES, map);
            this.leaveConnection(deviceId);
            if (typeof etc !== 'undefined' && typeof etc.renderDeviceList === 'function') {
                await etc.renderDeviceList();
            }
        } else {
            console.log('Invalid Device Id');
            if (typeof showToastError === 'function') {
                showToastError('Failed to remove device! Make sure device was paired');
            }
        }
    },

    getDeterministicRoom(idA, idB) {
        return 'room_' + [idA, idB].sort().join('--');
    },

    //Reconnects all saved paired devices automatically
    async connectAllPairedDevices() {
        const paired = await this.getPairedDevices();
        for (const deviceId of Object.keys(paired)) {
            this.connectToDevice(deviceId);
        }
    },

    // ── Signaling Engine ──
    openSignalSocket(roomId, myDeviceId, onSignal) {
        const url = `${SIGNAL_URL}/room/${encodeURIComponent(roomId)}?deviceId=${encodeURIComponent(myDeviceId)}`;
        const socket = new WebSocket(url);

        socket.onopen = () => {
            console.log(`⚡ [NC-v2] Connected to Cloudflare room: ${roomId}`);
        };

        socket.onmessage = (event) => {
            if (!event.data || typeof event.data !== 'string') return;
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'ERROR') {
                    console.error('[NC-v2] Signaling Error:', data.message);
                    if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                        etc.showPairingFailure(data.message);
                    }
                    return;
                }
               
                if (typeof onSignal === 'function') {
                    onSignal(data);
                }
            } catch (err) {
                console.error('[NC-v2] Error parsing signal:', err);
            }
        };

        socket.onerror = (err) => console.error('[NC-v2] Socket error:', err);

        return {
            socket,
            send: (payload) => {
                if (!payload || typeof payload !== 'object') return;
                const serialized = JSON.stringify(payload);
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(serialized);
                } else if (socket.readyState === WebSocket.CONNECTING) {
                    socket.addEventListener('open', () => {
                        if (socket.readyState === WebSocket.OPEN) {
                            socket.send(serialized);
                        }
                    }, { once: true });
                }
            },
            close: () => {
                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close(1000, "Done signaling");
                }
            }
        };
    },

    // ── WebRTC Direct Wire ──
    initDC(targetId, channel) {
        if (!this.peers[targetId]) return;
        this.peers[targetId].dc = channel;

        channel.onopen = () => {
            console.log(`⚡ [NC-v2] Direct P2P Wire OPEN with: ${targetId}`);
            this.peers[targetId].isConnecting = false;

            // Sever signaling socket once direct WebRTC wire is established
            if (this.peers[targetId].signalRef) {
                this.peers[targetId].signalRef.close();
                this.peers[targetId].signalRef = null;
            }

            if (typeof etc !== 'undefined' && typeof etc.renderDeviceList === 'function') {
                etc.renderDeviceList();
            }
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log(`📥 [NC-v2] Received from ${targetId}:`, message);
                if (typeof this.messageHandler === 'function') {
                    this.messageHandler(message, targetId);
                }
            } catch (err) {
                console.error("[NC-v2] Error parsing peer message:", err);
            }
        };

        channel.onclose = () => {
            console.log(`🔌 [NC-v2] Direct wire CLOSED for: ${targetId}`);
            this.connecToDevice(targetId);
        };

        channel.onerror = (err) => {
            console.error(`[NC-v2] DC error on ${targetId}:`, err);
        };
    },

    async connectToDevice(targetDeviceId) {
        const myIdentity = await this.getDeviceIdentity();
        const myId = myIdentity.deviceId;
        if (!myId || !targetDeviceId || myId === targetDeviceId) return;

        const existing = this.peers[targetDeviceId];
        if (existing) {
            if (existing.dc && existing.dc.readyState === 'open') {
                return;
            }
            if (existing.isConnecting) {
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
            signalRef: null,
            candidateQueue: []
        };
        this.peers[targetDeviceId] = peerEntry;

        // Helper to send Offer when both peers are in the room
        const triggerOffer = async () => {
            if (isPolite || !pc || pc.signalingState === 'closed') return;
            try {
                peerEntry.makingOffer = true;
                await pc.setLocalDescription();
                peerEntry.signalRef.send({
                    senderDeviceId: myId,
                    recipientDeviceId: targetDeviceId,
                    type: 'description',
                    description: pc.localDescription.toJSON()
                });
            } catch (err) {
                console.error("[NC-v2] Offer creation error:", err);
            } finally {
                peerEntry.makingOffer = false;
            }
        };

        if (!isPolite) {
            const dc = pc.createDataChannel('notefull-wire', { ordered: true });
            this.initDC(targetDeviceId, dc);
        } else {
            pc.ondatachannel = (e) => this.initDC(targetDeviceId, e.channel);
        }

        peerEntry.signalRef = this.openSignalSocket(roomId, myId, async (msg) => {
            if (!pc || pc.signalingState === 'closed') return;

            // Coordinate presence so Offer is never lost into an empty room
            if (msg.type === 'ROOM_PEERS') {
                if (Array.isArray(msg.peers) && msg.peers.includes(targetDeviceId)) {
                    await triggerOffer();
                }
                return;
            }
            if (msg.type === 'PEER_JOINED' && msg.deviceId === targetDeviceId) {
                await triggerOffer();
                return;
            }

            if (msg.senderDeviceId && msg.senderDeviceId !== targetDeviceId) return;

            try {
                if (msg.type === 'description') {
                    const desc = msg.description;
                    const offerCollision = desc.type === 'offer' &&
                        (peerEntry.makingOffer || pc.signalingState !== 'stable');

                    peerEntry.ignoreOffer = !isPolite && offerCollision;
                    if (peerEntry.ignoreOffer) return;

                    await pc.setRemoteDescription(desc);

                    while (peerEntry.candidateQueue.length > 0) {
                        const queued = peerEntry.candidateQueue.shift();
                        try { await pc.addIceCandidate(queued); } catch (e) {}
                    }

                    if (desc.type === 'offer') {
                        if (pc.signalingState === 'closed') return;
                        await pc.setLocalDescription();
                        peerEntry.signalRef.send({
                            senderDeviceId: myId,
                            recipientDeviceId: targetDeviceId,
                            type: 'description',
                            description: pc.localDescription.toJSON()
                        });
                    }
                } else if (msg.type === 'candidate') {
                    if (!pc.remoteDescription || !pc.remoteDescription.type) {
                        peerEntry.candidateQueue.push(msg.candidate);
                    } else {
                        try {
                            await pc.addIceCandidate(msg.candidate);
                        } catch (err) {
                            if (!peerEntry.ignoreOffer) throw err;
                        }
                    }
                }
            } catch (err) {
                console.error("[NC-v2] Signaling error:", err);
            }
        });

        pc.onicecandidate = ({ candidate }) => {
            if (candidate && pc.signalingState !== 'closed' && peerEntry.signalRef) {
                peerEntry.signalRef.send({
                    senderDeviceId: myId,
                    recipientDeviceId: targetDeviceId,
                    type: 'candidate',
                    candidate: candidate.toJSON()
                });
            }
        };

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

        if (peer.signalRef) {
            peer.signalRef.close();
            peer.signalRef = null;
        }
        if (peer.dc) {
            peer.dc.onclose = null;
            peer.dc.onerror = null;
            peer.dc.close();
        }
        if (peer.pc) {
            peer.pc.onconnectionstatechange = null;
            peer.pc.close();
        }

        delete this.peers[targetDeviceId];
        console.log(`🔌 [NC-v2] Wire severed with: ${targetDeviceId}`);

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

    // ── Pairing Handshake Engine ──
    async startInitiatorListener(session) {
        const myIdentity = await this.getDeviceIdentity();
        const roomId = `pair_${session.code}`;
        activePairingSession = session;

        if (activePairingSocket) activePairingSocket.close();

        let challengeA = null;
        let pendingDeviceB = null;

        activePairingSocket = this.openSignalSocket(roomId, myIdentity.deviceId, async (msg) => {
            if (msg.type === 'PAIR_REQUEST' && !challengeA) {
                if (Date.now() > session.expiresAt) {
                    activePairingSocket.send({ type: 'PAIR_ERROR', reason: 'Session expired.' });
                    return;
                }
                if (msg.senderDeviceId === myIdentity.deviceId) {
                    activePairingSocket.send({ type: 'PAIR_ERROR', reason: 'Cannot pair with itself.' });
                    return;
                }

                if (typeof etc !== 'undefined' && etc.showConnectingModal) {
                    etc.showConnectingModal('Incoming pairing request from ' + (msg.senderDisplayName || 'Device') + '...');
                }

                const userResponse = typeof etc !== 'undefined' && etc.confirmUser
                    ? await etc.confirmUser()
                    : confirm('Pair with ' + (msg.senderDisplayName || 'Device') + '?');

                if (!userResponse) {
                    activePairingSocket.send({ type: 'PAIR_ERROR', reason: 'Pairing declined by user.' });
                    if (typeof etc !== 'undefined' && etc.hideConnectingModal) etc.hideConnectingModal();
                    return;
                }

                challengeA = crypto.randomUUID();
                pendingDeviceB = {
                    deviceId: msg.senderDeviceId,
                    displayName: msg.senderDisplayName
                };

                activePairingSocket.send({
                    type: 'PAIR_RESPONSE',
                    echoChallengeB: msg.challengeB,
                    challengeA,
                    senderDeviceId: myIdentity.deviceId,
                    senderDisplayName: myIdentity.displayName || 'Device'
                });

                if (typeof etc !== 'undefined' && etc.updateConnectingModalText) {
                    etc.updateConnectingModalText('Verifying...');
                }
            } else if (msg.type === 'PAIR_CONFIRM' && challengeA && pendingDeviceB) {
                if (msg.echoChallengeA === challengeA) {
                    activePairingSocket.close();
                    activePairingSocket = null;

                    await this.savePairedDevice(pendingDeviceB);
                    await this.connectToDevice(pendingDeviceB.deviceId);

                    if (typeof etc !== 'undefined') {
                        etc.updateConnectingModalText('Verified Successfully! Connecting..');
                        etc.playSound('sucessSound');
                        setTimeout(() => {
                            etc.updateConnectingModalText('Connected successfully!');
                        }, 1500);
                        setTimeout(() => {
                            etc.hideConnectingModal();
                            etc.backtoDevices();
                        }, 2500);
                    }
                } else {
                    activePairingSocket.close();
                    activePairingSocket = null;
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
            if (typeof etc !== 'undefined' && etc.showPairingFailure) etc.showPairingFailure('Invalid pairing protocol.');
            return;
        }
        if (!/^\d{6}$/.test(String(payload.code || ''))) {
            if (typeof etc !== 'undefined' && etc.showPairingFailure) etc.showPairingFailure('Invalid pairing code.');
            return;
        }

        if (typeof etc !== 'undefined' && etc.showConnectingModal) {
            etc.showConnectingModal('Connecting to ' + (payload.initiatorDisplayName || 'Device') + '...');
        }

        const code = String(payload.code).trim();
        const roomId = `pair_${code}`;
        const challengeB = crypto.randomUUID();
        let pairedHandled = false;

        const timeout = setTimeout(() => {
            if (!pairedHandled) {
                receiverSocket.close();
                if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                    etc.showPairingFailure('Connection timed out. Make sure the pairing screen is open on the other device.');
                }
            }
        }, 25000);

        const receiverSocket = this.openSignalSocket(roomId, myIdentity.deviceId, async (msg) => {
            if (msg.type === 'PAIR_ERROR') {
                pairedHandled = true;
                clearTimeout(timeout);
                receiverSocket.close();
                if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                    etc.showPairingFailure(msg.reason || 'Pairing rejected.');
                }
                return;
            }

            if (msg.type === 'PAIR_RESPONSE' && msg.echoChallengeB === challengeB) {
                pairedHandled = true;
                clearTimeout(timeout);

                if (typeof etc !== 'undefined' && etc.updateConnectingModalText) {
                    etc.updateConnectingModalText('Verifying...');
                }

                receiverSocket.send({
                    type: 'PAIR_CONFIRM',
                    echoChallengeA: msg.challengeA
                });

                // Delay closing slightly so PAIR_CONFIRM flushes through the WebSocket cleanly
                setTimeout(() => receiverSocket.close(), 400);

                await this.savePairedDevice({
                    deviceId: msg.senderDeviceId,
                    displayName: msg.senderDisplayName
                });

                await this.connectToDevice(msg.senderDeviceId);

                if (typeof etc !== 'undefined') {
                    etc.updateConnectingModalText('Verified Successfully! Connecting to device..');
                    etc.playSound('sucessSound');
                    setTimeout(() => {
                        etc.updateConnectingModalText('Connected Successfully!');
                    }, 1500);
                    setTimeout(() => {
                        if (typeof etc.hideConnectingModal === 'function') etc.hideConnectingModal();
                        if (typeof etc.backtoDevices === 'function') etc.backtoDevices();
                    }, 2500);
                }
            }
        });

        // Broadcast initial pairing request to initiator in room
        receiverSocket.send({
            type: 'PAIR_REQUEST',
            challengeB,
            senderDeviceId: myIdentity.deviceId,
            senderDisplayName: myIdentity.displayName || 'Device'
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
            console.error('[NC-v2] QR Scan error:', err);
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
            protocol: PAIRING_PROTOCOL,
            code,
            expiresAt: Date.now() + PAIRING_LIMIT
        };

        try {
            await this.executeReceiverPairing(payload);
        } catch (err) {
            console.error('[NC-v2] Code pairing failed:', err);
            if (typeof etc !== 'undefined' && etc.showPairingFailure) {
                etc.showPairingFailure('Could not connect using that code.');
            }
        }
    },

    getConnectedPeerId(deviceId) {
        const peer = this.peers[deviceId];
        if (peer && peer.dc && peer.dc.readyState === 'open') {
            return deviceId;
        }
        return null;
    }
};

window.NC = NC;