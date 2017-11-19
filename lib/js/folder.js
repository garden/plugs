// Roaming motor behind the folder app.
// It is used whenever a user hits a directory file.
// The following code is covered by the AGPLv3 license.

(function() {

// Globals.
//

function encodePath(path) {
  return encodeURIComponent(path).replace(/%2F/g, unescape);
}

// Useful DOM Elements.
var toolbar = document.getElementById('toolbar');
var search = document.getElementById('search');
var filelist = document.getElementById('filelist');

// Current working directory.
var cwd = decodeURIComponent(document.location.pathname);
if (cwd[cwd.length-1] !== '/') cwd += '/';
window.cwd = cwd;

// Fast search init.
var leaves = [];
(function() {
  var links = document.querySelectorAll('#filelist>li>a');
  for (var i = 0; i < links.length; i++) {
    var path = links[i].textContent;
    var href = links[i].href;
    var type = 'file';
    if (href[href.length-1] === '/') { path += '/'; type = 'folder'; }
    leaves.push({path:path, meta:{type: type}});
  }
})();


// Toolbar controls.
//

(function() {
  var methodFromFileType = { 'text': 'PUT', 'folder': 'MKCOL' };

  // File and folder creation.
  function handle(type) {
    // Handling newfile, newfolder.
    var newFile = document.getElementById('new' + type);
    newFile.addEventListener('click', function() {
      var name = search.value;
      if (name === '') {
        search.value = type; search.focus(); search.select(); return false;
      }
      var xhr = new XMLHttpRequest();
      var newPath = cwd + name;
      xhr.open(methodFromFileType[type], newPath, true);
      xhr.onload = function(r) {
        if (xhr.status  < 200 || xhr.status >= 300) {
          alert("Creating new file failed: " + xhr.status + " " + xhr.statusText);
        } else if (newPath) {
          document.location = encodePath(newPath);
        }
      };
      xhr.send(null);
    });
  };
  handle('folder');
  handle('text');
  // handle('binary');
  // handle('link');

  // Multiple file uploads.
  var uploader = document.getElementById('uploader');
  var upform = document.getElementById('upform');
  var chooser = upform.content;
  upform.action = cwd;
  uploader.onload = function (event) {
    try {
      if (uploader.contentDocument.location.pathname === cwd) {
        window.location.reload(true);
      }
    } catch(e) { alert("Failed upload"); }
  };
  chooser.onchange = function (event) {
    if (chooser.value.length > 0) upform.submit();
  };
  document.getElementById('upload').onclick = function (event) {
    chooser.click();
  };

  // Drag-and-drop file upload.
  var fileDropHoverDepth = 0;
  filelist.addEventListener('dragover', function(event) {
    event.dataTransfer.dropEffect = 'copy';
    event.preventDefault();
    return false;
  });
  filelist.addEventListener('dragenter', function(event) {
    fileDropHoverDepth++;
    filelist.classList.add('dropfile');
  });
  var removeDragOverClass = function(event) {
    fileDropHoverDepth--;
    if (fileDropHoverDepth === 0) {
      filelist.classList.remove('dropfile');
    }
  };
  filelist.addEventListener('dragleave', removeDragOverClass);
  filelist.addEventListener('dragend', removeDragOverClass);
  filelist.addEventListener('drop', function(event) {
    event.stopPropagation();
    event.preventDefault();
    var files = event.dataTransfer.files;
    chooser.files = files;

    filelist.classList.remove('dropfile');
    fileDropHoverDepth = 0;
  });
})();


// File navigation.
//

// State.
var pointer = -1;   // Item selected (-1 means "none").
var slots;          // DOM slots wherein you may show a cursor, or a space.
                    // (Those are initialized by the `init` function).
var fileSelectionEventListenerReset = [];
var fileHoverEventListenerReset = [];
var hoverSetsCursor = null;

// Initializes the `slots` list and sets up event listeners on them.
function initSlots() {
  slots = document.querySelectorAll('#filelist>li');
  setCursor(pointer);

  // File selection.
  for (var i = 0, len = fileSelectionEventListenerReset.length; i < len; i++) {
    fileSelectionEventListenerReset[i]();
  }
  fileSelectionEventListenerReset = [];
  for (var i = 0; i < slots.length; i++) {
    slots[i].addEventListener('click', (function(i) {
      var onclick = function onclick(e) {
        var nomod = !(e.ctrlKey || e.shiftKey || e.altKey || e.metaKey);
        if (nomod) toggleAddToSelection(i);
      };
      var slot = slots[i];
      fileSelectionEventListenerReset.push(function resetOnClick() {
        slot.removeEventListener('click', onclick);
      });
      return onclick;
    }(i)));
  }
  initHoverListn(slots);
  selectedFile = {};
  nSelectedFiles = 0; // Number of selected files.
}

function initHoverListn() {
  for (var i = 0, len = fileHoverEventListenerReset.length; i < len; i++) {
    fileHoverEventListenerReset[i]();
  }
  fileHoverEventListenerReset = [];
  for (var i = 0; i < slots.length; i++) {
    slots[i].addEventListener('mouseenter', (function(i) {
      var onhover = function() { hoverSetCursor(i); };
      var slot = slots[i];
      fileHoverEventListenerReset.push(function resetOnHover() {
        slot.removeEventListener('mouseenter', onhover);
      });
      return onhover;
    }(i)));
  }
}

// Initialization occurs when the drop down entries are reset (or started). The
// entries already have the cursor.
function init () {
  // If there is an entry, set the pointer to the first entry.
  if (filelist.children.length > 0) { // If there is at least one entry...
    pointer = 0;        // ... set the pointer to the first item.
  }

  // Populate slots.
  initSlots();

  // Set the event listener.
  addEventListener('keydown', keyListener, false);
}

init();


function hoverSetCursor (entry) {
  if (hoverSetsCursor != null) return;
  setCursor(entry);
}

function keyboardSetCursor (entry) {
  clearTimeout(hoverSetsCursor);
  setCursor(entry);
  var box = slots[pointer].getBoundingClientRect();
  var viewportHeight = window.innerHeight;
  // We remove 30px for the top toolbar.
  var boxAbove = box.top - toolbar.clientHeight;
  var boxBelow = box.bottom - viewportHeight;
  var slotAbove = boxAbove < 0;
  var slotBelow = boxBelow > 0;
  var slotInvisible = slotAbove || slotBelow;
  if (slotInvisible) {
    hoverSetsCursor = false;
    if (slotAbove) {
      filelist.scrollTop += boxAbove;
    } else if (slotBelow) {
      filelist.scrollTop += boxBelow;
    }
    // Temporarily deactivate "hover selects slot".
    hoverSetsCursor = setTimeout(function() { hoverSetsCursor = null; }, 100);
  }
}

// Set the cursor to the entry specified.
//
// entry :: Number
function setCursor (entry) {
  if (slots.length === 0) return;
  entry %= slots.length;
  if (entry < 0) { entry = slots.length - 1; }
  if (pointer >= 0) { slots[pointer].classList.remove('focus'); }
  pointer = entry;
  slots[pointer].classList.add('focus');
}

var cursorIncrement = 1;
var cursorIncrementTimeout;
function tweakCursorIncrement () {
  // If the timeout is not cleared, we must increase the cursor increment.
  if (cursorIncrementTimeout != null) cursorIncrement += 0.1;
  clearTimeout(cursorIncrementTimeout);
  cursorIncrementTimeout = setTimeout(function() { cursorIncrement = 1; }, 100);
}
function nextEntry () {
  tweakCursorIncrement();
  keyboardSetCursor(pointer + (cursorIncrement >>> 0));
}
function prevEntry () {
  tweakCursorIncrement();
  keyboardSetCursor(pointer - (cursorIncrement >>> 0));
}


// When the search widget is focused, if the user presses up/down keys, and
// the enter key.
function keyListener (e) {
  var nomod = !(e.ctrlKey || e.shiftKey || e.altKey || e.metaKey);
  var empty = search.value.length === 0;
  if (nomod) {
    if (e.keyCode === 40) { // Down.
      nextEntry();
      e.preventDefault();  // Don't change the search cursor position.
    } else if (e.keyCode === 38) { // Up.
      prevEntry();
      e.preventDefault();  // Don't change the search cursor position.
    } else if (e.keyCode === 13 || (empty && e.keyCode === 39)) {
      // Enter or (Empty and Right).
      window.location = slots[pointer].firstElementChild.href;
    } else if (empty && (e.keyCode === 8 || e.keyCode === 37)) {
      // Empty and (Backspace or Left).
      var loc = window.location;
      window.location = loc.protocol + '//' + loc.host +
        loc.pathname.replace(/\/[^\/]+[\/]*$/,'/') + loc.search;
    }

    // Additional keys when the search widget is not focused.
    if (document.activeElement !== search) {
      if (e.keyCode === 74) {  // J (same as down).
        nextEntry();
      } else if (e.keyCode === 75) {  // K (same as up).
        prevEntry();
      } else if (e.keyCode === 88) {  // X (click).
        slots[pointer].click();
      } else if (e.keyCode === 191) {  // /.
        search.focus();
        e.preventDefault();  // Don't input it in the search bar.
      }
    } else {  // The search widget is focused.
      if (e.keyCode === 27) {  // ESC.
        search.blur();
      }
    }
  }
}

window.selectionInit = init;


// Fuzzy matching.
//

function sorter (file1, file2) { return file2.stars - file1.stars; }

// `leaf` is an Object like {path: '/', meta: {type: 'folder'}}
// `stars` is a Number to compare leaves according to the query.
// `indexes` is the positions of matched letters.
function Score(leaf, stars, indexes) {
  if (leaf.meta.type == 'folder' && leaf.path[leaf.path.length - 1] !== '/') {
    leaf.path += '/';  // FIXME server side bug
  }
  this.leaf = leaf;
  this.stars = (stars|0) || 0;
  this.indexes = indexes || [];
}

Score.prototype = {
  add: function(n) { this.stars += (n|0); },
};

// Return a Score object, {leaf, stars, indexes}:
//
// - `leaf` is an Object like {path: '/', meta: {type: 'folder'}}
// - `stars` is a Number to compare leaves according to the query.
// - `indexes` is the positions of matched letters.
//
// `leaf` is an Object like {path: '/', meta: {type: 'folder'}}
// `query` is a String to fuzzy match.
function score(leaf, query) {
  var queryLower = query.toLowerCase();
  var leafLower = leaf.path.toLowerCase();
  var score = new Score(leaf);
  var index = queryLower.length - 1;
  var countlettersmatched = 0;  // Consecutive letters matched.
  var alpha = /[a-zA-Z0-9]/;
  var lookingAhead = false;     // Grant one last run and terminate.
  // The idea is to begin with the end of the `query`, and for each letter
  // matched, the letter is captured, its position influences the score, and we
  // go to the next letter.
  for (var i = leafLower.length - 1; i >= 0; i--) {
    var l = leafLower[i];  // letter

    if (countlettersmatched > 0 && !alpha.test(l)) {
      score.add(2);
    }
    if (lookingAhead)  break;

    if (l === queryLower[index]) {
      score.indexes.push(i);
      score.add(1 + countlettersmatched);

      countlettersmatched++;
      index--;
    } else {
      countlettersmatched = 0;
    }
    if (index < 0)  lookingAhead = true;   // Grant last run now.
  }
  if (lookingAhead) { score.add(1); }
  return score;
}

// List of Scores = {leaf, stars, indexes}, ordered by the stars.
// Leaves that do not match the whole query are discarded.
//
// `leaves` is an Array of Objects with paths from here to the leaf.
// `query` is a String to fuzzy match.
function fuzzy (leaves, query) {
  var fuzzied = [];
  for (var i = 0; i < leaves.length; i++) {
    if (leaves[i].path.length === 0) continue;
    var sc = score(leaves[i], query);
    if (sc.indexes.length === query.length) {
      fuzzied.push(sc);
    }
  }
  return fuzzied.sort(sorter);
}

function htmlEscape(html) {
  return html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
}

// Return an html string with all matched letters in bold.
function scorify (score) {
  var path = score.leaf.path;
  var html = '';
  var beforelet = '<b>';
  var afterlet = '</b>';
  var index = 0;
  for (var i = score.indexes.length - 1; i >= 0; i--) {
    html += htmlEscape(path.slice(index, score.indexes[i])) + beforelet
      + htmlEscape(path[score.indexes[i]]) + afterlet;
    index = score.indexes[i] + 1; 
  }
  html += htmlEscape(path.slice(index));
  return html;
}

function countSlashes(path) {
  var count = 0;    // count slashes.
  for (var i = 0; i < path.length; i++) {
    if (path[i] === '/' && i !== path.length - 1) { count++; }
  }
  return count;
}

// List of Score = {leaf, stars, indexes}, ordered by the stars.
// Leaves that do not match the whole query are discarded.
//
// `leaves` is an Array of Objects with paths from here to the leaf.
// `query` is a String to fuzzy match.
function exactSearch(leaves, query) {
  var found = [];
  var querySlashes = countSlashes(query);
  if (query.length === 0) { querySlashes = -1; }
  for (var i = 0; i < leaves.length; i++) {
    leaves[i].path = leaves[i].path.replace(new RegExp('^' + cwd), '');
    if (leaves[i].path.length === 0) continue;
    var pathSlashes = countSlashes(leaves[i].path);
    if (leaves[i].path.slice(0, query.length) === query &&
        (pathSlashes === querySlashes || pathSlashes === querySlashes + 1)) {
      found.push(new Score(leaves[i]));
    }
  }
  return found;
}

// Display the search results on the page.
function showfuzzy () {
  var html = '';
  var query = search.value;
  var scores = [];
  // If it ends with a slash, do an exact search.
  if (query.length === 0 || query[query.length - 1] === '/') {
    scores = exactSearch(leaves, query);
  }
  if (scores.length === 0) {
    scores = fuzzy(leaves, query);
  }
  for (var i = 0;  i < scores.length;  i++) {
    // There is no remaining query (if the query is not complete, it is
    // not shown).
    var path = scorify(scores[i]);
    html += '<li class=' +
            (scores[i].leaf.meta.type === 'folder' ? 'folder' : 'file' ) +
            '><a href="' +
            encodePath(cwd + scores[i].leaf.path) + '">' + path + '</a></li>';
  }
  filelist.innerHTML = html;
  resetSelection();
  selectionInit();
}

search.addEventListener('input', showfuzzy, false);

// Fetch list of files.
(function() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', cwd + '?app=data', true);
  xhr.setRequestHeader('Depth', '2');
  xhr.onload = function() {
    var response = xhr.responseText;
    if (response) {
      leaves = populateLeaves(JSON.parse(xhr.responseText));
    }
  };
  xhr.send(null);
}());

function populateLeaves(files, leaves, path) {
  leaves = leaves || [];
  path = path || '';
  for (var filename in files) {
    if (path === '') { var subpath = filename; }
    else { var subpath = path + '/' + filename; }
    var subfiles = files[filename].files;
    leaves.push({
      path: subpath,
      meta: {type: files[filename].meta.type}
    });
    if (subfiles) { populateLeaves(subfiles, leaves, subpath); }
  }
  return leaves;
}



// File menus.
//

// File deletion.

var deleteFileBut = document.getElementById('deletefiles');
function onDeleteFile(event) {
  if (confirm('Do you really wish to delete'
              + (nSelectedFiles === 1
                ? (' this file?')
                : (' those ' + nSelectedFiles + ' files?')))) {
    Object.keys(selectedFile).forEach(function (selectedFileIndex) {
      var slot = slots[+selectedFileIndex];
      var href = slot.firstElementChild.getAttribute('href');
      if (href[0] !== '/') { href = cwd + href; }

      var xhr = new XMLHttpRequest();
      xhr.open('DELETE', href, true);
      xhr.onload = function() {
        if (xhr.status  < 200 || xhr.status >= 300) {
          alert('The file ' + href + ' did not get deleted: ' + xhr.status + ' '
              + xhr.statusText);
        } else {
          // Remove the item from the list.
          slot.parentNode.removeChild(slot);
          initSlots();
        }
      };
      xhr.send();
    });
  }
}
deleteFileBut.addEventListener('click', onDeleteFile);

// File configuration.

var confFileBut = document.getElementById('conffile');
function queryParams() {
  return window.location.search.slice(1).split('&').reduce(function(acc, param) {
    var parts = param.split('=');
    var key = parts[0], value = parts[1];
    if (acc[key] instanceof Array) {
      acc[key].push(value);
    } else if (acc[key] !== undefined) {
      acc[key] = [acc[key], value];
    } else {
      acc[key] = value;
    }
    return acc;
  }, Object.create(null));
}
function searchFromQueryParams(params) {
  var search = '?';
  for (key in params) {
    if (params[key] instanceof Array) {
      for (var i = 0; i < params[key].length; i++) {
        search += encodeURIComponent(key) + '=' + encodeURIComponent(params[key][i]) + '&';
      }
    } else {
      search += encodeURIComponent(key) + '=' + (params[key] !== undefined? encodeURIComponent(params[key]): '') + '&';
    }
  }
  return search.slice(0, -1);
}
function onConfFile(event) {
  var selIdx = 0;
  for (var i in selectedFile) { selIdx = i; break; }
  window.location = slots[selIdx].firstElementChild.href + searchFromQueryParams({app: 'conf'});
}
confFileBut.addEventListener('click', onConfFile);


// Map from slot index to truthy values, true if they're selected.
var selectedFile = Object.create(null);
var nSelectedFiles = 0; // Number of selected files.

// Add slot of index i to the selection of files,
// or remove from the selection if it is selected.
function toggleAddToSelection(i) {
  if (!!selectedFile[i]) {
    // It is already selected.
    delete selectedFile[i];
    nSelectedFiles--;
    slots[i].classList.remove('selected-file');
    if (nSelectedFiles <= 0) {
      // Hide the file-specific buttons.
      deleteFileBut.style.display = 'none';
      confFileBut.style.display = 'none';
    } else if (nSelectedFiles === 1) {
      deleteFileBut.title = 'Delete file';
      confFileBut.style.display = 'block';
      confFileBut.title = 'Configure file';
    }
  } else {
    // Select it.
    selectedFile[i] = true;
    nSelectedFiles++;
    slots[i].classList.add('selected-file');
    if (nSelectedFiles === 1) {
      // Show the file-specific buttons.
      deleteFileBut.style.display = 'block';
      deleteFileBut.title = 'Delete file';
      confFileBut.style.display = 'block';
      confFileBut.title = 'Configure file';
    } else if (nSelectedFiles > 1) {
      deleteFileBut.title = 'Delete files';
      confFileBut.style.display = 'none';
    }
  }
}

// Unselect all selected files.
function resetSelection() {
  for (var selectedFileIndex in selectedFile) {
    toggleAddToSelection(selectedFileIndex);
  }
}



}) ();
