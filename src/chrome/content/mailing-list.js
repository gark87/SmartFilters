function mailingListProcessor() {
  var map = {};
  for(var i = 0 ; i < messages.length; i++) {
    var message = messages[i];
    // collect recipients(To: and CC:)
    var recipients = {};
    processAddressList(message.ccList, recipients);
    processAddressList(message.recipients, recipients);
    // collect author(From:)
    var authors = {};
    processAddressList(message.author, authors);
    // user is one of the recipients - that's how we get this email
    if (searchArrayInMap(myEmails, recipients))
      continue;
    // user is the author - that's how we get this email
    if (searchArrayInMap(myEmails, authors))
      continue;
    for (var recipient in recipients) {
      var indeces = map[recipient];
      if (indeces == undefined)
        indeces = map[recipient] = {
          _size : 0,
          _set  : {},

          put : function(k) {
            if (this._set[k] == undefined)
              this._size++;
            this._set[k] = 1;
          },

          remove : function(k) {
            if (this._set[k] != undefined)
              this._size--;
            delete this._set[k];
          },

          get : function(k) {
            return this._set[k];
          },

          toString : function () {
            var result = "";
            for (var prop in this._set)
              result += prop + ", "
            return result + "with size: " + this._size;
          },

          callMe : function (f) {
            for (var prop in this._set)
              f(prop);
          }
        };
      indeces.put(i);
    }
  }
  // init keys array to sort and track
  var keys = [];
  for (var key in map) 
    keys.push(key);
  while(keys.length > 0) {
    // sort keys array by number of element in set
    keys.sort(function (a,b) {
        return map[a]._size - map[b]._size;
        });
    // biggest set
    var biggestKey = keys[keys.length-1];
    var biggestSet = map[biggestKey];
    var biggestSize = biggestSet._size;
    if (biggestSize == 0)
      break;

    // remove biggest set elements from other sets
    for each (var key in keys) {
      var m = map[key];
      biggestSet.callMe(function(k) { m.remove(k); });
    }
    var view = {
      icons   : [ "bot" ],
      message : biggestKey,
      folder  : biggestKey,
      percent : biggestSize * 100 / messages.length 
    };
    var data = {
      email            : biggestKey, 
      createFilterTerm : function createFilterTerm(filter) {
        var term = filter.createTerm();

        term.attrib = Components.interfaces.nsMsgSearchAttrib.ToOrCC;
        term.op = Components.interfaces.nsMsgSearchOp.Contains;
        term.booleanAnd = true;

        var termValue = term.value;
        termValue.attrib = term.attrib;
        termValue.str = this.email;

        term.value = termValue;
        filter.appendTerm(term);
      }
    };
    box.createRow(view, data);
    keys.splice(keys.length - 1, 1);
    delete map[biggestKey];
  }
}
