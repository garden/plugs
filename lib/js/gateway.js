// Roaming motor behind the gateway system.
// It is used whenever a user hits a directory file.
// Copyright © 2011 Thaddee Tyl, Jan Keromnes. All rights reserved.
// The following code is covered by the GPLv2 license.


// Controls.
//

(function() {
  var search = Scout('#search');
  function handle(type) {
    Scout('#new' + type).on('click', function(query) {
      var name = search.value;
      if (name === '') {
        search.value = type; search.focus(); search.select(); return false;
      }
      query.action = 'fs';
      query.data = {op: 'create', path: cwd + name};
      if (type === 'folder') query.data.type = 'dir';
      query.resp = function (data) {
        if (data.err) console.error(data.err);
        else if (data.path) document.location = data.path;
      };
    });
  };
  handle('file');
  handle('folder');
  // handle('link');
})();



// Navigation code.
//

(function(){
  var domfiles, dompath;   // DOM list in which we put the files in this directory.

  // Show the list of String files in the domfiles element.
  /* function setfiles(files) {
    var html = '';
    for (var i = 0; i < files.length; i++) {
      html += '<li class=' + (files[i].meta.type == 'dir' ? 'folder' : 'file') +
        '><a href="' + files[i].path + '">'
        + files[i].path + '</a></li>';
    }
    if (html.length === 0) {
      html += '<p>Nothing to see here!<br><a href="' + document.referrer +
        '">Go back.</a></p>';
    }
    domfiles.innerHTML = html;
  } */


  var cwd = unescape(document.location.pathname);  // common working directory.
  if (cwd[cwd.length-1] !== '/') cwd += '/';
  window.cwd = cwd;

  // Set cwd to what #pathreq holds.
  /* function chdir(newdir) {
    cwd = newdir[newdir.length-1] !== '/' ? newdir + '/' : newdir;
    var url = document.location;
    history.pushState(cwd, cwd, url.origin + url.port + cwd);
    Scout.send (getfs) ();
  }
  window.chdir = chdir;

  onpopstate = function (event) {
    cwd = event.state !== null ? event.state : cwd;
    Scout.send (getfs) ();
  }; */


  // Request information about the contents of a directory to the server.
  /* function getfs(query) {
    query.action = 'fs';
    query.data = {op:'read', path:cwd};
    query.resp = function (data) {
      if (!data.err) setfiles(data.files);
    };
    query.error = console.error;
  } */

  addEventListener('DOMContentLoaded', function (event) {
    domfiles = Scout('#files');
    dompath = Scout('#crumbs');
  }, false);

})();

  

// Fuzzy matching.
//

(function () {

var leaves = [];

function sorter (file1, file2) { return file2[1] - file1[1]; };

// Return [leaf, stars, indexes]:
//
// - `leaf` is a String of the path.
// - `stars` is a Number to compare leaves according to the query.
// - `indexes` is the positions of matched letters.
//
// `leaf` is an Object like {path: '/', date: 123456789, meta: {type: 'dir'}}
// `query` is a String to fuzzy match.
function score(leaf, query) {
  var stars = 0,
      index = query.length - 1,
      indexes = [],             // Position of matched letters.
      countlettersmatched = 0,  // Consecutive letters matched.
      alpha = /[a-zA-Z0-9]/,
      lookingAhead = false;     // Grant one last run and terminate.
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
// Leafs that do not match the whole query are discarded.
//
// `leaves` is an Array of Objects with paths from here to the leaf.
// `query` is a String to fuzzy match.
function fuzzy (leaves, query) {
  var fuzzied = [];
  for (var i = 0; i < leaves.length; i++) {
    leaves[i].path = leaves[i].path.replace(new RegExp('^' + cwd), '');
    if (leaves[i].path.length === 0) continue;
    if (leaves[i].meta.type == 'dir' && leaves[i].path[leaves[i].path.length - 1] !== '/')
      leaves[i].path += '/'; // FIXME server side bug
    var sc = score(leaves[i], query);
    if (sc[2].length === query.length) {
      fuzzied.push(sc);
    }
  }
  return fuzzied.sort(sorter);
}


// Return an html string with all matched letters in bold.
function scorify (score) {
  var htmled = score[0].path,
      offset = 0,
      beforelet = '<b>',
      afterlet = '</b>',
      addition = beforelet.length + afterlet.length;
  for (var i = score[2].length - 1; i >= 0; i--) {
    htmled = htmled.slice(0, score[2][i] + offset) + beforelet
      + htmled[score[2][i] + offset] + afterlet
      + htmled.slice(score[2][i] + offset + 1);
    offset += addition;
  }
  return htmled;
}


addEventListener('load', function () {
  var pathreq = Scout('#search'),
      depth = 2;  // default recursion level.

  // The very first time, we wait to load all leaves.
  pathreq.addEventListener('input', function firstfuzzy() {
    Scout.send(function(q) {
      q.action = 'fs';
      q.data = {op:'read', path:cwd, depth:depth};
      q.resp = function (r) {
        leaves = r.files;
        pathreq.removeEventListener('input', firstfuzzy, false);
        pathreq.addEventListener('input', showfuzzy, false);
        showfuzzy();
      };
    })();
  }, false);

  function showfuzzy () {
    var html = '',
        query = pathreq.value,
        scores = fuzzy(leaves, query);
    for (var i = 0;  i < scores.length;  i++) {
      // There is no remaining query (if the query is not complete, it is
      // not shown).
      var path = scorify(scores[i]);
      html += '<li class=' +
              (scores[i][0].meta.type === 'dir' ? 'folder' : 'file' ) +
              '><a href="' +
              encodeURIComponent(scores[i][0].path) + '">' + path + '</a></li>';
    }
    Scout('#filelist').innerHTML = html;
    selectionInit();
  }
}, false);


})();



// Manual selection
//

(function() {


// Constants.
var req, res;

addEventListener('load', function () {
  req = Scout('#search');
  res = Scout('#filelist').children;
  init();
}, false);

// State.
var pointer = -1,   // Item selected (-1 means "none").
    slots;          // DOM slots wherein you may show a cursor, or a space.
                    // (Those are initialized by the `init` function).

// Initialization occurs when the drop down entries are reset (or started). The
// entries already have the cursor.
function init () {
  // If there is an entry, set the pointer to the first entry.
  if (res.length > 0) { // If there is at least one entry...
    pointer = 0;        // ... set the pointer to the first item.
  }
  
  // Populate slots.
  slots = document.querySelectorAll('#filelist>li');
  
  setCursor(0);     // Put the cursor on the first entry.

  // Set the event listener.
  addEventListener('keydown', keyListener, false);
}

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
  var empty = Scout('#search').value.length === 0;
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

})();


