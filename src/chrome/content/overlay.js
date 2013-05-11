function startSmartFilters()
{
  var msgFolder = gFolderDisplay.displayedFolder;

  window.openDialog("chrome://smartfilters/content/smartfilters.xul",
    "global:smartfilters", "all",
    { folder: msgFolder, msgWindow: msgWindow} );
}

Components.utils.import("chrome://smartfilters/content/preferences.jsm");
const newMailListener = {
  msgAdded: function(aMsgHdr) {
    if (!preferences.getBoolPref("daily"))
      return;
    var lastDate = preferences.getCharPref("last.date");
    var now = (new Date()).toDateString();

    if (lastDate == now)
      return;
    alert(now);
    preferences.setCharPref("last.date", now);
  }
};
var notificationService =
    Cc["@mozilla.org/messenger/msgnotificationservice;1"]
   .getService(Ci.nsIMsgFolderNotificationService);
notificationService.addListener(newMailListener, notificationService.msgAdded);
