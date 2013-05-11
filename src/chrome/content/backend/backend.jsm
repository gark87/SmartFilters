var EXPORTED_SYMBOLS = ["smartfiltersBackend"];

const Cu = Components.utils;
Cu.import("chrome://smartfilters/content/backend/imapfolders.jsm");
Cu.import("chrome://smartfilters/content/backend/term-creator.jsm");
Cu.import("chrome://smartfilters/content/backend/virtualfolders.jsm");

function SmartFiltersBackend() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const locale = Cc["@mozilla.org/intl/stringbundle;1"].
               getService(Ci.nsIStringBundleService).
               createBundle("chrome://smartfilters/locale/confirmation.properties");
  const msgSearchSession = Cc["@mozilla.org/messenger/searchSession;1"]
              .createInstance(Ci.nsIMsgSearchSession);
  const termCreator = new TermCreator(msgSearchSession);
  const backendsMap = {
    "virtual folders" : 
         { 
           backend : new VirtualFoldersBackend(termCreator, false),
           text    : locale.GetStringFromName("virtual.folders"),
         },

    "online virtual folders" : 
         {
           backend : new VirtualFoldersBackend(termCreator, true),
           text    : locale.GetStringFromName("online.virtual.folders"),
         },
    "imap folders" : 
         {
           backend : new ImapFoldersBackend(termCreator),
           text    : locale.GetStringFromName("imap.folders"),
         },
  };

  this.getText = function(backend, count) {
    var text = backendsMap[backend].text;
    return text.replace('{}', count);
  };

  this.run = function(backend, folder, checkedItems) {
    var backend = backendsMap[backend].backend;
    backend.apply(checkedItems, folder);
  }
}

const smartfiltersBackend = new SmartFiltersBackend();
