// IndexedDB config
let db;

const request = indexedDB.open("notesBackupDB", 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;

  if (!db.objectStoreNames.contains("notes")) {
    db.createObjectStore("notes", { keyPath: "noteId" });
  }

  if (!db.objectStoreNames.contains("lists")) {
    db.createObjectStore("lists", { keyPath: "listId" });
  }
};

request.onsuccess = function (event) {
  db = event.target.result;
};

request.onerror = function (event) {
  console.error("IndexedDB error:", event.target.errorCode);
};
