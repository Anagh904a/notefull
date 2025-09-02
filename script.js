

//part 1 of total code
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let editingNoteIndex = null;
let currentNoteId = null;
let currentDeleteNoteId = null;
let currentItems = []; // Will now store objects like { name: 'item name', checked: true/false }
let editingListIndex = null;
let historyStack = [];
let currentIndex = -1;
let holdTimer = null;
let selectionMode = false;
let selectedNotes = [];
let notesDirectoryHandle = null;





function handleBack() {
  // 1. Close modals if any are open
  if (!document.getElementById("addOptionsModal").classList.contains("hidden")) {
    closeAddOptions();
    return;
  }

  // 2. Check for note editing section
  if (!document.getElementById("addItemSection").classList.contains("hidden")) {
    saveNote(); // Custom function you write to close it
    return;
  }



  // 4. If none of the above, maybe confirm exit
  if (confirm("Do you want to exit the app?")) {
    window.history.back(); // Or use Kodular block to close screen
  }
}



let backupDirHandle = null;

// Prompt once and store basic reference


// Restore backup folder handle (user must re-select)








document.addEventListener("DOMContentLoaded", function () {
  
    startAiScan();
    
});



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

function showEmail(emailId) {
  // Hide all email contents
  const contents = document.querySelectorAll(".email-content");
  contents.forEach((content) => (content.style.display = "none"));

  // Show the selected email content
  document.getElementById(emailId).style.display = "block";
}


function sendAIQuery() {
  const input = document.getElementById('aiQuery');
  const response = document.getElementById('aiResponse');
  const query = input.value.trim();

  if (query === '') return;

  response.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
  setTimeout(() => {
    response.innerHTML = `<i class="fas fa-robot"></i> Here’s an explanation for: <strong>${query}</strong>`;
  }, 1500);
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



function goBack() {
  // Hide all sections when going back
  const sections = document.querySelectorAll(".setting-category div");
  sections.forEach((section) => {
    section.classList.add("hidden");
  });

  // Reset toggle icons to plus
  const toggleIcons = document.querySelectorAll(".toggle-icon");
  toggleIcons.forEach((icon) => {
    icon.textContent = "+";
  });
}

function showTab(tabId) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll(".tab-content");
  tabContents.forEach((content) => {
    content.classList.remove("active");
  });

  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll(".tab-button");
  tabButtons.forEach((button) => {
    button.classList.remove("active");
  });

  // Show the selected tab content
  document.getElementById(tabId).classList.add("active");

  // Set the clicked tab button as active
  const activeButton = Array.from(tabButtons).find(
    (button) =>
      button.textContent === tabId.replace(/([A-Z])/g, " $1").trim()
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
}

// Function to toggle sections within the settings
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.toggle("hidden");
    const toggleIcon = document.getElementById(sectionId + "Toggle");
    if (toggleIcon) {
      toggleIcon.textContent = toggleIcon.textContent === "+" ? "-" : "+";
    }
  }
}

function toggleSelect(index) {
  if (selectedNotes.includes(index)) {
    selectedNotes = selectedNotes.filter(i => i !== index);
  } else {
    selectedNotes.push(index);
  }
}

function showSelectionActions() {
  document.getElementById("selectionBar").classList.remove("hidden");
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
        document.querySelector('.fab').addEventListener('click', function(e) {
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


function deleteSelectedNotes() {
  selectedNotes.sort((a, b) => b - a); // delete from end to avoid reindex
  selectedNotes.forEach(i => notes.splice(i, 1));
  localStorage.setItem("notes", JSON.stringify(notes));
  exitSelectionMode();
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
    alert("All data cleared successfully! All Settings are also cleared! Next time you would need to complete setup for the app again!");
    
  }
}

function toggleTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeToggle').checked = theme === 'dark';
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
  showToast("You have unsaved changes.");
       const sound = document.getElementById("errorSound");
  sound.play();
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
function displayFilteredNotesAndLists(filteredNotes, filteredLists) {
    const container = document.getElementById("notesContainer");
    container.innerHTML = ""; // Clear existing content
    const listsContainer = document.getElementById("listsContainerContent");
    listsContainer.innerHTML = "";
   document.getElementById("noNotesMessage").innerHTML = "No matching notes found.";
document.getElementById("noListsMessage").innerHTML = "No matching lists found.";

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
     <div class="note" onclick="openList(${index})">    
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
function searchNotes() {
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
}




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

// Function to close the list password modal


// Function to close a specific feature section



function showListPassword() {
  const listPasswordInput = document.getElementById("listPassword");
  listPasswordInput.classList.toggle("hidden"); // Toggle visibility of the password input
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





// Function to show alert when a feature is not implemented
function showAlert(feature) {
  alert(`${feature} feature is not implemented yet.`);
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
  showSection("addItemSection"); // Show the add item section
  document.getElementById("noteContent").value = ""; // Clear the note content
  document.getElementById("notePassword").value = ""; // Clear the password input
  switchTab('note'); // Switch to the note tab

  if (editingNoteIndex !== null) {
    // Editing an existing note
    const note = notes[editingNoteIndex]; // Get the note being edited
    document.getElementById("noteTitle").value = note.title; // Set the input value to the note title
    document.getElementById("noteContent").value = note.content; // Set the input value to the note content
   
  } else {
    // Creating a new note
    document.getElementById("noteTitle").value = ""; // Clear the title input
    
  }
  document.getElementById('addOptionsModal').classList.add("hidden");
    const itemText = document.getElementById("itemText");

  itemText.querySelector("h2").textContent = "Create a new item";
  
}

function addItemModal() {
  const modal = document.getElementById("addItemModal");
  modal.style.display = "flex"; // Show the modal
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



function closeAddItemModal() {
  const modal = document.getElementById("addItemModal");
  modal.style.display = "none"; // Hide the modal
}

// Function to cancel note and reset visibility
function cancelNote() {
  const section = document.getElementById("addItemSection");
  section.classList.add("hidden");
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
     const sound = document.getElementById("errorSound");
  sound.play();
    return;
  }

  if (title === "") {
   showToast("Enter a title!");
        const sound = document.getElementById("errorSound");
  sound.play();
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
cancelList();
  // Reset editing state
  editingNoteIndex = null;
}

function closeNotePassword() {
   showToast("You have unsaved changes.");
  document.getElementById("notePasswordModal").style.display = "none";
       const sound = document.getElementById("errorSound");
  sound.play();
 
}

function showInfo(message) {
    const infoBox = document.getElementById('infoContainer2');
    document.getElementById('infoText').textContent = message;
    infoBox.style.display = 'flex';
  }
function syncNoteToIndexedDB(note) {
  if (!db) return;
  const syncState = localStorage.getItem("syncEnabled");
  if (syncState !== "true") return;

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



function suggestTitle(noteContent) {
  const keywords = {
    "grocery": "Grocery List",
    "buy": "Shopping List",
    "meeting": "Meeting Notes",
    "exam": "Study Plan",
    "todo": "To-Do List",
    "to do": "To-Do List",
    "shopping": "Shopping List",
    "study": "Study Plan",
    "project": "Project Plan",
    "task": "To-Do List",
"work": "Work Notes"
  };

  for (const key in keywords) {
    if (noteContent.toLowerCase().includes(key)) {
      alert("Suggested title by AI: " + keywords[key]);
      return keywords[key];
    }
  }
  console.log("Suggest title called");
  return "Untitled Note";
  
  
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

function isMasterPasswordSet() {
  return localStorage.getItem("masterPasswordHash") !== null;
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



const GEMINI_API_KEY = "AIzaSyD2BMm3Fx16VYcF_tCYcDsEJnuSmW-wG6I"; 

// Base URL for Gemini API (gemini-2.0-flash model)
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;




// --- Utility function to make Gemini API calls ---
async function callGeminiAPI(prompt, featureName = "AI Feature") {
    try {
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        showToast(`Applying ${featureName}...`, 0); // Show loading indefinitely (duration 0)

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        // Hide loading message after response
        showToast("", 1); // Hide immediately by sending an empty message and small duration

        if (response.ok && result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            showToast(`${featureName} successful!`, 2000);
            return text;
        } else {
            // Check for specific error messages from the API
            const errorDetail = result.error ? result.error.message : 'Unknown error or no content.';
            showToast(`Error with ${featureName}: ${errorDetail}`, 4000);
            console.error(`Gemini API Error for ${featureName}:`, result);
            return null;
        }
    } catch (error) {
        showToast(`Network error for ${featureName}: ${error.message}`, 4000);
        console.error(`Fetch error for ${featureName}:`, error);
        return null;
    }
}

// --- Specific AI Feature Functions ---

async function summarizeNoteWithAI(textToSummarize) {
    const prompt = `Summarize the following text concisely:\n\n${textToSummarize}`;
    return await callGeminiAPI(prompt, "Note Summary");
}



// --- Event Listeners for AI Feature Toggles ---


    

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

function showListsSection() {
  showSection("combinedContainer"); // Show the lists container
  displayLists(); // Refresh the displayed lists
  document.getElementById("addItemSection").classList.add("hidden"); // Ensure add list section is hidden
}

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
  
  showSection("addItemSection"); // Show the add item section
  // Set the index of the note being edited
  editingNoteIndex = notes.findIndex(
    (n) => n.title === note.title && n.content === note.content
  );
  closeAddOptions();
  switchTab('note');
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
}


function closeDeletePasswordModal() {
  document.getElementById("deletePasswordModal").style.display = "none"; // Hide the modal
  document.getElementById("deletePasswordInput").value = ""; // Clear the input
  document.getElementById('passwordModal').style.display = 'none';
}

function closeAddListSection() {
  document.getElementById("addItemSection").classList.add("hidden"); // Hide the add list section
  showSection("combinedContainer"); // Show the lists section
}

// Function to show the add options modal
function showAddOptions() {
  document.getElementById('addOptionsModal').classList.toggle("hidden");
}

function closeAddOptions() {
  
}

// Function to open a list and pre-fill the add list section

// Function to show the add list section
// Function to show the add list section
function showAddListSection() {
  // Hide all sections first

  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });

  // Show the add list section
  document.getElementById("addItemSection").classList.remove("hidden"); // Show the add list section
document.getElementById("addListSection").style.display = "block"; // Show the add list section
document.getElementById("addNoteSection").style.display = "none"; // Show the add list section
switchTab('checklist'); // Switch to the add list tab
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

 document.getElementById('addOptionsModal').classList.add("hidden");
    const itemText = document.getElementById("itemText");

  itemText.querySelector("h2").textContent = "Create a new item";
 
}

// Function to cancel adding a list
function cancelList() {
  // Hide the add list section and show the lists section
  document.getElementById("addItemSection").classList.add("hidden"); // Hide the add list section
  showSection("combinedContainer"); // Show the lists section
  displayNotes();
  displayLists();
  document.getElementById("listPasswordModalr").classList.add("hidden");

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
} else {
lists.push(listData);
showToast("Saved");
}

localStorage.setItem("lists", JSON.stringify(lists));
displayLists();
showSection("combinedContainer");
editingListIndex = null;
document.getElementById("listPasswordModalr").classList.add("hidden");
syncListToIndexedDB(listData);
cancelNote();
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
    div.innerText = "🕒 Last Synced: Never";
    return;
  }

  const syncedDate = new Date(lastSynced);
  div.innerText = "🕒 Last Synced: " + formatSyncTime(syncedDate);
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

function showListContent(list) {
  // Implement the logic to display the list content
  // For example, you might want to show the items in the list
  const checklistContainer =
    document.getElementById("checklistContainer");
  checklistContainer.innerHTML = ""; // Clear previous items

  list.items.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.textContent = item; // Display each item
    checklistContainer.appendChild(itemDiv);
  });

  // Show the section that contains the list content
  showSection("checklistContainer"); // Assuming you have a section to show the checklist
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
}
// Event listener for adding item with Enter key
document
  .getElementById("newItem")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      alert("Please use add button, enter functions are under devlopment!");
    }
  });

  



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
            showToast("Notes and Lists restored from Secondory Storage!");
          }
        };
      }
    };
  }, 3000); // Delay of 1 second for visual effect
  displayNotes(); // Refresh the displayed notes
  displayLists(); // Refresh the displayed lists
  updateLastSyncedDisplay(); // Update the last synced display
}


document.addEventListener("DOMContentLoaded", () => {
  updateLastSyncedDisplay();
  displayNotes(); // Display notes on page load
  displayLists(); // Display lists on page load
  localStorage.setItem("lastSynced", new Date().toISOString()); // Initialize last synced time
  const syncState = localStorage.getItem("syncEnabled");
  if (syncState === null || syncState === "true") {
    document.getElementById("syncToggle").checked = true;
  } else {
    document.getElementById("syncToggle").checked = false;
  }
});




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
  <div class="note" onclick="openList(${index})">    
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

function updateProgressForCurrentList() {
  const total = currentItems.length;
  const checked = currentItems.filter(item => item.checked).length;
  const percent = Math.round((checked / total) * 100);
  // update some existing progress bar DOM here
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
    if (syncState === null || syncState === "true") {
      syncToggle.checked = true;
    } else {
      syncToggle.checked = false;
    }

    // Optional: set visual text
    const status = document.getElementById("syncStatus");
    if (status) {
      status.innerText = syncToggle.checked ? "✅ Sync is ON" : "🔄 Sync is OFF";
    }
  

   
  }
});


function showError() {
  showToast("Failed to connect to model")
}

function showError2() {
  showToast("Failed to configure")
  alert("This is an message from Notefull security system: Due to some errors on API side, the AI toggle will be always enabled. Mantaining your secure experience")
}

const VERSION = "v1.2"; // Simulate new version

function openAntithreat() {
showSection('antithreatSection');

  const lastUpdated = localStorage.getItem("lastUpdated");
  const version = localStorage.getItem("version") || "v1.0";

  document.getElementById("lastUpdated").textContent = lastUpdated || "Never";
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

  document.getElementById("lastUpdated").textContent = lastUpdated || "Never";
  document.getElementById("currentVersion").textContent = version;

  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (!lastUpdated || now - parseInt(lastUpdated) > threeDays) {
    document.getElementById("updateButton").classList.remove("hidden");
  } else {
    document.getElementById("updateButton").classList.add("hidden");
  }
}

function startUpdate() {
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

  // Step transitions
  setTimeout(() => { baseText = "Downloading update"; }, 5000);
  setTimeout(() => { baseText = "Installing update"; }, 20000);

  setTimeout(() => {
    clearInterval(dotsInterval);

    //  Fetch keywords from GitHub
    fetch("https://raw.githubusercontent.com/Anagh904a/notefull/refs/heads/main/sensitiveKeywords.json")
      .then(res => res.json())
      .then(data => {
        localStorage.setItem("sensitiveKeywords", JSON.stringify(data));
        console.log("Keywords updated:", data);
      })
      .catch(err => {
        console.error("Failed to fetch keywords:", err);
      })
      .finally(() => {
        // Finalize version update
        let cur = localStorage.getItem("version") || "v1.0";
        let nv = getNextVersion(cur);
        localStorage.setItem("version", nv);
        localStorage.setItem("lastUpdated", Date.now());

        modal.style.display = "none";
        openAntithreat();
        alert("Database Updated — Now running a quick scan...");
        startAiScan();
      });
  }, 45000);
}


function getNextVersion(version) {
  if (!version || !/^v?\d+(\.\d+)?$/.test(version)) {
    return "v1.0"; // default if bad value
  }

  let parts = version.replace("v", "").split(".");
  let major = parseInt(parts[0], 10) || 1;
  let minor = parseInt(parts[1], 10) || 0;

  minor++;
  if (minor >= 10) {
    minor = 0;
    major++;
  }

  return `v${major}.${minor}`;
}

window.onload = function () {
  const lastUpdated = parseInt(localStorage.getItem("lastUpdated"), 10);
  const now = Date.now();
  const UPDATE_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days in ms

  // Show toast if update is due or never updated
  if (!lastUpdated || now - lastUpdated > UPDATE_INTERVAL) {
    showToast("AntiThreat Update Available!");
  }
};



// Function to cancel adding a list

// Call displayLists on page load
displayLists();
displayNotes();    //end of part 3 , code eended , udertand ths code by combiningall three pats 
