///////////////////////////////////////////////////////////////////////////////////////
// result of SmartFilter's work
// will be displayed in dialog
///////////////////////////////////////////////////////////////////////////////////////
function SmartFiltersResult(messageIndices, icons, text, folder, createFilterTerm) {
  this.getMessageIndices = function() { return messageIndices; };
  this.getIcons = function() { return icons; };
  this.getText = function() { return text; };
  this.getFolder = function() { return folder; };
  this.createFilterTerm = createFilterTerm;
}

// for debug purposes only
SmartFiltersResult.prototype = {
  toString : function () {
    return this.getMessageIndices() + " - |" +
           this.getText() + "| - " + this.getFolder() + "\n";
  }
}
