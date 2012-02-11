/////////////////////////////////////////////////////////////////////////////////////////
// This is base class for SmartFilter's processors
/////////////////////////////////////////////////////////////////////////////////////////
function Util(data) {
  this.data = data;
  this.getFolderPath = function(username, domain) {
    var prefPrefix = this.getPrefPrefix();
    var result = this.data.preferences.getCharPref(prefPrefix + ".pattern");
    result = result.replace(/%u/g, username);
    result = result.replace(/%d/g, domain);
    return result;
  }
  this.init = function(prevResult) {
    this.getPrevText = function () { return prevResult.getText(); };
    this.getPrevIcons = prevResult.getIcons;

    // generate correct icons array here
    var icons = [];
    var prevIcons = prevResult.getIcons();
    for(var i = 0; i < prevIcons.length; i++)
      icons[i] = prevIcons[i];
    icons.push(this.getIconName());
    this.getIcons = function() { return icons; }

    // about this mails this processor cannot say anything interesting
    this.regularMails = [];
    this.createReturnArray = function(mails) {
      return [new SmartFiltersResult(mails, this.getPrevIcons(), this.getPrevText(),
          prevResult.getFolder(), prevResult.createFilterTerm)];
    }

    this.composeDir = function(dirname) {
      var prevFolder = prevResult.getFolder();
      if (prevFolder == "")
        return dirname;
      return prevResult.getFolder() + '.' + dirname;
    }

    // process all messages
    var messageIndices = prevResult.getMessageIndices();
    for(var i = 0; i < messageIndices.length; i++) {
      var messageIndex = messageIndices[i];
      var message = this.data.getMessage(messageIndex);
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

