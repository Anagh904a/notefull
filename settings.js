const VERSION = "v1.2"; // Simulate new version

function openAntithreat() {
showSection('antithreatSection');

  const lastUpdated = localStorage.getItem("lastUpdated");
  const version = localStorage.getItem("version") || "v1.0";

  document.getElementById("lastUpdated").textContent = lastUpdated || "Outdated";
  document.getElementById("currentVersion").textContent = version;

  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (!lastUpdated || now - parseInt(lastUpdated) > threeDays) {
    document.getElementById("updateButton").classList.remove("hidden");
  } else {
    document.getElementById("updateButton").classList.add("hidden");
  }
}

// Update the account icon
function updateAccountIcon() {
  const username = localStorage.getItem('notesAppUser');
  const accountIcon = document.getElementById('account-icon');

  if (username && accountIcon) {
    const firstLetter = username.trim().charAt(0).toUpperCase();
    accountIcon.textContent = firstLetter;

    accountIcon.onclick = () => {
      alert(`Account: ${username}\n`);
    };

    // Fill the input with current username
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) usernameInput.value = username;
  }
}

// Save updated profile
function saveProfile() {
  const usernameInput = document.getElementById('usernameInput');
  const profileMsg = document.getElementById('profile-msg');

  if (usernameInput && usernameInput.value.trim() !== '') {
    const newName = usernameInput.value.trim();
    localStorage.setItem('notesAppUser', newName);
    updateAccountIcon();
    profileMsg.textContent = 'Profile updated successfully!';
    setTimeout(() => profileMsg.textContent = '', 3000);
  } else {
    profileMsg.textContent = 'Please enter a valid name.';
  }
}

// Show section helper (like in your credits section)


// Initialize profile on load
document.addEventListener('DOMContentLoaded', updateAccountIcon);


function openAntithreat() {
showSection('antithreatSection');

  const lastUpdated = localStorage.getItem("lastUpdated");
  const version = localStorage.getItem("version") || "v1.0";

  document.getElementById("lastUpdated").textContent = lastUpdated || "Outdated";
  document.getElementById("currentVersion").textContent = version;

  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (!lastUpdated || now - parseInt(lastUpdated) > threeDays) {
    document.getElementById("updateButton").classList.remove("hidden");
  } else {
    document.getElementById("updateButton").classList.add("hidden");
  }
}

async function startUpdate() {
  const modal = document.getElementById("updateModal");
  const statusEl = document.getElementById("updateStatus");
  const updateBtn = document.getElementById("updateButton");

  modal.style.display = "flex";
  updateBtn.disabled = true;

  let baseText = "Preparing updates";
  let dotCount = 0;
  const dotsInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    statusEl.textContent = baseText + ".".repeat(dotCount);
  }, 500);

  // Timed transitions for visual feedback
  setTimeout(() => baseText = "Downloading update", 5000);
  setTimeout(() => baseText = "Installing update", 20000);

  try {
    // Simulate long installation
    await new Promise(resolve => setTimeout(resolve, 45000));

    clearInterval(dotsInterval);
    statusEl.textContent = "Finalizing...";

    // Fetch latest keywords from GitHub
    const response = await fetch(
      "https://raw.githubusercontent.com/Anagh904a/notefull/refs/heads/main/sensitiveKeywords.json"
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    localStorage.setItem("sensitiveKeywords", JSON.stringify(data));
    console.log("✅ Keywords updated:", data);

    // Update version info
    const curVersion = localStorage.getItem("version") || "v1.0";
    const nextVersion = getNextVersion(curVersion);
    localStorage.setItem("version", nextVersion);
    localStorage.setItem("lastUpdated", Date.now());

    statusEl.textContent = "Update completed successfully!";
    setTimeout(() => {
      modal.style.display = "none";
      openAntithreat();
      alert("Database Updated — Now running a quick scan...");
      startAiScan();
    }, 2000);

  } catch (err) {
    clearInterval(dotsInterval);
    statusEl.textContent = "Update failed. Please try again.";
    console.error("❌ Update error:", err);
    alert("Failed to fetch update. Please check your internet connection.");
  } finally {
    updateBtn.disabled = false;
  }
}

function getNextVersion(currentVersion) {
  // Remove 'v' prefix if present
  let num = currentVersion.replace(/^v/i, "");

  // Split into major.minor
  let [major, minor] = num.split(".").map(Number);

  // Increment minor version
  minor++;

  // If minor reaches 10, roll over to next major
  if (minor >= 10) {
    major++;
    minor = 0;
  }

  return `v${major}.${minor}`;
}

let isPaused = false;
let scanInterval;
let aiMessages = [
  "Scanning for leaked credentials...",
  "Checking for sensitive keywords...",
  "Validating security integrity...",
  "Analyzing note metadata...",
  "Cross-referencing suspicious terms..."
];
let messageIndex = 0;

async function startAiScan() {
  const scanStatus = document.getElementById("scanStatus");
  const resultsContainer = document.getElementById("resultsContainer");
  const scanCircle = document.getElementById("scanCircle");
  const notesCountElem = document.getElementById("notesCount");
  const infoBox = document.getElementById("infoContainer2");
  const threatsCountElem = document.getElementById("threatsCount");

  // Show Info Box
  infoBox.style.display = "flex";
  showInfo("You can safely leave this page while the scan completes.");

  // Reset UI
  resultsContainer.innerHTML = "";
  scanStatus.textContent = "Quick scan in progress... Scanning Notes....";
  scanCircle.style.background = "green";
  threatsCountElem.textContent = "0";
  scanCircle.classList.add("active-pulse");
  notesCountElem.textContent = "0";
  const startBtn = document.getElementById("startScanButton");
  startBtn.textContent = "Scanning...";
  startBtn.classList.add("scanning");
  startBtn.disabled = true;

  const notes = await localforage.getItem("notes") || [];
const totalNotes = notes.length;

console.log("📊 AI Scan: Loaded", totalNotes, "notes from localforage");
  let sensitiveKeywords = JSON.parse(localStorage.getItem("sensitiveKeywords") || "null");

  if (!Array.isArray(sensitiveKeywords) || sensitiveKeywords.length === 0) {
    sensitiveKeywords = [
      "password", "ssn", "credit card", "bank account", "secret", "pin", "bank",
      "policy", "account", "pass", "id", "aadhaar", "card", "security", "key",
      "token", "license", "confidential", "credentials", "auth", "login"
    ];
  }

  let foundSensitiveData = [];
  let scannedTitles = new Set(); 
  let threatsCount = 0;
  let index = 0;
  const startTime = Date.now();

  const scanInterval = setInterval(() => {
    // --- PERCENTAGE UPDATE (FIXED: NOW INSIDE THE LOOP) ---
    let currentProgress = totalNotes === 0 ? 100 : Math.round((index / totalNotes) * 100);
    scanCircle.textContent = currentProgress + "%";

    if (index >= notes.length) {
      clearInterval(scanInterval);
      // Final 100% update
      scanCircle.textContent = "100%";
      
      infoBox.style.display = "none";
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      startBtn.textContent = "Start Quick Scan";
      startBtn.classList.remove("scanning");
      startBtn.disabled = false;

      notesCountElem.textContent = `${notes.length}`;
      showAiToast();

      if (threatsCount === 0) {
        scanCircle.style.background = "#4CAF50";
        scanStatus.textContent = `Scan complete in ${duration}s — No threats found!`;
        resultsContainer.innerHTML = "<div class='success-msg'>✅ All notes are safe!</div>";
      } else {
        scanCircle.style.background = threatsCount === 1 ? "orange" : "red";
        scanStatus.textContent = `Scan complete in ${duration}s`;
        
        resultsContainer.innerHTML = foundSensitiveData.join("<br>") +
          `<button class="protect-btn" onclick="redirectProtect()">Protect Now</button>`;
      }

      resultsContainer.scrollIntoView({ behavior: "smooth" });
      scanCircle.classList.remove("active-pulse");
      return;
    }

    const note = notes[index];
    notesCountElem.textContent = index + 1;

    if (note && (!note.password || note.password.trim() === "")) {
      const content = (note.content || "").toLowerCase();
      const title = note.title || "Untitled";

      const matchedKeyword = sensitiveKeywords.find(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(content);
      });

      if (matchedKeyword && !scannedTitles.has(title)) {
        let severity = /password|credit card|ssn|bank account/.test(matchedKeyword) ? "High" : "Medium";

        foundSensitiveData.push(
          `<div class="alert-msg">Risk in: 
             <strong style="color:red;">${title}</strong>
             <span class="severity ${severity.toLowerCase()}">${severity}</span>
           </div>`
        );
        scannedTitles.add(title);
        threatsCount++;
        showToastWarn("Threats Found!");
        const sound = document.getElementById("alertSound");
        if(sound) sound.play();
        threatsCountElem.textContent = threatsCount;
      }
    }

    index++;
  }, 100); 
}

function redirectProtect() {
  alert("Please add a password to sensitive notes.");
}

function clearData() {
  if (
    confirm(
      "Are you sure you want factory reset? This action cannot be undone."
    )
  ) {
    localStorage.removeItem("notes");
    localStorage.removeItem("lists");
    
    displayNotes();
    displayLists();
    showToast("All data cleared successfully! ");
    refresh();
  }
  displayNotes();
    displayLists();
    refresh();
}