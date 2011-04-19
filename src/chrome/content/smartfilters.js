const MAX = 1000;

var allMessages = 0;
var messages = [];

function onLoad() {
  gStatus = document.getElementById("status");
  gProgressMeter = document.getElementById("progressmeter");
  var uri = window.arguments[0].folderURI;
  var folder = GetMsgFolderFromUri(uri, false);
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
  box.appendChild(box.createConsoleRow("oooohh", "bot"));
  box.appendChild(box.createConsoleRow("dddsss", "bot"));
  box.appendChild(box.createConsoleRow("lalala", "bot"));
}

function setProgress(processed) {
  gProgressMeter.value = 100 * processed / allMessages;
}

function setStatus(text) {
  gStatus.value = "Status: " + text + "...";
}

