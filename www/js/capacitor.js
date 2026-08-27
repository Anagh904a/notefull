const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;
const notifications = window.Capacitor.Plugins.LocalNotifications;
const Filesystem = window.Capacitor.Plugins.Filesystem;
let isDownloading = false;

// --- Helper Fallbacks to Prevent Fatal Halts ---
function safeToast(msg) {
  if (typeof showToast === 'function') {
    showToast(msg);
  } else if (Toast) {
    Toast.show({ text: msg, duration: 'short' });
  }
}

function safeToastError(msg) {
  if (typeof showToastError === 'function') {
    showToastError(msg);
  } else if (Toast) {
    Toast.show({ text: msg, duration: 'long' });
  }
}

async function callNotificationPopUp() {
  try {
    const permission = await notifications.requestPermissions();
    if (permission.display !== 'granted') {
      safeToastError('Notification permission denied! If this continues, please manually grant it.');
      return false;
    } else {
      const statusEl = document.getElementById('notificationStatus');
      if (statusEl) {
        statusEl.innerHTML = "Permission is granted!";
        statusEl.style.color = "green";
      }
      safeToast('Notification permission successfully granted!');
      return true;
    }
  } catch (err) {
    console.error('[Notification] Request failed:', err);
    return false;
  }
}

async function initAi() {
  showToastError('AI features have been temporarily disabled due to instablity');
  return;
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
    const AIPlugin = window.Capacitor.Plugins.AIPlugin;

    if (statusText) statusText.textContent = 'Resolving model path...';
    const nativePath = await getModelNativePath();

    if (statusText) statusText.textContent = 'Initialising model...';
    await AIPlugin.loadModel({ path: nativePath });

    window.aiReady = true;
    if (statusText) statusText.textContent = 'AI Ready!';
    if (modal) setTimeout(function() { modal.classList.add('hidden'); }, 1500);
    safeToast('AI loaded!');
    return true;

  } catch(err) {
    if (statusText) statusText.textContent = 'Failed to load AI';
    if (modal) modal.classList.add('hidden');
    console.error('[AI] Init Error:', err);
    return null;
  }
}

window.fileExists = async function (path) {
  try {
    await Filesystem.stat({
      path: path,
      directory: 'FILES'
    });
    return true;
  } catch (e) {
    return false;
  }
};

async function checkFileExists(filePath, directory) {
  directory = directory || 'FILES';
  try {
    await Filesystem.stat({
      path: filePath,
      directory: directory
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function manageModels() {
  const llamaPath = 'models/Llama-3.2-1B-Instruct-Q4_K_M.gguf';
  const gemmaPath = 'models/qwen2.5-3b-instruct-q3_k_m.gguf';

  const hasLlama = await checkFileExists(llamaPath, 'FILES');
  let hasGemma = await checkFileExists(gemmaPath, 'DATA');

  if (hasGemma) {
    try {
      const fileInfo = await Filesystem.stat({
        path: gemmaPath,
        directory: 'DATA'
      });
      const fileSizeGB = fileInfo.size / (1024 * 1024 * 1024);
      if (fileSizeGB < 1.6) {
        console.error('Qwen model size too small: ' + fileSizeGB.toFixed(2) + 'GB');
        hasGemma = false;
      }
    } catch (error) {
      console.error("Failed to check Qwen model size:", error);
      hasGemma = false;
    }
  }

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

  return hasGemma;
}

const STAGE_LABELS = {
  connecting: 'Connecting to server…',
  downloading: 'Installing Notefull AI ',
  verifying: 'Verifying file…',
  done: 'AI Ready!',
  paused: 'Download Paused',
  retrying: 'Retrying Download',
  waiting_network: 'Waiting for network..',
  error: 'Download failed'
};

let downloadSpeedSamples = [];

function updateDownloadEta(downloaded, total) {
  const now = performance.now();
  downloadSpeedSamples.push({ t: now, bytes: downloaded });
  downloadSpeedSamples = downloadSpeedSamples.filter(function(s) { return now - s.t < 5000; });
  if (downloadSpeedSamples.length < 2) return;

  const first = downloadSpeedSamples[0];
  const bytesPerMs = (downloaded - first.bytes) / (now - first.t);
  const etaEl = document.getElementById('etaTracker');
  if (!etaEl) return;

  if (bytesPerMs <= 0) { etaEl.textContent = 'Estimating time…'; return; }

  const secs = Math.max(0, Math.round((total - downloaded) / bytesPerMs / 1000));
  etaEl.textContent = secs > 90 ? 'About ' + Math.round(secs/60) + ' min left' : 'About ' + secs + 's left';
}

function handleNativeProgress(data) {
  const statusEl = document.getElementById('downloadStaus');
  const label = STAGE_LABELS[data.stage];
  if (label && statusEl) statusEl.textContent = label;

  const bar = document.getElementById('download-progress');
  if (!bar) {
    console.warn('[Download UI] Missing #download-progress in DOM');
    return;
  }

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
    const tracker = document.getElementById('sizeTracker');
    if (tracker) {
      tracker.textContent = (data.downloaded/1024/1024).toFixed(1) + ' MB of ' + (data.total/1024/1024).toFixed(1) + ' MB';
    }
    updateDownloadEta(data.downloaded, data.total);
  }

  if (data.stage === 'done') {
    fill.style.width = '100%';
    const etaEl = document.getElementById('etaTracker');
    if (etaEl) etaEl.textContent = 'Done';
  }

  if (data.stage === 'error') {
    const etaEl = document.getElementById('etaTracker');
    if (etaEl) etaEl.textContent = 'Failed';
  }
}

const AI_ASSETS = [
  {
    url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q3_k_m.gguf?download=true',
    path: 'models/qwen2.5-3b-instruct-q3_k_m.gguf',
    sizeMB: 2040
  }
];

// Fixed startDownload function
async function startDownload() {
  const modal = document.getElementById('assetsDownloader');
  const startBtn = document.getElementById('startBtn');
  const searchBtn = document.getElementById("searchIcon");

  if (searchBtn) {
    searchBtn.classList.add('downloading');
    if (typeof showDownloaderModal === 'function') {
      searchBtn.onclick = showDownloaderModal;
    }
  }
  
  isDownloading = true;
  if (startBtn) startBtn.disabled = true;
  downloadSpeedSamples = [];

  try {
    const alreadyHave = await manageModels();
    if (alreadyHave) {
      const statusEl = document.getElementById('downloadStaus');
      if (statusEl) statusEl.textContent = 'AI files already downloaded.';
      const bar = document.getElementById('download-progress');
      if (bar) {
        let fill = bar.querySelector('.progress-fill') || document.createElement('div');
        fill.className = 'progress-fill';
        fill.style.width = '100%';
        bar.appendChild(fill);
        bar.classList.add('complete');
      }
      if (modal) setTimeout(function() { modal.classList.add('hidden'); }, 600);
      if (startBtn) startBtn.disabled = false;
      return;
    }

    const permission = await checkPermission(); 
    if (!permission) {
      safeToast('Please grant notification permission as it is required by background download!');
      await callNotificationPopUp();
    }

    const asset = AI_ASSETS[0];
    const nativePath = await getModelNativePath();

    // FIXED: Properly handle Capacitor addListener handle without using .then()
    await new Promise(async function(resolve, reject) {
      let listenerHandle = null;

      try {
        // Handle both Sync (Capacitor v3/v4/v5) and Promise-based (Capacitor v6+) addListener
        const handleOrPromise = window.Capacitor.Plugins.AIPlugin.addListener(
          'downloadProgress', 
          function(data) {
            handleNativeProgress(data);

            if (data.stage === 'done') {
              if (listenerHandle && typeof listenerHandle.remove === 'function') {
                listenerHandle.remove();
              }
              resolve();
            }
            if (data.stage === 'error') {
              if (listenerHandle && typeof listenerHandle.remove === 'function') {
                listenerHandle.remove();
              }
              reject(new Error('Download failed'));
            }
          }
        );

        // Resolve handle if addListener returned a Promise
        listenerHandle = (handleOrPromise && typeof handleOrPromise.then === 'function')
          ? await handleOrPromise 
          : handleOrPromise;

        // Trigger native download
        await window.Capacitor.Plugins.AIPlugin.downloadModel({
          url: asset.url,
          path: nativePath
        });

      } catch (err) {
        if (listenerHandle && typeof listenerHandle.remove === 'function') {
          listenerHandle.remove();
        }
        reject(err);
      }
    });

    if (modal) setTimeout(function() { modal.classList.add('hidden'); }, 1200);

  } catch (err) {
    console.error('AI download failed:', err);
    const statusEl = document.getElementById('downloadStaus');
    if (statusEl) statusEl.textContent = 'Download failed: ' + err.message;
    if (startBtn) startBtn.textContent = 'Retry';
  } finally {
    if (startBtn) startBtn.disabled = false;
    if (searchBtn) {
      searchBtn.classList.remove('downloading');
      if (typeof showSearchPage === 'function') searchBtn.onclick = showSearchPage;
    }
    isDownloading = false;
  }
}

async function checkPermission() {
  try {
    const permission = await notifications.checkPermissions();
    const statusEl = document.getElementById('notificationStatus');
    if (permission.display !== 'granted') {
      if (statusEl) {
        statusEl.innerHTML = "Permission is not granted!";
        statusEl.style.color = "red";
      }
      return false;
    } else {
      if (statusEl) {
        statusEl.innerHTML = "Permission is granted!";
        statusEl.style.color = "green";
      }
      return true;
    }
  } catch (e) {
    return false;
  }
} 

async function getModelNativePath() {
  const relPath = 'models/qwen2.5-3b-instruct-q3_k_m.gguf';

  try {
    await Filesystem.mkdir({
      directory: 'DATA',
      path: 'models',
      recursive: true
    });
  } catch (e) {
    // Directory already exists
  }

  try {
    const baseUri = await Filesystem.getUri({ directory: 'DATA', path: '' });
    const basePath = baseUri.uri.replace("file://", "").replace(/\/$/, "");
    return basePath + '/' + relPath;
  } catch (err) {
    const uri = await Filesystem.getUri({ directory: 'DATA', path: 'models' });
    return uri.uri.replace("file://", "").replace(/\/$/, "") + '/qwen2.5-3b-instruct-q3_k_m.gguf';
  }
}

async function setupNotificationChannels() {
  try {
    if (notifications && notifications.createChannel) {
      await notifications.createChannel({
        id: 'notefull-reminders',          
        name: 'Reminders (Notes & Lists)',
        description: 'Alerts for scheduled note and checklist reminders', 
        importance: 5,                     
        visibility: 1,                     
        vibration: true
      });
    }
  } catch (error) {
    console.error("Failed to create notification channel", error);
  }
}

async function registerNotification(item, type) {
  const permission = await notifications.checkPermissions();
  if (permission.display !== 'granted') {
    safeToastError("Notification permission not granted! Reminder saved but won't notify.");
    return null;
  }

  const id = Math.floor(Math.random() * 2147483647);

  try {
    await notifications.schedule({
      notifications: [{
        id: id,
        title: type === 'note' ? 'Note Reminder' : 'List Reminder',
        body: item.title,
        schedule: { at: new Date(item.remainderTime) },
        channelId: 'notefull-reminders'
      }]
    });
    return id;
  } catch (err) {
    console.error("Failed to schedule notification", err);
    safeToastError("Could not schedule notification.");
    return null;
  }
}

async function deregisterNotification(notificationId) {
  if (!notificationId) return;
  try {
    await notifications.cancel({ notifications: [{ id: notificationId }] });
  } catch (err) {
    console.error("Failed to cancel notification", err);
  }
  safeToast('called');
}

function advancedSecurity() {
  const advSecurityState = localStorage.getItem("AdvSecurityEnabled");
  if (advSecurityState === "true") {
    PrivacyScreen.enable();
  } else if (advSecurityState === "false") {
    PrivacyScreen.disable();
  }
}

let appActive = true;
App.addListener("appStateChange", function(state) {
  appActive = state.isActive;
  if (!appActive) {
    const overlay = document.getElementById('privacyOverlay');
    const addNoteSection = document.getElementById("addNoteSection");
    const addListSection = document.getElementById("addListSection");
    const notePasswordModal = document.getElementById("notePasswordModal");
    const listPasswordModal = document.getElementById("listPasswordModal");
    
    if (overlay) overlay.classList.add('hidden');
    
    if (addNoteSection && !addNoteSection.classList.contains("hidden")) {
      if (notePasswordModal && !notePasswordModal.classList.contains("hidden")) {
        notePasswordModal.classList.add("hidden");
        return;
      }
      if (typeof saveNote === 'function') saveNote();
      return;
    }
    
    if (addListSection && !addListSection.classList.contains("hidden")) {
      if (listPasswordModal && !listPasswordModal.classList.contains("hidden")) {
        listPasswordModal.classList.add("hidden");
        return;
      }
      if (typeof saveList === 'function') saveList();
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
});

let backPressCount = 0;
let lastBackPressTime = 0;

function showNativeToast(msg) {
  Toast.show({
    text: msg,
    duration: 'short'
  });
}

function handleBackButton() {
  const addNoteSection = document.getElementById("addNoteSection");
  const search = document.getElementById('searchPage');
  const addListSection = document.getElementById("addListSection");
  const notePasswordModal = document.getElementById("notePasswordModal");
  const listPasswordModal = document.getElementById("listPasswordModal");
  
  if (addNoteSection && !addNoteSection.classList.contains("hidden")) {
    if (notePasswordModal && !notePasswordModal.classList.contains("hidden")) {
      notePasswordModal.classList.add("hidden");
      return;
    }
    if (typeof saveNote === 'function') saveNote();
    return;
  }
  
  if (addListSection && !addListSection.classList.contains("hidden")) {
    if (listPasswordModal && !listPasswordModal.classList.contains("hidden")) {
      listPasswordModal.classList.add("hidden");
      return;
    }
    if (typeof saveList === 'function') saveList();
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
    if (!check.isAvailable && !check.isStrongBiometryAvailable) {
      safeToastError("No lock screen security detected. Please enable a system PIN or fingerprint.");
      return false;
    }
  } catch(e) {
    console.warn("Hardware pre-auth check skipped or uninitialized", e);
  }

  let unlocked = false;
  if (overlay) overlay.classList.remove('hidden');
  
  while (!unlocked) {
    try {
      await Biometric.internalAuthenticate({
        reason: reason || "Unlock Notefull",
        allowDeviceCredential: true
      });
      unlocked = true;
      if (overlay) overlay.classList.add('hidden');
      return true;
    } catch(err) {
      safeToastError('Authentication Failed! Please try again!');
    }
  }
}

document.addEventListener("DOMContentLoaded", function() {
  authUser();
  advancedSecurity();
  setupNotificationChannels();
  checkPermission();
});

window.authUser = authUser;
window.callNotificationPopUp = callNotificationPopUp;
window.registerNotification = registerNotification;
window.deregisterNotification = deregisterNotification;
window.startDownload = startDownload;
window.initAi = initAi;
window.manageModels = manageModels;