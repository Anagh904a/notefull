let selectionMode = false;
let longPressTimer;



function showSelectionMode() {
    const toolbar = document.getElementById('toolbar');
    const nav = document.getElementById('nav');
    const search = document.getElementById('header');
const sort = document.getElementById('sort');
const add = document.getElementById('add');

    toolbar.classList.add('active');
    nav.classList.add('hidden');
    search.classList.add('hidden');
    add.classList.add('hidden');
    sort.style.paddingTop = "80px";
     selectionMode = true;
    document.getElementById('menu').classList.add('hidden');
    //logic here
}

function closeSelectionMode() {
 const toolbar = document.getElementById('toolbar');
    const nav = document.getElementById('nav');
    const search = document.getElementById('header');
const sort = document.getElementById('sort');
const add = document.getElementById('add');

    toolbar.classList.remove('active');
    nav.classList.remove('hidden');
     search.classList.remove('hidden');
       add.classList.remove('hidden');
       sort.style.paddingTop = "0px";
     selectionMode = false;
     displayNotes();
     displayLists();
}


