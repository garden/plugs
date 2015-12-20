SHELL=/bin/bash
META=../../meta

all: midi/

midi/: git-midi/
	mkdir -p midi "$(META)/lib/midi/js" "$(META)/lib/midi/util"
	mkdir -p midi "$(META)/lib/midi/shim"
	mkdir -p "$(META)/lib/midi/instruments"
	mkdir -p "$(META)/lib/midi/instruments/synth_drum-mp3"
	mkdir -p "$(META)/lib/midi/instruments/acoustic_grand_piano-mp3"
	cp -R ./git-midi/js/midi midi/js
	cp -R ./git-midi/js/util midi/util
	cp -R ./git-midi/inc/shim midi/shim
	cp -R ./git-midi/examples/soundfont midi/instruments
	for f in $$(find "./midi/" -type f); do \
		echo "$(META)/lib/$$f"; \
		echo '{"type":"text/javascript","Last-Modified":0,"plug":"none"}' > "$(META)/lib/$$f"; \
	done
	rm -rf ./git-midi

git-midi/:
	git clone --depth 1 https://github.com/mudcube/MIDI.js.git git-midi

.PHONY: all
