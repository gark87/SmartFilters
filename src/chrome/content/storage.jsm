var EXPORTED_SYMBOLS = ["Storage"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource:///modules/gloda/log4moz.js");
Components.utils.import("chrome://smartfilters/content/hashmap.jsm");
Components.utils.import("chrome://smartfilters/content/result.jsm");

/**
 * This class contains all logic about storage (SQLite)
 */
const Storage = (function() {
  const logger = Log4Moz.repository.getLogger("SmartFilters.Storage");
  const textsMap   = new HashMap();
  const resultsMap = new HashMap();
  var listener;
  var connection;
  var resultsCount = 0;
  var insertResult;
  var insertText;
  var insertLink;

  var createInsert = function(table, rows) {
    if (!connection.tableExists(table)) {
      let params = rows.join(', ');
      connection.createTable(table, params);
      logger.info("Create table:'" + table + "' with " + params);
    }
    var values = [];
    var names = [];
    for (var i = 0; i < rows.length; i++) {
      names[i] = rows[i].split(/\s+/)[0];
      values[i] = ":" + names[i];
    }
    let result = "INSERT INTO " + table + "(" + names.join(', ') +
                 ") VALUES(" + values.join(', ') + ')';
    logger.info("Create statement:'" + result + "'");
    return connection.createStatement(result);
  }

  var select = function(table, callback, after) {
    let stmt = connection.createStatement("SELECT * FROM " + table);
    logger.info("Start select all from " + table);
    stmt.executeAsync({
      handleResult: function(aResultSet) {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) 
        {
          callback.call(this, row);
        }
      },
                           
      handleError: function(aError) {
        logger.error("SmartFilters Error: " + aError.message 
             + " during SELECT ALL(" + table + ")");
      },
                                   
      handleCompletion: function(aReason) {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
        {
          logger.error("SmartFilters Query canceled or aborted"
               + " during SELECT ALL(" + table + ")");
        } else {
          if (after) {
            after.call(this);
            logger.info("chaining after select all from " + table);
          }
        }
      }
    });
  }

  var textToKey = function(text) {
    return text.type + "_" + text.text;
  }

  var getResults = function(resultsForFolder) {
    let keys = resultsForFolder.keys().sort().reverse();
    let results = [];
    for (let i = 0; i < keys.length; i++) {
      let result = resultsForFolder.get(keys[i]);
      if (result.count <= 4)
        results.push(result);
    }
    return results;
  };

  this.start = function(callback) {
    logger.info("Starting");
    if (connection) {
      logger.info("connection exists");
      callback.call(this);
      return;
    }
    let file = FileUtils.getFile("ProfD", ["SmartFilters", "data.sqlite"]);
    connection = Services.storage.openDatabase(file);
    insertResult = createInsert("Results",
      [
        "id INTEGER",
        "folder STRING",
        "count INTEGER",
      ]);
    insertText = createInsert("Texts",
      [
        "id INTEGER",
        "icon STRING",
        "text STRING",
        "type STRING",
      ]);
    insertLink = createInsert("Links", 
      [
        "result_id INTEGER",
        "text_id   INTEGER",
      ]);
    let textsArray = [];
    select("Texts", function(row) {
      let icon = row.getResultByName("icon");
      let type = row.getResultByName("type");
      let text = row.getResultByName("text");
      let result = new SmartFiltersText(type, icon, text);
      result.id = row.getResultByName("id");
      let key = textToKey(result);
      textsArray[result.id] = result;
      textsMap.put(key, result);
    }, function() {
      var links = new HashMap();
      let resultArray = [];
      select("Links", function(row) {
        let result = row.getResultByName("result_id");
        let array = links.get(result);
        if (!array) 
          links.put(result, array = []);
        array.push(row.getResultByName("text_id"));
      }, function() {
        links.foreach(function(resultId) {
          let sortedIds = links.get(resultId).sort();
          let texts = [];
          for(let i = 0; i < sortedIds.length; i++)
            texts.push(textsArray[sortedIds[i]]);
          let value = new SmartFiltersResult([], texts, "<no folder>"); 
          resultArray[resultId] = value;
        }, this);
          
        select("Results", function(row) {
          let id = row.getResultByName("id");
          resultArray[id].folder = row.getResultByName("folder");
          resultArray[id].count = row.getResultByName("count");
        }, function() {
          for (let i = 0; i < resultArray.length; i++) {
            let result = resultArray[i];
            if (result) {
              let map = resultsMap.get(result.folder);
              if (!map) 
                resultsMap.put(result.folder, map = new HashMap());
              let sortedIds = links.get(i).sort();
              let key = sortedIds.join("_");
              map.put(key, result);
              resultsCount++;
            }
          }
          logger.info("connection created");
          callback.call(this);
        });
      });
    });
  };

  this.setListener = function(listener) {
    this.start(function() {
      logger.info("setting listener");
      if (this.listener) {
        this.listener.call(this, null);
        return;
      }
      this.listener = listener;
      let arg = new HashMap();
      let keys = resultsMap.keys();
      for(let i = 0; i < keys.length; i++) {
        let key = keys[i];
        arg.put(key, getResults(resultsMap.get(key)));
      }
      logger.error(JSON.stringify(arg) + "-----------" +  JSON.stringify(resultsMap));
      this.listener.call(this, arg);
    });
  }

  this.merge = function(inputFolder, results, callback) {
    this.start(function() {
      logger.info("Start merging " + results.length + 
          " results for " + inputFolder);
      if (results.length == 0) {
        logger.info("No results: no merging should be done");
        callback.call(this, 0);
        return;
      }
      let insertResultParams = insertResult.newBindingParamsArray();
      let insertTextParams = insertText.newBindingParamsArray();
      let insertLinkParams = insertLink.newBindingParamsArray();
      let map = resultsMap.get(inputFolder);
      let returnResults = [];
      let newTexts = false;
      let newResults = false;
      if (!map)
        resultsMap.put(inputFolder, map = new HashMap());
      for (let i = 0; i < results.length; i++) {
        let result = results[i];
        let texts = result.texts;
        let textIds = []
        for (let j = 0; j < texts.length; j++) {
          let text = texts[j];
          let key = textToKey(text);
          let saved = textsMap.get(key);
          if (!saved) {
            text.id = textsMap.getSize();
            textsMap.put(key, saved = text);
            let params = insertTextParams.newBindingParams();
            params.bindByName("id", text.id);
            params.bindByName("icon", text.icon);
            params.bindByName("text", text.text);
            params.bindByName("type", text.type);
            insertTextParams.addParams(params);
            newTexts = true;
          }
          textIds.push(saved.id);
        }
        let resultKey = textIds.sort().join("_");
        let savedResult = map.get(resultKey);
        if (!savedResult) {
          map.put(resultKey, savedResult = result);
          returnResults.push(result);
          result.id = resultsCount++;
          result.count = 0;
          let params = insertResultParams.newBindingParams();
          params.bindByName("id", result.id);
          params.bindByName("folder", result.folder);
          params.bindByName("count", 0);
          insertResultParams.addParams(params);
          for (let j = 0; j < textIds.length; j++) {
            let linkParams = insertLinkParams.newBindingParams();
            linkParams.bindByName("result_id", result.id);
            linkParams.bindByName("text_id", textIds[j]);
            insertLinkParams.addParams(linkParams);
          }
          newResults = true;
        }
      }

      let toExec = [];
      if (newTexts) {
        insertText.bindParameters(insertTextParams);
        toExec.push(insertText);
      }

      if (newResults) {
        insertResult.bindParameters(insertResultParams);
        toExec.push(insertResult);
        insertLink.bindParameters(insertLinkParams);
        toExec.push(insertLink);
      }

      if (toExec.length > 0) {
        connection.executeAsync(toExec, toExec.length,
        {
          handleResult: function(aResultSet) {
          },
                               
          handleError: function(aError) {
            logger.error("SmartFilters Error: " + aError.message 
                 + " during merge");
          },
                                       
          handleCompletion: function(aReason) {
            if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) 
            {
              logger.error("SmartFilters Query canceled or aborted during merge");
            } else {
              if (this.listener) {
                let arg = new HashMap();
                arg.put(inputFolder, returnResults);
                this.listener.call(this, arg);
              }
              callback.call(this, returnResults.length);
            }
          }
        });
      } else {
        callback.call(this, 0);
      }
    });
  };

  this.end = function() {
    logger.info("try to close connection");
    connection.asyncClose({
      complete : function() {
        logger.info("connection closed");
        connection = null;
      }
    });
  };

  logger.info("created");
  return this;
})();
