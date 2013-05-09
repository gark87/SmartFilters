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

  this.init = function() {
    var argument = window.arguments[0];
    var count = argument.checkedItems.length;
    var text = backendsMap[argument.backend].text;
    text = text.replace('{}', count);
    document.getElementById("confirmQuestion").setAttribute("value", text);
    window.sizeToContent();
  };

  this.doOK = function() {
    var argument = window.arguments[0];
    var backend = backendsMap[argument.backend].backend;
    backend.apply(argument.checkedItems, argument.folder);
    argument.close = true;
    return true;
  }

  this.doCancel = function() {
    return true;
  }
}

const smartfiltersBackend = new SmartFiltersBackend();
