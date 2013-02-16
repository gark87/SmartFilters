function Backend(termCreator) {
  this.wrapFolder = function(folder) {
    return folder;
  };

  this.createFolders = function(items, folder) {
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
	    this.createFolder(newFolderName, currentFolder, folder);
      }
      result[relativePath] = this.wrapFolder(currentFolder);
    }
    return result;
  };

  this.createTerms = function(item) {
    var terms = [];
    var resultTerms = item.data.terms;
    for(var j = 0; j < resultTerms.length; j++) {
      var resultTerm = resultTerms[j];
      var type = resultTerm.type;
      if (type == 'robot') {
	var searchTerm = termCreator.createTerm();
	searchTerm.attrib = Ci.nsMsgSearchAttrib.Sender;
	var value = searchTerm.value;
	value.attrib = searchTerm.attrib;
	value.str = resultTerm.email;
	searchTerm.value = value;
	searchTerm.op = Ci.nsMsgSearchOp.Contains;
	searchTerm.booleanAnd = true;
	terms.push(searchTerm);
      } else if (type == 'mailing.list') {
	var searchTerm = termCreator.createTerm();
	searchTerm.attrib = Ci.nsMsgSearchAttrib.ToOrCC;
	var value = searchTerm.value;
	value.attrib = searchTerm.attrib;
	value.str = resultTerm.email;
	searchTerm.value = value;
	searchTerm.op = Ci.nsMsgSearchOp.Contains;
	searchTerm.booleanAnd = true;
	terms.push(searchTerm);
      } else if (type == 'subject') {
	var keywords = resultTerm.keywords;
	for(var k = 0; k < keywords.length; k++) {
	  var keyword = keywords[k];
	  var searchTerm = termCreator.createTerm();
	  searchTerm.attrib = Ci.nsMsgSearchAttrib.Subject;
	  var value = searchTerm.value;
	  value.attrib = searchTerm.attrib;
	  value.str = keyword;
	  searchTerm.value = value;
	  searchTerm.op = Ci.nsMsgSearchOp.Contains;
	  searchTerm.booleanAnd = true;
	  terms.push(searchTerm);
	}
      } else {
	throw "Unknown type: " + type;
      }
    }
    return terms;
  }
}
