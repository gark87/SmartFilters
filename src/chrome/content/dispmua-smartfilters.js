///////////////////////////////////////////////
// bot(dispmua) filter
///////////////////////////////////////////////
function RobotUtil() {
  // private fields
  var domain2map = new HashMap();

  // override abstract methods
  this.getIconName    = function() { return "robot"; }
  this.getPrefPrefix  = function() { return "robot"; }
  this.processMessage = function(i, message) {
    // collect author(From:)
    var authors = new HashMap();
    Util.processAddressList(message.author, authors);
    // user is the author - not a robot
    if (this.data.setContainsMyEmail(authors)) {
      this.regularMails.push(i);
//        return;
    }
    var author = getEmailInfo(authors.keys()[0]);
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
    return function(filter) {
      var term = filter.createTerm();

      term.attrib = Components.interfaces.nsMsgSearchAttrib.Sender;
      term.op = Components.interfaces.nsMsgSearchOp.Contains;
      term.booleanAnd = true;

      var termValue = term.value;
      termValue.attrib = term.attrib;
      termValue.str = email;

      term.value = termValue;
      filter.appendTerm(term);
    };
  };

  this.process = function(prevResult) {
    this.init(prevResult);
    var results = this.createReturnArray(this.regularMails);
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
            for(var i = 0; i < indices.length; i++)
              messageIndices.push(indices[i]);
          }, this);
          var username = (name2index.getSize() == 1)? name2index.keys()[0] : "";
          var indicator = username + "@" + domain;
          var folder = this.getFolderPath(username, domain);
          results.push(new SmartFiltersResult(messageIndices, this.getIcons(), this.getPrevText() + indicator, this.composeDir(folder), this.createFilterTerm(indicator)));
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
        results.push(new SmartFiltersResult(indices, this.getIcons(), this.getPrevText() + indicator, this.composeDir(folder), this.createFilterTerm(indicator)));
      }, this);
    }, this);
    return results;
  }
}

