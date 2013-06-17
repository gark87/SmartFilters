const XUL = "chrome://smartfilters/content/smartfilters.xul";

function startSmartFilters()
{
  var msgFolder = gFolderDisplay.displayedFolder;

  window.openDialog(XUL,
    "global:smartfilters", "all",
    { folder: msgFolder, msgWindow: msgWindow} );
}

Components.utils.import("chrome://smartfilters/content/preferences.jsm");

if (preferences.getBoolPref("daily")) {
  var urls = [];
  var dates = [];
/*    getLocalDirectory : function() {
      let directoryService =
          Cc["@mozilla.org/file/directory_service;1"].
          getService(Ci.nsIProperties);
      // this is a reference to the profile dir (ProfD) now.
      let localDir = directoryService.get("ProfD", Ci.nsIFile);
      
     localDir.append("XULSchool");
     
    if (!localDir.exists() || !localDir.isDirectory()) {
    // read and write permissions to owner and group, read-only for others.
    localDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0774);
    }
                                   
    return localDir;
    };
*/
  const newMailListener = {
    msgAdded: function(aMsgHdr) {
      var now = (new Date()).toDateString();
      var url = aMsgHdr.folder.folderURL.replace(/\W+/g, "_");

      var index = urls.indexOf(url);
      if (index < 0) {
        urls.push(url);
        dates.push(now);
      } else {
        var date = dates[index];
        if (now != date) {
          dates[index] = now;
        } else {
          return;
        }
      }
      var tabmail = document.getElementById("tabmail");
      var nodes = tabmail.tabContainer.childNodes;
      for(var i = 0; i < nodes.length; i++) {
        if (nodes[i].label == "Smartfilters")
          return;
      }
      var msgFolder = gFolderDisplay.displayedFolder;
      let tab = tabmail.openTab("chromeTab", 
          { chromePage : XUL, 
            background : true,
            folder     : msgFolder,
            msgWindow  : msgWindow 
          });
      let icon = "chrome://smartfilters/skin/classic/logo-active.png";

      Cc['@mozilla.org/alerts-service;1'].
         getService(Ci.nsIAlertsService).
         showAlertNotification(icon, "Smartfilters", "found new filters", true, '', null);
        preferences.setCharPref(url, JSON.stringify(json));
  //    preferences.setCharPref("last.date", now);
    }
  };

  var notificationService =
      Cc["@mozilla.org/messenger/msgnotificationservice;1"]
     .getService(Ci.nsIMsgFolderNotificationService);
  notificationService.addListener(newMailListener, notificationService.msgAdded);
}
