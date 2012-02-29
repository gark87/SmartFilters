/////////////////////////////////////////////////////////////////////////////
// class contains common data that shared between processors
/////////////////////////////////////////////////////////////////////////////
function CommonData(folder, N) {
  var myEmails = [];
  var messages = [];
  this.preferences = Components.classes["@mozilla.org/preferences-service;1"]
                     .getService(Components.interfaces.nsIPrefService)
                     .getBranch("smartfilters.");

  // find out all user emails
  var identity = folder.customIdentity;
  if (!identity) {
    var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
    var identities = accountManager.allIdentities;
    for (var i = 0; i < identities.Count(); i++) {
      var identity = identities.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgIdentity);
      myEmails.push(identity.email);
    }
  } else {
    myEmails.push(identity.email);
  }
  // load headers for last N messages
  var database = folder.getDBFolderInfoAndDB({});
  var i = 0;
  for(var enumerator = database.EnumerateMessages(); enumerator.hasMoreElements(); ) {
    var header = enumerator.getNext();
    if (header instanceof Components.interfaces.nsIMsgDBHdr)
      messages[i++ % N] = header;
  }
  // methods
  this.setContainsMyEmail = function(set) {
    for each (var elem in myEmails) {
      if (set.get(elem) != undefined)
        return true;
    }
    return false;
  };
  // getters
  this.getFolder = function () { return folder; }
  this.getMessage = function (i) { return messages[i]; }
  this.numberOfMessages = function () { return messages.length; }
};

function SmartFilters() {
  const MAX = 5000;

  var data;
  var box;
  var msgWindow;
  var locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
               getService(Components.interfaces.nsIStringBundleService).
               createBundle("chrome://smartfilters/locale/smartfilters.properties");


  var filtersMap = {
    "mailing list" : MailingListUtil,
    "robot"        : RobotUtil,
  };

  function range(from, to) {
    var arr = [];
    for(var i = from; i < to; i++)
      arr.push(i);
    return arr;
  }

  this.start = function() {
    gStatus = document.getElementById("status");
    gProgressMeter = document.getElementById("progressmeter");
    msgWindow = window.arguments[0].msgWindow;
    box = document.getElementById("smartfilters-box");
    data = new CommonData(window.arguments[0].folder, MAX);
    document.title = locale.GetStringFromName("title") + data.getFolder().name;
    setStatus("Looking for mailing bots");
    var allMessages = range(0, data.numberOfMessages());
    var results = [new SmartFiltersResult(allMessages, [], "", "", function() {})];
    var util = new Util(data);
    var children = {};
    data.preferences.getChildList("filter.", children);
    for (var i = 1; i <= children.value; i++) {
      var pref = data.preferences.getCharPref("filter." + i);
      var filt = filtersMap[pref];
      if (filt) {
        var prevResults = results;
        results = [];
        for(var k = 0; k < prevResults.length; k++) {
          filt.prototype = util;
          var filter = new filt();
          var result = filter.process(prevResults[k]);
          for(var j = 0; j < result.length; j++)
            results.push(result[j]);
        }
      }
    }
    for(var i = 0; i < results.length; i++) {
      var result = results[i];
      // messages not filtered by anything
      if (result.getIcons().length == 0)
        continue;
      // filter without messages
      if (result.getMessageIndices().length == 0)
        continue;
      box.createRow(result);
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
      // create (sub-)folder ...
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
      var term = item.data.createFilterTerm(newFilter);
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

  function setProgress(processed) {
    gProgressMeter.value = 100 * processed / allMessages;
  }

  function setStatus(text) {
    gStatus.value = locale.GetStringFromName("status") + text + "...";
  }
}

const smartfilters = new SmartFilters();
