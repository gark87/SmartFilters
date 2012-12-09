///////////////////////////////////////////////
// Subject Analyzer SmartFilter processor
///////////////////////////////////////////////

function SubjectUtil(prefix) {
  // private class
  function Point(weight) {
    this.weight = weight;
    this.map = new HashMap();
  }
  Point.prototype.toString = function pointToString() {
    return "point with weight [" + this.weight + "]:"
      + this.map;
  }

  function Centroid(array) {
    this.array = array;
    this.weight = 0;
    for(var i = 0; i < array.length; i++) {
      var element = array[i];
      this.weight += element * element;
    }
  };
  // private fields
  var word2index = new HashMap();
  var index2word = [];
  var points = new HashMap();

  // override abstract methods
  this.getIconName    = function() { return "subject"; }
  this.getPrefix      = function() { return prefix; }
  this.processMessage = function(i, message) {
    var words = message.subject.split(/[^a-zA-Z]+/);
    var point = new HashMap();
    for(var i = 0; i < words.length; i++) {
      var word = words[i];
      if (word.length == 0)
	continue;
      var oldIndex = word2index.get(word);
      if (undefined != oldIndex) {
	var coordinate = point.get(oldIndex);
	if (!coordinate) {
	  coordinate = 0;
	}
	point.put(oldIndex, coordinate + 1);
      } else {
	word2index.put(word, oldIndex = word2index.getSize());
	index2word.push(word);
	point.put(oldIndex, 1);
      }
    }
    var keys = point.keys();
    keys.sort();
    var str = "";
    for(var i = 0 ; i < keys.length ; i++) {
      var key = keys[i];
      if (key)
        str += key + " = " + point.get(key) + "|";
    }
    if (str.length > 0)
      str = str.substring(0, str.length - 1);
    var oldPointCount = points.get(str);
    if (!oldPointCount)
      oldPointCount = 0;
    points.put(str, oldPointCount + 1);
  }

  var distance = function (centroid, point) {
    var array = centroid.array;
    var result = centroid.weight;
    var map = point.map;
    map.foreach(function(prop) {
      var a = map.get(prop);
      var b = array[prop];
      result += -2*a*b + a*a;
    }, this);
    return point.weight * result;
  };

  var clusterAssignment = function(points, centroids) {
    var result = [];
    var J = 0.0;
    for(var i = 0; i < centroids.length; i++)
      result[i] = [];
    for(var i = 0; i < points.length; i++) {
      var point = points[i];
      var index = -1;
      var value = Number.POSITIVE_INFINITY;
      for(var j = 0; j < centroids.length; j++) {
	var centroid = centroids[j];
	var l = distance(centroid, point);
	if (l < value) {
	  value = l;
	  index = j;
	}
      }
      J += l / centroids.length;
      result[index].push(point);
    }
    return {groupBy : result, J : J};
  };


  var moveCentroid = function(points) {
    var centroids = [];
    for(var i = 0; i < points.length; i++) {
      var centroid = map2Array(new HashMap());
      var corresponding = points[i];
      var count = 0;
      for(var j = 0; j < corresponding.length; j++) {
	var multiplier = corresponding[j].weight;
	count += multiplier;
	var point = corresponding[j].map;
	var keys = point.keys();
	for(var k = 0; k < keys.length; k++) {
	  var key = keys[k];
	  centroid[key] += multiplier * point.get(key); 
	}
      }
      for(var j = 0; j < centroid.length; j++)
	centroid[j] /= count;
      centroids.push(new Centroid(centroid));
    }
    return centroids;
  };

  var map2Array = function(map) {
    var result = [];
    var length = index2word.length;
    for(var i = 0; i < length; i++)
      result[i] = 0;
    map.foreach( function(prop) {
      result[prop] = map.get(prop);
    }, this);
    return result;
  }

  var randomCentroids = function(K, points) {
    var result = [];
    var length = points.length;
    for(var i = 0; i < K; i++) {
      var index = Math.floor(Math.random() * length);
      var tmp = points[index];
      result[i] = new Centroid(map2Array(tmp.map));
      points[index] = points[length - 1];
      points[length - 1] = tmp;
      length = length - 1;
    }
    return result;
  }

  var sameCentroids = function(c1, c2) {
    var length = c1.length;
    for(var i = 0; i < length; i++) {
      var centroid1 = c1[i];
      var centroid2 = c2[i];
      if (centroid1.weight != centroid2.weight)
	return false;
      var array1 = centroid1.array;
      var array2 = centroid2.array;
      var cLength = array1.length;
      for(var j = 0; j < cLength; j++) {
	var value1 = array1[j];
	var value2 = array2[j];
	if (value1 != value2)
	  return false;
      }
    }
    return true;
  }

  var findClusters = function(points) {
    var prevJ = Number.POSITIVE_INFINITY;
    for(var K = 2; K < points.length; K++) {
      var minJ = Number.POSITIVE_INFINITY;
      var minCentroids = [];
      for(var i = 0; i < 10; i++) {
	var prevCentroids = [];
	var centroids = randomCentroids(K, points);
	var J;
	do {
	  var result = clusterAssignment(points, centroids);
	  J = result.J;
	  var newCentroids = moveCentroid(result.groupBy);
	  prevCentroids = centroids;
	  centroids = newCentroids;
	} while(!sameCentroids(prevCentroids, centroids));
	if (J < minJ) {
	  minJ = J;
	  minCentroids = centroids;
	}
      }
      var diff = prevJ - minJ;
      postMessage({id : "test", J : minJ, K : K, diff:diff});
      if (diff < prevJ / 100) {
	return minCentroids;
      }
      prevJ = minJ;
    }
    return [];
  };

 this.process = function(prevResult) {
    this.init(prevResult);
    var ps = [];
    points.foreach(function (p) {
      var str = p;
      var vs = p.split("|");
      var point = new Point(points.get(p));
      for(var i = 0 ; i < vs.length; i++) {
        var v = vs[i];
	var t = v.split(" = ");
	point.map.put(t[0], t[1]);
      }
      ps.push(point);
    }, this);
    var str = "";
    var centroids = findClusters(ps);
    for(var i = 0; i < centroids.length; i++) {
      str += i + " : ";
      var centroid = centroids[i];
      var centroidLength = centroid.array.length;
      for(var j = 0; j < centroidLength; j++) {
	if (centroid.array[j] > 0.98)
	  str += index2word[j] + " ";
      }
      str += " |\n";
    }
    throw(str);
  };
}
