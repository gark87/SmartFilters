Components.utils.import("chrome://smartfilters/content/dispmua/dispmua-data.jsm");

var EXPORTED_SYMBOLS = ["DispMUA"];

function DispMUA() {
  this.stopped = false;
  this.bundle = null ;
  this.Info = {};
  this.arDispMUAOverlay = new Array();
  this.strOverlayFilename = "dispMuaOverlay.csv";

  var dispMUA = this;
  var onStop = function(content) {
    dispMUA.headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance ( Components.interfaces.nsIMimeHeaders ) ;
    dispMUA.headers.initialize ( content , content.length ) ;
    dispMUA.headerdata = content ;
    dispMUA.searchIcon ( "" ) ;
    dispMUA.stopped = true;
  };

  this.StreamListener = {
    content : "",
    found : false,
    onDataAvailable : function ( request , context , inputStream , offset , count )
    {
      try
      {
        var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance ( Components.interfaces.nsIScriptableInputStream ) ;
        sis.init ( inputStream ) ;

        if ( ! this.found )
        {
          this.content += sis.read ( count ) ;
          this.content = this.content.replace ( /\r/g , "" ) ;
          var pos = this.content.indexOf ( "\n\n" ) ;

          if ( pos > -1 )
          {
            // last header line must end with LF -> pos+1 !!!
            this.content = this.content.substr ( 0 , pos + 1 ) ;
            this.found = true ;
          }
        }
      }
      catch ( ex ) { }
    }, 
    onStartRequest : function ( request , context )
    {
      this.content = "" ;
      this.found = false ;
    },
    onStopRequest : function ( aRequest , aContext , aStatusCode )
    {
      onStop(this.content);
    },
  };

  this.loadHeaderData = function() {
    this.Info["STRING"] = "" ;
    this.setInfo ( false , [] ) ;
  //  this.showInfo() ;
    var msgURI = null ;

    if ( gDBView )
    {
      msgURI = gDBView.URIForFirstSelectedMessage ;
    }

    if ( msgURI == null )
    {
      return ;
    }

    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance ( Components.interfaces.nsIMessenger ) ;
    var msgService = messenger.messageServiceFromURI ( msgURI ) ;
    msgService.CopyMessage ( msgURI , this.StreamListener , false , null , msgWindow , {} ) ;
  }

  this.getHeader = function (key) 
  {
    var value = this.headers.extractHeader ( key , false ) ;

    if ( value == null )
    {
      value = "" ;
    }

    return ( value ) ;
  }

  this.searchIcon = function(strUserAgent)
  {
    if ( ! strUserAgent )
    {
      strUserAgent = this.getHeader ( "user-agent" ) ;
    }

    if ( ! strUserAgent )
    {
      strUserAgent = this.getHeader ( "x-mailer" ) ;

      if ( ! strUserAgent )
      {
        strUserAgent = this.getHeader ( "x-newsreader" ) ;
      }
    }

    var strExtra = "" ;

    if ( this.getHeader ( "x-bugzilla-reason" ) )
    {
      strExtra = "bugzilla" ;
    }
    else if ( this.getHeader ( "x-php-bug" ) )
    {
      strExtra = "phpbug" ;
    }

    strUserAgent = strUserAgent.replace ( /(^\s+)|(\s+$)/g , "" ) ;
    this.Info["STRING"] = "" ;
    this.setInfo ( false , [] ) ;

    if ( strUserAgent != "" )
    {
      this.Info["STRING"] = strUserAgent ;
      var lower = strUserAgent.toLowerCase() ;

      //user overlay array
      for ( var key in this.arDispMUAOverlay )
      {
        if ( lower.indexOf ( key ) > -1 )
        {
          //an overlay icon already has the full path in it, including the protocol
          this.Info["PATH"] = "" ;
          this.Info["ICON"] = this.arDispMUAOverlay[key] ;
          //that the user knows he made the crap
          this.Info["STRING"] = strUserAgent + "\n" +
                                   "User override icon" + "\n" +
                                   "Key: " + key + "\n" +
                                   "Icon: " + this.Info["ICON"] ;
          this.Info["FOUND"] = true ;
          break ;
        }
      }

      if ( !this.Info["FOUND"] )
      {
        for ( var key in arDispMUAAllocation["fullmatch"] )
        {
          if ( lower == key )
          {
            this.setInfo ( true , arDispMUAAllocation["fullmatch"][key] ) ;
            break ;
          }
        }
      }

      if ( !this.Info["FOUND"] )
      {
        this.scan ( "presearch" , strUserAgent )
      }

      if ( !this.Info["FOUND"] )
      {
        var chLetter = lower.substr ( 0 , 1 ) ;

        if ( arDispMUAAllocation[chLetter] )
        {
          for ( var key in arDispMUAAllocation[chLetter] )
          {
            if ( lower.substr ( 0 , key.length ) == key )
            {
              this.setInfo ( true , arDispMUAAllocation[chLetter][key] ) ;
              break ;
            }
          }
        }
      }

      if ( !this.Info["FOUND"] )
      {
        this.scan ( "postsearch" , strUserAgent )
      }

      if ( !this.Info["FOUND"] )
      {
        this.Info["ICON"] = "unknown.png" ;
      }

      if ( this.Info["ICON"] == "thunderbird.png" )
      {
        if ( lower.indexOf ( "; linux" ) > -1 )
        {
          this.Info["ICON"] = "thunderbird-linux.png" ;
        }
        else if ( ( lower.indexOf ( "(windows" ) > -1 ) || ( lower.indexOf ( "; windows" ) > -1 ) )
        {
          this.Info["ICON"] = "thunderbird-windows.png" ;
        }
        else if ( ( lower.indexOf ( "(macintosh" ) > -1 ) || ( lower.indexOf ( "; intel mac" ) > -1 ) || ( lower.indexOf ( "; ppc mac" ) > -1 ) )
        {
          this.Info["ICON"] = "thunderbird-mac.png" ;
        }
        else if ( lower.indexOf ( "; sunos" ) > -1 )
        {
          this.Info["ICON"] = "thunderbird-sunos.png" ;
        }
        else if ( lower.indexOf ( "; freebsd" ) > -1 )
        {
          this.Info["ICON"] = "thunderbird-freebsd.png" ;
        }
        else if ( lower.indexOf ( "(x11" ) > -1 )
        {
          this.Info["ICON"] = "thunderbird-x11.png" ;
        }
      }
    }
    else if ( strExtra != "" )
    {
      if ( strExtra == "bugzilla" )
      {
        this.Info["ICON"] = "bugzilla.png" ;
        this.Info["STRING"] = "X-Bugzilla-Reason" ;
        this.Info["FOUND"] = true ;
      }
      else if ( strExtra == "phpbug" )
      {
        this.Info["ICON"] = "bug.png" ;
        this.Info["STRING"] = "X-PHP-Bug" ;
        this.Info["FOUND"] = true ;
      }
    }
    else if ( this.getHeader ( "organization" ) != "" )
    {
      this.getInfo ( "Organization" , "organization" ) ;
    }
    else if ( this.getHeader ( "x-mimeole" ) != "" )
    {
      this.getInfo ( "X-MimeOLE" , "x-mimeole" ) ;
    }
    else if ( this.getHeader ( "message-id" ) != "" )
    {
      this.getInfo ( "Message-ID" , "message-id" ) ;
    }

  //  this.showInfo() ;
  }


  this.setInfo = function ( found , info ) 
  {
    this.Info["FOUND"] = found ;
    this.Info["PATH"] = "chrome://dispmua/content/48x48/" ;
    this.Info["ICON"] = "empty.png" ;
    this.Info["URL"] = "" ;
    this.Info["NAME"] = "" ;

    if ( info[0] )
    {
      this.Info["ICON"] = info[0] ;
    }

    if ( info[1] )
    {
      this.Info["URL"] = info[1] ;
    }

    if ( info[2] )
    {
      this.Info["NAME"] = info[2] ;
    }
  }

  this.getInfo = function ( header )
  {
    var index = header.toLowerCase() ;
    var value = this.getHeader ( index ) ;
    this.Info["STRING"] = header + ": " + value ;
    this.scan ( index , value )

    if ( this.Info["NAME"] )
    {
      this.Info["STRING"] = this.Info["NAME"] + "\n" + this.Info["STRING"] ;
    }
  }

  this.scan = function ( index , value )
  {
    var lower = value.toLowerCase() ;

    for ( var key in arDispMUAAllocation[index] )
    {
      if ( lower.indexOf ( key ) > -1 )
      {
        this.setInfo ( true , arDispMUAAllocation[index][key] ) ;
        break ;
      }
    }
  }
}
