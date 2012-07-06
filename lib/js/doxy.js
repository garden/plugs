const STANDALONE = true;
var fs;
if( STANDALONE )
{
    fs = require('fs');
}

var id = 0;

String.prototype.startsWith = function startsWith( word )
{
    var result = true,
        i = 0,
        wlength = word.length,
        line = this,
        llength = line.length;
    while( i < wlength && i < llength
            && line[i] == word[i] )
    {
        ++i;
    }
    return i == wlength;
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
function guessKey( key )
{
    var words = key.split(' ');
    if( words[0] === 'var'
        || words[0] === 'function') {
        return words[1];
    } else if (words[1] === '=') {
        return words[0];
    } else if (words[1] === ':') {
        return words[0];
    }
    return key;
}

function handleComment( comment )
{
    var infos = {};

    // Regex to delete the first star, if present, and the first spaces.
    var deleteSpaceRgx = /\*?(\s)*/;

    // Analyze line by line.
    comment = comment.split('\n').map(function(line) {

        line = line.replace( deleteSpaceRgx, '' );
        // Keyword
        if( line.length > 0 && line[0] == '@' )
        {
            var firstSpace = line.indexOf(' ');
            var kw = line.substr( 1, firstSpace-1 );
            var rest = line.substring( firstSpace+1 );
            var kwHandler = Keywords[ kw ] || Keywords['default'];
            kwHandler( infos, kw, rest );
        } else {
            // Full text
            infos.description = infos.description || "";
            infos.description += line ;
        }
    });

    return infos;
};

var errors = {
    'MISSING_TERMINATION': 'Missing end of comment termination mark */'
};

function error( code )
{
    return errors[code];
}

function ignoreInsideComments( pos, total_length, str )
{
    var begin = pos;
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
            ret = ignoreInsideComments( pos, total_length, str );
            if( ret ) {
                pos = ret.pos;
                str = ret.str;
            }
            ++pos;
        }

        if( pos+1 == total_length )
        {
            return error('MISSING_TERMINATION');
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
        {
            // Looking for /** mark
            if( pos+2 < total_length
                && str[pos] == '/'
                && str[pos+1] == '*'
                && str[pos+2] == '*'
              )
            {
                comment_mode = true;
                pos += 2;
                com_start = pos + 1;
            }
        } else {

            ret = ignoreInsideComments( pos, total_length, str );
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

                var infos = handleComment( comment );

                var rest = str.substring( com_end+1 );
                var nextLine = rest.split('\n')[1];
                var key = guessKey( nextLine );

                comments[ key ] = infos;
                com_start = com_end = 0;

                ++pos;
            }
        }
        ++pos;
    }

    if( comment_mode ) {
        return error('MISSING_TERMINATION');
    }

    return comments;
};

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

function present( data ) {
    if( STANDALONE )
    {
        var comments = doxygen( data );
        var toString = JSON.stringify( comments );
        // console.log( toString.replace(/{/g, '\n\n').replace(/,/g, '\n').replace(/}/g, '') );
        console.log( toString );
    } else
    {
        return webPresent( data );
    }
}

// if testing with node directly
if( STANDALONE )
{
    fs.readFile('text', function cb(err, data) {
        present( data );
    });
}

