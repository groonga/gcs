// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-
/*
  BooleanQueryTranslator translates Boolean Queries in Amazon
  CloudSearch into script syntax grn_expr in groonga.

  Expression Syntax for Boolean Queries:
    http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.MatchSetExpression

  Script syntax grn_expr:
    http://groonga.org/docs/reference/grn_expr/script_syntax.html

  Unsupported syntaxes of Boolean Queries:
    * (not ...)

  FIXME: Returns null if the given query is not supported.
         Should raise.
*/


function BooleanQueryTranslator(query) {
  this.query = query;
  this.offset = 0;
  this.defaultField = null;
}

BooleanQueryTranslator.prototype = {
  translate: function() {
    var expression;
    if (this.query[0] == "(") {
      expression = this.translateGroup();
    } else {
      expression = this.translateExpression();
    }
    if (this.offset != this.query.length) {
      this.throwTranslateError("garbages exist after valid boolean query");
    }
    return expression;
  },
  throwTranslateError: function(detail) {
    var message = "";
    message += "<";
    if (this.offset == this.query.length) {
      message += this.query;
      message += "||";
    } else {
      message += this.query.substring(0, this.offset);
      message += "|" + this.query[this.offset] + "|";
      message += this.query.substring(this.offset + 1);
    }
    message += ">";
    message += ": " + detail;
    throw new Error(message);
  },
  skipSpaces: function() {
    for (; this.offset < this.query.length; this.offset++) {
      if (this.query[this.offset] != " ") {
        return;
      }
    }
  },
  translateGroup: function() {
    if (this.query[this.offset] != "(") {
      this.throwTranslateError("open parenthesis is missing");
    }

    this.offset++;
    var operator = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (/^[a-z]$/.test(character)) {
        operator += character;
      } else if (character == " ") {
        var operatorEndOffset = this.offset;
        this.skipSpaces();
        var expression;
        switch (operator) {
        case "field":
          expression = this.translateGroupField();
          break;
        case "filter":
          expression = this.translateGroupFilter();
          break;
        case "and":
          expression = this.translateGroupSetOperation("&&");
          break;
        case "or":
          expression = this.translateGroupSetOperation("||");
          break;
        default:
          this.offset = operatorEndOffset;
          this.throwTranslateError("unknown operator: <" + operator + ">");
          break;
        }
        return expression;
      } else if (character == ")") {
        this.throwTranslateError("operator is missing");
      } else {
        this.throwTranslateError("invalid operator character: " +
                                 "<" + character + ">");
      }
    }

    this.throwTranslateError("close parenthesis is missing");
  },
  translateGroupField: function() {
    var field = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (/^[\-a-z0-9]$/.test(character)) {
        field += character;
      } else if (character == " ") {
        this.skipSpaces();
        var expression = this.translateExpressionValueString(field);
        this.skipSpaces();
        var character = this.query[this.offset];
        if (character != ")") {
          this.throwTranslateError("a garbage character after value: " +
                                   "<" + character + ">");
        }
        this.offset++;
        return expression;
      } else if (character == ")") {
        if (field.length == 0) {
          this.throwTranslateError("field is missing");
        } else {
          this.throwTranslateError("field value is missing: " +
                                   "field:<" + field + ">");
        }
      } else {
        this.throwTranslateError("invalid field character: " +
                                 "<" + character + ">");
      }
    }

    this.throwTranslateError("close parenthesis is missing: operator:<field>");
  },
  translateGroupFilter: function() {
    var field = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (/^[\-a-z0-9]$/.test(character)) {
        field += character;
      } else if (character == " ") {
        this.skipSpaces();
        var expression = this.translateExpressionValueUnsignedInteger(field);
        this.skipSpaces();
        var character = this.query[this.offset];
        if (character != ")") {
          this.throwTranslateError("a garbage character after value: " +
                                   "<" + character + ">");
        }
        this.offset++;
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
  translateGroupSetOperation: function(setOperator) {
    var expressions = [];
    while (this.offset < this.query.length) {
      this.skipSpaces();
      if (this.query[this.offset] == ")") {
        this.offset++;
        return "(" + expressions.join(" " + setOperator + " ") + ")";
      } else {
        expressions.push(this.translateExpression());
      }
    }

    // TODO: report error: missing close paren <)>
    return "";
  },
  translateExpression: function() {
    if (this.query[this.offset] == "(") {
      return this.translateGroup();
    }

    var startOffset = this.offset;
    var field;
    if (/^[a-z0-9]$/.test(this.query[this.offset])) {
      field = "";
      for (; this.offset < this.query.length; this.offset++) {
        var character = this.query[this.offset];
        if (!/^[\-a-z0-9]$/.test(character)) {
          break;
        }
        field += character;
      }
      if (this.query[this.offset] == ":") {
        this.offset++;
      } else {
        var is_unsigned_integer_value = /^[0-9]+$/.test(field);
        if (is_unsigned_integer_value) {
          field = this.defaultField;
          this.offset = startOffset;
        } else {
          // TODO: report error: field and value separator ":" is missing
          return "";
        }
      }
    } else {
      field = this.defaultField;
    }

    if (this.query[this.offset] == "'") {
      return this.translateExpressionValueString(field);
    }
    if (/^[0-9.]/.test(this.query[this.offset])) {
      return this.translateExpressionValueUnsignedInteger(field);
    }
    // TODO: report error
    return "";
  },
  translateExpressionValueString: function(field) {
    if (this.query[this.offset] != "'") {
      // TODO: report error
      return "";
    }
    if (this.query[this.offset + 1] == "\"") {
      return this.translateExpressionValuePhrase(field);
    }

    this.offset++;
    var tokens = [];
    var value = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (character == "'") {
        this.offset++;
        tokens.push(this.translateExpressionValueStringKeyword(field, value));
        return tokens.join(" ");
      }

      if (character == " " || character == "+") {
        if (value.length > 0) {
          tokens.push(this.translateExpressionValueStringKeyword(field, value));
          tokens.push("&&");
          value = "";
        }
      } else if (character == "|") {
        if (value.length > 0) {
          tokens.push(this.translateExpressionValueStringKeyword(field, value));
          tokens.push("||");
          value = "";
        }
      } else if (character == "\\") {
        this.offset++;
        character = this.query[this.offset];
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
  translateExpressionValueStringKeyword: function(field, value) {
    var operator = "@";
    if (value[value.length - 1] == "*") {
      operator = "@^";
      value = value.substring(0, value.length - 1);
    }
    return field + " " + operator + " " + "\"" + value + "\"";
  },
  translateExpressionValuePhrase: function(field) {
    if (!(this.query[this.offset] == "'" &&
          this.query[this.offset + 1] == "\"")) {
      // TODO: report error
      return "";
    }

    this.offset += 2;
    var value = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (character == "'") {
        // TODO: report error: missing close quote <">
        return "";
      }

      if (character == "\\") {
        this.offset++;
        character = this.query[this.offset];
        value += character;
      } else if (character == "\"") {
        this.offset++;
        if (this.query[this.offset] != "'") {
          // TODO: report error: missing close quote <'> after <">
          return "";
        }
        this.offset++;
        return field + " @ " + "\"" + value + "\"";
      } else {
        value += character;
      }
    }

    // TODO: report error: missing close quote <"'>
    return "";
  },
  translateExpressionValueUnsignedInteger: function(field) {
    var is_range = false;
    var min = "";
    var max = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (!/^[0-9]$/.test(character)) {
        break;
      }
      min += character;
    }
    if (this.query[this.offset] == "." && this.query[this.offset + 1] == ".") {
      is_range = true;
      this.offset += 2;
      for (; this.offset < this.query.length; this.offset++) {
        var character = this.query[this.offset];
        if (!/^[0-9]$/.test(character)) {
          break;
        }
        max += character;
      }
    }

    if (is_range) {
      var expressions = [];
      if (min.length == 0 && max.length == 0) {
        // TODO: report error: only ".."
        return "";
      }
      if (min.length > 0) {
        expressions.push(field + " >= " + min);
      }
      if (max.length > 0) {
        expressions.push(field + " <= " + max);
      }
      if (expressions.length > 1) {
        return "(" + expressions.join(" && ") + ")";
      } else {
        return expressions[0];
      }
    } else {
      return field + " == " + min;
    }
  }
};

exports.BooleanQueryTranslator = BooleanQueryTranslator;
