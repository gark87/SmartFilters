function SmartFilters() {
  var box;
  var msgWindow;
  var locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
               getService(Components.interfaces.nsIStringBundleService).
               createBundle("chrome://smartfilters/locale/smartfilters.properties");
  var preferences = Components.classes["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService)
                       .getBranch("smartfilters.");


  var filtersMap = {
    "mailing.list" : MailingListUtil,
    "robot"        : RobotUtil,
  };

  this.createData = function(folder) {
    var data = {};
    data.myEmails = [];
    data.messages = [];
    // find out all user emails
    var identity = folder.customIdentity;
    if (!identity) {
      var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
      var identities = accountManager.allIdentities;
      for (var i = 0; i < identities.Count(); i++) {
        var identity = identities.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgIdentity);
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
      var patternPref = filter.replace(' ', '.') + ".pattern";
      var prefix = preferences.getCharPref(patternPref);
      data.filters.push({ name : filter, prefix : prefix });
    }
    // load headers for last N messages
    var N = preferences.getIntPref("max.emails.count");
    var database = folder.getDBFolderInfoAndDB({});
    var i = 0;
    var headers = [];
    for(var enumerator = database.EnumerateMessages(); enumerator.hasMoreElements(); ) {
      var header = enumerator.getNext();
      if (header instanceof Components.interfaces.nsIMsgDBHdr)
        headers[i++ % N] = header;
    }
    data.messages = headers.map(function(header) {
      var result = {
        "author" : [],
        "recipients" : [],
      };
      Util.processAddressListToArray(header.ccList, result.recipients);
      Util.processAddressListToArray(header.recipients, result.recipients);
      Util.processAddressListToArray(header.author, result.author);
      result.messageId = header.messageId.toLowerCase();
      return result;
    });
    return data;
  }

  this.start = function() {
    var folder = window.arguments[0].folder;
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
      setStatus(id, data.percentage);
      // remove all children from box
      while (box.firstChild) {
        box.removeChild(box.lastChild);
      }
      var results = data.results;
      for(var i = 0; i < results.length; i++) {
        var result = results[i];
        // messages not filtered by anything
        if (result.icons.length == 0)
          continue;
        // filter without messages
        if (result.messageIndices.length <= threshold)
          continue;
        box.createRow(result);
      }
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
    var folder = data.getFolder();
    var filtersList = folder.getFilterList(null);
    var position = filtersList.filterCount;
    var items = box.childNodes;
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var checkbox = document.getAnonymousElementByAttribute(item,
                                  "anonid", "smartfilters-checkbox");
      if (!checkbox.checked)
        continue;

      var msg = item.getAttribute("msg");
      var textbox = document.getAnonymousElementByAttribute(item, "anonid", "smartfilters-folder");
      // create needed folders
      var destFolder = folder;
      var folders = textbox.value.split('.');
      var getChildNamed = function(folder, name) {
        var subFolders = GetSubFoldersInFolderPaneOrder(folder);
        for(var j = 0; j < subFolders.length; j++) {
          var subFolder = subFolders[j];
          if(name == subFolder.name)
            return subFolder;
        }
        return null;
      }
      for(var k = 0; k < folders.length; k++) {
        var needle = folders[k];
        var subFolder = getChildNamed(destFolder, needle);
        if (subFolder == null) {
          destFolder.createSubfolder(needle, msgWindow);
          subFolder = getChildNamed(destFolder, needle);
        }
        destFolder = subFolder;
      }
      // create filter
      var newFilter = filtersList.createFilter("SF_" + msg + "_" + position);
      newFilter.enabled = true;
      var action = newFilter.createAction();
      action.type = Components.interfaces.nsMsgFilterAction.MoveToFolder;
      // set correct destination folder
      action.targetFolderUri = destFolder.URI;
      // fix filter term
//      var term = item.data.createFilterTerm(newFilter);
      newFilter.appendAction(action);
      filtersList.insertFilterAt(position++, newFilter);
    }
    filtersList.saveToDefaultFile();
    applyFilters(filtersList);
    close();
  }

  function applyFilters(filtersList) {
    var filterService = Components.classes["@mozilla.org/messenger/services/filters;1"]
                                  .getService(Components.interfaces.nsIMsgFilterService);
    var folders = Components.classes["@mozilla.org/supports-array;1"]
                                  .createInstance(Components.interfaces.nsISupportsArray);
    folders.AppendElement(data.getFolder());
    filterService.applyFiltersToFolders(filtersList, folders, msgWindow);
  }

  function setStatus(text, percentage) {
    gStatus.value = locale.GetStringFromName("status") + text + "...";
    gProgressMeter.value = percentage;
  }
}

const smartfilters = new SmartFilters();
