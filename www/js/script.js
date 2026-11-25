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
    renderItems();
   
updateAllPillsDynamically();

}
inlitlizeData();
function syncDataWithUpdates() {
  const synced = localStorage.getItem("syncState");
  if (synced === "26.9.0") return;
  notes.forEach((note) => {
    if (note.remainderEnabled === undefined) {
      note.remainderEnabled = false;
        } if (note.remainderTime === undefined) {
      note.remainderTime = null;
    }    if (note.type === undefined) {
      note.type = "note";
        }
     if (note.repeatType === undefined) {
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
    if (list.type === undefined) {
      list.type = "list";
        }

    if (list.repeatType === undefined) {
      list.repeatType = "once";
    }

    if (list.notificationId === undefined) {
      list.notificationId = null;
    }

  });

localStorage.setItem("syncState", "26.9.0");
setTimeout(() => {
    const keywords = JSON.parse(localStorage.getItem("sensitiveKeywords") || "[]");
  if (keywords.length) {
  showToast('Updated Notefull to v26.10 ');
  }
}, 1000);
} 

async function deleteAi() {
 const isConfirmed = await showConfirmToast({
      title: 'Delete AI?',
      message: 'Continuing will cause AI-related assets to be deleted permanently. It will be non-recoverable.',
      btn1txt: "I know the consequences of the action. Proceed"
    });

    if (!isConfirmed) {
      showToast('Delete Action for Notefull AI has been terminated!');
    return;
    } else {
showToastWarn('Deleting Notefull AI ');
await cleanModelsDir();
await delay(2000);
showToast('Deleted Notefull AI successfully! Please restart the app to take effect!');
    }

}