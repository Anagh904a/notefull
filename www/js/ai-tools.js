const NotefullTools = {
  async createNoteTool(title, content) {
    const created = await saveNotesStorage(null, { title, content });
    return created?.id || null;
  },

  async getNoteByKeywordTool(keyword) {
    const matches = findNotesByKeyword(keyword);
    return { count: matches.length, matches };
  },

  async editNoteTool(noteIdOrTitle, newTitle, newContent) {
    return await editNoteStorage(noteIdOrTitle, newTitle, newContent);
  },

  async createListTool(title, items = []) {
    const created = await saveListsStorage(null, { title, items });
    return created?.id || null;
  },

  async getListByKeywordTool(keyword) {
    const matches = findListsByKeyword(keyword);
    return { count: matches.length, matches };
  },

  async addItemToListTool(listKeyword, itemText) {
    return await addItemToListStorage(listKeyword, itemText);
  }
};