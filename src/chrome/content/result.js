/////////////////////////////////////////////////////////////
// result of SmartFilter's work
// will be displayed in dialog
// No methods in this classes because them would be cloned
/////////////////////////////////////////////////////////////

function SmartFiltersText(icon, text) {
  this.icon = icon;
  this.text = text;
}

function SmartFiltersResult(messageIndices, texts, folder, terms) {
  this.messageIndices = messageIndices;
  this.texts = texts;
  this.folder = folder;
  this.terms = terms;
}
