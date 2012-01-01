///////////////////////////////////////////////
// mailing list filter
///////////////////////////////////////////////
function MailingListUtil(messages) {
  this.map = {};
  this.regularMails = [];
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
    if (searchArrayInMap(myEmails, recipients)) {
      this.regularMails.push(i);
      continue;
    }
    // user is the author - that's how we get this email
    if (searchArrayInMap(myEmails, authors)) {
      this.regularMails.push(i);
      continue;
    }
    for (var recipient in recipients) {
      var indeces = this.map[recipient];
      if (indeces == undefined)
        indeces = this.map[recipient] = new HashSet(); 
      indeces.put(i);
    }
  }
}


MailingListUtil.prototype.process = function() {
  var map = this.map;
  // init keys array to sort and track
  var keys = [];
  for (var key in map) 
    keys.push(key);
  var result = [];
  while(keys.length > 0) {
    // sort keys array by number of element in set
    keys.sort(function (a,b) {
        return map[a].getSize() - map[b].getSize();
        });
    // biggest set
    var biggestKey = keys[keys.length - 1];
    var biggestSet = map[biggestKey];
    var biggestSize = biggestSet.getSize();
    if (biggestSize == 0)
      break;

    // remove biggest set elements from other sets
    for (var i = 0; i < keys.length; i++) {
      var hashSet = map[keys[i]];	
      biggestSet.foreach(function(prop) { hashSet.remove(prop); });
    }
    var view = {
      icons   : [ "mailing list" ],
      message : biggestKey,
      folder  : biggestKey,
      emails  : biggestSize,
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
    result.push({});
    keys.splice(keys.length - 1, 1);
    delete map[biggestKey];
  }
}
