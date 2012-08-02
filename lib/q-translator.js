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


function QueryTranslator() {
}

function throwTranslateError(query, context, detail) {
  var message = "";
  message += "<";
  message += query.substring(0, context.offset);
  message += "|" + query[context.offset] + "|";
  message += query.substring(context.offset + 1);
  message += ">";
  message += ": " + detail;
  throw new Error(message);
}

function escapeTerm(term) {
  return term.replace(/'/, "\\'");
}

QueryTranslator.prototype = {
  translateIndividualTerm: function(query, context) {
    var term = '';
    for (; context.offset < query.length; context.offset++) {
      if (/[ \+\-\|]/.test(query[context.offset])) {
        break;
      }
      term += query[context.offset];
    }
    return context.defaultField + ":'" + escapeTerm(term) + "'";
  },
  translateTerm: function(query, context) {
    this.skipSpaces(query, context);
    if (query[context.offset] == '"') {
      return this.translatePhraseTerm(query, context);
    } else {
      return this.translateIndividualTerm(query, context);
    }
  },
  skipSpaces: function(query, context) {
    for (; context.offset < query.length; context.offset++) {
      if (query[context.offset] != " ") {
        return;
      }
    }
  }
};

exports.QueryTranslator = QueryTranslator;
