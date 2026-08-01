let selectedNotes = [];
let notes = [];
let notesTrash = [];
let currentNoteId = null;
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
  updateAllPillsDynamically();
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
    document.getElementById("noteTitle").value = "Untitled Note";
    document.getElementById("noteContent").innerHTML = "";
    document.getElementById("notePassword").value = "";
  }
  document.getElementById("navBar").classList.add("hidden");
  resetHistory();
  closeModal('addOptionsModal');
}
async function deleteThisNote() {
  if (!confirm("Are you sure you want to move this note to trash?")) return;
  if (currentNoteId !== null) {
    const noteDeleted = notes.find(n => n.id === currentNoteId);
    deletedNotes.push(noteDeleted);
    const note = notes.filter(n => n.id !== currentNoteId);
    console.log(note, noteDeleted, currentNoteId, noteDeleted.id);
    showToast('Note Succesfully moved');
    notes = note;
    await localforage.setItem("notes", notes);
    await localforage.setItem("deletedNotes", deletedNotes);
    rebuildNotes();
    displayNotes();
    showSection('combinedContainer');
    currentNoteId = null;
    document.getElementById("navBar").classList.remove("hidden");
    displayDeletedNotes();
    rebuildDeletedNotes();

  } else {
    cancelNote();
    showToast('Note creation discarded')
  }
}
function cancelNote() {
  document.getElementById('addNoteSection').classList.add("hidden");
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteContent").innerHTML = "";
  document.getElementById("notePassword").value = "";
  currentNoteId = null;
  showSection("combinedContainer");
  document.getElementById("notePasswordModal").classList.add("hidden");
  document.getElementById("navBar").classList.remove("hidden");

}
async function saveNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').innerHTML.trim();
  const password = document.getElementById('notePassword').value.trim();
  const date = Date.now();
  const formattedDate = formatDate(date);

  if (content === "") {
    showToastError("Type some text!");
    const sound = document.getElementById("errorSound");
    if (sound) sound.play();
    return;
  }
  if (title === "") {
    showToastError("Enter a title!");
    const sound = document.getElementById("errorSound");
    if (sound) sound.play();
    return;
  }

  let id = currentNoteId ? currentNoteId : crypto.randomUUID();
  currentNoteId = id;

  const existingNote = notesMap[id];

  const note = {
    id,
    title,
    content,
    password,
    remainderTime: existingNote ? existingNote.remainderTime : null,
    repeatType: existingNote ? existingNote.repeatType : "once",
    remainderEnabled: existingNote ? existingNote.remainderEnabled : false,
    notificationId: existingNote ? existingNote.notificationId : null,
    date
  };

  if (notesMap[id]) {
    notesMap[id] = note;
    notes = notes.map(n => n.id === id ? note : n);
    showToast('Note Updated!');
    const sound = document.getElementById("sucessSound");
    if (sound) sound.play();
  } else {
    notesMap[id] = note; // Ensure maps stay up to date
    notes.push(note);
    showToast('Saved');
    const sound = document.getElementById("sucessSound");
    if (sound) sound.play();
  }

  // FIXED: Clean the array of live HTML element properties before database storage
  const cleanNotesForStorage = notes.map(n => {
    const copy = { ...n };
    delete copy.cachedPillElement; // Removes the HTML elements completely
    return copy;
  });

  try {
    await localforage.setItem("notes", cleanNotesForStorage);
  } catch (dbError) {
    console.error("Storage write failed:", dbError);
  }

  rebuildNotes();
  displayNotes();
  showSection('combinedContainer');
  currentNoteId = null;

  const navBar = document.getElementById("navBar");
  if (navBar) navBar.classList.remove("hidden");
}

function correctNote() {
   if (!window.aiReady) {}
  if (!currentNoteId) {
    showToastError('Please save the note to use AI features');
    return;
  }
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) {
    showToastError('Invalid Note detected!');
    return;
  }

  const noteContent = document.getElementById('noteContent');

  // ← FIX 1: read live DOM text, not the stored note object —
  // this is the actual unsaved content the user is looking at right now,
  // so it can never mismatch what's on screen
  const content = noteContent.innerText;

const prompt = `<|turn>user
You are Notefull AI. Fix grammer and spelling mistakes of given note text

Strict Rules:
1. The correction must not include new details. It should be ONLY the corrected grammer version that will be your reponse.
2. Your response just contain corrected note text. Nothing else, as your response will be new note text, it should not change menaing of text at all.
3. DO NOT ADD DETAILS OR REMOVE DETAILS

Note Text: ${content}
<turn|>
<|turn>model
`;


  showAiThinkingModal('Correcting note...');
window.Capacitor.Plugins.AIPlugin.ask({ prompt, shortAnswer: false }).then(result => {

    if (result?.answer) {
      noteContent.innerText = result.answer;
      closeAiThinkingModal();
      showToast('Note corrected successfully! Save Note to save changes');
    } else {
      closeAiThinkingModal();
      return;
    }

  }).catch(err => {
    closeAiThinkingModal();
    showToastError('Failed to correct Note')
  });

}

function summarizeNote() {
  if (!currentNoteId) {
    showToastError('Please save the note to use AI features');
    return;
  }
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) {
    showToastError('Invalid Note detected!');
    return;
  }

  const noteContent = document.getElementById('noteContent');
  const content = noteContent.innerText;
const prompt = `
<|turn>user
Summarize the given Note Text

RULE: Do not add details or remove any details. Just provide the summary of the Note

Note Text: ${content}
<turn|>
<|turn>model
`;
;


  showAiThinkingModal('Summarizing...');
  window.Capacitor.Plugins.AIPlugin.ask({ prompt, shortAnswer: false }).then(result => {

   if (result?.answer) {
  closeAiThinkingModal();
  setTimeout(() => showResultsModal(result.answer), 650); // wait for the close animation to finish
} else {
  closeAiThinkingModal();
  return;
}

  }).catch(err => {
    closeAiThinkingModal();
    showToastError('Failed to Summarize Note');
  });
}
function suggestTitle() {
  if (!currentNoteId) {
    showToastError('Please save the note to use AI features');
    return;
  }
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) {
    showToastError('Invalid Note detected!');
    return;
  }

  const noteContent = document.getElementById('noteContent');
  const content = noteContent.innerText;
const prompt = `<|turn>user
You are Notefull AI.

Generate a short, meaningful title for the following note.

Rules:
- Return ONLY the title.
- Do not use quotation marks.
- Do not explain your answer.
- Keep it under 6 words.
- Preserve the note's meaning.

Note:

${content}
<turn|>
<|turn>model
`;



  showAiThinkingModal('Thinking...');
  window.Capacitor.Plugins.AIPlugin.ask({ prompt, shortAnswer: true }).then(result => {

   if (result?.answer) {
  closeAiThinkingModal();
document.getElementById('noteTitle').value = result.answer.trim();
} else {
  closeAiThinkingModal();
  return;
}

  }).catch(err => {
    closeAiThinkingModal();
    showToastError('Failed to Summarize Note');
  });
}
function displayNotes() {
  const container = document.getElementById("notesContainer");
  container.innerHTML = "";
  const noNotesMessage = document.getElementById("noNotesMessage");
  if (notes.length === 0) {
    noNotesMessage.classList.remove("hidden");
  } else {
    noNotesMessage.classList.add("hidden");
  }
  notes.forEach((note) => {
    if (note.selected === undefined || note.selected === true) {
      note.selected = false;

    }
    const noteDiv = document.createElement("div");
    const noteDate = new Date(note.date);
    const formattedDate = formatDate(noteDate);
    const lockIndicator = note.password && note.password !== "" ? '<div class="lock-indicator"><i class="ti ti-lock"></i></div>' : "";
    const remainderElement = note.remainderEnabled === true && note.remainderTime
      ? `<div class="remainder-pill" id="note-pill-${note.id}">
      <i class="ti ti-hourglass"></i> 
         <span class="remainder-text" id="note-remainder-${note.id}">     ${getReminderText(note.remainderTime)}</span>
       </div>`
      : "";
      let noteText = "";
      if (!note) {
noteText = "Inavlid Note";
}
      const isTooLong = note.content && note.content.length > 100;
 const htmlRegex = /<\/?(br|b|strong|i|em|span|u|ins|ul|ol|li)(\s[^>]*)?\/?>/i;
  const HTML = htmlRegex.test(note.content);
 if (note.password) {
noteText = "Locked Note";
} else if (isTooLong) {
noteText = "Content Too Large To Display";
} else if (HTML) {
  noteText = "Formatted note text cannot be displayed";
} else {
  noteText = note.content || "Empty Note";
}




    noteDiv.innerHTML = `
      <div id="noteWrapper" class="note-wrapper" data-id="${note.id}">
     
      <input type="checkbox" id="selectBoxNote" onchange="selectNote('${note.id}')" class="select-box hidden">
     
 <div class="note" onclick="openNote('${note.id}')">
 
 <span class="note-date">${formattedDate}</span>   
 ${remainderElement}
 
 <div class="note-header">
    <h4>${note.title}</h4>
   ${lockIndicator}
  </div>
<div class="note-text">${noteText}</div>
  </div>
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
  if (selectionMode === true) {
    return;
  }
  if (note.password) {
    const modal = document.getElementById('passwordModal');
    const text = document.getElementById('passwordModalText');
    text.innerHTML = "Unlock " + note.title + " Note 🔓";
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
    document.getElementById('noteForget').classList.remove('hidden')
  }
  input.value = "";
}

async function forgetPassword() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  
  const noteId = modal.dataset.noteId;
  const note = notesMap[noteId];
  if (!note) return;

  const appLockState = localStorage.getItem("appLockEnabled");

  // 1. Proactively block if security framework is disabled
  if (appLockState === "false" || appLockState === null) {
    showToastError("Sorry, we cannot verify it's you. App lock is disabled!");
    return; 
  }

  // 2. Wait for the secure boolean response from your biometrics layer [1]
  const isVerified = await authUser(`Verify identity to open ${note.title}`);

  // 3. Only show data if the verification returned true [1]
  if (isVerified) {
    showNoteContent(note);
    showToast(`Your Password for ${note.title} is: ${note.password}`);

  } else {
      showToastError("Access denied: Biometric verification failed.");
  }
}



function showNoteContent(note) {
  document.getElementById("noteTitle").value = note.title;
  document.getElementById("noteContent").innerHTML = note.content;
  document.getElementById("notePassword").value = note.password;
  showSection('addNoteSection');
  document.getElementById("navBar").classList.add("hidden");
}