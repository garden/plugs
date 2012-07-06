const STANDALONE = false;
var fs;
if( STANDALONE )
{
    fs = require('fs');
}

String.prototype.trim = function trim() {
  this.replace(/^\s(\s)*/, '').replace(/\s(\s)*$/, '');
};

String.prototype.empty = function empty() {
  return this.length === 0;
};

var Keywords = {
    'param' : function( infos, k, d ) {
        infos['param'] = infos['param'] || {};
        var firstSpace = d.indexOf(' ');
        var paramName = d.substring( 0, firstSpace );
        var rest = d.substring( firstSpace+1 );
        infos['param'][ paramName ] = rest;
    },

    'default': function( infos, k, d ) {
        infos[ k ] = d;
    }
};

// TODO adapt to each langage, using extension and type.
function guessKey( line )
{
    var words = line.split(' '); // TODO user hasn't to put spaces
    var key;
  	if( words[0] === 'var'
        || words[0] === 'function') {
        key = words[1];
    } else if (words[1] === '=') {
        key = words[0];
    } else if (words[1] === ':') {
        key = words[0];
    } else {
      	key = line;
    }
  	
  	var lastChar = key[ key.length - 1 ];
  	if( lastChar === '=' || lastChar === '(' ) {
      	key = key.substring( 0, key.length - 1 );
  	}
    return key;
}

/**
 * @brief Parses the content of an identified comment.
 *
 * This function parses the content of the comment line by line and tries to
 * identify keywords, so as to split the comment into comprehensive parts.
 *
 * @param comment The full comment, beginning and ending by doxygen marks.
 * @return A map containing the read informations
 */
function parseComment( comment )
{
    var infos = {};

    // Regex to delete the first star, if present, and the first spaces.
    var deleteSpaceRgx = /(\s)*\*?(\s)*/;

    // Analyze line by line.
    comment = comment.split('\n').map(function(line) {
        line = line.replace( deleteSpaceRgx, '' );
        // Keyword
        if( line.length > 0 && line[0] === '@' )
        {
            var firstSpace = line.indexOf(' ');
            var kw = line.substr( 1, firstSpace-1 );
            var rest = line.substring( firstSpace+1 );
            var kwHandler = Keywords[ kw ] || Keywords['default'];
            kwHandler( infos, kw, rest );
        } else {
        // Full text
            if( ! infos.description )
            {
                infos.description = "";
            } else {
                if( line !== "" )
                infos.description += "\n";
            }
            infos.description += line ;
        }
    });
  	
  	infos.description.trim();
  	if( infos.description.empty() )
    {
    	delete infos['description'];
    }

    return infos;
};

/**
 * @brief Contains all the possible errors user can have when using the program.
 */
var errors = {
    'MISSING_TERMINATION': 'Missing end of comment termination mark */'
};

/**
 * @brief Ignore all the inside comments (which are comments inside a doxygen comment).
 * @param pos (integer) The current position of parsing in the text
 * @param str (string) String we're parsing.
 * @return undefined if there is no inside comment, { pos, str } (new values) otherwise.
 */
function ignoreInsideComments( pos, str )
{
    var begin = pos,
        total_length = str.length;
    if( pos+1 < total_length
            && str[pos] == '/'
            && str[pos+1] == '*' )
    {
        pos += 2;
        // Moving to the end of the inside comment
        while( !( pos+1 < total_length
                    && str[pos] == '*'
                    && str[pos+1] == '/')
             )
        {
            // Recursively deletes other comments
            ret = ignoreInsideComments( pos, str );
            if( ret ) {
                pos = ret.pos;
                str = ret.str;
            }
            ++pos;
        }

        if( pos+1 == total_length )
        {
            return error['MISSING_TERMINATION'];
        } else {
            // At this moment, read character should be '*'
            ++pos; // character '/'
            var end = pos + 1;

            // simply deleting inside comment
            str = str.substring( 0, begin ) + str.substring( end );
            pos = begin;
            return {str: str, pos: begin};
        }
    }
}

/**
 * @brief Parses the full given text and saves all found comments.
 *
 * If there is any inside comment (comment inside a doxygen comment), it is simply ignored.
 * @param data (string) Text containing the code to parse.
 * @return Comments as a map of [ objectId : comment ]
 */
function doxygen( data ) {
    var pos = 0,
        total_length = data.length,
        comment_mode = false,
        str = data.toString(),
        com_start = com_end = 0,
        comments = {},
        i = 0;

    while( pos != total_length )
    {
        if( !comment_mode )
        // We're looking for a "/ * *" mark
        {
            if( pos+2 < total_length
                && str[pos] == '/'
                && str[pos+1] == '*'
                && str[pos+2] == '*'
              )
            {
                comment_mode = true;
                pos += 2; // we're on the second star, the ++pos outside the loop will pass to the next char
                com_start = pos + 1;
            }
        } else {
        // We are in comment mode. We're looking for the termination mark "* /"
            ret = ignoreInsideComments( pos, str );
            if( ret ) {
                pos = ret.pos;
                str = ret.str;
            }

            // Looking for */ mark
            if( pos+1 < total_length
                && str[pos] == '*'
                && str[pos+1] == '/' )
            {
                comment_mode = false;
                com_end = pos - 1;
                comment = str.substring( com_start, com_end );

                var infos = parseComment( comment );

                var rest = str.substring( com_end+1 );
                var nextLine = rest.split('\n')[1];
                var objectId = guessKey( nextLine );

                comments[ objectId ] = infos;
                com_start = com_end = 0;

                ++pos; // we're on '/', the ++pos outside the loop will pass to the next char
            }
        }
        ++pos;
    }

    // if there is no more to read but we still are in comment mode, we forgot something...
    if( comment_mode ) {
        return errors['MISSING_TERMINATION'];
    }

    return comments;
};

/**
 * @brief Presents a comment for the web.
 * @param data (string) Text containing the code.
 * @todo Use templates ?
 */
function webPresent( data ) {
    var comments = doxygen( data );
    var html = "";
    for( var i in comments )
    {
        var comment = comments[i];
        html += "<h1>" + i + "</h1>";
        for( var k in comment )
        {
            if( k === 'param' ) {
                var params = comment[k];
                html += "<ul>";
                for( name in params )
                {
                    html += "<li><strong>" + name + "</strong> : " + params[name] + "</li>";
                }
                html += "</ul>";
            } else {
                html += "<p><strong>" + k + "</strong> : " + comment[k] + "</p>";
            }
        }
    }
    return html;
};

/**
 * @brief Generates the documentation of the given data.
 * @param data (string) Text containing the code.
 * @return In case of STANDALONE mode, directly the in-memory representation of comments, otherwise an HTML representation of the comments.
 */
function generateDoc( data ) {
    if( STANDALONE )
    {
        var comments = doxygen( data );
        var toString = JSON.stringify( comments );
        // console.log( toString.replace(/{/g, '\n\n').replace(/,/g, '\n').replace(/}/g, '') );
        console.log( toString );
        return comments;
    } else
    {
        return webPresent( data );
    }
}

// if testing with node directly
if( STANDALONE )
{
    fs.readFile('doxy.js', function cb(err, data) {
        generateDoc( data );
    });
    exports.doxygen = generateDoc;
}

