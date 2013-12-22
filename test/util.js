var fs = require('fs');
exports.load = function(path) {
  eval.call(global, fs.readFileSync('./src/chrome/content/' + path) + '');
}
