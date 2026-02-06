function closeNotePassword() {

  document.getElementById("notePasswordModal").style.display = "none";

 
}

function showInfo(message) {
    const infoBox = document.getElementById('infoContainer2');
    document.getElementById('infoText').textContent = message;
    infoBox.style.display = 'flex';
  }

  function showSection(sectionId) {
  document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden");
  });

  document.getElementById(sectionId).classList.remove("hidden");

  if (historyStack[historyStack.length - 1] !== sectionId) {
    historyStack.push(sectionId);
  }

  currentSection = sectionId;

closeAddOptions();
}

 function updateNavbar(element) {
            // Remove 'active' class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add 'active' class to the clicked item
            element.classList.add('active');
        }



function scrollHeader(){
  const header = document.getElementById('header');
  if(this.scrollY >= 80) {
    header.classList.add('scroll-header');
  } else {
    header.classList.remove('scroll-header');
  }
}
window.addEventListener('scroll', scrollHeader);





function navigateTo(sectionId) {
 document.querySelectorAll(".container").forEach((section) => {
    section.classList.add("hidden"); // Hide all sections
  });
  document.getElementById(sectionId).classList.remove("hidden"); // Show the selected section

  // Manage history stack

  currentSection = sectionId; // Update current section
 closeSidebar(); // Close sidebar if open
}

// Event listener for the Android back button functionality


window.onload = function () {
  startAiScan();
};


window.showToast = function(message, duration = 2500) {
iziToast.success({

    message: message,
    position: 'topRight',
   closeOnClick: true,

    class: 'mobile-friendly-toast'
});
}

window.showToastError = function(message, duration = 2500) {
  iziToast.error({
    title: 'Error',
      message: message,
      position: 'topRight',
   zindex: 99999,
    class: 'mobile-friendly-toast',
       closeOnClick: true,
  });
  }

window.showToastWarn = function(message, duration = 2500) {
  iziToast.warning({
  
      message: message,
      position: 'topRight',
   zindex: 99999,
    class: 'mobile-friendly-toast',
       closeOnClick: true,
  });
  }

  function closeWelcomeModal() {
     const modal = document.getElementById('modal');
     modal.style.display = "none";
  }



function refresh() {
  displayNotes();
  displayLists();
  showToast("Refreshed!");
showSection("combinedContainer");
const search = document.getElementById('searchInput');
  search.value = "";
}

function closeListPasswordModal() {
  document.getElementById("listPasswordModal").style.display = "none";
}

function closeDeleteListPasswordModal() {
  document.getElementById("deleteListPasswordModal").style.display =
    "none";
    closeListPasswordModal();
}

function showAiToast() {
    const toast = document.getElementById('aiToast');
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000); // show for 4 seconds
  }



function showNotePassword() {
  document.getElementById("notePasswordModal").style.display = "flex";
}



function showList() {
  document.getElementById("listPasswordModalr").style.display = "flex";
}

function closeListPassword() {
  document.getElementById("listPasswordModalr").style.display = "none";

}


function showAddOptions() {
  document.getElementById('addOptionsModal').classList.toggle('hidden');
}

function applySortFilter(filterValue) {
  // --- Element References ---
  const notesContainer = document.getElementById("notesContainer");
  const listsContainerContent = document.getElementById("listsContainerContent");
  const noListsMessage = document.getElementById("noListsMessage"); // Assuming these exist
  const noNotesMessage = document.getElementById("noNotesMessage"); // Assuming these exist
  const combinedContainer = document.getElementById("combinedContainer");
  
  // Helper to safely check if an element exists before manipulating it
  const check = (el) => el !== null;

  console.log(`Applying Filter: ${filterValue}`);
  
  // --- Filtering Logic ---

  if (filterValue === "note") {
    // 1. Clear Lists and hide list-related messages
    if (check(listsContainerContent)) listsContainerContent.innerHTML = "";
    if (check(noListsMessage)) noListsMessage.classList.add("hidden");
    
    // 2. Display Notes
    displayNotes(); // Assumes this function re-renders notes into notesContainer
    
    // 3. Show the main content area
    if (check(combinedContainer)) showSection("combinedContainer");
    
    console.log("Displaying only notes");

  } else if (filterValue === "lists") {
    // 1. Clear Notes and hide note-related messages
    if (check(notesContainer)) notesContainer.innerHTML = "";
    if (check(noNotesMessage)) noNotesMessage.classList.add("hidden");
    
    // 2. Display Lists
    displayLists(); // Assumes this function re-renders lists into listsContainerContent
    
    // 3. Show the main content area
    if (check(combinedContainer)) showSection("combinedContainer");
    
    console.log("Displaying only lists");

  } else if (filterValue === "all") {
    // Display both Notes and Lists
    displayNotes();
    displayLists();
    
    // Ensure 'no message' elements are handled (e.g., re-shown if data is empty)
    if (check(noNotesMessage)) noNotesMessage.classList.remove("hidden");
    if (check(noListsMessage)) noListsMessage.classList.remove("hidden");

    if (check(combinedContainer)) showSection("combinedContainer");
    
    console.log("Displaying all notes and lists");

  } else if (filterValue === "date_newest" || filterValue === "date_oldest") {
    // Preserving the existing 'disabled' behavior for sorting
    alert("Sorting by date is disabled in this mode.");
  }
}

function handleFilterChange(element, filterValue) {
  const container = document.getElementById('filterGroup');
  const glow = document.getElementById('segmentGlow');
  const allItems = container.querySelectorAll('.filter-item');

  // 1. Update Active State Class (Visual)
  allItems.forEach(item => item.classList.remove('active'));
  element.classList.add('active');

  // 2. Move and Resize the background glow (Sleek Animation)
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  // Calculate the position relative to the filter-group container
  glow.style.width = `${rect.width}px`;
  glow.style.left = `${rect.left - containerRect.left}px`;
  
  // 3. Trigger the core application logic
  applySortFilter(filterValue);
}

// 4. Initialization: Ensure the glow is placed correctly on load
window.addEventListener('DOMContentLoaded', () => {
  const activeItem = document.querySelector('.filter-item.active');
  if (activeItem) {
    // We pass the active item and its filter value ('all' initially)
    handleFilterChange(activeItem, 'all'); 
  }
})

 function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

const placeholders = [
  "Search any data...",
  "Ask Notefull AI...",
  "e.g When is my meeting?",
  "Search with Notefull AI...",
  "Quickly find your note...",
  "Find notes by keyword...",
  "Locate that important file...",
  "Search through your ideas...",
  "Ask AI for suggestions...",
  "Find meeting notes fast...",
  "Discover your saved thoughts...",
  "Quick search your notes...",
  "Ask Notefull anything...",
  "Where did I save that note?",
  "Search by topic or tag...",
  "Need a reminder? Ask AI...",
  "Look for ideas in your notes...",
  "Search your thoughts quickly...",
  "Find yesterday’s notes...",
  "What notes did I take today?",
  "Quickly find that important detail...",
  "Search for events, tasks, or ideas...",
  "Ask questions about your notes...",
  "Find related notes fast...",
  "Search by keyword or phrase...",
  "AI can help if note isn’t found...",
  "Instantly find any note..."
];



let index = 0; // start from first placeholder
const debouncedSearch = debounce(searchNotes, 1000);

document.getElementById('searchInput').addEventListener('input', debouncedSearch);



const input = document.getElementById("searchInput");

// Function to update placeholder every second
setInterval(() => {
  input.placeholder = placeholders[index];
  index = (index + 1) % placeholders.length; // loop back to start
}, 5000); // change every 5000ms (5 second)

function closeAddOptions() {
  document.getElementById('addOptionsModal').classList.add('hidden');
}