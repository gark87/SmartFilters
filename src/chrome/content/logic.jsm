Components.utils.import("chrome://smartfilters/content/backend/backend.jsm");
Components.utils.import("chrome://smartfilters/content/preferences.jsm");
Components.utils.import("chrome://smartfilters/content/util.jsm");
Components.utils.import("chrome://smartfilters/content/dispmua/dispmua-common.jsm");

var EXPORTED_SYMBOLS = ["SmartFiltersLogic"];

/**
 * This class contains all logic about collecting information 
 * to analyze and spawning worker.
 */ 
function SmartFiltersLogic(folder, window, msgWindow) {
  var worker;
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  var startWorker = function() {
    worker = new Worker("chrome://smartfilters/content/worker/worker.js");
    var data = {};
    data.myEmails = [];
    data.messages = [];
    // find out all user emails
    var identity = folder.customIdentity;
    if (!identity) {
      var accountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
      var identities = accountManager.allIdentities;
      for (var i = 0; i < identities.Count(); i++) {
        var identity = identities.GetElementAt(i).QueryInterface(Ci.nsIMsgIdentity);
        data.myEmails.push(identity.email.toLowerCase());
      }
    } else {
      data.myEmails.push(identity.email.toLowerCase());
    }
    // suck out all preferences
    data.filters = [];
    var children = {};
    preferences.getChildList("filter.", children);
    for (var i = 1; i <= children.value; i++) {
      var filter = preferences.getCharPref("filter." + i);
      if (filter == 'nothing')
        continue;
      var patternPref = filter.replace(' ', '.') + ".pattern";
      var prefix = preferences.getCharPref(patternPref);
      data.filters.push({ name : filter, prefix : prefix });
    }
    // load ignores 
    data.ignore = preferences.getCharPref("subject.ignore");
    // load headers for last N messages
    var N = preferences.getIntPref("max.emails.count");
    var dbView = Cc["@mozilla.org/messenger/msgdbview;1?type=quicksearch"].createInstance(Ci.nsIMsgDBView);
    var out = {};
    dbView.open(folder, Ci.nsMsgViewSortType.byDate,
                        Ci.nsMsgViewSortOrder.descending, 
                        Ci.nsMsgViewFlagsType.kNone, out);
    var i = 0;
    var messages = [];
    if (out.value > N)
      out.value = N;
    for(var i = 0; i < out.value; i++) {
      messages[i] = { 
        header : dbView.getMsgHdrAt(i),
           URI : dbView.getURIForViewIndex(i),
      };
    }
    dbView.close();
    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance ( Components.interfaces.nsIMessenger );
    var total = messages.length;
    var setStatus = this.setStatus;
    var convertMessage = function () {
      var length = total - messages.length;
      setStatus(length + " of " + total + " messages is loaded", 50 * length / total);
      if (length == total) {
        worker.postMessage({
            'data' : data,
            'id' : 'start',
        });
        return;
      }
      var message = messages.shift();
      var header = message.header;      
      var result = {
        "author"     : [],
        "recipients" : [],
        "subject"    : header.mime2DecodedSubject.toLowerCase(),
      };
      Util.processAddressListToArray(header.ccList, result.recipients);
      Util.processAddressListToArray(header.recipients, result.recipients);
      Util.processAddressListToArray(header.author, result.author);

      var msgURI = message.URI;
      var msgService = messenger.messageServiceFromURI ( msgURI ) ;
      dispMUA.setInfo(false, []);
      dispMUA.stopped = false;
      msgService.CopyMessage ( msgURI , dispMUA.StreamListener , false , null , msgWindow , {} ) ;
      var fillResult = function() {
        var icon = dispMUA.Info["ICON"];
        if (!dispMUA.stopped) {
          window.setTimeout(fillResult, 0);
          return;
        }
        result.dispMUAIcon = icon;
        data.messages.push(result);
        window.setTimeout(convertMessage, 0);
      };
      window.setTimeout(fillResult, 0);
    };
    window.setTimeout(convertMessage, 0);
  }

  this.start = function() {
    startWorker.call(this);
    this.setStatus("start analyzing", 50);
    this.threshold = preferences.getIntPref("threshold");
    var owner = this;
    worker.onmessage = function(event) {
      var onMessage = function() { 
        var data = event.data;
        var id = data.id;
        if (id == "end") {
          this.setStatus("finished", 100);
          atEnd();
          return;
        }
        if (id == "debug") {
          Application.console.log(data.text);
          return;
        }
        this.setStatus(id + " " + data.postfix, 50 + data.percentage / 2);
        this.onResultsArrived(data.results);
      };
      onMessage.call(owner);
    }
  };

  this.onResultsArrived = function(results) {
  }

  this.atEnd = function() {
  } 

  this.setStatus = function(text, percentage) {
  }
}
