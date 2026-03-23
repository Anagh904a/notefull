

function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return text; 
    const regex = new RegExp(`(${searchTerm})`, 'gi'); 
    return text.replace(regex, '<span class="highlight">$1</span>');
}


function displayFilteredNotesAndLists(filteredNotes, filteredLists, isAISearching = false) {
    const container = document.getElementById("notesContainer");
    container.innerHTML = ""; 
    const listsContainer = document.getElementById("listsContainerContent");
    listsContainer.innerHTML = "";
    const noNotesMessage = document.getElementById("noNotesMessage");
    noNotesMessage.innerHTML = "No matching notes with that title were found.";
    const noListsMessage = document.getElementById("noListsMessage");
    noListsMessage.innerHTML = "No matching lists with that title were found.";

    if (filteredNotes.length === 0 && filteredLists.length === 0) {
        noNotesMessage.classList.remove("hidden");
        noListsMessage.classList.remove("hidden");
    } else {
        noNotesMessage.classList.add("hidden");
        noListsMessage.classList.add("hidden");
    }

    if (filteredLists.length === 0) {
        noListsMessage.classList.remove("hidden"); 
    } else {
        noListsMessage.classList.add("hidden");
    }

    if (filteredNotes.length == 0) {
        noNotesMessage.classList.remove("hidden");
    } else {
        noNotesMessage.classList.add("hidden");
    }

    // Display notes
    filteredNotes.forEach((note, index) => {
        const noteDiv = document.createElement("div");
        const noteDate = new Date(note.date); 
        const formattedDate = formatDate(noteDate); 
        const lockIndicator = note.password && note.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
       
        const noteAIbutton = !note.password || note.password === "" 
        ? `
        <button class="summarize-btn" 
                data-note-content="${note.content}" 
                data-note-title="${note.title}"
                onclick="handleSummarizeButtonClick(this); event.stopPropagation();">
                  
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";
        
        const noteAIbtn = note.password || note.password !== "" 
        ? `
        <button class="summarize-btn" 
        onclick="alert('Locked notes cannot be summarized due to security reasons'); event.stopPropagation();">
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";

        // Highlight title with search term
        const highlightedTitle = highlightSearchTerm(note.title, document.getElementById('searchInput').value.toLowerCase());

        noteDiv.innerHTML = `
        <div class="note" onclick="openNote(${index})">
            <div class="note-header">
                <h4>${highlightedTitle}</h4>
                ${lockIndicator}
            </div>
            <span class="note-date">${formattedDate}</span>
           
            <button class="delete-btn" onclick="deleteNote(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
        </div>
        `;
        container.appendChild(noteDiv);
    });

    // Display lists
    filteredLists.forEach((list, index) => {
        const listDiv = document.createElement("div");
        const listDate = new Date(list.date); // Convert the stored date string back to a Date object
        const formattedDate = formatDate(listDate); // Format the date for display
        const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
        // Highlight list name with search term
        const highlightedListName = highlightSearchTerm(list.title, document.getElementById('searchInput').value.toLowerCase());

        listDiv.innerHTML = `
     <div class="list" onclick="openList(${index})">    
  <i class="fas fa-list"></i>
  <div class="note-header">
     <h4>${highlightedListName}</h4>
    ${loclIndicator}
    </div>
  <span class="list-date">${formattedDate}</span>
   <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
        `;
        
        container.appendChild(listDiv);
    });
}

// Function to perform search and display highlighted notes and lists
let aiSearchTimeout;

function searchNotes() {
 
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === "") return;


        const filteredNotes = notes.filter(note =>
            note?.title?.toLowerCase().includes(searchTerm)
        );
        const filteredLists = lists.filter(list =>
            list?.title?.toLowerCase().includes(searchTerm)
        );

       
    displayFilteredNotesAndLists(filteredNotes, filteredLists);
    
    document.getElementById('clearSearch').style.display = "block";
    if (searchTerm == "") {
        clearSearch();
    }
}

function clearSearch() {
  const search = document.getElementById('searchInput');
search.value = "";
displayNotes();
displayLists();
document.getElementById('clearSearch').style.display = "none";
}

// Attach event listener
document.getElementById('searchInput').addEventListener('input', searchNotes);

async function searchWithAI(searchTerm) {
    console.log("AI search triggered for:", searchTerm);
    const searchInput = document.getElementById('searchInput');

   

const filteredNotes = notes.filter(note =>
            note?.title?.toLowerCase().includes(searchTerm)
        );
        const filteredLists = lists.filter(list =>
            list?.title?.toLowerCase().includes(searchTerm)
        );

    if (filteredNotes.length === 0 && filteredLists.length === 0) {
        noNotesMessage.classList.remove("hidden");
    } else {
        noNotesMessage.classList.add("hidden");
    }

    const noListsMessage = document.getElementById("noListsMessage"); // Get

    if (filteredLists.length === 0) {
noListsMessage.classList.remove("hidden"); // Show the no lists message
  } else {
    noListsMessage.classList.add("hidden");
  }

    // Display notes
    
    filteredNotes.forEach((note, index) => {
        const noteDiv = document.createElement("div");
        const noteDate = new Date(note.date); // Convert the stored date string back to a Date object
        const formattedDate = formatDate(noteDate); // Format the date for display
        const lockIndicator = note.password && note.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
       
        const noteAIbutton = !note.password || note.password === "" 
        ? `
        <button class="summarize-btn" 
                data-note-content="${note.content}" 
                data-note-title="${note.title}"
                onclick="handleSummarizeButtonClick(this); event.stopPropagation();">
                  
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";
        
        const noteAIbtn = note.password || note.password !== "" 
        ? `
        <button class="summarize-btn" 
        onclick="alert('Locked notes cannot be summarized due to security reasons'); event.stopPropagation();">
            <i class="fas fa-magic"></i> Summarize Note
        </button>
        ` 
        : "";

        // Highlight title with search term
        const highlightedTitle = highlightSearchTerm(note.title, document.getElementById('searchInput').value.toLowerCase());

        noteDiv.innerHTML = `
        <div class="note" onclick="openNote(${index})">
            <div class="note-header">
                <h4>${highlightedTitle}</h4>
                ${lockIndicator}
            </div>
            <span class="note-date">${formattedDate}</span>
           <button class="delete-btn" onclick="deleteNote(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
        </div>
        `;
        container.appendChild(noteDiv);
    });

    // Display lists
      
    filteredLists.forEach((list, index) => {
     
      const listDiv = document.createElement("div");
const listDate = new Date(list.date); // Convert the stored date string back to a Date object
    const formattedDate = formatDate(listDate); // Format the date for display
    const loclIndicator = list.password && list.password !== "" ? ' <i class="fas fa-lock"></i>' : "";
        // Highlight list name with search term
        const highlightedListName = highlightSearchTerm(list.title, document.getElementById('searchInput').value.toLowerCase());

        listDiv.innerHTML = `
     <div class="list" onclick="openList(${index})">    
  <i class="fas fa-list"></i>
  <div class="note-header">
     <h4>${highlightedListName}</h4>
    ${loclIndicator}
    </div>
  <span class="list-date">${formattedDate}</span>
   <button class="delete-btn" onclick="deleteList(${index}); event.stopPropagation();"><i class="fas fa-trash"></i> Delete</button>
  </div>
        `;
        container.appendChild(listDiv);
    });

  }

function autocleansearch() {
const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === "") {
            clearSearch();
        }
}
