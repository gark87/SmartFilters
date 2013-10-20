///////////////////////////////////////////////
// bot(dispmua) filter
///////////////////////////////////////////////
function RobotUtil(prefix) {
  // private fields
  var domain2map = new HashMap();
  var NOTHING = 'nothing.png';
  var nothingIcons = new HashMap();
  nothingIcons.add("thunderbird.png");
  nothingIcons.add("thunderbird-linux.png");
  nothingIcons.add("thunderbird-windows.png");
  nothingIcons.add("thunderbird-mac.png");
  nothingIcons.add("thunderbird-sunos.png");
  nothingIcons.add("thunderbird-freebsd.png");
  nothingIcons.add("thunderbird-x11.png");
  nothingIcons.add("seamonkey.png");
  nothingIcons.add("shredder.png");
  nothingIcons.add("netscape.png");
  nothingIcons.add("firefox.png");
  nothingIcons.add("eudora.png");
  nothingIcons.add("ms_exchange.png");
  nothingIcons.add("ms_outlook.png");
  nothingIcons.add("empty.png");
  nothingIcons.add("google_mail.png");
  nothingIcons.add("mail_ru.png");

  var stripTopLevel = function(domain) {
    return domain.replace(/[.][^.]*$/, "");
  }
  this.createIconTexts = function(text, icon) {
    var result = this.createTexts(text);
    result[result.length - 1].icon = "chrome://smartfilters/skin/classic/dispmua/" + icon;
    return result; 
  }

  // override abstract methods
  this.getIconName    = function() { return "robot"; }
  this.getType        = function() { return "robot"; }
  this.getPrefix      = function() { return prefix; }
  this.processMessage = function(i, message) {
    // user is the author - not a robot
    if (Util.arrayContainsElementFromAnother(message.author, this.data.myEmails)) {
      this.regularMails.push(i);
      return;
    }
    var author = Util.getEmailInfo(message.author[0]);
    var createIfNeeded = function(dispMUAIcon) {
      var id2map = domain2map.get(author.domain);
      if (id2map == undefined) {
        domain2map.put(author.domain, id2map = new HashMap());
      }
      var name2index = id2map.get(dispMUAIcon);
      if (name2index == undefined) {
        id2map.put(dispMUAIcon, name2index = new HashMap());
      }
      var indices = name2index.get(author.username);
      if (indices == undefined) {
        name2index.put(author.username, indices = []);
      }
      return indices;
    };
    var icon = message.dispMUAIcon;
    if (nothingIcons.get(icon))
      icon = NOTHING;
    createIfNeeded.call(this, icon).push(i);
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
        if (id == NOTHING) {
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
              var folder = this.createFolder(stripTopLevel(domain));
              var text = indicator;
              results.push(new SmartFiltersResult(indices, 
                  this.createIconTexts(text, id), this.composeDir(folder)));
              return;
            }
            for(var i = 0; i < length; i++)
              messageIndices.push(indices[i]);
          }, this);
          if (messageIndices.length == 0)
            return;
          var username = (name2index.getSize() == 1)? name2index.keys()[0] : "";
          var indicator = username + "@" + domain;
          var folder = this.createFolder(stripTopLevel(domain));
          var text = indicator;
          results.push(new SmartFiltersResult(messageIndices, 
                this.createIconTexts(text, id), this.composeDir(folder)));
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
            user2id.put(name, NOTHING);
            return;
          }
          // message has no Message-ID or some other mail from this user is regular
          if (prevId == NOTHING || id == NOTHING) {
            for(var i = 0; i < indices.length; i++)
              this.regularMails.push(indices[i]);
            user2id.put(name, NOTHING);
            return;
          }
          user2id.put(name, id);
        }, this);
      }, this);
      user2id.foreach(function(username) {
        var id = user2id.get(username);
        // already added to regularMails
        if (id == NOTHING)
          return;
        var indices = id2map.get(id).get(username);
        var indicator = username + '@' + domain;
        var folder = this.createFolder(username);
        var text = indicator;
        results.push(new SmartFiltersResult(indices, 
            this.createIconTexts(text, id), this.composeDir(folder)));
      }, this);
    }, this);
    return results;
  }
}

