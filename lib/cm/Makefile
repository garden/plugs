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
	@echo "Compressing js files..."
	@cat mirror/lib/codemirror.js | $(JSMIN) > $(JSFILE);  \
	cat mirror/lib/util/*.js | $(JSMIN) >> $(JSFILE);  \
	cat mirror/mode/*/*.js | $(JSMIN) >> $(JSFILE);  \
	cat mirror/mode/rpm/*/*.js | $(JSMIN) >> $(JSFILE);  \
	cat mirror/keymap/*.js | $(JSMIN) >> $(JSFILE)
	@echo "Created: $(JSFILE)"
	@echo "Compressing css files..."
	@cat mirror/lib/*.css | $(CSSMIN) > $(CSSFILE);  \
	cat mirror/lib/util/*.css | $(CSSMIN) >> $(CSSFILE);  \
	cat mirror/theme/*.css | $(CSSMIN) >> $(CSSFILE); \
	cat mirror/mode/*/*.css | $(CSSMIN) >> $(CSSFILE); \
	cat mirror/mode/*/*/*.css | $(CSSMIN) >> $(CSSFILE)
	@echo "Created: $(CSSFILE)"
	@rm -rf mirror
	@echo
	@echo "Don't forget to update types and paths!"

types:
	@cat codemirror$(DATE).js | grep -oE "(text|application)/[a-zA-Z0-9\+\-]+"  \
	     | sed "s,text/plain,,"  | grep -E .\+ | sort | uniq  \
	     | sed "s/.*/addType('&', [fromName['text\/plain']]);/"

.PHONY: update types
