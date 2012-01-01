///////////////////////////////////////////////
// Hash set
///////////////////////////////////////////////
function HashSet() {
  var size = 0;
  var _map = new Object();

  this.put = function(k) {
    if (_map[k] == undefined)
      size++;
    _map[k] = 1;
  }

  this.remove = function(k) {
    if (_map[k] != undefined)
      size--;
    delete _map[k];
  }

  this.get = function(k) {
    return _map[k];
  }

  this.foreach = function(func) {
    for (var prop in _map)
      func(prop);
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
