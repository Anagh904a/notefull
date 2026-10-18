const NotefullTools = {
    async createNoteTool(title, content) {

saveNotesStorage(null, {title: title, content: content});
displayNotes();
},

    async createListTool(title, items) {

saveListsStorage(null, {title: title, items: items});
displayLists();
}
};