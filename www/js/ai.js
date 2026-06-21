let  searchActive = false;
let searchDebounceTimer = null;
let currentAiRequestId = 0; // Tracks rapid input changes to prevent old responses overwriting new ones
let globalAiWorker = null; 
let aiResponseTimer = null;

// 2. BIND TO THE INPUT: Use 'searchInput' and evaluate BEFORE calling 'new Worker'
document.getElementById('searchInput').addEventListener('click', () => {
    // Check the global variable first. If it holds a worker, do nothing and exit.
    if (globalAiWorker) return; 
    
    // If it's null, initialize the worker exactly once and save it globally
    globalAiWorker = initAi();
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
    searchDebounceTimer = setTimeout(() => runSearch(query), 800);
}

function runSearch(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    // Safety fallback: if user hits backspace rapidly and query becomes empty before debounce fires
    if (!lowerQuery) return; 

    if (typeof nlp !== 'function') {
        console.error("Compromised Environment: Natural language parser ('nlp') missing.");
        return;
    }

    const doc = nlp(lowerQuery);
    const isQuestion =
/\b(when|what|where|why|how|who|which|can|could|would|should|do|does|did|is|are|was|were|will)\b/i
.test(lowerQuery);


    const keywords = doc.out('array').filter(w => w.length > 2).join(' ');
    const searchTerm = keywords || lowerQuery;

    // Direct scope checks to prevent reference crashes on uninitialized databases
    const safeNotes = typeof notes !== 'undefined' ? notes : [];
    const safeLists = typeof lists !== 'undefined' ? lists : [];

    const noteResults = matchItems(safeNotes, searchTerm, ['title', 'content']);
    const listResults = matchItems(safeLists, searchTerm, ['title', 'items']);

    renderFilteredNotes(noteResults.map(r => r.item));
    renderFilteredLists(listResults.map(r => r.item));

    const total = noteResults.length + listResults.length;

if (total === 0) {
    showAiResponse(`I couldn't find anything related to "<strong>${searchTerm}</strong>".`);
return;
}


    const combined = [
        ...noteResults.map(r => ({ ...r, type: "note" })),
        ...listResults.map(r => ({ ...r, type: "list" }))
    ].sort((a, b) => a.score - b.score);

   const bestMatch = combined[0];
const topMatches =
combined.filter(m => m.score < 0.4);

const finalMatches =
topMatches.length
? topMatches.slice(0,3)
: [bestMatch];
const item = bestMatch.item;
const title = item.title || "Untitled";
const date = item.date ? formatDate(item.date) : null;
const confidence =
Math.round((1 - bestMatch.score) * 100);

    // ---- PATH A: KEYWORD MODE ----

    if (!isQuestion) {
        const noteCount = noteResults.length;
        const listCount = listResults.length;

        let response = `Found <strong>${total}</strong> matching items. Best match: <strong>${title}</strong> (${confidence}% match).`;
        if (noteCount) response += ` ${noteCount} note${noteCount !== 1 ? "s" : ""}`;
        if (listCount) response += ` ${listCount} list${listCount !== 1 ? "s" : ""}`;
        
        showAiResponse(response);
        return;
    }

    // ---- PATH B: QUESTION MODE (Model-driven Pipeline) ----

let contextText = "";

finalMatches.forEach(match => {
    const item = match.item;

    contextText += `
Title: ${item.title}
`;

    if (match.type === "note") {
        contextText += `
Content: ${item.content}
`;
    }

    if (match.type === "list") {
        contextText += `
Items:
${item.items.map(i => i.name).join(", ")}
`;
    }

    contextText += "\n\n";
});

    // Clean up extreme cases where notes or lists exist but contain absolutely zero text content
    if (contextText.trim().length < 15) {
        let emptyMsg = `I found a matching ${bestMatch.type} called <strong>${title}</strong>`;
        if (date) emptyMsg += ` from ${date}`;
        emptyMsg += `, but it doesn't contain enough text to extract an answer.`;
        showAiResponse(emptyMsg);
        return;
    }

    const thisRequestId = ++currentAiRequestId;
 
    

    if (!globalAiWorker) {
        showAiResponse(`AI system initialization pending. Best context match: <strong>${title}</strong>.`);
        return;
    }


    const handleWorkerAnswer = (event) => {
        const data = event.data;

        if (data.id === `ask_${thisRequestId}`) {
            globalAiWorker.removeEventListener('message', handleWorkerAnswer);
            if (thisRequestId !== currentAiRequestId) return;

            if (data.success && data.answer && data.answer.trim().length > 0 && data.score > 0.001) {
              
  const cleanFragment = data.answer.trim();

               const dynamicAnswer  = generateAnswer(query, cleanFragment);
                showAiResponse(dynamicAnswer);
            } else {
                let fallbackMsg = `I found an item called <strong>${title}</strong>`;
                if (date) fallbackMsg += ` from ${date}`;
                fallbackMsg += `, but I couldn't extract an explicit answer to your question within its contents.`;
                showAiResponse(fallbackMsg);
            }
        }
    };

    globalAiWorker.addEventListener('message', handleWorkerAnswer);
    console.log("Listener added");
console.log({
    query,
    contextText,
    bestMatch
});
    globalAiWorker.postMessage({
        id: `ask_${thisRequestId}`,
        type: 'askAI',
        question: query,
        context: contextText
    });
}

function generateAnswer(query, answer) {

    const doc = nlp(query);

    const preSubject = doc.match('#Noun').not('#Pronoun').out('array').join(' ').replace(/\bmy\b/gi, "your")
        .replace(/\bmine\b/gi, "yours")
        .replace(/\bi\b/gi, "you")
        .replace(/\bme\b/gi, "you")
        .replace(/\bour\b/gi, "your")
        .replace(/\bours\b/gi, "yours")
        .replace(/\bwe\b/gi, "you")
        .replace(/\bus\b/gi, "you")

        // cleanup spaces
        .replace(/\s+/g, " ")
        .trim();

        
        const subject = preSubject.charAt(0).toUpperCase() + preSubject.slice(1);


answer = answer
    .replace(/\bmy\b/gi, "your")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bi\b/gi, "you")
    .replace(/\bme\b/gi, "you")
    .replace(/\bour\b/gi, "your")
    .replace(/\bours\b/gi, "yours")
    .replace(/\bwe\b/gi, "you")
    .replace(/\bus\b/gi, "you");


    if(/\bwhere\b/i.test(query))
        return `You can find ${subject || 'it'} at ${answer}.`;

    if(/\bwhen\b/i.test(query))
        return `${subject || 'It'} is scheduled for ${answer}.`;

    if(/\bwho\b/i.test(query))
        return `${answer} is ${subject || 'this'}.`;

    if(/\bwhat\b/i.test(query))
        return `${answer}.`;

    return answer;
}


function matchItems(arr, query, fields) {
    const stopWords = [
 "what","when","where","why","how",
 "is","are","was","were",
 "can","could","would","should",
 "do","does","did",
 "a","an","the",
 "of","to","for","at",
 "i","me","my"
];
   const terms = query
.toLowerCase()
.split(/\s+/)
.filter(t => t.length > 2)
.filter(t => !stopWords.includes(t));
if (!terms.length) {
    return arr.map(item => ({
        item,
        score: 999
    }));
}

    const results = [];

    arr.forEach(item => {
        let text = '';

        fields.forEach(f => {
            if (f === 'items' && Array.isArray(item.items)) {
                text += ' ' + item.items.map(i => i.name || '').join(' ');
            } else if (typeof item[f] === 'string') {
                text += ' ' + item[f];
            }
        });

        text = text.toLowerCase();

  
     let matched = 0;

terms.forEach(t => {

    if(item.title?.toLowerCase().includes(t))
        matched += 3;

  const words = text.split(/\W+/);

if(words.includes(t))
    matched += 1;
});


        if (matched > 0) {
            // score mimics Fuse: 0 = perfect, 1 = worst
   const score = 1 / (matched + 1);
            results.push({ item, score });
        }
    });

    results.sort((a, b) => a.score - b.score);
    return results;
}

function renderFilteredNotes(filteredNotes) {
    const container = document.getElementById('notesContainer');
    const noMsg = document.getElementById('noNotesMessage');
    container.innerHTML = '';
    if (filteredNotes.length === 0) { noMsg.classList.remove('hidden'); return; }
    noMsg.classList.add('hidden');
    filteredNotes.forEach(note => {
        const formattedDate = formatDate(new Date(note.date));
        const lockIndicator = note.password && note.password !== "" ? '<div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "";
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
    const container = document.getElementById('listsContainerContent');
    const noMsg = document.getElementById('noListsMessage');
    container.innerHTML = '';
    if (filteredLists.length === 0) { noMsg.classList.remove('hidden'); return; }
    noMsg.classList.add('hidden');
    filteredLists.forEach(list => {
        const formattedDate = formatDate(new Date(list.date));
        const loclIndicator = list.password && list.password !== "" ? '<i class="fas fa-lock"></i>' : "";
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="list" onclick="openList('${list.id}')">
                <i class="fas fa-list"></i>
                <span class="note-date">${formattedDate}</span>
                <div class="note-header">
                    <h4>${list.title}</h4>
                    ${loclIndicator}
                </div>
            </div>`;
        container.appendChild(div);
    });
}

function showAiResponse(htmlText) {
    const wrap = document.getElementById('aiSearchResponse');
    const el = document.getElementById('aiResponseText');
    
    wrap.classList.remove('hidden', 'done');
    el.className = 'shimmer';
    el.innerHTML = '';

    clearTimeout(aiResponseTimer);

aiResponseTimer = setTimeout(() => {
    wrap.classList.add('done');
    el.className = '';
    animateWords(htmlText);
}, 1500);
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

function initAi() {
  const aiWorker = new Worker('./js/ai-worker.js', { type: 'module' });

  // Get references to our UI elements
  const statusText = document.getElementById('ai-status-text');
  const modal = document.getElementById('model-progress-modal');
  
  // Open the progress modal right away
  if (modal) modal.classList.remove("hidden");

  aiWorker.onmessage = (event) => {
    const { status, progress, error } = event.data;

    // Track real-time download and compilation progress
    if (status === 'progress' && progress) {
      if (progress.status === 'progress') {
        // FIX 1: Define 'percentage' by extracting it safely from the incoming progress object
        const percentage = Math.round(progress.progress || 0);
        
        if (statusText) {
          statusText.textContent = `Loading: ${percentage}%`;
        }
      }
      return;
    }

    // Handle completed initialization
    if (status === 'ready') {
      if (statusText) statusText.textContent = 'AI System Ready!';
      showToast('AI succesfully loaded. You may get slight performance issues')
      
      // FIX 2: Replaced the missing 'container' reference with your actual 'modal' variable
      setTimeout(() => {
        if (modal) modal.classList.add("hidden");
        }, 1500);
        setTimeout(() => {
showToastWarn('AI is a beta feature and may contain some bugs');
        }, 8000);
      return;
    }

    // Handle failures gracefully
    if (status === 'failed') {
      if (statusText) statusText.textContent = 'Failed to Load AI';
      console.error("[AI Error]:", error);
      return;
    }
  };

  // Trigger the worker warmup sequence
  const startTrigger = () => aiWorker.postMessage({ id: 'onload-warmup', type: 'warmup' });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTrigger);
  } else {
    startTrigger();
  }

  return aiWorker;
}
