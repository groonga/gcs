// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-
/*
  QueryTranslator translates Queries into Boolean Queries in Amazon
  CloudSearch.

  Expression Syntax for Queries:
    http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.ReqParams

  Expression Syntax for Boolean Queries:
    http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.MatchSetExpression

  FIXME: Returns null if the given query is not supported.
         Should raise.
*/


function QueryTranslator(query) {
  this.query = query;
  this.offset = 0;
}

function escapeTerm(term) {
  return term.replace(/'/, "\\'");
}

QueryTranslator.prototype = {
  translateIndividualTerm: function() {
    var term = '';
    for (; this.offset < this.query.length; this.offset++) {
      if (/[ \+\-\|]/.test(this.query[this.offset])) {
        break;
      }
      term += this.query[this.offset];
    }
    return "'" + escapeTerm(term) + "'";
  },
  translatePhraseTerm: function() {
    if (this.query[this.offset] != '"') {
      this.throwTranslateError("phrase must start with <\">");
    }

    this.offset++;
    var phrase = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (character == '"') {
        this.offset++;
        return "'\"" + phrase + "\"'";
      }

      if (character == "\\") {
        phrase += character;
        this.offset++;
        if (this.offset == this.query.length) {
          this.throwTranslateError("escaped character is missing");
        }
        character = this.query[this.offset];
      }
      phrase += character;
    }
    this.throwTranslateError("phrase is unterminated: <" + phrase + ">");
  },
  translateTerm: function() {
    this.skipSpaces();
    if (this.query[this.offset] == '"') {
      return this.translatePhraseTerm(this.query, this);
    } else {
      return this.translateIndividualTerm(this.query, this);
    }
  },
  skipSpaces: function() {
    for (; this.offset < this.query.length; this.offset++) {
      if (this.query[this.offset] != " ") {
        return;
      }
    }
  },
  throwTranslateError: function(detail) {
    var message = "";
    message += "<";
    message += this.query.substring(0, this.offset);
    if (this.offset == this.query.length) {
      message += "||";
    } else {
      message += "|" + this.query[this.offset] + "|";
      message += this.query.substring(this.offset + 1);
    }
    message += ">";
    message += ": " + detail;
    throw new Error(message);
  }
};

exports.QueryTranslator = QueryTranslator;
