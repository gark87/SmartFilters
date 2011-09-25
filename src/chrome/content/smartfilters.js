const MAX = 1000;

var messages = [];
var folder = null;
var myEmails = [];
var box;
var msgWindow;
var locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
             getService(Components.interfaces.nsIStringBundleService).
             createBundle("chrome://smartfilters/locale/smartfilters.properties");

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
  for(var enumerator = database.EnumerateMessages(); enumerator.hasMoreElements(); ) {
    var header = enumerator.getNext();
    if (header instanceof Components.interfaces.nsIMsgDBHdr) {
      messages[messages.length] = header;
      smartfilters_dispMUA.searchIcon(header);

      if (messages.length >= MAX)
        break;
    }
  }
  document.title = locale.GetStringFromName("title") + folder.name;
  setStatus("Looking for mailing bots");
  mailingListProcessor();
  var worker = new Worker("chrome://smartfilters/content/worker.js");
  worker.onerror = function(error) {
    alert("error: " + error);
  }

  worker.onmessage = function(event) {
    alert("message: " + event);
  }

  worker.postMessage(folder);
}

var hdrParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
                                .getService(Components.interfaces.nsIMsgHeaderParser);

function processAddressList(list, result) {
  var emails = {};
  hdrParser.parseHeadersWithArray(list, emails, {}, {});
  for each (var recipient in emails.value) {
    result[recipient] = 1;
  }
}

function searchArrayInMap(arr, map) {
  for each (var elem in arr) {
    if (map[elem] != undefined)
      return true;
  }
  return false;
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
  box.createRow({message: "oooohh", icons: [ "bot" ], percent: 23}, {});
  box.createRow({message: "ddddssss", icons: [ "bot", "qwe" ], percent: 1}, {});
  box.createRow({message: "lalala", icons: [ "bot", "1", "asdas" ], percent:99}, {});
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

