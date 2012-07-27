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
      if (query[context.offset + 1] == "\"") {
        return this.translateExpressionValuePhrase(query,
                                                   context.defaultField,
                                                   context);
      }
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
  translateExpressionValuePhrase: function(query, field, context) {
    if (!(query[context.offset] == "'" && query[context.offset + 1] == "\"")) {
      // TODO: report error
      return "";
    }

    context.offset += 2;
    var value = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (character == "'") {
        // TODO: report error: missing close quote <">
        return "";
      }

      if (character == "\\") {
        context.offset++;
        character = query[context.offset];
        value += character;
      } else if (character == "\"") {
        context.offset++;
        if (query[context.offset] != "'") {
          // TODO: report error: missing close quote <'> after <">
          return "";
        }
        context.offset++;
        return field + " @ " + "\"" + value + "\"";
      } else {
        value += character;
      }
    }

    // TODO: report error: missing close quote <"'>
    return "";
  },
  translateExpressionValueString: function(query, field, context) {
    if (query[context.offset] != "'") {
      // TODO: report error
      return "";
    }

    context.offset++;
    var values = [];
    var value = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (character == "'") {
        context.offset++;
        values.push("\"" + value + "\"");
        var expressions = values.map(function (value) {
          return field + " @ " + value;
        });
        return expressions.join(" && ");
      }

      if (character == " ") {
        if (value.length > 0) {
          values.push("\"" + value + "\"");
          value = "";
        }
      } else if (character == "\\") {
        context.offset++;
        character = query[context.offset];
        value += character;
      } else if (character == "\"") {
        value += "\\\"";
      } else {
        value += character;
      }
    }

    // TODO: report error: missing close quote <'>
    return "";
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
