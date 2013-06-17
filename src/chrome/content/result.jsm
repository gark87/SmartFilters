var EXPORTED_SYMBOLS = ["SmartFiltersText", "SmartFiltersResult"];

/**
 * result of SmartFilter's work
 * will be displayed in dialog
 * No methods in this classes because them would be cloned
 */

function SmartFiltersText(type, icon, text) {
  this.type = type;
  this.icon = icon;
  this.text = text;
}

function SmartFiltersResult(messageIndices, texts, folder) {
  this.messageIndices = messageIndices;
  this.texts = texts;
  this.folder = folder;
}
