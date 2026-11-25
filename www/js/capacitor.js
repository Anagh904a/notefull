const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;
const notifications = window.Capacitor.Plugins.LocalNotifications;
const Filesystem = window.Capacitor.Plugins.Filesystem;


// --- Helper Fallbacks to Prevent Fatal Halts ---
function safeToast(msg) {
  if (typeof showToast === 'function') {
    showToast(msg);
  } else if (Toast) {
    Toast.show({ text: msg, duration: 'short' });
  }
}

async function clearModelsDir() {
  try {
    await Filesystem.rmdir({
      path: 'models',
      directory: 'DATA',
      recursive: true
    });
    return true;
  } catch (err) {
    console.warn('[Storage] models folder missing or already cleared:', err);
    return false;
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

window.fileExists = async function (path) {
  try {
    await Filesystem.stat({
      path: path,
      directory: 'DATA'
    });
    return true;
  } catch (e) {
    return false;
  }
};

async function checkFileExists(filePath, directory) {
  directory = directory || 'DATA';
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
     saveNotesStorage(currentNoteId);
     
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
