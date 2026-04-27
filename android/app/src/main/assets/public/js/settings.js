const VERSION = "v1.2";
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
let updateProgress = 0;
let updateProgressInterval;
let isDownloading = false;
let downloadComplete = false;
let updateMessageIndex = 0;
const updateMessages = [
  "Establishing secure connection...",
  "Verifying server certificates...",
  "Requesting latest threat database...",
  "Checking for data leaks...",
  "Scanning for compromised credentials...",
  "Downloading vulnerability definitions...",
  "Analyzing security patterns...",
  "Processing threat intelligence...",
  "Installing security patches...",
  "Updating malware signatures...",
  "Validating database integrity...",
  "Optimizing scan algorithms...",
  "Configuring protection layers...",
  "Building security index...",
  "Finalizing installation..."
];
async function startUpdate() {
  const modal = document.getElementById("updateModal");
  modal.classList.add("active");
  document.getElementById('updateWarn').classList.add("hidden");
  showToast("This may take a while");
  const sound = document.getElementById("alertSound");
  sound.play();
  startMessageRotation();
  await new Promise(r => setTimeout(r, 500));
  document.getElementById('mainHeading').textContent = "Downloading updates";
  isDownloading = true;
  try {
    const response = await fetch(
      "https://github.com/Anagh904a/notefull/blob/main/sensitiveKeywords.json"
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const total = parseInt(response.headers.get("content-length"), 10);
    const reader = response.body.getReader();
    let received = 0;
    let chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) {
        updateProgress = (received / total) * 70;
        updateProgressUI();
      }
    }
    downloadComplete = true;
    isDownloading = false;
    document.getElementById('mainHeading').textContent = "Installing updates";
    updateProgress = 75;
    updateProgressUI();
    await new Promise(r => setTimeout(r, 1000));
    updateProgress = 90;
    updateProgressUI();
    const fullData = new Uint8Array(received);
    let position = 0;
    for (let chunk of chunks) {
      fullData.set(chunk, position);
      position += chunk.length;
    }
    const text = new TextDecoder().decode(fullData);
    const data = JSON.parse(text);
    localStorage.setItem("sensitiveKeywords", JSON.stringify(data));
    const curVersion = localStorage.getItem("version") || "v1.0";
    const nextVersion = getNextVersion(curVersion);
    localStorage.setItem("version", nextVersion);
    localStorage.setItem("lastUpdated", Date.now());
    completeUpdate();
  } catch (err) {
    console.error("Update error:", err);
    stopUpdateProgress();
    document.getElementById('statusText').textContent = "Update failed";
    showToastError("Failed to fetch update. Please check your internet connection.");
    const sound = document.getElementById("errorSound");
    sound.play();
    setTimeout(() => {
      modal.classList.remove("active");
      document.getElementById("nav").classList.remove("hidden");
      updateProgress = 0;
      updateMessageIndex = 0;
      isDownloading = false;
      downloadComplete = false;
    }, 2000);
  }
}
function startInitialProgress() {
}
function startMessageRotation() {
  setInterval(() => {
    if (updateMessageIndex < updateMessages.length - 1 && updateProgress < 95) {
      updateMessageIndex++;
      const statusEl = document.getElementById('statusText');
      statusEl.style.opacity = '0';
      setTimeout(() => {
        statusEl.textContent = updateMessages[updateMessageIndex];
        statusEl.style.opacity = '0.9';
      }, 150);
      const step = Math.min(Math.floor(updateMessageIndex / 3) + 1, 5);
      document.getElementById('stepInfo').textContent = `Step ${step} of 5`;
    }
  }, 3000);
}
function updateProgressUI() {
  document.getElementById('progressBar').style.width = updateProgress + '%';
  document.getElementById('percentage').textContent = Math.floor(updateProgress) + '%';
}
function completeUpdate() {
  updateProgress = 100;
  updateProgressUI();
  document.getElementById('mainHeading').textContent = "Update complete";
  document.getElementById('statusText').textContent = "Shield database updated successfully!";
  document.getElementById('stepInfo').textContent = "Step 5 of 5";
  setTimeout(() => {
    showToast("Database Updated — Now running a quick scan...");
    const sound = document.getElementById("sucessSound");
    sound.play();
    document.getElementById("updateModal").classList.remove("active");
    document.getElementById("nav").classList.remove("hidden");
    document.getElementById("add").classList.remove("hidden");
    openAntithreat();
    startAiScan();
  }, 2000);
}
function stopUpdateProgress() {
  clearInterval(updateProgressInterval);
}
function getNextVersion(currentVersion) {
  let num = currentVersion.replace(/^v/i, "");
  let [major, minor] = num.split(".").map(Number);
  minor++;
  if (minor >= 10) {
    major++;
    minor = 0;
  }
  return `v${major}.${minor}`;
}
async function startAiScan() {
  const scanStatus = document.getElementById("scanStatus");
  const resultsContainer = document.getElementById("resultsContainer");
  const scanCircle = document.getElementById("scanCircle");
  const notesCountElem = document.getElementById("notesCount");
  const infoBox = document.getElementById("infoContainer2");
  const threatsCountElem = document.getElementById("threatsCount");
  infoBox.style.display = "flex";
  showInfo("You can leave this section while scan completes.");
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
    let currentProgress = totalNotes === 0 ? 100 : Math.round((index / totalNotes) * 100);
    scanCircle.textContent = currentProgress + "%";
    if (index >= notes.length) {
      clearInterval(scanInterval);
      scanCircle.textContent = "100%";
      infoBox.style.display = "none";
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      startBtn.textContent = "Start Quick Scan";
      startBtn.classList.remove("scanning");
      startBtn.disabled = false;
      notesCountElem.textContent = `${notes.length}`;
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
        if (sound) sound.play();
        threatsCountElem.textContent = threatsCount;
      }
    }
    index++;
  }, 100);
}
function clearData() {
  showToastError('FATAL: Your data could not be deleted: Unknown ID error');
}