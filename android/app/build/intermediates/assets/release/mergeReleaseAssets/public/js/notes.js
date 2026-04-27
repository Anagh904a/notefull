let selectedNotes = [];
let notesDirectoryHandle = null;
let notes = [];

localforage.getItem("notes").then(storedNotes => {
  notes = storedNotes || [];
  displayNotes();
});
let editingNoteIndex = null;
let currentNoteId = null;
let currentDeleteNoteId = null;
let currentIndex = -1;
let historyStack = [];

// Reset history when opening a new note
function resetHistory() {
  historyStack = [];
  currentIndex = -1;
  const noteContent = document.getElementById("noteContent").innerHTML;
  historyStack.push(noteContent);
  currentIndex = 0;
  toggleButtons();
}

function saveState() {
  const noteContent = document.getElementById("noteContent").innerHTML;

  if (currentIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, currentIndex + 1);
  }

  historyStack.push(noteContent);
  currentIndex++;

  toggleButtons();
}

function undo() {
  if (currentIndex > 0) {
    currentIndex--;
    const previousState = historyStack[currentIndex];
    document.getElementById("noteContent").innerHTML = previousState;
  }
  toggleButtons();
}

function redo() {
  if (currentIndex < historyStack.length - 1) {
    currentIndex++;
    const nextState = historyStack[currentIndex];
    document.getElementById("noteContent").innerHTML = nextState;
  }
  toggleButtons();
}

function getNoteById(id) {
  return notes.find(n => n.id === id);
}

function getNoteIndexById(id) {
  return notes.findIndex(n => n.id === id);
}



document.getElementById('noteContent').addEventListener('keyup', function (e) {
  if (e.key === " " || e.key === "Enter") {
    const textarea = e.target;
    const text = textarea.innerHTML;

    const formulaPattern = /=(SUM|AVG)?\(?[0-9+*/,\s.-]+\)?/gi;
    const matches = text.match(formulaPattern);

    if (matches) {
      matches.forEach(match => {
        const result = evaluateInlineFormula(match.trim());
        if (result !== null) {
          textarea.innerHTML = textarea.innerHTML.replace(match, result); // ✅ FIXED
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
      // ✅ SAFE: Only allow basic math operations
      return evaluateSafeMath(formula.slice(1));
    }
  } catch (e) {
    return null;
  }
  return null;
}


function evaluateSafeMath(expression) {
  // Remove all whitespace
  expression = expression.replace(/\s/g, '');
  
  // Only allow numbers and basic operators
  if (!/^[0-9+\-*/.()]+$/.test(expression)) {
    return null;
  }
  
  try {
    // Use Function constructor (safer than eval, still restricted)
    const result = Function('"use strict"; return (' + expression + ')')();
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (e) {
    return null;
  }
}

function toggleButtons() {
    const undoButton = document.getElementById("undoButton");
    const redoButton = document.getElementById("redoButton");

    // Enable/Disable Undo button
    undoButton.disabled = currentIndex <= 0;
   

    // Enable/Disable Redo button
    redoButton.disabled = currentIndex >= historyStack.length - 1;
    

  
}

document.getElementById("noteContent").addEventListener("input", saveState);
  toggleButtons();

function showAddNote() {
  document.getElementById("noteContent").innerHTML = ""; 
  document.getElementById("notePassword").value = ""; // ✅ FIXED: .value instead of .innerHTML
  showSection('addNoteSection');
  document.getElementById('addNoteSection').classList.remove("hidden");
  document.getElementById('ubtn').style.display = "flex";

  if (editingNoteIndex !== null) {
    const note = notes[editingNoteIndex];
    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").innerHTML = note.content;
    document.getElementById("notePassword").value = note.password || ""; // ✅ Load existing password
  } else {
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").innerHTML = "";
    document.getElementById("notePassword").value = ""; // ✅ Clear password field
  }
  

  document.getElementById("nav").classList.add("hidden");
   document.getElementById("add").classList.add("hidden");
  
  

  
  // ✅ NEW: Reset undo/redo history when opening note
  resetHistory();
  
  closeModal('addOptionsModal');
}



// Function to cancel note and reset visibility
function cancelNote() {
document.getElementById('addNoteSection').classList.add("hidden");
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").innerHTML = "";
  document.getElementById("notePassword").value = "";
  editingNoteIndex = null;
  showSection("combinedContainer");
  document.getElementById("notePasswordModal").classList.add("hidden");
     document.getElementById("nav").classList.remove("hidden");
      document.getElementById("add").classList.remove("hidden");
    
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
  const content = document.getElementById('noteContent').innerHTML.trim();
  const password = document.getElementById('notePassword').value.trim();
  const date = new Date();
  const formattedDate = formatDate(date);

  if (content === "") {
    showToastError("Type some text!");
      const sound = document.getElementById("errorSound");
  sound.play();

    return;
  }

  if (title === "") {
   showToastError("Enter a title!");
     const sound = document.getElementById("errorSound");
  sound.play();
    return;
  }

  // ✅ Create the note object here so it's always defined
  const note = {
     id: editingNoteIndex !== null 
      ? notes[editingNoteIndex].id 
      : crypto.randomUUID(),
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
      const sound = document.getElementById("sucessSound");
  sound.play();
  } else {
    // Add new note
    notes.push(note);
    showToast("Saved");
      const sound = document.getElementById("sucessSound");
  sound.play();
  }

  // Save to localStorage
  localforage.setItem("notes", notes).then(() => {
  console.log("Notes saved");
});




  // Update UI
  displayNotes();
  showSection('combinedContainer');
  document.getElementById("notePasswordModal").classList.add("hidden");

  // Reset editing state
  editingNoteIndex = null;

       document.getElementById("nav").classList.remove("hidden");
        document.getElementById("add").classList.remove("hidden");
}

function correctNote() {
  showToastWarn('This feature is under development!');
        const sound = document.getElementById("alertSound");
  sound.play();
  return;
}

let autoSaveTimer;
let currentAutoNoteId = null;

function autoSaveNote() {
  clearTimeout(autoSaveTimer);

  autoSaveTimer = setTimeout(() => {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').innerHTML.trim();
    const password = document.getElementById('notePassword').value.trim();
    const date = new Date();
    const formattedDate = formatDate(date);

    if (content === "" || title === "") return;

    const note = {
      id: editingNoteIndex !== null 
        ? notes[editingNoteIndex].id 
        : (currentAutoNoteId || crypto.randomUUID()),
      title,
      content,
      password,
      date: formattedDate
    };

    if (editingNoteIndex !== null) {
      notes[editingNoteIndex] = note;
    } else {
      // prevent duplicate notes
      if (!currentAutoNoteId) {
        currentAutoNoteId = note.id;
        notes.push(note);
      } else {
        const index = notes.findIndex(n => n.id === currentAutoNoteId);
        if (index !== -1) {
          notes[index] = note;
        }
      }
    }

displayNotes();
    localforage.setItem("notes", notes);
  }, 500); // delay
}






function displayNotes() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  const noNotesMessage = document.getElementById("noNotesMessage"); 
  if (notes.length === 0) {
    noNotesMessage.classList.add("noNotesMessage");
  } else {
    noNotesMessage.classList.add("hidden");
  } 

setTimeout(() => {
notes.forEach((note, index) => {
    const noteDiv = document.createElement("div");
    const noteDate = new Date(note.date); // Convert the stored date string back to a Date object
    const formattedDate = formatDate(noteDate); // Format the date for display
           const lockIndicator = note.password && note.password !== "" ? ' <div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "";
    noteDiv.innerHTML = `
   
 <div class="note" onclick="openNote(${index})">

    <span class="note-date">${formattedDate}</span>    
 <div class="note-header">

    <h4>${note.title}</h4>
   ${lockIndicator}

  </div>
 

  <button class="delete-btn" onclick="deleteNote(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>


  </div>
    `;
    container.appendChild(noteDiv);
  });
}, 0);
}



function openNote(index) {
  const note = notes[index];

  if (note.password) {
    const modal = document.getElementById('passwordModal');
    modal.classList.remove("hidden");
    modal.dataset.noteIndex = index;
    document.getElementById('passwordInput').value = "";
  } else {
    showNoteContent(note);
  }
}


function verifyPassword() {
 const modal = document.getElementById("passwordModal");
  const index = modal.dataset.noteIndex;
  const input = document.getElementById("passwordInput").value;
  const note = notes[index];

  if (input === note.password) {
    modal.style.display = "none";
    showNoteContent(note, index);
  } else {
    showToastError("Incorrect password");
     const sound = document.getElementById("errorSound");
  sound.play();
  }

  input.value = "";
}

function deleteVerifyPassword() {
  console.log("deleteVerifyPassword called");
  const passwordInput = document.getElementById("deletePasswordInput").value;
  const index = document.getElementById("deletePasswordModal").dataset.noteIndex; // Get the index of the note being deleted
  const note = notes[index]; // Get the note being deleted\



  if (passwordInput === note.password) {
    // If the password is correct, delete the note
    notes.splice(index, 1);
      localforage.setItem("notes", notes).then(() => {

}); // Update local storage
    displayNotes(); // Refresh the displayed notes
    closeModal('deletePasswordModal'); // Close the modal
  } else {
     showToastError("Incorrect password!"); // Show an error message
         const sound = document.getElementById("errorSound");
  sound.play();
  }
}

function showNoteContent(note) {
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").innerHTML = note.content;
  document.getElementById("notePassword").value = note.password;
  
 // Show the add item section
  // Set the index of the note being edited
  editingNoteIndex = notes.findIndex(
    (n) => n.title === note.title && n.content === note.content
  );

showSection('addNoteSection');
   document.getElementById("nav").classList.add("hidden");
    document.getElementById("add").classList.add("hidden");
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
          localforage.setItem("notes", notes).then(() => {
  console.log("Notes saved");
});

          displayNotes();
      }
  }

  displayNotes();
}

async function recoverNotes() {
  try {
    // Check if recovery already done
    const recoveryStatus = localStorage.getItem("notesRecoveryCompleted");
    
    if (recoveryStatus === "true") {
      showToastError("Your notes are already recovered!");
        const sound = document.getElementById("errorSound");
  sound.play();
      return;
    }

    // Get old notes from localStorage
    const oldNotesData = localStorage.getItem("notes");
    
    if (!oldNotesData) {
      showToastError("No old notes found to recover!");
        const sound = document.getElementById("errorSound");
  sound.play();
      return;
    }

    // Parse old notes
    let oldNotes;
    try {
      oldNotes = JSON.parse(oldNotesData);
    } catch (parseError) {
      showToastError("Old notes data is corrupted!");
        const sound = document.getElementById("errorSound");
  sound.play();
      console.error("Parse error:", parseError);
      return;
    }

    // Validate it's an array
    if (!Array.isArray(oldNotes)) {
      showToastError("Invalid notes format!");
        const sound = document.getElementById("errorSound");
  sound.play();
      return;
    }

    if (oldNotes.length === 0) {
      showToastError("No notes to recover!");
        const sound = document.getElementById("errorSound");
  sound.play();
      return;
    }

    // Get existing notes from localforage (don't overwrite if already there)
    const existingNotes = await localforage.getItem("notes") || [];
    
    // Merge old and new notes (avoid duplicates by checking IDs)
    const mergedNotes = [...existingNotes];
    let recoveredCount = 0;

    oldNotes.forEach(oldNote => {
      // Check if note already exists (by ID)
      const exists = mergedNotes.find(n => n.id === oldNote.id);
      
      if (!exists) {
        // Ensure note has required fields
        const recoveredNote = {
          id: oldNote.id || crypto.randomUUID(),
          title: oldNote.title || "Untitled",
          content: oldNote.content || "",
          password: oldNote.password || "",
          date: oldNote.date || formatDate(new Date())
        };
        
        mergedNotes.push(recoveredNote);
        recoveredCount++;
      }
    });

    // Save merged notes to localforage
    await localforage.setItem("notes", mergedNotes);
    
    // Update global notes variable
    notes = mergedNotes;
    
    // Mark recovery as completed
    localStorage.setItem("notesRecoveryCompleted", "true");
    
    // Display notes
    displayNotes();
    
    // Show success message
    if (recoveredCount > 0) {
      showToast(`Successfully recovered ${recoveredCount} note${recoveredCount > 1 ? 's' : ''}!`);
       const sound = document.getElementById("sucessSound");
  sound.play();
      console.log(`✅ Recovered ${recoveredCount} notes from localStorage to localforage`);
    } else {
      showToast("All notes were already up to date!");
        const sound = document.getElementById("alertSound");
  sound.play();
    }

  } catch (error) {
    console.error("❌ Recovery error:", error);
    showToastError("Failed to recover notes!");
      const sound = document.getElementById("errorSound");
  sound.play();
  }
}