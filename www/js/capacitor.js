const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;
const notifications = window.Capacitor.Plugins.LocalNotifications;
const Filesystem = window.Capacitor.Plugins.Filesystem;
let isDownloading = false;

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

async function initAi() {
  const statusText = document.getElementById('ai-status-text');
  const modal = document.getElementById('model-progress-modal');

  const filesReady = await manageModels();
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
  path: 'models/qwen2.5-3b-instruct-q3_k_m.gguf',
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
async function checkFileExists(filePath) {
    try {
        await Filesystem.stat({
            path: filePath,
            directory: 'DATA'
        });
        return true;
    } catch {
        return false;
    }
}

// Main model management function
async function manageModels() {
    const llamaPath = 'models/Llama-3.2-1B-Instruct-Q4_K_M.gguf';
    const gemmaPath = 'models/qwen2.5-3b-instruct-q3_k_m.gguf';

    const hasLlama = await checkFileExists(llamaPath);
    const hasGemma = await checkFileExists(gemmaPath);

    // 1. If Llama is present, we ALWAYS delete it (in both scenarios you mentioned)
    if (hasLlama) {
        try {
            await Filesystem.deleteFile({
                path: llamaPath,
                directory: 'DATA'
            });
            console.log('Llama file found and deleted.');
        } catch (error) {
            console.error('Failed to delete Llama file:', error);
        }
    }

    // 2. Return true if Gemma is here, false if Gemma is missing
    return hasGemma;
}



const STAGE_LABELS = {
    connecting: 'Connecting to server…',
    downloading: 'Installing Notefull AI ',
    verifying: 'Verifying file…',
    done: 'AI Ready!',
    error: 'Download failed'
};

let downloadSpeedSamples = [];

function updateDownloadEta(downloaded, total) {
    const now = performance.now();
    downloadSpeedSamples.push({ t: now, bytes: downloaded });
    downloadSpeedSamples = downloadSpeedSamples.filter(s => now - s.t < 5000);
    if (downloadSpeedSamples.length < 2) return;

    const first = downloadSpeedSamples[0];
    const bytesPerMs = (downloaded - first.bytes) / (now - first.t);
    const etaEl = document.getElementById('etaTracker');
    if (bytesPerMs <= 0) { etaEl.textContent = 'Estimating time…'; return; }

    const secs = Math.max(0, Math.round((total - downloaded) / bytesPerMs / 1000));
    etaEl.textContent = secs > 90 ? `About ${Math.round(secs/60)} min left` : `About ${secs}s left`;
}

function handleNativeProgress(data) {
    const label = STAGE_LABELS[data.stage];
    if (label) document.getElementById('downloadStaus').textContent = label;

    const bar = document.getElementById('download-progress');
    if (!bar) {
        console.warn('[Download UI] Missing #download-progress in DOM');
        return;
    }

    // Same pattern as your original startDownload() — get existing fill or create it
    let fill = bar.querySelector('.progress-fill');
    if (!fill) {
        fill = document.createElement('div');
        fill.className = 'progress-fill';
        bar.appendChild(fill);
    }

    bar.classList.toggle('active', data.stage === 'downloading');
    bar.classList.toggle('complete', data.stage === 'done');

    if (data.stage === 'downloading' && data.total > 0) {
        const percent = Math.round((data.downloaded / data.total) * 100);
        fill.style.width = percent + '%';
        document.getElementById('sizeTracker').textContent =
            `${(data.downloaded/1024/1024).toFixed(1)} MB of ${(data.total/1024/1024).toFixed(1)} MB`;
        updateDownloadEta(data.downloaded, data.total);
    }

    if (data.stage === 'done') {
        fill.style.width = '100%';
        document.getElementById('etaTracker').textContent = 'Done';
    }

    if (data.stage === 'error') {
        document.getElementById('etaTracker').textContent = 'Failed';
    }
}


  const AI_ASSETS = [
 {
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q3_k_m.gguf?download=true',
    path: 'models/qwen2.5-3b-instruct-q3_k_m.gguf',
    sizeMB: 2040
  }
];

const AI_TOTAL_SIZE_MB = AI_ASSETS.reduce((sum, a) => sum + a.sizeMB, 0).toFixed(1);


async function startDownload() {
    const modal = document.getElementById('assetsDownloader');
    const startBtn = document.getElementById('startBtn');
    const searchBtn = document.getElementById("searchIcon");
    searchBtn.classList.add('downloading');
    searchBtn.onclick = showDownloaderModal;
    isDownloading = true;
    startBtn.disabled = true;
    downloadSpeedSamples = [];

    try {
        const alreadyHave = await manageModels();
        if (alreadyHave) {
            document.getElementById('downloadStaus').textContent = 'AI files already downloaded.';
            const bar = document.getElementById('download-progress');
            let fill = bar.querySelector('.progress-fill');
            if (!fill) {
                fill = document.createElement('div');
                fill.className = 'progress-fill';
                bar.appendChild(fill);
            }
            fill.style.width = '100%';
            bar.classList.add('complete');
            setTimeout(() => modal.classList.add('hidden'), 600);
            startBtn.disabled = false;
            return;
        }

        const asset = AI_ASSETS[0];
        const Filesystem = window.Capacitor.Plugins.Filesystem;
        const uriResult = await Filesystem.getUri({ path: asset.path, directory: 'DATA' });
        const nativePath = uriResult.uri.replace('file://', '');

        await new Promise((resolve, reject) => {
            const listenerHandle = window.Capacitor.Plugins.AIPlugin.addListener(
                'downloadProgress',
                (data) => {
                    handleNativeProgress(data);

                    if (data.stage === 'done') {
                        listenerHandle.remove();
                        resolve();
                    }
                    if (data.stage === 'error') {
                        listenerHandle.remove();
                        reject(new Error('Download failed'));
                    }
                }
            );

            window.Capacitor.Plugins.AIPlugin.downloadModel({
                url: asset.url,
                path: nativePath
            }).catch(err => {
                listenerHandle.remove();
                reject(err);
            });
        });

        setTimeout(() => modal.classList.add('hidden'), 1200);

    } catch (err) {
        console.error('AI download failed:', err);
        document.getElementById('downloadStaus').textContent = 'Download failed: ' + err.message;
        startBtn.textContent = 'Retry';
    }

    startBtn.disabled = false;
    searchBtn.classList.remove('downloading');
    searchBtn.onclick = showSearchPage;
    isDownloading = false;
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
  const search = document.getElementById('searchPage');
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
  if (search && search.classList.contains('active')) {
    search.classList.remove('active');
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
async function authUser(reason) {
const appLockState = localStorage.getItem("appLockEnabled");
  const overlay = document.getElementById('privacyOverlay');
  if (appLockState === "false" || appLockState === null) {
    return false;
  } 

try {
    const check = await Biometric.checkBiometry(); 
    
    // If the device has no biometrics AND cannot use a fallback device PIN/Password
    if (!check.isAvailable && !check.isStrongBiometryAvailable) {
       showToastError("No lock screen security detected. Please enable a system PIN or fingerprint.");
       return false;
    }
  } catch(e) {
    console.warn("Hardware pre-auth check skipped or uninitialized", e);
  }

let unlocked = false;
overlay.classList.remove('hidden');
  while (!unlocked) {
    try {
            await Biometric
         .internalAuthenticate({
            reason: reason || "Unlock Notefull",
              allowDeviceCredential:true
         });
         unlocked = true;
         overlay.classList.add('hidden');
         return true;
      
    } catch(err) {
showToastError('Authtication Failed! Please try again!');
    console.log(err);
    console.log(err.code);
    console.log(err.message);

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
window.manageModels = manageModels;