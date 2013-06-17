importScripts("chrome://smartfilters/content/util.jsm",
              "chrome://smartfilters/content/result.jsm",
              "chrome://smartfilters/content/hashmap.jsm",
              "chrome://smartfilters/content/worker/base.js",
              "chrome://smartfilters/content/worker/mailing-list.js",
              "chrome://smartfilters/content/worker/subject-analyzer.js",
              "chrome://smartfilters/content/worker/dispmua-smartfilters.js");

// global vars
const MAX = 5000;
var data;
var filtersMap = {
  "mailing list" : MailingListUtil,
  "robot"        : RobotUtil,
  "subject"      : SubjectUtil,
};

function range(from, to) {
  var arr = [];
  for(var i = from; i < to; i++)
    arr.push(i);
  return arr;
}

onmessage = function(event) {
  var type = event.data.id;
  if (type == 'start') {
    data = event.data.data;
    var allMessages = range(0, data.messages.length);
    var results = [new SmartFiltersResult(allMessages, [], "")];
    var util = new Base(data);
    var filters = data.filters;
    var length = filters.length;
    for (var i = 0; i < length; i++) {
      var pref = filters[i].name;
      var filt = filtersMap[pref];
      var nextResults = [];
      if (filt) {
        for(var k = 0; k < results.length; k++) {
          filt.prototype = util;
          var filter = new filt(filters[i].prefix);
          var processing = results[k];
          var result = filter.process(processing);
          for(var j = 0; j < result.length; j++)
            nextResults.push(result[j]);
          var percentage = 100 *
                         (i + k / results.length) / length;
          postMessage({id : pref, results: result.splice(1),
              postfix : (k + 1) + "/" + results.length,
              percentage: percentage});
        }
      }
      results = nextResults;
    }
  }
  postMessage({id : "end"});
}
