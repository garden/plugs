// Display JSON data as editable HTML elements.
// Copyright © 2010-2012 Thaddee Tyl, Jan Keromnes. All rights reserved.
(function() {

JSON.getweb = {};
JSON.web = function (obj, id, opts) {
  /* Display json object obj in html structure of id id.
   * If obj is a string, it is the location of a json file.
   * The optional parameters include opts.rewrite, which
   * activates the possibility to change it, and
   * opts.reviver, which is a function to filter the object.
   * Example of use:
   *  <html>
   *   <body id="spot"></body>
   *   <script>
   *    var locat = JSON.web({hello:'world'}, 'spot', {template:'rewrite'});
   *    if( locat() ) {  // if it has changed...
   *      alert( JSON.getweb['spot'] );
   *    }
   *   </script>
   *  </html>  */
  if (typeof obj === 'string') {
    obj = JSON.parse(obj, opts.reviver);
  }

  /* Where is data located? */
  var hasChanged = false;
  JSON.getweb[id] = obj;
  
  /* Display in struct. */
  var html = JSON._parseObj(JSON.getweb[id], '', id, opts.template);
  document.getElementById(id).innerHTML = html;

  /* Return a function to check changes. */
  return function () {
    var bool = hasChanged; hadChanged = false;
    return bool;
  };
}

JSON._parseObj = function(obj, path, id, template) {
  /* Parse obj and return an html string. */
  /* First, let's treat the template. */
  var deal;
  if (template === undefined) {
    deal = JSON._plates.readonly;
  } else {
    deal = JSON._plates[template];
  }
  if (!deal) throw("No template was given to JSON.web().");
  
  /* Inject corresponding CSS. */
  if (deal.css) {
    var styleElt = document.createElement('style');
    styleElt.textContent = deal.css(id);
    document.body.appendChild(styleElt);
  }
  
  /* We put it all in html. */
  var html = '';
  if (typeof obj === 'object') {
    if (obj === null) {
      /* Here, obj is null. */
      html += deal['null'](obj);
    } else if (obj.indexOf !== undefined) {
      /* Here, obj is a list. */
      html += deal.list(obj, path, id, template);
    } else {
      /* Here, obj is an object. */
      html += deal.obj(obj, path, id, template);
    }
  } else if (typeof obj === 'string') {
    /* Here, obj is a string. */
    html += deal.str(obj, path, id);
  } else if (typeof obj === 'number') {
    /* Here, obj is a number. */
    html += deal.num(obj, path, id);
  } else if (typeof obj === 'boolean') {
    /* Here, obj is a boolean. */
    html += deal.bool(obj, path, id);
  }
  return html;
};

/* Helper escape functions go here. */
function escObjInAttr(o) {
  return JSON.stringify(o).replace(/"/g,'&quot;');
};

JSON._plates = {};
JSON._plates.escObjInNestedAttr = function(o) {
  return JSON.stringify(o).replace(/"/g,'\\\'');
};
JSON._plates.readonly = {
  obj: function(obj, path, id, template) {
    var html = '';
    html += '<dl>';
    var i;
    for (i in obj) {
      html += '<dt>' + i + ':<dd>' + JSON._parseObj(obj[i], '', id, template);
    }
    if (i === undefined) {
      html += '<dd>Empty object here.';
    }
    html += '</dl>';
    return html;
  },
  list: function(obj, path, id, template) {
    var html = '';
    html += '<ul>';
    for (var i=0; i<obj.length; i++) {
      html += '<li>' + JSON._parseObj(obj[i], '', id, template);
    }
    if (i == 0) {
      html += '<li>Empty list here.';
    }
    html += '</ul>';
    return html;
  },
  str: function(obj) {
    return obj;
  },
  num: function(obj) {
    return obj;
  },
  bool: function(obj) {
    return (obj? 'true': 'false');
  },
  'null': function(obj) {
    return 'null';
  }
};
JSON._plates.rewrite = {
  css: function(id) {
    return 'html body {' +
             'font-family: monospace;' +
           '}' +
           'div.webjson-element {' +
             'margin-left: 1em;' +
           '}' +
           '.hidden { visibility: hidden !important; }' +
           'div.webjson-element > button.delete {' +
             'border: 0;' +
             'background: transparent;' +
             'cursor: pointer;' +
             'color: lightgrey;' +
             'width: 1em;' +
             'visibility: hidden;' +
           '}' +
           'div.webjson-element:hover > button.delete {' +
             'visibility: visible;' +
           '}' +
           'div.webjson-element:hover > button.delete:hover {' +
             'color: black;' +
           '}' +
           'input.webjson-edit {' +
             'font-family: monospace;' +
             'border: 1px solid lightgrey;' +
             'box-shadow: 2px 2px 2px lightgrey;' +
             'margin: 0px; padding: 0px;' +
           '}' +
           'input[type=text].webjson-edit {' +
             'width: 130px;' +
           '}' +
           'input[type=number].webjson-edit {' +
             'width: 50px;' +
          '}';
  },
  objkey: function(path, id, key) {
    /* Remove: 1. Data; 2. Graphics. */
    return '<button class="delete" onclick="delete JSON.getweb[' +
      escObjInAttr(id) + ']' + path + '[' + escObjInAttr(key) + ']; ' +
      'this.parentNode.parentNode.removeChild(this.parentNode)">x</button>' +
      key + JSON._plates.rewrite.objkeySeparator;
  },
  objkeySeparator: ': ',
  obj: function(obj, path, id, template) {
    /* This function uses the path of the current object to alter
     * the value of its elements. */
    /* path: string, eg, '["hello"][4][2]'. */
    /* id: string of container id, eg, 'show'. */
    var html = '';
    html += '<button class="delete hidden">x</button>{';
    var i;
    for (i in obj) {
      html += '<div class="webjson-element">' +
                JSON._plates.rewrite.objkey(path, id, i) +
                JSON._parseObj(obj[i], path + '[\'' + i + '\']', id, template) +
              ',</div>';
    }
    html += '<div class="webjson-element">' +
      /* Value. */
      '<button class="delete hidden">x</button>' +
      /* add button. */
      '<button onclick="JSON._plates.rewrite.addObjBut(this,&quot;' +
      path + '&quot;,\'' +
      id + '\')">+key:value</button></div>';
    html += '<button class="delete hidden">x</button>}';
    return html;
  },
  listitem: function(path, id, index) {
    /* Remove: 1. Data; 2. Graphics. */
    return '<button class="delete" onclick="delete JSON.getweb[\'' + id + '\']' +
      path + '[' + index + ']; ' +
      'this.parentNode.parentNode.removeChild(this.parentNode)' +
      '">x</button>';
      /* The subpath is updated. */
  },
  list: function(obj, path, id, template) {
    var html = '';
    html += '[';
    for (var i=0; i<obj.length; i++) {
      html += '<div class="webjson-element">' +
        JSON._plates.rewrite.listitem(path, id, i);
      html += JSON._parseObj(obj[i], path + '['+i+']', id, template) + ',</div>';
    }
    html += '<div class="webjson-element">' +
      /* add button. */
      '<button class="delete hidden">x</button><button onclick="' +
       'JSON._plates.rewrite.addListBut(this,&quot;' + path + '&quot;,' +
         escObjInAttr(id) + ')">+item</button></div>';
    html += '<button class="delete hidden">x</button>]';
    return html;
  },
  atom: function(obj, path, id, type) {
    /* Calling the next function when double clicking. */
    return '<span onclick="(function(that){var parent=that.parentNode;' +
      'that.outerHTML = JSON._plates.rewrite.' + type + 'Input(' +
      escObjInAttr(obj) + ',&quot;' + path + '&quot;,' +
      escObjInAttr(id) + ');' +
      'parent.firstChild.nextElementSibling.firstElementChild' +
        '.focus();}(this))">' +
      JSON._plates.rewrite[type + 'Output'](obj) + '</span>';
  },
  str: function(obj, path, id) {
    return JSON._plates.rewrite.atom(obj, path, id, 'str');
  },
  strOutput: function(obj) {
    return '"' + obj + '"';
  },
  strInput: function(obj, path, id) {
    return '<span>"<input type="text" class="webjson-edit" value="' + obj + '" ' +
      'onblur="this.parentNode.outerHTML=JSON._plates.rewrite.atom(this.value,' +
        '&quot;' + path + '&quot;,' + escObjInAttr(id) + ',\'str\')" ' +
      'oninput="JSON.getweb[' + escObjInAttr(id) + ']' +
        path + '=this.value">"</span>';
  },
  num: function(obj, path, id) {
    return JSON._plates.rewrite.atom(obj, path, id, 'num');
  },
  numOutput: function(obj) {
    return obj.toString(10);
  },
  numInput: function(obj, path, id) {
    return '<input class="webjson-edit" type="number" value="' + obj + '" ' +
      /* Change a number. */
      'oninput="JSON.getweb[\'' + id + '\']' +
      path + ' = parseInt(this.value,10);"' +
      'onblur="this.outerHTML = ' +
        'JSON._plates.rewrite.atom(parseInt(this.value,10),' +
      '&quot;' + path + '&quot;,' + escObjInAttr(id) + ',\'num\')">';
  },
  bool: function(obj, path, id) {
    return JSON._plates.rewrite.atom(obj, path, id, 'bool');
  },
  boolOutput: function(obj) {
    return '' + obj;
  },
  boolInput: function(obj, path, id) {
    return '<select ' +
      'onblur="this.outerHTML=JSON._plates.rewrite.atom(' +
        'this.value==\'true\'?true:false,&quot;' + path + '&quot;,' +
        escObjInAttr(id) + ',\'bool\')" ' +
      /* Change the value. */
      'onchange="JSON.getweb[\'' + id + '\']' +
        path + ' = this.value==\'true\'?true:false;">' +
      '<option' + (obj?' selected':'') + '>true</option>' +
      '<option' + (!obj?' selected':'') +'>false</option></select>';
  },
  'null':function(obj) {
    return 'null';
  },
  addButAsk: function(path, id, update) {
    return '<span><select>' +
      '<option value="0">Object</option>' +
      '<option value="1">List</option>' +
      '<option value="2" selected>String</option>' +
      '<option value="3">Number</option>' +
      '<option value="4">Boolean</option>' +
      '<option value="5">Null </option>' +
     '</select></label>' +
     /* Careful there! JS use in the event attr of an event attr. */
     '<button onclick="(function(that){' +
       'var o;' +
       'switch(that.previousSibling.value){' +
       'case \'0\': o = {};   break;' +
       'case \'1\': o = [];   break;' +
       'case \'2\': o = \'\'; break;' +
       'case \'3\': o = 0;    break;' +
       'case \'4\': o = false;break;' +
       'case \'5\': o = null; break;' +
       '};' + update(path, id) +
      '})(this);">Add</button></span>';
  },
  addObjBut: function(button, path, id) {
    /* add button */
    var div = document.createElement('div');
    div.classList.add('webjson-element');
    div.innerHTML = JSON._plates.rewrite.objkey(path, id, '')
      .slice(0, -JSON._plates.rewrite.objkeySeparator.length) +
      // The following item is the key. It must start as a focused input.
      '<input class="webjson-edit" />: ' +
      // Input field to choose the type.
      JSON._plates.rewrite.addButAsk(path, id, function(path, id) {
        // In there, `that` is the button DOM node.
        // All this is JS inside a DOM attribute.
        return 'var key = that.parentNode.previousElementSibling.value;' +
          // Graphical update.
          'that.parentNode.parentNode.innerHTML = ' +
           'JSON._plates.rewrite.objkey(&quot;' + path + '&quot;,' +
            escObjInAttr(id) + ', key) +' +
           'JSON._parseObj(o, &quot;' + path + '&quot; +' +
            '\'[\' + JSON._plates.escObjInNestedAttr(key) + \']\',' +
            escObjInAttr(id) + ', \'rewrite\') + \',\';' +
          // Data update.
          'JSON.getweb[' + escObjInAttr(id) + ']' + path + '[key] = o;';
      });
    // FIXME we must wait for it to render.
    setTimeout(function(){div.firstChild.nextSibling.focus()}, 100);

    /* Add the type selector to the dom tree. */
    button.parentNode.parentNode.insertBefore(div, button.parentNode);

    /* Void the key name input widget. */
    button.previousSibling.value = '';
  },
  addListBut: function(button, path, id, index) {
    /* add button */
    var div = document.createElement('div');
    div.classList.add('webjson-element');
    div.innerHTML = JSON._plates.rewrite.listitem(path, id, index) +
      JSON._plates.rewrite.addButAsk(path, id,
        function(path, id) {
          // In there, `that` is the button DOM node.
          // All this is JS inside a DOM attribute.
          // The object being parsed is at index length.
          return 'var index = JSON.getweb[' + escObjInAttr(id) + ']' +
            path + '.length;' +
            // Graphical update.
            'that.parentNode.parentNode.innerHTML = ' +
             'JSON._plates.rewrite.listitem(&quot;' + path + '&quot;,' +
              escObjInAttr(id) + ', index) +' +
             'JSON._parseObj(o, &quot;' + path + '[&quot; + index +' +
              '&quot;]&quot;, ' + escObjInAttr(id) + ',' +
              '\'rewrite\') + \',\';' +
            // Data update.
            'JSON.getweb[' + escObjInAttr(id) + ']' + path + '.push(o);';
      });

    /* Add the selector to the dom tree. */
    button.parentNode.parentNode.insertBefore(div, button.parentNode);
  }
};


}());

