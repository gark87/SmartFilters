///////////////////////////////////////////////////////////////////////////////////////
// result of SmartFilter's work
// will be displayed in dialog
///////////////////////////////////////////////////////////////////////////////////////
function SmartFiltersResult(messageIndices, icons, message, folder, createFilterTerm) {
  this.getMessageIndices = function() { return messageIndices; };
  this.getIcons = function() { return icons; };
  this.getMessage = function() { return message; };
  this.getFolder = function() { return folder; };
  this.createFilterTerm = createFilterTerm;
}

// for debug purposes only
SmartFiltersResult.prototype = {
  toString : function () {
    return this.getMessageIndices() + " - |" +
           this.getMessage() + "| - " + this.getFolder() + "\n";
  }
}
