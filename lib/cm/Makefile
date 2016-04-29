# this build script requires Uglify: sudo npm install -g uglify-js

JSMIN = uglifyjs
CSSMIN = cat
JSFILE = cm.js
CSSFILE = cm.css

update: mirror
	@cp -rf mirror/LICENSE .
	@cp -rf mirror/README.md .
	@echo "concatenating..."
	@cat mirror/lib/codemirror.js > $(JSFILE)
	@cat mirror/lib/codemirror.css > $(CSSFILE)
	@cat mirror/addon/dialog/dialog.js >> $(JSFILE); \
	 cat mirror/addon/dialog/dialog.css >> $(CSSFILE); \
	 cat mirror/addon/scroll/annotatescrollbar.js >> $(JSFILE); \
	 cat mirror/addon/scroll/simplescrollbars.js >> $(JSFILE); \
	 cat mirror/addon/scroll/simplescrollbars.css >> $(CSSFILE); \
	 cat mirror/addon/search/matchesonscrollbar.js >> $(JSFILE); \
	 cat mirror/addon/search/matchesonscrollbar.css >> $(CSSFILE); \
	 cat mirror/addon/search/searchcursor.js >> $(JSFILE); \
	 cat mirror/addon/search/search.js >> $(JSFILE); \
	 cat mirror/addon/search/jump-to-line.js >> $(JSFILE); \
	 cat mirror/addon/edit/matchbrackets.js >> $(JSFILE); \
	 cat mirror/addon/edit/closebrackets.js >> $(JSFILE); \
	 cat mirror/addon/edit/continuelist.js >> $(JSFILE); \
	 cat mirror/addon/mode/simple.js >> $(JSFILE); \
	 cat mirror/addon/mode/overlay.js >> $(JSFILE);
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

mirror:
	@echo "downloading..."
	@curl -O https://codemirror.net/codemirror.zip && \
	  unzip codemirror.zip && \
	  mv codemirror-* mirror && \
	  rm codemirror.zip

types:
	@cat $(JSFILE) | grep -oE "(text|application)/[a-zA-Z0-9\+\-]+" \
	     | sed "s,text/plain,,"  | grep -E .\+ | sort | uniq

.PHONY: update types
