async function inlitlizeData() {

    notes = await localforage.getItem("notes") || [];
    notesMap = {};
    notes.forEach(note => {
        notesMap[note.id] = note;
    });

    lists = await localforage.getItem("lists") || [];
    listsMap = {};
    lists.forEach(list => {
        listsMap[list.id] = list;
    });

  syncDataWithUpdates();
    displayNotes();
    displayLists();
updateAllPillsDynamically();

}
inlitlizeData();
function syncDataWithUpdates() {
  const synced = localStorage.getItem("syncState");
  if (synced === "26.6.0") return;
  notes.forEach((note) => {
    if (note.remainderEnabled === undefined) {
      note.remainderEnabled = false;

    } if (note.remainderTime === undefined) {
      note.remainderTime = null;
    } if (note.repeatType === undefined) {
      note.repeatType = "once";
    } if (note.notificationId === undefined) {
      note.notificationId = null;
    }

  });

  lists.forEach((list) => {
    if (list.remainderEnabled === undefined) {
      list.remainderEnabled = false;
    }

    if (list.remainderTime === undefined) {
      list.remainderTime = null;
    }

    if (list.repeatType === undefined) {
      list.repeatType = "once";
    }

    if (list.notificationId === undefined) {
      list.notificationId = null;
    }

  });

localStorage.setItem("syncState", "26.6.0");
setTimeout(() => {
  showToast('Updated Notefull assets to 26.6.0 Update!');
}, 4000);
} 