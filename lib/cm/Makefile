# this build script requires Uglify: sudo npm install -g uglify-js

JSMIN = uglifyjs
CSSMIN = cat
DATE = $$(date "+%Y-%m-%d")
JSFILE = cm$(DATE).js
CSSFILE = cm$(DATE).css

update:
	@rm -rf mirror/
	@git clone http://github.com/marijnh/CodeMirror mirror
	@cp -rf mirror/LICENSE .
	@cp -rf mirror/README.md .
	@echo "[js] concatenating..."
	@cat mirror/lib/codemirror.js > $(JSFILE)
	@for util in closetag foldcode javascript-hint overlay \
	show-hint xml-hint ; do \
	  cat mirror/addon/*/$$util.js >> $(JSFILE); \
	done
	@mv mirror/mode/rpm/* mirror/mode && rmdir mirror/mode/rpm
	@for mode in `ls mirror/mode`; do \
	  if [ $$mode != meta.js ]; then \
	    cat mirror/mode/$$mode/$$mode.js >> $(JSFILE); \
	  fi \
	done
	@cat mirror/keymap/*.js >> $(JSFILE)
	@echo "[js] compressing..."
	@cat $(JSFILE) | $(JSMIN) > $(JSFILE).min && mv $(JSFILE).min $(JSFILE)
	@echo "[js] created $(JSFILE)"
	@echo "[css] concatenating..."
	@cat mirror/lib/*.css > $(CSSFILE)
	@cat mirror/addon/hint/show-hint.css >> $(CSSFILE)
	@cat mirror/theme/*.css >> $(CSSFILE)
	@echo "[css] compressing..."
	@cat $(CSSFILE) | $(CSSMIN) > $(CSSFILE).min && mv $(CSSFILE).min $(CSSFILE)
	@echo "[css] created $(CSSFILE)"
	@rm -rf mirror

types:
	@cat $(JSFILE) | grep -oE "(text|application)/[a-zA-Z0-9\+\-]+" \
	     | sed "s,text/plain,,"  | grep -E .\+ | sort | uniq

.PHONY: update types
