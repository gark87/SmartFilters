var EXPORTED_SYMBOLS = ["preferences"];

const preferences = Components.classes["@mozilla.org/preferences-service;1"]
                 .getService(Components.interfaces.nsIPrefService)
                 .getBranch("extensions.smartfilters.");
