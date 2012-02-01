///////////////////////////////////////////////
// Hash map
///////////////////////////////////////////////
function HashMap() {
  var size = 0;
  var _map = new Object();

  this.add = function(k) {
    this.put(k, 1);
  }

  this.put = function(k, v) {
    if (_map[k] == undefined)
      size++;
    _map[k] = v;
  }

  this.remove = function(k) {
    if (_map[k] != undefined)
      size--;
    delete _map[k];
  }

  this.get = function(k) {
    return _map[k];
  }

  this.foreach = function(func, obj) {
    for (var prop in _map)
      (func).call(obj, prop);
  }

  this.keys = function() {
    // init keys array to sort and track
    var keys = [];
    for (var key in _map)
      keys.push(key);
    return keys;
  }

  this.getSize = function() {
    return size;
  }
}
