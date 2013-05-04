dispMUA.init_overlay = function()
{
  if ( dispMUA.bundle != null )
  {
    return ;
  }

  dispMUA.bundle = document.getElementById ( "dispmua-strings" ) ;

  var listener = {} ;
  listener.onStartHeaders = function(){} ;
  listener.onEndHeaders = dispMUA.loadHeaderData ;
  gMessageListeners.push ( listener ) ;

  var elem = document.getElementById ( "mailContext" ) ;

  if ( elem )
  {
    elem.addEventListener ( "popupshowing" , dispMUA.checktextPopup , false ) ;
  }

  dispMUA.loadMUAOverlayFile() ;
}

window.addEventListener ( "messagepane-loaded" , dispMUA.init_overlay , true ) ;
