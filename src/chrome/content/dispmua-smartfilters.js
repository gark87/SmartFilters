///////////////////////////////////////////////
// bot(dispmua) filter
///////////////////////////////////////////////
function RobotUtil(prefix) {
  // private fields
  var domain2map = new HashMap();

  // override abstract methods
  this.getIconName    = function() { return "robot"; }
  this.getPrefix      = function() { return prefix; }
  this.processMessage = function(i, message) {
    // user is the author - not a robot
    if (Util.arrayContainsElementFromAnother(message.author, this.data.myEmails)) {
      this.regularMails.push(i);
      return;
    }
    postMessage({id : "debug", text : "message: " + message.subject + " author  " + message.author});
    var author = Util.getEmailInfo(message.author[0]);
    var lower = message.messageId.toLowerCase();
    var createIfNeeded = function(messageId) {
      var id2map = domain2map.get(author.domain);
      if (id2map == undefined) {
        domain2map.put(author.domain, id2map = new HashMap());
      }
      var name2index = id2map.get(messageId);
      if (name2index == undefined) {
        id2map.put(messageId, name2index = new HashMap());
      }
      var indices = name2index.get(author.username);
      if (indices == undefined) {
        name2index.put(author.username, indices = []);
      }
      return indices;
    };
    for (var key in RobotUtil.smartfilters_dispMUA['message-id']) {
      if (lower.indexOf(key) > -1) {
        createIfNeeded.call(this, key).push(i);
        return;
      }
    }
    createIfNeeded.call(this, 'nothing').push(i);
  };

  this.createFilterTerm = function (email) {
    return { type : 'robot', email : email };
  };

  this.process = function(prevResult) {
    this.init(prevResult);
    var results = this.createReturnArray(this.regularMails);
    var composeText = function(name) {
      return "from robot " + name;
    };
    domain2map.foreach(function(domain) {
      var id2map = domain2map.get(domain);
      // this check is for Twitter-like notifications
      // (when username is some hash). I do not like such mails.
      if (id2map.getSize() == 1) {
        var id = id2map.keys()[0];
        var name2index = id2map.get(id);
        // just regular
        if (id == 'nothing') {
          name2index.foreach(function (name) {
            var indices = name2index.get(name);
            for(var i = 0; i < indices.length; i++)
              this.regularMails.push(indices[i]);
          }, this);
        } else {
          // Twitter-like
          var messageIndices = [];
          name2index.foreach(function (name) {
            var indices = name2index.get(name);
            var length = indices.length;
            // more than one message from this email - not a Twitter
            if (length > 1) {
              var indicator = name + "@" + domain;
              var folder = this.getFolderPath(name, domain);
              var text = composeText(indicator);
	      var terms = this.getPrevTerms().slice(0);
	      terms.push(this.createFilterTerm(indicator));
              results.push(new SmartFiltersResult(indices, 
		  this.createTexts(text), this.composeDir(folder),
		  terms));
              return;
            }
            for(var i = 0; i < length; i++)
              messageIndices.push(indices[i]);
          }, this);
          if (messageIndices.length == 0)
            return;
          var username = (name2index.getSize() == 1)? name2index.keys()[0] : "";
          var indicator = username + "@" + domain;
          var folder = this.getFolderPath(username, domain);
          var text = composeText(indicator);
	  var terms = this.getPrevTerms().slice(0);
	  terms.push(this.createFilterTerm(indicator));
          results.push(new SmartFiltersResult(messageIndices, 
		this.createTexts(text), this.composeDir(folder), 
		terms));
        }
        return;
      }
      var user2id = new HashMap();
      id2map.foreach(function(id) {
        var name2index = id2map.get(id);
        name2index.foreach(function(name) {
          var indices = name2index.get(name);
          var prevId = user2id.get(name);
          // messages from `user@domain` have two different Message-ID.
          // this is not robot, just regular mail
          if (prevId != undefined && prevId != id) {
            for(var i = 0; i < indices.length; i++)
              this.regularMails.push(indices[i]);
            user2id.put(name, 'nothing');
            return;
          }
          // message has no Message-ID or some other mail from this user is regular
          if (prevId == 'nothing' || id == 'nothing') {
            for(var i = 0; i < indices.length; i++)
              this.regularMails.push(indices[i]);
            user2id.put(name, 'nothing');
            return;
          }
          user2id.put(name, id);
        }, this);
      }, this);
      user2id.foreach(function(username) {
        var id = user2id.get(username);
        // already added to regularMails
        if (id == 'nothing')
          return;
        var indices = id2map.get(id).get(username);
        var indicator = username + '@' + domain;
        var folder = this.getFolderPath(username, domain);
        var text = composeText(indicator);
	var terms = this.getPrevTerms().slice(0);
	terms.push(this.createFilterTerm(indicator));
        results.push(new SmartFiltersResult(indices, 
	    this.createTexts(text), this.composeDir(folder),
	    terms));
      }, this);
    }, this);
    return results;
  }
}

