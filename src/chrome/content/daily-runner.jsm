var EXPORTED_SYMBOLS = ["DailyRunner"];

Components.utils.import("chrome://smartfilters/content/storage.jsm");
Components.utils.import("chrome://smartfilters/content/logic.jsm");
Components.utils.import("resource:///modules/gloda/log4moz.js");

/**
 * All code about daily smartfilters check run
 */
const DailyRunner = function(window) {
  const logger = Log4Moz.repository.getLogger("DailyRunner");
  const urls = [];
  const dates = [];

  let openTab = function(folder, count) {
    logger.info("Try to open tab");
    var tabmail = window.document.getElementById("tabmail");
    var nodes = tabmail.tabContainer.childNodes;
    for(var i = 0; i < nodes.length; i++) {
      if (nodes[i].label == "Smartfilters")
        return;
    }
    let tab = tabmail.openTab("chromeTab", 
        { 
          chromePage : "chrome://smartfilters/content/smartfilters-tab.xul", 
          background : true,
          onLoad : function(event, browser) {
            let box = browser.contentDocument.getElementById("smartfilters-box");
            Storage.setListener(function(results) {
              if (results == null) {
                tabmail.closeTab(tab, true);
                return;
              }
              logger.info("arrived results: " + JSON.stringify(results));
              let keys = results.keys();
              for(let i = 0; i< keys.length; i++) {
                logger.error(results.get(keys[i]));
                box.addItems(results.get(keys[i]));
              }
            });
          }
        });
    let icon = "chrome://smartfilters/skin/classic/logo-active.png";
    tabmail.setTabIcon(tab, icon);

    try {
      Components.classes['@mozilla.org/alerts-service;1'].
         getService(Components.interfaces.nsIAlertsService).
         showAlertNotification(icon, "Smartfilters", "found new filters", true, '', null);
    } catch (e) {
    }
  };

  this.msgAdded = function (aMsgHdr) {
    let now = (new Date()).toDateString();
    let folder = aMsgHdr.folder;
    let url = folder.folderURL.replace(/\W+/g, "_");

    let index = urls.indexOf(url);
    if (index < 0) {
      urls.push(url);
      dates.push(now);
    } else {
      let date = dates[index];
      if (now == date)
        return;
//      if (now != date)
//        dates[index] = now;
    }

    logger.info("created smartfilters for " + url);
    Storage.start(function() {
      let smartfilters = (function() {
        let queue = [];

        let report = function(count) {
          openTab(folder, count);
        };

        this.setStatus = function(text, percentage) {
          logger.info(percentage + " %: " + text);
        };

        this.addItems = function(results) {
          queue = queue.concat(results);
          logger.info("add " + results.length + " results. Current queue: " + JSON.stringify(queue));
        };

        this.atEnd = function() {
          Storage.merge(url, queue, report);
        };

        return this;
      })();
      smartfilters.prototype = new SmartFiltersLogic(folder, window);
      smartfilters.prototype.start.call(smartfilters);
      logger.info("smartfilters started");
    });
  };
  logger.info("created");
};

