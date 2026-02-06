
let holdTimer = null;
let selectionMode = false;
let backupDirHandle = null;


function formatDate(date) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}



function formatSyncTime(date) {
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) {
    return "Just now";
  }

  const options = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };

  const isToday = now.toDateString() === date.toDateString();
  return isToday 
    ? `Today at ${date.toLocaleTimeString([], options)}`
    : date.toLocaleString([], options);
}



// --- Event Listeners for AI Feature Toggles ---
function handleBack() {
   cancelNote();
   cancelList();
}


function updateLastSyncedDisplay() {
  const div = document.getElementById("lastSyncedStatus");
  const lastSynced = localStorage.getItem("lastSynced");

  if (!div) return;

  if (!lastSynced) {
    div.innerText = `<i class="fas fa-clock"></i> Last Synced: Never`;
    return;
  }

  const syncedDate = new Date(lastSynced);
  div.innerHTML = `<i class="fas fa-clock"></i> Last Synced: ${formatSyncTime(syncedDate)}`;

}


function restoreFromIndexedDB() {
  const overlay = document.getElementById("restoreOverlay");
  overlay.style.display = "flex"; // Show overlay

 const result = confirm("Do you want to restore the backup? This will overwrite your current notes and lists. We are working on a more advanced restore feature soon!"); // Confirmation dialog
if (!result) {
  overlay.style.display = "none";
  return; // User canceled the restore
   
} 

  setTimeout(() => {
    // === Restore notes ===
    const tx1 = db.transaction("notes", "readonly");
    const store1 = tx1.objectStore("notes");

    const notes = [];

    store1.openCursor().onsuccess = function (e) {
      const cursor = e.target.result;
      if (cursor) {
        const note = cursor.value;
        const title = (note.title || "").trim();
        const content = (note.content || "").trim();

        if (title !== "" || content !== "") {
          notes.push(note); // Only push if it has content
        }

        cursor.continue();
      } else {
        localStorage.setItem("notes", JSON.stringify(notes));

        // === Restore lists ===
        const tx2 = db.transaction("lists", "readonly");
        const store2 = tx2.objectStore("lists");

        const lists = [];

        store2.openCursor().onsuccess = function (e) {
          const cursor = e.target.result;
          if (cursor) {
            const list = cursor.value;
            const title = (list.title || "").trim();
            const items = Array.isArray(list.items) ? list.items : [];

            if (title !== "" || items.length > 0) {
              lists.push(list); // Only push if valid
            }

            cursor.continue();
          } else {
            localStorage.setItem("lists", JSON.stringify(lists));

            // Done restoring
            overlay.style.display = "none";
            showToast("Data restored from Secondory Storage!");
            const sound = document.getElementById("sucessSound");
  sound.play();
          }
        };
      }
    };
  }, 3000); // Delay of 1 second for visual effect
  displayNotes(); // Refresh the displayed notes
  displayLists(); // Refresh the displayed lists
  updateLastSyncedDisplay(); // Update the last synced display
}

function toggleSync(el) {
  const isEnabled = el.checked;
  localStorage.setItem("syncEnabled", isEnabled ? "true" : "false");

  // Optional feedback
  const status = document.getElementById("syncStatus");
  if (status) {
    status.innerText = isEnabled ? "✅ Sync is ON" : "🔄 Sync is OFF";
  }
}

