function startSmartFilters()
{
  var preselectedURI = GetSelectedFolderURI();
  var msgFolder = GetMsgFolderFromUri(preselectedURI, true);

  window.openDialog("chrome://smartfilters/content/smartfilters.xul",
    "global:smartfilters", "chrome,centerscreen",
    { folder: msgFolder, msgWindow: msgWindow} );
}
