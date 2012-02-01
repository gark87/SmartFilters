const MAX = 5000;

var messages = [];
var folder = null;
var myEmails = [];
var box;
var msgWindow;
var locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
             getService(Components.interfaces.nsIStringBundleService).
             createBundle("chrome://smartfilters/locale/smartfilters.properties");

var prefs = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService)
           .getBranch("smartfilters.");

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

function onLoad() {
  gStatus = document.getElementById("status");
  gProgressMeter = document.getElementById("progressmeter");
  folder = window.arguments[0].folder;
  msgWindow = window.arguments[0].msgWindow;
  box = document.getElementById("smartfilters-box");
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
  var database = folder.getDBFolderInfoAndDB({});
  var i = 0;
  for(var enumerator = database.EnumerateMessages(); enumerator.hasMoreElements(); ) {
    var header = enumerator.getNext();
    if (header instanceof Components.interfaces.nsIMsgDBHdr)
      messages[i++ % MAX] = header;
  }
  document.title = locale.GetStringFromName("title") + folder.name;
  setStatus("Looking for mailing bots");
  var children = {};
  var allMessages = range(0, messages.length);
  var results = [new SmartFiltersResult(allMessages, ["wow"], "", "INBOX", function() {})];
  prefs.getChildList("filter.", children);
  for (var i = 1; i <= children.value; i++) {
    var pref = prefs.getCharPref("filter." + i);
    var filt = filtersMap[pref];
    if (filt) {
      var prevResults = results;
      results = [];
      for(var k = 0; k < prevResults.length; k++) {
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
    // all messages filtered
//    if (result.getMessageIndeces().length == allMessages.length)
//      continue;
    box.createRow(result);
  }
}

function selectAll(select) {
  var items = box.childNodes;
  for (var i = 0 ; i < items.length; i++) {
    var item = items[i];
    var checkbox = document.getAnonymousElementByAttribute(item,
                                "anonid", "smartfilters-checkbox");
    checkbox.checked = select;
  }
}

function stop() {
  //box.createRow({message: "oooohh", icons: [ "bot" ], percent: 23}, {});
  //box.createRow({message: "ddddssss", icons: [ "bot", "qwe" ], percent: 1}, {});
  //box.createRow({message: "lalala", icons: [ "bot", "1", "asdas" ], percent:99}, {});
}

function apply() {
  var filtersList = folder.getFilterList(null);
  var items = box.childNodes;
  for (var i = 0 ; i < items.length; i++) {
    var item = items[i];
    var checkbox = document.getAnonymousElementByAttribute(item,
                                "anonid", "smartfilters-checkbox");
    if (!checkbox.checked)
      continue;

    var msg = item.getAttribute("msg");
    // create (sub-)folder ...
    var folderName = document.getAnonymousElementByAttribute(item, "anonid", "smartfilters-folder").value.replace('.', '_');
    folder.createSubfolder(folderName, msgWindow);
    folder.updateFolder(msgWindow);
    var destFolder = folder.findSubFolder(encodeURIComponent(folderName));
    var newFilter = filtersList.createFilter(msg);
    newFilter.enabled = true;
    var action = newFilter.createAction();
    action.type = Components.interfaces.nsMsgFilterAction.MoveToFolder;
    // set correct destination folder
    action.targetFolderUri = destFolder.URI;
    // fix filter term
    var term = item.data.createFilterTerm(newFilter);
    newFilter.appendAction(action);
    filtersList.insertFilterAt(filtersList.filterCount, newFilter);
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
  folders.AppendElement(folder);
  filterService.applyFiltersToFolders(filtersList, folders, msgWindow);
}

function setProgress(processed) {
  gProgressMeter.value = 100 * processed / allMessages;
}

function setStatus(text) {
  gStatus.value = locale.GetStringFromName("status") + text + "...";
}

