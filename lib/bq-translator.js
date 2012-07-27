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
  skipSpaces: function(query, context) {
    for (; context.offset < query.length; context.offset++) {
      if (query[context.offset] != " ") {
        return;
      }
    }
  },
  translateGroup: function(query, context) {
    if (query[context.offset] != "(") {
      // TODO: report error
      return "";
    }

    context.offset++;
    var operator = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (/^[a-z]$/.test(character)) {
        operator += character;
      } else if (character == " ") {
        this.skipSpaces(query, context);
        var expression;
        switch (operator) {
        case "and":
          expression = this.translateGroupSetOperation(query, context, "&&");
          break;
        case "or":
          expression = this.translateGroupSetOperation(query, context, "||");
          break;
        default:
          // TODO: report error: unknown operator
          return "";
          break;
        }
        this.skipSpaces(query, context);
        if (query[context.offset] != ")") {
          // TODO: report error: have garbage
          return "";
        }
        context.offset++;
        return expression;
      } else if (character == ")") {
        // TODO: report error: no arguments for operator
        return "";
      } else {
        // TODO: invalid operator
        return "";
      }
    }

    // TODO: report error: missing close paren <)>
    return "";
  },
  translateGroupSetOperation: function(query, context, setOperator) {
    var expressions = [];
    while (context.offset < query.length) {
      this.skipSpaces(query, context);
      if (query[context.offset] == ")") {
        return "(" + expressions.join(" " + setOperator + " ") + ")";
      } else {
        expressions.push(this.translateExpression(query, context));
      }
    }

    // TODO: report error: missing close paren <)>
    return "";
  },
  translateExpression: function(query, context) {
    var startOffset = context.offset;
    var field;
    if (/^[a-z0-9]$/.test(query[context.offset])) {
      field = "";
      for (; context.offset < query.length; context.offset++) {
        var character = query[context.offset];
        if (!/^[\-a-z0-9]$/.test(character)) {
          break;
        }
        field += character;
      }
      if (query[context.offset] == ":") {
        context.offset++;
      } else {
        var is_unsigned_integer_value = /^[0-9]+$/.test(field);
        if (is_unsigned_integer_value) {
          field = context.defaultField;
          context.offset = startOffset;
        } else {
          // TODO: report error: field and value separator ":" is missing
          return "";
        }
      }
    } else {
      field = context.defaultField;
    }

    if (query[context.offset] == "'") {
      if (query[context.offset + 1] == "\"") {
        return this.translateExpressionValuePhrase(query, field, context);
      }
      return this.translateExpressionValueString(query, field, context);
    }
    if (/^[0-9]/.test(query[context.offset])) {
      return this.translateExpressionValueUnsignedInteger(query, field, context);
    }
    // TODO: report error
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
