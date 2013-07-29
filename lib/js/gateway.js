// Roaming motor behind the gateway system.
// It is used whenever a user hits a directory file.
// Copyright © 2011-2013 Jan Keromnes, Thaddee Tyl. All rights reserved.
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
      query.data.type = (type === 'folder' ? 'dir' : 'text');
      query.resp = function (data) {
        if (data.err) console.error(data.err);
        else if (data.path) {
          document.location = encodePath(data.path);
        }
      };
    });
  };
  handle('file');
  handle('folder');
  // handle('link');

  // Multiple file uploads.
  var uploader = document.getElementById('uploader');
  var upform = document.getElementById('upform');
  var chooser = upform.upload;
  upform.path.value = cwd;
  uploader.onload = function (event) {
    window.location.reload(true);
  }
  chooser.onchange = function (event) {
    if (chooser.value.length > 0) upform.submit();
  }
  document.getElementById('upload').onclick = function (event) {
    chooser.click();
  }
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
    e.preventDefault();
  } else if (e.keyCode === 38) {
    // Up.
    prevEntry();
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

function sorter (file1, file2) { return file2[1] - file1[1]; }

// Return [leaf, stars, indexes]:
//
// - `leaf` is a String of the path.
// - `stars` is a Number to compare leaves according to the query.
// - `indexes` is the positions of matched letters.
//
// `leaf` is an Object like {path: '/', date: 123456789, meta: {type: 'dir'}}
// `query` is a String to fuzzy match.
function score(leaf, query) {
  var stars = 0;
  var index = query.length - 1;
  var indexes = [];             // Position of matched letters.
  var countlettersmatched = 0;  // Consecutive letters matched.
  var alpha = /[a-zA-Z0-9]/;
  var lookingAhead = false;     // Grant one last run and terminate.
  // The idea is to begin with the end of the `query`, and for each letter
  // matched, the letter is captured, its position influences the score, and we
  // go to the next letter.
  for (var i = leaf.path.length - 1; i >= 0; i--) {
    var l = leaf.path[i];  // letter

    if (countlettersmatched > 0 && !alpha.test(l)) {
      stars += 2;   // first letter after non-alphanumeric character is good.
    }

    if (l === query[index]) {
      indexes.push(i);
      stars++;      // match!
      stars += countlettersmatched;     // Consecutive matches is good.

      countlettersmatched++;
      index--;
    } else {
      countlettersmatched = 0;
    }
    if (lookingAhead)  break;       // The last run was already granted.
    else if (index < 0)  lookingAhead = true;   // Grant last run now.
  }
  if (lookingAhead)  stars++;
  return [leaf, stars, indexes];
}

// List of [leafpath, stars, indexes], ordered by the stars.
// Leaves that do not match the whole query are discarded.
//
// `leaves` is an Array of Objects with paths from here to the leaf.
// `query` is a String to fuzzy match.
function fuzzy (leaves, query) {
  var fuzzied = [];
  for (var i = 0; i < leaves.length; i++) {
    leaves[i].path = leaves[i].path.replace(new RegExp('^' + cwd), '');
    if (leaves[i].path.length === 0) continue;
    if (leaves[i].meta.type == 'dir'
        && leaves[i].path[leaves[i].path.length - 1] !== '/') {
      leaves[i].path += '/';  // FIXME server side bug
    }
    var sc = score(leaves[i], query);
    if (sc[2].length === query.length) {
      fuzzied.push(sc);
    }
  }
  return fuzzied.sort(sorter);
}

// Return an html string with all matched letters in bold.
function scorify (score) {
  var htmled = score[0].path;
  var offset = 0;
  var beforelet = '<b>';
  var afterlet = '</b>';
  var addition = beforelet.length + afterlet.length;
  for (var i = score[2].length - 1; i >= 0; i--) {
    htmled = htmled.slice(0, score[2][i] + offset) + beforelet
      + htmled[score[2][i] + offset] + afterlet
      + htmled.slice(score[2][i] + offset + 1);
    offset += addition;
  }
  return htmled;
}

// Display the search results on the page.
function showfuzzy () {
  var html = '';
  var query = search.value;
  var scores = fuzzy(leaves, query);
  for (var i = 0;  i < scores.length;  i++) {
    // There is no remaining query (if the query is not complete, it is
    // not shown).
    var path = scorify(scores[i]);
    html += '<li class=' +
            (scores[i][0].meta.type === 'dir' ? 'folder' : 'file' ) +
            '><a href="' +
            encodePath(scores[i][0].path) + '">' + path + '</a></li>';
  }
  filelist.innerHTML = html;
  selectionInit();
}

search.addEventListener('input', showfuzzy, false);

Scout.send(function(q) {
  q.action = 'fs';
  q.data = {op:'read', path:cwd, depth:2};
  q.resp = function (r) {
    leaves = r.files;
  };
}) ();

}) ();
