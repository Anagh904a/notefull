const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;
const notifications = window.Capacitor.Plugins.LocalNotifications;



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
        showToast("registred succesfully");
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
          showToast("DEregistred succesfully");
    } catch (err) {
        console.error("Failed to cancel notification", err);
    }
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

