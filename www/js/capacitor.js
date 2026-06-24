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

async function initAi() {
  const statusText = document.getElementById('ai-status-text');
  const modal = document.getElementById('model-progress-modal');

  const filesReady = await checkExistingFiles();
  if (!filesReady) {
    if (statusText) statusText.textContent = 'AI files not downloaded yet.';
    console.warn('[AI] initAi() called before download completed — aborting.');
    return null;
  }
  console.log('Files were ready');

  if (modal) modal.classList.remove('hidden');

  const aiWorker = new Worker('./js/ai-worker.js', { type: 'module' });
  console.log('AI worker created');

  aiWorker.onerror = (err) => {
    console.error('[AI Worker Crashed]:', err.message, err);
    if (statusText) statusText.textContent = 'AI worker crashed: ' + err.message;
  };

  aiWorker.onmessageerror = (err) => {
    console.error('[AI Worker Message Error]:', err);
  };

  aiWorker.onmessage = (event) => {
    const { status, progress, error } = event.data;

    if (status === 'initialized') {
      return; // handled by the init handshake promise below, not here
    }

    if (status === 'progress' && progress) {
      if (progress.status === 'progress') {
        const percentage = Math.round(progress.progress || 0);
        if (statusText) statusText.textContent = `Loading: ${percentage}%`;
      }
      return;
    }

    if (status === 'ready') {
      if (statusText) statusText.textContent = 'AI System Ready!';
      showToast('AI succesfully loaded. You may get slight performance issues');

      setTimeout(() => {
        if (modal) modal.classList.add('hidden');
      }, 1500);
      setTimeout(() => {
        showToastWarn('AI is a beta feature and may contain some bugs');
      }, 5000);
      return;
    }

    if (status === 'failed') {
      if (statusText) statusText.textContent = 'Failed to Load AI';
      console.error('[AI Error]:', error);
      return;
    }
  };

  async function sendInitAndWarmup() {
    try {
      const Filesystem = window.Capacitor.Plugins.Filesystem;

      const modelDirUri = await Filesystem.getUri({
        path: 'AI/models',
        directory: 'DATA'
      });
      const wasmDirUri = await Filesystem.getUri({
        path: 'libs/transformers',
        directory: 'DATA'
      });
      const libUri = await Filesystem.getUri({
        path: 'libs/transformers/transformers.min.js',
        directory: 'DATA'
      });

      const modelDirUrl = window.Capacitor.convertFileSrc(modelDirUri.uri).replace(/\/+$/, '') + '/';
      const wasmDirUrl = window.Capacitor.convertFileSrc(wasmDirUri.uri).replace(/\/+$/, '') + '/';
      const libUrl = window.Capacitor.convertFileSrc(libUri.uri);

      console.log('modelDirUrl:', modelDirUrl);
      console.log('wasmDirUrl:', wasmDirUrl);
      console.log('libUrl:', libUrl);

      const initDone = new Promise((resolve, reject) => {
        const handler = (event) => {
          if (event.data.id !== 'init-handshake') return;
          aiWorker.removeEventListener('message', handler);
          if (event.data.status === 'initialized') resolve();
          else reject(new Error(event.data.error || 'init failed'));
        };
        aiWorker.addEventListener('message', handler);

        setTimeout(() => {
          aiWorker.removeEventListener('message', handler);
          reject(new Error('init handshake timed out — worker may have crashed silently'));
        }, 8000);
      });

      aiWorker.postMessage({
        id: 'init-handshake',
        type: 'init',
        modelDir: modelDirUrl,
        wasmDir: wasmDirUrl,
        libUrl: libUrl
      });

      await initDone;

      aiWorker.postMessage({ id: 'onload-warmup', type: 'warmup' });

    } catch (err) {
      if (statusText) statusText.textContent = 'Failed to Load AI';
      console.error('[AI Init Error]:', err);
    }
  }

  const startTrigger = () => sendInitAndWarmup();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTrigger);
  } else {
    startTrigger();
  }

  return aiWorker;
}

async function saveBlobToInternalStorage(blob, path) {
    const Filesystem = window.Capacitor.Plugins.Filesystem;

    // Clear any stale partial file from a previous failed attempt
    try {
        await Filesystem.deleteFile({ path, directory: 'DATA' });
    } catch {
        // didn't exist — fine
    }

    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB per write — tune down if still tight on memory
    const totalSize = blob.size;
    let offset = 0;
    let isFirstWrite = true;

    while (offset < totalSize) {
        const end = Math.min(offset + CHUNK_SIZE, totalSize);
        const chunkBlob = blob.slice(offset, end);

        const base64Chunk = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(chunkBlob);
        });

        await Filesystem.writeFile({
            path,
            data: base64Chunk,
            directory: 'DATA',
            recursive: true,
            ...(isFirstWrite ? {} : { append: true })
        });

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

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
            resolve(reader.result.split(',')[1]);
        };

        reader.onerror = reject;
        reader.readAsDataURL(blob);
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

const BASE_URL = 'https://anagh904a.github.io/notefull/aiFiles';
const MODEL_DEST = 'AI/models/distilbert-base-cased-distilled-squad';
const LIB_DEST = 'libs/transformers';

const AI_ASSETS = [
    // ---- model/ ----
    {
        url: `${BASE_URL}/model/config.json`,
        path: `${MODEL_DEST}/config.json`,
        sizeMB: 0.01
    },
    {
        url: `${BASE_URL}/model/onnx/model_quantized.onnx`,
        path: `${MODEL_DEST}/onnx/model_quantized.onnx`,
        sizeMB: 65
    },
    {
        url: `${BASE_URL}/model/special_tokens_map.json`,
        path: `${MODEL_DEST}/special_tokens_map.json`,
        sizeMB: 0.01
    },
    {
        url: `${BASE_URL}/model/tokenizer_config.json`,
        path: `${MODEL_DEST}/tokenizer_config.json`,
        sizeMB: 0.01
    },
    {
        url: `${BASE_URL}/model/tokenizer.json`,
        path: `${MODEL_DEST}/tokenizer.json`,
        sizeMB: 0.5
    },
    {
        url: `${BASE_URL}/model/vocab.txt`,
        path: `${MODEL_DEST}/vocab.txt`,
        sizeMB: 0.25
    },

    // ---- transformer/ ----
    {
        url: `${BASE_URL}/transformer/ort-wasm-simd-threaded.asyncify.mjs`,
        path: `${LIB_DEST}/ort-wasm-simd-threaded.asyncify.mjs`,
        sizeMB: 0.05
    },
     {
        url: `${BASE_URL}/transformer/ort-wasm-simd-threaded.jsep.mjs`,
        path: `${LIB_DEST}/ort-wasm-simd-threaded.jsep.mjs`,
        sizeMB: 0.02
    },
    {
        url: `${BASE_URL}/transformer/ort-wasm-simd-threaded.asyncify.wasm`,
        path: `${LIB_DEST}/ort-wasm-simd-threaded.asyncify.wasm`,
        sizeMB: 23
    },
    {
        url: `${BASE_URL}/transformer/transformers.min.js`,
        path: `${LIB_DEST}/transformers.min.js`,
        sizeMB: 0.2
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
        sizeTracker.textContent = `Size to be downloaded: ${AI_TOTAL_SIZE_MB} MB`;
        status.textContent = 'Connecting to server…';
        progressBar.classList.add('active');
        fill.style.width = '0%';

        let totalBytesDownloaded = 0;

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

        // 3. Download each file with real byte progress, write to exact path
      for (const asset of AI_ASSETS) {

    // ---------- DOWNLOAD ----------
    status.textContent =
        `Downloading ${asset.path.split('/').pop()}...`;

    fill.style.width = '0%';

    const response = await fetch(asset.url);

    if (!response.ok || !response.body) {
        throw new Error(
            `Failed to download ${asset.path}`
        );
    }

    const reader = response.body.getReader();
    const chunks = [];
    let downloaded = 0;

    const totalBytes =
        Number(response.headers.get('content-length'))
        || asset.sizeMB * 1024 * 1024;

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        downloaded += value.length;

        const percent = Math.round(
            downloaded / totalBytes * 100
        );

        fill.style.width = percent + '%';

        sizeTracker.textContent =
    `${(downloaded / 1024 / 1024).toFixed(1)} MB of ${asset.sizeMB} MB`;
    }

    // ---------- CONVERT ----------
    fill.style.width = '0%';
    status.textContent =
        `Converting ${asset.path.split('/').pop()}...`;
        await new Promise(r => requestAnimationFrame(r));

    const fullBlob = new Blob(chunks);

    // give UI time to repaint
    await new Promise(r => setTimeout(r, 50));

    // ---------- SAVE ----------
    fill.style.width = '20%';
    status.textContent =
        `Saving ${asset.path.split('/').pop()}...`;
console.log(`[DEBUG] ${asset.path} — chunks.length: ${chunks.length}, fullBlob.size: ${fullBlob.size}`);
await saveBlobToInternalStorage(
    fullBlob,
    asset.path
);
chunks.length = 0;
    fill.style.width = '100%';

    // ---------- VERIFY ----------
    const exists =
        await window.fileExists(asset.path);

    if (!exists) {
        throw new Error(
            `Failed to save ${asset.path}`
        );
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

