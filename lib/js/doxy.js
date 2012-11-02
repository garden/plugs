var require = require || null;
const STANDALONE = ( require !== null );

/**
    @id String.prototype.trim
    @brief Trims the string on both sides.
    @return The current string, so as to chain calls.
*/
String.prototype.trim = function trim() {
  this.replace(/^\s(\s)*/, '').replace(/\s(\s)*$/, '');
  return this;
};

/**
    @id String.prototype.empty
    @return True if the current string is empty, false otherwise.
*/
String.prototype.empty = function empty() {
  return this.length === 0;
};

//! @id languages
//! @todo adapt to every langage?
languages = {
    javascript: [
            /var ([a-zA-Z0-9_]*)/,
            /([a-zA-Z0-9_]*\.prototype\.[a-zA-Z0-9_]*)(\s)*=/,
            /function ([a-zA-Z0-9_]*)/,
            /([a-zA-Z0-9_]*)(\s)*:/
    ]
};

function Doxygen( data )
{
    this.data = data;
}

/**
 * @brief Tries to guess the key (object id) by looking at the line following the comment.
 *
 * @param line The line following the comment, the one we're parsing.
 * @return The name of object, if it has been found with languages keywords,
 * or the whole line otherwise.
 */
Doxygen.prototype.guessKey = function guessKey( line )
{
    LANGUAGE = 'javascript';

    for( var i = 0, size = languages[LANGUAGE].length; i < size; ++i )
    {
        var regex = languages[LANGUAGE][i];
        var key = regex.exec( line );
        if( key ) {
            return key[1];
        }
    }

    // default
    return line;
}

//! Contains some classicals keywords of doxygen dialect
Doxygen.prototype.Keywords = {
    'param' : function( infos, k, d ) {
        infos['param'] = infos['param'] || {};
        var firstSpace = d.indexOf(' ');
        var paramName = d.substring( 0, firstSpace );
        var remainder = d.substring( firstSpace+1 );
        infos['param'][ paramName ] = remainder;
    },

    'default': function( infos, k, d ) {
        infos[ k ] = d;
    }
};

// Regex to delete the first star, or / / !, or / / /, if present, and the first spaces.
Doxygen.prototype.deleteSpaceRgx = /(\s)*\*?(\/\/!)?(\/\/\/)?(\s)*/;

/**
 * @brief Parses the content of an identified comment.
 *
 * This function parses the content of the comment line by line and tries to
 * identify keywords, so as to split the comment into comprehensive parts.
 *
 * @param comment The full comment, beginning and ending by doxygen marks.
 * @return A map containing the read informations
 */
Doxygen.prototype.parse = function parseComment( comment )
{
    var infos = {};


    // Cleaning all the lines
    comment = comment.split('\n');
    for( var i = 0, size = comment.length; i < size; ++i )
    {
        comment[i] = comment[i].replace( this.deleteSpaceRgx, '' ).trim();
    }

    // Analyze line by line.
    for( var i = 0, size = comment.length; i < size; ++i )
    {
        var line = comment[i];

        // Keyword
        if( line.length > 0 && line[0] === '@' )
        {
            var firstSpace = line.indexOf(' ');
            var kw = line.substr( 1, firstSpace-1 );
            var rest = line.substring( firstSpace+1 );
            // Finding the first line which begins by @ or is empty,
            // all previous lines belang to this keyword paragraph
            ++i;
            while( i < comment.length ) {
                var nextLine = comment[i];
                if( nextLine[0] === '@' || nextLine.empty() ) {
                    --i;
                    break;
                } else {
                    rest += '\n' + nextLine;
                    ++i;
                }
            }
            var kwHandler = this.Keywords[ kw ] || this.Keywords['default'];
            kwHandler( infos, kw, rest );
        } else {
        // Full text
            if( !infos.description )
            {
                infos.description = "";
            } else {
                if( line !== "" )
                infos.description += "\n";
            }
            infos.description += line ;
        }
    };

    if( infos.description !== undefined && infos.description.empty() )
    {
        delete infos.description;
    }

    return infos;
};

/**
 * @brief Contains all the possible errors user can have when using the program.
 */
Doxygen.prototype.errors = {
    'MISSING_TERMINATION': 'Missing end of comment termination mark */'
};

/**
 * @brief Ignore all the inside comments (which are comments inside a doxygen comment).
 *
 * Recursively calls, so as to find deeper inside comments and
 * ignore them too.
 *
 * @param pos (integer) The current position of parsing in the text
 * @param str (string) String we're parsing.
 * @return undefined if there is no inside comment, { pos, str }
 * (new values) otherwise.
 */
Doxygen.prototype.ignoreInsideComments = function ignoreInsideComments( pos, str )
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
            ret = this.ignoreInsideComments( pos, str );
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
Doxygen.prototype.generate = function generate( ) {
    var pos = 0,
        data = this.data,
        total_length = data.length,
        comment_mode = false,
        javadoc_style_comment = false,
        str = data.toString(),
        com_start = com_end = 0,
        comments = {},
        i = 0;

    while( pos != total_length )
    {
        if( !comment_mode )
        // We're looking for a "/ * *" mark or a "/ / !" or a "/ / /" mark
        {
            if( pos+2 < total_length
                && str[pos] == '/'
              )
            {
                if( str[pos+1] == '*'
                    && str[pos+2] == '*')
                {
                    comment_mode = true;
                    javadoc_style_comment = true;
                } else if( str[pos+1] == '/' &&
                        (str[pos+2] == '!' || str[pos+2] == '/') )
                {
                    comment_mode = true;
                    javadoc_style_comment = false;
                }

                if( comment_mode )
                // If one of the two comment marks has been detected
                {
                    pos += 2; // we're either on the second star or the !, the ++pos outside the loop will pass to the next char
                    com_start = pos + 1;
                }
            }
        } else {
            // We are in comment mode.

            if( javadoc_style_comment ) {
                // recursively ignore inside javadoc style comments
                ret = this.ignoreInsideComments( pos, str );
                if( ret ) {
                    pos = ret.pos;
                    str = ret.str;
                }
            }

            // We're looking for the termination mark "* /" or a new line without any / / !, or / / /
            // Looking for */ mark
            if( javadoc_style_comment
                && pos+1 < total_length
                && str[pos] == '*' && str[pos+1] == '/'
              )
            {
                comment_mode = false;
            }
            else if
            ( !javadoc_style_comment )
            {
                var nextPos = str.indexOf( '\n', pos )+1;
                if( nextPos+2 >= total_length ||
                        !(str[nextPos] == '/'
                        && str[nextPos+1] == '/'
                        && (str[nextPos+2] == '!' || str[nextPos+2] == '/')))
                {
                    pos = nextPos;
                    comment_mode = false;
                } else {
                    pos = nextPos-1;
                }
            }

            if( !comment_mode )
            {
                com_end = pos-1;
                comment = str.substring( com_start, com_end );

                var infos = this.parse( comment );

                var remainder = str.substring( com_end );
                var nextLine = remainder.split('\n')[1];
                var objectId = infos.id || this.guessKey( nextLine );

                comments[ objectId ] = infos;
                com_start = com_end = 0;

                ++pos; // we're on '/' or '!', the ++pos outside the loop will pass to the next char
            }
        }
        ++pos;
    }

    // if there is no more to read but we still are in comment mode, we forgot something...
    if( comment_mode ) {
        return this.errors['MISSING_TERMINATION'];
    }

    return comments;
};

/**
 * @brief Presents a comment for the web.
 * @param data (string) Text containing the code.
 * @todo Use templates ?
 */
Doxygen.prototype.toHtml = function webPresent( ) {
    var comments = this.generate( );
    var html = "";

    // content table
    html += '<ul id="top">';
    for( var i in comments )
    {
        html += "<li><a href=#"+i+">" + i + "</a></li>\n";
    }
    html += "</ul>\n";

    for( var i in comments )
    {
        var comment = comments[i];
        html += '<h1 id="'+i+'">' + i + "</a></h1>\n";
        html += '<p><a href="#top">back to top</a></p>';
        for( var k in comment )
        {
            if( k === 'param' ) {
                var params = comment[k];
                html += "<ul>\n";
                for( name in params )
                {
                    html += "\t<li><strong>" + name + "</strong> : " + params[name] + "</li>\n";
                }
                html += "</ul>\n";
            } else {
                html += "<p><strong>" + k + "</strong> : " + comment[k] + "</p>\n";
            }
        }
        html += '\n';
    }
    return html;
};

/**
 * @brief Generates the documentation of the given data.
 * @param data (string) Text containing the code.
 * @return In case of STANDALONE mode, directly the in-memory representation of comments,
 * otherwise an HTML representation of the comments.
 *
 * And some description here.
 */
Doxygen.prototype.content = function generateDoc( ) {
    if( STANDALONE )
    {
        var comments = this.generate( );
        var toString = JSON.stringify( comments );
        console.log( this.toHtml( ) );
        return comments;
    } else
    {
        return this.toHtml( );
    }
}

// if testing with node directly
if( STANDALONE )
{
    var fs = require('fs');
    fs.readFile('doxy.js', function cb(err, data) {
        var doxy = new Doxygen( data );
        doxy.content();
    });
    exports.doxygen = Doxygen;
}
