var EXPORTED_SYMBOLS = ["Storage"];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("chrome://smartfilters/content/hashmap.jsm");
Components.utils.import("chrome://smartfilters/content/result.jsm");

/**
 * This class contains all logic about storage (SQLite)
 */
const Storage = (function(){
  const textsMap   = new HashMap();
  const resultsMap = new HashMap();
  var connection;
  var resultsCount = 0;
  var insertResult;
  var insertText;
  var insertLink;

  var createInsert = function(table, rows) {
    if (!connection.tableExists(table))
      connection.createTable(table, rows.join(', '));
    var values = [];
    for (var i = 0; i < rows.length; i++)
      values[i] = ":" + rows[i];
    return "INSERT INTO " + table + "VALUES(" + values.join(', ') + ')';
  }

  var select = function(table, callback, after) {
    let stmt = connection.createStatement("SELECT * FROM " + table);
    stmt.executeAsync({
      handleResult: function(aResultSet) {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) 
        {
          callback.call(this, row);
        }
        if (after)
          after.call(this);
      },
                           
      handleError: function(aError) {
        alert("SmartFilters Error: " + aError.message 
             + " during SELECT ALL(" + table + ")");
      },
                                   
      handleCompletion: function(aReason) {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
          alert("SmartFilters Query canceled or aborted"
               + " during SELECT ALL(" + table + ")");
      }
    });
  }

  var textToKey = function(text) {
    return text.type + "_" + text.text;
  }

  this.merge = function(inputFolder, results, callback) {
    let insertResultParams = insertResult.newBindingParamsArray();
    let insertTextParams = insertText.newBindingParamsArray();
    let insertLinkParams = insertLink.newBindingParamsArray();
    let map = resultsMap.get(inputFolder);
    let returnValue = 0;
    if (!map)
      resultsMap.put(inputFolder, map = new HashMap());
    for (let i = 0; i < results.length; i++) {
      let result = results[i];
      let texts = result.texts;
      let textIds = []
      for (let j = 0; j < texts.length; j++) {
        let text = texts[j];
        let key = textToKey(inputFolder, text);
        let saved = textsMap.get(key);
        if (!saved) {
          textsMap.put(key, saved = text);
          text.id = textsMap.size();
          let params = insertTextParams.newBindingParams();
          params.bindByName("id", text.id);
          params.bindByName("icon", text.icon);
          params.bindByName("text", text.text);
          params.bindByName("type", text.type);
          insertTextParams.addParams(params);
        }
        textIds.push(saved.id);
      }
      let resultKey = textIds.sort().join("_");
      let savedResult = map.get(resultKey);
      if (!savedResult) {
        map.put(resultKey, savedResult = result);
        returnValue++;
        result.id = resultsCount++;
        result.count = 0;
        let params = insertResultParams.newBindingParams();
        params.bindByName("id", result.id);
        params.bindByName("folder", result.folder);
        params.bindByName("count", 0);
        insertResultParams.addParams(params);
        for(let j = 0; j < textIds.length; j++) {
          let linkParams = insertLinkParams.newBindingParams();
          linkParams.bindByName("result_id", result.id);
          linkParams.bindByName("text_id", textIds[j]);
          insertLinkParams.addParams(linkParams);
        }
      }
    }
    insertResult.bindParameters(insertResultParams);
    insertText.bindParameters(insertTextParams);
    insertLink.bindParameters(insertLinkParams);
    connection.executeAsync([insertText, insertResult, insertLink], 3,
    {
      handleResult: function(aResultSet) {
      },
                           
      handleError: function(aError) {
        alert("SmartFilters Error: " + aError.message 
             + " during merge");
      },
                                   
      handleCompletion: function(aReason) {
        if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) 
        {
          alert("SmartFilters Query canceled or aborted during merge");
        } else {
          callback.call(this, returnValue);
        }
      }
    });
  }

  this.start = function(callback) {
    if (connection)
      return;
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
          callback.call(this);
        });
      });
    });
  };

  this.end = function() {
    connection.asyncClose({
      complete : function() {
        connection = null;
      }
    });
  }
})();
