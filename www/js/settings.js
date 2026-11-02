const _threats = [];
const VERSION = "v2.2";
function openAntithreat() {
  showSection('antithreatSection', 'left');
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
  document.getElementById('')
}

let updateProgress = 0;
async function startUpdate() {
  const modal = document.getElementById("updateModal");
  modal.classList.remove('hidden');
  document.getElementById("updateWarn").classList.add("hidden");
await new Promise(r => setTimeout(r, 1000));
  document.getElementById("heading").textContent = "Connecting to Server...";
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Anagh904a/notefull/main/sensitiveKeywords.json"
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    // ✅ Save data
    localStorage.setItem("sensitiveKeywords", JSON.stringify(data));
    // ✅ Progress simulation
    document.getElementById("heading").textContent = "Installing updates";
    updateProgress = 60;
    updateProgressUI();
    await new Promise(r => setTimeout(r, 900));
    updateProgress = 90;
    updateProgressUI();
    await new Promise(r => setTimeout(r, 600));
    // ✅ Version update
    const curVersion = localStorage.getItem("version") || "v1.0";
    const nextVersion = getNextVersion(curVersion);
    localStorage.setItem("version", nextVersion);
    localStorage.setItem("lastUpdated", Date.now());
    completeUpdate();
  } catch (err) {
    console.error("Update error:", err);
    document.getElementById("statusText").textContent = "Update failed";
    showToastError("Failed to fetch update. Please check your internet connection.");
    document.getElementById("errorSound")?.play();
    setTimeout(() => {
      modal.classList.remove("active");
      document.getElementById("bottomBar").classList.remove("hidden");
       const homeTab = document.querySelector('.nav-item[onclick*="combinedContainer"]');
  if (homeTab) {
    setActive(homeTab);
    showSection('combinedContainer');
  };
      updateProgress = 0;
    }, 2000);
  }
}
function updateProgressUI() {
  document.getElementById('progressBar').style.width = updateProgress + '%';
  document.getElementById('percentage').textContent = Math.floor(updateProgress) + '%';
}
function completeUpdate() {
  updateProgress = 100;
  updateProgressUI();
  document.getElementById('heading').textContent = "Update Completed"
  document.getElementById('stepInfo').textContent = "Step 5 of 5";
  setTimeout(() => {
    showToast("Analysis Engine updated succesfully!");
    const sound = document.getElementById("sucessSound");
    sound.play();
    document.getElementById("updateModal").classList.add('hidden');
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
let _scanInterval = null;
async function startAiScan() {
  // Guard: don't double-start
  if (_scanInterval) return;
//_threats.length = 0
  // ── Elements ──────────────────────────────────────────────────
  const E = {
    scoreNum:    document.getElementById("score-num"),
    scoreDenom:  document.getElementById("score-denom"),
    scoreBar:    document.getElementById("score-bar"),
    scoreGrade:  document.getElementById("score-grade"),
    scoreDesc:   document.getElementById("score-desc"),
    pulseDot:    document.getElementById("pulse-dot"),
    progLabel:   document.getElementById("prog-label"),
    progPct:     document.getElementById("prog-pct"),
    progFill:    document.getElementById("prog-fill"),
    phaseText:   document.getElementById("phase-text"),
    cntNotes:    document.getElementById("cnt-notes"),
    cntLists:    document.getElementById("cnt-lists"),
    cntVuln:     document.getElementById("cnt-vuln"),
    resBadge:    document.getElementById("res-badge"),
    resultsList: document.getElementById("results-list"),
    btn:         document.getElementById("scan-btn"),
  };
  // ── Keywords from localStorage only — no fallback ─────────────
  const keywords = JSON.parse(localStorage.getItem("sensitiveKeywords") || "[]");
  if (!keywords.length) {
    showConfirmToast({title: 'Welcome', message: 'Welcome to Notefull v26.9 Please Rate us on Playstore.', btn1txt: 'Explore and start writting!', btn2txt: 'Continue'});
    startUpdate();
    document.getElementById('updateModal').classList.add('hidden');
    document.getElementById('updateWarn').classList.add('hidden');
    return;
  }

  if (typeof keywords[0] !== "object") {
    showToastWarn('NDSP: Invalid security keys detected: Attempting to update..');
     startUpdate();
    document.getElementById('updateWarn').classList.add('hidden');
    return;
  } 

  // ── Severity buckets from keywords ────────────────────────────


function getSeverity(kw) {
  for (const rule of keywords) {
    if (rule.keyword === kw) {
      return rule.sev;
    }
  }
  return "low";
}

function getLabel(kw) {
  for (const rule of keywords) {
    if (rule.keyword === kw) {
      return rule.title;
    }
  }
  return "Sensitive Keyword";
}
  function getTip(sev) {
    if (sev === "high")   return "High-risk data — consider adding password protection to it.";
    if (sev === "medium") return "Moderately sensitive — review whether this needs to be here.";
    return "Low risk — good to review periodically.";
  }
  // Regex cache for performance
  const regexCache = {};
  function getRegex(kw) {
    if (!regexCache[kw]) {
      const safe = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regexCache[kw] = new RegExp(`\\b${safe}\\b`, "i");
    }
    return regexCache[kw];
  }
function findMatch(text) {
  if (!text) return null;

  for (const rule of keywords) {
    const kw = rule.keyword;

    if (getRegex(kw).test(text)) {
      return {
        keyword: kw,
        sev: rule.sev,
        title: rule.title
      };
    }
  }

  return null;
}
  // ── Reset UI completely before scan starts ─────────────────────
  E.progFill.style.transition = "none";
  E.scoreBar.style.transition = "none";
  E.progFill.style.width  = "0%";
  E.scoreBar.style.width  = "0%";
  E.progPct.textContent   = "0%";
  // Force reflow so transitions don't carry old state
  E.progFill.getBoundingClientRect();
  E.scoreBar.getBoundingClientRect();
  // Re-enable transitions
  E.progFill.style.transition = "";
  E.scoreBar.style.transition = "";
  E.btn.disabled          = true;
  E.btn.innerHTML         = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Scanning…`;
  E.pulseDot.className    = "pulse-dot active";
  E.progLabel.textContent = "Analysis in progress…";
  E.progFill.className    = "progress-fill active";
  E.phaseText.textContent = "";
  E.scoreNum.textContent  = "—";
  E.scoreDenom.textContent = "";
  E.scoreNum.className    = "score-number";
  E.scoreGrade.textContent = "Analyzing…";
  E.scoreGrade.className  = "score-grade";
  E.scoreDesc.textContent = "Analyzing your notes and lists…";
  E.scoreBar.className    = "score-bar-fill";
  E.cntNotes.textContent  = "0";
  E.cntLists.textContent  = "0";
  E.cntVuln.textContent   = "0";
  E.resBadge.textContent  = "0";
  E.resultsList.innerHTML = `<div class="empty-state"><p>Analysis running…</p></div>`;
  // ── Load data ─────────────────────────────────────────────────
  const [notes, lists] = await Promise.all([
    localforage.getItem("notes").then(v => v || []),
    localforage.getItem("lists").then(v => v || []),
  ]);
  // Flatten everything into a unified work queue
  // Each item: { text, title, source }
  const queue = [];
  for (const note of notes) {
    if (!note) continue;
    if (note.password && note.password.trim() !== "") continue; // skip locked
    queue.push({ id: note.id, title: note.title || "Untitled", text: note.content || "", source: "Note" });
  }
  for (const list of lists) {
    if (!list) continue;
    if (list.password && list.password.trim() !== "") continue;
    // Combine list title + all item labels into one text blob
    const itemsText = Array.isArray(list.items)
      ? list.items.map(i => (typeof i === "string" ? i : i.text || i.label || i.name || "")).join(" ")
      : "";
    queue.push({ id: list.id, title: list.title || "Untitled List", text: `${list.title || ""} ${itemsText}`, source: "List" });
  }
  const total     = queue.length;
  const startTime = Date.now();
  let index       = 0;
  let notesCount  = 0;
  let listsCount  = 0;
  let threats     = 0;
  let Totalthreats = threats+_threats.length;
  let firstHit    = true;
  const seen      = new Set();
  // ── Score calculation ─────────────────────────────────────────
  // Score starts hidden, computed only at end
  // During scan we show a live estimate that doesn't mislead
const scanSpeed = Math.min(200, Math.max(30, Math.round(2000 / (total || 1))));
  _scanInterval = setInterval(() => {
    if (index >= total) {
      clearInterval(_scanInterval);
      _scanInterval = null;
      _finish();
      return;
    }
    const item = queue[index++];
    // Update source counters
    if (item.source === "Note") E.cntNotes.textContent = ++notesCount;
    else                        E.cntLists.textContent = ++listsCount;
    // Progress bar
    const pct = Math.round((index / total) * 100);
    E.progFill.style.width = pct + "%";
    E.progPct.textContent  = pct + "%";
    // Skip duplicates
    if (seen.has(item.title)) return;
const matched = findMatch(item.text);
if (!matched) return;

seen.add(item.title);

const sev   = matched.sev;
const label = matched.title;
const kw    = matched.keyword;
const tip   = getTip(sev);
    const tag   = sev === "medium" ? "med" : sev;
    const action = sev === "high" ? "Review Now" : sev === "medium" ? "Check Now" : "Review";
const id=item.id;
const actionFn= item.source==="Note" ? `openNote('${id}')` : `openList('${id}')`;
    threats++;
    Totalthreats++;
    E.cntVuln.textContent  = Totalthreats;
    E.resBadge.textContent = Totalthreats;
    // Clear empty state on first result
    if (firstHit) { E.resultsList.innerHTML = ""; firstHit = false; }
    const div = document.createElement("div");
    div.className = "r-item";
    div.innerHTML = `
      <div class="r-dot ${tag}"></div>
      <div class="r-body">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div class="r-name">${label} in ${item.title}</div>
          <div class="r-tag ${tag}">${sev.toUpperCase()}</div>
        </div>
        <div class="r-desc" style="margin-top:3px;opacity:.75;font-style:italic">${tip}</div>
        <div class="r-item-footer">
          <span class="r-note-ref">Found In A ${item.source}</span>
          <button class="r-fix-btn ${tag}" onclick="${actionFn}">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            ${action}
          </button>
        </div>
      </div>`;
    E.resultsList.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add("show")));
    if (typeof showToastWarn === "function") showToastWarn("Analytics: Vulnerabilities found!");
    const sound = document.getElementById("alertSound");
    if (sound) sound.play().catch(() => {});
}, scanSpeed);
  // ── Finish ────────────────────────────────────────────────────
  function _finish() {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalThreats= threats+_threats.length;
    const score    = calcScore(totalThreats, total);
    const sevClass = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
    const grade    = score >= 75 ? "Good" : score >= 45 ? "Needs Attention" : "At Risk";
    document
.querySelector(".score-card")
.classList.add("done");
    E.progFill.style.width  = "100%";
    E.progFill.className    = "progress-fill";
    E.progPct.textContent   = "100%";
    E.pulseDot.className    = "pulse-dot done";
    E.progLabel.textContent = "Analysis complete";
    E.phaseText.textContent = `Finished in ${duration}s · Last Scanned on  ${new Date().toLocaleTimeString()}`;
    E.scoreNum.textContent   = score;
    E.scoreDenom.textContent = "/100";
    E.scoreNum.className     = `score-number ${sevClass}`;
    E.scoreBar.style.width   = score + "%";
    E.scoreBar.className     = `score-bar-fill ${sevClass}`;
    E.scoreGrade.textContent = grade;
    E.scoreGrade.className   = `score-grade ${sevClass}`;
    E.scoreDesc.textContent  = threats === 0
      ? `All ${total} items are clean!`
      : `${threats} sensitive item${threats !== 1 ? "s" : ""} found`;
if (threats === 0 && _threats.length === 0) {
E.resultsList.innerHTML = `<div class="empty-state"><p class="protected"><i class="ti ti-circle-check" style="color:#22c55e;"></i> You're Fully Protected</p></div>`;
} else if (threats === 0 && _threats.length !== 0) {
  E.resultsList.innerHTML = `<div class="empty-state"><p class="warn"><i class="ti ti-exclamation-circle" style="color:#f59e0b;"></i> You're safe but vulnerable. Perform Recommended Actions</p></div>`;
} 
    if (_threats.length>0) {
for(const threat of _threats){
 const div = document.createElement("div");
    div.className = "r-item show";
div.innerHTML=`
<div class="r-dot ${threat.sev}"></div>
<div class="r-body">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
<div class="r-name">${threat.title}</div>
<div class="r-tag ${threat.sev}">
${threat.sev.toUpperCase()}
</div>
</div>
  <div class="r-desc" style="margin-top:3px;opacity:.75;font-style:italic">${threat.tip}</div>
<div class="r-item-footer">
<span class="r-note-ref">
${threat.source}
</span>
</div>
</div>`;
    E.resultsList.appendChild(div);
}
    }
    E.resultsList.closest(".results-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => {
      E.btn.disabled   = false;
      E.btn.innerHTML  = `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Re-Analyze`;
      E.btn.onclick    = () => _resetScan();
    }, 300);
  }
}
function calcScore(Totalthreats, totalItems) {
  if (totalItems === 0) return 100;
  const density = Totalthreats / totalItems;
  const severityMultiplier = 1 + Math.log1p(Totalthreats) * 0.4;
  const penalty = Math.min(70, density * 80 * severityMultiplier);
  const densityBonus = Math.min(15, density * 25);
  return Math.max(3, Math.round(100 - penalty - densityBonus));
}
function _resetScan() {
  document
.querySelector(".score-card")
.classList.remove("done");
  // Kill any in-progress scan first
  if (_scanInterval) { clearInterval(_scanInterval); _scanInterval = null; }
  const ids = {
    "pulse-dot":    el => el.className = "pulse-dot",
    "prog-label":   el => el.textContent = "Idle — press Start Analysis",
    "prog-pct":     el => el.textContent = "0%",
    "phase-text":   el => el.textContent = "",
    "score-num":    el => { el.textContent = "—"; el.className = "score-number"; },
    "score-denom":  el => el.textContent = "",
    "score-grade":  el => { el.textContent = "Not scanned"; el.className = "score-grade"; },
    "score-desc":   el => el.textContent = "Run a scan to see results",
    "cnt-notes":    el => el.textContent = "0",
    "cnt-lists":    el => el.textContent = "0",
    "cnt-vuln":     el => el.textContent = "0",
    "res-badge":    el => el.textContent = "0",
    "results-list": el => el.innerHTML = `<div class="empty-state"><p>Not analyzed yet.<br>Start a analysis to detect vulnerabilities.</p></div>`,
  };
  for (const [id, fn] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) fn(el);
  }
  // Reset bars without transition so they snap to 0
  ["prog-fill", "score-bar"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = "none";
    el.style.width = "0%";
    el.className = id === "prog-fill" ? "progress-fill" : "score-bar-fill";
    el.getBoundingClientRect(); // force reflow
    el.style.transition = "";
  });
  const btn = document.getElementById("scan-btn");
  if (btn) {
    btn.disabled  = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Analysis`;
    btn.onclick   = () => startAiScan();
  }
  startAiScan();
}
function injectThreat({ title, sev, tip = null, button = null, onAction = null, source = "System" }) {
  _threats.push({ title, sev, source, tip });
  const tag    = sev === "medium" ? "med" : sev; 
  const action = button !== false
    ? (button || (sev === "high" ? "Review Now" : sev === "medium" ? "Check Now" : "Review"))
    : null;
 const actionCode = (typeof onAction === "string" && onAction.trim()) ? onAction : "void(0)";
  const hint = tip !== false
    ? (tip || "Review this item for potential privacy risk.")
    : null;
  // Update threat counters
  const cntVuln  = document.getElementById("cnt-vuln");
  const resBadge = document.getElementById("res-badge");
  const count    = _threats.length;
  if (cntVuln)  cntVuln.textContent  = count;
  if (resBadge) resBadge.textContent = count;
  // Recalculate and update score
  const totalItems = parseInt(document.getElementById("cnt-notes")?.textContent || "0")
                   + parseInt(document.getElementById("cnt-lists")?.textContent || "0");
  const newScore = calcScore(count, totalItems);
  const sevClass = newScore >= 75 ? "good" : newScore >= 45 ? "warn" : "bad";
  const grade    = newScore >= 75 ? "Good" : newScore >= 45 ? "Needs Attention" : "At Risk";
  const scoreNum   = document.getElementById("score-num");
  const scoreBar   = document.getElementById("score-bar");
  const scoreGrade = document.getElementById("score-grade");
  const scoreDesc  = document.getElementById("score-desc");
  const scoreDenom = document.getElementById("score-denom");
  if (scoreNum)   { scoreNum.textContent = newScore; scoreNum.className = `score-number ${sevClass}`; }
  if (scoreDenom) scoreDenom.textContent = "/100";
  if (scoreBar)   { scoreBar.style.width = newScore + "%"; scoreBar.className = `score-bar-fill ${sevClass}`; }
  if (scoreGrade) { scoreGrade.textContent = grade; scoreGrade.className = `score-grade ${sevClass}`; }
  if (scoreDesc)  scoreDesc.textContent = `${count} sensitive item${count !== 1 ? "s" : ""} found`;
  // Render card
  const resultsList = document.getElementById("results-list");
  if (resultsList?.querySelector(".empty-state")) resultsList.innerHTML = "";
  const div = document.createElement("div");
  div.className = "r-item";
  div.innerHTML = `
    <div class="r-dot ${sev}"></div>
    <div class="r-body">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div class="r-name">${title}</div>
        <div class="r-tag ${sev}">${sev.toUpperCase()}</div>
      </div>
      ${hint ? `<div class="r-desc" style="margin-top:3px;opacity:.75;font-style:italic">${hint}</div>` : ""}
      <div class="r-item-footer">
        <span class="r-note-ref">${source}</span>
        ${action ? `
        <button class="r-fix-btn ${sev}" onclick="${actionCode}">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          ${action}
        </button>` : ""}
      </div>
    </div>`;
  resultsList?.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add("show")));
}

/**
 * Notefull Files & AI Storage Manager
 */


// 1. Scan and render files from filesystem
async function refreshAppFilesList() {
  const container = document.getElementById("appFilesList");
  const totalSizeEl = document.getElementById("totalFilesSize");
  const installSection = document.getElementById("aiInstallSection");

  if (!container) return;
  container.innerHTML = '<div class="empty-files-note">Scanning internal directory...</div>';

  const Filesystem = window.Capacitor?.Plugins?.Filesystem;
  if (!Filesystem) {
    container.innerHTML = '<div class="empty-files-note">Filesystem unavailable</div>';
    return;
  }

  let totalBytes = 0;
  let hasAiModel = false;
  const discoveredFiles = [];

  try {
    // Read the models directory in app DATA
    const res = await Filesystem.readdir({
      path: 'models',
      directory: 'DATA'
    }).catch(() => ({ files: [] }));

    const fileList = res.files || [];

    for (const f of fileList) {
      const fileName = typeof f === 'string' ? f : f.name;
      const filePath = `models/${fileName}`;

      try {
        const stat = await Filesystem.stat({ path: filePath, directory: 'DATA' });
        totalBytes += (stat.size || 0);

        const isAi = fileName.endsWith('.litertlm') || fileName.endsWith('.gguf');
        if (isAi && stat.size > 1024 * 1024 * 100) { // > 100MB
          hasAiModel = true;
        }

        discoveredFiles.push({
          name: fileName,
          path: filePath,
          size: stat.size,
          isAi: isAi
        });
      } catch (_) {}
    }

  } catch (err) {
    console.warn("[Files Manager] Error scanning models directory:", err);
  }

  // Update total size banner
  if (totalSizeEl) {
    totalSizeEl.textContent = formatBytes(totalBytes);
  }

  // 2. Render files or empty placeholder
  if (discoveredFiles.length === 0) {
    container.innerHTML = '<div class="empty-files-note">No local files stored in app directory.</div>';
  } else {
    container.innerHTML = discoveredFiles.map(file => `
      <div class="file-row-item">
        <div class="file-row-left">
          <div class="file-row-icon ${file.isAi ? 'ai-file' : ''}">
            <i class="${file.isAi ? 'ti ti-sparkles' : 'ti ti-file'}"></i>
          </div>
          <div class="file-row-details">
            <div class="file-row-name">
              <span>${file.name}</span>
              ${file.isAi ? '<span class="file-ai-badge">AI Model</span>' : ''}
            </div>
            <div class="file-row-size">${formatBytes(file.size)}</div>
          </div>
        </div>
        <button class="file-delete-btn" onclick="handleFileDelete('${file.path}', ${file.isAi})">
          <i class="ti ti-trash"></i> Delete
        </button>
      </div>
    `).join("");
  }

  // 3. Toggle installer options:
  // If an AI model exists, hide installer section. If no AI model exists, reveal it.
  if (installSection) {
    if (hasAiModel) {
      installSection.classList.add("hidden");
    } else {
      installSection.classList.remove("hidden");
    }
  }
}

// 2. Handle File Deletion & Prompt
async function handleFileDelete(filePath, isAiModel) {
  if (isAiModel) {
    const confirmDelete = (!await showConfirmToast({
    title: 'Delete Notefull AI?',
    message: 'Deleting Notefull AI will cause AI features to stop working. Are you sure you want to proceed?'
  }))
    if (!confirmDelete) return;

    await purgeAiModel(filePath);
  } else {
    const confirmRegular = confirm("Delete this file permanently?");
    if (!confirmRegular) return;

    try {
      await window.Capacitor.Plugins.Filesystem.deleteFile({
        path: filePath,
        directory: 'DATA'
      });
      safeToast("File deleted");
      refreshAppFilesList();
    } catch (e) {
      safeToastError("Failed to delete file: " + e.message);
    }
  }
}

// 3. Purge AI Model, update state and UI
async function purgeAiModel(filePath) {
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;

    // Delete model file
    await Filesystem.deleteFile({
      path: filePath,
      directory: 'DATA'
    });

    // Reset runtime states
    window.aiReady = false;
    safeToast("AI Model purged from storage.");

    // Refresh files list so the 3-option installer card immediately appears
    await refreshAppFilesList();

  } catch (err) {
    console.error("[Purge AI] Failed:", err);
    safeToastError("Could not delete AI model: " + err.message);
  }
}

// 4. Installer Option Card Selection
function selectInstallerTier(tier) {
  chosenInstallTier = tier;

  document.querySelectorAll(".installer-tier-list .tier-card").forEach(card => {
    card.classList.toggle("selected", card.id === `tierCard-${tier === 'disbale-ai' ? 'disable' : tier}`);
  });

  const installBtn = document.getElementById("startInstallBtn");
  if (installBtn) {
    if (tier === "disbale-ai") {
      installBtn.innerHTML = '<i class="ti ti-check"></i> Apply & Keep AI Disabled';
    } else {
      installBtn.innerHTML = '<i class="ti ti-download"></i> Yah! Wonderful selection! Continue?';
    }
  }
}

// 5. Confirm and Trigger Download
async function confirmAndDownloadFromFiles(chosenInstallTier) {
  if (chosenInstallTier === "disbale-ai") {
    localStorage.setItem("AI-prefrence", "disbale-ai");
    localStorage.setItem("DisbalkeAIAuto", "true");
    document.documentElement.classList.add("ai-disabled");
    document.querySelectorAll(".ai, .ai-button, #navAgent, .ai-status-pill").forEach(el => el.classList.add("hidden"));
    safeToast("AI features remain disabled.");
    refreshAppFilesList();
    return;
  }

  // 8GB RAM check if Full is chosen
  if (chosenInstallTier === "full") {
    try {
      const info = await window.Capacitor?.Plugins?.AIPlugin?.getDeviceInfo();
      if ((info?.ramGB || 0) < 6.7) {
        showToastWarn(`Your device has ${info.ramGB}GB RAM. 8GB+ is required for the Advanced model to prevent memory crashes.`);
        selectInstallerTier('lite');
        return;
      }
    } catch (_) {}
  }

  // Save selection
  localStorage.setItem("AI-prefrence", chosenInstallTier);
  localStorage.removeItem("DisbalkeAIAuto");
  document.documentElement.classList.remove("ai-disabled");
  document.querySelectorAll(".ai, .ai-button, #navAgent, .ai-status-pill").forEach(el => el.classList.remove("hidden"));

  safeToast(`Starting download for ${chosenInstallTier === 'full' ? 'Qwen3-4B Advanced' : 'Qwen Lite'}...`);

  // Call the centralized downloader in capacitor.js
  if (typeof startDownload === 'function') {
    startDownload();
  } else if (typeof window.startDownload === 'function') {
    window.startDownload();
  }

  // Return to settings
  showSection('settingsSection');
}

// Byte Formatter Helper
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

let chosenInstallTier = "lite";

function selectInstallerTier(tier) {
  chosenInstallTier = tier;

  // Toggle selection classes on the 3 cards
  document.querySelectorAll(".installer-tier-list .installer-card").forEach((card) => {
    card.classList.remove("selected");
  });

  const activeCardId = tier === "disbale-ai" ? "tierCard-disable" : `tierCard-${tier}`;
  const targetCard = document.getElementById(activeCardId);
  if (targetCard) targetCard.classList.add("selected");

  // Adjust button icon and text dynamically
  const btn = document.getElementById("startInstallBtn");
  if (btn) {
    if (tier === "disbale-ai") {
      btn.innerHTML = '<i class="ti ti-check"></i><span>Apply & Keep AI Disabled</span>';
      btn.style.background = "#475569";
    } else {
      btn.innerHTML = '<i class="ti ti-download"></i><span>Start Installation</span>';
      btn.style.background = "#0284c7";
    }
  }
}

// Drawer open/close
function toggleAgentDrawer(open) {
  document.getElementById("agentSidebar")?.classList.toggle("open", open);
  document.getElementById("bgClose")?.classList.toggle("open", open);
}

// Exit Agent mode cleanly back to Home
function exitAgentSection() {
  document.body.classList.remove("agent-mode-active");
  const agentSection = document.getElementById("agentSection");
  if (agentSection) agentSection.classList.add("hidden");

  // Restore the home view
  const homeTab = document.querySelector('.nav-item[onclick*="combinedContainer"]');
  if (homeTab) {
    setActive(homeTab);
    showSection('combinedContainer');
  }
}

function setFilter(filterType) {
  // Update active pill state
  document.querySelectorAll('.sort-container .sort-option').forEach(btn => {
    const isTarget = btn.getAttribute('onclick')?.includes(`'${filterType}'`);
    btn.classList.toggle('active', isTarget);
  });

if (filterType !== 'trash') {
renderItems();
  renderItems(filterType);
  const trash = document.getElementById('trashDisplay');
trash.classList.add('hidden');
} else {
console.log('renderinjg trahs');
const container = document.getElementById('itemsContainer');
container.innerHTML = '';
const trash = document.getElementById('trashDisplay');
trash.classList.remove('hidden');
displayDeletedNotes();
displayDeletedLists();
} 
}



// Auto-expand textarea
function autoResizeAgentInput(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 125) + "px";
  const btn = document.getElementById("agentSendBtn");
  btn?.classList.toggle("disabled", !textarea.value.trim());
}

function handleAgentComposerKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    AgentController.sendPrompt();
  }
}

// Search Modal
function openAgentSearch() {
  const overlay = document.getElementById("agentSearchOverlay");
  const input = document.getElementById("agentSearchInput");
  overlay?.classList.add("open");
  if (input) {
    input.value = "";
    renderAgentSearch("");
    setTimeout(() => input.focus(), 60);
  }
  toggleAgentDrawer(false);
}

function closeAgentSearch() {
  document.getElementById("agentSearchOverlay")?.classList.remove("open");
}

function renderAgentSearch(q) {
  const query = q.trim().toLowerCase();
  const container = document.getElementById("agentSearchResults");
  if (!container) return;

  const chats = AgentController.chats || [];
  if (!query) {
    container.innerHTML = chats.slice(0, 8).map(c => `
      <button class="agent-search-result-item" onclick="selectSearchedChat('${c.id}')">
        <div class="agent-search-result-title">${c.title}</div>
        <div class="agent-search-result-preview">${c.messages[0]?.content || 'Empty chat'}</div>
      </button>
    `).join("");
    return;
  }

  const matches = chats.filter(c => 
    c.title.toLowerCase().includes(query) || 
    c.messages.some(m => m.content.toLowerCase().includes(query))
  );

  if (matches.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;">No matching chats</div>';
    return;
  }

  container.innerHTML = matches.map(c => `
    <button class="agent-search-result-item" onclick="selectSearchedChat('${c.id}')">
      <div class="agent-search-result-title">${c.title}</div>
      <div class="agent-search-result-preview">${c.messages[0]?.content || ''}</div>
    </button>
  `).join("");
}

function selectSearchedChat(chatId) {
  AgentController.activeChatId = chatId;
  AgentController.renderCurrentConversation();
  AgentController.renderRecentChatsList();
  closeAgentSearch();
}

