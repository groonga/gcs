// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-
/*
  BooleanQueryTranslator translates Boolean Queries in Amazon
  CloudSearch into script syntax grn_expr in groonga.

  Expression Syntax for Boolean Queries:
    http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.MatchSetExpression

  Script syntax grn_expr:
    http://groonga.org/docs/reference/grn_expr/script_syntax.html

  Unsupported syntaxes of Boolean Queries:
    * range in field value
    * (not ...)

  FIXME: Returns null if the given query is not supported.
         Shuold raise.
*/


function BooleanQueryTranslator() {
}

BooleanQueryTranslator.prototype = {
  translate: function(query, defaultField) {
    var context = {
      defaultField: defaultField,
      offset: 0
    };
    var expression;
    if (query[0] == "(") {
      expression = this.translateGroup(query, context);
    } else {
      expression = this.translateExpression(query, context);
    }
    if (context.offset != query.length) {
      // TODO: report error: garbages are exists after expression
      return "";
    }
    return expression;
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
        case "field":
          expression = this.translateGroupField(query, context);
          break;
        case "filter":
          expression = this.translateGroupFilter(query, context);
          break;
        case "and":
          expression = this.translateGroupSetOperation(query, "&&", context);
          break;
        case "or":
          expression = this.translateGroupSetOperation(query, "||", context);
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
  translateGroupField: function(query, context) {
    var field = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (/^[\-a-z0-9]$/.test(character)) {
        field += character;
      } else if (character == " ") {
        this.skipSpaces(query, context);
        var expression = this.translateExpressionValueString(query,
                                                             field,
                                                             context);
        this.skipSpaces(query, context);
        if (query[context.offset] != ")") {
          // TODO: report error: have garbage
          return "";
        }
        return expression;
      } else if (character == ")") {
        // TODO: report error: field and value is missing
        return "";
      } else {
        // TODO: report error: invalid field character
        return "";
      }
    }

    // TODO: report error: missing close paren <)>
    return "";
  },
  translateGroupFilter: function(query, context) {
    var field = "";
    for (; context.offset < query.length; context.offset++) {
      var character = query[context.offset];
      if (/^[\-a-z0-9]$/.test(character)) {
        field += character;
      } else if (character == " ") {
        this.skipSpaces(query, context);
        var expression = this.translateExpressionValueUnsignedInteger(query,
                                                                      field,
                                                                      context);
        this.skipSpaces(query, context);
        if (query[context.offset] != ")") {
          // TODO: report error: have garbage
          return "";
        }
        return expression;
      } else if (character == ")") {
        // TODO: report error: field and value is missing
        return "";
      } else {
        // TODO: report error: invalid field character
        return "";
      }
    }

    // TODO: report error: missing close paren <)>
    return "";
  },
  translateGroupSetOperation: function(query, setOperator, context) {
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
    if (query[context.offset + 1] == "\"") {
      return this.translateExpressionValuePhrase(query, field, context);
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
  }
};

exports.BooleanQueryTranslator = BooleanQueryTranslator;
