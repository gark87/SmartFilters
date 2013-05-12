var EXPORTED_SYMBOLS = ["dispMUA"];

var dispMUA =
{
  stopped : false,
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
    dispMUA.stopped = true;
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
dispMUA.arDispMUAAllocation["'"] =
{
  "'akira32gold'" : [ "akira32gold.png" , "http://www.tg.rim.or.jp/~khf07113/" ] ,
}
dispMUA.arDispMUAAllocation["("] =
{
  "(c)agora mailer" : [ "agora.png" , "http://www.agora.pl/" ] ,
  "(mc) thunderbird" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
}
dispMUA.arDispMUAAllocation["."] =
{
  ".comfire-mail-system" : [ "suse.png" , "http://www.suse.com/" ] ,
}
dispMUA.arDispMUAAllocation["/"] =
{
  "/usr/lib/mon/alert.d/mail.alert" : [ "mon.png" , "http://mon.wiki.kernel.org/" ] ,
  "/disk3/www/kinosumperk.cz" : [ "kinosumperk_cz.png" , "http://www.kinosumperk.cz/" ] ,
  "/disk2/www/vavruska.info" : [ "vavruska_info.png" , "http://www.vavruska.info/" ] ,
  "/disk2/www/seeker.cz" : [ "seeker_cz.png" , "http://www.seeker.cz/" ] ,
  "/disk3/www/soom.cz" : [ "soom_cz.png" , "http://www.soom.cz/" ] ,
}
dispMUA.arDispMUAAllocation["1"] =
{
  "1c:enterprise" : [ "1c_enterprise.png" , "http://www.1c.ru/" ] ,
  "1blu webmail" : [ "1blu_de.png" , "http://www.1blu.de/" ] ,
  "1&1 webmail" : [ "1und1.png" , "http://www.1und1.de/" ] ,
  "1st news" : [ "1st-news.png" , "http://www.1st-scripts.de/" ] ,
  "1&1 voip" : [ "1und1.png" , "http://www.1und1.de/" ] ,
  "1&1 mail" : [ "1und1.png" , "http://www.1und1.de/" ] ,
  "126com" : [ "126_com.png" , "http://www.126.com/" ] ,
  "12all" : [ "12all.png" , "http://activecampaign.com/12all/" ] ,
}
dispMUA.arDispMUAAllocation["2"] =
{
  "24sevenoffice" : [ "24sevenoffice.png" , "http://www.24sevenoffice.com/" ] ,
  "2f cms/" : [ "2f-cms.png" , "http://www.2f-cms.com/" ] ,
}
dispMUA.arDispMUAAllocation["3"] =
{
  "3zs neratovice" : [ "3zsneratovice_cz.png" , "http://www.3zsneratovice.cz/" ] ,
  "3i mailer" : [ "3itools.png" , "http://www.3itools.com.br/" ] ,
  "3apa3a" : [ "3apa3a.png" , "http://security.nnov.ru/" ] ,
}
dispMUA.arDispMUAAllocation["4"] =
{
  "40tude_dialog" : [ "40tude_dialog.png" , "http://www.40tude.com/dialog/" ] ,
  "4mail" : [ "4mail.png" , "http://www.4mail.com/" ] ,
  "4stats.de" : [ "4stats_de.png" , "http://www.4stats.de/" ] ,
}
dispMUA.arDispMUAAllocation["6"] =
{
  "6.0 for windows" : [ "aol.png" , "http://www.aol.com/" ] ,
  "602lan suite" : [ "software602.png" , "http://www.software602.com/" ] ,
  "6.0 sub " : [ "aol.png" , "http://www.aol.com/" ] ,
}
dispMUA.arDispMUAAllocation["7"] =
{
  "7.0 for windows" : [ "aol.png" , "http://www.aol.com/" ] ,
  "724mailer" : [ "724mailer.png" , "http://www.seventwentyfour.com/" ] ,
}
dispMUA.arDispMUAAllocation["8"] =
{
  "8.0 for windows" : [ "aol.png" , "http://www.aol.com/" ] ,
}
dispMUA.arDispMUAAllocation["9"] =
{
  "9.0 security edition for windows" : [ "aol.png" , "http://www.aol.com/" ] ,
  "9.0 for windows" : [ "aol.png" , "http://www.aol.com/" ] ,
  "9.0 se for " : [ "aol.png" , "http://www.aol.com/" ] ,
}
dispMUA.arDispMUAAllocation["<"] =
{
  "<winnt's callegra" : [ "callegra.png" , "http://www.callware.com/unified.html" ] ,
  "<realtech mailer>" : [ "realtech.png" , "http://www.realtech.de/" ] ,
  "<sambar mailer>" : [ "sambar.png" , "http://sambar.de/" ] ,
  "<jtl-wawi mail>" : [ "jtl-software.png" , "http://www.jtl-software.de/" ] ,
  "<winnt's blat" : [ "blat.png" , "http://www.blat.net/" ] ,
  "<!-- coremail" : [ "coremail.png" , "http://www.mailtech.cn/" ] ,
  "< iwin.com" : [ "iwin_com.png" , "http://www.iwin.com/" ] ,
  "<asp.net" : [ "asp_net.png" , "http://www.asp.net/" ] ,
  "<smtp32" : [ "imail.png" , "http://www.imailserver.com/" ] ,
  "<imail" : [ "imail.png" , "http://www.imailserver.com/" ] ,
}
dispMUA.arDispMUAAllocation[">"] =
{
  ">> nero serial number mailer" : [ "nero.png" , "http://www.nero.com/" ] ,
}
dispMUA.arDispMUAAllocation["@"] =
{
  "@nifty webmail" : [ "nifty.png" , "http://www.nifty.com/mail/" ] ,
  "@posta.ge" : [ "posta_ge.png" , "http://www.posta.ge/" ] ,
}
dispMUA.arDispMUAAllocation["["] =
{
  "[ivo-expressivo]" : [ "expressivo.png" , "http://www.expressivo.com/" ] ,
  "[isd]justsystem" : [ "justsystems.png" , "http://www.justsystems.com/" ] ,
  "[ai:ti]" : [ "aiti.png" , "http://www.aiti.at/" ] ,
}
dispMUA.arDispMUAAllocation["a"] =
{
  "allaire coldfusion application server" : [ "coldfusion.png" , "http://www.adobe.com/products/coldfusion/" ] ,
  "alerts delivery system, marketwatch" : [ "marketwatch.png" , "http://www.marketwatch.com/" ] ,
  "allegro software rommailer" : [ "allegro.png" , "http://www.allegrosoft.com/rommailer.html" ] ,
  "axigen outlook connector" : [ "axigen.png" , "http://www.axigen.com/" ] ,
  "adobe photoshop services" : [ "photoshop.png" , "http://www.adobe.com/products/photoshop/" ] ,
  "add2it mailresponder pro" : [ "mailresponderpro.png" , "http://www.mailresponderpro.com/" ] ,
  "activexperts activeemail" : [ "activexperts.png" , "http://www.activexperts.com/activemail/" ] ,
  "auto-responder - id.kom" : [ "idkom_de.png" , "http://www.idkom.de/" ] ,
  "atl csmtp class mailer" : [ "microsoft.png" , "http://www.codeguru.com/cpp/i-n/internet/email/article.php/c6177/" ] ,
  "activxperts activemail" : [ "activexperts.png" , "http://www.activexperts.com/activemail/" ] ,
  "a/i webmail (roundcube" : [ "roundcube.png" , "http://www.roundcube.net/" ] ,
  "arena internet mailer" : [ "arena-internet-mailer.png" , "http://arena-internet-mailer.org/" ] ,
  "apple mobileme mailer" : [ "apple_mobileme.png" , "http://www.apple.com/mobileme/" ] ,
  "akna e-mail marketing" : [ "akna.png" , "http://www.akna.com.br/" ] ,
  "a+a exist-info sender" : [ "exist_ru.png" , "http://www.exist.ru/" ] ,
  "ateo newsletter tool" : [ "ateo-newsletter-tool.png" , "http://www.ateo.de/ateo_nl_tool.html" ] ,
  "asp component bundle" : [ "serverobjects.png" , "http://www.serverobjects.com/products.htm" ] ,
  "apsis newsletter pro" : [ "apsis.png" , "http://www.nyhetsbrev.biz/" ] ,
  "adrom e-mail manager" : [ "adrom_net.png" , "http://www.adrom.net/" ] ,
  "aconon mail software" : [ "aconon.png" , "http://www.aconon.de/" ] ,
  "auctionweb - mailer" : [ "auktionmaster.png" , "http://www.auktionmaster.de/" ] ,
  "at&t message center" : [ "att.png" , "http://www.att.com/" ] ,
  "astrocenter-mailer" : [ "astrocenter.png" , "http://www.astrocenter.de/" ] ,
  "animexx mailritter" : [ "animexx.png" , "http://www.animexx.com/" ] ,
  "amicron mailoffice" : [ "amicron.png" , "http://www.amicron.org/" ] ,
  "adiscon simplemail" : [ "simplemail.png" , "http://www.simplemail.adiscon.com/" ] ,
  "apple .mac mailer" : [ "apple_store.png" , "http://store.apple.com/" ] ,
  "allegro's promail" : [ "allegro_biz.png" , "http://www.allegro.biz/promail.htm" ] ,
  "agnitas ag/conrad" : [ "conrad.png" , "http://www.conrad.de/" ] ,
  "animation mailer" : [ "animecha.png" , "http://www.animecha.com/" ] ,
  "akio mail center" : [ "akio.png" , "http://www.akio-solutions.com/" ] ,
  "addemail activex" : [ "addemail-activex.png" , "http://www.traysoft.com/addemail_overview.htm" ] ,
  "anawave gravity" : [ "anawave-gravity.png" , "http://www.anawave.com/" ] ,
  "americasnet.com" : [ "americasnet_com.png" , "http://www.americasnet.com/" ] ,
  "ambit new media" : [ "ambit.png" , "http://www.ambitnewmedia.com/" ] ,
  "advalvas mailer" : [ "advalvas.png" , "http://www.advalvas.be/" ] ,
  "admin pro tools" : [ "adminprotools.png" , "http://www.adminprotools.com/" ] ,
  "axigen webmail" : [ "axigen.png" , "http://www.axigen.com/" ] ,
  "anneca intouch" : [ "anneca-intouch.png" , "http://www.intouch-crm.cz/" ] ,
  "agonet webmail" : [ "agonet.png" , "http://www.agonet.it/" ] ,
  "acro media inc" : [ "acromedia.png" , "http://www.acromediainc.com/" ] ,
  "aconon.de mail" : [ "aconon.png" , "http://www.aconon.de/" ] ,
  "atlantisworld" : [ "atlantisworld.png" , "http://www.atlantisworld.it/" ] ,
  "aster webmail" : [ "aster.png" , "http://www.aster.pl/" ] ,
  "aspheria mail" : [ "aspheria.png" , "http://www.aspheria.com/" ] ,
  "argentina.com" : [ "argentina_com.png" , "http://www.argentina.com/" ] ,
  "aranay mailer" : [ "aranay.png" , "http://www.aranay.com/" ] ,
  "aport webmail" : [ "aport.png" , "http://www.aport.ru/" ] ,
  "amiga newsrog" : [ "amiga.png" , "http://sourceforge.net/projects/newsrog" ] ,
  "alice-webmail" : [ "alice.png" , "http://www.alice-dsl.de/" ] ,
  "akibaoomailer" : [ "akibaoo.png" , "http://www.akibaoo.co.jp/" ] ,
  "activemaillib" : [ "phpclasses.png" , "http://georgiost.users.phpclasses.org/browse/package/2145.html" ] ,
  "abricoomailer" : [ "abricoo.png" , "http://www.abricoo.com/" ] ,
  "atlas mailer" : [ "atlas.png" , "http://www.data-trak.com/atlas_mailer.php" ] ,
  "aspa webmail" : [ "aspa_cz.png" , "http://www.aspa.cz/" ] ,
  "ampartner.pl" : [ "ampartner_pl.png" , "http://www.ampartner.pl/" ] ,
  "agendus mail" : [ "agendus.png" , "http://www.iambic.com/" ] ,
  "afs-kaufmann" : [ "afs-software.png" , "http://www.afs-software.de/" ] ,
  "activitymail" : [ "activitymail.png" , "http://search.cpan.org/dist/activitymail/" ] ,
  "activemail v" : [ "activemail-cibenix.png" , "http://www.cibenix.com/" ] ,
  "active! mail" : [ "active_mail_jp.png" , "http://activemail.jp/" ] ,
  "aboutspecial" : [ "about_com.png" , "http://www.about.com/" ] ,
  "ability mail" : [ "abilitymail.png" , "http://www.code-crafters.com/abilitymailserver/" ] ,
  "auto mailer" : [ "auto_mailer.png" , "http://www.automsw.com/" ] ,
  "atu webmail" : [ "atu.png" , "http://www.atu.eu/" ] ,
  "aspnetemail" : [ "aspnetemail.png" , "http://www.aspnetemail.com/" ] ,
  "asp smtpsvg" : [ "serverobjects.png" , "http://www.serverobjects.com/products.htm" ] ,
  "apollo mail" : [ "apollo_mail.png" , "http://www.apollomail.com/" ] ,
  "aon webmail" : [ "aon.png" , "http://www.aon.at/" ] ,
  "amtangee(r)" : [ "amtangee.png" , "http://www.amtangee.com/" ] ,
  "aim webmail" : [ "aol.png" , "http://www.aol.com/" ] ,
  "active.mail" : [ "active.mail.png" , "http://nazwa.pl/serwery-activemail.html" ] ,
  "aborange.de" : [ "aborange.png" , "http://www.aborange.de/" ] ,
  "ats mailer" : [ "abovetopsecret.png" , "http://www.abovetopsecret.com/" ] ,
  "applixware" : [ "vistasource.png" , "http://www.vistasource.com/en/applixware.php" ] ,
  "apple mail" : [ "apple_mail.png" , "http://www.apple.com/macosx/features/mail/" ] ,
  "agooza.net" : [ "agooza.png" , "http://www.agooza.net/" ] ,
  "activemail" : [ "activemail.png" , "http://www.activeup.com/" ] ,
  "a1 webmail" : [ "a1webmail.png" , "http://www.a1.net/" ] ,
  "anglemail" : [ "anglemail.png" , "http://www.anglemail.org/" ] ,
  "amos mail" : [ "spectec.png" , "http://www.spectec.net/maritime_mail.asp" ] ,
  "alphamail" : [ "alphamail.png" , "http://alphamail.sourceforge.net/" ] ,
  "al-mail32" : [ "almail.png" , "http://www.almail.com/" ] ,
  "agregator" : [ "viadeo.png" , "http://www.viadeo.com/" ] ,
  "activefax" : [ "activefax.png" , "http://www.activefax-software.de/" ] ,
  "ac mailer" : [ "12all.png" , "http://activecampaign.com/12all/" ] ,
  "avantfax" : [ "avantfax.png" , "http://www.avantfax.com/" ] ,
  "aspqmail" : [ "serverobjects.png" , "http://www.serverobjects.com/products.htm" ] ,
  "altobase" : [ "altobase.png" , "http://altobase.jp/asp/" ] ,
  "aeromail" : [ "aeromail.png" , "http://the.cushman.net/reverb/aeromail/" ] ,
  "acmemail" : [ "acmemail.png" , "http://www.astray.com/acmemail/" ] ,
  "accucast" : [ "accucast.png" , "http://www.accucast.com/" ] ,
  "a.net.pl" : [ "a_net_pl.png" , "http://www.a.net.pl/" ] ,
  "azureus" : [ "azureus.png" , "http://azureus.sourceforge.net/" ] ,
  "azet.sk" : [ "azet_sk.png" , "http://www.azet.sk/" ] ,
  "avstore" : [ "avstore.png" , "http://www.avstore.ro/" ] ,
  "atmail " : [ "atmail.png" , "http://www.atmail.com/" ] ,
  "aspmail" : [ "serverobjects.png" , "http://www.serverobjects.com/products.htm" ] ,
  "asp.net" : [ "asp_net.png" , "http://www.asp.net/" ] ,
  "arcabit" : [ "arcabit.png" , "http://www.arcabit.com/" ] ,
  "arachne" : [ "arachne.png" , "http://browser.arachne.cz/" ] ,
  "amember" : [ "cgi-central_net.png" , "http://www.amember.com/" ] ,
  "alpha-g" : [ "alpha-g.png" , "http://www.alphagconsulting.com/" ] ,
  "ak-mail" : [ "ak-mail.png" , "http://www.akmail.com/" ] ,
  "airmail" : [ "airmail.png" , "http://www.air.co.jp/products/air_mail_c/amc.html" ] ,
  "agnitas" : [ "agnitas.png" , "http://www.agnitas.de/" ] ,
  "aethera" : [ "aethera.png" , "http://www.thekompany.com/projects/aethera/" ] ,
  "adtoone" : [ "adtoone.png" , "http://www.zaisoft.com/adtoone/" ] ,
  "addemar" : [ "addemar.png" , "http://www.addemar.com/" ] ,
  "abvmail" : [ "abvmail.png" , "http://www.abv.bg/" ] ,
  "axinom" : [ "axinom.png" , "http://www.axinom.com/" ] ,
  "aweber" : [ "aweber.png" , "http://www.aweber.com/" ] ,
  "avenum" : [ "avenum.png" , "http://www.avenum.com/" ] ,
  "avast!" : [ "avast.png" , "http://www.avast.ru/" ] ,
  "arclab" : [ "amlc.png" , "http://www.arclab.com/products/amlc/" ] ,
  "aperto" : [ "aperto.png" , "http://www.aperto.de/" ] ,
  "alpine" : [ "alpine.png" , "http://www.washington.edu/alpine/" ] ,
  "adjoli" : [ "adjoli.png" , "http://www.adjoli.de/" ] ,
  "acumen" : [ "acumen.png" , "http://www.cyberwolf.com/" ] ,
  "arcor" : [ "arcor.png" , "http://www.arcor.de/" ] ,
  "adele" : [ "gnupp-adele.png" , "http://www.gnupp.de/" ] ,
  "airt" : [ "airt.png" , "http://sourceforge.net/projects/airt" ] ,
  "aol" : [ "aol.png" , "http://www.aol.com/" ] ,
  "afp" : [ "afp.png" , "http://www.afpnet.org/" ] ,
}
dispMUA.arDispMUAAllocation["b"] =
{
  "berlitec massmailer based on phpmailer" : [ "phpmailer.png" , "http://phpmailer.codeworxtech.com/" ] ,
  "beer email by beeradvocate.com" : [ "beeradvocate.png" , "http://beeradvocate.com/" ] ,
  "bynari insight connector" : [ "insight-connector.png" , "http://www.bynari.net/" ] ,
  "blue shield mail server" : [ "tumbleweed.png" , "http://www.tumbleweed.com/" ] ,
  "bueroware mailclient" : [ "softengine.png" , "http://www.softengine.de/" ] ,
  "billing@disputo.com" : [ "disputo_com.png" , "http://www.disputo.com/" ] ,
  "bercut carem email" : [ "bercut.png" , "http://www.bercut.com/en/products/view.html?id=10" ] ,
  "bbsoft mail server" : [ "bbsoft.png" , "http://www.bbsoft.de/" ] ,
  "brezosoft kmailer" : [ "kmailer.png" , "http://www.kmailer.com/" ] ,
  "bookcrossing.com" : [ "bookcrossing.png" , "http://www.bookcrossing.com/" ] ,
  "blue world lasso" : [ "lasso.png" , "http://www.lassosoft.com/" ] ,
  "blue sky factory" : [ "blueskyfactory.png" , "http://www.blueskyfactory.com/" ] ,
  "beatware mail-it" : [ "beos_beatwaremailit.png" , "http://www.beatware.com/" ] ,
  "balticdatacenter" : [ "balticdatacenter.png" , "http://www.balticdatacenter.pl/" ] ,
  "britecastmailer" : [ "britemoon.png" , "http://www.britemoon.com/" ] ,
  "booklooker-mail" : [ "booklooker.png" , "http://www.booklooker.de/" ] ,
  "blizzard mailer" : [ "blizzard.png" , "http://www.blizzard.com/" ] ,
  "benchmail agent" : [ "benchmark.png" , "http://benchmail.benchmark.fr/" ] ,
  "bank of america" : [ "bankofamerica.png" , "https://wealthmanagement.bankofamerica.com/nsm/demo/estatements.html" ] ,
  "bre massmailer" : [ "bre.png" ] ,
  "burgerking.de" : [ "burgerking.png" , "http://www.burgerking.de/" ] ,
  "broadcasthtml" : [ "broadcasthtml.png" , "http://www.mailworkz.com/broadcast.htm" ] ,
  "boardsolution" : [ "boardsolution.png" , "http://www.boardsolution.de/" ] ,
  "bayt sendmail" : [ "bayt.png" , "http://www.bayt.com/" ] ,
  "bronto mail" : [ "brontomail.png" , "http://www.bronto.com/" ] ,
  "bpm beeline" : [ "bpm_beeline.png" , "http://www.bpm.ch/Produkte/beeline" ] ,
  "bplaced.net" : [ "bplaced_net.png" , "http://www.bplaced.net/" ] ,
  "bitdefender" : [ "bitdefender.png" , "http://www.bitdefender.com/" ] ,
  "bluedragon" : [ "bluedragon.png" , "http://www.newatlanta.com/products/bluedragon/" ] ,
  "bestarmail" : [ "willcom.png" , "http://www.willcom-inc.com/" ] ,
  "bee alerts" : [ "bee_alerts.png" ] ,
  "basemailer" : [ "basemailer.png" ] ,
  "bas mailer" : [ "bas-mailer.png" , "http://www.pilodata.de/bas.jsp" ] ,
  "bossmedia" : [ "bossmedia.png" , "http://www.bossmedia.com/" ] ,
  "bofh-mail" : [ "bofhmail.png" ] ,
  "blitzmail" : [ "blitzmail.png" , "http://www.dartmouth.edu/comp/support/library/software/email/blitzmail/" ] ,
  "bigsender" : [ "bigsender.png" , "http://www.craigrichards.com/software/bigsender/" ] ,
  "beos-pynr" : [ "beos.png" , "http://www.beincorporated.com/" ] ,
  "beos mail" : [ "beos_bemail.png" , "http://sourceforge.net/projects/bemaildaemon/" ] ,
  "bdoc-edit" : [ "bdoc-edit.png" , "http://www.bdoc.com/" ] ,
  "boldchat" : [ "bold.png" , "http://www.boldchat.com/" ] ,
  "blink.pl" : [ "blink_pl.png" , "http://www.blink.pl/" ] ,
  "birdigee" : [ "birdigee.png" , "http://www.birdigee.de/newsletter.shtml" ] ,
  "betanews" : [ "betanews.png" ] ,
  "banan.cz" : [ "banan_cz.png" , "http://webmail.banan.cz/" ] ,
  "buch24 " : [ "buch24_de.png" , "http://www.buch24.de/" ] ,
  "bluewin" : [ "bluewin_ch.png" , "http://www.bluewin.ch/" ] ,
  "bluetie" : [ "bluetie.png" , "http://www.bluetie.com/" ] ,
  "bloomba" : [ "bloomba.png" , "http://www.statalabs.com/" ] ,
  "blog.de" : [ "blog_de.png" , "http://www.blog.de/" ] ,
  "baur-nl" : [ "baur-nl.png" , "http://www.baur.de/" ] ,
  "basilix" : [ "basilix.png" , "http://www.basilix.org/" ] ,
  "b1gmail" : [ "b1gmail.png" , "http://www.b1g.de/" ] ,
  "bytec " : [ "bytec.png" , "http://www.bytec.biz/" ] ,
  "biabam" : [ "biabam.png" ] ,
  "bemail" : [ "beos_bemail.png" , "http://sourceforge.net/projects/bemaildaemon/" ] ,
  "becky!" : [ "becky.png" , "http://www.rimarts.co.jp/becky.htm" ] ,
  "bazaar" : [ "bazaar.png" , "http://bazaar-vcs.org/" ] ,
  "boxee" : [ "boxee.png" , "http://www.boxee.tv/" ] ,
  "bmail" : [ "bmail.png" , "http://www.beyondlogic.org/" ] ,
  "barca" : [ "barca.png" , "http://www.pocosystems.com/" ] ,
  "balsa" : [ "balsa.png" , "http://balsa.gnome.org/" ] ,
  "bscw" : [ "bscw.png" , "http://public.bscw.de/" ] ,
  "blat" : [ "blat.png" , "http://www.blat.net/" ] ,
  "beam" : [ "beos_beam.png" , "http://beam.sourceforge.net/" ] ,
  "bbc" : [ "bbc.png" , "http://www.bbc.co.uk/" ] ,
}
dispMUA.arDispMUAAllocation["c"] =
{
  "cart managment system at http://www.linuxcenter.ru" : [ "linuxcenter_ru.png" , "http://www.linuxcenter.ru/" ] ,
  "correo electrónico de internet de microsoft/mapi" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "cart managment system at http://linuxcenter.ru" : [ "linuxcenter_ru.png" , "http://www.linuxcenter.ru/" ] ,
  "couchsurfing mailer daemon" : [ "couchsurfing.png" , "http://www.couchsurfing.com/" ] ,
  "coppermine photo gallery" : [ "coppermine.png" , "http://coppermine-gallery.net/" ] ,
  "com.apple.wwdr.jmsmailer" : [ "apple.png" , "http://store.apple.com/" ] ,
  "codestone mail control" : [ "codestone.png" , "http://www.codestone.ltd.uk/" ] ,
  "clever internet suite" : [ "cis.png" , "http://clevercomponents.com/products/inetsuite/suite.asp" ] ,
  "consultantplussender" : [ "consultant_ru.png" , "http://www.consultant.ru/" ] ,
  "clearcase automailer" : [ "clearcase.png" , "http://www-306.ibm.com/software/awdtools/clearcase/" ] ,
  "calcium web calendar" : [ "calcium.png" , "http://www.brownbearsw.com/calcium/" ] ,
  "crosspoint [openxp/" : [ "crosspoint_openxp.png" , "http://www.openxp.de/" ] ,
  "cpjnssmtpconnection" : [ "cpjnsmtpconnection.png" ] ,
  "cookie craft server" : [ "cookie_craft.png" , "http://www.cookie-craft.de/" ] ,
  "com.oreilly.servlet" : [ "servlets_com.png" , "http://www.servlets.com/cos/" ] ,
  "cpjnsmtpconnection" : [ "cpjnsmtp.png" , "http://www.naughter.com/smtp.html" ] ,
  "contactoffice mail" : [ "contactoffice.png" , "http://www.contactoffice.com/" ] ,
  "chorus by zerocode" : [ "zerocode.png" , "http://www.zerocode.com/" ] ,
  "catapulta.infomail" : [ "infomail.png" , "http://www.infomail.it/" ] ,
  "crosspoint/openxp" : [ "crosspoint_openxp.png" , "http://www.openxp.de/" ] ,
  "crosspoint/freexp" : [ "crosspoint_freexp.png" , "http://www.freexp.de/" ] ,
  "correo uc webmail" : [ "uc_cl.png" , "http://www.uc.cl/" ] ,
  "compleo smtp mail" : [ "symtrax.png" , "http://www.symtrax.de/" ] ,
  "clear net webmail" : [ "clearnet.png" , "http://webmail.clear.net.nz/" ] ,
  "coremail webmail" : [ "coremail.png" , "http://www.mailtech.cn/" ] ,
  "copia emailfacts" : [ "copia_emailfacts.png" , "http://www.copia.com/e-mailfacts/" ] ,
  "cf_advancedemail" : [ "coldfusion.png" , "http://www.vandieten.net/jochem/coldfusion/customtags/advancedemail/" ] ,
  "catapulta.sender" : [ "infomail.png" , "http://www.infomail.it/" ] ,
  "cas genesisworld" : [ "genesis_world.png" , "http://www.cas.de/produkte/genesisWorld/" ] ,
  "cadexpert.com.pl" : [ "cadexpert_com_pl.png" , "http://cadexpert.com.pl/" ] ,
  "cyrealis hermes" : [ "cyrealis.png" , "http://www.cyrealis.com/" ] ,
  "csmtpconnection" : [ "cpjnsmtpconnection.png" , "http://www.naughter.com/smtp.html" ] ,
  "crosspoint [xp2" : [ "crosspoint_xp2.png" , "http://xp2.de/" ] ,
  "coolblue-mailer" : [ "coolblue.png" ] ,
  "constantcontact" : [ "constantcontact.png" , "http://www.constantcontact.com/" ] ,
  "communigate pro" : [ "communigatepro.png" , "http://www.communigate.com/CommuniGatePro/" ] ,
  "cobian backup 9" : [ "cobianbackup9.png" , "http://www.cobian.se/" ] ,
  "cobian backup 8" : [ "cobianbackup8.png" , "http://www.cobian.se/" ] ,
  "cobian backup 7" : [ "cobianbackup7.png" , "http://www.cobian.se/" ] ,
  "cleancode.email" : [ "cleancode-email.png" , "http://www.cleancode.org/projects/email" ] ,
  "cenqua-crucible" : [ "crucible.png" , "http://www.cenqua.com/crucible" ] ,
  "cyberghost vpn" : [ "cyberghostvpn.png" , "http://www.cyberghostvpn.com/" ] ,
  "consol*cm-mail" : [ "consol_cm.png" , "http://www.consol.de/unternehmen/infomaterial/" ] ,
  "cogeco webmail" : [ "cogeco_ca.png" , "http://www.cogeco.ca/" ] ,
  "class smtpmail" : [ "emarsys.png" , "https://www.emarsys.com/" ] ,
  "claros intouch" : [ "claros_intouch.png" , "http://www.claros.org/" ] ,
  "claris emailer" : [ "claris_emailer.png" , "http://www.claris.com/" ] ,
  "cappuccino crm" : [ "cappuccinosoft.png" , "http://www.cappuccinosoft.de/" ] ,
  "cad-kas mailer" : [ "cadkas_com.png" , "http://www.cadkas.com/" ] ,
  "c't-emailcheck" : [ "heise_security.png" , "http://www.heise.de/security/dienste/emailcheck/" ] ,
  "cubiss mailer" : [ "cubiss.png" , "http://www.cubiss.nl/" ] ,
  "cu newsletter" : [ "cleverinternetsuite.png" , "http://www.clevercomponents.com/products/inetsuite/suite.asp" ] ,
  "cu mailsystem" : [ "computeruniverse.png" , "http://www.computeruniverse.net/" ] ,
  "ctm powermail" : [ "ctm_powermail.png" , "http://www.ctmdev.com/" ] ,
  "compost carma" : [ "compost_carma.png" , "http://www.compost.se/en/carma/" ] ,
  "codes-sources" : [ "code-source.png" ] ,
  "cobian backup" : [ "cobian.png" , "http://www.cobian.se/" ] ,
  "chollian mail" : [ "chollian.png" , "http://www.chol.com/" ] ,
  "chipfind mail" : [ "chipfind.png" , "http://www.chipfind.net/" ] ,
  "cdrwinkel.com" : [ "cdrwinkel.png" , "http://www.cdrwinkel.com/" ] ,
  "cash crusader" : [ "cashcrusader.png" , "http://cashcrusadersoftware.com/" ] ,
  "cards.mail.ru" : [ "mail_ru.png" , "http://www.mail.ru/" ] ,
  "custommailer" : [ "custommailer.png" , "http://www.wildcrest.com/" ] ,
  "copland mail" : [ "copland_udel_edu.png" , "http://copland.udel.edu/" ] ,
  "contactology" : [ "contactology.png" , "http://www.contactology.com/" ] ,
  "coldfusion 8" : [ "coldfusion8.png" , "http://www.adobe.com/products/coldfusion/" ] ,
  "coelnconcept" : [ "coelnconcept_de.png" , "http://www.coelnconcept.de/" ] ,
  "code igniter" : [ "code-igniter.png" , "http://codeigniter.com/" ] ,
  "cmail writer" : [ "cmail_writer.png" , "http://mikilab.doshisha.ac.jp/~kawasaki/" ] ,
  "chatteremail" : [ "chatteremail.png" , "http://www.palm.com/us/software/chatteremail/" ] ,
  "centrum mail" : [ "centrum_cz.png" , "http://www.centrum.cz/" ] ,
  "center parcs" : [ "centerparcs_de.png" , "http://www.centerparcs.de/" ] ,
  "catchme@mail" : [ "catchmeatmail.png" , "http://www.canon-js.co.jp/english/products/webmail/catchmemail.html" ] ,
  "cashu system" : [ "cashu.png" , "http://www.cashu.com/" ] ,
  "carookee.com" : [ "carookee_com.png" , "http://www.carookee.com/" ] ,
  "com.zooplus" : [ "zooplus_de.png" , "http://www.zooplus.de/" ] ,
  "codeweavers" : [ "codeweavers.png" , "http://www.codeweavers.com/" ] ,
  "codeigniter" : [ "codeigniter.png" , "http://codeigniter.com/" ] ,
  "clickmailer" : [ "clickmailer.png" , "http://www.clickmailer.jp/" ] ,
  "cb javamail" : [ "java.png" , "http://java.sun.com/products/javamail/" ] ,
  "cuenote fc" : [ "cuenote-fc.png" , "http://www.cuenote.jp/fc/" ] ,
  "crosspoint" : [ "crosspoint.png" , "http://www.crosspoint.de/" ] ,
  "createsend" : [ "createsend.png" , "http://www.createsend.com/" ] ,
  "cphpezmail" : [ "phpclasses.png" , "http://www.phpclasses.org/cphpezmail" ] ,
  "cosmoshop/" : [ "cosmoshop.png" , "http://www.cosmoshop.de/" ] ,
  "contactlab" : [ "contactlab.png" , "http://www.contactlab.it/" ] ,
  "comventure" : [ "comventure.png" , "http://www.comventure.de/" ] ,
  "compuserve" : [ "compuserve.png" , "http://www.compuserve.com/" ] ,
  "coldfusion" : [ "coldfusion.png" , "http://www.adobe.com/products/coldfusion/" ] ,
  "cmmx01.dll" : [ "combit.png" , "http://www.combit.net/" ] ,
  "cloud nine" : [ "cloud9.png" , "http://www.cloudnine.se/" ] ,
  "clearquest" : [ "ibm.png" , "http://www-01.ibm.com/software/awdtools/clearquest/" ] ,
  "claws mail" : [ "claws-mail.png" , "http://www.claws-mail.org/" ] ,
  "citimailer" : [ "citi.png" , "http://www.citi.com/" ] ,
  "chili!soft" : [ "chilisoft.png" , "http://www.chilisoft.com/" ] ,
  "caprisonne" : [ "caprisonne.png" , "http://www.capri-sonne.de/" ] ,
  "cacert.org" : [ "cacert.png" , "http://www.cacert.org/" ] ,
  "ca_mailer/" : [ "ca_mailer.png" , "http://pro.channeladvisor.de/" ] ,
  "cvsmailer" : [ "cvsmailer.png" ] ,
  "consultes" : [ "consultes_it.png" , "http://www.consultes.it/" ] ,
  "clie mail" : [ "clie-mail.png" , "http://www.sony.jp/CLIE/" ] ,
  "citromail" : [ "citromail.png" ] ,
  "chordiant" : [ "chordiant.png" , "http://www.chordiant.com/" ] ,
  "cadooz-ag" : [ "cadooz-ag.png" , "http://cadooz.de/" ] ,
  "cacmailer" : [ "commeaucinema.png" , "http://www.commeaucinema.com/" ] ,
  "cacaomail" : [ "cacaomail.png" , "http://ooyes.net/" ] ,
  "cubecart" : [ "cubecart.png" , "http://www.cubecart.com/" ] ,
  "cliffmoe" : [ "cliffmoe_com.png" , "http://www.cliffmoe.com/" ] ,
  "chauntry" : [ "chauntry.png" , "http://www.chauntry.com/" ] ,
  "chandler" : [ "chandler.png" , "http://chandlerproject.org/" ] ,
  "cgiemail" : [ "mit.png" , "http://web.mit.edu/wwwdev/cgiemail/" ] ,
  "cerberus" : [ "cerberus_helpdesk.png" , "http://www.cerberusweb.com/" ] ,
  "caramail" : [ "lycos-caramail.png" , "http://www.caramail.com/" ] ,
  "carteiro" : [ "carteiro.png" , "http://www.linkws.com/br/marketing/carteiro_apres.htm" ] ,
  "cabestan" : [ "cabestan.png" , "http://www.cabestan.com/" ] ,
  "cvsspam" : [ "cvs.png" ] ,
  "csg-net" : [ "csg-germering.png" , "http://intern.csg-germering.de/" ] ,
  "courier" : [ "courier.png" , "http://www.rosecitysoftware.com/courier/" ] ,
  "confixx" : [ "confixx.png" , "http://www.parallels.com/de/products/confixx/" ] ,
  "columba" : [ "columba.png" ] ,
  "clsimap" : [ "php.png" , "" ] ,
  "cl-smtp" : [ "cl-smtp.png" , "http://common-lisp.net/project/cl-smtp/" ] ,
  "chilkat" : [ "chilkat.png" , "http://www.chilkatsoft.com/" ] ,
  "cbizone" : [ "cbizone.png" , "http://www.cbizsoft.com/" ] ,
  "cbfmail" : [ "cardboardfish_com.png" , "http://www.cardboardfish.com/" ] ,
  "calypso" : [ "calypso.png" , "http://www.rosecitysoftware.com/calypso/" ] ,
  "cakephp" : [ "cakephp.png" , "http://cakephp.org/" ] ,
  "cybozu" : [ "cybozu.png" , "http://www.cybozu.com/" ] ,
  "cwmail" : [ "netwinsite.png" , "http://netwinsite.com/cwmail/" ] ,
  "cmail1" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail2" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail3" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail4" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail5" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail6" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail7" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail8" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "cmail9" : [ "campaignmonitor.png" , "http://www.campaignmonitor.com/" ] ,
  "clx.ru" : [ "clx_ru.png" , "http://www.clx.ru/" ] ,
  "chikka" : [ "chikka.png" , "http://www.chikka.com/txt2mail/" ] ,
  "chaos/" : [ "gnus.png" , "http://gnus.org/" ] ,
  "ccmail" : [ "cicoandcico.png" , "http://www.cicoandcico.com/ccmail-10/" ] ,
  "cpdev" : [ "cpdev.png" , "http://www.cpdev.co.uk/" ] ,
  "copix" : [ "copix.png" , "http://copix.org/" ] ,
  "cisco" : [ "cisco.png" , "http://www.cisco.com/" ] ,
  "camas" : [ "caudium.png" , "http://www.caudium.net/" ] ,
  "cacti" : [ "cacti.png" , "http://www.cacti.net/" ] ,
  "caff" : [ "caff.png" , "http://pgp-tools.alioth.debian.org/" ] ,
  "com " : [ "wincom.png" , "" ] ,
  "cms " : [ "hypernews.png" , "http://hypernews.slac.stanford.edu/" ] ,
  "cme-" : [ "infor.png" , "http://go.infor.com/inforcrm/" ] ,
}
dispMUA.arDispMUAAllocation["d"] =
{
  "dynamic internet messaging program" : [ "horde.png" , "http://www.horde.org/dimp/" ] ,
  "do, or do not. there is no try." : [ "mixi.png" , "http://mixi.jp/" ] ,
  "desis & sertic :: facturacion" : [ "desis.png" , "http://www.desis.cl/" ] ,
  "dodo internet webmail server" : [ "dodo.png" , "http://www.dodo.com.au/" ] ,
  "datenkraft newsletter system" : [ "datenkraft.png" , "http://www.datenkraft.com/" ] ,
  "dmc - www.dmcdeutschland.de" : [ "dmc.png" , "http://www.dmcdeutschland.de/" ] ,
  "digionline gmbh webweaver" : [ "digionline_webweaver.png" , "http://www.ww3ee.de/" ] ,
  "deutsche steuerverwaltung" : [ "elster.png" , "http://www.elster.de/" ] ,
  "domaincheck mailing list" : [ "domaincheck.png" ] ,
  "direct mail for mac os x" : [ "direct_mail_osx.png" ] ,
  "dreamhost mailing lists" : [ "dreamhost.png" , "http://www.dreamhost.com/" ] ,
  "doubleclick clickmailer" : [ "clickmailer.png" , "http://www.clickmailer.jp/" ] ,
  "doubleclick clickm@iler" : [ "clickmailer.png" , "http://www.clickmailer.jp/" ] ,
  "data protector express" : [ "hp_data-protector-express.png" , "http://h18006.www1.hp.com/products/software/im/biz_continuity_avail/dp/" ] ,
  "debian - icedove mail" : [ "icedove.png" , "http://packages.debian.org/stable/mail/icedove" ] ,
  "de.tivano.mail.mailer" : [ "tivano_de.png" , "http://www.tivano.de/" ] ,
  "dial systems esponse" : [ "esponse.png" , "http://www.dialsystems.de/ESP_0.php" ] ,
  "delaforge consulting" : [ "xds-consulting.png" , "http://www.xds-consulting.com/" ] ,
  "datingwalk mailagent" : [ "datingwalk.png" , "http://www.datingwalk.com/" ] ,
  "domain-offensive.de" : [ "domainoffensive.png" , "http://www.domain-offensive.de/" ] ,
  "donorware sendbulk" : [ "donorware.png" ] ,
  "debian thunderbird" : [ "thunderbird.png" , "http://www.debian.org/" ] ,
  "date.bluesystem.ru" : [ "bluesystem_ru.png" , "http://date.bluesystem.ru/" ] ,
  "dreamhost webmail" : [ "dreamhost.png" , "http://www.dreamhost.com/" ] ,
  "delano e-business" : [ "delano.png" , "http://www.delanotech.com/" ] ,
  "david.fx by tobit" : [ "tobit_david.png" , "http://www.tobit.com/" ] ,
  "dynabyte webshop" : [ "dynabyte.png" , "http://www.dyna-byte.de/" ] ,
  "dumbonet systems" : [ "dumbonet.png" ] ,
  "directemail xtra" : [ "directmailxtra.png" ] ,
  "direct read news" : [ "drn.png" , "http://nntpjunkie.com/drn.htm" ] ,
  "draco organizer" : [ "draco.png" , "http://www.dracosoftware.pl/" ] ,
  "divmod-quotient" : [ "divmod.png" , "http://divmod.org/" ] ,
  "distributed.net" : [ "distributed_net.png" , "http://distributed.net/" ] ,
  "daum web mailer" : [ "daum_webmail.png" ] ,
  "datenbankmailer" : [ "datenbankmailer.png" , "http://www.datenbankmailer.de/" ] ,
  "dvise by tobit" : [ "tobit_david.png" , "http://www.tobit.com/" ] ,
  "dotnetopenmail" : [ "dotnetopenmail.png" , "http://dotnetopenmail.sourceforge.net/" ] ,
  "die strommixer" : [ "die-strommixer.png" , "http://www.die-strommixer.de/" ] ,
  "david by tobit" : [ "tobit_david.png" , "http://www.tobit.com/" ] ,
  "danger service" : [ "danger.png" ] ,
  "dacons mail.it" : [ "dacons_mail_it.png" , "http://www.dacons.net/fmplugins/mailit/" ] ,
  "dundas mailer" : [ "dundas.png" , "http://www.dundas.com/" ] ,
  "domainfactory" : [ "domainfactory.png" , "http://www.df.eu/" ] ,
  "dipost crypto" : [ "dipost.png" , "http://www.factor-ts.ru/dionis/dipost/" ] ,
  "de.netlog.com" : [ "netlog_com.png" , "http://de.netlog.com/" ] ,
  "dw mime mail" : [ "directoriowarez.png" , "http://www.directoriowarez.com/" ] ,
  "dhd24 mailer" : [ "dhd24.png" , "http://www.dhd24.com/" ] ,
  "dattatec.com" : [ "dattatec.png" , "http://dattatec.com/" ] ,
  "douhou@mail" : [ "douhou.png" , "http://www.netdeoshigoto.com/mail/" ] ,
  "directmail/" : [ "toolmaker_de.png" , "http://www.toolmaker.de/" ] ,
  "dialog-mail" : [ "dialog-mail.png" , "http://www.dialog-mail.com/" ] ,
  "devmail.net" : [ "devmailnet.png" , "http://www.devmail.net/" ] ,
  "deezer mail" : [ "deezer.png" , "http://www.deezer.com/" ] ,
  "dsa-launch" : [ "dsa_launch.png" ] ,
  "dotproject" : [ "dotproject.png" , "http://www.dotproject.net/" ] ,
  "docucentre" : [ "xerox.png" , "http://www.fujixerox.co.jp/" ] ,
  "dmdelivery" : [ "dmdelivery.png" , "http://www.webpower.nl/wp.php/dmdelivery/" ] ,
  "discount24" : [ "discount24_de.png" , "http://www.discount24.de/" ] ,
  "delisprint" : [ "dpd.png" , "http://delisonline.dpd.de/" ] ,
  "dw-mailer" : [ "dis.png" , "http://www.dw-formmailer.de/" ] ,
  "dti tools" : [ "dti.png" , "http://dream.jp/option/tools/" ] ,
  "dtemapper" : [ "dtemapper.png" , "http://www.desis.cl/" ] ,
  "dtag ngcs" : [ "telekom.png" , "http://email.t-online.de/" ] ,
  "dreammail" : [ "dreammailer.png" , "http://www.dreammailer.de/" ] ,
  "dotmailer" : [ "dotmailer.png" , "http://www.dotmailer.co.uk/" ] ,
  "desknet's" : [ "desknet.png" , "http://www.desknets.com/" ] ,
  "delosmail" : [ "delosmail.png" , "http://e-delos.com/" ] ,
  "datevmail" : [ "datev.png" , "http://www.datev.de/" ] ,
  "dada mail" : [ "dada_mail.png" , "http://dadamailproject.com/" ] ,
  "dovenews" : [ "dovenews.png" ] ,
  "dotclear" : [ "dotclear.png" , "http://dotclear.org/" ] ,
  "dispatch" : [ "dispatch.png" , "http://www.abacusemedia.com/section.asp?catid=388" ] ,
  "dmailweb" : [ "netwinsite.png" , "http://netwinsite.com/dmailweb/" ] ,
  "dell mfp" : [ "dell.png" , "http://www.dell.com/" ] ,
  "delcampe" : [ "delcampe.png" , "http://delcampe.net/" ] ,
  "deepmail" : [ "deepsoft.png" , "http://www.deepsoft.co.jp/html/deepmail01.html" ] ,
  "dotname" : [ "dotname.png" , "http://www.gnr.name/" ] ,
  "domisys" : [ "domisys.png" , "http://www.domisys.com/" ] ,
  "docmail" : [ "efactory.png" , "http://www.efactory.de/" ] ,
  "dls.net" : [ "dls_net.png" , "http://www.dls.net/" ] ,
  "dle php" : [ "dle.png" , "http://dle-news.ru/" ] ,
  "discuz!" : [ "discuz.png" , "http://www.discuz.com/" ] ,
  "di-php4" : [ "di_com_pl.png" , "http://www.di.com.pl/" ] ,
  "deskpro" : [ "deskpro.png" , "http://www.deskpro.com/" ] ,
  "desknow" : [ "desknow.png" ] ,
  "depo.hu" : [ "depo_hu.png" , "http://www.depo.hu/" ] ,
  "denshin" : [ "denshin.png" , "http://www.denshin8.jp/" ] ,
  "dyndns" : [ "dyndns.png" , "http://www.dyndns.com/" ] ,
  "dwmail" : [ "dwmail.png" , "http://www.dwmail.net/" ] ,
  "dtmail" : [ "dtmail.png" , "http://www.sun.com/software/solaris/cde/" ] ,
  "dspwin" : [ "dspwin.png" , "http://www.dspwin.de/" ] ,
  "drupal" : [ "drupal.png" , "http://drupal.org/" ] ,
  "dr.web" : [ "drweb.png" , "http://www.drweb-online.com/" ] ,
  "dopost" : [ "dolist.png" , "http://software.dolist.net/" ] ,
  "dolist" : [ "dolist.png" , "http://software.dolist.net/" ] ,
  "discus" : [ "labrate.png" , "http://www.labrate.ru/discus/" ] ,
  "direto" : [ "direto.png" , "http://www.direto.org/" ] ,
  "denbun" : [ "denbun.png" , "http://www.denbun.com/" ] ,
  "dcmail" : [ "dcmail.png" , "http://www.mediaten.com/" ] ,
  "datula" : [ "datula.png" , "http://www.onsystems.co.jp/" ] ,
  "danaos" : [ "danaos.png" , "http://www.danaos.com/" ] ,
  "dmail" : [ "netwinsite_dmail.png" , "http://netwinsite.com/dmail_first.htm" ] ,
  "dms " : [ "doppler.png" , "http://www.fromdoppler.com/" ] ,
  "dmu " : [ "waltrs_com.png" , "http://www.waltrs.com/" ] ,
  "dbox" : [ "dbox.png" , "http://www.dbox.handshake.de/" ] ,
}
dispMUA.arDispMUAAllocation["e"] =
{
  "e-mail spooler created by stepstone - easycruit" : [ "stepstone.png" , "http://www.easycruit.com/" ] ,
  "esmtp (eudora internet mail server" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "emilious sender by epsilon eridani" : [ "epsilon-eridani.png" , "http://www.epsilon-eridani.com/" ] ,
  "emerald management suite" : [ "emerald.png" , "http://www.iea-software.com/products/emerald5.cfm" ] ,
  "emailing.newmediaplan.it" : [ "newmediaplan.png" , "http://www.newmediaplan.com/" ] ,
  "ensemble email services" : [ "ensemble.png" ] ,
  "egroups message poster" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "ebesucher mailserver" : [ "ebesucher.png" , "http://www.ebesucher.de/" ] ,
  "ebanka email robot" : [ "ebanka.png" , "http://www.ebanka.com/" ] ,
  "elitedevelopments" : [ "elitedev_com.png" , "http://www.elitedev.com/" ] ,
  "expressionengine" : [ "expressionengine.png" , "http://expressionengine.com/" ] ,
  "experts exchange" : [ "experts-exchange.png" , "http://www.experts-exchange.com/" ] ,
  "erweiterungen.de" : [ "erweiterungen_de.png" , "http://www.erweiterungen.de/" ] ,
  "endymion mailman" : [ "endymion.png" , "http://www.endymion.com/" ] ,
  "ecn communicator" : [ "ecn.png" , "http://www.ecn5.com/ecn.communicator/front/howitworks.aspx" ] ,
  "ecampaignpro.com" : [ "ecampaignpro.png" , "http://www.ecampaignpro.com/" ] ,
  "e-academy.mailer" : [ "e-academy_cz.png" , "http://www.e-academy.cz/" ] ,
  "exclamationsoft" : [ "exclamationsoft.png" , "http://www.exclamationsoft.com/exclamationsoft/netmailbot/" ] ,
  "eharmony mailer" : [ "eharmony.png" , "http://www.eharmony.com/" ] ,
  "ezine director" : [ "ezinedirector.png" , "http://www.ezinedirector.com/" ] ,
  "event software" : [ "event-software.png" , "http://www.event-software.com/" ] ,
  "efs technology" : [ "efs_technology.png" , "http://efstech.dk/" ] ,
  "eblast express" : [ "eblast.png" , "http://www.emerchant-direct.com/Originals_Ocean/EBLAST.htm" ] ,
  "ez components" : [ "ezcomponents.png" , "http://www.ezcomponents.org/" ] ,
  "everymail.net" : [ "everymail_net.png" , "http://www.everymail.net/" ] ,
  "espace-boutik" : [ "espace-boutik.png" , "http://www.espace-boutik.com/" ] ,
  "ef newsletter" : [ "efsoftware.png" , "http://www.efsoftware.com/" ] ,
  "ecartsoft.com" : [ "ecartsoft_com.png" , "http://www.ecartsoft.com/" ] ,
  "e-mandala.net" : [ "e-mandala_net.png" , "http://www.e-mandala.net/" ] ,
  "expressomail" : [ "expressomail.png" , "http://www.expressolivre.org/" ] ,
  "eweka beheer" : [ "eweka.png" , "http://www.eweka.nl/" ] ,
  "evolution 2." : [ "evolution2.png" , "http://www.gnome.org/projects/evolution/" ] ,
  "essentialpim" : [ "essentialpim.png" , "http://www.essentialpim.com/" ] ,
  "eloqua email" : [ "eloqua.png" , "http://www.eloqua.com/" ] ,
  "eloop mailer" : [ "eloop.png" , "http://www.goldlasso.com/" ] ,
  "electromundo" : [ "electromundo.png" , "http://www.electromundo.com/" ] ,
  "ec-messenger" : [ "ecircle.png" , "http://www.ecircle.com/" ] ,
  "ebay webmail" : [ "ebay.png" , "http://www.ebay.com/" ] ,
  "expressmail" : [ "expressmail.png" , "http://www.nec.co.jp/cced/ExpressMail/" ] ,
  "epoc e-mail" : [ "epoc.png" , "http://www.symbian.com/" ] ,
  "emailgarage" : [ "emailgarage.png" ] ,
  "elettershop" : [ "elettershop.png" , "http://www.elettershop.de/" ] ,
  "ebay mailer" : [ "ebay.png" , "http://www.ebay.com/" ] ,
  "easycall.pl" : [ "easycall_pl.png" , "http://www.easycall.pl/" ] ,
  "e-undertown" : [ "e-undertown.png" , "http://www.e-undertown.com/en/software.asp" ] ,
  "e-msg.co.uk" : [ "e-msg_co_uk.png" , "http://www.e-msg.co.uk/" ] ,
  "e-messenger" : [ "e-messenger.png" , "http://www.e-village.nl/" ] ,
  "ezweb mail" : [ "au-kddi.png" , "http://www.au.kddi.com/english/ezweb/" ] ,
  "ez publish" : [ "ez_no.png" , "http://ez.no/ezpublish" ] ,
  "epoc email" : [ "epoc.png" , "http://www.symbian.com/" ] ,
  "emm-xpress" : [ "emm-xpress.png" , "http://www.emm-xpress.de/" ] ,
  "emacs+gnus" : [ "gnus.png" , "http://gnus.org/" ] ,
  "emacs gnus" : [ "gnus.png" , "http://gnus.org/" ] ,
  "eircom net" : [ "eircom_net.png" , "http://www.eircom.net/" ] ,
  "egroups-ew" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "ebizmailer" : [ "ebizmailer.png" ] ,
  "e-seikatsu" : [ "e-seikatsu.png" , "http://www.e-seikatsu.info/" ] ,
  "evolution" : [ "evolution.png" , "http://www.gnome.org/projects/evolution/" ] ,
  "entireweb" : [ "entireweb.png" , "http://www.entireweb.com/" ] ,
  "easy-mail" : [ "easy-mail.png" , "http://www.easy-mail.de/" ] ,
  "earthlink" : [ "earthlink.png" , "http://www.earthlink.net/" ] ,
  "earmaster" : [ "earmaster_com.png" , "http://www.earmaster.com/" ] ,
  "evernote" : [ "evernote.png" , "http://www.evernote.com/" ] ,
  "esupport" : [ "esupport.png" , "http://www.kayako.com/esupport.php" ] ,
  "emailtob" : [ "emailtob.png" , "http://www.emailtob.com/" ] ,
  "emailink" : [ "emailink.png" , "http://www.innomatix.com/" ] ,
  "email.bg" : [ "email_bg.png" , "http://www.email.bg/" ] ,
  "element5" : [ "element5.png" , "http://www.element5.de/" ] ,
  "eibport_" : [ "eibport.png" , "http://www.eib-home.de/" ] ,
  "eem.mail" : [ "express-email-marketing.png" , "http://gowebsite.com/express_email.html" ] ,
  "ebilling" : [ "ebilling.png" ] ,
  "eadirect" : [ "oracle_eadirect.png" , "http://www.oracle.com/" ] ,
  "e-mailer" : [ "e-mailer.png" , "http://www.assesso.com.br/Zope.pcgi/index_html?Secao=34" ] ,
  "explido" : [ "explido.png" , "http://www.explido-software.de/permission_marketing.0.html" ] ,
  "ewe tel" : [ "ewe-tel.png" , "http://www.ewetel.de/" ] ,
  "esender" : [ "esender.png" , "http://www.esender.de/" ] ,
  "equinux" : [ "equinux.png" , "http://www.equinux.de/" ] ,
  "epirent" : [ "epirent.png" , "http://www.epirent.de/" ] ,
  "energit" : [ "energit.png" , "http://www.energit.it/" ] ,
  "emumail" : [ "emumail.png" , "http://www.emumail.com/" ] ,
  "eastfax" : [ "eastfax.png" , "http://www.eastfax.com/" ] ,
  "eyepin" : [ "eyepin.png" , "http://www.eyepin.com/" ] ,
  "eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "esprit" : [ "esprit-club.png" , "http://www.esprit-club.com/" ] ,
  "epylog" : [ "epylog.png" , "http://linux.duke.edu/projects/epylog/" ] ,
  "emplex" : [ "emplex.png" , "http://www.emplex.jp/" ] ,
  "email " : [ "cleancode-email.png" , "http://www.cleancode.org/projects/email" ] ,
  "emill/" : [ "emill.png" , "http://www.emill.net/" ] ,
  "emag -" : [ "emag_ro.png" , "http://www.emag.ro/" ] ,
  "elaine" : [ "elaine.png" , "http://www.elaine.de/" ] ,
  "edmail" : [ "edmail.png" ] ,
  "econdo" : [ "econdo.png" , "http://www.econdo.de/" ] ,
  "e-surf" : [ "e-surf_pl.png" , "http://www.e-surf.pl/" ] ,
  "empal" : [ "empas.png" , "http://mail.empas.com/" ] ,
  "emacs" : [ "emacs.png" , "http://www.gnu.org/software/emacs/" ] ,
  "elion" : [ "elion_hot.png" , "http://www.hot.ee/" ] ,
  "eldos" : [ "eldos.png" , "http://www.eldos.com/sbb/" ] ,
  "edmax" : [ "edmax.png" , "http://www.edcom.jp/soft.html" ] ,
  "exv2" : [ "exv2.png" , "http://www.exv2.de/" ] ,
  "exmh" : [ "exmh.png" , "http://exmh.org/" ] ,
  "exim" : [ "exim.png" , "http://www.exim.org/" ] ,
  "emh/" : [ "emacs.png" , "http://www.gnu.org/software/emacs/" ] ,
  "ebiz" : [ "ebiz-america.png" , "http://www.ebiz-america.com/" ] ,
  "eas " : [ "nokia.png" , "http://europe.nokia.com/A4275026" ] ,
  "ems" : [ "ems.png" , "http://www.emailing-solution.com/" ] ,
  "elm" : [ "elm.png" , "http://www.instinct.org/elm/" ] ,
  "efa" : [ "efa.png" , "http://home.snafu.de/nmichael/software/efa/" ] ,
}
dispMUA.arDispMUAAllocation["f"] =
{
  "firewall notification system" : [ "astaro.png" , "http://www.astaro.de/" ] ,
  "flicks softwares ocxmail" : [ "ocxmail.png" , "http://www.flicks.com/prod.htm#ocxmail" ] ,
  "fbm communication server" : [ "feedbackmanager.png" , "http://www.feedbackmanager.de/" ] ,
  "futureshop mail system" : [ "futurespirits.png" , "http://www.future-s.com/" ] ,
  "fr3ddie's forte agent" : [ "fr3ddie.png" , "http://www.fr3ddie.it/software/software.html" ] ,
  "feed my inbox mailer" : [ "feedmyinbox.png" , "http://www.feedmyinbox.com/" ] ,
  "first-coffee mailer" : [ "first-coffee.png" , "http://www.first-coffee.com/" ] ,
  "funkysouls mailer" : [ "funkysouls_com.png" , "http://funkysouls.com/" ] ,
  "falks perl mailer" : [ "bike24_net.png" , "http://www.bike24.net/" ] ,
  "funmail2u-mailer" : [ "funmail2u.png" , "http://www.funmail2u.de/" ] ,
  "fotosidan mailer" : [ "fotosidan_se.png" , "http://www.fotosidan.se/" ] ,
  "forte free agent" : [ "forte_agent.png" , "http://www.forteinc.com/" ] ,
  "freemail.ukr.net" : [ "ukr_net.png" , "http://www.ukr.net/" ] ,
  "ftgate web mail" : [ "ftgate_com.png" , "http://www.ftgate.com/" ] ,
  "flexist mailer" : [ "flexist_de.png" , "http://www.flexist.de/" ] ,
  "frontdoor apx" : [ "frontdoor-apx.png" , "http://www.defsol.se/iapxw.html" ] ,
  "friend mailer" : [ "friend-mailer.png" , "http://www.ava-soft.com/products/fm/" ] ,
  "freewebs mail" : [ "webs_com.png" , "http://www.webs.com/" ] ,
  "freecity gmbh" : [ "freecity.png" , "http://webmail.freecity.de/" ] ,
  "fuzzy admail" : [ "fuzzy_admail.png" , "http://www.fuzzy.com.br/" ] ,
  "fuman mailer" : [ "future-management.png" , "http://www.continue.de/" ] ,
  "freemails.ch" : [ "freemails_ch.png" , "http://www.freemails.ch/" ] ,
  "fotka mailer" : [ "fotka.png" , "http://www.fotka.pl/" ] ,
  "finalbuilder" : [ "finalbuilder_com.png" , "http://www.finalbuilder.com/" ] ,
  "fronter.com" : [ "fronter.png" , "http://fronter.info/com/" ] ,
  "freemail.gr" : [ "freemail_gr.png" , "http://www.freemail.gr/" ] ,
  "form e-mail" : [ "form-email.png" , "http://www.patshaping.de/projekte/form-email/" ] ,
  "forte-agent" : [ "forte_agent.png" , "http://www.forteinc.com/" ] ,
  "forte agent" : [ "forte_agent.png" , "http://www.forteinc.com/" ] ,
  "fx-service" : [ "fx-service.png" ] ,
  "ftk mailer" : [ "ftk-mailer.png" , "http://www.fotokasten.de/" ] ,
  "fromwap.ru" : [ "fromwap_ru.png" , "http://www.fromwap.ru/" ] ,
  "freeweb.hu" : [ "freeweb_hu.png" , "http://freeweb.hu/" ] ,
  "forteagent" : [ "forte_agent.png" , "http://www.forteinc.com/" ] ,
  "formmailer" : [ "formmailer.png" , "http://www.formmailer.com/" ] ,
  "firstclass" : [ "firstclass.png" , "http://www.firstclass.com/" ] ,
  "felamimail" : [ "felamimail.png" , "http://www.phpgroupware.org/" ] ,
  "futurelab" : [ "futurelab.png" , "http://www.futurelab.com/" ] ,
  "fotovista" : [ "fotovista_com.png" , "http://www.fotovista.com/" ] ,
  "feedblitz" : [ "feedblitz.png" , "http://www.feedblitz.com/" ] ,
  "fusemail" : [ "fusemail.png" , "http://www.fusemail.com/" ] ,
  "fudforum" : [ "fudforum.png" , "http://fudforum.org/forum/" ] ,
  "fotexnet" : [ "fotexnet_hu.png" , "http://www.fotexnet.hu/" ] ,
  "flyspray" : [ "flyspray.png" , "http://flyspray.org/" ] ,
  "flexmail" : [ "flexmail.png" , "http://www.pocketinformant.com/products_info.php?p_id=mail" ] ,
  "fletmail" : [ "fletmail.png" , "http://www.pancho.dk/fletmail/" ] ,
  "fishbowl" : [ "fishbowl.png" , "http://www.fishbowl.com/" ] ,
  "firepass" : [ "f5.png" , "http://www.f5.com/products/firepass/" ] ,
  "favo.org" : [ "favo_org.png" , "http://www.favo.org/" ] ,
  "fastmomi" : [ "fastweb_it.png" , "http://www.fastweb.it/" ] ,
  "fastmail" : [ "fastmail.png" , "http://www.fastmail.fm/" ] ,
  "f5mailer" : [ "f5mailer.png" ] ,
  "famailer" : [ "famailer.png" , "http://www.faprojects.de/" ] ,
  "frnl.de" : [ "frnl_de.png" , "http://www.flatrate-newsletter.de/" ] ,
  "freenet" : [ "freenet.png" , "http://mail.freenet.de/" ] ,
  "foxmail" : [ "foxmail.png" , "http://www.foxmail4u.de/" ] ,
  "forumup" : [ "forumup.png" , "http://www.forumup.com/" ] ,
  "formgen" : [ "formgen.png" , "http://www.formgen.de/" ] ,
  "forcast" : [ "forcast.png" , "http://www.forcast.jp/" ] ,
  "firefox" : [ "firefox.png" , "http://www.mozilla.com/firefox/" ] ,
  "farmail" : [ "farmail.png" , "http://trexinc.sourceforge.net/farmail.php" ] ,
  "freexp" : [ "crosspoint_freexp.png" , "http://www.freexp.de/" ] ,
  "frappr" : [ "frappr.png" , "http://www.frappr.com/" ] ,
  "fluxbb" : [ "fluxbb.png" , "http://fluxbb.org/" ] ,
  "fastit" : [ "fastit.png" , "http://www.fastit.net/" ] ,
  "factux" : [ "factux.png" , "http://www.factux.org/" ] ,
  "flip" : [ "flip.png" , "http://www.flipdev.org/" ] ,
  "fcms" : [ "fcms.png" , "http://www.fidion.de/" ] ,
}
dispMUA.arDispMUAAllocation["g"] =
{
  "gp software (www.dopus.com)" : [ "gp_opus.png" , "http://www.gpsoft.com.au/" ] ,
  "gp software directory opus" : [ "gp_opus.png" , "http://www.gpsoft.com.au/" ] ,
  "goto software sarbacane" : [ "sarbacane.png" , "http://www.goto-software.com/mailing/" ] ,
  "guweb mailing system" : [ "guweb_wonderbook.png" , "http://www.guweb.com/" ] ,
  "grono mailing system" : [ "grono.png" , "http://grono.net/" ] ,
  "gingin mail services" : [ "gingin.png" , "http://gaming.ngi.it/" ] ,
  "goabase email robot" : [ "goabase.png" , "http://www.goatrance.de/goabase/" ] ,
  "gordano messaging" : [ "gordano_ms.png" , "http://www.gordano.com/products/" ] ,
  "gimp useless mail" : [ "gimp.png" , "http://www.gimp.org/" ] ,
  "gaz via vbulletin" : [ "vbulletin.png" , "http://www.vbulletin.com/" ] ,
  "groupware server" : [ "software602.png" , "http://www.software602.com/" ] ,
  "general wireless" : [ "mobispine.png" , "http://www.mobispine.com/" ] ,
  "geminisoft pimmy" : [ "pimmy.png" , "http://www.geminisoft.com/" ] ,
  "gigi's own news" : [ "gon.png" , "http://gon.sourceforge.net/" ] ,
  "groupware aipo" : [ "aipo.png" , "http://aipostyle.com/" ] ,
  "git-send-email" : [ "git.png" , "http://git-scm.com/" ] ,
  "gistron mailer" : [ "gistron_com.png" , "http://www.gistron.com/" ] ,
  "gigajob mailer" : [ "gigajob.png" , "http://www.gigajob.com/" ] ,
  "genesys e-mail" : [ "genesys7.png" , "http://www.genesyslab.com/" ] ,
  "gsd docuframe" : [ "docuframe.png" , "http://www.gsd-software.com/" ] ,
  "group-office" : [ "group_office.png" , "http://www.group-office.com/" ] ,
  "goodemail.cn" : [ "goodemail_cn.png" , "http://www.goodemail.cn/" ] ,
  "gs-shopmail" : [ "gs.png" , "https://www.gs-shopbuilder.de/" ] ,
  "groupwise 8" : [ "groupwise8.png" , "http://www.novell.com/products/groupwise/" ] ,
  "groundspeak" : [ "groundspeak.png" , "http://www.groundspeak.com/" ] ,
  "govdelivery" : [ "govdelivery.png" , "http://www.govdelivery.com/" ] ,
  "globalscape" : [ "globalscape.png" , "http://www.globalscape.com/" ] ,
  "getresponse" : [ "getresponse.png" , "http://www.getresponse.com/" ] ,
  "gsm-inform" : [ "gsm-inform.png" , "http://gsm-inform.ru/" ] ,
  "goowy mail" : [ "goowy_mail.png" , "http://www.goowy.com/" ] ,
  "gincko lab" : [ "gincko.png" , "http://gincko-lab.com/" ] ,
  "genie-soft" : [ "genie-soft.png" , "http://www.genie-soft.com/" ] ,
  "gandi mail" : [ "gandi_mail.png" , "http://www.gandi.net/domain/mail" ] ,
  "groupwise" : [ "groupwise.png" , "http://www.novell.com/products/groupwise/" ] ,
  "goodemail" : [ "goodemail_cn.png" , "http://www.goodemail.cn/" ] ,
  "globomail" : [ "globomail.png" , "http://webmail.globo.com/" ] ,
  "gedifmail" : [ "gedif.png" , "http://www.gedif.de/" ] ,
  "gatormail" : [ "gatormail.png" , "http://sourceforge.net/projects/gatormail/" ] ,
  "gamigophp" : [ "gamigo.png" , "http://www.gamigo.de/" ] ,
  "gyazmail" : [ "gyazmail.png" , "http://www.gyazsquare.com/gyazmail/" ] ,
  "groupion" : [ "groupion.png" , "http://www.groupion.com/" ] ,
  "goo mail" : [ "goo.png" , "http://mail.goo.ne.jp/" ] ,
  "goldmine" : [ "goldmine.png" , "http://www.goldmine.com/" ] ,
  "gnatsweb" : [ "gnatsweb.png" , "http://www.gnu.org/software/gnats/" ] ,
  "gmx mail" : [ "gmx_mail.png" , "http://www.gmx.net/" ] ,
  "gbmailer" : [ "gbmailer.png" , "http://www.gboban.com/" ] ,
  "gatelist" : [ "gatelist.png" , "http://www.gatelist.com/" ] ,
  "gravity" : [ "microplanet.png" , "http://mpgravity.sourceforge.net/" ] ,
  "golded+" : [ "golded-plus.png" , "http://golded-plus.sourceforge.net/" ] ,
  "gnumail" : [ "gnumail.png" , "http://www.collaboration-world.com/gnumail" ] ,
  "gnspool" : [ "gnspool.png" , "http://www.freshports.org/japanese/gn-gnspool/" ] ,
  "gmx.com" : [ "gmx.png" , "http://www.gmx.com/" ] ,
  "genexus" : [ "genexus.png" , "http://www.genexus.com/" ] ,
  "gemini/" : [ "gemini.png" , "http://www.intellegit.com/software/gemini/" ] ,
  "gekkoos" : [ "gekkoos.png" , "http://www.gekkoos.de/" ] ,
  "geeklog" : [ "geeklog.png" , "http://www.geeklog.net/" ] ,
  "galette" : [ "galette.png" , "http://galette.tuxfamily.org/" ] ,
  "gnarwl" : [ "gnarwl.png" , "http://www.home.unix-ag.org/patrick/index.php?gnarwl" ] ,
  "gentoo" : [ "gentoo.png" , "http://www.gentoo.org/" ] ,
  "gemida" : [ "gemida_de.png" , "http://www.gemida.de/" ] ,
  "gcmail" : [ "gcmail.png" , "http://www.gcmail.de/" ] ,
  "gaucho" : [ "gaucho.png" , "http://www.bekkoame.ne.jp/~hiroshi-u/Gaucho/Gaucho.html" ] ,
  "gnus/" : [ "gnus.png" , "http://gnus.org/" ] ,
  "gnus " : [ "gnus.png" , "http://gnus.org/" ] ,
  "gs46" : [ "gs1ru.png" , "http://gs46.gs1ru.org/" ] ,
  "g2/" : [ "google_mail.png" , "http://mail.google.com/" ] ,
}
dispMUA.arDispMUAAllocation["h"] =
{
  "html newsletter (www.cybershop.de)" : [ "cybershop_de.png" , "http://www.cybershop.de/" ] ,
  "http://www.courier-mta.org/cone/" : [ "cone.png" , "http://www.courier-mta.org/cone/" ] ,
  "http://www.umailcampaign.com" : [ "umailcampaign_com.png" , "http://www.umailcampaign.com/" ] ,
  "http://newsgroup.virgilio.it" : [ "virgilio.png" , "http://newsgroup.virgilio.it/" ] ,
  "http://www.phpclasses.org" : [ "phpclasses.png" , "http://www.phpclasses.org/" ] ,
  "http://www.postblitz.net" : [ "postblitz.png" , "http://www.postblitz.net/" ] ,
  "hostpoint generic mailer" : [ "hostpoint.png" , "http://www.hostpoint.ch/" ] ,
  "http://www.spamcop.net/" : [ "spamcop.png" , "http://www.spamcop.net/" ] ,
  "http://www.algomail.com" : [ "algomail.png" , "http://www.algomail.com/" ] ,
  "http://www.letterit.de" : [ "letterit.png" , "http://www.letterit.de/" ] ,
  "http://nntp.angelsk.ru" : [ "nntp_angelsk_ru.png" , "http://nntp.angelsk.ru/" ] ,
  "http://anonymouse.org/" : [ "anonymouse.png" , "http://anonymouse.org/" ] ,
  "hudson support mailer" : [ "dothehudson_net.png" , "http://www.dothehudson.net/" ] ,
  "http://www.iradio.be" : [ "iradio_be.png" , "http://www.iradio.be/" ] ,
  "http://www.9cays.com" : [ "9cays_com.png" , "http://www.9cays.com/" ] ,
  "http://niusy.onet.pl" : [ "onet_pl.png" , "http://niusy.onet.pl/" ] ,
  "hitachi-ms gracemail" : [ "gracemail.png" , "http://www.hitachi-ad.co.jp/gracemail/" ] ,
  "hitachi-ad gracemail" : [ "gracemail.png" , "http://www.hitachi-ad.co.jp/gracemail/" ] ,
  "http://sub.4free.pl" : [ "4free_pl.png" , "http://www.4free.pl/" ] ,
  "hula modweb module" : [ "hula.png" , "http://www.hula-project.org/" ] ,
  "http://www.payu.pl" : [ "payu_pl.png" , "http://www.payu.pl/" ] ,
  "hde customers care" : [ "hde.png" , "http://www.hde.co.jp/cc/" ] ,
  "http://0180.info/" : [ "teltarif.png" , "http://www.tk-anbieter.de/0180/" ] ,
  "helpdesk webmail" : [ "islandnet.png" , "http://helpdesk.islandnet.com/" ] ,
  "heise emailcheck" : [ "heise_security.png" , "http://www.heise.de/security/dienste/emailcheck/" ] ,
  "habrahabr mailer" : [ "habrahabr_ru.png" , "http://habrahabr.ru/" ] ,
  "highwire mailer" : [ "highwire_mailer.png" ] ,
  "html mime mail" : [ "phpguru_org.png" , "http://www.phpguru.org/" ] ,
  "highpoint-smtp" : [ "highpoint.png" , "http://www.highpoint-tech.com/" ] ,
  "heirloom mailx" : [ "heirloom_mailx.png" , "http://heirloom.sourceforge.net/mailx.html" ] ,
  "hinet webmail" : [ "hinet_net.png" , "http://webmail.hinet.net/" ] ,
  "hifi-forum.de" : [ "hifi-forum_de.png" , "http://www.hifi-forum.de/" ] ,
  "htmlmimemail" : [ "phpguru_org.png" , "http://www.phpguru.org/" ] ,
  "holidaycheck" : [ "holidaycheck.png" , "http://www.holidaycheck.de/" ] ,
  "hidemarumail" : [ "hidemaru.png" , "http://hide.maruo.co.jp/software/hidemaru.html" ] ,
  "hhde webmail" : [ "hhde.png" ] ,
  "hp openview" : [ "hp_openview.png" , "http://www.openview.hp.com/" ] ,
  "host europe" : [ "hosteurope_de.png" , "http://www.hosteurope.de/" ] ,
  "heisetreff" : [ "heisetreff.png" , "http://www.heisetreff.de/" ] ,
  "hogwasher" : [ "hogwasher.png" , "http://www.asar.com/hogwasher.html" ] ,
  "hastymail" : [ "hastymail.png" , "http://www.hastymail.org/" ] ,
  "hotel.de" : [ "hotel_de.png" , "http://www.hotel.de/" ] ,
  "helpspot" : [ "helpspot.png" , "http://www.userscape.com/" ] ,
  "home.ro" : [ "home_ro.png" , "http://www.home.ro/" ] ,
  "home.pl" : [ "home_pl.png" , "http://home.pl/" ] ,
  "hamster" : [ "hamster.png" , "http://www.elbiah.de/hamster/" ] ,
  "hot.ee" : [ "elion_hot.png" , "http://portal.hot.ee/" ] ,
  "h+bedv" : [ "avira.png" , "http://www.free-av.de/" ] ,
  "hafas" : [ "hafas.png" , "http://www.hafas.de/hafas/ref.shtml" ] ,
  "horde" : [ "horde.png" , "http://www.horde.org/horde/" ] ,
}
dispMUA.arDispMUAAllocation["i"] =
{
  "interfejs www nowej poczty wirtualnej polski" : [ "wp_pl.png" , "http://www.wp.pl/" ] ,
  "interfejs www poczty wirtualnej polski" : [ "wp_pl.png" , "http://www.wp.pl/" ] ,
  "ibm lotus domino access for ms outlook" : [ "domino_outlook.png" , "http://www-306.ibm.com/software/lotus/support/damo/use.html" ] ,
  "internetpost for active platform" : [ "internetpost.png" , "http://www.hitachi-to.co.jp/prod/prod_2/inter/ip4ap/overview.html" ] ,
  "interfejs www poczty orange" : [ "orange.png" , "http://www.orange.pl/" , "orange.pl" ] ,
  "internet messaging program" : [ "horde.png" , "http://www.horde.org/imp/" ] ,
  "internet camera edimax" : [ "edimax.png" , "http://www.edimax.com/" ] ,
  "iskoninternet webmail" : [ "iskon.png" , "http://webmail.iskon.hr/" ] ,
  "internet mail service" : [ "ms_exchange.png" , "http://www.microsoft.com/" ] ,
  "ipx-manager via php" : [ "ipxserver.png" , "http://www.ipx-server.de/" ] ,
  "ibforums php mailer" : [ "ipb.png" , "http://www.invisionpower.com/" ] ,
  "iolo system shield" : [ "iolo_com.png" , "http://www.iolo.com/system-shield/" ] ,
  "internet fax, mgcs" : [ "panafax.png" , "http://www.panasonic.com/business/office/pro_fax.asp" ] ,
  "infinite responder" : [ "infinite-responder.png" , "http://infinite.ibasics.biz/" ] ,
  "ics smtp component" : [ "ics.png" , "http://www.overbyte.be/" ] ,
  "i-effectmailclient" : [ "i-effect_de.png" , "http://www.i-effect.de/" ] ,
  "internet anywhere" : [ "internet-anywhere.png" , "http://www.tnsoft.de/" ] ,
  "inside-intermedia" : [ "inside-intermedia.png" , "http://www.inside-intermedia.de/" ] ,
  "i-base newsletter" : [ "i-base.png" , "http://www.i-base.net/" ] ,
  "intos electronic" : [ "intos-electronic.png" , "http://www.intos.de/" ] ,
  "inmail by insite" : [ "inmailinsite.png" , "http://inmail.insite.com.br/" ] ,
  "inbox.lv webmail" : [ "inbox.png" , "http://www.inbox.lv/" ] ,
  "inbox.lt webmail" : [ "inbox.png" , "http://www.inbox.lt/" ] ,
  "i.ua mail system" : [ "i_ua.png" , "http://www.i.ua/" ] ,
  "ixmailer (ken!)" : [ "ken.png" , "http://www.avm.de/" ] ,
  "ipb php mailer" : [ "ipb.png" , "http://www.invisionpower.com/" ] ,
  "ieurop webmail" : [ "ieurop_net.png" , "http://www.ieurop.net/" ] ,
  "inwise mailer" : [ "inwise.png" , "http://www.inwise.com/" ] ,
  "intracom mail" : [ "intracom.png" , "http://www.intracomsystem.com/" ] ,
  "internetwache" : [ "polizei.png" , "http://www.polizei.de/" ] ,
  "interact24.de" : [ "interact24_de.png" , "http://interact24.de/" ] ,
  "inteligo-smtp" : [ "inteligo.png" , "http://www.inteligo.pl/" ] ,
  "inmail insite" : [ "inmailinsite.png" , "http://inmail.insite.com.br/" ] ,
  "immsgmassmail" : [ "software_com.png" , "http://www.software.com/" ] ,
  "icompass-mail" : [ "icompass.png" , "http://www.identitycompass.com/" ] ,
  "i-soft/i-tems" : [ "i_tems.png" , "http://www.i-soft-net.de/" ] ,
  "i-soft i-tems" : [ "i_tems.png" , "http://www.i-soft-net.de/" ] ,
  "it&o-versand" : [ "itando.png" , "http://www.itando.net/versand.htm" ] ,
  "intellimerge" : [ "intelli.png" , "http://www.intellisw.com/intellimerge/" ] ,
  "ihug webmail" : [ "ihug.png" , "http://webmail.ihug.co.nz/" ] ,
  "ientrymailer" : [ "ientrymailer.png" ] ,
  "ibismail for" : [ "ibismail.png" , "http://ibis.ne.jp/en/products/ibisMail_iPhone/" ] ,
  "iphone mail" : [ "apple_iphone.png" , "http://www.apple.com/" ] ,
  "incredimail" : [ "incredimail.png" , "http://www.incredimail.com/" ] ,
  "ipilum.com" : [ "ipilum_com.png" , "http://www.ipilum.com/" ] ,
  "intersport" : [ "intersport.png" , "http://www.intersport.com/" ] ,
  "infomaniak" : [ "infomaniak.png" , "http://www.infomaniak.ch/" ] ,
  "immonet.de" : [ "immonet_de.png" , "http://www.immonet.de/" ] ,
  "ika-mailer" : [ "ika_de.png" , "http://www.ika.de/" ] ,
  "igraalmail" : [ "igraal.png" , "http://fr.igraal.com/" ] ,
  "ibr-online" : [ "ibr-online.png" , "http://www.ibr-online.de/" ] ,
  "irfanview" : [ "irfanview.png" , "http://www.irfanview.net/" ] ,
  "ipod mail" : [ "apple_ipodtouch.png" , "http://www.apple.com/" ] ,
  "ipad mail" : [ "apple_ipad.png" , "http://www.apple.com/" ] ,
  "iofficev3" : [ "iofficev3.png" , "http://www.neo.co.jp/ioffice/" ] ,
  "intellect" : [ "intellect.png" , "http://www.chaossoftware.com/intellect.asp" ] ,
  "indexsoft" : [ "indexsoft.png" , "http://www.indexsoft.com/" ] ,
  "incomedia" : [ "incomedia.png" , "http://www.incomedia.it/" ] ,
  "inbox.com" : [ "inbox_com.png" , "http://www.inbox.com/" ] ,
  "in2sports" : [ "in2sports_net.png" , "http://www.in2sports.net/" ] ,
  "ilohamail" : [ "iloha_mail.png" , "http://ilohamail.org/" ] ,
  "ik mailer" : [ "ikmultimedia.png" , "http://www.ikmultimedia.com/" ] ,
  "ibwebmail" : [ "infobox_ru.png" , "http://www.infobox.ru/" ] ,
  "ironmail" : [ "securecomputing.png" , "http://www.ciphertrust.com/products/cclass/" ] ,
  "ippbxsrv" : [ "telekom.png" , "http://www.telekom.de/" ] ,
  "ipayment" : [ "ipayment.png" , "http://www.ipayment.de/" ] ,
  "intouch/" : [ "claros_intouch.png" , "http://www.claros.org/" ] ,
  "inscribe" : [ "inscribe.png" , "http://www.memecode.com/scribe.php" ] ,
  "infoseek" : [ "infoseek.png" , "http://www.infoseek.jp/" ] ,
  "imailist" : [ "imailist.png" , "http://imailistproj.sourceforge.net/" ] ,
  "ibizmail" : [ "yahoo_ibizmail.png" , "http://www.ibizmail.net/" ] ,
  "i.scribe" : [ "i.scribe.png" , "http://www.memecode.com/scribe.php" ] ,
  "iplanet" : [ "iplanet.png" , "http://www.sun.com/" ] ,
  "inxmail" : [ "inxmail.png" , "http://www.inxmail.de/" ] ,
  "intouch" : [ "intouch.png" , "http://intouchhometours.com/" ] ,
  "insuite" : [ "insuite.png" , "http://www.insuite.jp/" ] ,
  "in-mail" : [ "in-mail_ru.png" , "http://in-mail.ru/" ] ,
  "imoxion" : [ "imoxion.png" , "http://www.imoxion.com/" ] ,
  "ifwiset" : [ "iset.png" , "http://www.iset.com.br/" ] ,
  "icewarp" : [ "icewarp.png" , "http://www.icewarp.com/" ] ,
  "icedove" : [ "icedove.png" , "http://packages.debian.org/stable/mail/icedove" ] ,
  "inmail" : [ "inmail_cz.png" , "http://www.inmail.cz/" ] ,
  "imail/" : [ "gnu.png" , "http://www.gnu.org/software/mit-scheme/" ] ,
  "im2001" : [ "im2001.png" , "http://www.info2000.biz/public/Globalization/it-IT/Prodotti/Software/im2001/im2001.aspx" ] ,
  "igmail" : [ "igmail.png" , "http://webmail.ig.com.br/" ] ,
  "i-land" : [ "i-land.png" , "http://www.iland.net/" ] ,
  "ispcp" : [ "ispcp.png" , "http://www.isp-control.net/" ] ,
  "impaq" : [ "impaq.png" , "http://www.impaqgroup.com/" ] ,
  "imho/" : [ "roxen.png" , "http://www.lysator.liu.se/~stewa/IMHO/" ] ,
  "imho " : [ "roxen.png" , "http://www.lysator.liu.se/~stewa/IMHO/" ] ,
  "ikiss" : [ "ikiss.png" , "http://www.ikiss.de/" ] ,
  "is24" : [ "is24.png" , "http://www.immobilienscout24.de/" ] ,
  "imp/" : [ "horde.png" , "http://www.horde.org/imp/" ] ,
}
dispMUA.arDispMUAAllocation["j"] =
{
  "jam - just a mailer" : [ "perl-jam.png" , "http://cpan.uwinnipeg.ca/dist/JaM" ] ,
  "just send a mail" : [ "justsendamail.png" , "http://powzone.com/" ] ,
  "jetbrains omea" : [ "omea.png" , "http://www.jetbrains.com/omea/" ] ,
  "jax newsletter" : [ "jax-newsletter.png" , "http://www.jtr.de/scripting/php/newsletter/" ] ,
  "jfbox webmail" : [ "jfbox_webmail.png" , "http://www.jfbox.com/" ] ,
  "janrufmonitor" : [ "janrufmonitor.png" , "http://www.janrufmonitor.de/" ] ,
  "jobserve-xss" : [ "jobserve.png" , "http://www.jobserve.com/" ] ,
  "jgs-mailing" : [ "jgs-xa.png" , "http://www.jgs-xa.de/" ] ,
  "jobleads.de" : [ "jobleads_de.png" , "http://www.jobleads.de/" ] ,
  "jana-server" : [ "jana.png" , "http://www.janaserver.de/" ] ,
  "joyfulnote" : [ "joyfulnote.png" , "http://www.kent-web.com/bbs/joyful.html" ] ,
  "jonapot.hu" : [ "netfactory_hu.png" , "http://www.netfactory.hu/" ] ,
  "jobletter " : [ "jobanzeiger.png" , "http://www.jobanzeiger.de/" ] ,
  "jed/timber" : [ "timber.png" , "http://www.chiark.greenend.org.uk/~sgtatham/timber.html" ] ,
  "jpvmailer" : [ "jpvmailer.png" , "http://www.ottorey.com.ar/jpvmailer.htm" ] ,
  "jaw::mail" : [ "jawmail.png" , "http://www.jawmail.org/" ] ,
  "java-mail" : [ "java.png" , "http://java.sun.com/products/javamail/" ] ,
  "java mail" : [ "java.png" , "http://java.sun.com/products/javamail/" ] ,
  "jet.mail" : [ "jet-mail.png" , "http://www.jetmail.pl/" ] ,
  "javamail" : [ "java.png" , "http://java.sun.com/products/javamail/" ] ,
  "jsvmail" : [ "shuriken_pro.png" , "http://www.justsystems.com/jp/products/shuriken/" ] ,
  "jawmail" : [ "jawmail.png" , "http://www.jawmail.org/" ] ,
  "jamaila" : [ "jamaila.png" , "http://www.javakaffee.de/jamaila/" ] ,
  "jffnms" : [ "jffnms.png" , "http://www.jffnms.org/" ] ,
  "jbmail" : [ "jbmail.png" , "http://jbmail.pc-tools.net/" ] ,
  "jaring" : [ "jaring.png" , "http://www.jaring.my/" ] ,
  "jamail" : [ "jamail.png" , "http://www.jamail.de/" ] ,
  "jmail" : [ "dimac.png" , "http://www.dimac.net/" ] ,
  "juno" : [ "juno.png" , "http://webmail.juno.com/" ] ,
}
dispMUA.arDispMUAAllocation["k"] =
{
  "kayako supportsuite" : [ "kayako.png" , "http://www.kayako.com/" ] ,
  "kerio mailserver" : [ "kerio.png" , "http://www.kerio.eu/" ] ,
  "kochmeister.com" : [ "kochmeister.png" , "http://www.kochmeister.com/" ] ,
  "knowledgemarket" : [ "realcom.png" , "http://www.realcom.co.jp/software/knowledgemarket_index.html" ] ,
  "kayako esupport" : [ "kayako.png" , "http://www.kayako.com/" ] ,
  "konica minolta" : [ "konica-minolta.png" , "http://www.konicaminolta.com/" ] ,
  "kaufman pravda" : [ "kaufman_pravda.png" , "http://www.kaufmansoft.com/" ] ,
  "karen's mailer" : [ "karensmailer.png" , "http://www.karenware.com/" ] ,
  "kontur-extern" : [ "kontur-extern.png" , "http://www.kontur-extern.ru/" ] ,
  "kienis mailer" : [ "kienis_mailer.png" ] ,
  "kerio outlook" : [ "kerio.png" , "http://www.kerio.eu/" ] ,
  "kerio connect" : [ "kerio.png" , "http://www.kerio.com/connect" ] ,
  "kelare module" : [ "kelare.png" , "http://www.kelare.com/index.ks?page=extensions_notemail" ] ,
  "kana response" : [ "kana.png" , "http://www.kana.com/" ] ,
  "kfj-mailer" : [ "kunstfuerjedermann.png" , "http://www.kunstfuerjedermann.com/" ] ,
  "kajomimail" : [ "kajomi.png" , "http://www.kajomi.de/" ] ,
  "kurinnaxx" : [ "kurinnaxx.png" ] ,
  "kronolith" : [ "horde.png" , "http://www.horde.org/kronolith/" ] ,
  "kopiemail" : [ "kopiemail.png" , "http://www.pi-sync.net/" ] ,
  "koma-mail" : [ "koma_mail.png" , "http://www.koma-code.de/" ] ,
  "kolbaskin" : [ "kolbaskin.png" , "http://habrahabr.ru/" ] ,
  "knallhart" : [ "knallhart.png" , "http://www.knallhart.de/" ] ,
  "kaspersky" : [ "kaspersky.png" , "http://www.kaspersky.com/" ] ,
  "kuborgh*" : [ "kuborgh.png" , "http://www.kuborgh.de/" ] ,
  "kronodoc" : [ "kronodoc.png" , "http://www.kronodoc.com/" ] ,
  "katamail" : [ "katamail.png" , "http://www.katamail.kataweb.it/" ] ,
  "kamailv3" : [ "kamail.png" , "http://www7a.biglobe.ne.jp/~hat/xyzzy/kamail3.html" ] ,
  "k-9 mail" : [ "k-9-mail.png" , "http://code.google.com/p/k9mail/" ] ,
  "koomail" : [ "koomail.png" , "http://www.koomail.com/" ] ,
  "kjmmail" : [ "kajomi.png" , "http://www.kajomi.de/" ] ,
  "komnex" : [ "komnex.png" , "http://www.komnex.de/" ] ,
  "kamail" : [ "kamail.png" , "http://www7a.biglobe.ne.jp/~hat/xyzzy/kamail.html" ] ,
  "k-mail" : [ "k-mail.png" , "http://www.kcsoftwares.com/index.php?kml" ] ,
  "knode" : [ "knode.png" , "http://www.pi-sync.net/" ] ,
  "knews" : [ "knews.png" , "http://www.matematik.su.se/users/kjj/knews.html" ] ,
  "kmail" : [ "kmail.png" , "http://kontact.kde.org/kmail/" ] ,
  "kiala" : [ "kiala.png" , "http://www.kiala.com/" ] ,
  "khxc/" : [ "kryptronic_com.png" , "http://www.kryptronic.com/" ] ,
  "kenm3" : [ "kenm3.png" , "http://www.bekkoame.ne.jp/~adeus/download.htm" ] ,
  "ken!" : [ "ken.png" , "http://www.avm.de/" ] ,
  "kana" : [ "kana.png" , "http://www.kana.com/" ] ,
  "k-ml" : [ "k-mail.png" , "http://www.kcsoftwares.com/index.php?kml" ] ,
}
dispMUA.arDispMUAAllocation["l"] =
{
  "lonely cat games profimail" : [ "lcg-profimail.png" , "http://www.lonelycatgames.com/?app=profimail" ] ,
  "lunaphone.com auto-mailer" : [ "lunaphone.png" , "http://www.lunaphone.com/" ] ,
  "lotus notes release 8" : [ "lotus_notes8.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes release 7" : [ "lotus_notes7.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes release 6" : [ "lotus_notes6.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes release 5" : [ "lotus_notes5.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes build v8" : [ "lotus_notes8.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes build v7" : [ "lotus_notes7.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lursoft mail engine" : [ "lursoft.png" , "http://www.lursoft.lv/" ] ,
  "linuxquestions.org" : [ "linuxquestions_org.png" , "http://www.linuxquestions.org/" ] ,
  "lasso professional" : [ "lasso.png" , "http://www.lassosoft.com/products/LassoPro/" ] ,
  "lycos web mailer" : [ "lycos.png" , "http://mail.lycos.com/" ] ,
  "le courrielleur" : [ "courrielleur.png" , "http://www.courrielleur.com/" ] ,
  "lussumo mailer" : [ "lussumo.png" , "http://lussumo.com/" ] ,
  "loadmail smtp" : [ "loadmail.png" , "http://www.load.com/loadmail/" ] ,
  "lcg profimail" : [ "lcg-profimail.png" , "http://www.lonelycatgames.com/?app=profimail" ] ,
  "l-soft hdmail" : [ "lsoft-hdmail.png" , "http://www.lsoft.se/products/hdmail.asp" ] ,
  "lotus domino" : [ "lotus_domino6.png" , "http://www.ibm.com/software/lotus/" ] ,
  "lotus notes" : [ "lotus_notes.png" , "http://www.ibm.com/software/lotus/" ] ,
  "libwww-perl" : [ "perl.png" , "http://search.cpan.org/dist/libwww-perl/" ] ,
  "laszlo mail" : [ "laszlomail.png" , "http://www.laszlomail.com/" ] ,
  "lycosmail" : [ "lycos.png" , "http://mail.lycos.com/" ] ,
  "luasocket" : [ "lua.png" , "http://luasocket.luaforge.net/" ] ,
  "lq mailer" : [ "linuxquestions_org.png" , "http://www.linuxquestions.org/" ] ,
  "logicmail" : [ "logicmail.png" , "http://www.logicprobe.org/proj/logicmail" ] ,
  "listmerge" : [ "listmerge.png" , "http://www.dtp-aus.com/cgiscript/lmrgscpt.shtml" ] ,
  "lfsmailer" : [ "lfs_net.png" , "http://www.lfs.net/" ] ,
  "lush.com" : [ "lush.png" , "http://www.lush.com/" ] ,
  "lpl-news" : [ "lpl.png" , "http://www.lpl.de/" ] ,
  "log_mail" : [ "pear.png" , "http://pear.php.net/package/Log/docs/latest/Log/Log_mail.html" ] ,
  "logivert" : [ "logivert.png" , "http://www.cataloge.net/" ] ,
  "locamail" : [ "locamail.png" , "http://www.locamail.com.br/" ] ,
  "listserv" : [ "lsoft-listserv.png" , "http://www.lsoft.se/products/listserv.asp" ] ,
  "listmail" : [ "listmail.png" , "http://www.listmailpro.com/" ] ,
  "leafnode" : [ "leafnode.png" , "http://leafnode.sourceforge.net/" ] ,
  "lobocom" : [ "lobocom.png" , "http://webmail.lobocom.es/" ] ,
  "listrak" : [ "listrak.png" , "http://www.listrak.com/" ] ,
  "lexmark" : [ "lexmark.png" , "http://www.lexmark.com/" ] ,
  "lamail" : [ "imoffice.png" , "http://www.asi.co.jp/imoffice/" ] ,
  "lyris" : [ "lyris.png" , "http://www.lyris.com/" ] ,
  "lynx" : [ "lynx.png" , "http://lynx.isc.org/" ] ,
  "lucy" : [ "lucy.png" , "http://www.geniegate.com/other/lucy/" ] ,
  "lms-" : [ "lms.png" , "http://www.lms.org.pl/" ] ,
}
dispMUA.arDispMUAAllocation["m"] =
{
  "mailer by oracle utl_smtp - used by psu foundation" : [ "psufmailer.png" , "http://www.foundation.pdx.edu/" ] ,
  "multi box - interfejs www poczty orange.pl" : [ "orange.png" , "http://www.orange.pl/" , "orange.pl" ] ,
  "messagerie internet de microsoft/mapi" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "marshallsoft smtp/pop3 email engine" : [ "marshallsoft.png" , "http://www.marshallsoft.com/products.htm" ] ,
  "mailer kundenservice - kabel bw" : [ "kabel-bw.png" , "http://www.kabelbw.de/" ] ,
  "microsoft internet-e-post/mapi" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "microsoft windows live mail" : [ "ms_live.png" , "http://www.microsoft.com/" ] ,
  "microsoft office outlook 12" : [ "ms_outlook12.png" , "http://www.microsoft.com/" ] ,
  "microdec plc - profile rpm" : [ "microdec-rpm.png" , "http://www.microdec-profile.com/" ] ,
  "mailform (www.mailform.cz)" : [ "mailform.png" , "http://www.mailform.cz/" ] ,
  "mailer @ standleitungen.de" : [ "standleitungen_de.png" , "http://www.standleitungen.de/" ] ,
  "mail, http://www.czebra.de" : [ "czebra_de.png" , "http://www.czebra.de/" ] ,
  "microsoft-outlook-express" : [ "ms_outlook_express.png" , "http://www.microsoft.com/" ] ,
  "microsoft outlook express" : [ "ms_outlook_express.png" , "http://www.microsoft.com/" ] ,
  "microsoft internet e-mail" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "microsoft exchange server" : [ "ms_exchange.png" , "http://www.microsoft.com/" ] ,
  "microsoft avondale mailer" : [ "microsoft.png" , "http://www.microsoft.com/" ] ,
  "mailer powered by 1do1.pl" : [ "1do1_pl.png" , "http://1do1.pl/" ] ,
  "microsoft office outlook" : [ "ms_outlook.png" , "http://www.microsoft.com/" ] ,
  "microsoft internet mail" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "mailing services by eid" : [ "eid.png" , "http://www.eid.nl/" ] ,
  "mail sent with web2life" : [ "web2life.png" , "http://www.web2life.de/" ] ,
  "microsoft windows mail" : [ "ms_mail.png" , "http://www.microsoft.com/" ] ,
  "microsoft-windows-mail" : [ "ms_mail.png" , "http://www.microsoft.com/" ] ,
  "mws mass mailing news" : [ "massmailingnews.png" , "http://www.massmailingnews.com/" ] ,
  "mr/2 internet cruiser" : [ "mr2.png" , "http://www.mr2ice.com/" ] ,
  "mmm execution manager" : [ "zoomio.png" , "http://www.zoomio.com/" ] ,
  "messagefocus launcher" : [ "adestra_co_uk.png" , "http://www.adestra.co.uk/" ] ,
  "mainsail mail service" : [ "mainsail.png" , "http://www.mainsail.com/" ] ,
  "mailphotos for iphone" : [ "mailphotos.png" , "http://mailphotos.codesingularity.de/" ] ,
  "mailer at germany.ru" : [ "germany_ru.png" , "http://www.germany.ru/" ] ,
  "mozilla-thunderbird" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "mozilla thunderbird" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "minismtp (javamail)" : [ "intrasoft.png" , "http://www.intrasoft-intl.com/" ] ,
  "microsoft-entourage" : [ "ms_entourage.png" , "http://www.microsoft.com/" ] ,
  "microplanet-gravity" : [ "microplanet.png" , "http://mpgravity.sourceforge.net/" ] ,
  "microplanet gravity" : [ "microplanet.png" , "http://mpgravity.sourceforge.net/" ] ,
  "messagingengine.com" : [ "messagingengine.png" , "http://www.messagingengine.com/" ] ,
  "maillist controller" : [ "amlc.png" , "http://www.arclab.com/products/amlc/" ] ,
  "mail (gnu mailutils" : [ "gnu.png" , "http://www.gnu.org/software/mailutils/" ] ,
  "mypersonality.info" : [ "mypersonality.png" , "http://www.mypersonality.info/" ] ,
  "mobildiscounter.de" : [ "mobildiscounter_de.png" , "http://www.mobildiscounter.de/" ] ,
  "microsoft exchange" : [ "ms_exchange.png" , "http://www.microsoft.com/" ] ,
  "mrs internet mail" : [ "cycos.png" , "http://www2.cycos.com/products-solutions/cycos-mrs.html" ] ,
  "microsoft outlook" : [ "ms_outlook.png" , "http://www.microsoft.com/" ] ,
  "mail user's shell" : [ "mush.png" , "http://www.well.com/user/barts/mush.html" ] ,
  "my own hands[tm]" : [ "cweiske.png" , "http://cweiske.de/" ] ,
  "mp form mail cgi" : [ "futomi.png" , "http://www.futomi.com/" ] ,
  "mh dialog server" : [ "mh_dialog.png" , "http://www.millionhandshakes.com/" ] ,
  "mailsite express" : [ "mailsite_express.png" , "http://www.mailsite.com/products/express-webmail-server.asp" ] ,
  "mails.at webmail" : [ "mails_at.png" , "http://www.mails.at/" ] ,
  "mailer by oracle" : [ "oracle.png" , "http://www.oracle.com/" ] ,
  "mailed by oracle" : [ "oracle.png" , "http://www.oracle.com/" ] ,
  "mailcity service" : [ "lycos-mailcity.png" , "http://www.mailcity.com/" ] ,
  "mailchimp mailer" : [ "mailchimp.png" , "http://www.mailchimp.com/" ] ,
  "mail/news client" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "mail.com webmail" : [ "mail_com.png" , "http://www.mail.com/" ] ,
  "mail distributor" : [ "mail-distributor.png" , "http://www.woodensoldier.info/soft/md.htm" ] ,
  "macintosh eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "mynet webmailer" : [ "mynet.png" ] ,
  "mark/space mail" : [ "markspacemail.png" ] ,
  "mapsolute map24" : [ "map24.png" , "http://www.map24.com/" ] ,
  "mailer_avast.ru" : [ "avast.png" , "http://www.avast.ru/" ] ,
  "mail (mailutils" : [ "gnu.png" , "http://www.gnu.org/software/mailutils/" ] ,
  "mt-newswatcher" : [ "mt-newswatcher.png" , "http://www.smfr.org/mtnw/" ] ,
  "mmd eci mailer" : [ "ieci.png" , "http://www.ieci.es/" ] ,
  "mithi-web-mail" : [ "mithi-web-mail.png" , "http://www.mithi.com/" ] ,
  "message editor" : [ "messageeditor.png" ] ,
  "mandic:webmail" : [ "mandic.png" , "http://www.mandic.com.br/" ] ,
  "mailreader.com" : [ "mailreader.png" , "http://www.mailreader.com/" ] ,
  "mynayoki-mail" : [ "nayoki.png" , "http://www.nayoki.de/" ] ,
  "mymail-in.net" : [ "mymail-in_net.png" , "http://mymail-in.net/" ] ,
  "mpop web-mail" : [ "mail_ru.png" , "http://www.mail.ru/" ] ,
  "mobileme mail" : [ "mobileme.png" , "http://www.me.com/" ] ,
  "mobile office" : [ "telenor.png" , "http://www.telenor.com/" ] ,
  "mimemailxphp4" : [ "php.png" , "http://www.feike.biz/php_mime_mail_de.html" ] ,
  "microsoft cdo" : [ "ms_cdo.png" , "http://www.microsoft.com/" ] ,
  "messenger-pro" : [ "messenger-pro.png" , "http://www.arsvcs.demon.co.uk/r-comp/messpro/" ] ,
  "maillist king" : [ "maillist_king.png" , "http://www.xequte.com/maillistking/" ] ,
  "mail explorer" : [ "mailexplorer.png" , "http://member.nifty.ne.jp/miyaishi/" ] ,
  "mach 5 mailer" : [ "m5_mailer.png" , "http://www.mach5.com/products/mailer/" ] ,
  "minerva mail" : [ "minervamail.png" , "http://www.minervamail.com/" ] ,
  "mikini media" : [ "mikinimedia.png" , "http://www.mikinimedia.de/" ] ,
  "messenger v1" : [ "messenger-pro.png" , "http://www.intellegit.com/software/messenger/" ] ,
  "max e-mailer" : [ "max_e-mailer.png" , "http://ismax.com/" ] ,
  "materiel.net" : [ "materiel_net.png" , "http://www.materiel.net/" ] ,
  "match mailer" : [ "match_com.png" , "http://www.match.com/" ] ,
  "mailmagicpro" : [ "mailmagic.png" , "http://en.infinisys.co.jp/product/mail_magic_pro/" ] ,
  "mail::mailer" : [ "perl.png" , "http://search.cpan.org/dist/MailTools/" ] ,
  "mach5 mailer" : [ "m5_mailer.png" , "http://www.mach5.com/products/mailer/" ] ,
  "m5mailer.com" : [ "m5_mailer.png" , "http://www.mach5.com/products/mailer/" ] ,
  "mybb mailer" : [ "mybb_mailer.png" , "http://mybb.ru/" ] ,
  "mondo media" : [ "mondo-media.png" , "http://www.mondo-media.de/" ] ,
  "microdot-ii" : [ "microdot.png" , "http://www.vapor.com/md2/" ] ,
  "mercury mts" : [ "mercury.png" , "http://www.pmail.com/overviews/ovw_mercury.htm" ] ,
  "memotoo.com" : [ "memotoo.png" , "http://www.memotoo.com/" ] ,
  "melin email" : [ "melin_email.png" , "http://www.melin.eu/" ] ,
  "melcast.com" : [ "melcast.png" , "http://www.melcast.com/" ] ,
  "mediag3.com" : [ "mediag3_com.png" , "http://www.mediag3.com/" ] ,
  "measuremail" : [ "measuremail.png" , "http://www.measuremail.nl/" ] ,
  "mandic:zeus" : [ "mandic-zeus.png" , "http://www.mandic.com.br/" ] ,
  "mailsender " : [ "mailsender.png" , "http://www.mailsender.com.br/" ] ,
  "mailingwork" : [ "mailingwork.png" , "http://www.mailingwork.de/" ] ,
  "mailintouch" : [ "mailintouch.png" , "http://www.mailingtouch.com/" ] ,
  "mailenstein" : [ "mailenstein_de.png" , "http://www.mailenstein.de/" ] ,
  "mailcleaner" : [ "mailcleaner.png" , "http://www.mailcleaner.net/" ] ,
  "mail bomber" : [ "mail-bomber.png" , "http://www.softheap.com/bomber.html" ] ,
  "mag-news-g4" : [ "magnews.png" , "http://www.mag-news.it/" ] ,
  "mail-rakete" : [ "mailrakete.png" , "http://www.mailrakete.de/" ] ,
  "myibay.com" : [ "myibay_com.png" , "http://www.myibay.com/" ] ,
  "mwbusiness" : [ "mwbusiness.png" , "http://www.mwbusiness.org/" ] ,
  "mondo shop" : [ "mondo-media.png" , "http://www.mondo-media.de/" ] ,
  "modernbill" : [ "parallels.png" , "http://www.modernbill.com/" ] ,
  "mintersoft" : [ "mintersoft.png" , "http://www.mintersoft.com/" ] ,
  "mime::lite" : [ "perl.png" , "http://search.cpan.org/dist/MIME-Lite/" ] ,
  "mime-tools" : [ "perl.png" , "http://search.cpan.org/dist/MIME-tools/" ] ,
  "mercury/32" : [ "mercury.png" , "http://www.pmail.com/overviews/ovw_mercury.htm" ] ,
  "max mailer" : [ "maxbulk.png" , "http://www.maxprog.com/maxbulk.html" ] ,
  "mailweaver" : [ "mailweaver.png" , "http://www.mailweaver.ch/" ] ,
  "mailprimer" : [ "mailprimer.png" , "http://www.mailprimer.com/" ] ,
  "mailengine" : [ "lyris.png" , "http://www.lyris.com/software/mailengine/" ] ,
  "mailenable" : [ "mailenable.png" , "http://www.mailenable.com/" ] ,
  "maildirect" : [ "maildirect.png" , "http://maildirect.co.in/" ] ,
  "maildivide" : [ "maildivide.png" , "http://homepage3.nifty.com/efs/MailDividef.html" ] ,
  "mailcasino" : [ "grandcasino.png" , "http://www.grand-casino.com/" ] ,
  "mailanyone" : [ "fusemail.png" , "http://www.fusemail.com/" ] ,
  "mail::send" : [ "perl.png" , "http://search.cpan.org/dist/MailTools/" ] ,
  "mail/haiku" : [ "haiku.png" , "http://www.haiku-os.org/" ] ,
  "mail.zp.ua" : [ "mail_zp_ua.png" , "http://mail.zp.ua/" ] ,
  "magnews-g4" : [ "magnews.png" , "http://www.mag-news.it/" ] ,
  "maggi mail" : [ "maggi.png" , "http://www.maggi.de/" ] ,
  "mac eudora" : [ "eudora_mac.png" , "http://www.eudora.com/" ] ,
  "m-acquaint" : [ "m-acquaint.png" , "http://www.macquaint.com/" ] ,
  "mymailout" : [ "mymailout.png" , "http://www.mymailout.com/" ] ,
  "mymail.ch" : [ "mymail_ch.png" , "http://www.mymail.ch/" ] ,
  "movixmail" : [ "movixmail.png" , "http://www.movix.com.br/" ] ,
  "mojo mail" : [ "mojo_mail.png" , "http://mojo.skazat.com/" ] ,
  "mm3-email" : [ "mm3tools.png" , "http://www.mm3tools.de/" ] ,
  "mirapoint" : [ "mirapoint.png" , "http://www.mirapoint.com/" ] ,
  "metamail/" : [ "metamail.png" , "http://www.meta.ua/" ] ,
  "messenger" : [ "messenger.png" , "http://mailnews.netscape.com/releases" ] ,
  "merlin.pl" : [ "merlin_pl.png" , "http://merlin.pl/" ] ,
  "mediaworx" : [ "mediaworx.png" , "http://www.mediaworx.com/" ] ,
  "mediawiki" : [ "mediawiki.png" , "http://www.mediawiki.org/" ] ,
  "mediatrix" : [ "mediatrix.png" , "http://www.ityx-solutions.de/" ] ,
  "medi@trix" : [ "mediatrix.png" , "http://www.ityx-solutions.de/" ] ,
  "matchbox/" : [ "plumdigitalmedia.png" , "http://matchbox.plumdigitalmedia.com/" ] ,
  "mallux.de" : [ "mallux_de.png" , "http://www.mallux.de/" ] ,
  "majordomo" : [ "greatcircle.png" , "http://www.greatcircle.com/majordomo/" ] ,
  "mailmagic" : [ "mailmagic.png" , "http://en.infinisys.co.jp/product/mail_magic/" ] ,
  "mailboxer" : [ "mailboxer.png" , "http://iungo.org/products/MailBoxer" ] ,
  "magicmail" : [ "magicmail.png" , "http://magicmail.linuxmagic.com/" ] ,
  "mailsmith" : [ "mailsmith.png" , "http://www.barebones.com/products/mailsmith/" ] ,
  "mail/news" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "magnewsg4" : [ "magnews.png" , "http://www.mag-news.it/" ] ,
  "mymailer" : [ "mymailer.png" , "http://www.l-to.de/" ] ,
  "mulberry" : [ "mulberry.png" , "http://www.mulberrymail.com/" ] ,
  "mtmailer" : [ "internet-dynamo.png" , "http://www.mujica.com/" ] ,
  "moto-ezx" : [ "moto-ezx.png" , "http://www.motorola.com/" ] ,
  "misk.com" : [ "misk_com.png" , "http://www.misk.com/" ] ,
  "microdot" : [ "microdot.png" , "http://www.vapor.com/md1/" ] ,
  "meetlady" : [ "meetlady.png" , "http://meetlady.ru/" ] ,
  "medianet" : [ "clubinternet.png" , "http://www.club-internet.fr/" ] ,
  "mailroom" : [ "mailroom.png" , "http://www.sierrasol.com/" ] ,
  "mailgust" : [ "mailgust.png" , "http://www.mailgust.org/" ] ,
  "mailgate" : [ "mailgate.png" , "http://www.newscenterx.de/products/MailGate/" ] ,
  "mailer::" : [ "gossamer.png" , "http://www.gossamer-threads.com/scripts/webmail/" ] ,
  "mailcast" : [ "mailcast.png" , "http://www.atwww.com/page.asp?PartId=9" ] ,
  "mailboot" : [ "mailboot.png" , "http://mboot.pl/" ] ,
  "mail2000" : [ "mail2000.png" , "http://groups.yahoo.com/group/tmail2000/" ] ,
  "mahogany" : [ "mahogany.png" , "http://mahogany.sourceforge.net/" ] ,
  "mygate/" : [ "mygate.png" , "http://barin.com.ua/" ] ,
  "musashi" : [ "musashi.png" , "http://www.sonosoft.com/" ] ,
  "mp3real" : [ "mp3real.png" , "http://www.mp3real.ru/" ] ,
  "mopshop" : [ "mopshop.png" , "http://www.mopshop.de/" ] ,
  "mesnews" : [ "mesnews.png" , "http://www.mesnews.net/" ] ,
  "marco -" : [ "marco.png" , "http://www.tensid.ch/" ] ,
  "manitou" : [ "manitou.png" , "http://www.manitou-mail.org/" ] ,
  "mamabuy" : [ "mamabuy.png" , "http://www.mamabuy.de/" ] ,
  "mailout" : [ "mailout.png" , "http://www.mailout.com/" ] ,
  "mailman" : [ "mailman.png" , "http://www.list.org/" ] ,
  "mailit!" : [ "mailit.png" , "http://www.riverweb.com/modules/mailit/" ] ,
  "mailist" : [ "sharp-mailist.png" , "http://www.sharp.co.jp/" ] ,
  "mailbee" : [ "mailbee.png" ] ,
  "mail602" : [ "software602.png" , "http://www.software602.com/" ] ,
  "mail.bg" : [ "mail_bg.png" , "http://www.mail.bg/" ] ,
  "macsoup" : [ "macsoup.png" , "http://home.snafu.de/stk/macsoup/" ] ,
  "myblog" : [ "myblog.png" , "http://www.myblog.de/" ] ,
  "momail" : [ "momail.png" , "http://www.momail.de/" ] ,
  "modest" : [ "modest.png" , "http://modest.garage.maemo.org/" ] ,
  "marlin" : [ "marlin.png" , "http://www.marlin.de/" ] ,
  "mailup" : [ "mailup_it.png" , "http://www.mailup.it/" ] ,
  "macbay" : [ "macbay.png" , "http://www.macbay.de/" ] ,
  "mupad" : [ "mupad.png" , "http://www.mupad.com/" ] ,
  "mscrm" : [ "ms_crm.png" , "http://www.microsoft.com/crm/" ] ,
  "monit" : [ "monit.png" , "http://mmonit.com/monit/" ] ,
  "mmail" : [ "mmail.png" , "http://homepage1.nifty.com/kem_t/" ] ,
  "mixxt" : [ "mixxt.png" , "http://www.mixxt.net/" ] ,
  "mieze" : [ "mieze.png" , "http://www.dietmar-plassmann.de/mieze.html" ] ,
  "mambo" : [ "mambo.png" , "http://mambo-developer.org/" ] ,
  "magix" : [ "magix.png" , "http://www.magix.com/" ] ,
  "mybb" : [ "mybb.png" , "http://www.mybboard.net/" ] ,
  "mutt" : [ "mutt.png" , "http://www.mutt.org/" ] ,
  "miva" : [ "miva.png" , "http://www.miva.com/" ] ,
  "myeo" : [ "myeo.png" , "http://www.myeo.net/" ] ,
  "mxm-" : [ "mxm.png" , "http://www.m--x--m.net/" ] ,
  "mew " : [ "mew.png" , "http://www.mew.org/" ] ,
  "mbm " : [ "maxbulk-mailer.png" , "http://www.maxprog.com/site/software/internet-marketing/mass-bulk-emailer_sheet_de.php" ] ,
  "msn" : [ "msn.png" , "http://www.msn.com/" ] ,
  "mh " : [ "gnu.png" , "http://www.gnu.org/software/mailutils/" ] ,
}
dispMUA.arDispMUAAllocation["n"] =
{
  "nec personal communicator mobile gear" : [ "nec-mobilegear.png" , "http://www.nec.co.jp/press/en/9803/1101.html" ] ,
  "notonebit.com simple mailer" : [ "notonebit_com.png" , "http://www.notonebit.com/" ] ,
  "newsletter.virtual-image.de" : [ "virtual-image_de.png" , "http://www.virtual-image.de/" ] ,
  "network solutions webmail" : [ "networksolutions.png" , "http://www.networksolutions.com/" ] ,
  "nero serial number mailer" : [ "nero.png" , "http://www.nero.com/" ] ,
  "netikus.net eventsentry" : [ "eventsentry.png" , "http://www.eventsentry.com/" ] ,
  "netmail modweb module" : [ "novell.png" , "http://www.novell.com/coolsolutions/netmail/" ] ,
  "nexus desktop client" : [ "aol.png" , "http://www.aol.com/" ] ,
  "nvsendmail utility" : [ "bakbone.png" , "http://www.bakbone.com/" ] ,
  "nuralstorm webmail" : [ "nuralstorm.png" , "http://www.nuralstorm.net/" ] ,
  "network automation" : [ "networkautomation_com.png" , "http://www.networkautomation.com/" ] ,
  "netangels helpdesk" : [ "netangels_ru.png" , "http://www.netangels.ru/" ] ,
  "nbb-rekenprogramma" : [ "nbb-rekenprogramma.png" ] ,
  "navigon newsmailer" : [ "navigon.png" , "http://www.navigon.com/" ] ,
  "newsletter genius" : [ "newsletter_genius.png" ] ,
  "nateon web mailer" : [ "nateon.png" , "http://nateonweb.nate.com/en/" ] ,
  "novell groupwise" : [ "groupwise.png" , "http://www.novell.com/products/groupwise/" ] ,
  "ni-mailer-skript" : [ "ni-mailer.png" , "http://www.n-image.com/" ] ,
  "newsletterscript" : [ "coder-world.png" , "http://www.coder-world.de/cw/seite__pagewebdesignnl.html" ] ,
  "nettoolworks.net" : [ "nettoolworks.png" , "http://www.nettoolworks.com/" ] ,
  "netfirms mailing" : [ "netfirms_com.png" , "http://www.netfirms.com/" ] ,
  "neotonic trakken" : [ "neotonic.png" , "http://google.about.com/od/n/g/neotonic.htm" ] ,
  "neocast@messager" : [ "ispirit.png" , "http://www.neocast.co.kr/" ] ,
  "nomad mime mail" : [ "nomad_mimemail.png" , "http://www.developarts.com/nomad_mimemail" ] ,
  "nms - 1:1 mail!" : [ "nms.png" ] ,
  "nic.at registry" : [ "nic_at.png" , "http://www.nic.at/" ] ,
  "nexus mime mail" : [ "nexus_mimemail.png" , "http://www.developarts.com/nomad_mimemail" ] ,
  "nero newsletter" : [ "nero.png" , "http://www.nero.com/" ] ,
  "namesco webmail" : [ "namesco-webmail.png" , "http://www.names.co.uk/webmail.html" ] ,
  "novomind imail" : [ "novomind_imail.png" , "http://www.novomind.com/mail-management/" ] ,
  "newsletter pro" : [ "newsletter_pro.png" , "http://www.aborange.de/products/newsletter.php" ] ,
  "nwp mailrelay" : [ "nwp.png" , "http://www.netzwerkplan.de/" ] ,
  "newswatcher-x" : [ "newswatcher-x.png" , "http://www.electricfish.com/products/NewsWatcherX/" ] ,
  "newsoffice.de" : [ "newsoffice_de.png" , "http://www.newsoffice.de/" ] ,
  "nettalk email" : [ "nettalk.png" ] ,
  "neo.pl mailer" : [ "neo_pl.png" , "http://neo.pl/" ] ,
  "nxnewsletter" : [ "nexum.png" , "http://www.nexum.de/" ] ,
  "null webmail" : [ "nulllogic.png" , "http://nullwebmail.sourceforge.net/webmail/" ] ,
  "nms formmail" : [ "nms-formmail.png" ] ,
  "notebook.de" : [ "notebook_de.png" , "http://www.notebook.de/" ] ,
  "nextmail.ru" : [ "nextmail.png" , "http://nextmail.ru/" ] ,
  "newzcrawler" : [ "newzcrawler.png" ] ,
  "newsman pro" : [ "newsman_pro.png" , "http://www.newsmanpro.com/" ] ,
  "newsleecher" : [ "newsleecher.png" , "http://www.newsleecher.com" ] ,
  "newscoaster" : [ "newscoaster.png" , "http://newscoaster.tripod.com/" ] ,
  "news xpress" : [ "news_xpress.png" ] ,
  "naukri-mail" : [ "naukri_com.png" , "http://www.naukri.com/" ] ,
  "nustep cms" : [ "nustep_net.png" , "http://www.nustep.net/cms" ] ,
  "nomad news" : [ "nomadnews.png" , "http://www.nomadnews.com" ] ,
  "nichost.ru" : [ "nic_ru.png" , "http://hosting.nic.ru/" ] ,
  "newsportal" : [ "newsportal.png" , "http://amrhein.eu/newsportal" ] ,
  "news rover" : [ "newsrover.png" , "http://www.newsrover.com/" ] ,
  "netcologne" : [ "netcologne.png" , "http://www.netcologne.de/" ] ,
  "nana-gnus/" : [ "gnus.png" , "http://gnus.org/" ] ,
  "ngtmailer" : [ "ngtmailer.png" , "http://www.ngt.no/" ] ,
  "newshound" : [ "newshound.png" , "http://shorelinesoftware.com/" ] ,
  "netangels" : [ "netangels_net.png" , "http://www.netangels.net/" ] ,
  "nyt-post" : [ "new_york_times.png" ] ,
  "nwebmail" : [ "nwebmail.png" , "http://nwebmail.sourceforge.net/" ] ,
  "noworyta" : [ "noworyta.png" ] ,
  "noson.it" : [ "noscon_it.png" , "http://listserver.noscon.it/" ] ,
  "newstap/" : [ "apple_appstore.png" , "http://sourceforge.net/projects/newstap" ] ,
  "netscape" : [ "netscape.png" , "http://mailnews.netscape.com/releases" ] ,
  "netfront" : [ "netfront.png" , "http://www.access-company.com/products/mobile_solutions/netfrontmobile/" ] ,
  "nourish" : [ "nourish.png" , "http://nouri.sh/" ] ,
  "newzbin" : [ "newzbin.png" , "http://www.newzbin.com/" ] ,
  "newspro" : [ "newspro.png" ] ,
  "newsbin" : [ "newsbin.png" , "http://www.newsbin.com/" ] ,
  "netpion" : [ "netpion.png" , "http://www.netpathy.com/products11.html" ] ,
  "netflix" : [ "netflix.png" , "http://www.netflix.com/" ] ,
  "netcat/" : [ "netcat.png" , "http://netcat.sourceforge.net/" ] ,
  "netcat " : [ "netcat.png" , "http://netcat.sourceforge.net/" ] ,
  "neomail" : [ "neomail.png" , "http://open-i.co.jp/html/product_01.html" ] ,
  "need.bg" : [ "need_bg.png" , "http://www.need.bg/" ] ,
  "ntmail" : [ "gordano_ms.png" , "http://www.gordano.com/kb.htm?q=1582" ] ,
  "nlsend" : [ "defacto.software.png" , "http://defacto-software.de/" ] ,
  "neu.de" : [ "neu_de.png" , "http://www.neu.de/" ] ,
  "neobox" : [ "neobox.png" , "http://www.neobox.net/" ] ,
  "nmail" : [ "nmail.png" , "http://passkorea.net/" ] ,
  "naja/" : [ "naja.png" , "http://www.keyphrene.com/products/naja/" ] ,
  "npop" : [ "npop.png" , "http://www.nakka.com/soft/npop/" ] ,
  "nocc" : [ "nocc.png" ] ,
  "nmh-" : [ "nmh.png" , "http://www.nongnu.org/nmh/" ] ,
  "nmh " : [ "nmh.png" , "http://www.nongnu.org/nmh/" ] ,
  "nemo" : [ "nemo.png" , "http://groups.google.com/group/nemox" ] ,
  "nail" : [ "nail.png" , "http://nail.sourceforge.net/" ] ,
  "nu/" : [ "nusphere.png" , "http://www.nusphere.com/" ] ,
  "nn/" : [ "nn.png" , "http://www.nndev.org/" ] ,
  "nn " : [ "nn.png" , "http://www.nndev.org/" ] ,
}
dispMUA.arDispMUAAllocation["o"] =
{
  "o3sis o2 communication center mail" : [ "o2.png" , "http://www.o2.com/" ] ,
  "outlook connector for mdaemon" : [ "outlook_connector_mdaemon.png" , "http://www.altn.com/Products/CollaborationSolutions/OutlookConnector/" ] ,
  "ocxqmail from flicks software" : [ "flicks_software.png" , "http://www.flicks.com/ocxQmail/" ] ,
  "octeth email manager pro" : [ "oempro.png" , "http://www.octeth.com/" ] ,
  "openwave webengine" : [ "openwave.png" , "http://www.openwave.com/" ] ,
  "online.net webmail" : [ "roundcube.png" , "http://www.roundcube.net/" ] ,
  "otrs mail service" : [ "otrs.png" , "http://otrs.org/" ] ,
  "opengroupware.org" : [ "opengroupware.png" , "http://opengroupware.org/" ] ,
  "office.freenet.de" : [ "freenet.png" , "http://office.freenet.de/" ] ,
  "outlook express" : [ "ms_outlook_express.png" , "http://www.microsoft.com/" ] ,
  "orbiz digitrade" : [ "orbiz.png" , "http://www.orbiz.com/Online-Shop-Software--7d.html" ] ,
  "one.com webmail" : [ "one_com.png" , "http://www.one.com/" ] ,
  "ostrosoft smtp" : [ "ostrosoft_smtp.png" , "http://www.ostrosoft.com/" ] ,
  "osc/erp-mailer" : [ "oscommerce.png" , "http://www.oscommerce.org/" ] ,
  "openoffice.org" : [ "openoffice.png" , "http://www.openoffice.org/" ] ,
  "ogilvy express" : [ "ogilvy-express.png" , "http://www.ogilvy.com/" ] ,
  "openetworks.pl" : [ "openetworks_pl.png" , "http://www.openetworks.pl/" ] ,
  "online mailer" : [ "onlinemailer.png" , "http://www.onlinepublisher.nl/onlinemailer.asp" ] ,
  "o2.pl webmail" : [ "o2_pl.png" , "http://www.o2.pl/" ] ,
  "oz.by mailer" : [ "oz_by.png" , "http://oz.by/" ] ,
  "opensmtp.net" : [ "opensmtp-net.png" , "http://sourceforge.net/projects/opensmtp-net/" ] ,
  "open-xchange" : [ "open_xchange.png" , "http://www.open-xchange.com/" ] ,
  "open webmail" : [ "openwebmail.png" , "http://openwebmail.org/" ] ,
  "oikal-web.de" : [ "oikal.png" , "http://oikal-web.de/" ] ,
  "oe powertool" : [ "oe_powertool.png" , "http://www.grzegorz.net/oe/oept.php" ] ,
  "orbitixmail" : [ "orbitix.png" , "http://www.orbitix.com/" ] ,
  "openwebmail" : [ "openwebmail.png" , "http://openwebmail.org/" ] ,
  "openphpnuke" : [ "openphpnuke.png" , "http://www.openphpnuke.com/" ] ,
  "open-realty" : [ "open-realty.png" , "http://www.open-realty.org/" ] ,
  "onix oxmail" : [ "onix.png" , "http://www.onix.it/" ] ,
  "onet.poczta" : [ "onet_pl.png" , "http://poczta.onet.pl/" ] ,
  "omnitracker" : [ "omnitracker.png" , "http://www.omninet.de/" ] ,
  "osso email" : [ "osso-email.png" , "https://stage.maemo.org/svn/maemo/projects/email/osso-email/trunk/" ] ,
  "oscommerce" : [ "oscommerce.png" , "http://www.oscommerce.org/" ] ,
  "osc mailer" : [ "oscommerce.png" , "http://www.oscommerce.org/" ] ,
  "one mailer" : [ "onemailer_com.png" , "http://www.onemailer.com/" ] ,
  "omnimailer" : [ "omnigate.png" , "http://www.omnigate.it/auto.aspx?cid=1256" ] ,
  "officetalk" : [ "officetalk.png" , "http://www.softalkltd.com/products/officetalk" ] ,
  "operamail" : [ "operamail.png" , "http://www.operamail.com/" ] ,
  "online.ua" : [ "online_ua.png" , "http://www.online.ua/" ] ,
  "omnixmail" : [ "omnixmail.png" , "http://www.eraomnix.pl/pl/contact/email" ] ,
  "osticket" : [ "osticket.png" , "http://osticket.com/" ] ,
  "oomailer" : [ "ooshop_com.png" , "http://www.ooshop.com/" ] ,
  "onlywire" : [ "onlywire.png" , "http://onlywire.com/" ] ,
  "ocamlnet" : [ "caml.png" , "http://ocamlnet.sourceforge.net/" ] ,
  "openemm" : [ "openemm.png" , "http://www.openemm.org/" ] ,
  "onliner" : [ "onliner_ru.png" , "http://www.onliner.ru/" ] ,
  "oracle" : [ "oracle.png" , "http://www.oracle.com/" ] ,
  "openxp" : [ "crosspoint_openxp.png" , "http://www.openxp.de/" ] ,
  "oempro" : [ "oempro.png" , "http://www.octeth.com/" ] ,
  "ordis" : [ "ordis.png" , "http://www.ordis.cz/" ] ,
  "opera" : [ "operamail.png" , "http://www.opera.com/products/desktop/m2/" ] ,
  "omail" : [ "omail.png" , "http://omail.omnis.ch/" ] ,
  "ontap" : [ "netapp.png" , "http://www.netapp.com/" ] ,
  "ozum" : [ "ozum.png" , "http://www.ozinsight.com/client/" ] ,
  "ovh" : [ "ovh.png" , "http://www.ovh.com/" ] ,
  "oe3" : [ "oe3.png" , "http://oe3.orf.at/" ] ,
}
dispMUA.arDispMUAAllocation["p"] =
{
  "posta elettronica internet di microsoft/mapi" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "plaasoft technologies php-mailer" : [ "plaasoft.png" , "http://www.plaasoft.com/" ] ,
  "produced by pioneer investments" : [ "pioneerinvestments.png" , "http://www.pioneerinvestments.de/" ] ,
  "provcomm java framework mailer" : [ "java.png" , "http://www.provcomm.com/" ] ,
  "produced by microsoft exchange" : [ "ms_exchange.png" , "http://www.microsoft.com/" ] ,
  "produced by microsoft mimeole" : [ "ms_live.png" , "http://www.microsoft.com/" ] ,
  "paradise fast delivery agent" : [ "pfda.png" , "http://fda.omnisci.jp/FDA.html" ] ,
  "produced by confixx webmail" : [ "confixx.png" , "http://www.parallels.com/de/products/confixx/" ] ,
  "postmaster 1.1.1 for beos" : [ "beos_postmaster.png" , "http://kennyc.com/postmaster" ] ,
  "protagona email services" : [ "protagona.png" , "http://www.protagona.com/" ] ,
  "prospero mailing system" : [ "prospero.png" , "http://www.prospero.com/" ] ,
  "produced by swiftmailer" : [ "swiftmailer.png" , "http://www.swiftmailer.org/" ] ,
  "produced by msn mimeole" : [ "ms_patch.png" , "http://www.microsoft.com/" ] ,
  "poczta.petroinform.net" : [ "petroinform_net.png" , "http://poczta.petroinform.net/" ] ,
  "pw-internet solutions" : [ "pw-internet.png" , "http://www.pw-internet.de/" ] ,
  "produced by nespresso" : [ "nespresso.png" , "http://www.nespresso.com/" ] ,
  "postmaster zonereg.ru" : [ "zonereg_ru.png" , "http://zonereg.ru/" ] ,
  "pop3/smtp emailplugin" : [ "pop3smtp-emailplugin.png" , "http://www.andremartin.de/POP3Plugin/" ] ,
  "poczta systemu ramzes" : [ "ramzes.png" , "http://www.ramzes.lubin.pl/" ] ,
  "phpmail (c) funmail2u" : [ "funmail2u.png" , "http://www.funmail2u.de/" ] ,
  "produced by mailworx" : [ "mailworx.png" , "http://www.mailworx.info/" ] ,
  "produced by myvideo" : [ "myvideo.png" , "http://www.myvideo.de/" ] ,
  "powered by flowfact" : [ "flowfact.png" , "http://www.flowfact.de/" ] ,
  "poplist mailinglist" : [ "poplist.png" ] ,
  "produced by phpbb2" : [ "phpbb2.png" , "http://www.phpbb2.de/" ] ,
  "postmaster general" : [ "usps.png" , "http://www.postmastergeneral.com/" ] ,
  "pg-mailinglist pro" : [ "raynette.png" , "http://www.raynette.fr/script-pro/newsletter-mailing-list/" ] ,
  "penn state webmail" : [ "penn_state.png" , "http://webmail.psu.edu/" ] ,
  "push.infojobs.net" : [ "infojobs_net.png" , "http://www.infojobs.net/" ] ,
  "produced by eworx" : [ "eworx.png" , "http://www.eworx.at/" ] ,
  "pixum-html-mailer" : [ "pixum.png" , "http://www.pixum.com/" ] ,
  "projectplace.com" : [ "projectplace_com.png" , "http://www.projectplace.com/" ] ,
  "priscillapostman" : [ "priscilla.png" , "http://priscilla.plasticjumper.it/" ] ,
  "present perfect!" : [ "speech-design.png" , "http://www.speech-design.com/" ] ,
  "pixum newsletter" : [ "pixum.png" , "http://www.pixum.com/" ] ,
  "pinuts universal" : [ "pinuts.png" , "http://www.pinuts.de/Loesungen/universal_messenger/um_newsletter-edition/" ] ,
  "papageno gateway" : [ "papageno.png" , "http://www.com-em-tex.de/" ] ,
  "python syncmail" : [ "python-syncmail.png" , "http://sourceforge.net/projects/cvs-syncmail/" ] ,
  "popmail-conduit" : [ "kde.png" , "http://pim.kde.org/" ] ,
  "pld linux kmail" : [ "kmail.png" , "http://kontact.kde.org/kmail/" ] ,
  "ptmail webmail" : [ "ptmail.png" ] ,
  "pt startmailer" : [ "powertech.png" , "http://www.powertech.no/" ] ,
  "pr_cron_mailer" : [ "juniper.png" , "http://www.juniper.net/" ] ,
  "postinoclassic" : [ "postino.png" , "http://www.syscli.co.jp/" ] ,
  "poczta gery.pl" : [ "gery_pl.png" , "http://www.gery.pl/" ] ,
  "pocket wz mail" : [ "pocket-wz.png" , "http://www.villagecenter.co.jp/soft/pwz30/" ] ,
  "piratesassault" : [ "piratesassault.png" , "http://www.piratesassault.de/" ] ,
  "pineapple news" : [ "pineapplenews.png" , "http://www.platinumball.net/pineapple/news/macosx/" ] ,
  "phaser 6180mfp" : [ "xerox.png" , "http://www.xeroxdirect.com/" ] ,
  "polibuda.info" : [ "polibuda.png" , "http://www.polibuda.info/" ] ,
  "plentymarkets" : [ "plentymarkets.png" , "http://www.plentysystems.de/" ] ,
  "punbb mailer" : [ "punbb.png" , "http://punbb.informer.com/" ] ,
  "phpmail tool" : [ "php.png" , "" ] ,
  "phoenix mail" : [ "phoenix_mail.png" , "http://phxmail.sourceforge.net/" ] ,
  "powermail -" : [ "powermail.png" , "http://www.indosolution.com/" ] ,
  "poem mailer" : [ "poem-mailer.png" , "http://poem.crmstyle.com/" ] ,
  "php/popmail" : [ "tinned-mail.png" , "http://www.tinned-mail.net/" ] ,
  "prosite.de" : [ "prosite_de.png" , "http://www.prosite.de/" ] ,
  "pop peeper" : [ "poppeeper.png" , "http://www.poppeeper.com/" ] ,
  "pol-system" : [ "pol_system.png" ] ,
  "pandoemail" : [ "pando.png" , "http://www.pando.com/" ] ,
  "protoplex" : [ "protoplex.png" , "http://www.protoplex.ru/" ] ,
  "praktomat" : [ "praktomat.png" , "http://www.fim.uni-passau.de/de/fim/fakultaet/lehrstuehle/softwaresysteme/forschung/praktomat.html" ] ,
  "postino v" : [ "postino.png" , "http://www.syscli.co.jp/" ] ,
  "po4ta.com" : [ "po4ta_com.png" , "http://www.po4ta.com/" ] ,
  "pluriform" : [ "pluriform.png" , "http://www.pluriform.nl/" ] ,
  "phpmailer" : [ "phpmailer.png" , "http://phpmailer.codeworxtech.com/" ] ,
  "phpcurve/" : [ "phpcurve.png" , "http://www.itzikdesign.com/" ] ,
  "php-email" : [ "codewalkers.png" , "http://www.codewalkers.com/c/a/Email-Code/PHP-Text-HTML-Email-with-Attachments-21/" ] ,
  "pb stores" : [ "packardbell.png" , "http://www.packardbell.com/" ] ,
  "paranmail" : [ "paran.png" , "http://mail.paran.com/" ] ,
  "pukiwiki" : [ "pukiwiki.png" , "http://pukiwiki.sourceforge.jp/" ] ,
  "pronews/" : [ "pronews.png" ] ,
  "pro dada" : [ "dada_mail.png" , "http://dadamailproject.com/purchase/pro.html" ] ,
  "prayer v" : [ "hermes_cambridge.png" ] ,
  "popmail/" : [ "popmail.png" , "http://www1.umn.edu/adcs/help/email/MacPopmail.html" ] ,
  "popmail " : [ "popmail.png" , "http://www1.umn.edu/adcs/help/email/MacPopmail.html" ] ,
  "pocomail" : [ "pocomail.png" , "http://www.pocosystems.com/" ] ,
  "platypus" : [ "platypus.png" , "http://www.mcga.com.au/platypus.php" ] ,
  "phlymail" : [ "phlymail.png" , "http://phlymail.com/" ] ,
  "p3mailer" : [ "php.png" , "http://sourceforge.net/projects/p3mailer" ] ,
  "postpet" : [ "postpet.png" , "http://www.postpet.so-net.ne.jp/" ] ,
  "postbox" : [ "postbox.png" , "http://www.postbox-inc.com/" ] ,
  "postaci" : [ "postaci.png" , "http://www.postaciwebmail.org/" ] ,
  "porsche" : [ "porsche.png" , "http://www.porsche.com/" ] ,
  "pnphpbb" : [ "pnphpbb.png" , "http://www.pnphpbb.com/" ] ,
  "pn.mail" : [ "postina_net.png" , "http://www.postina.net/" ] ,
  "pminews" : [ "pminews.png" , "http://www.stardock.com/products/pminews/" ] ,
  "phplist" : [ "phplist.png" , "http://www.phplist.com" ] ,
  "phorum5" : [ "phorum5.png" , "http://www.phorum.org/phorum5/" ] ,
  "pegasus" : [ "pegasus.png" , "http://www.pmail.com/" ] ,
  "pbemail" : [ "perfectionbytes.png" , "http://www.perfectionbytes.com/" ] ,
  "papyrus" : [ "papyrus_de.png" , "http://www.papyrus.de/" ] ,
  "python" : [ "python.png" , "http://www.python.org/" ] ,
  "pymail" : [ "python.png" , "http://www.python.org/" ] ,
  "postme" : [ "postme.png" ] ,
  "postie" : [ "postie.png" , "http://www.infradig.com/postie/" ] ,
  "pmw-tb" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "pmmail" : [ "pmmail.png" , "http://www.pmmail2000.com/" ] ,
  "pluto/" : [ "pluto.png" , "http://home.clara.net/jsd/" ] ,
  "pdsoft" : [ "pdsoft.png" , "http://www.pdeemsoftware.com/" ] ,
  "paypal" : [ "paypal.png" , "http://www.paypal.com/" ] ,
  "paseri" : [ "paseri.png" , "http://www.nippon-control-system.co.jp/products/paseri/" ] ,
  "papaya" : [ "papaya.png" , "http://www.papaya-cms.com/" ] ,
  "panini" : [ "panini-comics.png" , "http://www.paninicomics.de/" ] ,
  "pochy" : [ "pochy.png" , "http://pochy.sourceforge.jp/" ] ,
  "pobox" : [ "pobox.png" ] ,
  "pmail" : [ "pegasus.png" , "http://www.pmail.com/" ] ,
  "phpbb" : [ "phpbb.png" , "http://www.phpbb.com/" ] ,
  "phamm" : [ "phamm.png" , "http://www.phamm.org/" ] ,
  "poco" : [ "pocomail.png" , "http://www.pocosystems.com/" ] ,
  "pine" : [ "pine.png" , "http://www.washington.edu/pine/" ] ,
  "php5" : [ "php.png" , "http://www.php.net/" ] ,
  "php4" : [ "php.png" , "http://www.php.net/" ] ,
  "php3" : [ "php.png" , "http://www.php.net/" ] ,
  "php2" : [ "php.png" , "http://www.php.net/" ] ,
  "php1" : [ "php.png" , "http://www.php.net/" ] ,
  "php/" : [ "php.png" , "http://www.php.net/" ] ,
  "php-" : [ "php.png" , "http://www.php.net/" ] ,
  "php " : [ "php.png" , "http://www.php.net/" ] ,
  "perl" : [ "perl.png" , "http://www.perl.org/" ] ,
  "pepr" : [ "pear.png" , "http://pear.php.net/" ] ,
  "pear" : [ "pear.png" , "http://pear.php.net/" ] ,
  "pan/" : [ "pan.png" , "http://pan.rebelbase.com/" ] ,
  "pan " : [ "pan.png" , "http://pan.rebelbase.com/" ] ,
  "pse" : [ "interia_pl.png" , "http://www.interia.pl/" ] ,
}
dispMUA.arDispMUAAllocation["q"] =
{
  "qualcomm macintosh classic eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "qualcomm macos classic eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "qualcomm windows eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "qualcomm macos x eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "qusnetsoft newsreader" : [ "qusnetsoft_newsreader.png" , "http://www.qusnetsoft.ru/" ] ,
  "quality web email" : [ "netwinsite.png" , "http://www.netwinsite.com/webmail/" ] ,
  "quotient q.tools" : [ "quotient_qtools.png" , "http://www.quotientmarketing.com/qtools_defined.aspx" ] ,
  "quickmail pro" : [ "quickmail-pro.png" , "http://www.outspring.com/index.php?option=com_content&task=view&id=69" ] ,
  "qualisite cms" : [ "qualisite_de.png" , "http://www.qualisite.de/" ] ,
  "qsc's mailler" : [ "qsc.png" , "http://www.qsc.de/" ] ,
  "qa webaccess" : [ "qaconsulting.png" , "http://www.qaconsulting.com.br/" ] ,
  "quickmail" : [ "quickmail.png" , "http://www.outspring.com/index.php?option=com_content&task=view&id=70" ] ,
  "qps.qmail" : [ "python.png" , "http://pypi.python.org/pypi/QPS/" ] ,
  "queplix" : [ "queplix.png" , "http://www.queplix.com/" ] ,
  "quilt/" : [ "quilt.png" , "http://savannah.nongnu.org/projects/quilt" ] ,
  "qqmail" : [ "qqmail.png" , "http://www.umailcampaign.com/mailcom.aspx" ] ,
  "qmail" : [ "qmail.png" , "http://www.qmail.org/" ] ,
}
dispMUA.arDispMUAAllocation["r"] =
{
  "rtl digital newsletter system - www.rtl.be" : [ "rtl_be.png" , "http://www.rtlinfo.be/" ] ,
  "redemption mime converter" : [ "redemption.png" , "http://www.dimastr.com/redemption/" ] ,
  "roving constant contact" : [ "roving_constant_contact.png" , "http://www.constantcontact.com/" ] ,
  "reportsuite mailer" : [ "samriddhi.png" , "http://www.sipl.net/html/reportsuiteoverview.htm" ] ,
  "radica intimate" : [ "radica-intimate.png" , "http://www.radicasys.com/content/view/18/31/lang,en_HK/" ] ,
  "redmoonstudios" : [ "redmoonstudios_de.png" , "http://www.redmoonstudios.de/" ] ,
  "roxen's email" : [ "roxen.png" , "http://www.roxen.com/" ] ,
  "rodriquezmail" : [ "rodriquezmail.png" ] ,
  "rapid-emailer" : [ "rapid-emailer.png" , "http://www.absolutefuturity.com/Rapid-Emailer.htm" ] ,
  "rjsemail.cgi" : [ "perl.png" , "http://www.cpan.org/scripts/infoserv/WWW/rjsemail.cgi" ] ,
  "reach-a-mail" : [ "reach-a-mail.png" , "http://www.smartpctools.com/portable_email/index1.html" ] ,
  "realcommerce" : [ "realcommerce.png" , "http://www.realcommerce.co.il/" ] ,
  "rlsp mailer" : [ "php.png" , "" ] ,
  "rasmas.info" : [ "rasmas_info.png" , "http://rasmas.info/" ] ,
  "rc webmail" : [ "roundcube.png" , "http://www.roundcube.net/" ] ,
  "railo mail" : [ "railo.png" , "http://www.getrailo.com/" ] ,
  "rss2email" : [ "infogami.png" , "http://rss2email.infogami.com/" ] ,
  "rozsylacz" : [ "rozsylacz.png" , "http://www.aionel.net/rozsyla.htm" ] ,
  "roundcube" : [ "roundcube.png" , "http://www.roundcube.net/" ] ,
  "rm mailer" : [ "rm-mailer.png" , "http://www.reachmail.com/" ] ,
  "reportbug" : [ "debian.png" , "http://www.debian.org/" ] ,
  "readysoft" : [ "readysoft.png" , "http://www.readysoft.de/" ] ,
  "readymail" : [ "readymail.png" , "http://www.readymail.de/" ] ,
  "ru.board" : [ "ru_board.png" ] ,
  "rss2imap" : [ "perl.png" , "http://rss2imap.sourceforge.net/" ] ,
  "risumail" : [ "risumail.png" , "http://www.risumail.jp/" ] ,
  "reservit" : [ "reservit.png" , "http://www.reservit.com/" ] ,
  "rmrnews" : [ "rmr.png" , "http://www.rmrsoft.com/" ] ,
  "redmine" : [ "ruby.png" , "http://www.redmine.org/" ] ,
  "rscomm" : [ "rscomm.png" , "http://www.reinhardt-software.de/" ] ,
  "ramail" : [ "rambler_ru.png" , "http://www.rambler.ru/" ] ,
  "rhx" : [ "rhx.png" , "http://www.rhx.it/" ] ,
  "reo" : [ "t-online.png" , "http://www.t-online.de/" ] ,
}
dispMUA.arDispMUAAllocation["s"] =
{
  "schalk&friends powered by htmlmimemail" : [ "phpguru_org.png" , "http://www.phpguru.org/" ] ,
  "sylvia sackwitz fotografie [sf] mail" : [ "ssf_mail.png" , "http://www.sackwitz-fotografie.de/" ] ,
  "sendnewsletter/parallel by epublica" : [ "epublica.png" , "http://www.epublica.de/" ] ,
  "smarttools publishing serienmailer" : [ "smarttools.png" , "http://www.smarttools.de/" ] ,
  "site web lyonnaise des eaux france" : [ "lyonnaise-des-eaux.png" , "http://www.lyonnaise-des-eaux.fr/" ] ,
  "suse linux openexchange server" : [ "suse.png" , "http://www.suse.com/" ] ,
  "sun one messenger express" : [ "sun_one.png" , "http://www.sun.com/" ] ,
  "smtp client for ibm i5/os" : [ "i5-os.png" , "http://www.ibm.com/" ] ,
  "smtp client for ibm as400" : [ "ibm.png" , "http://www.ibm.com/" ] ,
  "symon registration robot" : [ "symon.png" , "http://www.symon.ru/" ] ,
  "spiegel verlag webmailer" : [ "spiegel_online.png" , "http://www.spiegel.de/" ] ,
  "seven enterprise gateway" : [ "seven.png" , "http://www.seven.com/" ] ,
  "synck graphica mailform" : [ "synck-graphica-mailform.png" , "http://www.synck.com/contents/download/cgi-perl/mailformpro.html" ] ,
  "samlogic mailing system" : [ "samlogic_mailing_system.png" , "http://www.samlogic.net/multimailer/multimailer.htm" ] ,
  "striata communications" : [ "striata.png" , "http://www.striata.com/" ] ,
  "sevactivex smtp mailer" : [ "sev.png" , "http://www.tools4vb.com/" ] ,
  "sun outlook connector" : [ "sun_outlook.png" , "http://www.sun.com/" ] ,
  "subculture newsletter" : [ "subculture.png" , "http://www.subculture.de/" ] ,
  "steinbrecher software" : [ "steinbrecher.png" , "http://www.steinbrecher-software.de/" ] ,
  "spifforific thinkgeek" : [ "thinkgeek.png" , "http://www.thinkgeek.com/" ] ,
  "software: swoppen.com" : [ "swoppen.png" , "http://www.swoppen.com/" ] ,
  "stress-free contact" : [ "stressfreecontact.png" , "http://www.stressfreecontact.com/" ] ,
  "speedbone-webmailer" : [ "speedbone.png" , "http://www.speedbone.de/" ] ,
  "surfino newsreader" : [ "surfino.png" , "http://newsreader.surfino.com/" ] ,
  "sesec java webmail" : [ "sesec-webmail.png" , "http://sesec.ma.gov.br/" ] ,
  "saunalahti webmail" : [ "saunalahti_fi.png" , "http://www.saunahahti.fi/" ] ,
  "supermailerscript" : [ "supermailerscript.png" , "http://www.supermailer.de/" ] ,
  "stroede cmartpost" : [ "stroede-ralton.png" , "http://www.stroederalton.se/" ] ,
  "sse-unimatrix-one" : [ "1und1.png" , "http://www.1and1.co.uk/" ] ,
  "smartresponder.ru" : [ "smartresponder_ru.png" , "http://www.smartresponder.ru/" ] ,
  "stepstone mailer" : [ "stepstone.png" , "http://www.stepstone.de/" ] ,
  "sav materiel.net" : [ "materiel.png" , "http://www.materiel.net/" ] ,
  "spritmonitor.de" : [ "spritmonitor.png" , "http://www.spritmonitor.de/" ] ,
  "sonicmailer pro" : [ "sonicmailer_pro.png" , "http://www.triexa.com/" ] ,
  "share-rapid.com" : [ "share-rapid.png" , "http://share-rapid.com/" ] ,
  "scooby for beos" : [ "beos_scooby.png" , "http://sourceforge.net/projects/scooby" ] ,
  "satamatics ssas" : [ "satamatics.png" , "http://www.satamatics.com/ssas/" ] ,
  "swistak mailer" : [ "swistak.png" , "http://www.swistak.pl/" ] ,
  "smartstore.biz" : [ "smartstore.png" , "http://www.smartstore.com/" ] ,
  "sky-newsletter" : [ "sky-scripts.png" , "http://www.sky-scripts.de/" ] ,
  "sibnet webmail" : [ "sibnet.png" , "http://mail.sibnet.ru/" ] ,
  "sevsmtp mailer" : [ "sev.png" , "http://www.tools4vb.com/" ] ,
  "scouts on-line" : [ "scouts-online.png" , "http://www.scouting.nl/" ] ,
  "sharpener mail" : [ "sharpener.png" , "http://www.sharpener.com.br/" ] ,
  "sevenload mail" : [ "sevenload.png" , "http://www.sevenload.com/" ] ,
  "sysaid server" : [ "sysaid.png" , "http://www.ilient.com/" ] ,
  "store-mailer/" : [ "apple_store.png" , "http://store.apple.com/" ] ,
  "sohu web mail" : [ "sohu_com.png" , "http://www.sohu.com/" ] ,
  "sina freemail" : [ "sina_com.png" , "http://mail.sina.com.cn/" ] ,
  "system2teach" : [ "hs-fulda.png" , "http://www.system2teach.de/" ] ,
  "synergyemail" : [ "synergyemail.png" , "http://www.synergysitemanager.com/" ] ,
  "synchredible" : [ "synchredible.png" , "http://www.ascomp.de/index.php?php=products" ] ,
  "startaid.com" : [ "startaid_com.png" , "http://www.startaid.com/" ] ,
  "snood letter" : [ "snood.png" , "http://www.snoodworld.com/" ] ,
  "smartmessage" : [ "smartmessage.png" , "http://www.smartmessage.com.tr/" ] ,
  "staroffice21" : [ "staroffice21.png" , "http://www.nec.co.jp/gw/" ] ,
  "squirrelmail" : [ "squirrelmail.png" , "http://www.squirrelmail.org/" ] ,
  "spon-webmail" : [ "spiegel_online.png" , "http://www.spiegel.de/" ] ,
  "smtpjavamail" : [ "smtpjavamail.png" , "http://java.sun.com/products/javamail/" ] ,
  "sina webmail" : [ "sina_com.png" , "http://mail.sina.com.cn/" ] ,
  "simorganizer" : [ "simorganizer.png" ] ,
  "shop to date" : [ "shoptodate.png" , "http://www.shoptodate.de/" ] ,
  "serendipity/" : [ "serendipity.png" , "http://www.s9y.org/" ] ,
  "send::around" : [ "sendaround.png" , "http://www.sendaround.de/" ] ,
  "scrubby mail" : [ "scrubtheweb.png" , "http://www.scrubtheweb.com/" ] ,
  "syncbackpro" : [ "syncbackpro.png" , "http://www.2brightsparks.com/syncback/sbpro.html" ] ,
  "svn::notify" : [ "subversion.png" , "http://subversion.tigris.org/" ] ,
  "surveygizmo" : [ "surveygizmo.png" , "http://www.surveygizmo.com/" ] ,
  "surfcontrol" : [ "surfcontrol.png" , "http://www.surfcontrol.com/Default.aspx?id=357" ] ,
  "stumbleupon" : [ "stumbleupon.png" , "http://www.stumbleupon.com/" ] ,
  "streamserve" : [ "streamserve.png" , "http://www.streamserve.com/" ] ,
  "storeforyou" : [ "storeforyou.png" , "http://www.storeforyou.de/" ] ,
  "steg-mailer" : [ "stegcomputer.png" , "http://www.stegcomputer.ch/" ] ,
  "sqli mailer" : [ "sqli_com.png" , "http://www.sqli.com/" ] ,
  "specmanager" : [ "acdlabs.png" , "http://www.acdlabs.com/products/spec_lab/exp_spectra/" ] ,
  "spartoo.com" : [ "spartoo_com.png" , "http://www.spartoo.com/" ] ,
  "software602" : [ "software602.png" , "http://www.software602.com/" ] ,
  "snappermail" : [ "snappermail.png" , "http://www.snappermail.com/" ] ,
  "smartagent/" : [ "smartagent.png" ] ,
  "simplecheck" : [ "simplecheck.png" , "http://sourceforge.net/projects/simplecheck/" ] ,
  "simple mail" : [ "simple-mail.png" , "http://telega.phpnet.us/simplemail/" ] ,
  "shopexpress" : [ "shopexpress.png" , "http://www.shopexpress.info" ] ,
  "sendblaster" : [ "sendblaster.png" , "http://www.sendblaster.com/" ] ,
  "sa-smtpmail" : [ "softartisans.png" , "http://www.aspstudio.com/" ] ,
  "symbian os" : [ "symbian_os.png" , "http://www.symbian.com/" ] ,
  "su-webmail" : [ "stockholm_uni.png" , "http://www.su.se/" ] ,
  "subskrypcj" : [ "subskrypcj.png" , "http://www.subskrypcja.pl/" ] ,
  "strongmail" : [ "strongmail.png" , "http://www.strongmail.com/" ] ,
  "stringdata" : [ "post_sk.png" , "http://www.post.sk/" ] ,
  "streamsend" : [ "streamsend.png" , "http://www.streamsend.com/" ] ,
  "step ahead" : [ "stepahead.png" , "http://www.stepahead.info/" ] ,
  "staroffice" : [ "staroffice.png" , "http://www.sun.com/software/staroffice/" ] ,
  "soupermail" : [ "soupermail.png" , "http://soupermail.sourceforge.net/" ] ,
  "smtpit pro" : [ "smtpit-pro.png" , "http://www.cnsplug-ins.com/products.htm?product=smtpit%20pro" ] ,
  "smtpbeamer" : [ "smtpbeamer.png" , "http://www.dataenter.co.at/products/smtpbeamer.htm" ] ,
  "smoothwall" : [ "smoothwall.png" , "http://www.smoothwall.net/" ] ,
  "smartmail(" : [ "freebit.png" , "http://www.freebit.com/" ] ,
  "simplemail" : [ "python.png" , "http://www.python-forum.de/post-18144.html" ] ,
  "schuelervz" : [ "schuelervz.png" , "http://schuelervz.net/" ] ,
  "scenario m" : [ "scenario-m_de.png" , "http://www.scenario-m.de/" ] ,
  "satamatics" : [ "satamatics.png" , "http://www.satamatics.com/" ] ,
  "synckolab" : [ "kolab.png" , "http://www.kolab.org/" ] ,
  "swreg.org" : [ "swreg_org.png" , "http://swreg.org/" ] ,
  "swiftdove" : [ "swiftdove.png" , "http://swiftweasel.tuxfamily.org/" ] ,
  "svnmailer" : [ "subversion.png" , "http://opensource.perlig.de/svnmailer/" ] ,
  "spnetmail" : [ "spiegel_online.png" , "http://www.spiegel.de/" ] ,
  "spicebird" : [ "spicebird.png" , "http://www.spicebird.com/" ] ,
  "speedmail" : [ "speedmail.png" , "http://members.aol.com/toadbee/Programs.htm" ] ,
  "smart4web" : [ "smart4web.png" , "http://www.smart4web.cz/" ] ,
  "sendemail" : [ "sendemail.png" , "http://caspian.dotconf.net/menu/Software/SendEmail/" ] ,
  "sake mail" : [ "sake_mail.png" , "http://www.endymion.com/products/sake/" ] ,
  "syndmail" : [ "redclay.png" , "http://www.redclay.com/products/syndmail.html" ] ,
  "symantec" : [ "symantec.png" , "http://www.symantec.com/" ] ,
  "sylpheed" : [ "sylpheed.png" , "http://sylpheed.sraoss.jp/en/" ] ,
  "sun java" : [ "java.png" , "http://www.sun.com/" ] ,
  "steganos" : [ "steganos.png" , "http://www.steganos.com/" ] ,
  "stardoll" : [ "stardoll.png" , "http://www.stardoll.com/" ] ,
  "spaps.de" : [ "spaps_de.png" , "http://www.spaps.de/" ] ,
  "sogomail" : [ "sogomail.png" , "http://sogo.opengroupware.org/" ] ,
  "socratos" : [ "socratos.png" , "http://www.socratos.be/" ] ,
  "smtpsend" : [ "smtpsend.png" , "http://www.geocities.com/mdrapps/smtpsend/" ] ,
  "smtpmail" : [ "smtpmail.png" , "http://fileup.softartisans.com/fileup-276.aspx" ] ,
  "sitemail" : [ "sitemail.png" , "http://sitemail.hostway.com/" ] ,
  "sinamail" : [ "sina_com.png" , "http://mail.sina.com.cn/" ] ,
  "sev.mail" : [ "sev.png" , "http://www.tools4vb.com/software/sevmail.php" ] ,
  "sendsmtp" : [ "sendsmtp.png" , "http://www.greyware.com/software/sendsmtp/" ] ,
  "sendmail" : [ "sendmail.png" , "http://www.sendmail.org/" ] ,
  "synapse" : [ "synapse.png" , "http://synapse.ararat.cz/" ] ,
  "swwwing" : [ "swwwing.png" , "http://www.swwwing.com/" ] ,
  "sunmail" : [ "sunmail.png" , "http://www.sunmail.com/" ] ,
  "suite26" : [ "suite26.png" , "http://www.26.co.uk/" ] ,
  "studivz" : [ "studivz.png" , "http://studivz.net/" ] ,
  "spiral/" : [ "spiral.png" , "http://www.smp.ne.jp/" ] ,
  "sparrow" : [ "sparrow.png" , "http://sparrowmailapp.com/" ] ,
  "soom.cz" : [ "soom_cz.png" , "http://www.soom.cz/index.php?name=projects/mail/main" ] ,
  "sndmail" : [ "sndmail.png" , "http://www.xmailserver.org/davide.html" ] ,
  "si.mail" : [ "si_mail.png" , "http://www.simail.si/" ] ,
  "sybase" : [ "sybase.png" , "http://www.sybase.com/" ] ,
  "swi.hu" : [ "swi.png" , "http://www.swi.hu/" ] ,
  "strato" : [ "strato.png" , "http://www.strato.de/" ] ,
  "sophos" : [ "sophos.png" , "http://www.sophos.com/" ] ,
  "smtpit" : [ "smtpit.png" , "http://www.cnsplug-ins.com/products.htm?product=SMTPit" ] ,
  "skyrix" : [ "skyrix.png" , "http://www.skyrix.com/" ] ,
  "sixcms" : [ "six.png" , "http://www.six.de/" ] ,
  "siebel" : [ "oracle.png" , "http://www.oracle.com/siebel" ] ,
  "sidoko" : [ "siegel-edv_de.png" , "http://www.siegel-edv.de/" ] ,
  "scsmtp" : [ "sc-resources.png" , "http://www.sc-resources.net/" ] ,
  "scalix" : [ "scalix.png" , "http://www.scalix.com/" ] ,
  "sympa" : [ "sympa.png" , "http://www.sympa.org/" ] ,
  "swift" : [ "swiftmailer.png" , "http://www.swiftmailer.org/" ] ,
  "swaks" : [ "swaks.png" , "http://jetmore.org/john/code/#swaks" ] ,
  "sumo/" : [ "sumo.png" ] ,
  "smtpc" : [ "smtpc.png" , "http://shellscripts.org/project/smtpc" ] ,
  "smail" : [ "smail.png" , "http://www.weird.com/~woods/projects/smail.html" ] ,
  "slrn/" : [ "slrn.png" , "http://slrn.sourceforge.net/" ] ,
  "slrn " : [ "slrn.png" , "http://slrn.sourceforge.net/" ] ,
  "sharp" : [ "sharp.png" , "http://www.sharp.co.jp/" ] ,
  "setia" : [ "setia.png" , "http://www.setia.info/" ] ,
  "sesna" : [ "sesna.png" , "http://maple.snowdrift.cc/?sesna%2FV2" ] ,
  "sup/" : [ "ruby.png" , "http://sup.rubyforge.org/" ] ,
  "sap " : [ "sap.png" , "http://www.sap.com/" ] ,
  "smf" : [ "simplemachines.png" , "http://www.simplemachines.org/" ] ,
  "sk " : [ "typo3.png" , "http://www.sk-typo3.de/" ] ,
}
dispMUA.arDispMUAAllocation["t"] =
{
  "touchpoint campaign manager" : [ "touchpoint.png" , "http://www.touchpoint.co.nz/products/campaign.html" ] ,
  "tva e-mail transfer client" : [ "tva.png" ] ,
  "tu-dortmund wsmailer" : [ "tu-dortmund.png" , "http://www.uni-dortmund.de/" ] ,
  "the mailman replybot" : [ "mailman.png" , "http://www.list.org/" ] ,
  "the polarbar mailer" : [ "polarbar.png" , "http://www.polarbar.net/" ] ,
  "tcl email library" : [ "tcl.png" , "http://web.uvic.ca/~erempel/tcl/Email/Email.html" ] ,
  "tabs laboratories" : [ "tabslab.png" , "http://www.tabslab.com/" ] ,
  "tricorn autobahn" : [ "autobahn.png" , "http://www.tricorn.net/" ] ,
  "talktalk webmail" : [ "aol_talktalk.png" , "http://info.aol.co.uk/talktalk-webmail/" ] ,
  "talisma netagent" : [ "talisma.png" , "http://www.talisma.com/" ] ,
  "triera internet" : [ "triera.png" , "http://www.triera.net/" ] ,
  "thingamajob.com" : [ "thingamajob_com.png" , "http://www.thingamajob.com/" ] ,
  "the codeweavers" : [ "codeweavers.png" , "http://www.codeweavers.com/" ] ,
  "tsworks e-mail" : [ "tsworks.png" , "http://www.fujitsu.com/" ] ,
  "thinkui mailer" : [ "thinkui_com.png" , "http://www.thinkui.com/" ] ,
  "testtrack smtp" : [ "testtrack.png" , "http://www.seapine.com/ttpro.html" ] ,
  "tvnet e-pasts" : [ "tvnet_lv.png" , "http://www.tvnet.lv/" ] ,
  "tripolis mail" : [ "tripolis.png" , "http://www.tripolis.com/" ] ,
  "triggermailer" : [ "triggermail.png" , "http://sailthru.com/products/triggermail" ] ,
  "tweakers.net" : [ "tweakers_net.png" , "http://www.tweakers.net/" ] ,
  "tutorials.de" : [ "tutorials_de.png" , "http://www.tutorials.de/" ] ,
  "tibet server" : [ "tibetserver.png" , "http://www.tibetserver.com/" ] ,
  "thindata ems" : [ "thindata_ems.png" , "http://www.thindata.com/" ] ,
  "talisma mail" : [ "talisma.png" , "http://www.talisma.com/" ] ,
  "turbomailer" : [ "turbomailer.png" , "http://www.xellsoft.com/TurboMailer.html" ] ,
  "thunderbird" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "team noggin" : [ "noggin.png" , "http://www.noggin.com.au/products/gateway" ] ,
  "tuonome.it" : [ "tuonome_it.png" , "http://www.tuonome.it/" ] ,
  "tripitmail" : [ "tripit_com.png" , "http://www.tripit.com/" ] ,
  "tmcnet.com" : [ "tmcnet_com.png" , "http://www.tmcnet.com/" ] ,
  "tdc online" : [ "tdc.png" , "http://tdconline.dk/" ] ,
  "targetmail" : [ "techtarget.png" , "http://www.techtarget.com/" ] ,
  "turbomail" : [ "turbomail.png" , "http://www.python-turbomail.org/" ] ,
  "trademail" : [ "fumasoft.png" , "http://www.fumasoft.com/" ] ,
  "torba.com" : [ "torba.png" , "http://torba.com/" ] ,
  "tellmatic" : [ "tellmatic.png" , "http://tellmatic.org/" ] ,
  "tapirmail" : [ "tapirmail.png" , "http://www.flypig.co.uk/tapirmail/" ] ,
  "tapetrack" : [ "tapetrack.png" , "http://www.tapetrack.com/" ] ,
  "turukame" : [ "turukame.png" ] ,
  "turnpike" : [ "turnpike.png" , "http://www.turnpike.com/" ] ,
  "tugnews/" : [ "tu-graz.png" , "http://webnews.tugraz.at/" ] ,
  "trialpay" : [ "trialpay.png" , "http://www.trialpay.com/" ] ,
  "the bat!" : [ "the_bat.png" , "http://www.ritlabs.com/en/products/thebat/" ] ,
  "telebyte" : [ "telebyte.png" , "http://webmail.telebyte.nl/" ] ,
  "teamware" : [ "fujitsu.png" , "http://software.fujitsu.com/jp/teamware/" ] ,
  "t-online" : [ "t-online.png" , "http://www.t-online.de/" ] ,
  "tvnmail" : [ "tvnmail.png" , "http://www.tvn.hu/" ] ,
  "toshiba" : [ "toshiba.png" , "http://www.toshiba.co.jp/" ] ,
  "topdesk" : [ "topdesk.png" , "http://www.topdesk.com/" ] ,
  "the bee" : [ "the-bee.png" , "http://www.avtlab.ru/thebee.htm" ] ,
  "tactica" : [ "tactica.png" , "http://www.tacticasoft.com/" ] ,
  "t-gnus/" : [ "gnus.png" , "http://gnus.org/" ] ,
  "try.hu" : [ "try_hu.png" , "http://www.try.hu/" ] ,
  "tralix" : [ "tralix.png" , "http://www.tralix.com/" ] ,
  "totemo" : [ "totemo.png" , "http://www.totemo.ch/" ] ,
  "tchibo" : [ "tchibo.png" , "http://www.tchibo.com/" ] ,
  "tal.de" : [ "tal_de.png" , "http://www.tal.de/" ] ,
  "typo3" : [ "typo3.png" , "http://www.typo3.com/" ] ,
  "topix" : [ "topix.png" , "http://www.topix.de/" ] ,
  "thoth" : [ "thoth.png" , "http://home.earthlink.net/~thoth-help/thoth.html" ] ,
  "thor " : [ "thor.png" , "http://www.thule.no/" ] ,
  "telix" : [ "telix.png" , "http://www.telix.com/delta/products/" ] ,
  "twig" : [ "twig.png" , "http://informationgateway.org/" ] ,
  "trn " : [ "trn.png" , "http://treekom.ftml.net/" ] ,
  "trac" : [ "trac.png" , "http://trac.edgewall.org/" ] ,
  "tin/" : [ "tin.png" , "http://www.tin.org/" ] ,
  "tin " : [ "tin.png" , "http://www.tin.org/" ] ,
  "tigo" : [ "tigo.png" , "http://www.tigo.com.sv/" ] ,
  "toi" : [ "t-online.png" , "http://www.t-online.de/" ] ,
  "tt " : [ "tt.png" , "http://www.icosaedro.it/tt/" ] ,
}
dispMUA.arDispMUAAllocation["u"] =
{
  "ultimate-auction.de" : [ "ultimate-auction_de.png" , "http://www.ultimate-auction.de/" ] ,
  "ubuntu thunderbird" : [ "thunderbird.png" , "http://www.ubuntu.com/" ] ,
  "userland frontier" : [ "userland_frontier.png" ] ,
  "usanet web-mailer" : [ "usanet.png" , "http://www.usa.net/" ] ,
  "ultrafunk popcorn" : [ "popcorn.png" , "http://www.ultrafunk.com/products/popcorn/" ] ,
  "usenet explorer" : [ "usenet_explorer.png" , "http://www.usenetexplorer.com/" ] ,
  "umo mail system" : [ "mozilla_update.png" , "http://update.mozilla.org/" ] ,
  "upcdata.info" : [ "upcdata.png" , "http://upcdata.info/" ] ,
  "uta-webmail" : [ "utanet.png" , "http://www.utanet.at/" ] ,
  "unknown sub" : [ "aol.png" , "http://www.aol.com/" ] ,
  "unknown (no" : [ "aol.png" , "http://www.aol.com/" ] ,
  "ubb.threads" : [ "ubbthreads.png" , "http://www.ubbcentral.com/" ] ,
  "ux systems" : [ "ux-systems.png" , "http://www.ux.pl/" ] ,
  "utstarcom" : [ "vonage.png" , "http://www.vonage.com/" ] ,
  "unitymail" : [ "unity_mail.png" , "http://www.messagemedia.com/" ] ,
  "uebimiau" : [ "uebimail.png" , "http://www.uebimiau.org/" ] ,
  "ubiqmail" : [ "ubiqmail.png" , "http://yournet.freebit.net/ubiqmail/scheme/" ] ,
  "usermin" : [ "usermin.png" , "http://www.webmin.com/usermin.html" ] ,
  "usenext" : [ "usenext.png" , "http://usenext.en.softonic.com/" ] ,
  "umailng" : [ "umailng.png" ] ,
  "ukr.net" : [ "ukr_net.png" , "http://www.ukr.net/" ] ,
  "userve" : [ "userve.png" ] ,
  "unisys" : [ "unisys.png" , "http://www.unisys.com/" ] ,
  "unison" : [ "unison.png" , "http://www.panic.com/unison/" ] ,
  "unanet" : [ "unanet.png" , "http://www.unanet.com/" ] ,
  "uacett" : [ "toshiba.png" , "http://www.estudio.com.sg/" ] ,
  "ucoz" : [ "ucoz.png" , "http://www.ucoz.com/" ] ,
  "u <" : [ "umail.png" , "http://www.umail.ucsb.edu/" ] ,
}
dispMUA.arDispMUAAllocation["v"] =
{
  "voltimum newsletter-mailer" : [ "voltimum.png" , "http://www.voltimum.de/" ] ,
  "venere net spa mailer" : [ "venere.png" , "http://www.venere.com/" ] ,
  "virtek mail systems" : [ "virtek.png" , "http://www.virtek.com/" ] ,
  "visualsoft mailer" : [ "visualsoft.png" ] ,
  "visnetic mailflow" : [ "visnetic_mailflow.png" , "http://www.deerfield.com/Products/VisNetic-MailFlow/" ] ,
  "volny.cz webmail" : [ "volny_cz.png" , "http://web.volny.cz/" ] ,
  "visnetic webmail" : [ "visnetic_mailserver.png" , "http://www.deerfield.com/Products/VisNetic-MailServer/web_mail/" ] ,
  "vernunft schweiz" : [ "vernunft_schweiz.png" , "http://www.vernunft-schweiz.ch/" ] ,
  "visual paradigm" : [ "visual-paradigm.png" , "http://www.visual-paradigm.com/" ] ,
  "vallen e-mailer" : [ "vallen.png" , "http://www.vallen.de/freeware/index.html#Vallen%20e-Mailer" ] ,
  "virtual target" : [ "virtualtarget.png" , "http://www.virtualtarget.com.br/" ] ,
  "virtual access" : [ "virtual_access.png" , "http://www.virtual-access.org/" ] ,
  "vas-hosting.cz" : [ "vas-hosting_cz.png" , "http://www.vas-hosting.cz/" ] ,
  "veritas smtp" : [ "veritas.png" , "http://www.symantec.com/redirects/veritas/veritas_com" ] ,
  "vivian mail" : [ "vivian_mail.png" , "http://www.deepsleep.de/software/vivianmail/vivianmail.html" ] ,
  "vplan plus" : [ "vplan-plus.png" , "http://vplan.svenkan.bplaced.de/vplan.php?action=plus" ] ,
  "vizslamail" : [ "vizslamail.png" , "http://www.vizslamail.hu/" ] ,
  "versamail" : [ "versamail.png" , "http://www.palm.com/us/support/accessories/versamail/" ] ,
  "veluxmail" : [ "velux.png" , "http://velux.de/" ] ,
  "vbulletin" : [ "vbulletin.png" , "http://www.vbulletin.com/" ] ,
  "vacation/" : [ "vacation.png" , "http://www.csamuel.org/software/vacation" ] ,
  "v-webmail" : [ "v-webmail.png" , "http://v-webmail.sourceforge.net/" ] ,
  "vodafone" : [ "vodafone.png" , "http://www.vodafone.de/" ] ,
  "vista.pl" : [ "vista_pl.png" , "http://www.vista.pl/" ] ,
  "vboxmail" : [ "vbox.png" , "http://smarden.org/pape/vbox3/" ] ,
  "voyager" : [ "voyager.png" , "http://www.ritlabs.com/de/products/voyager/" ] ,
  "voxmail" : [ "voxmail.png" , "http://voxmail.sourceforge.net/" ] ,
  "vipmail" : [ "vipmail.png" , "http://vipmail.hu/" ] ,
  "verizon" : [ "verizon.png" , "http://www.verizon.net/" ] ,
  "viadeo" : [ "viadeo.png" , "http://www.viadeo.com/" ] ,
  "vsoup" : [ "vsoup.png" , "http://www.mardys.de/vsoup.htm" ] ,
  "vkpmx" : [ "pragmamx.png" , "http://www.pragmamx.org/" ] ,
  "vwar" : [ "vwar.png" , "http://www.vwar.de/" ] ,
  "vhcs" : [ "vhcs.png" , "http://www.vhcs.net/" ] ,
  "vm5." : [ "emacs.png" , "http://www.gnu.org/software/emacs/" ] ,
  "vm " : [ "emacs.png" , "http://www.gnu.org/software/emacs/" ] ,
}
dispMUA.arDispMUAAllocation["w"] =
{
  "web business center - www.davinci-tec.de" : [ "davinci-tec.png" , "http://www.davinci-tec.de/" ] ,
  "www.talkaboutsportsnetwork.com" : [ "tasn.png" , "http://www.talkaboutsportsnetwork.com/" ] ,
  "windows sharepoint services" : [ "ms_sharepoint.png" , "http://www.microsoft.com/" ] ,
  "w.e.s. kommunikation mailer" : [ "handyflash.png" , "http://handyflash.de/" ] ,
  "webmail (1und1 webmailer)" : [ "1und1.png" , "http://www.1und1.de/" ] ,
  "www-mail (funpic portal)" : [ "funpic_de.png" , "http://www.funpic.de/" ] ,
  "www.20minutos.es mailer" : [ "20minutos_es.png" , "http://www.20minutos.es/" ] ,
  "woodstone servers alive" : [ "salive.png" , "http://www.woodstone.nu/salive/" ] ,
  "waste.uk.com mailsystem" : [ "waste.uk.com.png" , "http://www.waste.uk.com/" ] ,
  "www.electronicsales.de" : [ "electronicsales.png" , "http://www.electronicsales.de/" ] ,
  "wavesetemailnotifier" : [ "sun.png" , "http://www.sun.com/software/waveset/" ] ,
  "wr-subscribe mailer" : [ "wr-scripts.png" , "http://wr.kovostok.ru/" ] ,
  "www.virtusales.com" : [ "virtusales_com.png" , "http://www.virtusales.com/" ] ,
  "www.mynewsgate.net" : [ "mynewsgate_net.png" , "http://www.mynewsgate.net/" ] ,
  "www.cleverreach.de" : [ "cleverreach_de.png" , "http://www.cleverreach.de/" ] ,
  "webmail.osnanet.de" : [ "osnatel_de.png" , "http://www.osnanet.de/" ] ,
  "www.bhsbinkert.de" : [ "bhsbinkert.png" , "http://www.bhsbinkert.de/" ] ,
  "woltlab community" : [ "wbb.png" , "http://community.woltlab.com/" ] ,
  "webmail mirapoint" : [ "mirapoint.png" , "http://www.mirapoint.de/" ] ,
  "webmail di libero" : [ "libero_it.png" , "http://liberomail.libero.it/" ] ,
  "www.schworak.com" : [ "schworak.png" , "http://schworak.com/" ] ,
  "webmail-email.it" : [ "email_it.png" , "http://www.email.it/" ] ,
  "webmail net site" : [ "netsite_webmail.png" , "http://webmail.netsite.com.br/" ] ,
  "web based pronto" : [ "web_based_pronto.png" ] ,
  "www.webspace.de" : [ "webspace_de.png" , "http://www.webspace.de/" ] ,
  "www.titulky.com" : [ "titulky_com.png" , "http://www.titulky.com/" ] ,
  "www.notebook.de" : [ "notebook_de.png" , "http://www.notebook.de/" ] ,
  "www.newsland.it" : [ "newsland_it.png" , "http://www.newsland.it/" ] ,
  "webnews to mail" : [ "netwinsite.png" , "http://netwinsite.com/webnews/" ] ,
  "webmail version" : [ "webmail.png" , "http://www.unitedonline.net/" ] ,
  "web4u csendmail" : [ "web4u.png" , "http://www.web4u.cz/" ] ,
  "web-based email" : [ "godaddy.png" , "http://www.godaddy.com/" ] ,
  "www.mailpro.pl" : [ "mailpro_pl.png" , "http://www.mailpro.pl/" ] ,
  "www.allsync.de" : [ "allsync.png" , "http://www.allsync.de/" ] ,
  "windows eudora" : [ "eudora.png" , "http://www.eudora.com/" ] ,
  "webmasterworld" : [ "webmasterworld.png" , "http://www.webmasterworld.com/" ] ,
  "webmail rol.ro" : [ "rol_ro.png" , "http://www.rol.ro/" ] ,
  "webedition cms" : [ "webedition.png" , "http://www.webedition.de/" ] ,
  "w+r app server" : [ "gmx.png" , "http://www.wrgmbh.de/" ] ,
  "www.smappy.de" : [ "smappy_de.png" , "http://www.smappy.de/" ] ,
  "www.heycom.de" : [ "heycom_de.png" , "http://www.heycom.de/" ] ,
  "winehq mailer" : [ "winehq.png" , "http://www.winehq.org/" ] ,
  "willco mailer" : [ "willco.png" , "http://www.willco.com/" ] ,
  "wg-gesucht.de" : [ "wg-gesucht_de.png" , "http://www.wg-gesucht.de/" ] ,
  "wernis-portal" : [ "wernis-portal.png" , "http://www.wds66.com/" ] ,
  "webreport/400" : [ "webreport-400.png" , "http://www.kisco.com/webreport/" ] ,
  "web help desk" : [ "webhelpdesk.png" , "http://www.webhelpdesk.com/" ] ,
  "wdic-explorer" : [ "wdic_org.png" , "http://www.wdic.org/" ] ,
  "www.gefro.de" : [ "gefro.png" , "http://www.gefro.de/" ] ,
  "www.4free.pl" : [ "4free_pl.png" , "http://www.4free.pl/" ] ,
  "wsmtp mailer" : [ "wayn.png" , "http://www.wayn.com/" ] ,
  "winnt's blat" : [ "blat.png" , "http://www.blat.net/" ] ,
  "webmail/java" : [ "jwebmail.png" , "http://jwebmail.sourceforge.net/" ] ,
  "webmail ismm" : [ "ismm_cu.png" , "http://ismm.edu.cu/" ] ,
  "webalta-mail" : [ "webalta.png" , "http://www.webalta.ru/" ] ,
  "worldclient" : [ "worldclient.png" , "http://mail.wordlex.de/" ] ,
  "workcentre " : [ "xerox_workcentre.png" , "http://www.office.xerox.com/" ] ,
  "wordperfect" : [ "wordperfect.png" , "http://www.corel.com/servlet/Satellite/us/en/Product/1152105038635" ] ,
  "winnt's msm" : [ "marval-msm.png" , "http://www.marval.co.uk/" ] ,
  "websurveyor" : [ "vovici.png" , "http://www.websurveyor.com/" ] ,
  "webroot.com" : [ "webroot_com.png" , "http://www.webroot.com/" ] ,
  "webmail ulb" : [ "webmail_ulb.png" , "http://webmail.ulb.ac.be/" ] ,
  "web to date" : [ "web-to-date.png" , "http://www.webtodate.de/" ] ,
  "web de mail" : [ "web_de_mail.png" ] ,
  "wongmailer" : [ "wongmailer.png" , "http://www.mister-wong.com/" ] ,
  "wmzona.com" : [ "wmzona_com.png" , "http://www.wmzona.com/" ] ,
  "whatcounts" : [ "whatcounts.png" ] ,
  "web-casket" : [ "web-casket.png" , "http://www.web-casket.com/english/" ] ,
  "wanderlust" : [ "wanderlust.png" , "http://www.gohome.org/wl/" ] ,
  "wsmanager" : [ "wsmanager.png" , "http://www.webstar.ru/?content=technologies" ] ,
  "westfalia" : [ "westfalia.png" , "http://wwww.westfalia.de/" ] ,
  "west wind" : [ "westwind.png" , "http://www.west-wind.com/" ] ,
  "webrymail" : [ "biglobe.png" , "http://webrymail.biglobe.ne.jp/" ] ,
  "webmail6." : [ "webmail_us.png" , "http://www.mailtrust.com/" ] ,
  "wdcollect" : [ "plesk.png" , "http://www.parallels.com/plesk/" ] ,
  "wmw.maam" : [ "webmasterware.png" , "http://www.webmasterware.net/" ] ,
  "windmail" : [ "windmail.png" , "http://www.geocel.com/windmail/" ] ,
  "wice crm" : [ "wice_crm.png" , "http://www.wice.de/" ] ,
  "wemail32" : [ "wemail.png" , "http://www.ntes.co.jp/WeMail/" ] ,
  "web-news" : [ "web-news.png" , "http://web-news.sourceforge.net/" ] ,
  "waxtrapp" : [ "waxtrapp.png" , "http://www.waxtrapp.com/" ] ,
  "wamailer" : [ "wamailer.png" , "http://phpcodeur.net/wascripts/wamailer/" ] ,
  "wswin32" : [ "wswin32.png" , "http://www.pc-wetterstation.de/" ] ,
  "writely" : [ "writely.png" , "http://www.writely.com/" ] ,
  "winbiff" : [ "winbiff.png" , "http://www.orangesoft.co.jp/modules/pukiwiki/?Winbiff" ] ,
  "webmin" : [ "webmin.png" , "http://www.webmin.com/" ] ,
  "webcit" : [ "webcit.png" , "http://www.citadel.org/" ] ,
  "wowbb" : [ "wowbb.png" , "http://www.wowbb.com/" ] ,
  "winvn" : [ "winvn.png" , "http://science.ksc.nasa.gov/software/winvn/" ] ,
  "whups" : [ "horde.png" , "http://www.horde.org/whups/" ] ,
  "wbb" : [ "wbb.png" , "http://www.woltlab.de/" ] ,
}
dispMUA.arDispMUAAllocation["x"] =
{
  "xtreeme followupxpert" : [ "xtreeme.png" , "http://www.xtreeme.com/followupxpert/" ] ,
  "xmpp-smtp-transport" : [ "xmpp-smtp.png" , "http://gorila.netlab.cz/jabber.html" ] ,
  "xinnet.com webmail" : [ "xinnet_com.png" , "http://www.xinnet.com/" ] ,
  "xtreeme mailxpert" : [ "xtreeme.png" , "http://www.xtreeme.com/mailxpert/" ] ,
  "ximian evolution" : [ "evolution.png" , "http://www.gnome.org/projects/evolution/" ] ,
  "xp2 (crosspoint" : [ "crosspoint_xp2.png" , "http://xp2.de/" ] ,
  "xtenit mailer" : [ "xtenit.png" , "http://www.xtenit.com/" ] ,
  "xp framework" : [ "xpframework.png" , "http://xp-framework.net/" ] ,
  "x-php-script" : [ "php.png" , "http://www.php.net/" ] ,
  "x-email diag" : [ "xerox.png" , "http://www.xerox.com/" ] ,
  "xpertmailer" : [ "xpertmailer.png" , "http://www.xpertmailer.com/" ] ,
  "xmltomime" : [ "yandex_ru.png" , "http://www.yandex.ru/" ] ,
  "xanga.com" : [ "xanga.png" , "http://www.xanga.com/" ] ,
  "x-mailer" : [ "x-mailer.png" , "http://www.x-mailer.info/" ] ,
  "xananews" : [ "xananews.png" , "http://www.wilsonc.demon.co.uk/xananews.htm" ] ,
  "xs2mail" : [ "xs2mail.png" , "http://www.xs2mail.com/" ] ,
  "xanario" : [ "xanario_de.png" , "http://www.xanario.de/" ] ,
  "x-sharp" : [ "sharp.png" , "http://www.sharp.co.jp/" ] ,
  "x-point" : [ "x-point.png" ] ,
  "xqmail" : [ "xqmail.png" , "http://www.xqueue.com/" ] ,
  "xmitip" : [ "xmitip.png" , "http://www.lbdsoftware.com/xmitip.html" ] ,
  "xfmail" : [ "xfmail.png" , "http://xfmail.slappy.org/" ] ,
  "xe.com" : [ "xe_com.png" , "http://www.xe.com/" ] ,
  "xnntp" : [ "xnntp.png" , "http://www.edv-consulting-berlin.de/Xnntp/" ] ,
  "xnews" : [ "xnews.png" , "http://xnews.newsguy.com/" ] ,
  "xmail" : [ "xmail.png" , "http://lestang.org/" ] ,
  "xerox" : [ "xerox.png" , "http://www.xerox.com/" ] ,
  "xpn/" : [ "xpn.png" , "http://xpn.altervista.org/" ] ,
  "xpm4" : [ "xpm.png" , "http://www.xpertmailer.com/" ] ,
  "xpm3" : [ "xpm.png" , "http://www.xpertmailer.com/" ] ,
  "xpm2" : [ "xpm.png" , "http://www.xpertmailer.com/" ] ,
  "xrn" : [ "xrn.png" , "http://www.mit.edu/people/jik/software/xrn.html" ] ,
}
dispMUA.arDispMUAAllocation["y"] =
{
  "yahoo groups message poster" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "yet another newswatcher" : [ "ya-newswatcher.png" , "http://www.thothsw.com/yanw/" ] ,
  "yet another mail client" : [ "yamc.png" , "http://www.borg-kindberg.ac.at/yamc/" ] ,
  "yahoomailwebservice" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "yahoomailclassic" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "ya-newswatcher" : [ "ya-newswatcher.png" , "http://www.thothsw.com/yanw/" ] ,
  "yourzine.nl" : [ "yourzine_nl.png" , "http://www.yourzine.nl/" ] ,
  "yahoomailrc" : [ "yahoo.png" , "http://www.yahoo.com/" ] ,
  "yandex.ru" : [ "yandex_ru.png" , "http://www.yandex.ru/" ] ,
  "y.a.m.c.!" : [ "yamc.png" , "http://www.borg-kindberg.ac.at/yamc/" ] ,
  "yamail" : [ "yandex_ru.png" , "http://www.yandex.ru/" ] ,
  "yarn" : [ "yarn.png" , "http://www.vex.net/yarn/" ] ,
  "yabb" : [ "yabb.png" , "http://www.yabbforum.com/" ] ,
  "yum " : [ "yum.png" , "http://www.yum.de/" ] ,
  "yams" : [ "yams.png" , "http://home.hccnet.nl/s.j.francke/yams/yams.htm" ] ,
  "yam/" : [ "yam.png" , "http://www.yam.ch/" ] ,
  "yam " : [ "yam.png" , "http://www.yam.ch/" ] ,
}
dispMUA.arDispMUAAllocation["z"] =
{
  "zercom online mailer" : [ "zercom.png" ] ,
  "zope/securemailhost" : [ "zope.png" , "http://www.zope.com/" ] ,
  "zen cart mailer" : [ "zen-cart_com.png" , "http://www.zen-cart.com/" ] ,
  "zonepro france" : [ "zonepro.png" , "http://www.zonepro.fr/" ] ,
  "zendesk mailer" : [ "zendesk.png" , "http://www.zendesk.com/" ] ,
  "zend framework" : [ "zend_framework.png" , "http://framework.zend.com/" ] ,
  "zoznam mailer" : [ "zoznam.png" , "http://www.zoznam.sk/" ] ,
  "zopemailboxer" : [ "zope.png" , "http://www.zope.com/" ] ,
  "zendframework" : [ "zend_framework.png" , "http://framework.zend.com/" ] ,
  "zedat-webmail" : [ "zedat.png" , "http://www.zedat.fu-berlin.de/" ] ,
  "zatz zenpress" : [ "zatz-zenpress.png" , "http://zatzhq.zatz.com/zenpress" ] ,
  "zen mailer" : [ "zenmailer.png" , "http://www.zen-e-solutions.com/product4.htm" ] ,
  "zuckmail" : [ "facebook.png" , "http://www.facebook.com/press/info.php?execbios" ] ,
  "z-mailer" : [ "z-mailer.png" , "http://www.z57.com/" ] ,
  "zmailer" : [ "zmailer.png" , "http://www.zmailer.org/" ] ,
  "zimbra" : [ "zimbra.png" , "http://www.zimbra.com/" ] ,
  "zimacs" : [ "zimacs.png" , "http://zimacs.zetnet.co.uk/" ] ,
  "zarafa" : [ "zarafa.png" , "http://www.zarafaserver.de/" ] ,
  "z-mail" : [ "z-mail.png" , "http://www.well.com/user/barts/mush.html" ] ,
  "zmail" : [ "zmail.png" , "http://zsentry.com/ZMAIL.htm" ] ,
  "zend " : [ "zend.png" , "http://www.zend.com/" ] ,
}
//Search for user agents with short names
//This here is matching the whole string like regexp m/\A$name\Z/i
dispMUA.arDispMUAAllocation["fullmatch"] =
{
  "ec mailer" : [ "eurochallenges_com.png" , "http://www.eurochallenges.com/" ] ,
  "yourzine" : [ "yourzine_nl.png" , "http://www.yourzine.nl/" ] ,
  "westcall" : [ "westcall.png" , "http://westcall.spb.ru/" ] ,
  "webmart" : [ "webmart.png" , "http://www.webmart.de/" ] ,
  "webmail" : [ "1und1-webmail.png" , "http://www.1und1.de/" ] ,
  "pixi" : [ "pixi.png" , "http://www.madgeniuses.net/pixi-versandhandelssoftware.html" ] ,
  "amlc" : [ "amlc.png" , "http://www.arclab.com/products/amlc/" ] ,
  "tin" : [ "tin.png" , "http://www.tin.org/" ] ,
  "php" : [ "php.png" , "http://www.php.net/" ] ,
  "mp5" : [ "mail-performance.png" , "http://www.mailperformance.com/" ] ,
  "mp6" : [ "mail-performance.png" , "http://www.mailperformance.com/" ] ,
  "fon" : [ "fon.png" , "http://www.fon.com/" ] ,
  "aur" : [ "archlinux.png" , "http://aur.archlinux.org/" ] ,
  "mh" : [ "gnu.png" , "http://www.gnu.org/software/mailutils/" ] ,
  "cr" : [ "cleverreach_de.png" , "http://www.cleverreach.de/" ] ,
}
//User agents not recognized at all -> checking for Message-ID
//This here have to be anywhere in the identification line
//Font: UTF-8 (Ä Ö Ü)
dispMUA.arDispMUAAllocation["message-id"] =
{
  "@sitepoint.sparklist.com>" : [ "sparklist_com.png" , "http://www.sparklist.com/" , "sparklist" ] ,
  ".javamail.ngmail@webmail" : [ "arcor.png" , "http://www.arcor.de/" , "ARCOR" ] ,
  "@soquel.corp.apple.com>" : [ "apple_itunes.png" , "http://www.itunes.com/" , "Apple iTunes" ] ,
  "@secure.eve-online.com>" : [ "eve-online.png" , "http://www.eve-online.com/" , "EVE online" ] ,
  "<http://www.zataz.com/" : [ "zataz_com.png" , "http://www.zataz.com/" , "ZATAZ.com" ] ,
  ".sonyericssonmail.com>" : [ "sonyericsson.png" , "http://www.sonyericsson.com/" , "Sony Ericsson" ] ,
  "@www.norma-online.de>" : [ "norma-online_de.png" , "http://www.norma-online.de/" , "NORMA Online" ] ,
  "@yahoogrupos.com.br>" : [ "yahoo_groups_br.png" , "http://br.groups.yahoo.com/" , "Yahoo Brasil Grupos" ] ,
  "@www.pc-special.net>" : [ "pc-special_net.png" , "http://www.pc-special.net/" , "PC-Special.net" ] ,
  "@youropenvideo.com>" : [ "youropenmedia_com.png" , "http://www.youropenmedia.com/" , "Your Open Media" ] ,
  "@www.lastfm.com.tr>" : [ "last-fm.png" , "http://www.lastfm.com.tr/" , "Last.fm" ] ,
  "@www.lastfm.com.br>" : [ "last-fm.png" , "http://www.lastfm.com.br/" , "Last.fm" ] ,
  "@uci-kinowelt.info>" : [ "uci-kinowelt.png" , "http://www.uci-kinowelt.de/" , "UCI KINOWELT" ] ,
  "@email.android.com>" : [ "google_android.png" , "http://www.android.com/" , "Google Android System" ] ,
  "blackberry.rim.net" : [ "blackberry.png" , "http://www.blackberry.com/" , "Blackberry" ] ,
  "@www.spotlight.de>" : [ "spotlight.png" , "http://www.spotlight.de/" , "Spotlight.de - Die Net(te) Community" ] ,
  "@www.kiapress.com>" : [ "kia.png" , "http://www.kiapress.com/" , "KIA" ] ,
  "@amg.allmusic.com>" : [ "allmusic.png" , "http://www.allmusic.com/" , "THE ALLMUSIC BLOG" ] ,
  ".rightnowtech.com>" : [ "rightnowtech.png" , "http://www.rightnow.com/" , "RightNow Technologies" ] ,
  ".germany.jobpilot>" : [ "jobpilot_de.png" , "http://www.jobpilot.de/" , "jobpilot.de" ] ,
  ".evanzo-server.de>" : [ "evanzo.png" , "http://www.evanzo.de/" , "!EVANZO!" ] ,
  ".cortalconsors.de>" : [ "cortalconsors.png" , "http://www.cortalconsors.de/" , "Cortal Consors" ] ,
  ".browsershots.org>" : [ "browsershots_org.png" , "http://browsershots.org/" , "Browsershots" ] ,
  ".arcor-online.net>" : [ "arcor.png" , "http://www.arcor.de/" , "ARCOR" ] ,
  "@yahoogroups.com>" : [ "yahoo_groups.png" , "http://groups.yahoo.com/" , "Yahoo Groups" ] ,
  "@yahoogroupes.fr>" : [ "yahoo_groups_fr.png" , "http://fr.groups.yahoo.com/" , "Yahoo France Groupes" ] ,
  "@relay.skynet.be>" : [ "skynet_be.png" , "http://www.skynet.be/" , "skynet Belgacom" ] ,
  "@merter-musek.lu>" : [ "musek_lu.png" , "http://www.merter-musek.lu/" , "Merter Musek" ] ,
  ".thestandard.com>" : [ "thestandard_com.png" , "http://www.thestandard.com/" , "The Industry Standard" ] ,
  ".mailinblack.com>" : [ "mailinblack.png" , "http://mailinblack.com/" , "MAILinBlack" ] ,
  ".kundenserver.de>" : [ "1und1.png" , "http://www.1und1.de/" , "1&1" ] ,
  ".auctionweb.info>" : [ "auktionmaster.png" , "http://www.auktionmaster.de/" , "AuctionWeb" ] ,
  "@poczta.jaaz.pl>" : [ "jaaz_pl.png" , "http://www.jaaz.pl/" , "jaaz.pl" ] ,
  "@iwantsandy.com>" : [ "sandy.png" , "http://www.iwantsandy.com/" , "Sandy" ] ,
  "@googlemail.com>" : [ "google_mail.png" , "http://www.googlemail.com/" , "Google Mail" ] ,
  ".youthhostel.ch>" : [ "youthhostel_ch.png" , "http://www.youthhostel.ch/" , "Swiss Youthhostels" ] ,
  ".trendmicro.com>" : [ "trendmicro.png" , "http://www.trendmicro.com/" , "TrendMicro" ] ,
  ".telenet-ops.be>" : [ "telenet_be.png" , "http://telenet.be/" , "Telenet" ] ,
  ".corp.yahoo.com>" : [ "yahoo-inc.png" , "http://info.yahoo.com/center/us/yahoo/" , "Yahoo! Inc" ] ,
  ".auckland.ac.nz>" : [ "uni_auckland.png" , "http://www.auckland.ac.nz/" , "The University of Auckland" ] ,
  ".altervista.org>" : [ "altervista.png" , "http://www.altervista.org/" , "alterVISTA" ] ,
  "@yahoo-inc.com>" : [ "yahoo-inc.png" , "http://info.yahoo.com/center/us/yahoo/" , "Yahoo! Inc" ] ,
  "@www.lastfm.se>" : [ "last-fm.png" , "http://www.lastfm.se/" , "Last.fm" ] ,
  "@www.lastfm.ru>" : [ "last-fm.png" , "http://www.lastfm.ru/" , "Last.fm" ] ,
  "@www.lastfm.pl>" : [ "last-fm.png" , "http://www.lastfm.pl/" , "Last.fm" ] ,
  "@www.lastfm.jp>" : [ "last-fm.png" , "http://www.lastfm.jp/" , "Last.fm" ] ,
  "@www.lastfm.it>" : [ "last-fm.png" , "http://www.lastfm.it/" , "Last.fm" ] ,
  "@www.lastfm.fr>" : [ "last-fm.png" , "http://www.lastfm.fr/" , "Last.fm" ] ,
  "@www.lastfm.es>" : [ "last-fm.png" , "http://www.lastfm.es/" , "Last.fm" ] ,
  "@www.lastfm.de>" : [ "last-fm.png" , "http://www.lastfm.de/" , "Last.fm" ] ,
  "@trashmail.net>" : [ "trashmail.png" , "http://www.trashmail.net/" , "TrashMail" ] ,
  "@smarttools.de>" : [ "smarttools.png" , "http://www.smarttools.de/" , "SmartTools" ] ,
  "@genealogy.net>" : [ "genealogy_net.png" , "http://www.genealogy.net/" , "Verein f. Computergenealogie" ] ,
  "@de.domeus.com>" : [ "ecircle.png" , "http://www.domeus.de/" , "domeus" ] ,
  ".yousendit.com>" : [ "yousendit.png" , "http://www.yousendit.com/" , "YouSendIt" ] ,
  ".microsoft.com>" : [ "microsoft.png" , "http://www.microsoft.com/" , "Microsoft" ] ,
  ".hosteurope.de>" : [ "hosteurope_de.png" , "http://www.hosteurope.de/" , "Host Europe" ] ,
  "@vdo-out-f.ax>" : [ "continental.png" , "http://www.vdo.de/" , "Continental" ] ,
  "@mail.kios.sk>" : [ "kerio_ms.png" , "http://www.kerio.com/kms_home.html" , "Kerio MailServer" ] ,
  "@kundenserver>" : [ "1und1.png" , "http://www.1und1.de/" , "1&1" ] ,
  "@docomo.ne.jp>" : [ "nttdocomo.png" , "http://www.nttdocomo.co.jp/" , "NTT docomo" ] ,
  ".truition.com>" : [ "truition.png" , "http://www.truition.com/" , "Truition" ] ,
  ".spickmich.de>" : [ "spickmich.png" , "http://www.spickmich.de/" , "spickmich.de" ] ,
  ".points24.com>" : [ "points24_com.png" , "http://www.points24.com/" , "points24.com" ] ,
  ".moikrewni.pl>" : [ "moikrewni_pl.png" , "http://www.moikrewni.pl/" , "moikrewni.pl" ] ,
  ".mail2web.com>" : [ "mail2web_com.png" , "http://www.mail2web.com/" , "mail2web.com" ] ,
  ".helukabel.de>" : [ "helukabel.png" , "http://helukabel.de/" , "HELUKABEL" ] ,
  ".comdirect.de>" : [ "comdirect_de.png" , "http://www.comdirect.de/" , "comdirect bank AG" ] ,
  "@www.last.fm>" : [ "last-fm.png" , "http://www.last.fm/" , "Last.fm" ] ,
  "@youtube.com>" : [ "youtube.png" , "http://www.youtube.com/" , "YouTube" ] ,
  "@t-online.de>" : [ "t-online.png" , "http://www.t-online.de/" , "T-Online" ] ,
  "@smtp.hm.com>" : [ "hm_com.png" , "http://www.hm.com/" , "H&M" ] ,
  "@homes.co.jp>" : [ "homes_co_jp.png" , "http://www.homes.co.jp/" , "HOME'S" ] ,
  "@akzente.net>" : [ "akzente_net.png" , "http://www.akzente.net/" , "Akzente Salzburg" ] ,
  ".yahoo.co.jp>" : [ "yahoo.png" , "http://mail.yahoo.co.jp/" , "Yahoo! Mail" ] ,
  ".versatel.de>" : [ "versatel.png" , "http://www.versatel.de/" , "versatel" ] ,
  ".studivz.net>" : [ "studivz.png" , "http://www.studivz.net/" , "studiVZ" ] ,
  ".opendns.com>" : [ "opendns.png" , "http://www.opendns.com/" , "openDNS" ] ,
  ".mozilla.org>" : [ "mozilla.png" , "http://www.mozilla.org/" , "Mozilla" ] ,
  ".klicktel.de>" : [ "klicktel_de.png" , "http://www.klicktel.de/" , "klickTel.de" ] ,
  ".gmx-gmbh.de>" : [ "gmx.png" , "http://www.gmx.de/" , "GMX" ] ,
  ".freemail.hu>" : [ "freemail_hu.png" , "http://www.freemail.hu/" , "freemail.hu" ] ,
  ".emarsys.net>" : [ "emarsys.png" , "http://www.emarsys.de/" , "Emarsys" ] ,
  ".dab-bank.de>" : [ "dab-bank_de.png" , "http://www.dab-bank.de/" , "DAB bank" ] ,
  "@vilitas.de>" : [ "vilitas.png" , "http://www.vilitas.de/" , "Vilitas Merchandise" ] ,
  "@paypal.com>" : [ "paypal.png" , "http://www.paypal.com/" , "PayPal" ] ,
  "@interia.pl>" : [ "interia_pl.png" , "http://www.interia.pl/" , "interia.pl" ] ,
  "@immonet.de>" : [ "immonet_de.png" , "http://www.immonet.de/" , "immonet.de" ] ,
  "@ikoula.com>" : [ "ikoula.png" , "http://www.ikoula.com/" , "ikoula" ] ,
  "@google.com>" : [ "google.png" , "http://www.google.com/" , "Google" ] ,
  "@cn.last.fm>" : [ "last-fm.png" , "http://cn.last.fm/" , "Last.fm" ] ,
  ".udmedia.de>" : [ "udmedia_de.png" , "http://www.udmedia.de/" , "UD Media" ] ,
  ".tiscali.de>" : [ "tiscali_de.png" , "http://www.tiscali.de/" , "Tiscali Deutschland" ] ,
  ".tipp24.net>" : [ "lotto.png" , "http://www.tipp24.com/" , "Tipp24" ] ,
  ".oracle.com>" : [ "oracle.png" , "http://www.oracle.com/" , "ORACLE" ] ,
  ".nabble.com>" : [ "nabble.png" , "http://www.nabble.com/" , "Nabble" ] ,
  ".google.com>" : [ "google.png" , "http://www.google.com/" , "Google" ] ,
  ".bluewin.ch>" : [ "bluewin_ch.png" , "http://www.bluewin.ch/" , "bluewin.ch" ] ,
  ".amazon.com>" : [ "amazon.png" , "http://www.amazon.com/" , "Amazon" ] ,
  ".allianz.de>" : [ "allianz_de.png" , "http://www.allianz.de/" , "Allianz" ] ,
  "@walla.com>" : [ "walla.png" , "http://www.walla.co.il/" , "Walla!" ] ,
  "@strato.de>" : [ "strato.png" , "http://www.strato.de/" , "STRATO AG" ] ,
  "@seznam.cz>" : [ "seznam_cz.png" , "http://www.seznam.cz/" , "Seznam" ] ,
  "@operon.pl>" : [ "operon_pl.png" , "http://www.operon.pl/" , "operon.pl" ] ,
  "@libero.it>" : [ "libero_it.png" , "http://liberomail.libero.it/" , "libero.it" ] ,
  "@gmail.com>" : [ "google_mail.png" , "http://www.gmail.com/" , "Google Mail" ] ,
  "@fritz.box>" : [ "fritzbox.png" , "http://www.avm.de/" , "FRITZ!Box" ] ,
  "@cvsserver>" : [ "cvs.png" , "" , "CVS" ] ,
  "@conrad.de>" : [ "conrad.png" , "http://www.conrad.de/" , "Conrad Electronic" ] ,
  ".yahoo.com>" : [ "yahoo.png" , "http://www.yahoo.com/" , "Yahoo" ] ,
  ".strato.de>" : [ "strato.png" , "http://www.strato.de/" , "STRATO AG" ] ,
  ".paypal.de>" : [ "paypal.png" , "http://www.paypal.de/" , "PayPal" ] ,
  ".orange.sk>" : [ "orange.png" , "http://www.orangeportal.sk/" , "Orange Slovensko" ] ,
  ".oleco.com>" : [ "oleco_com.png" , "http://www.oleco.com/" , "Oleco" ] ,
  ".nestle.de>" : [ "nestle.png" , "http://www.nestle.de/" , "Nestle" ] ,
  ".libero.it>" : [ "libero_it.png" , "http://liberomail.libero.it/" , "libero.it" ] ,
  ".gmail.com>" : [ "google_mail.png" , "http://www.gmail.com/" , "Google Mail" ] ,
  ".avira.com>" : [ "avira.png" , "http://www.avira.com/" , "Avira" ] ,
  ".apple.com>" : [ "apple.png" , "http://www.apple.com/" , "Apple" ] ,
  ".ampega.de>" : [ "ampega.png" , "http://www.ampegagerling.de/" , "ampegaGerling.de" ] ,
  ".1and1.com>" : [ "1und1.png" , "http://www.1and1.com/" , "1&1" ] ,
  "@xmr3.com>" : [ "xmr3_com.png" , "http://www.xmr3.com/" , "messageReach" ] ,
  "@funke.de>" : [ "funke_de.png" , "http://www.funke.de/" , "FUNKE GmbH" ] ,
  "@be3a.com>" : [ "be3a.png" , "http://www.be3a.com/" , "B!3A" ] ,
  "@agfeo.de>" : [ "agfeo.png" , "http://www.agfeo.de/" , "AGFEO" ] ,
  ".xing.com>" : [ "xing.png" , "http://www.xing.com/" , "XING" ] ,
  ".xbox.com>" : [ "xbox.png" , "http://www.xbox.com/" , "XBOX" ] ,
  ".usps.gov>" : [ "usps.png" , "http://www.usps.com/" ] ,
  ".ucsf.edu>" : [ "ucsf.png" , "http://www.ucsf.edu/" , "University of California, San Francisco" ] ,
  ".nokia.at>" : [ "nokia.png" , "http://www.nokia.at/" , "Nokia (Austria)" ] ,
  ".lidl.net>" : [ "lidl.png" , "http://www.lidl.net/" , "Lidl Online" ] ,
  ".kwick.de>" : [ "kwick.png" , "http://www.kwick.de/" , "KWICK! Community" ] ,
  ".kilu.net>" : [ "kilu_de.png" , "http://www.kilu.de/" , "Kilu" ] ,
  ".ikea.com>" : [ "ikea.png" , "http://www.ikea.com/" , "IKEA" ] ,
  ".iacd.net>" : [ "iacd_net.png" , "http://www.iacd.net/" , "Internet Access Center Düsseldorf" ] ,
  ".heise.de>" : [ "heise.png" , "http://www.heise.de/" , "Heise Online" ] ,
  ".golem.de>" : [ "golem.png" , "http://www.golem.de/" , "Golem.de" ] ,
  ".fagms.de>" : [ "mailsolution_de.png" , "http://www.mailsolution.de/" , "United Mailsolutions" ] ,
  ".ebay.com>" : [ "ebay.png" , "http://www.ebay.com/" , "ebay" ] ,
  ".dell.com>" : [ "dell.png" , "http://www.dell.com/" , "Dell" ] ,
  ".aakus.de>" : [ "aakus_de.png" , "http://www.aakus.com/" , "Äakus AG" ] ,
  ".1und1.de>" : [ "1und1.png" , "http://www.1und1.de/" , "1&1" ] ,
  "<mdaemon-" : [ "mdaemon.png" , "http://www.interbel.es/productos/mdaemon/" , "MDaemon" ] ,
  "@phx.gbl>" : [ "msn.png" , "http://www.msn.com/" , "MSN" ] ,
  "@lidl.nl>" : [ "lidl.png" , "http://www.lidl.nl/" , "Lidl.nl" ] ,
  "@lidl.fr>" : [ "lidl.png" , "http://www.lidl.fr/" , "Lidl.fr" ] ,
  "@lidl.de>" : [ "lidl.png" , "http://www.lidl.de/" , "Lidl.de" ] ,
  "@lidl.be>" : [ "lidl.png" , "http://www.lidl.be/" , "Lidl.be" ] ,
  "@gmx.net>" : [ "gmx.png" , "http://www.gmx.net/" , "GMX" ] ,
  ".ups.com>" : [ "ups.png" , "http://www.ups.com/" , "United Parcel Service" ] ,
  ".otto.de>" : [ "otto_de.png" , "http://www.otto.de/" , "Otto Versand" ] ,
  ".mail.ru>" : [ "mail_ru.png" , "http://www.mail.ru/" , "@mail.ru" ] ,
  ".mail.ee>" : [ "mail_ee.png" , "http://www.mail.ee/" , "Mail.ee" ] ,
  ".gmx.net>" : [ "gmx.png" , "http://www.gmx.net/" , "GMX" ] ,
  ".ibm.com>" : [ "ibm.png" , "http://www.ibm.com/" , "IBM" ] ,
  ".chip.de>" : [ "chip_de.png" , "http://www.chip.de/" , "CHIP Online" ] ,
  ".cevi.be>" : [ "cevi_be.png" , "http://www.cevi.be/" , "Cevi NV" ] ,
  ".buch.de>" : [ "buch_de.png" , "http://www.buch.de/" , "buch.de" ] ,
  "@web.de>" : [ "web_de.png" , "http://www.web.de/" , "Web.de" ] ,
  "@gmx.de>" : [ "gmx.png" , "http://www.gmx.de/" , "GMX" ] ,
  "@gmx.ch>" : [ "gmx.png" , "http://www.gmx.ch/" , "GMX" ] ,
  "@avm.de>" : [ "avm_de.png" , "http://www.avm.de/" , "AVM" ] ,
  ".web.de>" : [ "web_de.png" , "http://www.web.de/" , "Web.de" ] ,
  ".sko.de>" : [ "crednet.png" , "http://www.sko.de/" , "crednet" ] ,
  ".sbs.de>" : [ "siemens.png" , "http://www.sbs.de/" , "Siemens" ] ,
  ".one.lt>" : [ "one.png" , "http://www.one.lt/" , "ONE webmail" ] ,
  ".one.lv>" : [ "one.png" , "http://www.one.lv/" , "ONE webmail" ] ,
  ".kei.pl>" : [ "kei_pl.png" , "http://www.kei.pl/" , "Kei.pl" ] ,
  "<paypal." : [ "paypal.png" , "http://www.paypal.com/" , "PayPal" ] ,
  "@o2.pl>" : [ "o2_pl.png" , "http://www.o2.pl/" , "o2.pl" ] ,
  ".tmail>" : [ "tmail.png" , "http://tmail.rubyforge.org/" , "TMail" ] ,
  ".qmail@" : [ "qmail.png" , "http://www.qmail.org/" ] ,
  ".ezmlm@" : [ "ezmlm.png" , "http://cr.yp.to/ezmlm.html" , "ezmlm" ] ,
  ".ba.de>" : [ "ba.png" , "http://www.arbeitsagentur.de/" ] ,
  "<lyris-" : [ "lyris.png" , "http://www.lyris.com/" , "Lyris" ] ,
  "<pine." : [ "pine.png" , "http://www.washington.edu/pine/" , "Pine" ] ,
  "<rt-" : [ "bestpractical_com.png" , "http://bestpractical.com/rt/" , "RT: Request Tracker" ] ,
// Fallback
  ".javamail." : [ "javamail.png" , "http://java.sun.com/products/javamail/" , "JavaMail" ] ,
}
//User agents not recognized at all -> checking for organization
//This here have to be anywhere in the identification line
dispMUA.arDispMUAAllocation["organization"] =
{
  "tp - http://www.tp.pl/" : [ "tp_pl.png" , "http://www.tp.pl/" ] ,
  "http://www.gazeta.pl" : [ "gazeta_pl.png" , "http://www.gazeta.pl/" ] ,
  "cctld .it registry" : [ "nic_it.png" , "http://www.nic.it/" ] ,
  "portal gazeta.pl" : [ "gazeta_pl.png" , "http://www.gazeta.pl/" ] ,
  "freemail.web.de" : [ "web_de.png" , "http://www.web.de/" ] ,
  "http://web.de" : [ "web_de.png" , "http://www.web.de/" ] ,
  "groups.google" : [ "google_groups.png" , "http://groups.google.com/" ] ,
  "astronews.com" : [ "astronews_com.png" , "http://www.astronews.com/" ] ,
  "context gmbh" : [ "context_gmbh.png" , "http://www.context-gmbh.de/" ] ,
  "juniper" : [ "juniper.png" , "http://www.juniper.net/" ] ,
  "cisco" : [ "cisco.png" , "http://www.cisco.com/" ] ,
}
//User agents not recognized by presearch and a-z search
//This here have to be anywhere in the identification line
dispMUA.arDispMUAAllocation["postsearch"] =
{
  "www.gossamer-threads.com" : [ "gossamer.png" , "http://www.gossamer-threads.com/scripts/webmail/" ] ,
  "global message exchange" : [ "gmx.png" , "http://www.gmx.net/" ] ,
  "http://counter.li.org" : [ "linuxcounter.png" , "http://counter.li.org/" ] ,
  "global mail exchange" : [ "gmx.png" , "http://www.gmx.com/" ] ,
  "registered ak-mail" : [ "ak-mail.png" , "http://www.akmail.com/" ] ,
  "communigate(r) pro" : [ "communigatepro.png" , "http://www.communigate.com/CommuniGatePro/" ] ,
  "-de-c_briefe emm v" : [ "intershop.png" , "http://www.intershop.de/" ] ,
  "http://gmane.org/" : [ "gmane.png" , "http://gmane.org/" ] ,
  ".mail.yahoo.com" : [ "yahoo.png" , "http://mail.yahoo.com/" ] ,
  "/pinoymail.com" : [ "pinoymail_com.png" , "http://www.pinoymail.com/" ] ,
  "www.chello.at" : [ "chello_at.png" , "http://www.chello.at/" ] ,
  "m5mailer.com" : [ "m5_mailer.png" , "http://www.mach5.com/products/mailer/" ] ,
  ".apache.org)" : [ "apache.png" , "http://www.apache.org/" ] ,
  "zentraldata" : [ "zentraldata.png" , "http://www.zentraldata.de/" ] ,
  "www.xp2.de" : [ "crosspoint_xp2.png" , "http://xp2.de/" ] ,
  "egroupware" : [ "egroupware.png" ] ,
  "pochta.ru" : [ "pochta_ru.png" , "http://www.pochta.ru/" ] ,
  "libero.it" : [ "libero_it.png" , "http://liberomail.libero.it/" ] ,
  "entourage" : [ "ms_entourage.png" , "http://www.microsoft.com/" ] ,
  "-nl emm v" : [ "intershop.png" , "http://www.intershop.de/" ] ,
  "mozilla" : [ "mozilla.png" , "http://www.mozilla.org/" ] ,
  "emacs/" : [ "emacs.png" , "http://www.gnu.org/software/emacs/" ] ,
}
//The user agents used at most - this array is accessed at first
//This here have to be anywhere in the identification line
dispMUA.arDispMUAAllocation["presearch"] =
{
  "thunderbird " : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "thunderbird/" : [ "thunderbird.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "seamonkey/" : [ "seamonkey.png" , "http://www.seamonkey-project.org/" ] ,
  "shredder/" : [ "shredder.png" , "http://www.mozilla.com/thunderbird/" ] ,
  "netscape/" : [ "netscape.png" , "http://mailnews.netscape.com/releases" ] ,
  "firefox/" : [ "firefox.png" , "http://www.mozilla.com/firefox/" ] ,
  "eudora/" : [ "eudora.png" , "http://www.eudora.com/" ] ,
}
//User agents not recognized at all -> checking for X-MimeOLE
//This here have to be anywhere in the identification line
dispMUA.arDispMUAAllocation["x-mimeole"] =
{
  "produced by phpbb2" : [ "phpbb2.png" , "http://www.phpbb2.de/" ] ,
  "exchange" : [ "ms_exchange.png" , "http://www.microsoft.com/" , "" ] ,
  "mimeole" : [ "ms_outlook.png" , "http://www.microsoft.com/" , "" ] ,
}
