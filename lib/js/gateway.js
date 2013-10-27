// Roaming motor behind the gateway system.
// It is used whenever a user hits a directory file.
// Copyright © 2011-2013 Thaddee Tyl, Jan Keromnes. All rights reserved.
// The following code is covered by the GPLv2 license.

(function() {

// Globals.
//

function encodePath(path) {
  return encodeURIComponent(path).replace(/%2F/g, unescape);
}

// Useful DOM Elements.
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
    if (href[href.length-1] === '/') { path += '/'; type = 'dir'; }
    leaves.push({path:path, meta:{type: type}});
  }
})();


// Toolbar controls.
//

(function() {
  // File and folder creation.
  function handle(type) {
    // Handling newfile, newfolder.
    Scout('#new' + type).on('click', function(query) {
      var name = search.value;
      if (name === '') {
        search.value = type; search.focus(); search.select(); return false;
      }
      query.action = 'fs';
      query.data = {op: 'create', path: cwd + name};
      query.data.type = type;
      query.resp = function (data) {
        if (data.err) console.error(data.err);
        else if (data.path) {
          document.location = encodePath(data.path);
        }
      };
    });
  };
  handle('dir');
  handle('text');
  // handle('binary');
  // handle('link');

  // Multiple file uploads.
  var uploader = document.getElementById('uploader');
  var upform = document.getElementById('upform');
  var chooser = upform.upload;
  upform.path.value = cwd;
  uploader.onload = function (event) {
    window.location.reload(true);
  };
  chooser.onchange = function (event) {
    if (chooser.value.length > 0) upform.submit();
  };
  document.getElementById('upload').onclick = function (event) {
    chooser.click();
  };
})();


// File navigation.
//

// State.
var pointer = -1;   // Item selected (-1 means "none").
var slots;          // DOM slots wherein you may show a cursor, or a space.
                    // (Those are initialized by the `init` function).

// Initialization occurs when the drop down entries are reset (or started). The
// entries already have the cursor.
function init () {
  // If there is an entry, set the pointer to the first entry.
  if (filelist.children.length > 0) { // If there is at least one entry...
    pointer = 0;        // ... set the pointer to the first item.
  }

  // Populate slots.
  slots = document.querySelectorAll('#filelist>li');

  setCursor(0);     // Put the cursor on the first entry.

  // Set the event listener.
  addEventListener('keydown', keyListener, false);
}

init();


// Set the cursor to the entry specified.
//
// `entry` is a Number.
function setCursor (entry) {
  if (slots.length === 0) return;
  entry %= slots.length;
  if (entry < 0)  entry = slots.length - 1;
  if (pointer >= 0)  { slots[pointer].classList.remove('focus'); }
  pointer = entry;
  slots[pointer].classList.add('focus');
  slots[pointer].scrollIntoView(false);
}

function nextEntry () { setCursor(pointer + 1); }

function prevEntry () { setCursor(pointer - 1); }


// When the search widget is focused, if the user presses up/down keys, and
// the enter key.
function keyListener (e) {
  var empty = search.value.length === 0;
  if (e.keyCode === 40) {
    // Down.
    nextEntry();
    hideMenu();
    e.preventDefault();
  } else if (e.keyCode === 38) {
    // Up.
    prevEntry();
    hideMenu();
    e.preventDefault();
  } else if (e.keyCode === 13 || (empty && e.keyCode === 39)) {
    // Enter or (Empty and Right).
    window.location = slots[pointer].firstElementChild.href;
  } else if (empty && (e.keyCode === 8 || e.keyCode === 37)) {
    // Empty and (Backspace or Left).
    //history.go(-1);
    var loc = window.location;
    window.location = loc.protocol + '//' + loc.host +
      loc.pathname.replace(/\/[^\/]+[\/]*$/,'/') + loc.search;
  }
}

window.selectionInit = init;


// Fuzzy matching.
//

function sorter (file1, file2) { return file2.stars - file1.stars; }

// `leaf` is an Object like {path: '/', meta: {type: 'dir'}}
// `stars` is a Number to compare leaves according to the query.
// `indexes` is the positions of matched letters.
function Score(leaf, stars, indexes) {
  if (leaf.meta.type == 'dir' && leaf.path[leaf.path.length - 1] !== '/') {
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
// - `leaf` is an Object like {path: '/', meta: {type: 'dir'}}
// - `stars` is a Number to compare leaves according to the query.
// - `indexes` is the positions of matched letters.
//
// `leaf` is an Object like {path: '/', meta: {type: 'dir'}}
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
    leaves[i].path = leaves[i].path.replace(new RegExp('^' + cwd), '');
    if (leaves[i].path.length === 0) continue;
    var sc = score(leaves[i], query);
    if (sc.indexes.length === query.length) {
      fuzzied.push(sc);
    }
  }
  return fuzzied.sort(sorter);
}

// Return an html string with all matched letters in bold.
function scorify (score) {
  var htmled = score.leaf.path;
  var offset = 0;
  var beforelet = '<b>';
  var afterlet = '</b>';
  var addition = beforelet.length + afterlet.length;
  for (var i = score.indexes.length - 1; i >= 0; i--) {
    htmled = htmled.slice(0, score.indexes[i] + offset) + beforelet
      + htmled[score.indexes[i] + offset] + afterlet
      + htmled.slice(score.indexes[i] + offset + 1);
    offset += addition;
  }
  return htmled;
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
            (scores[i].leaf.meta.type === 'dir' ? 'folder' : 'file' ) +
            '><a href="' +
            encodePath(scores[i].leaf.path) + '">' + path + '</a></li>';
  }
  filelist.innerHTML = html;
  selectionInit();
  hideMenu();
  initializeMenus();
}

search.addEventListener('input', showfuzzy, false);

Scout.send(function(q) {
  q.action = 'fs';
  q.data = {op:'read', path:cwd, depth:2};
  q.resp = function (r) { leaves = r.files; };
}) ();



// File menus.
//


var menuUI = document.getElementById('filemenu');
function initializeMenus() {
  for (var i = 0; i < slots.length; i++) {
    slots[i].addEventListener('click',
                             (function(menu, i) { return function onclick() {
      // Show the menu UI at the correct spot.
      var offTop = menu.getBoundingClientRect().bottom;
      menuUI.style.top = offTop + 'px';
      // Put stuff in there.
      menuUI.innerHTML = '';
      var deleteBut = document.createElement('button');
      deleteBut.classList.add('incrusted');
      deleteBut.textContent = 'Delete';
      deleteBut.onclick = function() {
        Scout.send(function(query, xhr) {
          query.action = 'fs';
          query.data = {
            op: 'rm',
            path: menu.firstElementChild.getAttribute('href'),
          };
          query.resp = function(data) {
            if (data.err != null) {
              alert('The file did not get deleted for some unspecified reason.'
                + ' Please reload.');
              return;
            }
            // Remove the item from the list.
            menu.parentNode.removeChild(menu);
            hideMenu();
          };
        })();
      };
      menuUI.appendChild(deleteBut);
      // Show it.
      setCursor(i);
      menuUI.style.display = 'block';
      // Prepare toggling.
      menu.removeEventListener('click', onclick);
      menu.addEventListener('click', function hideMenuHandler() {
        hideMenu();
        menu.removeEventListener('click', hideMenuHandler);
        menu.addEventListener('click', onclick);
      });
    };}(slots[i], i)));
  }
}

function hideMenu() { menuUI.style.display = 'none'; }

initializeMenus();


}) ();
