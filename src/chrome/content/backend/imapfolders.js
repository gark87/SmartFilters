function ImapFoldersBackend(termCreator) {
  function Processor(folders, root, createFilters) {
    this.folders = folders;
    this.root = root;
    this.currentFolder = root;
    this.createdFolders = [];
    this.createFilters = createFilters;
    this._dstFolderName = null;
    var errorCount = 0;

    this.folderAdded = function(aFolder) {
      this.currentFolder = this.currentFolder.findSubFolder(this._dstFolderName);
      this._dstFolderName = null;
      this.processNextBatch();
    }

    this.processNextBatch = function() {
      errorCount = 0;
      if (folders.length == 0) {
	this.createFilters(this.createdFolders);
	return;
      }
      var folder = folders[0];
      if (folder.length == 0) {
	folders.shift();
	this.createdFolders.push(this.currentFolder);
	this.currentFolder = this.root;
	this.processNextBatch();
	return;
      }
      var newFolderName = folder.shift();
      if (this.currentFolder.containsChildNamed(newFolderName)) {
        this.currentFolder = 
	  this.currentFolder.getChildNamed(newFolderName);
	this.processNextBatch();
      }	else {
        this._dstFolderName = newFolderName;
	this.currentFolder.createSubfolder(newFolderName, null); 
      }
    }
  };


  this.apply = function(checkedItems, folder) {
    var folders = [];
    var texts = [];
    for (var i = 0 ; i < checkedItems.length; i++) {
      var item = checkedItems[i];
      var relativePath = item.folder;
      texts.push(relativePath);
      folders.push(relativePath.split("."));
    }
    var createFilters = function(createdFolders) {
      var filtersList = folder.getFilterList(null);
      var position = filtersList.filterCount;
      for (var i = 0 ; i < checkedItems.length; i++) {
	var relativePath = texts[i];
        var newFilter = filtersList.createFilter("SmartFilter_" + relativePath + "_" + position);
	newFilter.enabled = true;
	var action = newFilter.createAction();
	action.type = Components.interfaces.nsMsgFilterAction.MoveToFolder;
	action.targetFolderUri = createdFolders[i].URI;
	newFilter.appendAction(action);
	var terms = termCreator.createTerms(checkedItems[i]);
	for(var j = 0; j < terms.length; j++)
	  newFilter.appendTerm(terms[j]);
	filtersList.insertFilterAt(position++, newFilter);
      }
      filtersList.saveToDefaultFile();
    };
    var processor = new Processor(folders, folder, createFilters);
    var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
	 .getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(processor, notificationService.folderAdded);
    processor.processNextBatch();
  }
}
