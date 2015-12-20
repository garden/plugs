var playNote = function(note, start, dur) {
  var midiNote = noteFromKey[note];
  var note = midiNote;
  if (note == null) { return; }
  var velocity = 127; // how hard the note hits
  // play the note
  MIDI.noteOn(0, note, velocity, start);
  MIDI.noteOff(0, note, start + dur);
};

var noteFromKey = {
  // MIDI notes from C3 to B5.
  "C,": 48,
  "D,": 50,
  "E,": 52,
  "F,": 53,
  "G,": 55,
  "A,": 57,
  "B,": 59,
  "C": 60,
  "D": 62,
  "E": 64,
  "F": 65,
  "G": 67,
  "A": 69,
  "B": 71,
  "c": 72,
  "d": 74,
  "e": 76,
  "f": 77,
  "g": 79,
  "a": 81,
  "b": 83,
};

var playSong = function(abc) {
  var start = 2;
  MIDI.setVolume(0, 127);
  for (var i = 0; i < abc.length; i++) {
    var note = abc[i];
    var dur = 0.5;
    playNote(note, start, dur);
    start += 0.4;
  }
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