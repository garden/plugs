// Take an ABC song. Return the duration in seconds.
var playSong = function(abc) {
  var midi = parseAbc(abc);
  return playMidi(midi);
};

var stopSong = function() {
  var mel = midiEvents.length;
  for (var i = 0; i < mel; i++) {
    midiEvents[i].disconnect(0);
  }
};

var midiEvents = [];

var playMidi = function(events) {
  var ctx = MIDI.getContext();
  var ct = ctx.currentTime;
  midiEvents = [];
  var dl = events.length;
  if (dl > 0) {
    var duration = events[dl - 1].start;
  }
  for (var i = 0; i < dl; i++) {
    var event = events[i];
    // MIDI.js bugfix, see https://github.com/mudcube/MIDI.js/issues/168.
    if (event.start >= ct) { event.start += ct; }
    if (event.type === 'channel') {
      if (event.subtype === 'noteOn') {
        midiEvents.push(MIDI.noteOn(event.channel, event.noteNumber,
          event.velocity, event.start));
      } else if (event.subtype === 'noteOff') {
        midiEvents.push(MIDI.noteOff(event.channel, event.noteNumber,
          event.start));
      }
    }
  }
  return duration;
};

var loadMidi = function() {
  return new Promise(function(resolve, reject) {
    MIDI.loadPlugin({
      soundfontUrl: "/lib/midi/instruments/",
      instrument: "acoustic_grand_piano",
      onsuccess: resolve,
      onerror: reject
    });
  })
};

// MIDI notes for A, B, C, ..., G.
var mainNotes = [69, 71, 60, 62, 64, 65, 67];

// text: String.
// The produced representation is a list of events of the type
// {type: "meta" / "channel", subtype, start}
// with type either "meta" or "channel", and subtype one of
// - for meta: setTempo (with a microsecondsPerBeat field)
// - for channel: noteOn, noteOff (with a noteNumber, channel, velocity fields)
var parseAbc = function(text) {
  var tok = new Tokenizer(text);
  var ts = tstate.main;  // Tokenizer state.
  var c;
  while (ts !== tstate.end) {
    c = tok.peek();
    ts = ts(tok, c) || (tok.char(), ts);
  }
  return tok.tokens;
};

// Tokenizer states.
var tstate = {
  main: function(tok, c) {
    if (isAccidental(c)) {
      tok.startToken();
      return tstate.accidental;
    } else if (isNote(c)) {
      tok.startToken();
      return tstate.letter;
    } else if (c === '[') {
      tok.inChord = true;
    } else if (c === ']') {
      return tstate.endChord;
    } else if (c === undefined) {
      return tstate.end;
    }
  },
  end: function(tok, c) {},

  // A note has the following elements:
  // [accidental] letter [octave] [duration].

  accidental: function(tok, c) {
    if (isNote(c)) {
      return tstate.letter;
    } else if (c === '^') {
      tok.accidental++;
    } else if (c === '_') {
      tok.accidental--;
    }
  },

  // We are on a letter.
  letter: function(tok, c) {
    tok.note = tok.char().charCodeAt(0);
    if (tok.note >= 97) {  // Higher-pitched (a-g instead of A-G).
      tok.note -= 32;  // Convert to A-G.
      tok.octave = 1;
    }
    tok.note = mainNotes[tok.note - 65];
    return tstate.octave;
  },

  octave: function(tok, c) {
    var lower = (c === ',');
    var higher = (c === "'");
    if (lower || higher) {
      if (lower) {
        tok.octave--;
      } else {
        tok.octave++;
      }
    } else {
      return tstate.duration;
    }
  },

  duration: function(tok, c) {
    var slash = (c === '/');
    var number = /^[0-9]$/.test(c);
    if (number || slash) {
      tok.spanStart = tok.i;
      tok.char();
      if (number) {
        return tstate.durNum;
      } else {  // slash
        return tstate.durSlash;
      }
    } else {
      return tok.tokStateAfterDur;
    }
  },

  durNum: function(tok, c) {
    var number = /^[0-9]$/.test(c);
    if (!number) {
      var num = tok.text.slice(tok.spanStart, tok.i);
      tok.durNum = +num;
      if (c === '/') {
        tok.char();
        return tstate.durSlash;
      } else {
        return tok.tokStateAfterDur;
      }
    }
  },

  // We have just consumed the first slash.
  durSlash: function(tok, c) {
    var slash = (c === '/');
    var number = /^[0-9]$/.test(c);
    if (number) {
      tok.spanStart = tok.i;
      tok.char();
      return tstate.durDenom;
    } else if (slash) {
      tok.char();
      return tstate.durSlashes;
    } else {
      tok.durDenom = 2;
      return tok.tokStateAfterDur;
    }
  },

  durSlashes: function(tok, c) {
    var slash = (c === '/');
    if (!slash) {
      var slashes = tok.i - tok.spanStart;
      tok.durDenom = (1 << slashes);
      return tok.tokStateAfterDur;
    }
  },

  durDenom: function(tok, c) {
    var number = /^[0-9]$/.test(c);
    if (!number) {
      var num = tok.text.slice(tok.spanStart, tok.i);
      tok.durDenom = +num;
      return tok.tokStateAfterDur;
    }
  },

  mkNote: function(tok, c) {
    var dur = tok.durNum / tok.durDenom;
    if (tok.note !== undefined) {
      var note = tok.note + tok.octave * 12 + tok.accidental;
    }
    if (tok.inChord) {
      tok.notes.push(new Note(note, dur));
    } else {
      tok.addNote(note, dur);
    }
    tok.clearNoteState();
    return tstate.main;
  },

  // At the closing bracket of a [] chord.
  endChord: function(tok, c) {
    tok.tokStateAfterDur = tstate.endChordAfterDuration;
    tok.char();  // Burn the closing bracket.
    return tstate.duration;
  },

  endChordAfterDuration: function(tok, c) {
    var nl = tok.notes.length;
    var baseDur = tok.durNum / tok.durDenom;
    var maxDur = 0;
    for (var i = 0; i < nl; i++) {
      var note = tok.notes[i];
      var dur = note.dur * baseDur;
      // Add the notes in parallel (as tok.inChord is true).
      tok.addNote(note.note, dur);
      if (dur > maxDur) {
        maxDur = dur;
      }
    }
    tok.clearNoteState();
    tok.inChord = false;
    // Advance by the max of durations.
    tok.noteStart += maxDur * tok.noteDur;
    tok.notes = [];  // Reset note buffer for a future chord.
    tok.tokStateAfterDur = tstate.mkNote;
    return tstate.main;
  }
};

var Note = function(note, dur) {
  this.note = note;
  this.dur = dur;
};

var Tokenizer = function(text) {
  this.text = text;
  this.line = 1;
  this.col = 1;
  this.i = 0;
  this.tokStart = 0;
  this.tokens = [];
  this.errors = [];

  // Song-specific fields.
  this.note = undefined;
  this.octave = 0;
  this.noteStart = 0;
  this.spanStart = 0;
  this.accidental = 0;
  this.inChord = false;
  this.durNum = 1;
  this.durDenom = 1;
  this.noteDur = 0.4;
  this.noteOverlay = 0.01;
  this.notes = [];
  this.tokStateAfterDur = tstate.mkNote;
};

Tokenizer.prototype = {
  line: 1,
  col: 1,
  i: 0,  // Position in the text string.
  tokStart: 0,
  tokens: [],

  note: undefined,  // MIDI note number between A-G.
  octave: 0,
  noteStart: 0,  // Time since the start of the song.
  spanStart: 0,  // Position in the text string.
  accidental: 0, // Sharp / flat note change.
  inChord: false,
  durNum: 1,     // Note duration numerator / denominator.
  durDenom: 1,
  noteDur: 0.5,  // Note duration.
  noteOverlay: 0.01,  // Time overlay between notes.
  notes: [],     // Note buffer (for chords).
  tokStateAfterDur: tstate.mkNote,

  peek: function() { return this.text[this.i]; },
  char: function() {
    if (this.i >= this.text.length) { return; }
    var c = this.text[this.i];
    if (/^[\n\r]$/.test(c)) {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.i++;
    return c;
  },
  consume: function(n) {
    for (var i = 0; i < n; i++) {
      this.char();
    }
  },
  tokenValue: function() {
    return this.text.slice(this.tokStart, this.i);
  },
  startToken: function() { this.tokStart = this.i; },
  token: function(t) {
    this.startToken();
    this.tokens.push(t);
  },
  errors: [],
  error: function(msg) {
    this.errors.push(msg + '\nLine: ' + this.line + ' column: ' + this.col);
  },

  // If note is undefined, it is a silence.
  addNote: function(note, dur) {
    var noteEnd = this.noteStart + dur * this.noteDur;
    if (note !== undefined) {
      this.token(noteOnEvent(note, this.noteStart));
      this.token(noteOffEvent(note, noteEnd + this.noteOverlay));
    }
    if (!this.inChord) {
      this.noteStart = noteEnd;
    }
  },

  clearNoteState: function() {
    this.octave = 0;
    this.accidental = 0;
    this.durNum = 1;
    this.durDenom = 1;
    this.noteDur = 0.4;
    this.noteOverlay = 0.01;
  },
};

var isNote = function(c) { return /^[a-gA-GzZ]$/.test(c); };
var isAccidental = function(c) { return /^[\^_=]$/.test(c); };

var noteOnEvent = function(note, start) {
  return {
    type: 'channel',
    subtype: 'noteOn',
    start: +start,
    channel: 0,
    noteNumber: note,
    velocity: 127
  };
};
var noteOffEvent = function(note, start) {
  return {
    type: 'channel',
    subtype: 'noteOff',
    start: +start,
    channel: 0,
    noteNumber: note,
    velocity: 127
  };
};
