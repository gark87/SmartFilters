Components.utils.import("resource:///modules/virtualFolderWrapper.js");

function VirtualFoldersBackend(termCreator, onlineSearch) {
  this.wrapFolder = function(folder) {
    return VirtualFolderHelper.wrapVirtualFolder(folder);
  }

  this.createFolders = function(items, folder) {
    var result = {};
    for (var i = 0 ; i < items.length; i++) {
      var item = items[i];
      var relativePath = item.folder;
      var folders = relativePath.split(".");
      var currentFolder = folder;
      for(var j = 0; j < folders.length; j++) {
	var newFolderName = folders[j];
	if (currentFolder.containsChildNamed(newFolderName))
	  currentFolder = currentFolder.getChildNamed(newFolderName);
	else
	  currentFolder = 
	    this.createFolder(newFolderName, currentFolder, folder);
      }
      result[relativePath] = this.wrapFolder(currentFolder);
    }
    return result;
  };

  this.createFolder = function(newFolderName, currentFolder, folder) {
    return VirtualFolderHelper.createNewVirtualFolder
	    (newFolderName, currentFolder, [folder], [], onlineSearch)
	    .virtualFolder;
  }

  this.apply = function(checkedItems, folder) {
    var folders = this.createFolders(checkedItems, folder);
    for (var i = 0 ; i < checkedItems.length; i++) {
      var item = checkedItems[i];
      folders[item.folder].searchTerms = termCreator.createTerms(item);
    }
  }
}

