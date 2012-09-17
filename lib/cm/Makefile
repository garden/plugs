# this build script requires Uglify: sudo npm install -g uglify-js

JSMIN = uglifyjs
CSSMIN = cat
DATE = $$(date "+%Y-%m-%d")
JSFILE = codemirror$(DATE).js
CSSFILE = codemirror$(DATE).css

update:
	@rm -rf mirror/
	@git clone http://github.com/marijnh/CodeMirror mirror
	@cp -rf mirror/LICENSE .
	@cp -rf mirror/README.md .
	@echo
	@echo "Compressing js files..."
	@cat mirror/lib/codemirror.js \
	     mirror/lib/util/dialog.js \
	     mirror/lib/util/foldcode.js \
	     mirror/lib/util/javascript-hint.js \
	     mirror/lib/util/match-highlighter.js \
	     mirror/lib/util/multiplex.js \
	     mirror/lib/util/overlay.js \
	     mirror/lib/util/pig-hint.js \
	     mirror/lib/util/searchcursor.js \
	     mirror/lib/util/search.js \
	     mirror/lib/util/simple-hint.js \
	     mirror/lib/util/xml-hint.js | $(JSMIN) >> $(JSFILE)
	@mv mirror/mode/rpm/* mirror/mode && rmdir mirror/mode/rpm
	@for mode in `ls mirror/mode`; do \
	  cat mirror/mode/$$mode/$$mode.js | $(JSMIN) >> $(JSFILE); \
	done
	@cat mirror/keymap/*.js | $(JSMIN) >> $(JSFILE)
	@echo "Created: $(JSFILE)"
	@echo
	@echo "Compressing css files..."
	@cat mirror/lib/*.css | $(CSSMIN) > $(CSSFILE); \
	cat mirror/lib/util/*.css | $(CSSMIN) >> $(CSSFILE); \
	cat mirror/theme/*.css | $(CSSMIN) >> $(CSSFILE); \
	cat mirror/mode/*/*.css | $(CSSMIN) >> $(CSSFILE)
	@echo "Created: $(CSSFILE)"
	@rm -rf mirror

types:
	@cat codemirror$(DATE).js | grep -oE "(text|application)/[a-zA-Z0-9\+\-]+" \
	     | sed "s,text/plain,,"  | grep -E .\+ | sort | uniq \
	     | sed "s/.*/addType('&', [fromName['text\/plain']]);/"

.PHONY: update types
