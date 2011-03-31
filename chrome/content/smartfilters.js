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
      if (allMessages >= MAX)
        break;
    }
  }
  document.title = "SmartFiltering " + folder.name;
}

function setProgress(processed) {
  gProgressMeter.value = 100 * processed / allMessages;
}

function setStatus(text) {
  gStatus.value = "Status: " + text + "...";
}
