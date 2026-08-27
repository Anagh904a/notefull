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

    const download = confirm(
      "AI files are not downloaded.\n\nDownload them now?"
    );

    if (!download) return;
    await startDownload();
  }
  document.getElementById("searchPage").classList.add("active");
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

function closeSearch() {
  document.getElementById('searchPage').classList.remove('active');
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
  const navRect = document.getElementById('navBar').getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  pill.style.left = (elRect.left - navRect.left) + 'px';
  pill.style.width = elRect.width + 'px';
}

function setActive(el) {
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  movePill(el);
}

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

function showMenu(el) {
  const menu = document.getElementById("menu-notes");
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

function hideMenu() {
  const menu = document.getElementById("menu-notes");

  if (!menu.classList.contains("show")) return;

  menu.classList.remove("show");
  menu.classList.add("hide-animation");

  setTimeout(() => {
    menu.classList.remove("hide-animation");
  }, 220);

}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("menu-notes");

  if (
    !menu.contains(e.target) &&
    !e.target.closest(".menu-trigger")
  ) {
    hideMenu();
  }
});

window.showToast = function (message, duration = 2500) {
  iziToast.success({
    message: message,
    position: 'topRight',
    closeOnClick: true,
    class: 'mobile-friendly-toast'
  });
}
window.showToastError = function (message, duration = 2500) {
  iziToast.error({
    title: 'Error',
    message: message,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: true,
  });
  const sound = document.getElementById("errorSound");
  sound.play();
}
window.showToastWarn = function (message, duration = 2500) {
  iziToast.warning({
    message: message,
    position: 'topRight',
    zindex: 99999,
    class: 'mobile-friendly-toast',
    closeOnClick: true,
  });
}
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
 hideMenu();
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


