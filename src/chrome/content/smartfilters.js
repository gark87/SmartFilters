Components.utils.import("chrome://smartfilters/content/backend/backend.jsm");
Components.utils.import("chrome://smartfilters/content/preferences.jsm");
Components.utils.import("chrome://smartfilters/content/logic.jsm");
Components.utils.import("resource:///modules/gloda/log4moz.js");

function SmartFilters() {
  const logger = Log4Moz.repository.getLogger("SmartFilters");
  var box;
  var gStatus;
  var gProgressMeter;
  var locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
         getService(Components.interfaces.nsIStringBundleService).
         createBundle("chrome://smartfilters/locale/smartfilters.properties");

  this.start = function() {
    gStatus = document.getElementById("status");
    gProgressMeter = document.getElementById("progressmeter");
    box = document.getElementById("smartfilters-box");
    document.title = locale.GetStringFromName("title") + " " + folder.prettiestName;
    logger.info("Before Logic start() call");
    this.prototype.start.call(this);
  }

  this.addItems = function(newItems) {
    if (newItems.length > 0)
      box.addItems(newItems);
  }

  this.atEnd = function() {
    document.getElementById("stop").disabled = true;
    document.getElementById("select_all").disabled = false;
    document.getElementById("unselect_all").disabled = false;
    document.getElementById("apply").disabled = false;
  } 

  this.selectAll = function(select) {
    var items = box.childNodes;
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var checkbox = document.getAnonymousElementByAttribute(item,
                                "anonid", "smartfilters-checkbox");
      checkbox.checked = select;
    }
  }

  this.apply = function() {
    var filtersList = folder.getFilterList(null);
    var position = filtersList.filterCount;
    var items = box.childNodes;
    var checkedItems = [];
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var checkbox = document.getAnonymousElementByAttribute(item,
                                  "anonid", "smartfilters-checkbox");
      if (!checkbox.checked)
        continue;
      var data = item.data;
      data.folder = document.getAnonymousElementByAttribute(item,
          "anonid", "smartfilters-folder").value;
      checkedItems.push(data);
    }
    let prompts = 
      Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Components.interfaces.nsIPromptService);
    let backend = preferences.getCharPref("backend");
    let text = smartfiltersBackend.getText(backend, checkedItems.length);
    if (prompts.confirm(window, locale.GetStringFromName("confirmation.title"), text)) {
      box.removeItems(checkedItems);
      smartfiltersBackend.run(backend, folder, checkedItems);
    } 
  }

  this.setStatus = function(text, percentage) {
    gStatus.value = locale.GetStringFromName("status") + text + "...";
    gProgressMeter.value = percentage;
  }
}

const smartfilters = new SmartFilters();
const folder = window.arguments[0].folder;
const msgWindow = window.arguments[0].msgWindow;
smartfilters.prototype = new SmartFiltersLogic(folder, window, msgWindow);
