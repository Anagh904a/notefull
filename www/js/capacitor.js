const App = window.Capacitor.Plugins.App;
const Toast = window.Capacitor.Plugins.Toast;
const PrivacyScreen = window.Capacitor.Plugins.PrivacyScreen;
const SystemBars = window.Capacitor.Plugins.SystemBars;

if (SystemBars) {
  console.log("✅ SystemBars plugin found");
  console.log("📱 Overlay disabled → WebView adjusts");

} else {
  console.error("❌ SystemBars plugin not found", new Error());
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
  if (appLockState === "false") {
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

   }
);



