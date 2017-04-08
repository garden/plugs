SHELL=/bin/bash

all: midi/ js/

midi/:
	git clone --depth 1 https://github.com/mudcube/MIDI.js.git git-midi
	mv git-midi/js/midi midi/js
	mv git-midi/js/util midi/util
	mv git-midi/inc/shim midi/shim
	mv git-midi/examples/soundfont midi/instruments
	rm -rf git-midi

js/: js/canop/

js/canop/:
	mkdir js/canop
	cat ../../node_modules/canop/canop.js \
	  | uglifyjs > js/canop/lib.js
	cat ../../node_modules/canop/web/canop-codemirror.js \
	  | uglifyjs > js/canop/cm.js

clean:
	rm -rf git-midi midi/js midi/util midi/shim midi/instruments js/canop

.PHONY: all clean
