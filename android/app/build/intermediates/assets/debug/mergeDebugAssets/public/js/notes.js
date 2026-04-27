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
  document.getElementById("noteContent").innerHTML = "";
  document.getElementById("notePassword").value = "";
  showSection('addNoteSection');
  document.getElementById('addNoteSection').classList.remove("hidden");
  document.getElementById('ubtn').style.display = "flex";
  if (editingNoteIndex !== null) {
    const note = notes[editingNoteIndex];
    document.getElementById("noteTitle").value = note.title;
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
  editingNoteIndex = null;
  showSection("combinedContainer");
  document.getElementById("notePasswordModal").classList.add("hidden");
  document.getElementById("nav").classList.remove("hidden");
  document.getElementById("add").classList.remove("hidden");
}
document
  .getElementById("addNoteButton")
  .addEventListener("click", function () {
    editingNoteIndex = null;
    showAddNote();
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
  const note = {
    id: editingNoteIndex !== null
      ? notes[editingNoteIndex].id
      : (currentNoteId || (currentNoteId = crypto.randomUUID())),
    title,
    content,
    password,
    pinned: false,
    date: formattedDate
  };



  const index = notes.findIndex(n => n.id === note.id);
  if (index !== -1) {
    notes[index] = note;
    showToast('Saved');
    const sound = document.getElementById("sucessSound");
    sound.play();
  } else {
    notes.push(note);
    showToast('Saved');
    const sound = document.getElementById("sucessSound");
    sound.play();
  }
  localforage.setItem("notes", notes).then(() => {
    console.log("Notes saved");
  });
  displayNotes();
  showSection('combinedContainer');
  editingNoteIndex = null;
  document.getElementById("nav").classList.remove("hidden");
  document.getElementById("add").classList.remove("hidden");
  currentNoteId = null;
}
function correctNote() {
  showToastWarn('This feature is under development!');
  const sound = document.getElementById("alertSound");
  sound.play();
  return;
}
let autoSaveTimer;
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
        : (currentNoteId || (currentNoteId = crypto.randomUUID())),
      title,
      content,
      password,
      pinned: false,
      date: formattedDate
    };
    const index = notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notes[index] = note;
    } else {
      notes.push(note);
    }
    localforage.setItem("notes", notes);
    localforage.setItem("notes", notes).then(() => {
      console.log("Notes saved");
    });
    displayNotes();
    localforage.setItem("notes", notes);
  }, 1500);
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
      const noteDate = new Date(note.date);
      const formattedDate = formatDate(noteDate);
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
      modal.dataset.noteId = note.id;
 document.getElementById('passwordInput').value = "";
  } else {
    showNoteContent(note);
  }
}

function verifyPassword() {
  const modal = document.getElementById("passwordModal");
      const noteId = modal.dataset.noteId;
const index = notes.findIndex(n => n.id === noteId);
  const input = document.getElementById("passwordInput").value;
  const note = notes[index];


  if (index === -1) {
    showToastError("Note not found");
    return;
  }



  if (input === note.password) {
    modal.classList.add("hidden");
    showNoteContent(note, index);
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

  // ✅ get noteId instead of index
  const noteId = modal.dataset.noteId;

  // ✅ find correct note index using id
  const index = notes.findIndex(n => n.id === noteId);

  // ❗ safety check
  if (index === -1) {
    showToastError("Note not found");
    return;
  }

  const note = notes[index];

  // ✅ password check
  if (passwordInput === note.password) {
    // ✅ delete correct note
    notes.splice(index, 1);

    localforage.setItem("notes", notes);

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
  editingNoteIndex = notes.findIndex(
    (n) => n.title === note.title && n.content === note.content
  );
  showSection('addNoteSection');
  document.getElementById("nav").classList.add("hidden");
  document.getElementById("add").classList.add("hidden");
}

function deleteNote(index) {
  console.log("CALLED");
  const note = notes[index];
  const modal = document.getElementById('deletePasswordModal');

  if (note.password) {
    modal.classList.remove("hidden");
    document.getElementById('deletePasswordInput').value = "";

    // ✅ store ID (not index)
    modal.dataset.noteId = note.id;

  } else {
    if (confirm("Are you sure you want to delete this note?")) {
      notes.splice(index, 1);
      localforage.setItem("notes", notes).then(() => {
        console.log("Notes saved");
      });
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