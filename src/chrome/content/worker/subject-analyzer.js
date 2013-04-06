///////////////////////////////////////////////
// Subject Analyzer SmartFilter processor
///////////////////////////////////////////////

function SubjectUtil(prefix) {
  // private classes
  function Point(weight) {
    this.weight = weight;
    this.map = new HashMap();
  }
  Point.prototype.toString = function pointToString() {
    return "point with weight " + this.weight + ":"
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
  Centroid.prototype.toString = function() {
    return "(centroid: " + this.array + " with weight: " + this.weight + ")";
  };

  // private fields
  var word2index = new HashMap();
  var index2word = [];
  var points = new HashMap();

  // really-really huge regexp ;)

  // private methods
  var map2str = function(map) {
    var keys = map.keys();
    keys.sort();
    var str = "";
    for(var j = 0 ; j < keys.length ; j++) {
      var key = keys[j];
      if (key)
        str += key + " = " + map.get(key) + "|";
    }
    if (str.length > 0)
      str = str.substring(0, str.length - 1);
    return str;
  };

  // override abstract methods
  this.getIconName    = function() { return "subject"; }
  this.getPrefix      = function() { return prefix; }
  this.processMessage = function(i, message) {
    var words = message.subject.match(this.pattern);
    if (words == null || words.length == 0)
      return;
    var point = new HashMap();
    for(var j = 0; j < words.length; j++) {
      var word = words[j];
      if (word.length == 0)
	continue;
      if (this.ignores.get(word))
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
    var str = map2str(point);
    if (!str)
      return;
    var oldPointCount = points.get(str);
    if (!oldPointCount)
      points.put(str, oldPointCount = []);
    oldPointCount.push(i);
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
    return point.weight.length * result;
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
      if (result[index] == undefined)
	throw ("SmartFilters: Unexpected error: @" + index + " with centroids: "  + centroids + " and value: " + value + " for point:" + point);
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
	var multiplier = corresponding[j].weight.length;
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
    var max = Math.sqrt(points.length);
    var repeat = Math.min(max, 100);
    for(var K = 2; K < max; K++) {
      var minJ = Number.POSITIVE_INFINITY;
      var minCentroids = [];
      for(var i = 0; i < repeat; i++) {
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
      if (diff < prevJ / 10) {
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
      var vs = p.split("|");
      var point = new Point(points.get(p));
      for(var i = 0 ; i < vs.length; i++) {
        var v = vs[i];
	var t = v.split(" = ");
	point.map.put(t[0], t[1]);
	if (!t[0] && t[0] != 0)
	  throw "SmartFilters: Unexpected point:|" + v + "|";
	if (!t[1] && t[1] != 0)
	  throw "SmartFilters: Unexpected point:|" + v + "|";
      }
      ps.push(point);
    }, this);
    var results = [];
    var centroids = findClusters(ps);
    if (centroids.length == 0)
      return results;
    var result = clusterAssignment(ps, centroids);
    for(var i = 0; i < centroids.length; i++) {
      var centroid = centroids[i];
      var centroidLength = centroid.array.length;
      var keywords = [];
      for(var j = 0; j < centroidLength; j++) {
	if (centroid.array[j] > 0.98)
	  keywords.push(index2word[j]);
      }
      if (keywords.length > 0) {
	keywords.sort(function (a, b) {
	   return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	var messageIndices = [];
	var ps = result.groupBy[i];
	for(var k = 0; k < ps.length; k++) {
          var str = map2str(ps[k].map);
	  var indexes = points.get(str);
	  for(var q = 0; q < indexes.length; q++) {
	    messageIndices.push(indexes[q]);
	  }
	}
	var text = this.composeText(keywords);
	var folder = keywords.join("_");
	var terms = this.getPrevTerms().slice(0);
	terms.push(this.createFilterTerm(keywords));
	results.push(new SmartFiltersResult(messageIndices, 
	    this.createTexts(text), this.composeDir(folder), terms));
      }
    }
    return results;
  };

  this.composeText = function(keywords) {
    return "with keywords in subject: " + keywords.join(", ");
  };

  this.createFilterTerm = function (keywords) {
    return { type : 'subject', keywords : keywords };
  };

}
