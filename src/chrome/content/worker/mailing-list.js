///////////////////////////////////////////////
// mailing list SmartFilter processor
///////////////////////////////////////////////

function MailingListUtil(prefix) {
  // private fields
  var recipient2indices = {};
  var mailing_list_100 = new HashMap();

  // override abstract methods
  this.getIconName    = function() { return  "chrome://smartfilters/skin/classic/mailing_list.png"; }
  this.getType        = function() { return "mailing.list"; }
  this.getPrefix = function () {
      return prefix;
  };
  this.processMessage = function(i, message) {
    // user is one of the recipients - that's how we get this email
    if (Util.arrayContainsMatched(message.recipients, this.data.myEmails)) {
      this.regularMails.push(i);
      return;
    }

    // user is the author - that's how we get this email
    if (Util.arrayContainsMatched(message.author, this.data.myEmails)) {
      this.regularMails.push(i);
      return;
    }
    // the only one recipient means that it's 100% mailing list
    if (message.recipients.length == 1)
      mailing_list_100.add(message.recipients[0]);
    // more than one - lets count them.
    Util.foreach(message.recipients, function (recipient) {
      var indices = recipient2indices[recipient];
      if (indices == undefined)
        indices = recipient2indices[recipient] = new HashMap();
      indices.add(i);
    }, this);
  };

  this.parseUsername = function(email) {
    var author = Util.getEmailInfo(email);
    if (!author) {
      this.log("MailingList: cannot parse author:`" + email + "`");
      return "noname";
    }
    return author.username;
  }

  this.process = function(prevResult) {
    this.init(prevResult);

    var results = this.createReturnArray(this.regularMails);
    // first of all: process 100% mailing list
    mailing_list_100.foreach(function(email) {
      var set = recipient2indices[email];
      var folder = this.createFolder(this.parseUsername(email));
      var text = email;
      var result = new SmartFiltersResult(set.keys(), 
           this.createTexts(text), this.composeDir(folder));
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

      var folder = this.createFolder(this.parseUsername(biggestKey));
      var text = biggestKey;
      results.push(new SmartFiltersResult(biggestSet.keys(), 
            this.createTexts(text), this.composeDir(folder)));
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
