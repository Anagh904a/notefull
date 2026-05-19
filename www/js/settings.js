

const _threats = [];
const VERSION = "v2.2";
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

async function startUpdate() {
  const modal = document.getElementById("updateModal");
  modal.classList.remove('hidden');

  document.getElementById("updateWarn").classList.add("hidden");
  document.getElementById("alertSound")?.play();

await new Promise(r => setTimeout(r, 500));

  document.getElementById("heading").textContent = "Downloading updates";

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
    updateProgress = 75;
    updateProgressUI();

    await new Promise(r => setTimeout(r, 800));

    updateProgress = 90;
    updateProgressUI();

    await new Promise(r => setTimeout(r, 500));

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
      document.getElementById("nav").classList.remove("hidden");

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
    showToast("Notefull AI updated succesfully!");
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
    showToastWarn('Please Wait, security system is configuring itself. This may take a while');
    startUpdate();
    return;
  }

  // ── Severity buckets from keywords ────────────────────────────
  const HIGH_RE   = /password|passwd|pin|secret|token|api.?key|bearer|credential|auth|ssn|aadhaar|aadhar|pan|passport|credit.?card|cvv|cvc|bank|account.?number|ifsc|routing/i;
  const MEDIUM_RE = /login|username|email|userid|license|licence|serial|activation|phone|mobile|address|contact/i;

  function getSeverity(kw) {
    if (HIGH_RE.test(kw))   return "high";
    if (MEDIUM_RE.test(kw)) return "medium";
    return "low";
  }

  function getLabel(kw) {
    if (/password|passwd|secret|credential|auth/i.test(kw)) return "Secret / Credential";
    if (/token|api.?key|bearer/i.test(kw))                  return "API Key / Token";
    if (/credit.?card|cvv|cvc|bank|account|ifsc|routing/i.test(kw)) return "Financial Data";
    if (/ssn|aadhaar|aadhar|pan|passport/i.test(kw))        return "Government ID";
    if (/pin/i.test(kw))                                    return "PIN Detected";
    if (/login|username|email|userid/i.test(kw))            return "Login Info";
    if (/license|licence|serial|activation/i.test(kw))      return "License Key";
    if (/phone|mobile|address|contact/i.test(kw))           return "Personal Contact Info";
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
    for (const kw of keywords) {
      if (getRegex(kw).test(text)) return kw;
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
  E.progLabel.textContent = "Scan in progress…";
  E.progFill.className    = "progress-fill active";
  E.phaseText.textContent = "";
  E.scoreNum.textContent  = "—";
  E.scoreDenom.textContent = "";
  E.scoreNum.className    = "score-number";
  E.scoreGrade.textContent = "Scanning…";
  E.scoreGrade.className  = "score-grade";
  E.scoreDesc.textContent = "Analysing your notes and lists…";
  E.scoreBar.className    = "score-bar-fill";
  E.cntNotes.textContent  = "0";
  E.cntLists.textContent  = "0";
  E.cntVuln.textContent   = "0";
  E.resBadge.textContent  = "0";
  E.resultsList.innerHTML = `<div class="empty-state"><p>Scan running…</p></div>`;

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

    const sev   = getSeverity(matched);
    const label = getLabel(matched);
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
          <div class="r-name">${label}</div>
          <div class="r-tag ${tag}">${sev.toUpperCase()}</div>
        </div>
        <div class="r-desc">${item.source}: "<strong>${item.title}</strong>" — matched: <em>${matched}</em></div>
        <div class="r-desc" style="margin-top:3px;opacity:.75;font-style:italic">${tip}</div>
        <div class="r-item-footer">
          <span class="r-note-ref">in · ${item.title}</span>
          <button class="r-fix-btn ${tag}" onclick="${actionFn}">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
            ${action}
          </button>
        </div>
      </div>`;
    E.resultsList.appendChild(div);
    requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add("show")));

    if (typeof showToastWarn === "function") showToastWarn("Sensitive content found!");
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
    E.progLabel.textContent = "Scan complete";
    E.phaseText.textContent = `Finished in ${duration}s · ${new Date().toLocaleTimeString()}`;

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
  // Both are 0
  E.resultsList.innerHTML = `<div class="empty-state"><p>✅ All clear — no sensitive content found.</p></div>`;
} else if (threats === 0 && _threats.length !== 0) {
  // threats is 0, but _threats has items
  E.resultsList.innerHTML = `<div class="empty-state"><p>⚠️ All data is safe. It is recommended to take all suggested actions for more security.</p></div>`;
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
      E.btn.innerHTML  = `<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Restart Scan`;
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
    "prog-label":   el => el.textContent = "Idle — press Start Scan",
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
    "results-list": el => el.innerHTML = `<div class="empty-state"><p>No results yet.<br>Start a scan to detect sensitive content.</p></div>`,
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
    btn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Scan`;
    btn.onclick   = () => startAiScan();
  }
  startAiScan();

}

function injectThreat({ title, sev, tip = null, button = null, source = "System" }) {
  _threats.push({ title, sev, source, tip });
  console.log('Function inject threat was called');
console.log({ title, sev, source, tip});
 
  const tag    = sev === "medium" ? "med" : sev;
  const action = button !== false
    ? (button || (sev === "high" ? "Review Now" : sev === "medium" ? "Check Now" : "Review"))
    : null;
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
        <button class="r-fix-btn ${sev}" onclick="void(0)">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          ${action}
        </button>` : ""}
      </div>
    </div>`;
 
  resultsList?.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add("show")));
}