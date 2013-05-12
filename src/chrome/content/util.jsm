var EXPORTED_SYMBOLS = ["Util"];

var Util = {
  // given an email address, split it into username and domain
  // return in an associative array
  getEmailInfo : function (email) {
    if (!email) return null;

    var result = new Object;

    var emailData = email.split('@');

    if (emailData.length != 2) 
      return null;

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
    for each (var recipient in emails.value) {
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
    for each (var recipient in emails.value) {
      if (Util.getEmailInfo(recipient)) {
	arr.push(recipient.toLowerCase());
      }
    }
  },

  arrayContainsElementFromAnother : function(heap, needle) {
    for each (var elem in needle) {
      for each (var elem2 in heap) {
	if (elem == elem2)
	  return true;
      }
    }
    return false;
  },

  foreach : function(arr, func, obj) {
    for each (var elem in arr)
      (func).call(obj, elem);
  },
};
