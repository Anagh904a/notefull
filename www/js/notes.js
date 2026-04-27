let selectedNotes = [];
let notesDirectoryHandle = null;
let notes = [];

localforage.getItem("notes").then(storedNotes => {
  notes = storedNotes || [];

  notesMap = {};
  notes.forEach(note => {
    notesMap[note.id] = note;
  });

  displayNotes(); // optional but usually needed
});

let currentNoteId = null;
let currentDeleteNoteId = null;
let currentIndex = -1;
let historyStack = [];
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

function rebuildNotes() {
notesMap = {};
notes.forEach(n => notesMap[n.id] = n);
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
          textarea.innerHTML = textarea.innerHTML.replace(match, result);
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
      return evaluateSafeMath(formula.slice(1));
    }
  } catch (e) {
    return null;
  }
  return null;
}
function evaluateSafeMath(expression) {
  expression = expression.replace(/\s/g, '');
  if (!/^[0-9+\-*/.()]+$/.test(expression)) {
    return null;
  }
  try {
    const result = Function('"use strict"; return (' + expression + ')')();
    return typeof result === 'number' && !isNaN(result) ? result : null;
  } catch (e) {
    return null;
  }
}
function toggleButtons() {
  const undoButton = document.getElementById("undoButton");
  const redoButton = document.getElementById("redoButton");
  undoButton.disabled = currentIndex <= 0;
  redoButton.disabled = currentIndex >= historyStack.length - 1;
}
document.getElementById("noteContent").addEventListener("input", saveState);
toggleButtons();
function showAddNote() {
document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").innerHTML = "";
  document.getElementById("notePassword").value = "";
  showSection('addNoteSection');
  document.getElementById('addNoteSection').classList.remove("hidden");

  if (currentNoteId !== null) {
   const note = notes.find(n => n.id === currentNoteId);

    if (!note) {
      showToastError('Corrupted Note Detected')
    }

   document.getElementById("noteContent").innerHTML = note.content;
    document.getElementById("notePassword").value = note.password || "";
  } else {
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").innerHTML = "";
    document.getElementById("notePassword").value = "";
  }
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
  resetHistory();
  closeModal('addOptionsModal');
}
function cancelNote() {
  document.getElementById('addNoteSection').classList.add("hidden");
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").innerHTML = "";
  document.getElementById("notePassword").value = "";
  currentNoteId = null;
  showSection("combinedContainer");
  document.getElementById("notePasswordModal").classList.add("hidden");
  document.getElementById("nav").classList.remove("hidden");
  document.getElementById("add").classList.remove("hidden");
}

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

  let id;
    if (currentNoteId) {
  id = currentNoteId;
} else {
  id = crypto.randomUUID();
  currentNoteId = id;
}

  const note = {
    id,
    title,
    content,
    password,
    pinned: false,
    date: formattedDate
  };




 const index = notes.findIndex(n => n.id === id);

  if (index !== -1) {
    notes[index] = note;
    showToast('Note Updated!');
    const sound = document.getElementById("sucessSound");
  sound.play();
  } else {
    notes.push(note);
    showToast('Saved');
    const sound = document.getElementById("sucessSound");
  sound.play();
  }
  localforage.setItem("notes", notes).then(() => {
    console.log("Notes saved using saveNote()");
  });
  rebuildNotes();
  displayNotes();
  showSection('combinedContainer');
 currentNoteId = null;
  document.getElementById("nav").classList.remove("hidden");
  document.getElementById("add").classList.remove("hidden");

}
function correctNote() {
  showToastWarn('This feature is under development!');
  const sound = document.getElementById("alertSound");
  sound.play();
  return;
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

    notes.forEach((note) => {
      const noteDiv = document.createElement("div");
      const noteDate = new Date(note.date);
      const formattedDate = formatDate(noteDate);
      const lockIndicator = note.password && note.password !== "" ? ' <div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "";
      noteDiv.innerHTML = `
 <div class="note" onclick="openNote('${note.id}')">
    <span class="note-date">${formattedDate}</span>    
 <div class="note-header">
    <h4>${note.title}</h4>
   ${lockIndicator}
  </div>
  <button class="delete-btn" onclick="deleteNote('${note.id}'); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
    `;
      container.appendChild(noteDiv);
    });

}
function openNote(noteId) {
const note = notesMap[noteId];
currentNoteId = noteId;

if (!note) {
  showToastError("Note not found");
  return;
}

  if (note.password) {
    const modal = document.getElementById('passwordModal');
    modal.classList.remove("hidden");
      modal.dataset.noteId = note.id;
 document.getElementById('passwordInput').value = "";
  } else {
    showNoteContent(note);
  }


}

function verifyPassword() {
  const modal = document.getElementById("passwordModal");
      const noteId = modal.dataset.noteId;
 const input = document.getElementById("passwordInput").value;
  const note = notesMap[noteId];

  if (!note) {
    showToastError("Note not found");
    return;
  }

  if (input === note.password) {
    modal.classList.add("hidden");
    showNoteContent(note);
  } else {
    showToastError("Incorrect password");
    const sound = document.getElementById("errorSound");
    sound.play();
  }
  input.value = "";
}
function deleteVerifyPassword() {
 const passwordInput = document.getElementById("deletePasswordInput").value;
  const modal = document.getElementById("deletePasswordModal");
 const noteId = modal.dataset.noteId;
   const note = notesMap[noteId];
   const index = notes.findIndex(n => n.id === noteId);

  if (index === -1) {
    showToastError("Note not found");
    return;
  }



  // ✅ password check
  if (passwordInput === note.password) {
    // ✅ delete correct note
    notes.splice(index, 1);

    localforage.setItem("notes", notes);
  rebuildNotes();
    displayNotes();
    closeModal("deletePasswordModal");
  } else {
    showToastError("Incorrect password!");
    const sound = document.getElementById("errorSound");
    sound.play();
  }

}

function showNoteContent(note) {
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").innerHTML = note.content;
  document.getElementById("notePassword").value = note.password;
  showSection('addNoteSection');
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
}

function deleteNote(noteId) {
  const note = notesMap[noteId];
  const modal = document.getElementById('deletePasswordModal');
  const index = notes.findIndex(n => n.id === noteId);

  if (index === -1) {
    showToastError("This note is courrupted!");
    return;
  }



  if (note.password) {
    modal.classList.remove("hidden");
    document.getElementById('deletePasswordInput').value = "";
    modal.dataset.noteId = note.id;

  } else {
    if (confirm("Are you sure you want to delete this note?")) {
      notes.splice(index, 1);
      localforage.setItem("notes", notes);
        rebuildNotes();
      displayNotes();
    }
  }


}
async function recoverNotes() {
  try {
    const recoveryStatus = localStorage.getItem("notesRecoveryCompleted");
    if (recoveryStatus === "true") {
      showToastError("Your notes are already recovered!");
      const sound = document.getElementById("errorSound");
      sound.play();
      return;
    }
    const oldNotesData = localStorage.getItem("notes");
    if (!oldNotesData) {
      showToastError("No old notes found to recover!");
      const sound = document.getElementById("errorSound");
      sound.play();
      return;
    }
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
    const existingNotes = await localforage.getItem("notes") || [];
    const mergedNotes = [...existingNotes];
    let recoveredCount = 0;
    oldNotes.forEach(oldNote => {
      const exists = mergedNotes.find(n => n.id === oldNote.id);
      if (!exists) {
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
    await localforage.setItem("notes", mergedNotes);
    notes = mergedNotes;
    localStorage.setItem("notesRecoveryCompleted", "true");
    displayNotes();
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