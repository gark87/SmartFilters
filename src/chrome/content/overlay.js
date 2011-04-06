function startSmartFilters()
{
  window.openDialog("chrome://smartfilters/content/smartfilters.xul",
    "global:smartfilters", "chrome,centerscreen",
    { folderURI: GetSelectedFolderURI() } );
}
