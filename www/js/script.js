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