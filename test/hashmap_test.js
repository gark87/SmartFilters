var assert = require('assert');
var util = require('./util');

util.load('hashmap.jsm');

exports['test HashMap'] = function(){
    var hashmap = new HashMap();
    assert.equal(0, hashmap.getSize());
    hashmap.put('prototype', 123);
    assert.equal(1, hashmap.getSize());
    assert.equal(123, hashmap.get('prototype'));
};
