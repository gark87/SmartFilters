var EXPORTED_SYMBOLS = ["Util"];

var Util = {
  // given an email address, split it into username and domain
  // return in an associative array
  getEmailInfo : function (email) {
    if (!email) return null;

    var emailData = email.split('@');

    if (emailData.length != 2) 
      return null;

    var result = {};
    // all the variables we'll be returning
    result.username = emailData[0];
    result.domain = emailData[1];

    return result;
  },

  processAddressList : function(list, result) {
    var emails = {};
    var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"];
    var hdrParser = headerParser.getService(Components.interfaces.nsIMsgHeaderParser);
    hdrParser.parseHeadersWithArray(list, emails, {}, {});
    for (var i = 0; i < emails.value.length; i++) {
      var recipient = emails.value[i];
      if (Util.getEmailInfo(recipient)) {
        result.add(recipient);
      }
    }
  },

  processAddressListToArray : function(list, arr) {
    var emails = {};
    var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"];
    var hdrParser = headerParser.getService(Components.interfaces.nsIMsgHeaderParser);
    hdrParser.parseHeadersWithArray(list, emails, {}, {});
    for (var i = 0; i < emails.value.length; i++) {
      var recipient = emails.value[i];
      if (Util.getEmailInfo(recipient)) {
        arr.push(recipient.toLowerCase());
      }
    }
  },

  arrayContainsMatched : function(arr, regexes) {
    for (var i = 0; i < regexes.length; i++) {
      var regex = regexes[i];
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].match(regex))
          return true;
      }
    }
    return false;
  },

  foreach : function(arr, func, obj) {
    for (var i = 0; i < arr.length; i++) {
      (func).call(obj, arr[i]);
    }
  },
};
