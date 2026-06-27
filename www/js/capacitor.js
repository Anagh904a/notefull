const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;
const notifications = window.Capacitor.Plugins.LocalNotifications;
const Filesystem = window.Capacitor.Plugins.Filesystem;


async function callNotificationPopUp() {

const permission = await notifications.requestPermissions();



if (permission.display !== 'granted') {
    showToastError('Notification permission denied! If this continues, please manully grant it.');
    return;
} else {
  document.getElementById('notificationStatus').innerHTML = "Permission is granted!";
  document.getElementById('notificationStatus').style.color = "green";
  showToast('Notification permisson succesfully granted!');
}
} 

// initAi() — call this AFTER startDownload() has completed successfully.

// Keep originalFetch outside at the top function level so it never causes a ReferenceError
async function initAi() {
  const statusText = document.getElementById('ai-status-text');
  const modal = document.getElementById('model-progress-modal');

  const filesReady = await checkExistingFiles();
  if (!filesReady) {
    if (statusText) statusText.textContent = 'AI files not downloaded yet.';
    console.warn('[AI] initAi() called before download — aborting.');
    return null;
  }

  if (modal) modal.classList.remove('hidden');
  if (statusText) statusText.textContent = 'Loading AI model...';

  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const AIPlugin   = window.Capacitor.Plugins.AIPlugin;

   if (statusText) statusText.textContent = 'Resolving model path...';

const uri = await Filesystem.getUri({
  path: 'models/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  directory: 'DATA'
});

const nativePath = uri.uri.replace('file://', '');

if (statusText) statusText.textContent = 'Initialising model...';

await AIPlugin.loadModel({
    path: nativePath
});

    window.aiReady = true;
    if (statusText) statusText.textContent = 'AI Ready!';
    if (modal) setTimeout(() => modal.classList.add('hidden'), 1500);
    showToast('AI loaded!');
    return true;

  } catch(err) {
    if (statusText) statusText.textContent = 'Failed to load AI';
    if (modal) modal.classList.add('hidden');
    console.error('[AI]', err);
    return null;
  }
}



async function saveBlobToInternalStorage(blob, path) {
    const Filesystem = window.Capacitor.Plugins.Filesystem;

    // Clear any stale partial file from a previous failed attempt
    try {
        await Filesystem.deleteFile({ path, directory: 'DATA' });
    } catch {
        // didn't exist — fine
    }

const CHUNK_SIZE = 1 * 1024 * 1024; // 4 MB
    const totalSize = blob.size;
    let offset = 0;
    let isFirstWrite = true;

    while (offset < totalSize) {
        const end = Math.min(offset + CHUNK_SIZE, totalSize);
        const chunkBlob = blob.slice(offset, end);

        const base64Chunk = await blobToBase64(chunkBlob);

        if (isFirstWrite) {
    await Filesystem.writeFile({
        path,
        data: base64Chunk,
        directory: 'DATA',
        recursive: true
    });
} else {
    await Filesystem.appendFile({
        path,
        data: base64Chunk,
        directory: 'DATA'
    });
}
await new Promise(resolve => requestAnimationFrame(resolve));
        isFirstWrite = false;
        offset = end;
        // EXTRA DEBUG: immediate stat right after this specific write
if (offset >= totalSize) {
    const immediateStat = await Filesystem.stat({ path, directory: 'DATA' });
    console.log(`[WRITE-DEBUG] ${path} — immediately after writeFile: ${immediateStat.size} bytes (expected ${totalSize})`);

    // also check again after a short delay, in case it's an async flush timing issue
    setTimeout(async () => {
        try {
            const delayedStat = await Filesystem.stat({ path, directory: 'DATA' });
            console.log(`[WRITE-DEBUG] ${path} — 2s after writeFile: ${delayedStat.size} bytes`);
        } catch (err) {
            console.log(`[WRITE-DEBUG] ${path} — 2s check failed: ${err.message}`);
        }
    }, 2000);
}
        // base64Chunk and chunkBlob fall out of scope here each loop —
        // nothing large is held across iterations.
    }

    // Verify the written file matches the expected size
    const stat = await Filesystem.stat({ path, directory: 'DATA' });
    if (!stat || stat.size !== totalSize) {
        throw new Error(
            `Write verification failed for ${path}: expected ${totalSize} bytes, got ${stat?.size}`
        );
    }

    return stat;
}

const base64Worker = new Worker(
    './js/base64-worker.js',
    { type: 'module' }
);

base64Worker.onerror = (e) => {
    console.error('[BASE64 WORKER ERROR]', e);
};

base64Worker.onmessageerror = (e) => {
    console.error('[BASE64 WORKER MESSAGE ERROR]', e);
};

function blobToBase64(blob) {
    console.log('[B64] Sending blob to worker:', blob.size);

    return new Promise((resolve, reject) => {

        const timeout = setTimeout(() => {
            reject(new Error('Base64 worker timed out'));
        }, 10000);

        const handleMessage = (e) => {
            clearTimeout(timeout);

            base64Worker.removeEventListener(
                'message',
                handleMessage
            );

            console.log('[B64] Worker replied');

            resolve(e.data);
        };

        base64Worker.addEventListener(
            'message',
            handleMessage,
            { once: true }
        );

        base64Worker.postMessage(blob);
    });
} 
window.fileExists = async function (path) {
    const Filesystem = window.Capacitor.Plugins.Filesystem;

    try {
        await Filesystem.stat({
            path,
            directory: 'DATA'
        });

        return true;
    } catch {
        return false;
    }
};

// ---- AI asset download config ----
async function checkExistingFiles() {
    for (const asset of AI_ASSETS) {
        const exists = await window.fileExists(asset.path);

        if (!exists) {
            return false;
        }
    }

    return true;
}

const AI_ASSETS = [
 {
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true',
    path: 'models/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    sizeMB: 770.3
  }
];

const AI_TOTAL_SIZE_MB = AI_ASSETS.reduce((sum, a) => sum + a.sizeMB, 0).toFixed(1);

async function startDownload() {
    const modal = document.getElementById('assetsDownloader');
    const sizeTracker = document.getElementById('sizeTracker');
    const status = document.getElementById('downloadStaus');
    const progressBar = document.getElementById('download-progress');
    const startBtn = document.getElementById('startBtn');

    let fill = progressBar.querySelector('.progress-fill');
    if (!fill) {
        fill = document.createElement('div');
        fill.className = 'progress-fill';
        progressBar.appendChild(fill);
    }

    startBtn.disabled = true;
    progressBar.classList.remove('idle', 'complete');

    try {
        const alreadyHave = await checkExistingFiles();

        if (alreadyHave) {
            status.textContent = 'AI files already downloaded.';
            fill.style.width = '100%';
            progressBar.classList.add('complete');
            setTimeout(() => modal.classList.add('hidden'), 600);
            startBtn.disabled = false;
            return;
        } 

        // 2. Connecting phase
        sizeTracker.textContent = `Size to be downloaded: ${AI_TOTAL_SIZE_MB}`;
        status.textContent = 'Connecting to server…';
        progressBar.classList.add('active');
        fill.style.width = '0%';

        // Map expected sizes using your fallback 87.6MB structure 
        const headInfos = [];
        for (const asset of AI_ASSETS) {
            try {
                const headRes = await fetch(asset.url, { method: 'HEAD' });
                const len = parseInt(headRes.headers.get('content-length') || '0', 10);
                headInfos.push(len || asset.sizeMB * 1024 * 1024);
            } catch {
                headInfos.push(asset.sizeMB * 1024 * 1024);
            }
        }
        const totalBytesExpected = headInfos.reduce((a, b) => a + b, 0);
        status.textContent = 'Connection established. Downloading…';

       let globalBytesDownloaded = 0;
const totalBytesTrueBaseline =
    AI_ASSETS.reduce(
        (sum, a) => sum + a.sizeMB * 1024 * 1024,
        0
    )

// 3. Download each file

for (let i = 0; i < AI_ASSETS.length; i++ ) {
    const asset = AI_ASSETS[i];

    status.textContent = `Downloading ${asset.path.split('/').pop()}...`;

    const response = await fetch(asset.url);
    if (!response.ok || !response.body) {
        throw new Error(`Failed to download ${asset.path}`);
    }

    const reader = response.body.getReader();
    const chunks = [];
    let fileDownloaded = 0;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        fileDownloaded += value.length;
        
        // Cumulative count of real, decompressed bytes read so far
        const globalProgressBytes = globalBytesDownloaded + fileDownloaded;

        // FIXED: Calculate progress against the true uncompressed baseline size
        let percent = Math.round((globalProgressBytes / totalBytesTrueBaseline) * 100);
        if (percent > 100) percent = 100;

        // Smoothly scale the progress bar up to 100%
        fill.style.width = percent + '%';

        // Display aggregate uncompressed progress values
        const currentTotalMB = (globalProgressBytes / 1024 / 1024).toFixed(1);
        sizeTracker.textContent = `${currentTotalMB} MB of ${AI_TOTAL_SIZE_MB}`;
    }

    // Commit this file's final decompressed byte footprint globally
    globalBytesDownloaded += fileDownloaded;
  

            // ---------- CONVERT ----------
            status.textContent = `Converting ${asset.path.split('/').pop()}...`;
            await new Promise(r => requestAnimationFrame(r));

            const fullBlob = new Blob(chunks);
            await new Promise(r => setTimeout(r, 50));

            // ---------- SAVE ----------
            status.textContent = `Extracting ${asset.path.split('/').pop()}...`;
           
             await saveBlobToInternalStorage(fullBlob, asset.path);
            chunks.length = 0;

            // ---------- VERIFY ----------
            const exists = await window.fileExists(asset.path);
            if (!exists) {
                throw new Error(`Failed to save ${asset.path}`);
            }
            console.log(`Saved ${asset.path}`);
        }
      

        // 4. Done
        fill.style.width = '100%';
        progressBar.classList.remove('active');
        progressBar.classList.add('complete');
        status.textContent = 'Download complete!';
      

        setTimeout(() => modal.classList.add('hidden'), 600);

    } catch (err) {
        console.error('AI asset download failed:', err);
        status.textContent = 'Download failed: ' + err.message;
        startBtn.disabled = false;
        startBtn.textContent = 'Retry';
        return;
    }

    startBtn.disabled = false;
    alert('Dear user, Please provide feedback for this update on playstore! We value your valueable feedback.');
}


async function checkPermisson() {
const permission = await notifications.checkPermissions();
  if (permission.display !== 'granted') {
      document.getElementById('notificationStatus').innerHTML = "Permission is not granted!";
  document.getElementById('notificationStatus').style.color = "red";
    return;
} else {
  document.getElementById('notificationStatus').innerHTML = "Permission is granted!";
  document.getElementById('notificationStatus').style.color = "green";

}
} 


async function setupNotificationChannels() {
  try {
    if (notifications && notifications.createChannel) {
      await notifications.createChannel({
        id: 'notefull-reminders',          
        name: 'Reminders (Notes & Lists)', // Updates the text the user sees in Android settings
        description: 'Alerts for scheduled note and checklist reminders', 
        importance: 5,                     
        visibility: 1,                     
        vibration: true
      });
      console.log("Unified notification channel created");
    }
  } catch (error) {
    console.error("Failed to create notification channel", error);
  }
}

async function registerNotification(item, type) {
    const permission = await notifications.checkPermissions();
    if (permission.display !== 'granted') {
        showToastError("Notification permission not granted! Reminder saved but won't notify.");
        return null;
    }

    const id = Math.floor(Math.random() * 2147483647);

    try {
        await notifications.schedule({
            notifications: [{
                id,
                title: type === 'note' ? 'Note Reminder' : 'List Reminder',
                body: item.title,
                schedule: { at: new Date(item.remainderTime) },
                channelId: 'notefull-reminders'
            }]
        });
        console.log("registred succesfully");
        return id;
    } catch (err) {
        console.error("Failed to schedule notification", err);
        showToastError("Could not schedule notification.");
        return null;
    }
}

async function deregisterNotification(notificationId) {
    if (!notificationId) return;
    try {
        await notifications.cancel({ notifications: [{ id: notificationId }] });
          console.log("DEregistred succesfully");
    } catch (err) {
        console.error("Failed to cancel notification", err);
    }
    showToast('called');
}


function advancedSecurity() {
 const advSecurityState = localStorage.getItem("AdvSecurityEnabled");
  if (advSecurityState === "true") {
  PrivacyScreen.enable();
  } else if(advSecurityState === "false") {
  PrivacyScreen.disable();
  } else {
    return;
  }
}
let appActive = true;
App.addListener(
   "appStateChange",
   ({ isActive }) => {
      appActive = isActive;
      if (!appActive) {
const overlay = document.getElementById('privacyOverlay');
  const addNoteSection = document.getElementById("addNoteSection");
  const addListSection = document.getElementById("addListSection");
  const notePasswordModal = document.getElementById("notePasswordModal");
  const listPasswordModal = document.getElementById("listPasswordModal");
  overlay.classList.add('hidden');
  if (addNoteSection && !addNoteSection.classList.contains("hidden")) {
    if (notePasswordModal && !notePasswordModal.classList.contains("hidden")) {
      notePasswordModal.classList.add("hidden");
      return;
    }
    console.log("Saving note");
    saveNote();
    return;
  }
  if (addListSection && !addListSection.classList.contains("hidden")) {
    if (listPasswordModal && !listPasswordModal.classList.contains("hidden")) {
      listPasswordModal.classList.add("hidden");
      return;
    }
    console.log("Saving list");
    saveList();
    return;
  }
  const openModal = document.querySelector(".modal:not(.hidden)");
  if (openModal) {
    openModal.classList.remove("hidden");
    return;
  }
  authUser();
  advancedSecurity();
}
   }
);
let backPressCount = 0;
let lastBackPressTime = 0;
function showNativeToast(msg) {
  Toast.show({
    text: msg,
    duration: 'short'
  });
}
function handleBackButton() {
  console.log("Back pressed");
  const addNoteSection = document.getElementById("addNoteSection");
  const addListSection = document.getElementById("addListSection");
  const notePasswordModal = document.getElementById("notePasswordModal");
  const listPasswordModal = document.getElementById("listPasswordModalr");
  if (addNoteSection && !addNoteSection.classList.contains("hidden")) {
    if (notePasswordModal && !notePasswordModal.classList.contains("hidden")) {
      notePasswordModal.classList.add("hidden");
      return;
    }
    console.log("Saving note");
    saveNote();
    return;
  }
  if (addListSection && !addListSection.classList.contains("hidden")) {
    if (listPasswordModal && !listPasswordModal.classList.contains("hidden")) {
      listPasswordModal.classList.add("hidden");
      return;
    }
    console.log("Saving list");
    saveList();
    return;
  }
  const openModal = document.querySelector(".modal:not(.hidden)");
  if (openModal) {
    openModal.classList.add("hidden");
    return;
  }
  const now = Date.now();
  if (now - lastBackPressTime > 2000) {
    backPressCount = 0;
  }
  backPressCount++;
  lastBackPressTime = now;
  if (backPressCount === 2) {
    showNativeToast("Press again to exit");
    return;
  }
  if (backPressCount >= 3) {
    App.exitApp();
  }
}
App.addListener("backButton", handleBackButton);
const Biometric = window.Capacitor.Plugins.BiometricAuthNative;
async function authUser() {
const appLockState = localStorage.getItem("appLockEnabled");
let unlocked = false;
  const overlay = document.getElementById('privacyOverlay');
  if (appLockState === "false" || appLockState === null) {
    return;
  } 
  overlay.classList.remove('hidden');
  while (!unlocked) {
    try {
            await Biometric
         .internalAuthenticate({
            reason:"Unlock Notefull",
              allowDeviceCredential:true
         });
         unlocked = true;
         overlay.classList.add('hidden');
    } catch(err) {
showToastError('Authtication Failed! Please try again!');
    }
  }
}
document.addEventListener(
   "DOMContentLoaded",
   () => {
 authUser();
advancedSecurity();
  setupNotificationChannels();
  checkPermisson();
   }
);

window.authUser = authUser;
window.callNotificationPopUp = callNotificationPopUp;
window.registerNotification = registerNotification;
window.deregisterNotification = deregisterNotification;
window.startDownload = startDownload;
window.initAi = initAi;

