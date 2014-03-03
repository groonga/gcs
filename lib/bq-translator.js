/*
  BooleanQueryTranslator translates Boolean Queries in Amazon
  CloudSearch into script syntax grn_expr in groonga.

  Expression Syntax for Boolean Queries:
    http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/Search.Requests.html#Search.MatchSetExpression

  Script syntax grn_expr:
    http://groonga.org/docs/reference/grn_expr/script_syntax.html
*/

var IndexField = require('./database').IndexField;

function BooleanQueryTranslator(query) {
  this.query = query;
  this.offset = 0;
  this.domain = null;
  this.defaultFieldNames = null;
  this.available = true;
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
      this.throwSyntaxError("garbages exist after valid boolean query");
    }
    return expression;
  },
  throwInternalError: function(message) {
    var error = new Error('internal error');
    error.data = message;
    throw error;
  },
  throwSyntaxError: function(message) {
    var detail = "";
    detail += "<";
    if (this.offset == this.query.length) {
      detail += this.query;
      detail += "||";
    } else {
      detail += this.query.substring(0, this.offset);
      detail += "|" + this.query[this.offset] + "|";
      detail += this.query.substring(this.offset + 1);
    }
    detail += ">";

    this.throwValidationError(
      'CS-InvalidMatchSetExpression',
      '[WARNING] Syntax error in match set expression: ' +
        message + ' ' + detail
    );
  },
  throwValidationError: function(code, message) {
    var error = new Error('validation error');
    error.data = {
      code:     code,
      severity: 'fatal',
      message:  message
    };
    throw error;
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
      this.throwSyntaxError("open parenthesis is missing");
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
        case "label":
          expression = this.translateExpression();
          this.skipSpaces();
          if (this.query[this.offset] != ")") {
            this.throwSyntaxError("close parenthesis is missing: " +
                                  "operator:<label>");
          }
          this.offset++;
          break;
        case "field":
          expression = this.translateGroupField();
          break;
        case "filter":
          expression = this.translateGroupFilter();
          break;
        case "and":
          expression = this.translateGroupSetOperation(operator, "&&");
          break;
        case "not":
          expression = this.translateGroupNot();
          break;
        case "or":
          expression = this.translateGroupSetOperation(operator, "||");
          break;
        default:
          this.offset = operatorEndOffset;
          this.throwSyntaxError("unknown operator: <" + operator + ">");
          break;
        }
        return expression;
      } else if (character == ")") {
        this.throwSyntaxError("operator is missing");
      } else {
        this.throwSyntaxError("invalid operator character: " +
                              "<" + character + ">");
      }
    }

    this.throwSyntaxError("close parenthesis is missing");
  },
  translateGroupField: function() {
    var field = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (/^[a-z0-9_]$/.test(character)) {
        if (field.length == 0 && character == "_") {
          this.throwSyntaxError("field name should not start with under score");
        }
        field += character;
      } else if (character == " ") {
        this.skipSpaces();
        var expression = this.translateExpressionValueString(field);
        this.skipSpaces();
        var character = this.query[this.offset];
        if (character != ")") {
          this.throwSyntaxError("a garbage character after value: " +
                                "<" + character + ">");
        }
        this.offset++;
        return expression;
      } else if (character == ")") {
        if (field.length == 0) {
          this.throwSyntaxError("field is missing");
        } else {
          this.throwSyntaxError("field value is missing: " +
                                "field:<" + field + ">");
        }
      } else {
        this.throwSyntaxError("invalid field character: " +
                              "<" + character + ">");
      }
    }

    this.throwSyntaxError("close parenthesis is missing: operator:<field>");
  },
  translateGroupFilter: function() {
    var field = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (/^[a-z0-9_]$/.test(character)) {
        if (field.length == 0 && character == "_") {
          this.throwSyntaxError("field name should not start with under score");
        }
        field += character;
      } else if (character == " ") {
        this.skipSpaces();
        var expression = this.translateExpressionValueUnsignedInteger(field);
        this.skipSpaces();
        var character = this.query[this.offset];
        if (character != ")") {
          this.throwSyntaxError("a garbage character after value: " +
                                "<" + character + ">");
        }
        this.offset++;
        return expression;
      } else if (character == ")") {
        if (field.length == 0) {
          this.throwSyntaxError("field is missing");
        } else {
          this.throwSyntaxError("field value is missing: " +
                                "field:<" + field + ">");
        }
      } else {
        this.throwSyntaxError("invalid field character: " +
                              "<" + character + ">");
      }
    }

    this.throwSyntaxError("close parenthesis is missing: operator:<filter>");
  },
  translateGroupSetOperation: function(label, setOperator) {
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

    this.throwSyntaxError("close parenthesis is missing: " +
                          "operator:<" + label + ">");
  },
  translateGroupNot: function() {
    var expression = this.translateExpression();
    this.skipSpaces();

    if (this.offset == this.query.length) {
      this.throwSyntaxError("close parenthesis is missing: operator:<not>");
    }

    var character = this.query[this.offset];
    if (character != ")") {
      this.throwSyntaxError("a garbage character after value: " +
                            "<" + character + ">");
    }

    this.offset++;
    return "(all_records() &! " + expression + ")";
  },
  translateExpression: function() {
    if (this.query[this.offset] == "(") {
      return this.translateGroup();
    }

    var startOffset = this.offset;
    var field = null;
    if (/^[a-z0-9]$/.test(this.query[this.offset])) {
      field = "";
      for (; this.offset < this.query.length; this.offset++) {
        var character = this.query[this.offset];
        if (!/^[a-z0-9_]$/.test(character)) {
          break;
        }
        field += character;
      }
      if (this.query[this.offset] != ":") {
        this.throwSyntaxError("field value separator is missing");
      }
      this.offset++;
    }

    if (this.query[this.offset] == "'") {
      return this.translateExpressionValueString(field);
    }
    if (/^[0-9.]/.test(this.query[this.offset])) {
      return this.translateExpressionValueUnsignedInteger(field);
    }

    this.throwSyntaxError("invalid value: field:<" + field + ">");
  },
  translateExpressionValueString: function(field) {
    if (this.query[this.offset] != "'") {
      this.throwSyntaxError("open single quote for string value is missing");
    }
    this.offset++;

    var tokens = [];
    var type = field ? this.getField(field).type : "text" ;
    var value = "";
    var self = this;
    var addKeywordToken = function() {
      if (value.length == 0) {
        return;
      }
      var expandedKeywords = self.expandWord(value);
      var keywordTokens = expandedKeywords.map(function(keyword) {
        return this.translateExpressionValueStringKeyword(field, keyword);
      }, self);
      if (keywordTokens.length >= 2) {
        tokens.push("(" + keywordTokens.join(" || ") + ")");
      } else {
        tokens.push(keywordTokens[0]);
      }
      value = "";
    };
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (character == "'") {
        this.offset++;
        addKeywordToken();
        return tokens.join(" ");
      }

      if (character == " " || character == "+") {
        if (type == "literal") {
          value += character;
        } else {
          addKeywordToken();
          tokens.push("&&");
        }
      } else if (character == "|") {
        addKeywordToken();
        tokens.push("||");
      } else if (character == "\\") {
        this.offset++;
        if (this.offset == this.query.length) {
          this.throwSyntaxError("escaped character is missing " +
                                "in string value");
        }
        character = this.query[this.offset];
        value += character;
      } else if (character == "\"") {
        if (value.length > 0) {
          this.throwSyntaxError("operator is missing: " +
                                "keyword:<" + value + ">");
        }
        tokens.push(this.translateExpressionValueStringPhrase(field));
        this.offset--;
      } else {
        value += character;
      }
    }

    this.throwSyntaxError("close single quote for string value is missing");
  },
  translateExpressionValueStringKeyword: function(field, value) {
    var operator;
    if (!field || this.getField(field).type == "text") {
      operator = "@";
      if (value[value.length - 1] == "*") {
        operator = "@^";
        value = value.substring(0, value.length - 1);
      }
    } else {
      operator = "==";
    }
    return this.constructBinaryOperation(field, operator, "\"" + value + "\"");
  },
  translateExpressionValueStringPhrase: function(field) {
    if (this.query[this.offset] != "\"") {
      this.throwSyntaxError("open double quote for phrase value is missing");
    }

    this.offset += 1;
    var value = "";
    for (; this.offset < this.query.length; this.offset++) {
      var character = this.query[this.offset];
      if (character == "\\") {
        this.offset++;
        if (this.offset == this.query.length) {
          this.throwSyntaxError("escaped character is missing in phrase");
        }
        character = this.query[this.offset];
        value += character;
      } else if (character == "\"") {
        this.offset++;
        var expandedPhrases = this.expandWord(value);
        var expressions = expandedPhrases.map(function(phrase) {
          return this.constructBinaryOperation(field, "@", "\"" + phrase + "\"");
        }, this);
        if (expressions.length >= 2) {
          return "(" + expressions.join(" || ") + ")";
        } else {
          return expressions[0];
        }
      } else {
        value += character;
      }
    }

    this.throwSyntaxError("close double quote for phrase is missing");
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
        this.throwSyntaxError("both min and max are missing");
      }
      if (min.length > 0) {
        expressions.push(this.constructBinaryOperation(field, ">=", min));
      }
      if (max.length > 0) {
        expressions.push(this.constructBinaryOperation(field, "<=", max));
      }
      if (expressions.length > 1) {
        return "(" + expressions.join(" && ") + ")";
      } else {
        return expressions[0];
      }
    } else {
      return this.constructBinaryOperation(field, "==", min);
    }
  },
  expandWord: function(word) {
    var synonym = this.domain.getSynonymSync(word);
    if (!synonym) {
      return [word];
    }
    return synonym;
  },
  constructBinaryOperation: function(field, operator, value) {
    if (field) {
      return field + " " + operator + " " + value;
    } else {
      if (!this.defaultFieldNames) {
        this.throwInternalError("default fields are missing");
      }
      if (this.defaultFieldNames.length == 0) {
        this.throwInternalError("no default field");
      }
      var expressions = this.defaultFieldNames.map(function (field) {
        return this.constructBinaryOperation(field, operator, value);
      }, this);
      if (expressions.length > 1) {
        return "(" + expressions.join(" || ") + ")";
      } else {
        return expressions[0];
      }
    }
  },
  // Get an instance of "IndexField".
  // Unknown field works as "text, searchable" field, if it works without domain.
  getField: function(fieldName) {
    var field;
    if (this.domain && fieldName) {
      field = this.domain.getIndexField(fieldName);
      if (!field.exists()) {
        this.throwValidationError(
          'CS-UnknownFieldInMatchExpression',
          'Field \'' + fieldName + '\' is not defined in the metadata for this ' +
            'collection. All fields used in the match expression must be ' +
            'defined in the metadata.'
        );
      } else if (!field.searchEnabled) {
        this.available = false;
      }
    }
    if (!field)
      field = new IndexField(fieldName).setType("text");
    return field;
  }
};

exports.BooleanQueryTranslator = BooleanQueryTranslator;
