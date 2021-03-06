const XUL = "chrome://smartfilters/content/smartfilters.xul";

let formatter = new Log4Moz.BasicFormatter();
let root = Log4Moz.repository.rootLogger;
let logFile = FileUtils.getFile("ProfD", 
     ["SmartFilters", "smartilters.log"]);
root.level = Log4Moz.Level["All"];
let fileAppender = new Log4Moz.RotatingFileAppender(logFile, formatter);
fileAppender.level = Log4Moz.Level["All"];
root.addAppender(fileAppender);

Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("chrome://smartfilters/content/preferences.jsm");
Components.utils.import("chrome://smartfilters/content/daily-runner.jsm");
Components.utils.import("resource:///modules/gloda/log4moz.js");

function startSmartFilters()
{
  let folders = gFolderTreeView.getSelectedFolders();
  var msgFolder = folders[0];

  window.openDialog(XUL,
    "global:smartfilters", "all",
    { folder: msgFolder, msgWindow: msgWindow} );
}

window.addEventListener("load", initOverlay, false);

function initOverlay() {
  var menu = document.getElementById("folderPaneContext");
  menu.addEventListener("popupshowing", function (e) {
    let folders = gFolderTreeView.getSelectedFolders();
    var item = document.getElementById('smartFiltersMenu');
    item.hidden = folders.length != 1 || folders[0].isServer;
  }, false);
}

if (preferences.getBoolPref("daily")) {
  let notificationService =
      Cc["@mozilla.org/messenger/msgnotificationservice;1"]
     .getService(Ci.nsIMsgFolderNotificationService);
  notificationService.addListener(new DailyRunner(window), notificationService.msgAdded);
}
