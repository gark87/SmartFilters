function startSmartFilters()
{
  var msgFolder = gFolderDisplay.displayedFolder;

  window.openDialog("chrome://smartfilters/content/smartfilters.xul",
    "global:smartfilters", "all",
    { folder: msgFolder, msgWindow: msgWindow} );
}
