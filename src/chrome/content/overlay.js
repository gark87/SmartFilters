function startSmartFilters()
{
  var msgFolder = gFolderDisplay.displayedFolder;

  window.openDialog("chrome://smartfilters/content/smartfilters.xul",
    "global:smartfilters", "chrome,centerscreen",
    { folder: msgFolder, msgWindow: msgWindow} );
}
