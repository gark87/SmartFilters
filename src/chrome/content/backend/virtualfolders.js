function VirtualFoldersBackend(onlineSearch) {
   var createFolder = function(newFolderName, currentFolder, folder) {
    return VirtualFolderHelper.createNewVirtualFolder
	    (newFolderName, currentFolder, [folder], [], onlineSearch)
	    .virtualFolder;
  }

  var createFolders = function(items, folder) {
    var result = {};
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var textbox = document.getAnonymousElementByAttribute(item, "anonid", "smartfilters-folder");
      var relativePath = textbox.value;
      var folders = relativePath.split(".");
      var currentFolder = folder;
      for(var j = 0; j < folders.length; j++) {
	var newFolderName = folders[j];
	if (currentFolder.containsChildNamed(newFolderName))
	  currentFolder = currentFolder.getChildNamed(newFolderName);
	else
	  currentFolder = 
	    createFolder(newFolderName, currentFolder, folder);
      }
      result[relativePath] = 
		VirtualFolderHelper.wrapVirtualFolder(currentFolder);
    }
    return result;
  }

  this.apply = function(checkedItems, folder) {
    var folders = createFolders(checkedItems, folder);
    alert(this.createTerms + " " + this.prototype);
    for (var i = 0 ; i < checkedItems.length; i++) {
      var item = checkedItems[i];
      var textbox = document.getAnonymousElementByAttribute(item, "anonid", "smartfilters-folder");
      folders[textbox.value].searchTerms = this.createTerms(item);
    }
  }
}

