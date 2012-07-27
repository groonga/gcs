// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-
/*
  Translates Boolean Queries used in tinia https://github.com/dlangevin/tinia
  into groonga query.

  Not all of Boolean Search Queries are supported.
  http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.MatchSetExpression

  Returns null if the given query is not supported.
*/


function BooleanQueryTranslator() {
}

BooleanQueryTranslator.prototype = {
  translate: function(query) {
    return this.translateTinia(query);
  },
  translateExpression: function(query, context) {
    if (query[context.offset] == "'") {
      return this.translateExpressionValueString(query,
                                                 context.defaultField,
                                                 context);
    }
    if (/^[0-9]/.test(query[context.offset])) {
      return this.translateExpressionValueUnsignedInteger(query,
                                                          context.defaultField,
                                                          context);
    }
    return "";
  },
  translateExpressionValueString: function(query, field, context) {
    if (query[context.offset] != "'") {
      // TODO: report error
      return "";
    }

    var value = "\"";
    context.offset++;
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (character == "'") {
        context.offset++;
        break;
      }

      if (character == "\\") {
        context.offset++;
        character = query[context.offset];
        value += character;
      } else if (character == "\"") {
        value += "\\\"";
      } else {
        value += character;
      }
    }
    value += "\"";
    return field + " @ " + value;
  },
  translateExpressionValueUnsignedInteger: function(query, field, context) {
    var value = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (!/^[0-9]$/.test(character)) {
        break;
      }
      value += character;
    }
    return field + " == " + value;
  },
  translateTinia: function(query) {
    var matched = null;

    matched = query.match(/^type:'(.+)'$/);
    if (matched) {
      return 'type:"' + matched[1] + '"';
    }

    matched = query.match(/^\(and '([^']+)' type:'(.+)'\)$/);
    if (matched) {
      return '"' + matched[1] + '" type:"' + matched[2] + '"';
    }

    matched = query.match(/^\(and (.+) type:'(.+)'\)$/);
    if (matched) {
      return matched[1] + ' type:"' + matched[2] + '"';
    }

    return null;
  }
};

exports.BooleanQueryTranslator = BooleanQueryTranslator;
