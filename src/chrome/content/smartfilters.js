Components.utils.import("chrome://smartfilters/content/backend/backend.jsm");

function SmartFilters() {
  var box;
  var msgWindow;
  var folder;
  var locale = Cc["@mozilla.org/intl/stringbundle;1"].
               getService(Ci.nsIStringBundleService).
               createBundle("chrome://smartfilters/locale/smartfilters.properties");
  var preferences = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch("extensions.smartfilters.");
  var worker;

  this.startWorker = function(worker, folder) {
    var data = {};
    data.myEmails = [];
    data.messages = [];
    // find out all user emails
    var identity = folder.customIdentity;
    if (!identity) {
      var accountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
      var identities = accountManager.allIdentities;
      for (var i = 0; i < identities.Count(); i++) {
        var identity = identities.GetElementAt(i).QueryInterface(Ci.nsIMsgIdentity);
        data.myEmails.push(identity.email.toLowerCase());
      }
    } else {
      data.myEmails.push(identity.email.toLowerCase());
    }
    // suck out all preferences
    data.filters = [];
    var children = {};
    preferences.getChildList("filter.", children);
    for (var i = 1; i <= children.value; i++) {
      var filter = preferences.getCharPref("filter." + i);
      if (filter == 'nothing')
        continue;
      var patternPref = filter.replace(' ', '.') + ".pattern";
      var prefix = preferences.getCharPref(patternPref);
      data.filters.push({ name : filter, prefix : prefix });
    }
    // load ignores 
    data.ignore = preferences.getCharPref("subject.ignore");
    // load headers for last N messages
    var N = preferences.getIntPref("max.emails.count");
    var dbView = Cc["@mozilla.org/messenger/msgdbview;1?type=quicksearch"].createInstance(Ci.nsIMsgDBView);
    var out = {};
    dbView.open(folder, Ci.nsMsgViewSortType.byDate,
                        Ci.nsMsgViewSortOrder.descending, 
                        Ci.nsMsgViewFlagsType.kNone, out);
    var i = 0;
    var messages = [];
    if (out.value > N)
      out.value = N;
    for(var i = 0; i < out.value; i++) {
      messages[i] = { 
        header : dbView.getMsgHdrAt(i),
           URI : dbView.getURIForViewIndex(i),
      };
    }
    dbView.close();
    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance ( Components.interfaces.nsIMessenger );
    var total = messages.length;
    var convertMessage = function () {
      var length = total - messages.length;
      setStatus(length + " of " + total + " messages is loaded", 50 * length / total);
      if (length == total) {
        worker.postMessage({
            'data' : data,
            'id' : 'start',
        });
        return;
      }
      var message = messages.shift();
      var header = message.header;      
      var result = {
        "author"     : [],
        "recipients" : [],
        "subject"    : header.mime2DecodedSubject.toLowerCase(),
      };
      Util.processAddressListToArray(header.ccList, result.recipients);
      Util.processAddressListToArray(header.recipients, result.recipients);
      Util.processAddressListToArray(header.author, result.author);

      var msgURI = message.URI;
      var msgService = messenger.messageServiceFromURI ( msgURI ) ;
      dispMUA.setInfo(false, []);
      msgService.CopyMessage ( msgURI , dispMUA.StreamListener , false , null , msgWindow , {} ) ;
      var fillResult = function() {
        var icon = dispMUA.Info["ICON"];
        if (icon == "empty.png" && !dispMUA.Info["STRING"]) {
          setTimeout(fillResult, 0);
          return;
        }
        result.dispMUAIcon = icon;
        data.messages.push(result);
        setTimeout(convertMessage, 0);
      };
      setTimeout(fillResult, 0);
    };
    setTimeout(convertMessage, 0);
  }

  this.start = function() {
    folder = window.arguments[0].folder;
    worker = new Worker("chrome://smartfilters/content/worker/worker.js");
    this.startWorker(worker, folder);
    gStatus = document.getElementById("status");
    gProgressMeter = document.getElementById("progressmeter");
    msgWindow = window.arguments[0].msgWindow;
    box = document.getElementById("smartfilters-box");
    document.title = locale.GetStringFromName("title") + " " + folder.URI;
    setStatus("start analyzing", 50);
    var threshold = preferences.getIntPref("threshold");
    worker.onmessage = function(event) {
      var data = event.data;
      var id = data.id;
      if (id == "end") {
        setStatus("finished", 100);
        atEnd();
        return;
      }
      if (id == "debug") {
        Application.console.log(data.text);
        return;
      }
      setStatus(id + " " + data.postfix, 50 + data.percentage / 2);
      var results = data.results;
      var newItems = [];
      for(var i = 0; i < results.length; i++) {
        var result = results[i];
        // messages not filtered by anything
        if (result.texts.length == 0)
          continue;
        // filter without messages
        if (result.messageIndices.length <= threshold)
          continue;
        newItems.push(result);
      }
      if (newItems.length > 0)
        box.addItems(newItems);
    }
  };

  function atEnd() {
    document.getElementById("stop").disabled = true;
    document.getElementById("select_all").disabled = false;
    document.getElementById("unselect_all").disabled = false;
    document.getElementById("apply").disabled = false;
  } 

  this.stop = function() {
    if (worker) {
      worker.terminate();
      worker = null;
      atEnd();
    }
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
      smartfiltersBackend.run(backend, folder, checkedItems);
      window.close();
    } 
  }

  function setStatus(text, percentage) {
    gStatus.value = locale.GetStringFromName("status") + text + "...";
    gProgressMeter.value = percentage;
  }
}

const smartfilters = new SmartFilters();
