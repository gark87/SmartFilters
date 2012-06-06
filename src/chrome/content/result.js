///////////////////////////////////////////////////////////////////////////////////////
// result of SmartFilter's work
// will be displayed in dialog
///////////////////////////////////////////////////////////////////////////////////////
function SmartFiltersResult(messageIndices, icons, text, folder, createFilterTerm) {
  this.messageIndices = messageIndices;
  this.icons = icons;
  this.text = text;
  this.folder = folder;
  this.createFilterTerm = createFilterTerm;
}

// for debug purposes only
SmartFiltersResult.prototype = {
  toString : function () {
    return this.getMessageIndices() + " - |" +
           this.getText() + "| - " + this.getFolder() + "\n";
  }
}
