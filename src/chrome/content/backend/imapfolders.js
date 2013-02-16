function ImapFoldersBackend() {
  this.createFolder = function(newFolderName, currentFolder, folder) {
    var result = currentFolder.addSubfolder(newFolderName);
    result.createStorageIfMissing(null);
    return result;
  }

  this.apply = function(checkedItems, folder) {
    var folders = this.createFolders(checkedItems, folder);
  }
}
