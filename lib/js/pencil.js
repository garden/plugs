// Some scripting for the Pencil.
// It is used whenever a user edits a file with the Pencil.
// Copyright © 2011 Thaddée Tyl, Jan Keromnes. All rights reserved.
// The following code is covered by the GPLv2 license.


// Controls
//

// Theme button
function selectTheme(node) {
  window.cm.setOption('theme', node.options[node.selectedIndex].innerHTML);
};

function stopEvent (e) {
  if (e.preventDefault) { e.preventDefault(); }
  if (e.stopPropagation) { e.stopPropagation(); }
};


// Code execution
//

var loadScript = function(path) {
  return new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.addEventListener('load', function() {
      // Execute the script.
      resolve();
    });
    script.addEventListener('error', reject);
    script.async = false;
    script.src = path;
    document.head.appendChild(script);
  });
};

// Code execution environments
var environment = (function() {

  var validate = Scout('#validate'),
      preview = Scout('#preview'),
      run = Scout('#run'),
      download = Scout('#download');

  var env = {
    'text/html': function(path) {
      unicorn('text/html')();
      plug(preview, 'html')(path);
      plug(run, 'none')(path);
      download.style.display = 'none';
    },
    'text/javascript': setJS,
    'text/x-latex': plug(preview, 'latex'),
    'text/x-markdown': function(path) {
      cm.addKeyMap({
        Enter: "newlineAndIndentContinueMarkdownList"
      });
      plug(preview, 'livemarkdown')(path);
      plug(run, 'markdown')(path);
    },
    'text/x-sequence': plug(preview, 'sequence'),
    'text/css': unicorn('text/css'),
    'text/xml': unicorn('text/xml'),
    'text/vnd.abc': music,
    'text/x-ada': ideone(7),
    'text/x-asm': ideone(13),
    'text/x-assembler': ideone(45),
    'text/x-awk': ideone(104),
    'text/x-bc': ideone(110),
    'text/x-brainfuck': ideone(12),
    'text/x-csharp': ideone(27),
    'text/x-clips': ideone(14),
    'text/x-clojure': ideone(111),
    'text/x-cobol': ideone(118),
    'text/x-common-lisp': ideone(32),
    'text/x-csrc': codepad('C'),
    'text/x-c++src': codepad('C++'),
    'text/x-dsrc': codepad('D'),
    'text/x-erlang': ideone(36),
    'text/x-factor': ideone(123),
    'text/x-falcon': ideone(125),
    'text/x-forth': ideone(107),
    'text/x-fortran': ideone(5),
    'text/x-fsharp': ideone(124),
    'text/x-go': ideone(114),
    'text/x-groovy': ideone(121),
    'text/x-haskell': codepad('Haskell'),
    'text/x-icon': ideone(16),
    'text/x-intercal': ideone(9),
    'text/x-java': ideone(55),
    'text/x-lisp': ideone(32),
    'text/x-lua': codepad('Lua'),
    'text/x-mysql': ideone(40),
    'text/x-nemerle': ideone(30),
    'text/x-nice': ideone(25),
    'text/x-nimrod': ideone(122),
    'text/x-objectivec': ideone(43),
    'text/x-ocaml': codepad('OCaml'),
    'text/x-oz': ideone(119),
    'text/x-pascal': ideone(2),
    'text/x-perl': codepad('Perl'),
    'text/x-php': codepad('PHP'),
    'text/x-pike': ideone(19),
    'text/x-prolog': ideone(15),
    'text/x-python': ideone(116),
    'text/x-ruby': codepad('Ruby'),
    'text/x-rsrc': ideone(117),
    'text/x-scheme': codepad('Scheme'),
    'text/x-scala': ideone(39),
    'text/x-sh': ideone(28),
    'text/x-smalltalk': ideone(23),
    'text/x-tcl': codepad('Tcl'),
    'text/x-unlambda': ideone(115),
    'text/x-vb': ideone(101),
    'text/x-whitespace': ideone(6)
  };

  // Connect an anchor element to a plug
  function plug(element, plug) {
    return function(path) {
      element.style.display = 'inline-block';
      element.href = path + '?plug=' + plug;
    }
  }

  // Run JavaScript inside the page
  function setJS() {
    run.style.display = 'inline-block';
    run.onclick = function(e) {
      var init = "var console = {}, logs = '';\
      function log(msg) { logs += msg + '\\n'; }\
      console.log = log;\
      console.error = log;\
      console.warn = log;\n";
      var finit = ";logs";
      try {
        localeval(init + window.cm.getValue() + finit, {},
        5000, function(err, res) {
          if (err != null) {
            alert(err);
          } else {
            alert(res? res: 'No errors!');
          }
        });
      } catch (e) { alert(e); }
      stopEvent(e);
    }
  }

  var worker;
  function startChild() {
    worker = new Worker('/lib/js/localeval-worker.js');
  }

  // Worker to run JS code.
  // See <https://github.com/espadrine/localeval>.
  function localeval(source, sandbox, timeout, cb) {
    if (worker == null) {
      startChild();
    }
    var th = setTimeout(function() {
      worker.terminate();
      if (cb) {
        cb(new Error("The script took more than " + (timeout / 1000)
            + "ms. Abort."));
      }
      startChild();
    }, timeout);
    worker.onmessage = function(m) {
      clearTimeout(th);
      if (cb) { cb(null, m.data.result); }
    };
    worker.postMessage({ code: source, sandbox: sandbox });
  }

  // Export code to Codepad for remote execution
  function codepad(lang) {
    return function() {
      document.export.action = run.href = 'http://codepad.org/';
      document.export.lang.value = lang;
      run.style.display = 'inline-block';
      run.onclick = function(e) {
        document.export.code.value = cm.getValue();
        document.export.submit();
        stopEvent(e);
      }
    }
  }

  // Export code to IDEone
  function ideone(lang) {
    return function() {
      document.export.action = 'http://ideone.com/ideone/Index/submit/';
      document.export.lang.value = lang;
      document.export.run.value = 1;
      run.href = 'http://ideone.com/';
      run.style.display = 'inline-block';
      run.onclick = function(e) {
        document.export.file.value = cm.getValue();
        document.export.submit();
        stopEvent(e);
      }
    }
  }

  // Export code to Unicorn for HTML/CSS/XML validation
  function unicorn(mime) {
    return function () {
      document.export.action = 'http://validator.w3.org/unicorn/check#validate-by-input';
      document.export.ucn_text_mime.value = mime;
      validate.href = 'http://validator.w3.org/unicorn/';
      validate.style.display = 'inline-block';
      validate.onclick = function(e) {
        document.export.ucn_text.value = cm.getValue();
        document.export.submit();
        stopEvent(e);
      }
    }
  }

  // Import musical files.
  function music() {
    var files = [
      "/lib/midi/shim/Base64.js",
      "/lib/midi/shim/Base64binary.js",
      "/lib/midi/shim/WebAudioAPI.js",
      "/lib/midi/js/audioDetect.js",
      "/lib/midi/js/gm.js",
      "/lib/midi/js/loader.js",
      "/lib/midi/js/plugin.audiotag.js",
      "/lib/midi/js/plugin.webaudio.js",
      "/lib/midi/js/plugin.webmidi.js",
      "/lib/midi/util/dom_request_xhr.js",
      "/lib/midi/util/dom_request_script.js",
      "/lib/midi/song.js"
    ];
    return Promise.all(files.map(loadScript)).then(function() {
      return loadMidi();
    }).then(function() {
      var playing = false;
      var playTimeout;
      var icon = run.firstElementChild;
      run.style.display = 'inline-block';

      var uiStopSong = function() {
        playing = false;
        clearTimeout(playTimeout);
        icon.src = '/lib/icons/play.png';
      };
      var uiPlaySong = function(duration) {
        playing = true;
        playTimeout = setTimeout(uiStopSong, duration * 1000);
        icon.src = '/lib/icons/stop.png';
      };
      run.addEventListener('click', function() {
        if (playing) {
          stopSong();
          uiStopSong();
        } else {
          // We were not playing a song.
          var duration = 0;
          if (cm.somethingSelected()) {
            // Play the currently selected piece.
            duration = playSong(cm.getSelection());
          } else {
            // Start playing from the cursor position.
            var cursor = cm.getCursor();
            var song = cm.getRange(cursor, {
              line: cm.lastLine(),
              ch: Infinity
            });
            duration = playSong(song);
          }
          uiPlaySong(duration);
        }
      });
      // Play notes as they are entered.
      cm.on('change', function(cm, change) {
        if ((change.text.length === 1) &&
        change.origin === '+input' &&
        /^[a-gA-G,']$/.test(change.text[0])) {
          var line = cm.getLine(change.to.line);
          var end = change.to.ch + 1;
          var start = end - 1;
          // Go to the start of the note.
          for (; start >= 0; start--) {
            if (/^[a-gA-G]$/.test(line[start])) {
              break;
            }
          }
          // Go to the start of the accidentals.
          for (; start > 0 && /^[\^_=]$/.test(line[start - 1]); start--) {}
          if (start !== undefined) {
            playSong(line.slice(start, end));
          }
        }
      });
    });
  }

  return env;

})();


// Hot back navigation
//

(function() {

  // Hot back shortcut is active
  var hotback = true;

  // If a key is pressed...
  addEventListener('keydown', function(e) {

    // If hot back is active and (Backspace or Left), we go back.
    if (hotback && (e.keyCode === 8 || e.keyCode === 37)) {
      //history.go(-1);
      var loc = window.location;
      window.location = loc.protocol + '//' + loc.host +
        loc.pathname.replace(/\/[^\/]+[\/]*$/,'/') + loc.search;
    }

    // If not Right, we deactivate hot back
    else if (e.keyCode !== 39) {
      hotback = false;
    }

  }, false);

  // If the user clicks, deactivate hot back
  addEventListener('mousedown', function() {hotback = false;});

})();


// Speech dictation
(function setupSpeechRecognition() {

  var SpeechRecognition = window.SpeechRecognition ||
    window.webkitSpeechRecognition || window.mozSpeechRecognition;
  if (!SpeechRecognition) return;

  var recognizer = new SpeechRecognition();
  var button = document.getElementById('dictate');
  var active = false;

  recognizer.continuous = true;
  recognizer.onerror = function(e) { console.error(e); }
  recognizer.onresult = function(r) {
    var result = r.results[r.resultIndex];
    if (result.isFinal) cm.replaceRange(result[0].transcript, cm.getCursor());
  }
  recognizer.onstart = function() {
    active = true;
    cm.focus();
    button.firstElementChild.src = '/lib/icons/recording.png'
    button.firstElementChild.title = 'stop dictating';
  }
  recognizer.onend = function() {
    active = false;
    button.firstElementChild.src = '/lib/icons/microphone.png';
    button.firstElementChild.title = 'dictate';
  }

  dictate.onclick = function() {
    if (active) recognizer.stop(); else recognizer.start();
  }

  dictate.style.display = 'inline-block';

})();
