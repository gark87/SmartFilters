function VirtualFoldersBackend(onlineSearch) {
  this.wrapFolder = function(folder) {
    return VirtualFolderHelper.wrapVirtualFolder(currentFolder);
  }

  this.createFolder = function(newFolderName, currentFolder, folder) {
    return VirtualFolderHelper.createNewVirtualFolder
	    (newFolderName, currentFolder, [folder], [], onlineSearch)
	    .virtualFolder;
  }

  this.apply = function(checkedItems, folder) {
    var folders = this.createFolders(checkedItems, folder);
    for (var i = 0 ; i < checkedItems.length; i++) {
      var item = checkedItems[i];
      var textbox = document.getAnonymousElementByAttribute(item, "anonid", "smartfilters-folder");
      folders[textbox.value].searchTerms = this.createTerms(item);
    }
  }
}

