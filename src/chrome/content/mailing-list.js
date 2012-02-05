///////////////////////////////////////////////
// mailing list SmartFilter processor
///////////////////////////////////////////////

function MailingListUtil() {
  // fields
  var recipient2indices = {};
  var mailing_list_100 = new HashMap();

  this.createFilterTerm = function(filter) {
    var term = filter.createTerm();

    term.attrib = Components.interfaces.nsMsgSearchAttrib.ToOrCC;
    term.op = Components.interfaces.nsMsgSearchOp.Contains;
    term.booleanAnd = true;

    var termValue = term.value;
    termValue.attrib = term.attrib;
    termValue.str = this.email;

    term.value = termValue;
    filter.appendTerm(term);
  };

  this.process = function(prevResult) {
    this.init(prevResult, "mailing list", function(i, message) {
      // collect recipients(To: and CC:)
      var recipients = new HashMap();
      Util.processAddressList(message.ccList, recipients);
      Util.processAddressList(message.recipients, recipients);
      // collect author(From:)
      var authors = new HashMap();
      Util.processAddressList(message.author, authors);
      // user is one of the recipients - that's how we get this email
      if (this.data.setContainsMyEmail(recipients)) {
        this.regularMails.push(i);
        return;
      }
      // user is the author - that's how we get this email
      if (this.data.setContainsMyEmail(authors)) {
        this.regularMails.push(i);
        return;
      }
      // the only one recipient means that it's 100% mailing list
      if (recipients.getSize() == 1)
        mailing_list_100.add(recipients.keys().pop());
      // more than one - lets count them.
      recipients.foreach(function (recipient) {
        var indices = recipient2indices[recipient];
        if (indices == undefined)
          indices = recipient2indices[recipient] = new HashMap();
        indices.add(i);
      }, this);
    });

    var results = this.createReturnArray(this.regularMails);
    // first of all: process 100% mailing list
    mailing_list_100.foreach(function(email) {
      var set = recipient2indices[email];
      var result = new SmartFiltersResult(set.keys(), this.icons, this.prevMessage + email, this.prevFolder + email, this.createFilterTerm);
      results.push(result);
      for (var key in recipient2indices) {
        if (key == email)
          continue;
        var hashSet = recipient2indices[key];
        set.foreach(function(prop) { hashSet.remove(prop); });
      }
      delete recipient2indices[email];
    }, this);
    // init keys array to sort and track
    var keys = [];
    for (var key in recipient2indices)
      keys.push(key);
    while(keys.length > 0) {
      // sort keys array by number of element in set
      keys.sort(function (a,b) {
        return recipient2indices[a].getSize() - recipient2indices[b].getSize();
      });
      // biggest set
      var biggestKey = keys[keys.length - 1];
      var biggestSet = recipient2indices[biggestKey];
      var biggestSize = biggestSet.getSize();
      if (biggestSize == 0)
        break;

      results.push(new SmartFiltersResult(biggestSet.keys(), this.icons,
            this.prevMessage + biggestKey, this.prevFolder + biggestKey,
            this.createFilterTerm));
      // remove biggest set elements from other sets
      for (var i = 0; i < keys.length; i++) {
        var hashSet = recipient2indices[keys[i]];
        biggestSet.foreach(function(prop) { hashSet.remove(prop); });
      }
      delete recipient2indices[biggestKey];
      keys.splice(keys.length - 1, 1);
    }
    return results;
  };
}

