const MAX = 1000;

var allMessages = 0;
var messages = [];
var folder = null;

function onLoad() {
  gStatus = document.getElementById("status");
  gProgressMeter = document.getElementById("progressmeter");
  var uri = window.arguments[0].folderURI;
  folder = GetMsgFolderFromUri(uri, false);
  var database = folder.getDBFolderInfoAndDB({});
  for(var enumerator = database.EnumerateMessages(); enumerator.hasMoreElements(); ) {
    var header = enumerator.getNext();
    if (header instanceof Components.interfaces.nsIMsgDBHdr) {
      messages[allMessages] = header;
      allMessages++;
      smartfilters_dispMUA.searchIcon(header);

      if (allMessages >= MAX)
        break;
    }
  }
  document.title = "SmartFiltering " + folder.name;
  var box = document.getElementById("smartfilters-box");
/*  var worker = new Worker("chrome://smartfilters/content/worker.js");
  worker.onerror = function(error) {
    alert("error: " + error);
  }

  worker.onmessage = function(event) {
    alert("message: " + event);
  }

  worker.postMessage(folder);
  */
}

function apply() {
  var filtersList = folder.getFilterList(null);
  var box = document.getElementById("smartfilters-box");
  var items = box.childNodes;
  for (var i = 0 ; i < items.length; i++) {
    var item = items[i];
    var checkbox = document.getAnonymousElementByAttribute(item,
                                "anonid", "smartfilters-checkbox");
    if (!checkbox.checked)
      continue;

    var newFilter = filtersList.createFilter(item.getAttribute("msg"));
    newFilter.enabled = true;
    filtersList.insertFilterAt(filtersList.filterCount, newFilter);
  }
  filtersList.saveToDefaultFile();
  close();
}

function setProgress(processed) {
  gProgressMeter.value = 100 * processed / allMessages;
}

function setStatus(text) {
  gStatus.value = "Status: " + text + "...";
}

