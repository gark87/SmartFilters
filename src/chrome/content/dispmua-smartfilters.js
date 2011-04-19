/**
 * This file logic was copied from dispMUA project and changed a bit.
 */

// declare var for data
var smartfilters_dispMUA = {
  arDispMUAAllocation : new Array(),
  header: null,
  Info : {},
}

// load data
var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                             .getService(Components.interfaces.mozIJSSubScriptLoader);
scriptLoader.loadSubScript("chrome://smartfilters/content/dispmua-data.js");

// methods
smartfilters_dispMUA.getHeader = function ( key )
{
  var value = smartfilters_dispMUA.header.getProperty ( key ) ;

  if ( value == null )
  {
    value = "" ;
  }

  return ( value ) ;
}
smartfilters_dispMUA.searchIcon = function ( header )
{
  smartfilters_dispMUA.header = header;
  var strUserAgent = "";
  if ( ! strUserAgent )
  {
    strUserAgent = smartfilters_dispMUA.getHeader ( "user-agent" ) ;
  }

  if ( ! strUserAgent )
  {
    strUserAgent = smartfilters_dispMUA.getHeader ( "x-mailer" ) ;

    if ( ! strUserAgent )
    {
      strUserAgent = smartfilters_dispMUA.getHeader ( "x-newsreader" ) ;
    }
  }

  var strExtra = "" ;

  if ( smartfilters_dispMUA.getHeader ( "x-bugzilla-reason" ) )
  {
    strExtra = "bugzilla" ;
  }
  else if ( smartfilters_dispMUA.getHeader ( "x-php-bug" ) )
  {
    strExtra = "phpbug" ;
  }

  strUserAgent = strUserAgent.replace ( /(^\s+)|(\s+$)/g , "" ) ;
  smartfilters_dispMUA.Info["STRING"] = "" ;
  smartfilters_dispMUA.setInfo ( false , [] ) ;

  if ( strUserAgent != "" )
  {
    smartfilters_dispMUA.Info["STRING"] = strUserAgent ;
    var lower = strUserAgent.toLowerCase() ;

    //user overlay array
    for ( var key in smartfilters_dispMUA.arDispMUAOverlay )
    {
      if ( lower.indexOf ( key ) > -1 )
      {
        //an overlay icon already has the full path in it, including the protocol
        smartfilters_dispMUA.Info["PATH"] = "" ;
        smartfilters_dispMUA.Info["ICON"] = smartfilters_dispMUA.arDispMUAOverlay[key] ;
        //that the user knows he made the crap
        smartfilters_dispMUA.Info["STRING"] = strUserAgent + "\n" +
                                 "User override icon" + "\n" +
                                 "Key: " + key + "\n" +
                                 "Icon: " + smartfilters_dispMUA.Info["ICON"] ;
        smartfilters_dispMUA.Info["FOUND"] = true ;
        break ;
      }
    }

    if ( !smartfilters_dispMUA.Info["FOUND"] )
    {
      for ( var key in smartfilters_dispMUA.arDispMUAAllocation["fullmatch"] )
      {
        if ( lower == key )
        {
          smartfilters_dispMUA.setInfo ( true , smartfilters_dispMUA.arDispMUAAllocation["fullmatch"][key] ) ;
          break ;
        }
      }
    }

    if ( !smartfilters_dispMUA.Info["FOUND"] )
    {
      smartfilters_dispMUA.scan ( "presearch" , strUserAgent )
    }

    if ( !smartfilters_dispMUA.Info["FOUND"] )
    {
      var chLetter = lower.substr ( 0 , 1 ) ;

      if ( smartfilters_dispMUA.arDispMUAAllocation[chLetter] )
      {
        for ( var key in smartfilters_dispMUA.arDispMUAAllocation[chLetter] )
        {
          if ( lower.substr ( 0 , key.length ) == key )
          {
            smartfilters_dispMUA.setInfo ( true , smartfilters_dispMUA.arDispMUAAllocation[chLetter][key] ) ;
            break ;
          }
        }
      }
    }

    if ( !smartfilters_dispMUA.Info["FOUND"] )
    {
      smartfilters_dispMUA.scan ( "postsearch" , strUserAgent )
    }

    if ( !smartfilters_dispMUA.Info["FOUND"] )
    {
      smartfilters_dispMUA.Info["ICON"] = "unknown.png" ;
    }

    if ( smartfilters_dispMUA.Info["ICON"] == "thunderbird.png" )
    {
      if ( lower.indexOf ( "; linux" ) > -1 )
      {
        smartfilters_dispMUA.Info["ICON"] = "thunderbird-linux.png" ;
      }
      else if ( ( lower.indexOf ( "(windows" ) > -1 ) || ( lower.indexOf ( "; windows" ) > -1 ) )
      {
        smartfilters_dispMUA.Info["ICON"] = "thunderbird-windows.png" ;
      }
      else if ( ( lower.indexOf ( "(macintosh" ) > -1 ) || ( lower.indexOf ( "; intel mac" ) > -1 ) || ( lower.indexOf ( "; ppc mac" ) > -1 ) )
      {
        smartfilters_dispMUA.Info["ICON"] = "thunderbird-mac.png" ;
      }
      else if ( lower.indexOf ( "; sunos" ) > -1 )
      {
        smartfilters_dispMUA.Info["ICON"] = "thunderbird-sunos.png" ;
      }
      else if ( lower.indexOf ( "(x11" ) > -1 )
      {
        smartfilters_dispMUA.Info["ICON"] = "thunderbird-x11.png" ;
      }
    }
  }
  else if ( strExtra != "" )
  {
    if ( strExtra == "bugzilla" )
    {
      smartfilters_dispMUA.Info["ICON"] = "bugzilla.png" ;
      smartfilters_dispMUA.Info["STRING"] = "X-Bugzilla-Reason" ;
      smartfilters_dispMUA.Info["FOUND"] = true ;
    }
    else if ( strExtra == "phpbug" )
    {
      smartfilters_dispMUA.Info["ICON"] = "bug.png" ;
      smartfilters_dispMUA.Info["STRING"] = "X-PHP-Bug" ;
      smartfilters_dispMUA.Info["FOUND"] = true ;
    }
  }
  else if ( smartfilters_dispMUA.getHeader ( "organization" ) != "" )
  {
//    smartfilters_dispMUA.getInfo ( "Organization" , "organization" ) ;
  }
  else if ( smartfilters_dispMUA.getHeader ( "x-mimeole" ) != "" )
  {
//    smartfilters_dispMUA.getInfo ( "X-MimeOLE" , "x-mimeole" ) ;
  }
  else if ( smartfilters_dispMUA.getHeader ( "message-id" ) != "" )
  {
//    smartfilters_dispMUA.getInfo ( "Message-ID" , "message-id" ) ;
  }

  return smartfilters_dispMUA.Info;
}
smartfilters_dispMUA.scan = function ( index , value )
{
  var lower = value.toLowerCase() ;

  for ( var key in smartfilters_dispMUA.arDispMUAAllocation[index] )
  {
    if ( lower.indexOf ( key ) > -1 )
    {
      smartfilters_dispMUA.setInfo(true, smartfilters_dispMUA.arDispMUAAllocation[index][key]);
      break;
    }
  }
}

smartfilters_dispMUA.setInfo = function ( found , info )
{
  smartfilters_dispMUA.Info["FOUND"] = found;
  smartfilters_dispMUA.Info["VALUE"] = info;
}

