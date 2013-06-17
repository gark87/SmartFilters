var EXPORTED_SYMBOLS = ["TermCreator"];

function TermCreator(msgSearchSession) {
  const Ci = Components.interfaces;

  this.createTerms = function(item) {
    var terms = [];
    var resultTexts = item.texts;
    for(var j = 0; j < resultTexts.length; j++) {
      var resultText = resultTexts[j];
      var type = resultText.type;
      if (type == 'robot') {
        var searchTerm = msgSearchSession.createTerm();
        searchTerm.attrib = Ci.nsMsgSearchAttrib.Sender;
        var value = searchTerm.value;
        value.attrib = searchTerm.attrib;
        value.str = resultText.text;
        searchTerm.value = value;
        searchTerm.op = Ci.nsMsgSearchOp.Contains;
        searchTerm.booleanAnd = true;
        terms.push(searchTerm);
      } else if (type == 'mailing.list') {
        var searchTerm = msgSearchSession.createTerm();
        searchTerm.attrib = Ci.nsMsgSearchAttrib.ToOrCC;
        var value = searchTerm.value;
        value.attrib = searchTerm.attrib;
        value.str = resultText.text;
        searchTerm.value = value;
        searchTerm.op = Ci.nsMsgSearchOp.Contains;
        searchTerm.booleanAnd = true;
        terms.push(searchTerm);
      } else if (type == 'subject') {
        var keywords = resultText.text.split(", ");
        for(var k = 0; k < keywords.length; k++) {
          var keyword = keywords[k];
          var searchTerm = msgSearchSession.createTerm();
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
