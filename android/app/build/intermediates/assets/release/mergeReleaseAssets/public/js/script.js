
let holdTimer = null;
let selectionMode = false;
let backupDirHandle = null;


function formatDate(date) {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}







// --- Event Listeners for AI Feature Toggles ---
function handleBack() {
   cancelNote();
   cancelList();
}

