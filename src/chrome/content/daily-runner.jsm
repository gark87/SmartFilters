var EXPORTED_SYMBOLS = ["DailyRunner"];

Components.utils.import("chrome://smartfilters/content/storage.jsm");
Components.utils.import("chrome://smartfilters/content/logic.jsm");
Components.utils.import("resource:///modules/gloda/log4moz.js");

/**
 * All code about daily smartfilters check run
 */
const DailyRunner = function(window) {
  const logger = Log4Moz.repository.getLogger("SmartFilters.DailyRunner");
  const urls = [];
  const dates = [];
  let inProcess = false;

  let openTab = function(folder, count) {
    logger.info("Try to open tab");
    var tabmail = window.document.getElementById("tabmail");
    var nodes = tabmail.tabContainer.childNodes;
    for(var i = 0; i < nodes.length; i++) {
      if (nodes[i].label == "Smartfilters")
        return;
    }
    let tab = tabmail.openTab("chromeTab", 
        { chromePage : "chrome://smartfilters/content/smartfilters.xul", 
          background : true,
          folder     : folder,
          msgWindow  : window, 
        });
    let icon = "chrome://smartfilters/skin/classic/logo-active.png";

    Components.classes['@mozilla.org/alerts-service;1'].
       getService(Components.interfaces.nsIAlertsService).
       showAlertNotification(icon, "Smartfilters", "found new filters", true, '', null);
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
 //     if (now != date)
 //       dates[index] = now;
    }

    Storage.start(function() {
      let smartfilters = (function() {
        let storedResults = [];
        let count = 0;
        let ended = false;

        let report = function() {
          openTab(folder, count);
        };

        this.setStatus = function(text, percentage) {
          logger.info(percentage + " %: " + text);
        };

        let callback = function(newResultsCount) {
          count += newResultsCount;
          inProcess = false;
          logger.info("merged, release lock");
          if (ended)
            report();
        };

        this.onResultsArrived = function(results) {
          let length = results.length;
          if (inProcess) {
            storedResults = storedResults.concat(results);
            logger.info("adding " + length + " to " + storedResults.length + " queue");
          } else {
            let toProcess = storedResults;
            storedResults = [];
            inProcess = true;
            logger.info("start merging " + toProcess.length + " queue");
            Storage.merge(url, toProcess, callback);
          }
        };

        this.atEnd = function() {
          if (inProcess) {
            logger.info("try to end, but in process");
            ended = true;
          } else {
            report();
          }
        };

        return this;
      })();
      smartfilters.prototype = new SmartFiltersLogic(folder, window);
      logger.info("created smartfilters");
      smartfilters.prototype.start.call(smartfilters);
      logger.info("smartfilters started");
    });
  };
  logger.info("created");
};

