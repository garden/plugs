# this build script requires Uglify: sudo npm install -g uglify-js

JSMIN = uglifyjs
CSSMIN = cat
DATE = $$(date "+%Y-%m-%d")
JSFILE = cm.js
CSSFILE = cm.css
DATEDJSFILE = cm$(DATE).js
DATEDCSSFILE = cm$(DATE).css

update: download
	@mv $(JSFILE) $(DATEDJSFILE)
	@mv $(CSSFILE) $(DATEDCSSFILE)
	@cp -rf mirror/LICENSE .
	@cp -rf mirror/README.md .
	@echo "concatenating..."
	@cat mirror/lib/codemirror.js > $(JSFILE)
	@cat mirror/lib/codemirror.css > $(CSSFILE)
	@cat mirror/addon/edit/closetag.js >> $(JSFILE); \
	 cat mirror/addon/fold/foldcode.js >> $(JSFILE); \
	 cat mirror/addon/hint/show-hint.js >> $(JSFILE); \
	 cat mirror/addon/hint/show-hint.css >> $(CSSFILE); \
	 cat mirror/addon/hint/xml-hint.js >> $(JSFILE); \
	 cat mirror/addon/hint/javascript-hint.js >> $(JSFILE); \
	 cat mirror/addon/mode/overlay.js >> $(JSFILE); \
	 cat mirror/addon/mode/simple.js >> $(JSFILE);
	@for mode in `ls mirror/mode`; do \
	  if [ -d mirror/mode/$$mode ]; then \
	    cat mirror/mode/$$mode/$$mode.js >> $(JSFILE); \
	  fi \
	done
	@cat mirror/keymap/*.js >> $(JSFILE)
	@cat mirror/theme/*.css >> $(CSSFILE)
	@echo "compressing..."
	@cat $(JSFILE) | $(JSMIN) > $(JSFILE).min && mv $(JSFILE).min $(JSFILE)
	@cat $(CSSFILE) | $(CSSMIN) > $(CSSFILE).min && mv $(CSSFILE).min $(CSSFILE)
	@echo "created $(JSFILE)"
	@echo "created $(CSSFILE)"
	@rm -rf mirror

download:
	@rm -rf mirror/
	@git clone http://github.com/marijnh/CodeMirror mirror

types:
	@cat $(JSFILE) | grep -oE "(text|application)/[a-zA-Z0-9\+\-]+" \
	     | sed "s,text/plain,,"  | grep -E .\+ | sort | uniq

.PHONY: update download types
