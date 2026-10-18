let currentRoom = null;
let verifiedPeers = new Set();
async function initializeProtocol(list) {
    // 1. Guard against empty list or missing ID
    if (!list?.id) {
        console.error("❌ Cannot initialize protocol: Invalid list object.");
        return null;
    }

    const myIdentity = await getDeviceIdentity();
    const myId = myIdentity?.deviceId;

    // 2. Validate Membership (Self-Check)
    const isOwner = list.ownerId === myId;
    const isMember = Array.isArray(list.members) && 
                     list.members.some(m => m.deviceId === myId);

    if (!isOwner && !isMember) {
        console.warn("🛑 Access Denied: You are not authorized on this list.");
        showToastWarn("You are not a member of this list.");
        return null;
    }

    if (currentRoom) {
        currentRoom.leave();
        verifiedPeers.clear();
    }

    // 3. Join Group Room (No peer ID needed!)
    const roomId = `nf-sl-${list.id}`;
    console.log(`📡 Joining shared room: ${roomId}`);
    
  currentRoom = window.joinRoom(TRYSTERO_CONFIG, roomId);
// ✅ Correct: Save the action objects directly
const handshakeAction = currentRoom.makeAction('auth-handshake');
const verdictAction = currentRoom.makeAction('auth-verdict');
currentRoom.onPeerJoin = (peerId) => {
console.log('Peer Joined!');
handshakeAction.send({deviceId: myId}, peerId);
};
currentRoom.onPeerLeave = (peerId) => {
        console.log(`👋 Peer ${peerId} disconnected.`);
        verifiedPeers.delete(peerId);
    };

    // 2. Handle incoming handshakes from other peers
   const handleIncomingHandshake = async (data, peerId) => {
    console.log(`📩 Received handshake from peer ${peerId}:`, data);
    await verifyAndRespond(data, peerId, list, (payload, target) => {
        verdictAction.send(payload, target);
    });
};

if (typeof handshakeAction.onMessage === 'function') {
    handshakeAction.onMessage(handleIncomingHandshake);
} else {
    handshakeAction.onMessage = handleIncomingHandshake;
}

// 3. Listen for verdicts sent back to us
const handleIncomingVerdict = (verdict, peerId) => {
    if (verdict.status === "AUTHORIZED") {
        console.log(`✅ Peer ${peerId} approved us.`);
        verifiedPeers.add(peerId);
    } else {
        console.warn(`🛑 Peer ${peerId} rejected us: ${verdict.reason}`);
        showToastWarn("A peer in this room rejected your session.");
    }
};

if (typeof verdictAction.onMessage === 'function') {
    verdictAction.onMessage(handleIncomingVerdict);
} else {
    verdictAction.onMessage = handleIncomingVerdict;
}

    return currentRoom;
}

async function verifyAndRespond(data, peerId, list, sendVerdict) {
    const incomingDeviceId = data?.deviceId;

    if (!incomingDeviceId) {
        console.warn(`⚠️ Peer ${peerId} sent an empty handshake.`);
        sendVerdict({ status: "DENIED", reason: "MISSING_DEVICE_ID" }, peerId);
        return;
    }

    // Independent check: is this incoming device in OUR local list records?
    const isOwner = list.ownerId === incomingDeviceId;
    const isMember = Array.isArray(list.members) && 
                     list.members.some(m => m.deviceId === incomingDeviceId);

    if (isOwner || isMember) {
        console.log(`🛡️ Verification SUCCESS for peer ${peerId} (${incomingDeviceId})`);
        
        // Add to our authorized set
        verifiedPeers.add(peerId);
        
        // Tell them they are cleared
        sendVerdict({ status: "AUTHORIZED" }, peerId);
    } else {
        console.warn(`🚨 Verification FAILED: ${incomingDeviceId} is not in list ACL.`);
        sendVerdict({ status: "DENIED", reason: "NOT_IN_MEMBER_LIST" }, peerId);
        // Do NOT add to verifiedPeers
    }
}