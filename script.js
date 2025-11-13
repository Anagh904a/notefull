


//part 1 of total code
let notes = JSON.parse(localStorage.getItem("notes")) || []; // This will be our single source of truth
let editingNoteIndex = null;
let currentNoteId = null;
let currentDeleteNoteId = null;
let currentItems = []; // Will now store objects like { name: 'item name', checked: true/false }
let editingListIndex = null;
let currentListId = null;
let historyStack = [];
let currentIndex = -1;
let holdTimer = null;
let selectionMode = false;
let selectedNotes = [];
let notesDirectoryHandle = null;



let backupDirHandle = null;

// Prompt once and store basic ref

        document.addEventListener('DOMContentLoaded', () => {
            const fabContainer = document.querySelector('.fab-container');
            const mainFab = document.getElementById('mainFab');
            const optionButtons = document.querySelectorAll('.option-button');
           

           

            // 1. Toggle the FAB state
            mainFab.addEventListener('click', (e) => {
                e.stopPropagation(); 
                fabContainer.classList.toggle('open');
            });

            // 2. Handle option clicks
            
            
            // 3. Close FAB when clicking anywhere else
            document.addEventListener('click', (e) => {
                if (!fabContainer.contains(e.target) && fabContainer.classList.contains('open')) {
                    fabContainer.classList.remove('open');
                }
            });
        });

// Restore backup folder handle (user must re-select)








document.addEventListener("DOMContentLoaded", function () {
   updateAccountIcon();
    startAiScan();
    
});

const placeholders = [
  "Search any data...",
  "Ask Notefull AI...",
  "e.g When is my meeting?",
  "Search with Notefull AI...",
  "Quickly find your note...",
  "Find notes by keyword...",
  "What did I write last week?",
  "Locate that important file...",
  "Search through your ideas...",
  "Ask AI for suggestions...",
  "Check your upcoming tasks...",
  "Find meeting notes fast...",
  "Discover your saved thoughts...",
  "Quick search your notes...",
  "Ask Notefull anything...",
  "Where did I save that note?",
  "Search by topic or tag...",
  "Need a reminder? Ask AI...",
  "Look for ideas in your notes...",
  "Search your thoughts quickly...",
  "Find yesterday’s notes...",
  "What notes did I take today?",
  "Quickly find that important detail...",
  "Search for events, tasks, or ideas...",
  "Ask questions about your notes...",
  "Find related notes fast...",
  "Search by keyword or phrase...",
  "AI can help if note isn’t found...",
  "Instantly find any note..."
];

let index = 0; // start from first placeholder
const debouncedSearch = debounce(searchNotes, 1000);

document.getElementById('searchInput').addEventListener('input', debouncedSearch);

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const input = document.getElementById("searchInput");

// Function to update placeholder every second
setInterval(() => {
  input.placeholder = placeholders[index];
  index = (index + 1) % placeholders.length; // loop back to start
}, 5000); // change every 5000ms (5 second)

function saveState() {
  const noteContent = document.getElementById("noteContent").value;

  // If the current index is not the last element in the stack, remove any "future" states
  if (currentIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, currentIndex + 1);
  }

  // Add the current content to the history stack
  historyStack.push(noteContent);
  currentIndex++;

  toggleButtons();
}


// Function to handle undo
function undo() {
  if (currentIndex > 0) {
    currentIndex--;
    const previousState = historyStack[currentIndex];
    // Restore the previous state
    document.getElementById("noteContent").value = previousState;
  }
  toggleButtons();
}

// Function to handle redo
function redo() {
  if (currentIndex < historyStack.length - 1) {
    currentIndex++;
    const nextState = historyStack[currentIndex];
    // Restore the next state
    document.getElementById("noteContent").value = nextState;
  }
  toggleButtons();
}

    function switchTab(tab) {
      const notePanel = document.getElementById('addNoteSection');
      const listPanel = document.getElementById('addListSection');
      const noteTab = document.getElementById('note-tab');
      const checklistTab = document.getElementById('checklist-tab');

      if (tab === 'note') {
        notePanel.style.display = 'block';
        listPanel.style.display = 'none';
        noteTab.classList.add('data-active');
        checklistTab.classList.remove('data-active');
      } else {
        notePanel.style.display = 'none';
        listPanel.style.display = 'block';
        noteTab.classList.remove('data-active');
        checklistTab.classList.add('data-active');
      }
    }

    switchTab('note'); // Default to note tab on load

document.getElementById('noteContent').addEventListener('keyup', function (e) {
if (e.key === " " || e.key === "Enter") {
const textarea = e.target;
const text = textarea.value;

// Use regex to find formula-like patterns: e.g., =5+4, =SUM(1,2)
const formulaPattern = /=(SUM|AVG)?\(?[0-9+*/,\s.-]+\)?/gi;
const matches = text.match(formulaPattern);

if (matches) {
matches.forEach(match => {
  const result = evaluateInlineFormula(match.trim());
  if (result !== null) {
    textarea.value = textarea.value.replace(match, result);
  }
});
}
}
});

function evaluateInlineFormula(formula) {
try {
if (formula.startsWith('=SUM(')) {
const nums = formula.slice(5, -1).split(',').map(Number);
return nums.reduce((a, b) => a + b, 0);
} else if (formula.startsWith('=AVG(')) {
const nums = formula.slice(5, -1).split(',').map(Number);
return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
} else if (formula.startsWith('=')) {
return eval(formula.slice(1)); // simple math
}
} catch (e) {
return null;
}
return null;
}


function applySortFilter() {
  const sortValue = document.getElementById("sortSelect").value;

  const notesContainer = document.getElementById("notesContainer");
  const listsContainerContent = document.getElementById("listsContainerContent");
  
  if (sortValue === "note") {
    // Clear lists
    listsContainerContent.innerHTML = "";
    displayNotes(); // Render only notes
    showSection("combinedContainer");
    console.log("Displaying only notes");
  } else if (sortValue === "lists") {
    // Clear notes
    if (notesContainer) notesContainer.innerHTML = "";
    displayLists(); // Render only lists
    showSection("combinedContainer");
    console.log("Displaying only lists");
  } else if (sortValue === "all") {
   displayNotes();
   displayLists();
    showSection("combinedContainer");
    console.log("Displaying all notes and lists");
  } else if (sortValue === "date_newest" || sortValue === "date_oldest") {
    alert("Sorting by date is disabled in this mode.");
  }
}

// Add click effect that creates ripples
       document.querySelector('.main-fab-style').addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        }); 

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
    alert("All data cleared successfully! All Settings are also cleared! Next time you would need to complete setup for the app again!");
    
  }
  displayNotes();
    displayLists();
}

function toggleTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeToggle').checked = theme === 'light';
  document.getElementById('themeLabel').textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
}





// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  toggleTheme(savedTheme);

  document.getElementById('themeToggle').addEventListener('change', function () {
    toggleTheme(this.checked ? 'dark' : 'light');
  });
});





// Function to toggle button states (enable/disable)
function toggleButtons() {
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton");

    // Enable/Disable Undo button
    undoButton.disabled = currentIndex <= 0;
   

    // Enable/Disable Redo button
    redoButton.disabled = currentIndex >= historyStack.length - 1;
    

  
}


// Event listener to automatically save the content whenever the user types
document
  .getElementById("noteContent")
  .addEventListener("input", saveState);
  
// Initial call to enable/disable buttons on page load
toggleButtons();


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

function startAiScan() {
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
  threatsCountElem.textContent = "0";
  scanCircle.style.animation = "spin 1s linear infinite";
  scanCircle.style.border = "";
  scanCircle.style.borderTopColor = "rgb(0, 0, 0)";
  notesCountElem.textContent = "0";
  const startBtn = document.getElementById("startScanButton");
  startBtn.textContent = "Scanning...";
  startBtn.classList.add("scanning");
  startBtn.disabled = true;

  const notes = JSON.parse(localStorage.getItem("notes")) || [];
let sensitiveKeywords = JSON.parse(localStorage.getItem("sensitiveKeywords") || "null");

if (!Array.isArray(sensitiveKeywords) || sensitiveKeywords.length === 0) {
  // Fallback to built-in list
  sensitiveKeywords = [
    "password", "ssn", "credit card", "bank account", "secret", "pin", "bank",
    "policy", "account", "pass", "id", "aadhaar", "card", "security", "key",
    "token", "license", "confidential", "credentials", "auth", "login"
  ];
}

  let foundSensitiveData = [];
  let scannedTitles = new Set(); // prevent duplicate messages for same note
  let threatsCount = 0;
  let index = 0;
  const startTime = Date.now();

  const scanInterval = setInterval(() => {
    if (index >= notes.length) {
      clearInterval(scanInterval);
      infoBox.style.display = "none";
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      startBtn.textContent = "Start Quick Scan";
      startBtn.classList.remove("scanning");
      startBtn.disabled = false;

      notesCountElem.textContent = `${notes.length}`;
      showAiToast();

      if (threatsCount === 0) {
        scanCircle.style.borderColor = "#4CAF50";
        scanStatus.textContent = `Scan complete in ${duration}s — No threats found!`;
        resultsContainer.innerHTML = "<div class='success-msg'>✅ All notes are safe!</div>";
      } else {
        scanCircle.style.borderColor = threatsCount === 1 ? "orange" : "red";
        scanStatus.textContent = `Scan complete in ${duration}s`;
        
        // Add Protect Now button
        resultsContainer.innerHTML = foundSensitiveData.join("<br>") +
          `<button class="protect-btn" onclick="redirectProtect()">Protect Now</button>`;
      }

      // Auto-scroll to results
      resultsContainer.scrollIntoView({ behavior: "smooth" });
      scanCircle.style.animation = "none";
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
        // Determine severity
        let severity = /password|credit card|ssn|bank account/.test(matchedKeyword) ? "High" : "Medium";

        foundSensitiveData.push(
          `<div class="alert-msg">Sensitive data found in: 
             <strong style="color:red;">${title}</strong>
             <span class="severity ${severity.toLowerCase()}">${severity}</span>
           </div>`
        );
        scannedTitles.add(title);
        threatsCount++;
        showToast("Threats Found!");
    const sound = document.getElementById("alertSound");
  sound.play();
        threatsCountElem.textContent = threatsCount;
      }
    }

    index++;
  }, 100); // Scan delay (ms)
}

// Redirect to home & alert
function redirectProtect() {
  alert("Please add a password to sensitive notes yourself — automatic protection is not available.");
  
}



function showAiToast() {
    const toast = document.getElementById('aiToast');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000); // show for 4 seconds
  }



function showNotePassword() {
  document.getElementById("notePasswordModal").style.display = "flex";
}



function showList() {
  document.getElementById("listPasswordModalr").style.display = "flex";
}

function closeListPassword() {
  document.getElementById("listPasswordModalr").style.display = "none";
dummySaveList();
}




// Call startScan when needed, e.g., on button click






function closeListPasswordModal() {
  document.getElementById("listPasswordModal").style.display = "none";
}

function closeDeleteListPasswordModal() {
  document.getElementById("deleteListPasswordModal").style.display =
    "none";
    closeListPasswordModal();
}







function formatDate(date) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
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
    noNotesMessage.innerHTML = isAISearching ? "Searching with AI..." : "No matching notes with that title were found.";
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
// Function to perform search and display highlighted notes and lists
/*function searchNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    // Filter notes safely
    const filteredNotes = notes.filter(note =>
        note?.title?.toLowerCase().includes(searchTerm)
    );

    // Filter lists safely
    const filteredLists = lists.filter(list =>
        list?.title?.toLowerCase().includes(searchTerm)
    );

    // Display both with highlights
    displayFilteredNotesAndLists(filteredNotes, filteredLists);
}*/




// Function to display filtered notes and lists
window.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    
    const button = document.getElementById('closeModal');


 


    button.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  });

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("show");
}

document.addEventListener('click', function(event) {
   const sidebar = document.getElementById("sidebar");
  if (!sidebar.contains(event.target)) {
  sidebar.classList.add("hidden");
  }
});

function refresh() {
  displayNotes();
  displayLists();
  showToast("Refreshed!");
  closeSidebar();

}


// Function to verify the password for accessing the list
function verifyListPassword() {
  const password = document.getElementById("listPasswordInput").value;
  const listIndex =
    document.getElementById("listPasswordModal").dataset.listIndex; // Assuming you set this when opening the modal
  const list = lists[listIndex]; // Get the list being accessed

  if (password === list.password) {
    document.getElementById("listPasswordModal").style.display = "none"; // Close the modal
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    editingListIndex = listIndex; // Update the editing list index
    showAddListSection(); // Implement this function to display the list content
    document.getElementById("listPassword").value = list.password;
  } else {
    showToast("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}




// Function to show the delete password modal

// Function to close the delete list password mod

// Function to verify the password for deleting the list
// Function to verify the password for deleting the list
function deleteListVerifyPassword() {
  const passwordInput = document.getElementById(
    "deleteListPasswordInput"
  ).value;
  const index = document.getElementById("deleteListPasswordModal").dataset
    .listIndex; // Get the index of the list being deleted

  console.log("List Index:", index); // Debugging line

  const list = lists[index]; // Get the list being deleted

  if (!list) {
    console.error("List not found at index:", index); // Log an error if the list is undefined
    return; // Exit the function if the list is not found
  }

  if (passwordInput === list.password) {
    // If the password is correct, delete the list
    lists.splice(index, 1);
    localStorage.setItem("lists", JSON.stringify(lists));
    document.getElementById("deleteListPasswordModal").style.display =
      "none";
    document.getElementById("listPasswordModal").style.display = "none";
    displayLists();
  } else {
    showToast("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}

// Function to toggle the password input field
function togglePasswordInput() {
  const passwordInput = document.getElementById("notePassword");
  passwordInput.classList.toggle("hidden");


}


function showSection(sectionId) {
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });
  document.getElementById(sectionId).classList.remove("hidden"); // Show the selected section

  // Manage history stack
  if (historyStack[historyStack.length - 1] !== sectionId) {
    historyStack.push(sectionId);
  }

  currentSection = sectionId; // Update current section
}

function showAddItem() {
  addItemSection.classList.remove("hidden"); // make visible
  setTimeout(() => {
    addItemSection.classList.add("show");   // trigger pop animation
  }, 10);
}

function navigateTo(sectionId) {
 document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });
  document.getElementById(sectionId).classList.remove("hidden"); // Show the selected section

  // Manage history stack

  currentSection = sectionId; // Update current section
 closeSidebar(); // Close sidebar if open
}

// Event listener for the Android back button functionality
window.addEventListener("popstate", function (event) {
  if (historyStack.length > 1) {
    historyStack.pop(); // Remove the current section
    const previousSection = historyStack.pop(); // Get the previous section
    showSection(previousSection); // Show the previous section
    historyStack.push(previousSection); // Push it back to maintain history
  }
});

window.onload = function () {
  startAiScan();
};


let isMessageBoxVisible = false; // Flag to track visibility
(function() {
  const toast = document.getElementById('globalToast');
  let hideTimeout;

  window.showToast = function(message, duration = 2500) {
    if (!toast) return;

    // Clear any existing hide timeout to reset duration
    clearTimeout(hideTimeout);

    toast.textContent = message;
    toast.classList.add('show');

    hideTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
})();


function showAddNote() {
  showAddItem() // Show the add item section
  document.getElementById("noteContent").value = ""; // Clear the note content
  document.getElementById("notePassword").value = ""; // Clear the password input
  switchTab('note'); // Switch to the note tab
  const listButton = document.getElementById('summarize-btn'); 

// 2. Disable the button
listButton.disabled = false;

  if (editingNoteIndex !== null) {
    // Editing an existing note
    const note = notes[editingNoteIndex]; // Get the note being edited
    document.getElementById("noteTitle").value = note.title; // Set the input value to the note title
    document.getElementById("noteContent").value = note.content; // Set the input value to the note content
   
  } else {
    // Creating a new note
    document.getElementById("noteTitle").value = ""; // Clear the title input
     document.getElementById("noteContent").value = "";
  }
  
    const itemText = document.getElementById("itemText");

  itemText.querySelector("h2").textContent = "Create a new item";
  
}

const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

sidebarToggle.addEventListener("click", () => {
  const isVisible = !sidebar.classList.contains("hide-anim");

  if (isVisible) {
    sidebar.classList.remove("show-anim");
    sidebar.classList.add("hide-anim");
    sidebarToggle.setAttribute("aria-expanded", "false");
  } else {
    sidebar.style.display = "flex";
    sidebar.classList.remove("hide-anim");
    void sidebar.offsetWidth; // Trigger reflow
    sidebar.classList.add("show-anim");
    sidebarToggle.setAttribute("aria-expanded", "true");
  }
});

// Close sidebar function for the close button
function closeSidebar() {
  sidebar.classList.remove("show-anim");
  sidebar.classList.add("hide-anim");
  sidebarToggle.setAttribute("aria-expanded", "false");
  setTimeout(() => {
    sidebar.style.display = "none";
  }, 300);
}

// Function to cancel note and reset visibility
function cancelNote() {
hideAddItem();
  showSection("combinedContainer");
  document.getElementById("notePasswordModal").classList.add("hidden");
}

// Add event listener for the Add Note button
document
  .getElementById("addNoteButton")
  .addEventListener("click", function () {
    editingNoteIndex = null; // Reset the editing index for a new note
    showAddNote(); // Show the add note section
  });

function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value.trim();
  const password = document.getElementById('notePassword').value.trim();
  const date = new Date();
  const formattedDate = formatDate(date);

  if (content === "") {
    showToast("Type some text!");
    return;
  }

  if (title === "") {
   showToast("Enter a title!")
    return;
  }

  // ✅ Create the note object here so it's always defined
  const note = {
    title,
    content,
    password,
    pinned: false,
    date: formattedDate
  };

  if (editingNoteIndex !== null) {
    // Update existing note
    notes[editingNoteIndex] = note;
    showToast("Saved");
  } else {
    // Add new note
    notes.push(note);
    showToast("Saved");
  }

  // Save to localStorage
  localStorage.setItem('notes', JSON.stringify(notes));

  // Sync to IndexedDB
  syncNoteToIndexedDB(note);

  // Update UI
  displayNotes();
  showSection('combinedContainer');
  document.getElementById("notePasswordModal").classList.add("hidden");
    const sound = document.getElementById("alertSound");
  sound.play();
  // Reset editing state
  editingNoteIndex = null;
}

function syncNoteToIndexedDB(note) {
  

  if (!db) {
    console.log("No DB");
    return;
  }
  const syncState = localStorage.getItem("syncEnabled");
  if (syncState !== "true") {
    console.log("Sync disabled");
    return;
  }

  if (!note.noteId) {
    note.noteId = `${note.title}-${Date.now()}`;
  }

  if (notes.length === 0) {
    
    console.log("No notes to sync.");
    return;
   
  }

  const tx = db.transaction("notes", "readwrite");
  tx.objectStore("notes").put(note);
  localStorage.setItem("lastSynced", new Date().toISOString());
updateLastSyncedDisplay();
}

/**
 * This is the auto-save function. It should ONLY update an existing note
 * or a new note being drafted. It should not add multiple new notes.
 */

function closeNotePassword() {

  document.getElementById("notePasswordModal").style.display = "none";

 
}

function showInfo(message) {
    const infoBox = document.getElementById('infoContainer2');
    document.getElementById('infoText').textContent = message;
    infoBox.style.display = 'flex';
  }


document.addEventListener("DOMContentLoaded", function () {
    const tabButtons = document.querySelectorAll("#settingsTabs button");

    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Remove 'active' from all buttons
        tabButtons.forEach((btn) => btn.classList.remove("active"));

        // Add 'active' to the clicked button
        this.classList.add("active");

        // OPTIONAL: Call showSection or handle tab content switching here
        // Example: showSection(this.dataset.target);
      });
    });
  });

  async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function setMasterPassword(password) {
  const hashed = await hashPassword(password);
  localStorage.setItem("masterPasswordHash", hashed);
  alert("This Feature Is under Development and don't work properly yet");
  showToast("Master password set unsuccessfully!"); // Show success message
}

function displayNotes() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  const noNotesMessage = document.getElementById("noNotesMessage"); // Get the no notes message element
  document.getElementById("noNotesMessage").innerHTML = "This space is lonely. Add a note!";
  if (notes.length === 0) {
    noNotesMessage.classList.remove("hidden"); // Show the no notes message
  } else {
    noNotesMessage.classList.add("hidden");
  } // Hide the no notes message


  notes.forEach((note, index) => {
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
    noteDiv.innerHTML = `
   
 <div class="note" onclick="openNote(${index})">
  <div class="note-header">
    <h4>${note.title}</h4>
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
}

function openNote(index) {
  const note = notes[index];
  if (note.password) {
      document.getElementById('passwordModal').style.display = 'flex';
      document.getElementById('passwordInput').value = "";
      document.getElementById('passwordModal').dataset.noteIndex = index;
  } else {
      showNoteContent(note);
  }
  const itemText = document.getElementById("itemText");

  // Change the heading and paragraph
  itemText.querySelector("h2").textContent = "Manage your item";


}

function formatSyncTime(date) {
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return "Just now";
  }

  const options = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };

  const isToday = now.toDateString() === date.toDateString();
  return isToday 
    ? `Today at ${date.toLocaleTimeString([], options)}`
    : date.toLocaleString([], options);
}



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
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        showToast(`Applying ${featureName}...`, 0);

        const response = await fetch(GEMINI_API_URL, {
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
            showToast(`Network error for ${featureName}: ${error.message}`, 4000);
            console.error(`Fetch error for ${featureName}:`, error);
        }
        return null;
    }
}

// --- Specific AI Feature Functions ---

async function summarizeNoteWithAI(textToSummarize) {
    const prompt = `Summarize the following text concisely:\n\n${textToSummarize}`;
    return await callGeminiAPI(prompt, "Note Summary");
}



// --- Event Listeners for AI Feature Toggles ---
function handleBack() {
   closeAddItem();
}

document.addEventListener('keydown', function(event) {
    // Check if the pressed key is the 'Escape' key
    if (event.key === 'Escape') {
        
        // Prevent default browser actions (like stopping media playback)
        event.preventDefault(); 
        
        // 1. Call your primary Escape function here
        closeAddItem();
    }
});


function closeAddItem() {
  hideAddItem();
  showSection("combinedContainer");
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
            showToast("Failed to summarize note.", 3000);
        }
    } else {
        showToast("No content found to summarize for this note.", 3000);
             const sound = document.getElementById("errorSound");
  sound.play();
    }
}



document.addEventListener("DOMContentLoaded", function () {
  // Hide all sections initially
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });

  // Show only the notes section on page load
  showSection("combinedContainer"); // Show the notes section

  // Load notes and lists from local storage
  displayNotes();
  displayLists();
  
});

function verifyPassword() {
  const password = document.getElementById("passwordInput").value;
  const index =
    document.getElementById("passwordModal").dataset.noteIndex;
  const note = notes[index];

  if (password === note.password) {
    document.getElementById("passwordModal").style.display = "none";
    showNoteContent(note);
  } else {
    showToast("Incorrect password!");
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}

function deleteVerifyPassword() {
  const passwordInput = document.getElementById(
    "deletePasswordInput"
  ).value;
  const index = document.getElementById("deletePasswordModal").dataset
    .noteIndex; // Get the index of the note being deleted
  const note = notes[index]; // Get the note being deleted

  if (passwordInput === note.password) {
    // If the password is correct, delete the note
    notes.splice(index, 1);
    localStorage.setItem("notes", JSON.stringify(notes)); // Update local storage
    displayNotes(); // Refresh the displayed notes
    closeDeletePasswordModal(); // Close the modal
  } else {
    showToast("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}

function showNoteContent(note) {
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").value = note.content;
  document.getElementById("notePassword").value = note.password;
  
  showAddItem() // Show the add item section
  // Set the index of the note being edited
  editingNoteIndex = notes.findIndex(
    (n) => n.title === note.title && n.content === note.content
  );

  switchTab('note');
const listButton = document.getElementById('checklist-tab'); 

// 2. Disable the button
listButton.disabled = true;
}

// Modify the deleteNote function to include password verification

function deleteNote(index) {
  const note = notes[index];
  if (note.password) {

      document.getElementById('deletePasswordModal').style.display = 'flex';
      document.getElementById('passwordModal').style.display = 'hidden';
      document.getElementById('deletePasswordInput').value = "";
      document.getElementById('deletePasswordModal').dataset.noteIndex = index;
  } else {
      if (confirm("Are you sure you want to delete this note?")) {
          notes.splice(index, 1);
          localStorage.setItem('notes', JSON.stringify(notes));
          displayNotes();
      }
  }
  syncNoteToIndexedDB(note);
  displayNotes();
}


function closeDeletePasswordModal() {
  document.getElementById("deletePasswordModal").style.display = "none"; // Hide the modal
  document.getElementById("deletePasswordInput").value = ""; // Clear the input
  document.getElementById('passwordModal').style.display = 'none';
}

function closeAddListSection() {
hideAddItem();
    section.classList.remove("show"); // Hide the add list section
  showSection("combinedContainer"); // Show the lists section
}


// Function to open a list and pre-fill the add list section

// Function to show the add list section
// Function to show the add list section
function showAddListSection() {
  // Hide all sections first

  document.querySelectorAll(".container").forEach((section) => {
    
  });

  // Show the add list section
showAddItem();
   
document.getElementById("addListSection").style.display = "block"; // Show the add list section
document.getElementById("addNoteSection").style.display = "none"; // Show the add list section
switchTab('checklist');
const noteButton = document.getElementById('summarize-btn'); 

// 2. Disable the button
noteButton.disabled = true; // Switch to the add list tab
  if (editingListIndex !== null) {
    const list = lists[editingListIndex]; // Get the list being edited
    document.getElementById("listTitle").value = list.title; // Set the input value to the list title
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    
  } else {
    // Reset for new list
    document.getElementById("listTitle").value = ""; // Clear the title input
   
    currentItems = []; // Reset current items
    displayChecklist(); // Clear the checklist display
  }

 
    const itemText = document.getElementById("itemText");

  itemText.querySelector("h2").textContent = "Create a new item";
 
}

// Function to cancel adding a list
function cancelList() {
  // Hide the add list section and show the lists section
  currentListId = null; // Also clear the draft list ID on cancel
hideAddItem();
    
  showSection("combinedContainer"); // Show the lists section
  displayNotes();
  displayLists();
  document.getElementById("listPasswordModalr").classList.add("hidden");

}

function hideAddItem() {
  addItemSection.classList.remove("show");  // start hide animation
  setTimeout(() => {
    addItemSection.classList.add("hidden"); // hide completely
  }, 500); // match transition duration
}

// Function to show a specific section

// Function to save a new list
function saveList() {
const title = document.getElementById("listTitle").value.trim();
const password = document.getElementById("listPassword").value.trim();
const date = new Date();
const formattedDate = formatDate(date);

if (title === "" || currentItems.length === 0) {
showToast("Enter Data!");
     const sound = document.getElementById("errorSound");
  sound.play();
return;
}

const listData = {
title,
items: JSON.parse(JSON.stringify(currentItems)), // Deep copy
password,
date: formattedDate,
};

if (editingListIndex !== null) {
lists[editingListIndex] = listData;
    showToast("Saved");
    const sound = document.getElementById("alertSound");
  sound.play();
} else if (currentListId) {
    // This is a new list that was being auto-saved. Find and finalize it.
    const draftListIndex = lists.findIndex(l => l.listId === currentListId);
    if (draftListIndex !== -1) {
      lists[draftListIndex] = listData; // Overwrite the draft
    } else {
      lists.push(listData); // Fallback
    }
    showToast("Saved");
    const sound = document.getElementById("alertSound");
  sound.play();
} else {
lists.push(listData);
    showToast("Saved");
    const sound = document.getElementById("alertSound");
  sound.play();
}

localStorage.setItem("lists", JSON.stringify(lists));
displayLists();
showSection("combinedContainer");
editingListIndex = null;
currentListId = null; // Clear the temporary ID
document.getElementById("listPasswordModalr").classList.add("hidden");
syncListToIndexedDB(listData);
cancelNote();
}

function dummySaveList() {
const title = document.getElementById("listTitle").value.trim();
const password = document.getElementById("listPassword").value.trim();
const date = new Date();
const formattedDate = formatDate(date);

  
if (editingListIndex !== null) {
    lists[editingListIndex].title = title;
    lists[editingListIndex].items = JSON.parse(JSON.stringify(currentItems));
    lists[editingListIndex].password = password;
} else {
    // This is a NEW list. We need to handle it carefully to avoid duplicates.
    if (!currentListId) {
      // This is the VERY FIRST input for a new list. Create it and assign a temp ID.
      currentListId = `draft-list-${Date.now()}`;
      const newList = {
        listId: currentListId, // Use a temporary ID
        title,
        items: JSON.parse(JSON.stringify(currentItems)),
        password,
        date: formattedDate,
      };
      lists.push(newList);
    } else {
      // This is a subsequent input for the same new list. Find and update it.
      const draftList = lists.find(l => l.listId === currentListId);
      if (draftList) {
        draftList.title = title;
        draftList.items = JSON.parse(JSON.stringify(currentItems));
      }
    }
}

localStorage.setItem("lists", JSON.stringify(lists));
}

function syncListToIndexedDB(listData) {
  console.log("Trying to sync list to IndexedDB...");

  if (!db) return;
  const syncState = localStorage.getItem("syncEnabled");
  if (syncState !== "true") return;

  if (!listData.listId) {
    listData.listId = `${listData.title}-${Date.now()}`;
  }

  const tx = db.transaction("lists", "readwrite");
  tx.objectStore("lists").put(listData);
  localStorage.setItem("lastSynced", new Date().toISOString());
updateLastSyncedDisplay();
}

function updateLastSyncedDisplay() {
  const div = document.getElementById("lastSyncedStatus");
  const lastSynced = localStorage.getItem("lastSynced");

  if (!div) return;

  if (!lastSynced) {
    div.innerText = `<i class="fas fa-clock"></i> Last Synced: Never`;
    return;
  }

  const syncedDate = new Date(lastSynced);
  div.innerHTML = `<i class="fas fa-clock"></i> Last Synced: ${formatSyncTime(syncedDate)}`;

}

// Function to open a list and pre-fill the add list section
function openList(index) {
  const list = lists[index];


  // Check if the list has a password
  if (list.password) {
    // Store the index of the list being accessed in the modal
    document.getElementById("listPasswordModal").dataset.listIndex =
      index;
    document.getElementById("listPasswordModal").style.display = "flex";
    document.getElementById("listPasswordInput").value = "";
  } else {
    // If no password is required, proceed to open the list
    document.getElementById("listTitle").value = list.title;
    currentItems = list.items.slice(); // Copy items to currentItems
    displayChecklist(); // Display the checklist with items
    editingListIndex = index;
    showAddListSection(); // Show the add list section
    document.getElementById("listPassword").value = list.password;
  }
  const itemText = document.getElementById("itemText");
  switchTab('checklist');
 const noteButton = document.getElementById('note-tab'); 

// 2. Disable the button
noteButton.disabled = true;

  // Change the heading and paragraph
  itemText.querySelector("h2").textContent = "Manage your item";
 
}


document
  .getElementById("addListButton")
  .addEventListener("click", function () {
    editingListIndex = null; // Reset the editing index for a new list
    showAddListSection(); // Show the add list section for a new list
  });

const lists = JSON.parse(localStorage.getItem("lists")) || [];


// Function to show the lists section
function showListsSection() {
  showSection("combinedContainer");
  displayLists(); // Refresh the displayed lists
}

// Function to add an item to the checklist
function addItem() {
const newItemInput = document.getElementById("newItem");
const newItemValue = newItemInput.value.trim();

if (newItemValue === "") {
showToast("Item cannot be empty");
     const sound = document.getElementById("errorSound");
  sound.play();
return;
}

currentItems.push({ name: newItemValue, checked: false });
newItemInput.value = "";
displayChecklist();
dummySaveList();
}
// Event listener for adding item with Enter key


  



// Event listener for submitting password with Enter key


// Function to close the password modal
function closePasswordModal() {
  document.getElementById("passwordModal").style.display = "none";
  document.getElementById("passwordInput").value = ""; // Clear the password input field
}

function openTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.add("hidden"));
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active-tab"));
  document.getElementById(tabId).classList.remove("hidden");

  // Activate the clicked tab button
  const tabButtons = document.querySelectorAll("#settingsTabs button");
  tabButtons.forEach(btn => {
    if (btn.getAttribute("onclick").includes(tabId)) {
      btn.classList.add("active-tab");
    }
  });
}

function restoreFromIndexedDB() {
  const overlay = document.getElementById("restoreOverlay");
  overlay.style.display = "flex"; // Show overlay

 const result = confirm("Do you want to restore the backup? This will overwrite your current notes and lists. We are working on a more advanced restore feature soon!"); // Confirmation dialog
if (!result) {
  overlay.style.display = "none";
  return; // User canceled the restore
   
} 

  setTimeout(() => {
    // === Restore notes ===
    const tx1 = db.transaction("notes", "readonly");
    const store1 = tx1.objectStore("notes");

    const notes = [];

    store1.openCursor().onsuccess = function (e) {
      const cursor = e.target.result;
      if (cursor) {
        const note = cursor.value;
        const title = (note.title || "").trim();
        const content = (note.content || "").trim();

        if (title !== "" || content !== "") {
          notes.push(note); // Only push if it has content
        }

        cursor.continue();
      } else {
        localStorage.setItem("notes", JSON.stringify(notes));

        // === Restore lists ===
        const tx2 = db.transaction("lists", "readonly");
        const store2 = tx2.objectStore("lists");

        const lists = [];

        store2.openCursor().onsuccess = function (e) {
          const cursor = e.target.result;
          if (cursor) {
            const list = cursor.value;
            const title = (list.title || "").trim();
            const items = Array.isArray(list.items) ? list.items : [];

            if (title !== "" || items.length > 0) {
              lists.push(list); // Only push if valid
            }

            cursor.continue();
          } else {
            localStorage.setItem("lists", JSON.stringify(lists));

            // Done restoring
            overlay.style.display = "none";
            showToast("Data restored from Secondory Storage!");
            const sound = document.getElementById("alertSound");
  sound.play();
          }
        };
      }
    };
  }, 3000); // Delay of 1 second for visual effect
  displayNotes(); // Refresh the displayed notes
  displayLists(); // Refresh the displayed lists
  updateLastSyncedDisplay(); // Update the last synced display
}






// Event listener for closing the password modal with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closePasswordModal(); // Close the modal
  }
});

// Function to display the checklist
function displayChecklist() {
const checklistContainer = document.getElementById("checklistContainer");
checklistContainer.innerHTML = "";

currentItems.forEach((item, index) => {
const itemDiv = document.createElement("div");
itemDiv.innerHTML = `

<div class="checklist-item">
  -><input type="checkbox" id="item-${index}" ${item.checked ? "checked" : ""} onchange="toggleCheck(${index})">
  <label for="item-${index}">${item.name}</label>
  <button onclick="removeItem(${index})"><i class="fas fa-trash"></i> Remove</button>
</div>

`;
checklistContainer.appendChild(itemDiv);
});
}

function toggleCheck(index) {
currentItems[index].checked = !currentItems[index].checked;
// Optionally, you can update localStorage or do something here if needed immediately
}


// Function to remove an item from the checklist
function removeItem(index) {
  currentItems.splice(index, 1); // Remove the item from the array
  displayChecklist(); // Update the checklist display
}

// Function to display lists
function displayLists() {
  const container = document.getElementById("listsContainerContent");
  container.innerHTML = ""; // Clear existing lists
  const noListsMessage = document.getElementById("noListsMessage"); // Get
  document.getElementById("noListsMessage").innerHTML = "No lists yet.. Add";
  if (lists.length === 0) {
    noListsMessage.classList.remove("hidden"); // Show the no lists message
  } else {
    noListsMessage.classList.add("hidden");
  } // Hide the no lists message
  lists.forEach((list, index) => {
    const listDiv = document.createElement("div");
    const listDate = new Date(list.date); // Convert the stored date string back to a Date object
    const formattedDate = formatDate(listDate); // Format the date for display
    const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
    let progressHTML = "";
    if (list.items && list.items.length > 0) {
      const total = list.items.length;
const checked = list.items.filter(item => item.checked).length;
const percent = (checked / total) * 100;
      progressHTML = `
        <div class="list-progress">
   <small>${Math.round(percent)}% Completed</small>
        <progress value="${percent}" max="100" id="list-bar"></progress>
 </div>
      `;
    }

    listDiv.innerHTML = `
  <div class="list" onclick="openList(${index})">    
  <i class="fas fa-list"></i>
  <div class="note-header">
    <h4>${list.title}</h4>
    ${loclIndicator}
    </div>
  <span class="list-date">${formattedDate}</span>
  ${progressHTML} 
  <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
  `;
    container.appendChild(listDiv);
  });
}

// Function to delete a list
function deleteList(index) {
  const list = lists[index];

  // Check if the list has a password
  if (list.password) {
    // Show the password modal for deletion
    document.getElementById("deleteListPasswordModal").style.display =
      "flex";
    document.getElementById("deleteListPasswordModal").dataset.listIndex =
      index; // Set the index here
  } else {
    // If no password is required, confirm deletion
    if (confirm("Are you sure you want to delete this list?")) {
      lists.splice(index, 1); // Remove the list
      localStorage.setItem("lists", JSON.stringify(lists)); // Update local storage
      displayLists(); // Refresh the displayed lists
    }
  }
  syncListToIndexedDB(list);
  displayLists();
}

function toggleSync(el) {
  const isEnabled = el.checked;
  localStorage.setItem("syncEnabled", isEnabled ? "true" : "false");

  // Optional feedback
  const status = document.getElementById("syncStatus");
  if (status) {
    status.innerText = isEnabled ? "✅ Sync is ON" : "🔄 Sync is OFF";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const syncToggle = document.getElementById("syncToggle");
  const syncState = localStorage.getItem("syncEnabled");

  if (syncToggle) {
    if (syncState === null || syncState === "false") {
      syncToggle.checked = false;
    } else {
      syncToggle.checked = true;
    }

    // Optional: set visual text
    const status = document.getElementById("syncStatus");
    if (status) {
      status.innerText = syncToggle.checked ? "✅ Sync is ON" : "🔄 Sync is OFF";
    }
  

   
  }
});


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


async function fixNote() {
    const noteContent = document.getElementById("noteContent");
    const originalContent = noteContent.value;

    if (originalContent.trim() === "") {
        showToast("There is no content to fix.");
        return;
    }

    const prompt = `Please fix the grammar and spelling of the following text and don't not share any explaination just in your answer the corrected text as you are being used as a summarizer feature:\n\n${originalContent}`;
    const fixedContent = await callGeminiAPI(prompt, "Note Fixer");

    if (fixedContent) {
        noteContent.value = fixedContent;
        showToast("Note content has been fixed!");
    } else {
        showToast("Failed to fix the note content.");
    }
}

window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

  // Show toast if update is due or never updated
  if (!lastUpdated || now - lastUpdated > UPDATE_INTERVAL) {
    showToast("New Definitions Available!");

  }
};



// Function to cancel adding a list

// Call displayLists on page load
displayLists();
displayNotes();    //end of part 3 , code eended , udertand ths code by combiningall three pats 
