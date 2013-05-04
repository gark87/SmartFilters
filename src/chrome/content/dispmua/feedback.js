function init()
{
  var bundle = document.getElementById ( "dispmua-strings" ) ;
  var icon = window.arguments[0] ;
  var MUAstring1 = window.arguments[1] ;
  var color = window.arguments[2] ;
  var MUAstring2 = "" ;
  var pos = MUAstring1.indexOf ( "\n" ) ;

  if ( pos != -1 )
  {
    MUAstring2 = MUAstring1.substr ( pos + 1 ) ;
    MUAstring1 = MUAstring1.substr ( 0 , pos ) ;
  }

  document.getElementById ( "feedback-throbber" ).src = "chrome://dispmua/skin/throbber.png" ;
  document.getElementById ( "feedback-icon" ).src = icon ;
  document.getElementById ( "feedback-icon" ).setAttribute ( "tooltiptext" , window.arguments[4] ) ;
  document.getElementById ( "feedback-MUA1" ).setAttribute ( "value" , MUAstring1 ) ;
  document.getElementById ( "feedback-MUA2" ).setAttribute ( "value" , MUAstring2 ) ;
  document.getElementById ( "feedback-supported" ).setAttribute ( "value" , window.arguments[3] ) ;
  document.getElementById ( "feedback-supported" ).setAttribute ( "style" , "color:" + color ) ;
  document.getElementById ( "feedback-mailinfo1" ).setAttribute ( "value" , bundle.getString ( "feedback.mailinfo1" ) ) ;
  document.getElementById ( "feedback-mailinfo2" ).setAttribute ( "value" , bundle.getString ( "feedback.mailinfo2" ) ) ;
  document.getElementById ( "feedback-iconinfo" ).setAttribute ( "value" , bundle.getString ( "feedback.iconinfo" ) ) ;
  document.getElementById ( "feedback-button-close" ).focus() ;
}

function doKeypress ( ev )
{
  if ( ev.keyCode == KeyEvent.DOM_VK_ESCAPE )
  {
    doClose() ;
  }
  else if ( ev.keyCode == KeyEvent.DOM_VK_RETURN )
  {
    var focused = document.commandDispatcher.focusedElement ;

    if ( document.getElementById ( "feedback-button-close" ) == focused )
    {
      doClose() ;
    }

    if ( document.getElementById ( "feedback-button-send" ) == focused )
    {
      doSend() ;
    }
  }
}

function doSend()
{
  var thisID = "{F8147CF4-B9E3-445B-AA87-081ED66548F8}" ;

  try
  {  
    // Firefox 4 and later; Mozilla 2 and later  
    Components.utils.import ( "resource://gre/modules/AddonManager.jsm" ) ;
    AddonManager.getAddonByID ( thisID , function ( thisaddon )
    {
      buildMail ( thisaddon.version ) ;
    } ) ;
  }
  catch ( ex )
  {
    // Firefox 3.6 and before; Mozilla 1.9.2 and before
    var extManager = Components.classes["@mozilla.org/extensions/manager;1"].getService ( Components.interfaces.nsIExtensionManager ) ;
    var thisaddon = extManager.getItemForID ( thisID ) ;
    buildMail ( thisaddon.version ) ;
  }
}

function buildMail ( version )
{
  var bundle = document.getElementById ( "dispmua-strings" ) ;
  var email = "info@juergen-ernst.de" ;
  var subject = bundle.getString ( "feedback.subject" ) + " " + version ;
  var body = bundle.getString ( "feedback.body.MUA" ) + "\n" +
  window.arguments[1] + "\n\n" +
  bundle.getString ( "feedback.body.url" ) + "\n\n" +
  bundle.getString ( "feedback.body.icon" ) + "\n" +
  bundle.getString ( "feedback.iconinfo" ) + "\n\n\n\n\n" +
  "------------------------------\n" + window.arguments[5] ;
  openFeedbackMail ( email , subject , body ) ;
  doClose ( 1500 ) ;
}

function doClose ( time )
{
  if ( !time )
  {
    time = 10 ;
  }

  setTimeout ( "window.close();" , time ) ;
}

function doOpenURL()
{
  var url = window.arguments[4] ;

  if ( url )
  {
    document.getElementById ( "feedback-throbber" ).src = "chrome://dispmua/skin/throbber.gif" ;

    try
    {
      var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance ( Components.interfaces.nsIMessenger ) ;
      messenger.launchExternalURL ( url ) ;
    } catch (ex) {}

    doClose ( 2500 ) ;
  }
}

function openFeedbackMail ( email , subject , body )
{
  var msgComposeType = Components.interfaces.nsIMsgCompType ;
  var msgComposeFormat = Components.interfaces.nsIMsgCompFormat ;
  var msgComposer = Components.classes['@mozilla.org/messengercompose;1'].getService().QueryInterface ( Components.interfaces.nsIMsgComposeService ) ;
  var compParams = Components.classes['@mozilla.org/messengercompose/composeparams;1'].createInstance ( Components.interfaces.nsIMsgComposeParams ) ;

  if ( compParams )
  {
    compParams.type = msgComposeType.Template ;
    compParams.format = msgComposeFormat.PlainText ;
    var compFields = Components.classes['@mozilla.org/messengercompose/composefields;1'].createInstance ( Components.interfaces.nsIMsgCompFields ) ;

    if ( compFields )
    {
      compFields.to = email ;
      compFields.subject = subject ;
      compFields.body = body ;
      compParams.composeFields = compFields ;
      msgComposer.OpenComposeWindowWithParams ( null , compParams ) ;
    }
  }
}
