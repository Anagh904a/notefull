// ============================================================
//  reminders.js — Notefull Reminder System
//  Handles: pill countdown display, reminder modal UI,
//           save/remove reminder logic for notes and lists.
//
//  DEPENDS ON (must load after these):
//    notes.js  → notes[], notesMap, currentNoteId
//    lists.js  → lists[], listsMap, currentListId
//
//  FUTURE: All places marked [NOTIFICATION] are where
//          native Capacitor notification calls will plug in.
// ============================================================


// ─────────────────────────────────────────────
//  SECTION 1: COUNTDOWN TEXT FORMATTER
// ─────────────────────────────────────────────

/**
 * Returns a short human-readable countdown string
 * e.g. "2d", "3h", "45m", "Now"
 */
function getReminderText(targetTime) {
    if (!targetTime) return "";

    const diff = new Date(targetTime) - Date.now();
    if (diff <= 0) return "Now";

    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day >= 365) return `${Math.floor(day / 365)}y`;
    if (day >= 30) return `${Math.floor(day / 30)}mo`;
    if (day >= 1) return `${day}d`;
    if (hr >= 1) return `${hr}h`;
    if (min >= 1) return `${min}m`;
    return `${sec}s`;
}


// ─────────────────────────────────────────────
//  SECTION 2: PILL UPDATE ENGINE
// ─────────────────────────────────────────────

let globalAdaptiveTimerId = null;

/**
 * Updates a single item's pill text.
 * Returns the milliseconds remaining, or Infinity if no active reminder.
 */
function updateSingleItemPill(item, type) {
    // No reminder set — nothing to update
    if (!item.remainderEnabled || !item.remainderTime) return Infinity;


    const pill = document.getElementById(`${type}-remainder-${item.id}`);
    const element = document.getElementById(`${type}-pill-${item.id}`);
    if (!pill) return Infinity;

    const diff = new Date(item.remainderTime) - Date.now();

    if (diff <= 0) {
        if (item.repeatType === "once" || !item.repeatType) {
            element.style.display = "none";
            item.remainderEnabled = false;
            item.remainderTime = null;  // add this
            return Infinity;
        } else {
            processRepeatedReaminders(item, type);
        }
    }

    pill.textContent = getReminderText(item.remainderTime);
    return diff;
}

/**
 * Loops through all notes and lists, updates every active pill,
 * then schedules itself again at the smartest interval based on
 * how soon the nearest reminder is.
 */
function updateAllPillsDynamically() {
    clearTimeout(globalAdaptiveTimerId);
    let shortestTimeLeft = Infinity;

    if (typeof lists !== "undefined" && Array.isArray(lists)) {
        lists.forEach(list => {
            const t = updateSingleItemPill(list, "list");
            if (t < shortestTimeLeft) shortestTimeLeft = t;
        });
    }

    if (typeof notes !== "undefined" && Array.isArray(notes)) {
        notes.forEach(note => {
            const t = updateSingleItemPill(note, "note");
            if (t < shortestTimeLeft) shortestTimeLeft = t;
        });
    }

    // Nothing active — no need to keep ticking
    if (shortestTimeLeft === Infinity) return;

    // Pick the smartest re-check interval:
    // far away → check every hour | close → check every second
    const ONE_MIN = 60_000;
    const ONE_HOUR = 3_600_000;
    const ONE_DAY = 86_400_000;

    let nextDelay;
    if (shortestTimeLeft >= ONE_DAY) nextDelay = ONE_DAY;
    else if (shortestTimeLeft >= ONE_HOUR) nextDelay = ONE_HOUR;
    else if (shortestTimeLeft >= ONE_MIN) nextDelay = ONE_MIN;
    else if (shortestTimeLeft >= 1000) nextDelay = 1000;
    else nextDelay = 1000;


    globalAdaptiveTimerId = setTimeout(updateAllPillsDynamically, nextDelay);
}

// ─────────────────────────────────────────────
//  SECTION 3A: REPEATING REMINDERS LOGIC
// ─────────────────────────────────────────────
async function processRepeatedReaminders(item, type) {
    const current = new Date(item.remainderTime);
    const next = new Date(current);

    switch (item.repeatType) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
        default:
            // Unknown repeat type — treat as once
            item.remainderEnabled = false;
            item.remainderTime = null;
            return;
    }

    item.remainderTime = next.toISOString();
    // remainderEnabled stays true — reminder continues

    if (item.notificationId) {
        await deregisterNotification(item.notificationId);
    }
    item.notificationId = await registerNotification(item, type);
}


// ─────────────────────────────────────────────
//  SECTION 3B: DATE / INPUT HELPERS
// ─────────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in local time,
 * used to reconstruct datetime-local values from time-only inputs.
 */
function getLocalFormatDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Switches the note reminder time input between
 * datetime-local (once/weekly/monthly/yearly) and time (daily).
 * Preserves whatever value is already entered when switching.
 */
function handleNoteRepeatChange() {
    const repeatTypeEl = document.getElementById("repeatType");
    const timeInput = document.getElementById("remainderTime");
    if (!repeatTypeEl || !timeInput) return;

    const repeatType = repeatTypeEl.value;
    const currentVal = timeInput.value;

    if (repeatType === "daily") {
        // Daily only needs a time, not a full date
        const timeOnly = currentVal.includes("T") ? currentVal.split("T")[1] : currentVal;
        timeInput.type = "time";
        timeInput.value = timeOnly || "";
    } else {
        // All other types need a full datetime
        const dateTime = (timeInput.type === "time" && currentVal)
            ? `${getLocalFormatDate()}T${currentVal}`
            : currentVal;
        timeInput.type = "datetime-local";
        timeInput.value = dateTime || "";
    }
}

/**
 * Same as above but for the list reminder modal.
 */
function handleListRepeatChange() {
    const repeatTypeEl = document.getElementById("listRepeatType");
    const timeInput = document.getElementById("listRemainderTime");
    if (!repeatTypeEl || !timeInput) return;

    const repeatType = repeatTypeEl.value;
    const currentVal = timeInput.value;

    if (repeatType === "daily") {
        const timeOnly = currentVal.includes("T") ? currentVal.split("T")[1] : currentVal;
        timeInput.type = "time";
        timeInput.value = timeOnly || "";
    } else {
        const dateTime = (timeInput.type === "time" && currentVal)
            ? `${getLocalFormatDate()}T${currentVal}`
            : currentVal;
        timeInput.type = "datetime-local";
        timeInput.value = dateTime || "";
    }
}


// ─────────────────────────────────────────────
//  SECTION 4: NOTE REMINDER MODAL
// ─────────────────────────────────────────────

/**
 * Opens the note reminder modal.
 * Populates fields if a reminder is already set on this note.
 */
function showRemainderModal() {
    if (currentNoteId === null) {
        showToastError("Please save the note first to use the reminder feature.");
        return;
    }

    const note = notesMap[currentNoteId];
    if (!note) {
        showToastError("Note not found.");
        return;
    }

    const modal = document.getElementById("note-remainder-modal");
    const remainderDate = document.getElementById("remainderTime");
    const repeatSelect = document.getElementById("repeatType");
    const titleEl = document.getElementById("note-remainder-modal-text");

    // Reset input type to default before populating
    remainderDate.type = "datetime-local";

    if (note.remainderEnabled && note.remainderTime) {
        remainderDate.value = note.remainderTime;
        repeatSelect.value = note.repeatType || "once";
        titleEl.textContent = `Update Reminder — ${note.title}`;
    } else {
        remainderDate.value = "";
        repeatSelect.value = "once";
        titleEl.textContent = `Set a Reminder — ${note.title}`;
    }

    modal.classList.remove("hidden");
}

/**
 * Saves the reminder onto the in-memory note object.
 * Does NOT persist to storage — that happens when the user saves the note.
 *
 * [NOTIFICATION] Future: after setting note.remainderTime here,
 * call scheduleNotification(note, "note") to register with Capacitor.
 */
async function saveRemainder() {
    callNotificationPopUp();
    if (currentNoteId === null) {
        showToastError("Reminder feature is not supported for unsaved notes.");
        return;
    }

    const note = notesMap[currentNoteId];
    const remainderDate = document.getElementById("remainderTime");
    const repeatSelect = document.getElementById("repeatType");
    const titleEl = document.getElementById("note-remainder-modal-text");
    const modal = document.getElementById("note-remainder-modal");

    if (!note) {
        showToastError("Note not found.");
        return;
    }

    if (!remainderDate.value) {
        showToastError("Please pick a date and time.");
        return;
    }

    // For daily reminders the input is time-only — build a full timestamp
    let resolvedTime = remainderDate.value;
    if (repeatSelect.value === "daily" && !resolvedTime.includes("T")) {
        resolvedTime = `${getLocalFormatDate()}T${resolvedTime}`;
    }

    const reminderTimestamp = new Date(resolvedTime).getTime();
    if (isNaN(reminderTimestamp)) {
        showToastError("Invalid date/time. Please try again.");
        return;
    }

    // "once" reminders must be in the future
    if (repeatSelect.value === "once" && reminderTimestamp < Date.now()) {
        showToastError("Reminder cannot be set in the past.");
        return;
    }

    // Apply to note object
    note.remainderEnabled = true;
    note.remainderTime = resolvedTime;
    note.repeatType = repeatSelect.value;
    if (note.notificationId) {
        await deregisterNotification(note.notificationId);
    }
    note.notificationId = await registerNotification(note, "note");

    titleEl.textContent = `Update Reminder — ${note.title}`;
    modal.classList.add("hidden");

    displayNotes();
    displayLists();
    updateAllPillsDynamically();

    showToast("Reminder set! Save the note to keep it.");
}

/**
 * Removes the reminder from the in-memory note object.
 *
 * [NOTIFICATION] Future: call cancelNotification(note.notificationId)
 * before clearing the fields below.
 */
async function removeRemainder() {
    if (currentNoteId === null) {
        showToastError("Reminder feature is not supported for unsaved notes.");
        return;
    }

    const note = notesMap[currentNoteId];
    const modal = document.getElementById("note-remainder-modal");

    if (!note) {
        showToastError("Note not found.");
        return;
    }

    // Only confirm if there was actually a reminder set
    if (note.remainderEnabled) {
        if (!confirm("Cancel this reminder?")) return;
    }


    if (note.notificationId) {
        await deregisterNotification(note.notificationId);
    }

    note.remainderEnabled = false;
    note.remainderTime = null;
    note.repeatType = "once";
    note.notificationId = null;

  
  

    modal.classList.add("hidden");
    updateAllPillsDynamically();

    showToast("Reminder removed.");
}


// ─────────────────────────────────────────────
//  SECTION 5: LIST REMINDER MODAL
// ─────────────────────────────────────────────

/**
 * Opens the list reminder modal.
 * Populates fields if a reminder is already set on this list.
 */
function showListRemainderModal() {

    callNotificationPopUp();
    if (currentListId === null) {
        showToastError("Please save the list first to use the reminder feature.");
        return;
    }

    const list = listsMap[currentListId];
    if (!list) {
        showToastError("List not found.");
        return;
    }

    const modal = document.getElementById("list-remainder-modal");
    const remainderDate = document.getElementById("listRemainderTime");
    const repeatSelect = document.getElementById("listRepeatType");
    const titleEl = document.getElementById("list-remainder-modal-text");

    // Reset input type to default before populating
    remainderDate.type = "datetime-local";

    if (list.remainderEnabled && list.remainderTime) {
        remainderDate.value = list.remainderTime;
        repeatSelect.value = list.repeatType || "once";
        titleEl.textContent = `Update Reminder — ${list.title}`;
    } else {
        remainderDate.value = "";
        repeatSelect.value = "once";
        titleEl.textContent = `Set a Reminder — ${list.title}`;
    }

    modal.classList.remove("hidden");
}

/**
 * Saves the reminder onto the in-memory list object.
 * Does NOT persist to storage — that happens when the user saves the list.
 *
 * [NOTIFICATION] Future: after setting list.remainderTime here,
 * call scheduleNotification(list, "list") to register with Capacitor.
 */
async function saveRemainderList() {
    if (currentListId === null) {
        showToastError("Reminder feature is not supported for unsaved lists.");
        return;
    }

    const list = listsMap[currentListId];
    const remainderDate = document.getElementById("listRemainderTime");
    const repeatSelect = document.getElementById("listRepeatType");
    const titleEl = document.getElementById("list-remainder-modal-text");
    const modal = document.getElementById("list-remainder-modal");

    if (!list) {
        showToastError("List not found.");
        return;
    }

    if (!remainderDate.value) {
        showToastError("Please pick a date and time.");
        return;
    }

    // For daily reminders the input is time-only — build a full timestamp
    let resolvedTime = remainderDate.value;
    if (repeatSelect.value === "daily" && !resolvedTime.includes("T")) {
        resolvedTime = `${getLocalFormatDate()}T${resolvedTime}`;
    }

    const reminderTimestamp = new Date(resolvedTime).getTime();
    if (isNaN(reminderTimestamp)) {
        showToastError("Invalid date/time. Please try again.");
        return;
    }

    // "once" reminders must be in the future
    if (repeatSelect.value === "once" && reminderTimestamp < Date.now()) {
        showToastError("Reminder cannot be set in the past.");
        return;
    }

    // Apply to list object
    list.remainderEnabled = true;
    list.remainderTime = resolvedTime;
    list.repeatType = repeatSelect.value;

    if (list.notificationId) {
        await deregisterNotification(list.notificationId);
    }
    list.notificationId = await registerNotification(list, "list");

    titleEl.textContent = `Update Reminder — ${list.title}`;
    modal.classList.add("hidden");

    displayNotes();
    displayLists();
    updateAllPillsDynamically();

    showToast("Reminder set! Save the list to keep it.");
}

/**
 * Removes the reminder from the in-memory list object.
 *
 * [NOTIFICATION] Future: call cancelNotification(list.notificationId)
 * before clearing the fields below.
 */
async function removeRemainderList() {
    if (currentListId === null) {
        showToastError("Reminder feature is not supported for unsaved lists.");
        return;
    }

    const list = listsMap[currentListId];
    const modal = document.getElementById("list-remainder-modal");

    if (!list) {
        showToastError("List not found.");
        return;
    }

    if (list.remainderEnabled) {
        if (!confirm("Cancel this reminder?")) return;
    }

    if (list.notificationId) {
        await deregisterNotification(list.notificationId);
    }

    list.remainderEnabled = false;
    list.remainderTime = null;
    list.repeatType = "once";
    list.notificationId = null;
    list.cachedPillElement = null;

    modal.classList.add("hidden");
    updateAllPillsDynamically();

    showToast("Reminder removed.");
}


// ─────────────────────────────────────────────
//  SECTION 6: FUTURE NOTIFICATION STUBS
//  (Leave these empty for now — fill in later
//   when adding Capacitor notification calls)
// ─────────────────────────────────────────────

/**
 * [NOTIFICATION] Future: Schedule a Capacitor local notification.
 * Will be called from saveRemainder() and saveRemainderList().
 *
 * @param {object} item - The note or list object
 * @param {string} type - "note" or "list"
 * @returns {number} notificationId
 */

/**
 * [NOTIFICATION] Future: On app open, re-register all active reminders.
 * Capacitor notifications can be wiped when app is force-closed on Android.
 * Call this from page-load.js after initializeData() completes.
 */
async function rescheduleAllActiveReminders() {
    const allItems = [
        ...(typeof notes !== "undefined" ? notes.map(n => ({ item: n, type: "note" })) : []),
        ...(typeof lists !== "undefined" ? lists.map(l => ({ item: l, type: "list" })) : [])
    ];

    for (const { item, type } of allItems) {
        if (item.remainderEnabled && item.remainderTime && new Date(item.remainderTime) > Date.now()) {
            item.notificationId = await registerNotification(item, type);
        }
    }

    console.log("All active reminders rescheduled on app open");
}