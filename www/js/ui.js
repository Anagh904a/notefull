function closeNotePassword() {
  document.getElementById("notePasswordModal").style.display = "none";
}
function showInfo(message) {
  const infoBox = document.getElementById('infoContainer2');
  document.getElementById('infoText').textContent = message;
  infoBox.style.display = 'flex';
}
function showSection(sectionId) {
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden");
  });
  document.getElementById(sectionId).classList.remove("hidden");
}

async function showSearchPage() {

const aiFiles = await manageModels();
  const ready = window.aiReady;
  if (!ready) await initAi();

  if (!aiFiles) {

    const download = (await showConfirmToast({
    title: 'Download AI now?',
    message: 'AI files are not fully downloaded yet? Do you want to download it. DATA CHARGES MAY APPLY',
    btn1txt: 'Start Downloading AI',
    btntxt2: "I will Download AI later"
  }));

    if (!download) return;
    await startDownload();
  } 
showSection('notefullAiPage');
document.getElementById('addBtn').classList.add('hidden');

}

function showAiThinkingModal(text) {
    const modal = document.getElementById('ai-thinking-modal');
    if (!modal) return;

    document.getElementById('ai-thinking-text').textContent = text || 'Processing';
    modal.classList.remove('ai-thinking-modal--closing');
    modal.classList.remove('hidden');

    // next frame so the opening transition actually triggers
    requestAnimationFrame(() => {
        modal.classList.add('ai-thinking-modal--open');
    });
}

function closeAiThinkingModal() {
    const modal = document.getElementById('ai-thinking-modal');
    if (!modal) return;

    modal.classList.add('ai-thinking-modal--closing');

    // let the shine sweep + fade finish, then fully hide
    setTimeout(() => {
        modal.classList.remove('ai-thinking-modal--open');
        modal.classList.remove('ai-thinking-modal--closing');
        modal.classList.add('hidden');
    }, 650);
}

function showResultsModal(text) {
  const modal = document.getElementById('summary');
  modal.classList.remove('hidden');
  const modalText = document.getElementById('summary-text');
  modalText.innerText = text;
}

function closeSummary() {
  const modal = document.getElementById('summary');
  modal.classList.add('hidden');
   const modalText = document.getElementById('summary-text');
  modalText.innerText = "";
}


async function openLockSection() {
  try {
    await authUser("Open Security Section");

  } catch (err) {
    console.error(err);
  }
  showSection('lockSection', 'left');
}

function movePill(el) {
  const pill = document.getElementById('pill');
  const navRect = document.getElementById('bottomBar').getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  pill.style.left = (elRect.left - navRect.left) + 'px';
  pill.style.width = elRect.width + 'px';
}

function setActive(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  movePill(el);
  const addBtn = document.getElementById('addBtn');
   if (addBtn.classList.contains('hidden')) {
        addBtn.classList.remove('hidden');
    }
}

function updateDynamicGreeting() {
  const greetingEl = document.getElementById('greeting-text');
  const subtitleEl = document.getElementById('subtitle-greet');
  if (!greetingEl || !subtitleEl) return;

  const hour = new Date().getHours();
  let timeSalutation = "Good day!";

  if (hour >= 5 && hour < 12) {
    timeSalutation = "Good morning!";
  } else if (hour >= 12 && hour < 17) {
    timeSalutation = "Good afternoon!";
  } else if (hour >= 17 && hour < 22) {
    timeSalutation = "Good evening!";
  } else {
    timeSalutation = "Working late?";
  }

  // Pool of rotating, unique subtitle prompts
  const prompts = [
    "What's on your mind today?",
    "Capture an idea before it slips away.",
    "Ready to organize your day?",
    "Small steps turn into big accomplishments.",
    "Clear your thoughts onto paper.",
    "What are we building today?",
    "Keep your focus sharp and your notes sharper.",
    "A quick note today saves hours tomorrow.",
    "Start with one quick thought."
  ];

  // Avoid picking the exact same subtitle as last time
  const lastIndex = parseInt(localStorage.getItem('lastGreetingIndex'), 10);
  let nextIndex;
  do {
    nextIndex = Math.floor(Math.random() * prompts.length);
  } while (prompts.length > 1 && nextIndex === lastIndex);

  localStorage.setItem('lastGreetingIndex', nextIndex);

  greetingEl.textContent = timeSalutation;
  subtitleEl.textContent = prompts[nextIndex];
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateDynamicGreeting);

window.addEventListener('load', () => {
  const active = document.querySelector('.nav-item.active');
  if (active) {
    const pill = document.getElementById('pill');
    pill.style.transition = 'none';
    movePill(active);
    requestAnimationFrame(() => { pill.style.transition = ''; });
  }
});

window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-item.active');
  if (active) movePill(active);
});

function showMenu(menuId) {
const menu = document.getElementById(menuId);
  if (menu.classList.contains('show')) {
    menu.classList.remove("show");
    menu.classList.add("hide-animation");

    setTimeout(() => {
      menu.classList.remove("hide-animation");
    }, 220);
    return;
  }
  menu.classList.remove("hide-animation");
  requestAnimationFrame(() => {
    menu.classList.add("show");
  });


}

function hideMenu(menuId) {
  const menu = document.getElementById(menuId);

  if (!menu.classList.contains("show")) return;

  menu.classList.remove("show");
  menu.classList.add("hide-animation");

  setTimeout(() => {
    menu.classList.remove("hide-animation");
  }, 220);

}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("menu-notes");
const menus = document.getElementById('menu-lists');
  if (
    !menu.contains(e.target) &&
    !e.target.closest(".menu-trigger")
  ) {
    hideMenu('menu-notes');
  }
   if (
    !menus.contains(e.target) &&
    !e.target.closest(".menu-trigger")
  ) {
    hideMenu('menu-lists');
  }
});


iziToast.settings({
  timeout: 10000,
  resetOnHover: true,
  transitionIn: 'flipInX',
  transitionOut: 'flipOutX',
     transitionInMobile: 'bounceInRight',
    transitionOutMobile: 'flipOutX'
});

// Success toast
window.showToast = function (message, duration = 2500) {
  iziToast.success({
    message,
    timeout: duration,
    position: 'topRight',
    closeOnClick: true,
    class: 'mobile-friendly-toast',

  
  });
};

/**
 * Modern iziToast replacement for window.confirm()
 * Supports both an array of custom buttons OR Promise-based (async/await) Yes/No confirmation.
 */
// 1. Fixed Action Toast
window.showActionToast = function ({
  message,
  buttonText = 'View',
  onButtonClick = () => {},
  duration = 10000
} = {}) {
  iziToast.show({
    message,
    timeout: duration,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: false,
    resetOnHover: true,
    buttons: [
      [
        `<button type="button" class="notefull-toast-action">${buttonText}</button>`,
        function (instance, toast) {
          try {
            onButtonClick();
          } finally {
            const targetToast = (toast && toast.getAttribute) ? toast : document.querySelector('.iziToast');
            if (targetToast) {
              iziToast.hide({
                transitionOut: 'flipOutX',
                transitionOutMobile: 'flipOutX'
              }, targetToast);
            }
          }
        },
        true
      ]
    ]
  });
};

// 2. Fixed Confirm Toast
window.showConfirmToast = function ({
  title = 'Confirm',
  message = 'Are you sure?',
  position = 'center',
  overlay = true,
  timeout = false,
  btn1txt = 'Yes',
btn2txt = 'Cancel', // Pass ms (e.g. 5000) to auto-close & return false, or false for no timeout
  actions = null
} = {}) {
  return new Promise((resolve) => {
    let resolved = false;

    const actionList = Array.isArray(actions) && actions.length > 0
      ? actions
      : [
          {
            text: btn1txt,
            primary: true,
            onClick: () => resolve(true)
          },
          {
            text: btn2txt,
            primary: false,
            onClick: () => resolve(false)
          }
        ];

    const iziButtons = actionList.map((btn, index) => [
      `${btn.text}`,
      function (instance, toast) {
        resolved = true;
        try {
          if (typeof btn.onClick === 'function') {
            btn.onClick();
          }
        } finally {
          const targetToast = (toast && toast.getAttribute)
            ? toast
            : document.querySelector('#notefull-confirm-toast') || document.querySelector('.iziToast');

          if (targetToast) {
            iziToast.hide({
              transitionOut: 'flipOutX',
              transitionOutMobile: 'flipOutX'
            }, targetToast, 'button');
          }
        }
      },
      index === 0
    ]);

    iziToast.question({
      timeout: timeout, // Uses your custom timeout (or stays open if false)
      progressBar: Boolean(timeout), // Shows countdown bar only when timeout is set
      close: false,
      overlay: overlay,
      displayMode: 'once',
      id: 'notefull-confirm-toast',
      zindex: 99999,
      title: title,
      message: message,
      position: position,
      class: 'mobile-friendly-toast',
      transitionIn: 'flipInX',
      transitionOut: 'flipOutX',
      transitionInMobile: 'flipInX',
      transitionOutMobile: 'flipOutX',
      buttons: iziButtons,
      onClosed: function () {
        // Fires when timeout expires OR overlay is clicked -> resolves to false!
        if (!resolved) {
          resolved = true;
          resolve(false);
        }
      }
    });
  });
};

// Error toast
window.showToastError = function (message, duration = 2500) {
  iziToast.error({
    title: 'Error',
    message,
    timeout: duration,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: true
  });

  const sound = document.getElementById('errorSound');

  if (sound) {
    sound.play().catch(() => {});
  }
};

// Warning toast
window.showToastWarn = function (message, duration = 2500) {
  iziToast.warning({
    message,
    timeout: duration,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: true
  });
};

// Action toast: message + button + callback
window.showActionToast = function ({
  message,
  buttonText = 'View',
  onButtonClick = () => {},
  duration = 10000
} = {}) {
  iziToast.show({
    message,
    timeout: duration,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: false,
    resetOnHover: true,
    buttons: [
      [
        `<button type="button" class="notefull-toast-action">${buttonText}</button>`,
        function (instance, toast) {
          try {
            onButtonClick();
          } finally {
            instance.hide({ transitionOut: 'flipOutX' }, toast);
          }
        },
        true
      ]
    ]
  });
};

const mainContainer = document.getElementById('itemsContainer');

let pressTimer = null;
let startX = 0;
let startY = 0;
let lastTapTime = 0;
let lastTapTarget = null;

const LONG_PRESS_DURATION = 1500; // 2 seconds (2000ms)
const DOUBLE_TAP_DELAY = 300;     // Max time between taps (300ms)
const MOVE_THRESHOLD = 10;        // Max finger movement in px before canceling

// Your custom functions
function onLongPress(targetElement, event) {
    console.log("2-second Long Press triggered on:", targetElement);
    // Optional: trigger a tiny vibration in Android WebView if supported
    if (navigator.vibrate) navigator.vibrate(50);
    showSelectionMode();
    // Call your selection mode or custom logic here
}

function onDoubleTap(targetElement, event) {
    console.log("Double Tap / Double Click triggered on:", targetElement);

}


// 1. Block default Android long-press menu inside #main
mainContainer.addEventListener('contextmenu', (e) => {
    if (e.target !== mainContainer) {
        e.preventDefault();
    }
});

// 2. Start tracking on touch / click down
mainContainer.addEventListener('pointerdown', (e) => {
    // Ignore if the user clicked directly on the empty #main container background
    if (e.target === mainContainer) return;

    // Optional: If you want to target a specific card wrapper (e.g., .note or .item)
    // const targetItem = e.target.closest('.item');
    // if (!targetItem) return;
    const targetItem = e.target;

    startX = e.clientX;
    startY = e.clientY;

    // Start 2-second timer for Long Press
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
        onLongPress(targetItem, e);
        pressTimer = null;
    }, LONG_PRESS_DURATION);
});

// 3. Cancel long press if the user is scrolling / dragging
mainContainer.addEventListener('pointermove', (e) => {
    if (!pressTimer) return;

    const moveX = Math.abs(e.clientX - startX);
    const moveY = Math.abs(e.clientY - startY);

    if (moveX > MOVE_THRESHOLD || moveY > MOVE_THRESHOLD) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
});

// 4. Cancel long press on release & check for Double Tap
mainContainer.addEventListener('pointerup', (e) => {
    if (e.target === mainContainer) return;

    // If pressTimer is still running, they released before 2 seconds
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;

        // Check for Double Tap (mobile + desktop friendly)
        const currentTime = Date.now();
        const timeDiff = currentTime - lastTapTime;

        if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0 && lastTapTarget === e.target) {
            onDoubleTap(e.target, e);
            lastTapTime = 0; // Reset after triggering
        } else {
            lastTapTime = currentTime;
            lastTapTarget = e.target;
        }
    }
});

// 5. Cleanup if touch is interrupted by system gesture or leaves container
mainContainer.addEventListener('pointercancel', () => {
    clearTimeout(pressTimer);
    pressTimer = null;
});

function closeWelcomeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
}

function toggleSync(el) {
  const enabled = el.checked;
  localStorage.setItem("appLockEnabled", enabled);
  showToast(enabled ? "App Lock Enabled 🔐" : "App Lock Disabled");
  const status = document.getElementById("appLockStatus");
  if (status) {
    status.innerText = el.checked
      ? "🔐 App Lock is ON"
      : "🔓 App Lock is OFF";
  }
  const sound = document.getElementById("sucessSound");
  sound.play();
}

function changeMode(mode) {
  localStorage.setItem('mode', mode);
  document.getElementById('modeStatus').textContent =
    'Current Mode: ' + mode.charAt(0).toUpperCase() + mode.slice(1);
}

function toggleAdv(el) {
  const enabled = el.checked;
  localStorage.setItem("AdvSecurityEnabled", enabled);
  showToast(enabled ? "Advanced Security Enabled 🔐" : "Advanced Security Disabled");
  const status = document.getElementById("advSecurityStatus");
  if (status) {
    status.innerText = el.checked
      ? "🔐 Advanced Security is ON"
      : "🔓 Advanced Security is OFF";
  }
  const sound = document.getElementById("sucessSound");
  sound.play();
}
function forceUiLag(ms) {
  const startTime = Date.now();
  // This loop forces the CPU to work constantly, freezing the UI completely
  while (Date.now() - startTime < ms) {
    // Do nothing, just loop to block the thread
  }
}
function toggleR(el) {
  setTimeout(() => {


    const startTime = Date.now();
    while (Date.now() - startTime < 4000) {
    }

    const text = document.getElementById('scary');
    text.classList.remove('hidden');

    // 4. Force the input to stay CHECKED and make it DISABLED
    el.checked = false;
    el.disabled = true;

    // 5. Trigger the app safety error alert
    showToastWarn("Feature-crash detected caused by incompatible driver which is newer than supported one!");

  }, 500);

  showToastError("Freeze detected! Please wait, do not close app.");
  injectThreat({
title:"App freeze detected caused by developer option!",
sev:"med",
tip:"Report to developer about this crash",
});
}
function loadSettingsUI() {
  const enabled = localStorage.getItem("appLockEnabled") === "true";
  const enabled2 = localStorage.getItem("AdvSecurityEnabled") === "true";
  const lockToggle = document.getElementById("appLock");
  const advSecurity = document.getElementById("advSecurity");

  if (lockToggle) {
    lockToggle.checked = enabled;
  }
  if (advSecurity) {
    advSecurity.checked = enabled;
  }
}

function showFormatMsg() {
  showToastWarn('Formatting features are under development')
}

function formatSelection(tag = 'b') {
  const selection = window.getSelection();
  if (!selection.rangeCount || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const selectedText = range.toString();

  // Parse HTML into live elements instead of plain text
  const htmlFragment = range.createContextualFragment(`<${tag}>${selectedText}</${tag}>`);

  range.deleteContents();
  range.insertNode(htmlFragment);

  // Remove selection highlight
  selection.removeAllRanges();
}

function handleTermsCheckbox(isChecked) {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.disabled = !isChecked;
  }
}

function setModalViewState(state) {
  const readyView = document.getElementById('dlReadyState');
  const activeView = document.getElementById('dlActiveState');
  const doneView = document.getElementById('dlDoneState');
  const title = document.getElementById('assetsDownloadStatus');
  const desc = document.getElementById('assetsDownloadDesc');

  readyView?.classList.remove('active');
  activeView?.classList.remove('active');
  doneView?.classList.remove('active');

  if (state === 'ready') {
    readyView?.classList.add('active');
    if (title) title.textContent = 'Install Notefull AI';
    if (desc) desc.textContent = 'Download on-device AI models for private, fully offline smart notes and task analysis.';
  } else if (state === 'active') {
    activeView?.classList.add('active');
    if (title) title.textContent = 'Downloading AI Assets…';
    if (desc) desc.textContent = 'Please keep Notefull open until download and verification finish.';
  } else if (state === 'done') {
    doneView?.classList.add('active');
    if (title) title.textContent = 'Ready to Use!';
    if (desc) desc.textContent = 'The AI model has been installed and verified on your device.';
  }
}
function showNotePassword() {
 hideMenu('menu-notes');
  const password = document.getElementById('notePassword').value.trim();
  const title = document.getElementById('noteTitle').value.trim();
  const passwordText = document.getElementById('note-password-text');
  const note = { title, password, };
  document.getElementById("notePasswordModal").classList.remove("hidden");
  if (note.title === "" && note.password === "") {
    passwordText.innerHTML = `Enter New Password for new note`;
  } else if (note.title !== "" && note.password === "") {
    passwordText.innerHTML = `Set New Pasword for ${note.title}`;
  } else if (note.title !== "" && note.password !== "") {
    passwordText.innerHTML = `Change Password of ${note.title}`;
  }
}
function showList() {
  hideMenu('menu-lists');
  const modal = document.getElementById("listPasswordModalr");
  const password = document.getElementById('listPassword').value.trim();
  const title = document.getElementById('listTitle').value.trim();
  const passwordText = document.getElementById('list-password-text');
  const list = { title, password, };
  modal.classList.remove("hidden");
  if (list.title === "" && list.password === "") {
    passwordText.innerHTML = `Enter New Password for new list`;
  } else if (list.title !== "" && list.password === "") {
    passwordText.innerHTML = `Set New Pasword for ${list.title}`;
  } else if (list.title !== "" && list.password !== "") {
    passwordText.innerHTML = `Change Password of ${list.title}`;
  }
}
function closeListPassword() {
  document.getElementById("listPasswordModalr").classList.add("hidden");
}
function showAddOptions() {
  document.getElementById('addOptionsModal').classList.toggle('hidden');
}
window.addEventListener('DOMContentLoaded', () => {
  const activeItem = document.querySelector('.filter-item.active');
  if (activeItem) {
    handleFilterChange(activeItem, 'all');
  }
})
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function resetNotefull() {
  try {
    const isConfirmed = await showConfirmToast({
      title: 'Factory Reset Notefull?',
      message: 'Continuing will cause your data to be deleted permanently. It will be non-recoverable.',
      btn1txt: "I know the consequences of the action. Proceed"
    });

    if (!isConfirmed) {
      showToast('Factory Reset has been terminated! Restoring original state...');
      await delay(1000);
      showToast('Notefull original state restored! You can continue using Notefull.');
      return false;
    }

    showToastWarn('You have proceeded with factory reset. Checking NDSP...');
    await delay(3000);

    showToast('Successfully triggered NDSP delete flow! Waiting for response...');
    await delay(2000);

    const isFinalConfirmed = await showConfirmToast({
      title: 'Are you really sure?',
      message: 'This is the last confirmation. If you proceed, YOUR DATA AND PREFERENCES WILL BE DELETED!',
      btn2txt: "No, don't proceed!",
      btn1txt: 'Yes, Proceed Anyway'
    });

    if (!isFinalConfirmed) {
      showToast('Factory Reset has been cancelled. Your data remains unchanged.');
      return false;
    }

    await localforage.clear();
    localStorage.clear();

    showToast('Notefull has been reset successfully! Restarting app...');
    await delay(400);
showToast('You will need to setuo app again now!')
    location.reload();
    
    return true;
  } catch (error) {
    console.error('Notefull factory reset failed:', error);
    showToastWarn('Factory reset failed. Some data may not have been deleted.');
    return false;
  }
}

/**
 * Global function to apply the theme to the DOM and native system bars
 * @param {boolean} isDark 
 */
function applyTheme(isDark) {
    const root = document.documentElement;

    if (isDark) {
        root.setAttribute('dataTheme', 'dark');
    } else {
        root.removeAttribute('dataTheme');
    }

    root.style.colorScheme = isDark ? 'dark' : 'light';

    // Sync Android native status & navigation bar icons
    if (window.NativeTheme && typeof window.NativeTheme.setSystemBarIcons === 'function') {
        window.NativeTheme.setSystemBarIcons(isDark);
    }

    // Sync top bar icon if present
    const headerIcon = document.getElementById('themeHeaderIcon');
    if (headerIcon) {
        headerIcon.className = isDark ? 'ti ti-moon' : 'ti ti-sun';
    }

    // Sync Dark Mode checkbox if present
    const darkToggle = document.getElementById('darkModeToggle') || 
                       document.querySelector('#general input[onchange*="toggleTheme"]');
    if (darkToggle) {
        darkToggle.checked = isDark;
    }
}

/**
 * Helper to get the current OS theme from Android bridge or browser fallback
 */
function getSystemDarkState() {
    if (window.NativeTheme && typeof window.NativeTheme.isSystemDark === 'function') {
        return window.NativeTheme.isSystemDark();
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Manual toggle: Applies temporary override without breaking system default tracking
 */
function toggleTheme(el) {
    const isCurrentlyDark = document.documentElement.getAttribute('dataTheme') === 'dark';
    const targetState = (el && typeof el.checked === 'boolean') ? el.checked : !isCurrentlyDark;
    
    // Apply immediately. System default remains active in the background.
    applyTheme(targetState);
}

/**
 * Receives live updates from MainActivity when the Android system theme changes
 */
window.syncSystemTheme = function (isSystemDark) {
    // Always sync with the system default when the system theme changes
    applyTheme(isSystemDark);
};

// Initialize on app load: System Default is always ON by default
document.addEventListener('DOMContentLoaded', () => {
    // Fetch and apply accurate system theme directly from Android OS
    applyTheme(getSystemDarkState());
});


