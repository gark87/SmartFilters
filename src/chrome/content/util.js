/////////////////////////////////////////////////////////////////////////////////////////
// This is base class for SmartFilter's processors
/////////////////////////////////////////////////////////////////////////////////////////
function Util(data) {
  this.data = data;
  this.getFolderPath = function(username, domain) {
    var result = this.getPrefix();
    result = result.replace(/%u/g, username);
    result = result.replace(/%d/g, domain);
    return result;
  }
  this.init = function(prevResult) {
    this.getPrevText = function () { return prevResult.text; };

    // generate correct icons array here
    var icons = [];
    var prevIcons = prevResult.icons;
    for(var i = 0; i < prevIcons.length; i++)
      icons[i] = prevIcons[i];
    icons.push(this.getIconName());
    this.getIcons = function() { return icons; }

    // about this mails this processor cannot say anything interesting
    this.regularMails = [];
    this.createReturnArray = function(mails) {
      return [new SmartFiltersResult(mails, prevResult.icons, this.getPrevText(),
          prevResult.folder, prevResult.createFilterTerm)];
    }

    this.composeDir = function(dirname) {
      var prevFolder = prevResult.folder;
      if (prevFolder == "")
        return dirname;
      return prevResult.folder + '.' + dirname;
    }

    // process all messages
    var messageIndices = prevResult.messageIndices;
    for(var i = 0; i < messageIndices.length; i++) {
      var messageIndex = messageIndices[i];
      var message = this.data.messages[messageIndex];
      this.processMessage(i, message);
    }
  }
}

Util.processAddressList = function(list, result) {
  var emails = {};
  var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"];
  var hdrParser = headerParser.getService(Components.interfaces.nsIMsgHeaderParser);
  hdrParser.parseHeadersWithArray(list, emails, {}, {});
  for each (var recipient in emails.value) {
    result.add(recipient);
  }
};

Util.processAddressListToArray = function(list, arr) {
  var emails = {};
  var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"];
  var hdrParser = headerParser.getService(Components.interfaces.nsIMsgHeaderParser);
  hdrParser.parseHeadersWithArray(list, emails, {}, {});
  for each (var recipient in emails.value) {
    arr.push(recipient);
  }
};

Util.arrayContainsElementFromAnother = function(heap, needle) {
  for each (var elem in needle) {
    for each (var elem2 in heap) {
      if (elem == elem2)
        return true;
    }
  }
  return false;
}

Util.foreach = function(arr, func, obj) {
  for each (var elem in arr)
    (func).call(obj, elem);
}

// given an email address, split it into username and domain
// return in an associative array
Util.getEmailInfo = function (email) {
  if (!email) return null;

  var result = new Object;

  var emailData = email.split('@');

  if (emailData.length != 2) {
    dump("bad e-mail address!\n");
    return null;
  }

  // all the variables we'll be returning
  result.username = emailData[0];
  result.domain = emailData[1];

  return result;
};
