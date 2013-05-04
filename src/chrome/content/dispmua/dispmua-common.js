var dispMUA =
{
  bundle: null ,
  Info: {} ,
  arDispMUAOverlay: new Array() ,
  strOverlayFilename: "dispMuaOverlay.csv" ,
  arDispMUAAllocation: {} ,
}

dispMUA.StreamListener =
{
  content: "" ,
  found: false ,
  onDataAvailable: function ( request , context , inputStream , offset , count )
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
  } ,
  onStartRequest: function ( request , context )
  {
    this.content = "" ;
    this.found = false ;
  } ,
  onStopRequest: function ( aRequest , aContext , aStatusCode )
  {
    dispMUA.headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance ( Components.interfaces.nsIMimeHeaders ) ;
    dispMUA.headers.initialize ( this.content , this.content.length ) ;
    dispMUA.headerdata = this.content ;
    dispMUA.searchIcon ( "" ) ;
  }
} ;

dispMUA.loadHeaderData = function()
{
  dispMUA.Info["STRING"] = "" ;
  dispMUA.setInfo ( false , [] ) ;
//  dispMUA.showInfo() ;
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
  msgService.CopyMessage ( msgURI , dispMUA.StreamListener , false , null , msgWindow , {} ) ;
}

dispMUA.getHeader = function ( key )
{
  var value = dispMUA.headers.extractHeader ( key , false ) ;

  if ( value == null )
  {
    value = "" ;
  }

  return ( value ) ;
}

dispMUA.searchIcon = function ( strUserAgent )
{
  if ( ! strUserAgent )
  {
    strUserAgent = dispMUA.getHeader ( "user-agent" ) ;
  }

  if ( ! strUserAgent )
  {
    strUserAgent = dispMUA.getHeader ( "x-mailer" ) ;

    if ( ! strUserAgent )
    {
      strUserAgent = dispMUA.getHeader ( "x-newsreader" ) ;
    }
  }

  var strExtra = "" ;

  if ( dispMUA.getHeader ( "x-bugzilla-reason" ) )
  {
    strExtra = "bugzilla" ;
  }
  else if ( dispMUA.getHeader ( "x-php-bug" ) )
  {
    strExtra = "phpbug" ;
  }

  strUserAgent = strUserAgent.replace ( /(^\s+)|(\s+$)/g , "" ) ;
  dispMUA.Info["STRING"] = "" ;
  dispMUA.setInfo ( false , [] ) ;

  if ( strUserAgent != "" )
  {
    dispMUA.Info["STRING"] = strUserAgent ;
    var lower = strUserAgent.toLowerCase() ;

    //user overlay array
    for ( var key in dispMUA.arDispMUAOverlay )
    {
      if ( lower.indexOf ( key ) > -1 )
      {
        //an overlay icon already has the full path in it, including the protocol
        dispMUA.Info["PATH"] = "" ;
        dispMUA.Info["ICON"] = dispMUA.arDispMUAOverlay[key] ;
        //that the user knows he made the crap
        dispMUA.Info["STRING"] = strUserAgent + "\n" +
                                 "User override icon" + "\n" +
                                 "Key: " + key + "\n" +
                                 "Icon: " + dispMUA.Info["ICON"] ;
        dispMUA.Info["FOUND"] = true ;
        break ;
      }
    }

    if ( !dispMUA.Info["FOUND"] )
    {
      for ( var key in dispMUA.arDispMUAAllocation["fullmatch"] )
      {
        if ( lower == key )
        {
          dispMUA.setInfo ( true , dispMUA.arDispMUAAllocation["fullmatch"][key] ) ;
          break ;
        }
      }
    }

    if ( !dispMUA.Info["FOUND"] )
    {
      dispMUA.scan ( "presearch" , strUserAgent )
    }

    if ( !dispMUA.Info["FOUND"] )
    {
      var chLetter = lower.substr ( 0 , 1 ) ;

      if ( dispMUA.arDispMUAAllocation[chLetter] )
      {
        for ( var key in dispMUA.arDispMUAAllocation[chLetter] )
        {
          if ( lower.substr ( 0 , key.length ) == key )
          {
            dispMUA.setInfo ( true , dispMUA.arDispMUAAllocation[chLetter][key] ) ;
            break ;
          }
        }
      }
    }

    if ( !dispMUA.Info["FOUND"] )
    {
      dispMUA.scan ( "postsearch" , strUserAgent )
    }

    if ( !dispMUA.Info["FOUND"] )
    {
      dispMUA.Info["ICON"] = "unknown.png" ;
    }

    if ( dispMUA.Info["ICON"] == "thunderbird.png" )
    {
      if ( lower.indexOf ( "; linux" ) > -1 )
      {
        dispMUA.Info["ICON"] = "thunderbird-linux.png" ;
      }
      else if ( ( lower.indexOf ( "(windows" ) > -1 ) || ( lower.indexOf ( "; windows" ) > -1 ) )
      {
        dispMUA.Info["ICON"] = "thunderbird-windows.png" ;
      }
      else if ( ( lower.indexOf ( "(macintosh" ) > -1 ) || ( lower.indexOf ( "; intel mac" ) > -1 ) || ( lower.indexOf ( "; ppc mac" ) > -1 ) )
      {
        dispMUA.Info["ICON"] = "thunderbird-mac.png" ;
      }
      else if ( lower.indexOf ( "; sunos" ) > -1 )
      {
        dispMUA.Info["ICON"] = "thunderbird-sunos.png" ;
      }
      else if ( lower.indexOf ( "; freebsd" ) > -1 )
      {
        dispMUA.Info["ICON"] = "thunderbird-freebsd.png" ;
      }
      else if ( lower.indexOf ( "(x11" ) > -1 )
      {
        dispMUA.Info["ICON"] = "thunderbird-x11.png" ;
      }
    }
  }
  else if ( strExtra != "" )
  {
    if ( strExtra == "bugzilla" )
    {
      dispMUA.Info["ICON"] = "bugzilla.png" ;
      dispMUA.Info["STRING"] = "X-Bugzilla-Reason" ;
      dispMUA.Info["FOUND"] = true ;
    }
    else if ( strExtra == "phpbug" )
    {
      dispMUA.Info["ICON"] = "bug.png" ;
      dispMUA.Info["STRING"] = "X-PHP-Bug" ;
      dispMUA.Info["FOUND"] = true ;
    }
  }
  else if ( dispMUA.getHeader ( "organization" ) != "" )
  {
    dispMUA.getInfo ( "Organization" , "organization" ) ;
  }
  else if ( dispMUA.getHeader ( "x-mimeole" ) != "" )
  {
    dispMUA.getInfo ( "X-MimeOLE" , "x-mimeole" ) ;
  }
  else if ( dispMUA.getHeader ( "message-id" ) != "" )
  {
    dispMUA.getInfo ( "Message-ID" , "message-id" ) ;
  }

//  dispMUA.showInfo() ;
}

dispMUA.scan = function ( index , value )
{
  var lower = value.toLowerCase() ;

  for ( var key in dispMUA.arDispMUAAllocation[index] )
  {
    if ( lower.indexOf ( key ) > -1 )
    {
      dispMUA.setInfo ( true , dispMUA.arDispMUAAllocation[index][key] ) ;
      break ;
    }
  }
}

dispMUA.getInfo = function ( header )
{
  var index = header.toLowerCase() ;
  var value = dispMUA.getHeader ( index ) ;
  dispMUA.Info["STRING"] = header + ": " + value ;
  dispMUA.scan ( index , value )

  if ( dispMUA.Info["NAME"] )
  {
    dispMUA.Info["STRING"] = dispMUA.Info["NAME"] + "\n" + dispMUA.Info["STRING"] ;
  }
}

dispMUA.setInfo = function ( found , info )
{
  dispMUA.Info["FOUND"] = found ;
  dispMUA.Info["PATH"] = "chrome://dispmua/content/48x48/" ;
  dispMUA.Info["ICON"] = "empty.png" ;
  dispMUA.Info["URL"] = "" ;
  dispMUA.Info["NAME"] = "" ;

  if ( info[0] )
  {
    dispMUA.Info["ICON"] = info[0] ;
  }

  if ( info[1] )
  {
    dispMUA.Info["URL"] = info[1] ;
  }

  if ( info[2] )
  {
    dispMUA.Info["NAME"] = info[2] ;
  }
}

dispMUA.showInfo = function()
{
  var strTooltip = dispMUA.Info["STRING"] ;
  var pos = strTooltip.indexOf ( "\n" ) ;

  if ( pos != -1 )
  {
    strTooltip = dispMUA.Info["STRING"].substr ( 0 , pos ) ;
  }

  var elem = document.getElementById ( "dispMUAbroadcast" ) ;

  if ( elem == null )
  {
    elem = document.getElementById ( "dispMUAicon" ) ;
  }

  elem.setAttribute ( "src" , dispMUA.Info["PATH"] + dispMUA.Info["ICON"] ) ;
  elem.setAttribute ( "tooltiptext" , strTooltip ) ;
  var mini = document.getElementById ( "dispMUAicon-mini" ) ;

  if ( mini )
  {
    mini.src = elem.src ;
    mini.setAttribute ( "tooltiptext" , strTooltip ) ;
  }
}

/**
*  loads the user agent overlay file in which users can define their own icons
*
*  The overlay file has a semi-csv format.
*  - On every line, there have to be two strings, split by a comma ","
*  - The first string is the *lowercase* search string which shall match the user agent
*  - The second is the absolute path to the icon
*  If the search string shall include a comma itself, you can quote it.
*    So >"money,inc",/data/icons/money.png< would match the user agent
*    >Mail by Money,Inc. at Cayman Islands< but not >Moneymaker mailer<
*  There is no check for a third (or higher) column, so everything
*    behind the comma is used as the filename.
*  The filename may be quoted as well.
*/
dispMUA.loadMUAOverlayFile = function()
{
  var istream ;

  try
  {
    var service = Components.classes["@mozilla.org/file/directory_service;1"].getService ( Components.interfaces.nsIProperties ) ;
    var file = service.get ( "ProfD" , Components.interfaces.nsIFile ) ;
    file.append ( dispMUA.strOverlayFilename ) ;
    istream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance ( Components.interfaces.nsIFileInputStream ) ;
    istream.init ( file , 0x01 , 0444 , 0 ) ;
    istream.QueryInterface ( Components.interfaces.nsILineInputStream ) ;
  }
  catch ( e )
  {
    return ;
  }

  var line = {} , hasmore ;
  var strLine , nEndQuote , nCommaPos ;
  var strKey , strValue ;

  do
  {
    hasmore = istream.readLine ( line ) ;
    strLine = line.value ;

    if ( strLine.substr ( 0 , 1 ) == "#" )
    {
      //comment
      continue ;
    }

    if ( strLine.substr ( 0 , 1 ) == "\"" )
    {
      //with quotes
      //find end quote
      nEndQuote = strLine.indexOf ( "\"" , 2 ) ;

      if ( nEndQuote == -1 )
      {
        //no endquote? Bad line!
        continue ;
      }

      nCommaPos = strLine.indexOf ( "," , nEndQuote ) ;
    }
    else
    {
      //no quote
      nCommaPos = strLine.indexOf ( "," ) ;
    }

    if ( nCommaPos == -1 )
    {
      //no comma? Bad line!
      continue ;
    }

    strKey = dispMUA.stripSurroundingQuotes ( strLine.substr ( 0 , nCommaPos ) ) ;
    strValue = dispMUA.stripSurroundingQuotes ( strLine.substr ( nCommaPos + 1 ) ) ;
    dispMUA.arDispMUAOverlay[strKey] = strValue ;
  }
  while ( hasmore ) ;

  istream.close() ;
}

dispMUA.stripSurroundingQuotes = function ( string )
{
  if ( string.substr ( 0 , 1 ) == "\"" && string.substr ( string.length - 1 ) == "\"" )
  {
    string = string.substr ( 1 ) ;
    string = string.substr ( 0 , string.length - 1 ) ;
  }

  return ( string ) ;
}

dispMUA.checktext = function()
{
  var selectedText = dispMUA.checktextGetSelectedText() ;
  dispMUA.searchIcon ( selectedText ) ;
}

dispMUA.checktextPopup = function()
{ 
  var selectedText = dispMUA.checktextGetSelectedText() ;
  var elem = document.getElementById ( "context_checktext" ) ;
  elem.hidden = true ;
       
  if ( selectedText != "" )
  {
    if ( selectedText.length > 18 )
    {
      selectedText = selectedText.substr ( 0 , 14 ) + "..." ;
    }

    var menuText = "dispMUA: \"" + selectedText + "\"" ;
    elem.setAttribute ( "label" , menuText ) ;
    elem.hidden = false ;
  }
}

dispMUA.checktextGetSelectedText = function()
{ 
  var node = document.popupNode ;
  var selection = "" ;

  if ( ( node instanceof HTMLTextAreaElement ) || ( node instanceof HTMLInputElement && node.type == "text" ) )
  {
    selection = node.value.substring ( node.selectionStart , node.selectionEnd ) ;
  }
  else
  {
    var focusedWindow = new XPCNativeWrapper ( document.commandDispatcher.focusedWindow , "document" , "getSelection()" ) ;
    selection = focusedWindow.getSelection().toString() ;
  }

  selection = selection.replace ( /(^\s+)|(\s+$)/g , "" ) ;
  return ( selection ) ;
}

dispMUA.infopopup = function()
{
  if ( dispMUA.Info["STRING"] == "" )
  {
    alert ( dispMUA.bundle.getString ( "dispMUA.NoUserAgent" ) ) ;
  }
  else if ( dispMUA.Info["ICON"] == "empty.png" )
  {
  }
  else
  {
    var param = new Array (
      dispMUA.Info["PATH"] + dispMUA.Info["ICON"] ,
      dispMUA.Info["STRING"] ,
      "#990000" ,
      dispMUA.bundle.getString ( "dispMUA.NOTsupported" ) ,
      dispMUA.Info["URL"] ,
      dispMUA.headerdata
    ) ;

    if ( dispMUA.Info["FOUND"] )
    {
      param[2] = "#008800" ;
      param[3] = dispMUA.bundle.getString ( "dispMUA.supported" ) ;
    }

    window.openDialog ( "chrome://dispmua/content/feedback.xul" ,
    "feedback" , "chrome=yes,centerscreen" ,
    param[0] , param[1] , param[2] , param[3] , param[4] , param[5] ) ;
  }
}
