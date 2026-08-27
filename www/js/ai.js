let searchActive = false;
let searchDebounceTimer = null;
let currentAiRequestId = 0;
let aiResponseTimer = null;


window.Capacitor.Plugins.AIPlugin.addListener('aiStatus', (data) => {
    if (data.status === 'thinking') {
        showAiThinking();
    }
});

AIPlugin.addListener('aiNativeLog', ({ message }) => {
    console.log(`[AI Native] ${message}`);
});

function searchNotes() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return; // Prevent crash if element is temporarily missing during DOM paint

    const query = searchInput.value.trim();

    if (!query) {
        if (searchActive) {
            searchActive = false;
            const sortEl = document.getElementById('sort');
            if (sortEl) sortEl.classList.remove('hidden');
            hideAiResponse();
        
              showToastError('AI features have been temporarily disabled due to instablity');

            if (typeof displayNotes === 'function') displayNotes();
            if (typeof displayLists === 'function') displayLists();
        }
        clearTimeout(searchDebounceTimer);
        return;
    }

    if (!searchActive) {
        searchActive = true;
        const sortEl = document.getElementById('sort');
        if (sortEl) sortEl.classList.add('hidden');
    }

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => runSearch(query), 1200);
}

// Global Fuse Instances (Cached to prevent initialization delays in the loop)
let fuseNotesInstance = null;
let fuseListsInstance = null;

function runSearch(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Strip punctuation that breaks matching and regex
    const cleanQuery = lowerQuery.replace(/[?!.,;:]/g, '').trim();
    if (!cleanQuery) return;

    if (typeof nlp !== 'function') {
        console.error("Compromised Environment: Natural language parser ('nlp') missing.");
        return;
    }

    // Verify Fuse library presence
    const FuseClass = window.Fuse;
    if (!FuseClass) {
        console.error("Fuse.js library missing from scope.");
        return;
    }

    const doc = nlp(cleanQuery);
    const isQuestion = /\b(when|what|where|why|how|who|which|can|could|would|should|do|does|did|is|are|was|were|will)\b/i.test(cleanQuery);

    const keywords = doc.out('array').filter(w => w.length > 2).join(' ');
    const searchTerm = keywords || cleanQuery;

const baseNotes = typeof notes !== 'undefined' ? notes : [];
const baseLists = typeof lists !== 'undefined' ? lists : [];

// --- LocalStorage Security Condition Pass ---
// Replace 'isAppUnlocked' with your exact local storage state key
const isUnlockedInStorage = localStorage.getItem('isAppUnlocked') === 'true';

let safeNotes = [];
let safeLists = [];

if (!isUnlockedInStorage) {
    safeNotes = baseNotes;
    safeLists = baseLists;
} else {
    safeNotes = baseNotes.filter(note => !note.password || note.password === "");
    safeLists = baseLists.filter(list => !list.password || list.password === "");
}

    // --- 1. INTRODUCE FUSE.JS PIPELINES ---
    // Fuzzy options optimized for small mobile memory grids
    const fuseNoteOptions = { keys: ['title', 'content'], threshold: 0.45, distance: 100 };
    const fuseListOptions = { keys: ['title', 'items'], threshold: 0.45, distance: 100 };

    fuseNotesInstance = new FuseClass(safeNotes, fuseNoteOptions);
    fuseListsInstance = new FuseClass(safeLists, fuseListOptions);

    // Run fuzzy mapping queries
    const noteResults = fuseNotesInstance.search(searchTerm);
    const listResults = fuseListsInstance.search(searchTerm);

    // Extract original matching dataset array shapes
    renderFilteredNotes(noteResults.map(r => r.item));
    renderFilteredLists(listResults.map(r => r.item));

    const total = noteResults.length + listResults.length;

    // --- 2. NO RESULTS INBOUND AI FALLBACK ---
    if (total === 0 && isQuestion) {
        if (!window.aiReady) return;

        const thisRequestId = ++currentAiRequestId;

        // FIXED: Replaced legacy layout selectors with clean Gemma 4 turns
const prompt = `<|im_start|>system
You are Notefull AI, the built-in assistant for the Notefull notes and lists app. Answer the user's question naturally and concisely. If you do not know the answer, say so.
<|im_end|>
<|im_start|>user
${cleanQuery}
<|im_end|>
<|im_start|>assistant
`;

        window.Capacitor.Plugins.AIPlugin.ask({ prompt })
            .then(result => {
                if (thisRequestId !== currentAiRequestId) return;
                if (result?.answer) showAiResponse(result.answer);
            })
            .catch(console.error);

        return;
    } else if (total === 0 && !isQuestion) {
        document.getElementById('noResultsMessage').classList.remove('hidden');
        return;
    } else {
        // FIXED: Swapped your broken "total ==! 0" parsing typo safely
        document.getElementById('noResultsMessage').classList.add('hidden');
    }

    // --- 3. CONTEXT MATCH MATRIX ---
    // Map Fuse output structures into standard score sorting maps
    const combined = [
        ...noteResults.map(r => ({ item: r.item, score: r.score || 0, type: "note" })),
        ...listResults.map(r => ({ item: r.item, score: r.score || 0, type: "list" }))
    ].sort((a, b) => a.score - b.score);

    const bestMatch = combined[0];
    const finalMatches = combined.slice(0, 5);
    const item = bestMatch.item;
    const title = item.title || "Untitled";
    const date = item.date ? formatDate(item.date) : null;

    // ---- PATH A: KEYWORD MODE ----
    if (!isQuestion) {
        return; 
    }

    // ---- PATH B: QUESTION MODE (Model-driven Pipeline) ----
    let contextText = "";

    finalMatches.forEach((match, i) => {
        const item = match.item;
        const n = i + 1;

        if (match.type === "note") {
            contextText += `Note ${n} (${item.title}): ${(item.content || "").trim()}\n\n`;
        }

        if (match.type === "list") {
            const listItemsStr = Array.isArray(item.items) ? item.items.map(it => it.name).join(", ") : "";
            contextText += `List ${n} (${item.title}): items are ${listItemsStr}\n\n`;
        }
    });

    contextText = contextText.trim().slice(0, 1000); 
     
    if (contextText.trim().length < 12) {
        let emptyMsg = `I found a matching ${bestMatch.type} called <strong>${title}</strong>`;
        if (date) emptyMsg += ` from ${date}`;
        emptyMsg += `, but it doesn't contain enough text to extract an answer.`;
        showAiResponse(emptyMsg);
        return;
    }

    const thisRequestId = ++currentAiRequestId;
    if (!window.aiReady) return;

    // --- 4. OPTIMIZED GEMMA 4 RAG INSTRUCT TEMPLATE ---
   const prompt = `<|im_start|>system
You are Notefull AI, the built-in assistant for the Notefull notes and lists app.

Strict Rules:
1. Base your answer strictly on the User Data provided between the [DATA] tags.
2. If the answer is completely missing from the notes and lists, state that you cannot find this information in a short, natural way. Do not invent details.
3. Keep answers factual, direct, and conversational.
4. Answer directly. Do not repeat the question back or output raw list contents — extract only what answers the question.
<|im_end|>
<|im_start|>user
[DATA]
${contextText}
[/DATA]

Question: ${query}
<|im_end|>
<|im_start|>assistant
`;
    window.Capacitor.Plugins.AIPlugin.ask({ prompt }).then(result => {
        if (thisRequestId !== currentAiRequestId) return;
        if (result?.answer) {
            showAiResponse(result.answer);
        } else {
            showAiResponse(`Found <strong>${title}</strong>.`);
        }
    }).catch(err => {
        console.error('[AI QA]', err);
        showAiResponse(`Found <strong>${title}</strong>.`);
    });
}


function renderFilteredNotes(filteredNotes) {
    const container = document.getElementById('src');
    container.innerHTML = '';
     filteredNotes.forEach(note => {
        const formattedDate = formatDate(new Date(note.date));
        const lockIndicator = note.password && note.password !== "" ? '<div class="lock-indicator"><i class="ti ti-lock"></i></div>' : "";
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="note" onclick="openNote('${note.id}')">
                <span class="note-date">${formattedDate}</span>
                <div class="note-header">
                    <h4>${note.title}</h4>
                    ${lockIndicator}
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function renderFilteredLists(filteredLists) {
    const container = document.getElementById('src');
   filteredLists.forEach(list => {
        const formattedDate = formatDate(new Date(list.date));
        const loclIndicator = list.password && list.password !== "" ? '<i class="ti ti-lock"></i>' : "";
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="list" onclick="openList('${list.id}')">
                <i class="ti ti-list"></i>
                <span class="note-date">${formattedDate}</span>
                <div class="note-header">
                    <h4>${list.title}</h4>
                    ${loclIndicator}
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function showAiThinking() {
    const wrap = document.getElementById('aiSearchResponse');
    const el = document.getElementById('aiResponseText');

    clearTimeout(aiResponseTimer); // kill any pending old timer

    wrap.classList.remove('hidden', 'done');
    el.className = 'shimmer';
    el.innerHTML = '';
    // No timeout here — stays shimmering until showAiResponse() is called
}

function showAiResponse(htmlText) {
    const wrap = document.getElementById('aiSearchResponse');
    const el = document.getElementById('aiResponseText');

    clearTimeout(aiResponseTimer);

    wrap.classList.remove('hidden');
    wrap.classList.add('done');
    el.className = '';
    animateWords(htmlText);
}

function hideAiResponse() {
    const wrap = document.getElementById('aiSearchResponse');
    wrap.classList.add('hidden');
    wrap.classList.remove('done');
    document.getElementById('aiResponseText').innerHTML = '';
}

function animateWords(html) {
    const el = document.getElementById('aiResponseText');
    el.innerHTML = '';

    // Split into tokens: HTML tags stay whole, everything else splits on spaces
    const tokens = html.match(/<[^>]+>|[^\s<]+|\s+/g) || [];

    let delay = 0;
    let buffer = '';

    tokens.forEach(tok => {
        if (/^\s+$/.test(tok)) {
            // whitespace - just append to buffer, don't animate
            buffer += tok;
            return;
        }
        if (tok.startsWith('<')) {
            // tag - attach to buffer, don't break the word here
            buffer += tok;
            return;
        }

        // real word/token - flush buffer + this word as one animated span
        const span = document.createElement('span');
        span.className = 'word';
        span.style.animationDelay = delay + 's';
        span.innerHTML = buffer + tok;
        el.appendChild(span);
        buffer = '';
        delay += 0.045;
    });

    if (buffer.trim()) {
        const span = document.createElement('span');
        span.className = 'word';
        span.style.animationDelay = delay + 's';
        span.innerHTML = buffer;
        el.appendChild(span);
    }
}



function showDownloaderModal() {
        document.getElementById('assetsDownloader').classList.remove('hidden');
    document.getElementById('assetsDownloader').classList.add('visible');
}

// 1. Added "async" keyword to allow the use of await
async function checkAiCompatibility() {
  let info;
  try {
    info = await window.Capacitor.Plugins.AIPlugin.getDeviceInfo();
  } catch (e) {
    console.error("Failed to get native device info:", e);
    info = { arch: "unknown", cores: 0, ramGB: 0, androidVersion: "0", sdkInt: 0 };
  }

  const cores = info.cores || 0;
  const ramGB = info.ramGB || 0;
  const androidVersion = parseInt(info.androidVersion, 10) || 0;
  const is64Bit = (info.arch || "").includes("64"); // arm64-v8a / x86_64
  const is32Bit = (info.arch || "").includes("32");
  const hasEnoughCores = cores >= 4;
  const hasEnoughRam = ramGB >= 6;
    const hasLessRam = ramGB >= 4;
  const hasSupportedAndroid = androidVersion >= 12;

  // Storage check (Safe execution) — keep as-is, no native equivalent yet
  let freeGB = 0;
  try {
    const storage = await navigator.storage?.estimate?.();
    if (storage && storage.quota !== undefined && storage.usage !== undefined) {
      freeGB = (storage.quota - storage.usage) / (1024 ** 3);
    }
  } catch (e) {
    console.warn("Storage estimation not supported or blocked:", e);
  }
const warn = hasEnoughCores && hasLessRam && hasSupportedAndroid && is32Bit;
  const hasEnoughStorage = freeGB >= 2.6

  const supported = hasEnoughCores && hasEnoughRam && hasSupportedAndroid && is64Bit;

  const card  = document.getElementById('ai-compat-card');
  const icon  = document.getElementById('ai-compat-icon');
  const title = document.getElementById('ai-compat-title');
  const desc  = document.getElementById('ai-compat-desc');
  const specs = document.getElementById('ai-compat-specs');
  const button = document.getElementById('ai-button');

  if (!card || !icon || !title || !desc || !specs) {
    console.error("Missing required AI compatibility DOM elements.");
    return supported;
  }

  if (supported) {
    card.classList.add('supported');
    card.classList.remove('unsupported');

    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.5" 
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    title.textContent = 'Your device supports AI features';
    desc.textContent  = 'Click Download button to download AI files';
    specs.textContent = `Detected: ${cores} CPU / ${ramGB}GB RAM / Android ${info.androidVersion} / ${info.arch} (Min: 4 CPU / 4GB RAM / Android 12 / 2.7GB free)`;
    if (button) button.classList.remove('hidden');

  } else if (warn) {
 card.classList.add('warn');
    card.classList.remove('unsupported');

    icon.innerHTML = `
     <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="white" stroke-width="2.5"/>
    <line x1="12" y1="10" x2="12" y2="17"
          stroke="white"
          stroke-width="2.5"
          stroke-linecap="round"/>
    <circle cx="12" cy="7" r="1.2" fill="white"/>
</svg>`;

    title.textContent = 'Your device is a low-end device but is supported';
    desc.textContent  = 'AI may be significantly slow on your device. You may even experience crashes or extreme UI lag.';
    specs.textContent = `Detected: ${cores} CPU / ${ramGB}GB RAM / Android ${info.androidVersion} / ${info.arch} (Min: 4 CPU / 4GB RAM / Android 12 / 2.7GB free)`;
    if (button) button.classList.remove('hidden');
  } else {
    card.classList.add('unsupported');
    card.classList.remove('supported');
    if (button) button.classList.add('hidden');

    icon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6l12 12M18 6L6 18" stroke="white" stroke-width="2.5" 
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

    title.textContent = 'Device not supported';
    desc.textContent  = "Your device doesn't meet the minimum requirements to run AI. You cannot use AI features. Blocked to prevent crashes.";
    specs.textContent = `${cores} cores · ${ramGB}GB RAM · Android ${info.androidVersion} · ${info.arch} detected · Minimum: 4 cores / 4GB RAM / 64-bit / Android 10`;
  }

  return supported;
}


// Run on page load
document.addEventListener('DOMContentLoaded', checkAiCompatibility);
