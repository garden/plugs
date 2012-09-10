// Demo code (the actual new parser character stream implementation)

/**
	@brief Stringstream constructor.

	This stringstream object makes it easy to parse streams.

	@param string The initial string.
*/
function StringStream(string) {
  /**
	@id Stringstream.pos

	This is an integer variable used to know at which position we currently are
	in the stringstream.
  */
  this.pos = 0;
  this.string = string;
}

StringStream.prototype = {
  /**
	@id Stringstream.done
	@return True if all the stringstream has been read.
  */
  done: function() {return this.pos >= this.string.length;},

  /**
	@brief The name is kind of explicit, isn't it?
	@return The current char we're reading.
  */
  peek: function() {return this.string.charAt(this.pos);},
  next: function() {
    if (this.pos < this.string.length)
      return this.string.charAt(this.pos++);
  },
  eat: function(match) {
    var ch = this.string.charAt(this.pos);
    if (typeof match == "string") var ok = ch == match;
    else var ok = ch && match.test ? match.test(ch) : match(ch);
    if (ok) {this.pos++; return ch;}
  },
  eatWhile: function(match) {
    var start = this.pos;
    while (this.eat(match));
    if (this.pos > start) return this.string.slice(start, this.pos);
  },
  backUp: function(n) {this.pos -= n;},
  column: function() {return this.pos;},
  eatSpace: function() {
    var start = this.pos;
    while (/\s/.test(this.string.charAt(this.pos))) this.pos++;
    return this.pos - start;
  },
  match: function(pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}
      if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
        if (consume !== false) this.pos += str.length;
        return true;
      }
    }
    else {
      var match = this.string.slice(this.pos).match(pattern);
      if (match && consume !== false) this.pos += match[0].length;
      return match;
    }
  }
};
'Yeah!'
