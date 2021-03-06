var EXPORTED_SYMBOLS = ["ImapFoldersBackend"];

function ImapFoldersBackend(termCreator) {
  function Processor(folders, root, createFilters) {
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
      }        else {
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
      var filterService =
          Components.classes["@mozilla.org/messenger/services/filters;1"]
          .getService(Components.interfaces.nsIMsgFilterService);
      var filtersToRun = filterService.getTempFilterList(folder);
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
        filtersToRun.insertFilterAt(0, newFilter);
      }
      filtersList.saveToDefaultFile();
      let locale = Components.classes["@mozilla.org/intl/stringbundle;1"].
                getService(Components.interfaces.nsIStringBundleService).
                createBundle("chrome://smartfilters/locale/confirmation.properties");
      let prompts =
          Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
              getService(Components.interfaces.nsIPromptService);
      let title = locale.GetStringFromName("run.filters.title"); 
      let text = locale.GetStringFromName("run.filters.text"); 
      if (prompts.confirm(/*window*/null, title, text)) {
        // run filters on folder
        var array = Components.classes["@mozilla.org/supports-array;1"]
                  .createInstance(Components.interfaces.nsISupportsArray);
        array.AppendElement(folder);
        filterService.applyFiltersToFolders(filtersToRun, array, null);
      } 
    };
    var processor = new Processor(folders, folder, createFilters);
    var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
         .getService(Components.interfaces.nsIMsgFolderNotificationService);
    notificationService.addListener(processor, notificationService.folderAdded);
    processor.processNextBatch();
  }
}
