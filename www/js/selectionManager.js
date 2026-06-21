// SELECTION MANAGER PART I (Selection Mode)
let deletedNotes = [];
let deletedLists = [];
let itemsToBeDeleted = [];
localforage.getItem("deletedNotes").then(data => {
    deletedNotes = data || [];
    rebuildDeletedNotes();
    displayDeletedNotes();
});

localforage.getItem("deletedLists").then(data => {
    deletedLists = data || [];
    rebuildDeletedLists();
    displayDeletedLists();
});
let selectionMode = false;
let selectedCount = 0;

function showSelectionMode() {
    const toolbar = document.getElementById('toolbar');
    const nav = document.getElementById('navBar');
    const search = document.getElementById('header');
    const sort = document.getElementById('sort');
    toolbar.classList.add('active');
    nav.classList.add('hidden');
    search.classList.add('hidden');
    sort.style.paddingTop = "80px";
    selectionMode = true;
    document.getElementById('selectionBtn').classList.add('hidden');

    const noteWrapper = document.querySelectorAll('.note-wrapper');
    const listWrapper = document.querySelectorAll(".list-wrapper");
    noteWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box');
        const note = wrapper.querySelector('.note');
        if (box) {
            box.classList.remove('hidden');
        }
        note.classList.add('select');
    });
    listWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box');
        const list = wrapper.querySelector('.list');
        if (box) {
            box.classList.remove('hidden');
        }
        list.classList.add('select');
    });
}

function rebuildDeletedLists() {
deletedListsMap = {};
deletedLists.forEach(l => deletedListsMap[l.id] = l);
}

function rebuildDeletedNotes() {
deletedNotesMap = {};
deletedNotes.forEach(l => deletedNotesMap[l.id] = l);
}

function closeSelectionMode() {
    const toolbar = document.getElementById('toolbar');
    const nav = document.getElementById('navBar');
    const search = document.getElementById('header');
    const sort = document.getElementById('sort');
    toolbar.classList.remove('active');
    nav.classList.remove('hidden');
    search.classList.remove('hidden');
    sort.style.paddingTop = "0px";
    document.getElementById("selectionBtn").classList.remove("hidden");
    selectionMode = false;
    const noteWrapper = document.querySelectorAll('.note-wrapper');
    const listWrapper = document.querySelectorAll('.list-wrapper');
    noteWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box');
        const note = wrapper.querySelector('.note');
        if (box) {
            box.classList.add('hidden');
        }
        note.classList.remove('select');
        note.classList.remove('selected')
    });
    listWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box');
        const list = wrapper.querySelector('.list');
        if (box) {
            box.classList.add('hidden');
        }
        list.classList.remove('select');
        list.classList.remove('selected')
    });
     const counter = document.getElementById('selected-count');
     counter.innerHTML = 0 + " Selected";
     selectedCount = 0;
    displayNotes();
    displayLists();
}

function selectNote(noteId) {
    const note = notesMap[noteId];
      const counter = document.getElementById('selected-count')
      const noteEl = document.querySelector(`.note-wrapper[data-id="${noteId}"] .note`);
    if (note != null) {
        note.selected = !note.selected;
        
        if (note.selected) {
        selectedCount++ 
        noteEl.classList.add("selected");
        } else {
            selectedCount--
            noteEl.classList.remove('selected');
        }
        counter.innerHTML = selectedCount + " Selected";
    }
}

function selectList(listId) {
    const list = listsMap[listId];
     const counter = document.getElementById('selected-count');
     const listEl = document.querySelector(`.list-wrapper[data-id="${listId}"] .list`);
    if (list != null) {
        list.selected = !list.selected;
        if (list.selected) {
            selectedCount++
            listEl.classList.add("selected");
        } else {
            selectedCount--
            listEl.classList.remove("selected");
        }
        counter.innerHTML = selectedCount + " Selected";
    }
}

function selectAll() {
    const note = document.querySelectorAll('.note-wrapper');
    const list = document.querySelectorAll('.list-wrapper');
    const counter = document.getElementById('selected-count');
   
selectedCount = 0;
counter.innerHTML = selectedCount + "Selected";

note.forEach(noteWrapper => {
const noteId = noteWrapper.dataset.id;
const noteObj = notesMap[noteId];
 const noteEl = document.querySelector(`.note-wrapper[data-id="${noteId}"] .note`);
 const inputNote = noteWrapper.querySelector('.select-box');
   inputNote.checked = true;

    noteObj.selected = true;
    noteEl.classList.add("selected");
    selectedCount++;


});   

list.forEach(listWrapper => {
const listId = listWrapper.dataset.id;
const listObj = listsMap[listId];
 const listEl = document.querySelector(`.list-wrapper[data-id="${listId}"] .list`);
 const inputList = listWrapper.querySelector('.select-box');
    inputList.checked = true;

    listObj.selected = true;
    listEl.classList.add("selected");
    selectedCount++;



});

counter.innerHTML = selectedCount + " Selected";
}

let lockedCount = 0;

 function moveSelectedNoteToTrash(note) {
deletedNotes.push(note);
console.log("move trahs was called", note);
}

 function moveSelectedListToTrash(list) {
   deletedLists.push(list);
}

async function deleteSelected() {
    const mode = localStorage.getItem('mode'); 
itemsToBeDeleted = [];
    const hasProtected = notes.some(note => note.selected && note.password) || lists.some(list => list.selected && list.password);

if (mode === "balanced" && hasProtected) {
try {
    await authUser();
  
} catch(err) {
    console.error(err);
}
}
notes.forEach((note) => { 
     

if (note.selected === true && note.password === "") {

     moveSelectedNoteToTrash(note);
     itemsToBeDeleted.push(note.id);
} else if (note.selected === true && note.password !== "") {
        if (mode === "relaxed" || mode === "balanced") {
           moveSelectedNoteToTrash(note);
                      console.log(note, "Moving to trash section a password note with", mode);
  itemsToBeDeleted.push(note.id);
                    } else if(mode === "strict") {
   lockedCount++

   return;
  } 
} else {

    return;
}


});   

 lists.forEach((list) => {
if (list.selected === true && list.password === "") {
console.log(list, "the code reached me! THE LIST");
     moveSelectedListToTrash(list);
      itemsToBeDeleted.push(list.id);
 } else if (list.selected === true && list.password !== "") {
       if (mode === "relaxed" || mode === "balanced") {
           moveSelectedListToTrash(list);
              itemsToBeDeleted.push(list.id);
           console.log(list, "Moving to trash section a password list with", mode);
  } else if(mode === "strict") {
   lockedCount++
   return;
  } 
} else {
    console.log("Skipping unselected lists");
    return;
}

});


notes = notes.filter(note => !itemsToBeDeleted.includes(note.id));
lists = lists.filter(list => !itemsToBeDeleted.includes(list.id));


if (mode === "strict") {
alert(lockedCount + " items were skipped as they were protected, to delete them please remove the password first.");
}
lockedCount = 0;
closeSelectionMode();
 await localforage.setItem("notes", notes);
  rebuildNotes();

  await localforage.setItem("lists", lists);
rebuildLists();

await localforage.setItem("deletedNotes", deletedNotes);
rebuildDeletedNotes();

   await localforage.setItem("deletedLists", deletedLists);
rebuildDeletedLists();

displayDeletedNotes();
displayDeletedLists();
}

//SELECTION MANAGER PART II OF FILE (TRASH SECTION)
let trashMode = false;
let trashCount = 0;

function showTrashMode() {
    const toolbar = document.getElementById('trash-toolbar');
    const nav = document.getElementById('navBar');
    const sort = document.getElementById('sort-trash');
toolbar.classList.add('active');
    nav.classList.add('hidden');
    sort.style.paddingTop = "80px";
    trashMode = true;
    document.getElementById('trashBtn').classList.add('hidden');

    const deletedNoteWrapper = document.querySelectorAll('.trash-note-wrapper');
    const deletedListWrapper = document.querySelectorAll(".trash-list-wrapper");
    deletedNoteWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box-trash');
        const note = wrapper.querySelector('.trash-note');
        if (box) {
            box.classList.remove('hidden');
        }
        note.classList.add('select');
    });
    deletedListWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box-trash');
        const list = wrapper.querySelector('.trash-list');
        if (box) {
            box.classList.remove('hidden');
        }
        list.classList.add('select');
    });
}
function closeTrashMode() {
    const toolbar = document.getElementById('trash-toolbar');
    const nav = document.getElementById('navBar');
    const sort = document.getElementById('sort-trash');
    toolbar.classList.remove('active');
    nav.classList.remove('hidden');
    sort.style.paddingTop = "0px";
   trashMode = false;
    document.getElementById('trashBtn').classList.remove('hidden');
    const noteWrapper = document.querySelectorAll('.trash-note-wrapper');
    const listWrapper = document.querySelectorAll('.trash-list-wrapper');
    noteWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box-trash');
        const note = wrapper.querySelector('.trash-note');
        if (box) {
            box.classList.add('hidden');
        }
        note.classList.remove('select');
        note.classList.remove('selected')
    });
    listWrapper.forEach(wrapper => {
        const box = wrapper.querySelector('.select-box-trash');
        const list = wrapper.querySelector('.trash-list');
        if (box) {
            box.classList.add('hidden');
        }
        list.classList.remove('select');
        list.classList.remove('selected')
    });
     const counter = document.getElementById('trash-count');
     counter.innerHTML = 0 + " Selected";
    trashCount = 0;
    displayNotes();
    displayLists();
    displayDeletedNotes();
    displayDeletedLists();
}

function selectDeletedNote(noteId) {
    const note = deletedNotesMap[noteId];
      const counter = document.getElementById('trash-count')
      const noteEl = document.querySelector(`.trash-note-wrapper[data-id="${noteId}"] .trash-note`);
    if (note != null) {
        note.selected = !note.selected;
        
        if (note.selected) {
       trashCount++ 
        noteEl.classList.add("selected");
        } else {
            trashCount--
            noteEl.classList.remove('selected');
        }
        counter.innerHTML = trashCount + " Selected";
    }
}

function selectDeletedList(listId) {
    const list = deletedListsMap[listId];
     const counter = document.getElementById('trash-count');
     const listEl = document.querySelector(`.trash-list-wrapper[data-id="${listId}"] .trash-list`);
    if (list != null) {
        list.selected = !list.selected;
        if (list.selected) {
           trashCount++
            listEl.classList.add("selected");
        } else {
            trashCount--
            listEl.classList.remove("selected");
        }
        counter.innerHTML = trashCount + " Selected";
    }
}

function emptyTrash() {
    const note = document.querySelectorAll('.trash-note-wrapper');
    const list = document.querySelectorAll('.trash-list-wrapper');
    const counter = document.getElementById('trash-count');
   
    trashCount = 0;
counter.innerHTML = trashCount + " Selected";

note.forEach(noteWrapper => {
const noteId = noteWrapper.dataset.id;
const noteObj = deletedNotesMap[noteId];
 const noteEl = document.querySelector(`.trash-note-wrapper[data-id="${noteId}"] .trash-note`);
 const inputNote = noteWrapper.querySelector('.select-box-trash');
   inputNote.checked = true;

    noteObj.selected = true;
    noteEl.classList.add("selected");
    trashCount++;


});   

list.forEach(listWrapper => {
const listId = listWrapper.dataset.id;
const listObj = deletedListsMap[listId];
 const listEl = document.querySelector(`.trash-list-wrapper[data-id="${listId}"] .trash-list`);
 const inputList = listWrapper.querySelector('.select-box-trash');
    inputList.checked = true;

    listObj.selected = true;
    listEl.classList.add("selected");
  trashCount++;



});
deleteSelectedforever();

}

async function deleteSelectedforever() {
    const mode = localStorage.getItem('mode'); 

if (!confirm('Are you sure you want to delete selected items forever?')) {
    return;
}
deletedNotes = deletedNotes.filter(note => !note.selected);
deletedLists = deletedLists.filter(list => !list.selected);

await authUser();
showToast('Operation Succesfull!');
closeTrashMode();

await localforage.setItem("deletedNotes", deletedNotes);
   await localforage.setItem("deletedLists", deletedLists);
}


 function restoreSelectedNote(note) {
notes.push(note);
}

 function restoreSelectedList(list) {
    lists.push(list);
  }

async function restoreSelected() {
    const mode = localStorage.getItem('mode'); 

if (!confirm('Do you want to restore selected items?')) {
    return;
}
deletedNotes.forEach((note) => {
if (note.selected === true) {
    restoreSelectedNote(note);
}
});   

 deletedLists.forEach((list) => {
if (list.selected === true) {
restoreSelectedList(list);
}
});

deletedNotes = deletedNotes.filter(note => !note.selected);
deletedLists = deletedLists.filter(list => !list.selected);


showToast('Operation Succesfull!');
closeTrashMode();

await localforage.setItem("deletedNotes", deletedNotes);
rebuildDeletedNotes();

   await localforage.setItem("deletedLists", deletedLists);
   rebuildDeletedLists();

    await localforage.setItem("notes", notes);
  rebuildNotes();

  await localforage.setItem("lists", lists);
rebuildLists();
}

function displayDeletedNotes() {
  const container = document.getElementById("trashContainer");
  container.innerHTML = "";
  const noNotesMessage = document.getElementById("noDeletedItemsMessage");
  if (deletedNotes.length === 0 && deletedLists.length === 0) {
    noNotesMessage.classList.remove("hidden");
  } else {
    noNotesMessage.classList.add("hidden");
  }
    deletedNotes.forEach((note) => {
         if(note.selected === undefined  || note.selected === true){
 note.selected = false;
}
      const noteDiv = document.createElement("div");
      const noteDate = new Date(note.date);
      const formattedDate = formatDate(noteDate);
      const lockIndicator = note.password && note.password !== "" ? ' <div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "";
    
      noteDiv.innerHTML = `
      <div class="trash-note-wrapper" data-id="${note.id}">
     
      <input type="checkbox" id="selectBoxNote" onchange="selectDeletedNote('${note.id}')" class="select-box-trash hidden">
     
 <div class="trash-note">
    <span class="note-date">${formattedDate}</span>    
 <div class="note-header">
    <h4>${note.title}</h4>
   ${lockIndicator}
  </div>
  <div class="note-text">
  ${note.password ? "Protected Note: Cannot show content": note.content}
  </div>
  </div>
  </div>
    `;
      container.appendChild(noteDiv);
    });
}

function displayDeletedLists() {
  const container = document.getElementById("trashContainer");
  const noNotesMessage = document.getElementById("noDeletedItemsMessage");
    deletedLists.forEach((list) => {
         if(list.selected === undefined  || list.selected === true){
 list.selected = false;
}
      const listDiv = document.createElement("div");
      const listDate = new Date(list.date);
      const formattedDate = formatDate(listDate);
      const loclIndicator = list.password && list.password !== "" ? ' <div class="lock-indicator"><i class="fas fa-lock"></i></div>' : "";
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
      <div class="trash-list-wrapper" data-id="${list.id}">
      <input type="checkbox" id="selectBoxList" onchange="selectDeletedList('${list.id}')" class="select-box-trash hidden">
     <div class="trash-list">
     <i class="fas fa-list"></i>
  <span class="list-date">${formattedDate}</span>
  <div class="note-header">
    <h4>${list.title}</h4>
    ${loclIndicator}
    </div>
  ${progressHTML} 
  
  </div>
  </div>
  </div>
    `;
      container.appendChild(listDiv);
    });
}






