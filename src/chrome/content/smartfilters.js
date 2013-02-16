Cu.import("resource:///modules/virtualFolderWrapper.js");

function SmartFilters() {
  var box;
  var msgWindow;
  var folder;
  var locale = Cc["@mozilla.org/intl/stringbundle;1"].
               getService(Ci.nsIStringBundleService).
               createBundle("chrome://smartfilters/locale/smartfilters.properties");
  var preferences = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch("extensions.smartfilters.");
  var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                         .getService(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var termCreator = Cc["@mozilla.org/messenger/searchSession;1"]
		    .createInstance(Ci.nsIMsgSearchSession);
  var baseBackend = new Backend(termCreator);
  VirtualFoldersBackend.prototype = baseBackend;
  ImapFoldersBackend.prototype = baseBackend;
  var backendsMap = {
    "virtual folders" : new VirtualFoldersBackend(false),
    "online virtual folders" : new VirtualFoldersBackend(true),
    "imap folders" : new ImapFoldersBackend(),
  };

  this.createData = function(folder) {
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
        data.myEmails.push(identity.email);
      }
    } else {
      data.myEmails.push(identity.email);
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
    // load headers for last N messages
    var N = preferences.getIntPref("max.emails.count");
    var dbView = Cc["@mozilla.org/messenger/msgdbview;1?type=quicksearch"].createInstance(Ci.nsIMsgDBView);
    var out = {};
    dbView.open(folder, Ci.nsMsgViewSortType.byDate,
	                Ci.nsMsgViewSortOrder.descending, 
			Ci.nsMsgViewFlagsType.kNone, out);
    var i = 0;
    var headers = [];
    if (out.value > N)
      out.value = N;
    for(var i = 0; i < out.value; i++) {
      headers[i] = dbView.getMsgHdrAt(i);
    }
    dbView.close();
    data.messages = headers.map(function(header) {
      var result = {
        "author"     : [],
        "recipients" : [],
	"subject"    : header.mime2DecodedSubject,
      };
      Util.processAddressListToArray(header.ccList, result.recipients);
      Util.processAddressListToArray(header.recipients, result.recipients);
      Util.processAddressListToArray(header.author, result.author);
      result.messageId = header.messageId.toLowerCase();
      return result;
    });
    return data;
  }
;
  this.start = function() {
    folder = window.arguments[0].folder;
    var worker = new Worker("chrome://smartfilters/content/worker.js");
    worker.postMessage({
        'data' : this.createData(folder),
        'id' : 'start'
    });
    gStatus = document.getElementById("status");
    gProgressMeter = document.getElementById("progressmeter");
    msgWindow = window.arguments[0].msgWindow;
    box = document.getElementById("smartfilters-box");
    document.title = locale.GetStringFromName("title") + " " + folder.URI;
    setStatus("initializing", 0);
    var threshold = preferences.getIntPref("threshold");
    worker.onmessage = function(event) {
      var data = event.data;
      var id = data.id;
      if (id == "end") {
        setStatus("finished", 100);
        return;
      }
      if (id == "debug") {
	Application.console.log(data.text);
	return;
      }
      setStatus(id + " " + data.postfix, data.percentage);
      var results = data.results;
      var newItems = [];
      for(var i = 0; i < results.length; i++) {
        var result = results[i];
        // messages not filtered by anything
        if (result.texts.length == 0)
          continue;
        // filter without messages
        if (result.messageIndices.length <= threshold)
          continue;
	newItems.push(result);
      }
      if (newItems.length > 0)
        box.replaceItem(newItems, data.insteadof);
    }
  };

  this. selectAll = function(select) {
    var items = box.childNodes;
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var checkbox = document.getAnonymousElementByAttribute(item,
                                "anonid", "smartfilters-checkbox");
      checkbox.checked = select;
    }
  }

  this.apply = function() {
    var filtersList = folder.getFilterList(null);
    var position = filtersList.filterCount;
    var items = box.childNodes;
    var checkedItems = [];
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var checkbox = document.getAnonymousElementByAttribute(item,
                                  "anonid", "smartfilters-checkbox");
      if (!checkbox.checked)
        continue;
      checkedItems.push(item);
    }
    var backend = backendsMap[preferences.getCharPref("backend")];
    backend.apply(checkedItems, folder);
    close();
  }

  function applyFilters(filtersList) {
    var filterService = Cc["@mozilla.org/messenger/services/filters;1"]
                                  .getService(Ci.nsIMsgFilterService);
    var folders = Cc["@mozilla.org/supports-array;1"]
                                  .createInstance(Ci.nsISupportsArray);
    folders.AppendElement(data.getFolder());
    filterService.applyFiltersToFolders(filtersList, folders, msgWindow);
  }

  function setStatus(text, percentage) {
    gStatus.value = locale.GetStringFromName("status") + text + "...";
    gProgressMeter.value = percentage;
  }
}

const smartfilters = new SmartFilters();
