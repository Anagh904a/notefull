const GEMINI_API_KEY = "AIzaSyC7v3VTvBq0w_5JqgFGNVO9kmWn0zCeOa4"; 

// Base URL for Gemini API (gemini-2.0-flash model)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;




// --- Utility function to make Gemini API calls ---
const aiCache = new Map();
let aiAbortController;

async function callGeminiAPI(prompt, featureName = "AI Feature") {
    // Prevent duplicate requests
    if (aiCache.has(prompt)) {
        showToast(`${featureName} loaded from cache`, 1000);
        return aiCache.get(prompt);
    }

    // Cancel previous request if still pending
    if (aiAbortController) aiAbortController.abort();
    aiAbortController = new AbortController();

    try {
        const payload = { prompt };

        showToast(`Applying ${featureName}...`, 0);

        // Call your Netlify backend function instead of Gemini directly
        const response = await fetch("/.netlify/functions/ask", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: aiAbortController.signal
        });

        const result = await response.json();
        showToast("", 1); // Hide loading

        if (response.ok && result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = result.candidates[0].content.parts[0].text;
            aiCache.set(prompt, text); // cache result
            showToast(`${featureName} successful!`, 2000);
            return text;
        } else {
            const errorDetail = result.error?.message || 'Unknown error or no content.';
            showToast(`Error with ${featureName}: ${errorDetail}`, 4000);
            console.error(`Gemini API Error for ${featureName}:`, result);
            return null;
        }
    } catch (error) {
        if (error.name === "AbortError") {
            console.log(`Previous ${featureName} request aborted.`);
        } else {
            showToastError("Daily Limit Reached!");
            console.error(`Fetch error for ${featureName}:`, error);
        }
        return null;
    }
}

async function fixNote() {
    const noteContent = document.getElementById("noteContent");
    const originalContent = noteContent.value;

    if (originalContent.trim() === "") {
        showToastWarn("There is no content to fix.");
        return;
    }

    const prompt = `Please fix the grammar and spelling of the following text and don't not share any explaination just in your answer the corrected text as you are being used as a summarizer feature:\n\n${originalContent}`;
    const fixedContent = await callGeminiAPI(prompt, "Note Fixer");

    if (fixedContent) {
        noteContent.value = fixedContent;
        showToast("Note content has been fixed!");
    } else {
        showToastError("Daily AI limit reached!");
    }
}

async function handleSummarizeButtonClick(buttonElement) {
    const noteContentTextarea = document.getElementById('noteContent');
    const noteTitle = buttonElement.getAttribute('data-note-title') || "Sample Note"; // Get title from data attribute
    const contentToSummarize = buttonElement.getAttribute('data-note-content'); 
            
    if (contentToSummarize) {
        showToast("Summarizing this note..."); // Show loading
        const summarizedText = await summarizeNoteWithAI(contentToSummarize); // Pass the note's content
        showToast("AI is doing it's job!", 1); // Hide loading
        
        if (summarizedText) {
            // Display summarized content in showToast
            alert(`Summary of "${noteTitle}": ${summarizedText}`, 10000); // Show for longer duration
        } else {
            showToastError("Daily AI limit Reached!");
        }
    } else {
        showToastError("No content found to summarize for this note.", 3000);
             const sound = document.getElementById("errorSound");
  sound.play();
    }
}

async function summarizeNoteWithAI(textToSummarize) {
    const prompt = `Summarize the following text concisely:\n\n${textToSummarize}`;
    return await callGeminiAPI(prompt, "Note Summary");
}

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text; // If no search term, return the text as is
    const regex = new RegExp(`(${searchTerm})`, 'gi'); // Case insensitive matching
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Function to display filtered notes and lists with highlights
function displayFilteredNotesAndLists(filteredNotes, filteredLists, isAISearching = false) {
    const container = document.getElementById("notesContainer");
    container.innerHTML = ""; // Clear existing content
    const listsContainer = document.getElementById("listsContainerContent");
    listsContainer.innerHTML = "";
    const noNotesMessage = document.getElementById("noNotesMessage");
    noNotesMessage.innerHTML = "No matching notes with that title were found.";
    const noListsMessage = document.getElementById("noListsMessage");
    noListsMessage.innerHTML = "No matching lists with that title were found.";

    if (filteredNotes.length === 0 && filteredLists.length === 0) {
        noNotesMessage.classList.remove("hidden");
    } else {
        noNotesMessage.classList.add("hidden");
    }

    if (filteredLists.length === 0) {
        noListsMessage.classList.remove("hidden"); // Show the no lists message
    } else {
        noListsMessage.classList.add("hidden");
    }

    // Display notes
    filteredNotes.forEach((note, index) => {
        const noteDiv = document.createElement("div");
        const noteDate = new Date(note.date); // Convert the stored date string back to a Date object
        const formattedDate = formatDate(noteDate); // Format the date for display
        const lockIndicator = note.password && note.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
       
        const noteAIbutton = !note.password || note.password === "" 
        ? `
        <button class="summarize-btn" 
                data-note-content="${note.content}" 
                data-note-title="${note.title}"
                onclick="handleSummarizeButtonClick(this); event.stopPropagation();">
                  
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";
        
        const noteAIbtn = note.password || note.password !== "" 
        ? `
        <button class="summarize-btn" 
        onclick="alert('Locked notes cannot be summarized due to security reasons'); event.stopPropagation();">
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";

        // Highlight title with search term
        const highlightedTitle = highlightSearchTerm(note.title, document.getElementById('searchInput').value.toLowerCase());

        noteDiv.innerHTML = `
        <div class="note" onclick="openNote(${index})">
            <div class="note-header">
                <h4>${highlightedTitle}</h4>
                ${lockIndicator}
            </div>
            <span class="note-date">${formattedDate}</span>
            ${noteAIbutton}
            ${noteAIbtn}
            <button class="delete-btn" onclick="deleteNote(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
        </div>
        `;
        container.appendChild(noteDiv);
    });

    // Display lists
    filteredLists.forEach((list, index) => {
        const listDiv = document.createElement("div");
        const listDate = new Date(list.date); // Convert the stored date string back to a Date object
        const formattedDate = formatDate(listDate); // Format the date for display
        const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
        // Highlight list name with search term
        const highlightedListName = highlightSearchTerm(list.title, document.getElementById('searchInput').value.toLowerCase());

        listDiv.innerHTML = `
     <div class="list" onclick="openList(${index})">    
  <i class="fas fa-list"></i>
  <div class="note-header">
     <h4>${highlightedListName}</h4>
    ${loclIndicator}
    </div>
  <span class="list-date">${formattedDate}</span>
   <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
        `;
        
        container.appendChild(listDiv);
    });
}

// Function to perform search and display highlighted notes and lists
let aiSearchTimeout;

function searchNotes() {
    clearTimeout(aiSearchTimeout); // cancel previous call if typing continues

    aiSearchTimeout = setTimeout(() => {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === "") return;

        // Filter notes and lists first
        const filteredNotes = notes.filter(note =>
            note?.title?.toLowerCase().includes(searchTerm)
        );
        const filteredLists = lists.filter(list =>
            list?.title?.toLowerCase().includes(searchTerm)
        );

        // Only call AI if nothing matches locally
        if (filteredNotes.length === 0 && filteredLists.length === 0) {
            document.getElementById('searchInput').classList.add('ai-searching');
            showToast("Searching with AI...");
            searchWithAI(searchTerm);
        } else {
            document.getElementById('searchInput').classList.remove('ai-searching');
        }

        // Update UI with local matches immediately
        displayFilteredNotesAndLists(filteredNotes, filteredLists);
    }, 1200); // wait 700ms after typing stops
    document.getElementById('clearSearch').style.display = "block";
}

function clearSearch() {
  const search = document.getElementById('searchInput');
search.value = "";
displayNotes();
displayLists();
document.getElementById('clearSearch').style.display = "none";
}

// Attach event listener
document.getElementById('searchInput').addEventListener('input', searchNotes);

async function searchWithAI(searchTerm) {
    console.log("AI search triggered for:", searchTerm);
    const searchInput = document.getElementById('searchInput');

    // Get the last 10 notes
    const notesToSearch = notes.slice(-10);

    // Create the prompt for the AI
    const prompt = `Based on the following notes, please answer the question: "${searchTerm}". 

Notes:
${notesToSearch.map(note => `Title: ${note.title}\nContent: ${note.content}`).join('\n\n')}`;

    // Call the Gemini API
    const aiResponse = await callGeminiAPI(prompt, "AI Search");

    // Stop the animation
    searchInput.classList.remove('ai-searching');

    if (aiResponse) {
        // Find the note that contains the answer
        const relevantNote = notesToSearch.find(note => aiResponse.includes(note.title));

        if (relevantNote) {
            // Display the AI response and the relevant note
          
            alert(`AI Answer:\n\n${aiResponse}`);
            const noteIndex = notes.findIndex(note => note.title === relevantNote.title);
            displayFilteredNotesAndLists([notes[noteIndex]], []);
        } else {
            // If the AI response doesn't mention a specific note, just show the answer
            alert(`AI Answer:\n\n${aiResponse}`);
            refresh();
        }
    } else {
        // If the AI fails, show the original "no results" message
        displayFilteredNotesAndLists([], []);
        console.log("AI search failed:", aiResponse);
    }

const filteredNotes = notes.filter(note =>
            note?.title?.toLowerCase().includes(searchTerm)
        );
        const filteredLists = lists.filter(list =>
            list?.title?.toLowerCase().includes(searchTerm)
        );

    if (filteredNotes.length === 0 && filteredLists.length === 0) {
        noNotesMessage.classList.remove("hidden");
    } else {
        noNotesMessage.classList.add("hidden");
    }

    const noListsMessage = document.getElementById("noListsMessage"); // Get

    if (filteredLists.length === 0) {
noListsMessage.classList.remove("hidden"); // Show the no lists message
  } else {
    noListsMessage.classList.add("hidden");
  }

    // Display notes
    
    filteredNotes.forEach((note, index) => {
        const noteDiv = document.createElement("div");
        const noteDate = new Date(note.date); // Convert the stored date string back to a Date object
        const formattedDate = formatDate(noteDate); // Format the date for display
        const lockIndicator = note.password && note.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
       
        const noteAIbutton = !note.password || note.password === "" 
        ? `
        <button class="summarize-btn" 
                data-note-content="${note.content}" 
                data-note-title="${note.title}"
                onclick="handleSummarizeButtonClick(this); event.stopPropagation();">
                  
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";
        
        const noteAIbtn = note.password || note.password !== "" 
        ? `
        <button class="summarize-btn" 
        onclick="alert('Locked notes cannot be summarized due to security reasons'); event.stopPropagation();">
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";

        // Highlight title with search term
        const highlightedTitle = highlightSearchTerm(note.title, document.getElementById('searchInput').value.toLowerCase());

        noteDiv.innerHTML = `
        <div class="note" onclick="openNote(${index})">
            <div class="note-header">
                <h4>${highlightedTitle}</h4>
                ${lockIndicator}
            </div>
            <span class="note-date">${formattedDate}</span>
            ${noteAIbutton}
            ${noteAIbtn}
            <button class="delete-btn" onclick="deleteNote(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
        </div>
        `;
        container.appendChild(noteDiv);
    });

    // Display lists
      
    filteredLists.forEach((list, index) => {
     
      const listDiv = document.createElement("div");
const listDate = new Date(list.date); // Convert the stored date string back to a Date object
    const formattedDate = formatDate(listDate); // Format the date for display
    const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
        // Highlight list name with search term
        const highlightedListName = highlightSearchTerm(list.title, document.getElementById('searchInput').value.toLowerCase());

        listDiv.innerHTML = `
     <div class="list" onclick="openList(${index})">    
  <i class="fas fa-list"></i>
  <div class="note-header">
     <h4>${highlightedListName}</h4>
    ${loclIndicator}
    </div>
  <span class="list-date">${formattedDate}</span>
   <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
        `;
        container.appendChild(listDiv);
    });

  }

  function onInputChanged() {
  clearTimeout(aiSearchTimeout); // cancel previous call if typing continues
  aiSearchTimeout = setTimeout(() => {
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm.trim() !== "") {
      searchWithAI(searchTerm);
    }
  }, 5000); // wait 700ms after typing stops
}


// Attach it to your input
document.getElementById('searchInput').addEventListener('input', onInputChanged);