var EXPORTED_SYMBOLS = ["HashMap"];
/**
 * Hash map with quick size
 */
function HashMap() {
  var size = 0;
  var _map = {};

  var code = function(k) {
    return "gark87_" + k;
  };

  var decode = function(k) {
    return k.substring(7);
  };

  this.add = function(k) {
    this.put(k, 1);
  }

  this.put = function(k, v) {
    k = code(k);
    if (_map[k] == undefined)
      size++;
    _map[k] = v;
  }

  this.remove = function(k) {
    k = code(k);
    if (_map[k] != undefined)
      size--;
    delete _map[k];
  }

  this.get = function(k) {
    k = code(k);
    return _map[k];
  }

  this.foreach = function(func, obj) {
    for (var prop in _map)
      (func).call(obj, decode(prop));
  }

  this.keys = function() {
    // init keys array to sort and track
    var keys = [];
    for (var key in _map) {
      if (key)
        keys.push(decode(key));
    }
    return keys;
  }

  this.getSize = function() {
    return size;
  }
}

HashMap.prototype.toString = function mapToString() {
  var result = '{';
  this.foreach(function(prop){
      result += prop + " => " + this.get(prop) + " , ";
  }, this);
  result += '}';
  return result;
};
