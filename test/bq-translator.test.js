// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function createTranslator(query) {
  var translator = new BooleanQueryTranslator(query);
  translator.domain = {
    getSynonymSync: function(key) {
      return null;
    }
  };
  translator.defaultFieldNames = ["field"];
  return translator;
}

function testQuery(label, query, expected) {
  test('query: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = createTranslator(query);
    assert.equal(translator.translate(),
                 expected);
  });
}

function testQueryError(label, query, context, detail) {
  test('error: query: ' + label + ': ' + '<' + query + '>', function() {
    var translator = createTranslator(query);
    var actualError;
    assert.throw(function() {
      try {
        translator.translate();
      } catch (error) {
        actualError = error;
        throw error;
      }
    });
    assert.equal(actualError.message, "<" + context + ">" + ": " + detail);
  });
}

function testGroup(label, group, expectedOffset, expectedScriptGrnExpr) {
  test('gorup: ' + label + ': ' +
       '<' + group + '> -> <' + expectedScriptGrnExpr + '>', function() {
    var translator = createTranslator(group);
    var actualScriptGrnExpr = translator.translateGroup();
    assert.deepEqual({
                       scriptGrnExpr: actualScriptGrnExpr,
                       offset: translator.offset
                     },
                     {
                       scriptGrnExpr: expectedScriptGrnExpr,
                       offset: expectedOffset
                     });
  });
}

function testGroupError(label, group, context, detail) {
  test('error: group: ' + label + ': ' + '<' + group + '>', function() {
    var translator = createTranslator(group);
    var actualError;
    assert.throw(function() {
      try {
        translator.translateGroup();
      } catch (error) {
        actualError = error;
        throw error;
      }
    });
    assert.equal(actualError.message, "<" + context + ">" + ": " + detail);
  });
}

function testExpression(label, expression,
                        expectedOffset, expectedScriptGrnExpr) {
  test('expression: ' + label + ': ' +
       '<' + expression + '> -> <' + expectedScriptGrnExpr + '>', function() {
    var translator = createTranslator(expression);
    var actualScriptGrnExpr =
          translator.translateExpression();
    assert.deepEqual({
                       scriptGrnExpr: actualScriptGrnExpr,
                       offset: translator.offset
                     },
                     {
                       scriptGrnExpr: expectedScriptGrnExpr,
                       offset: expectedOffset
                     });
  });
}

function testExpressionError(label, expression, context, detail) {
  test('error: expression: ' + label + ': ' + '<' + expression + '>',
       function() {
    var translator = createTranslator(expression);
    var actualError;
    assert.throw(function() {
      try {
        translator.translateExpression();
      } catch (error) {
        actualError = error;
        throw error;
      }
    });
    assert.equal(actualError.message, "<" + context + ">" + ": " + detail);
  });
}

function testDefaultFieldNames(label, query, defaultFieldNames, expected) {
  test('default field names: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = createTranslator(query);
    translator.defaultFieldNames = defaultFieldNames;
    assert.equal(translator.translate(),
                 expected);
  });
}

function testDefaultFieldNamesError(label, query, defaultFieldNames,
                                    context, detail) {
  test('error: default field names: ' + label + ': ' + '<' + query + '>',
       function() {
    var translator = createTranslator(query);
    translator.defaultFieldNames = defaultFieldNames;
    var actualError;
    assert.throw(function() {
      try {
        translator.translate();
      } catch (error) {
        actualError = error;
        throw error;
      }
    });
    assert.equal(actualError.message, "<" + context + ">" + ": " + detail);
  });
}

function testSynonym(label, query, synonyms, expected) {
  test('default synonym: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = createTranslator(query);
    translator.domain = {
      getSynonymSync: function(key) {
        return synonyms[key];
      }
    };
    assert.equal(translator.translate(), expected);
  });
}

suite('BoolanQueryTranslator', function() {
  testQuery("expression",
            "type:'ModelName'",
            'type @ "ModelName"');
  testQuery("group: raw expressions",
            "(and field1:'keyword1' field2:'keyword2' type:'ModelName')",
            '(field1 @ "keyword1" && field2 @ "keyword2" && type @ "ModelName")');
  testQuery("group: quoted expression",
            "(and 'keyword1 keyword2' type:'ModelName')",
            '(field @ "keyword1" && field @ "keyword2" && type @ "ModelName")');

  testQueryError("garbage",
                 "(and 'keyword' type:'ModelName') garbage1 garbage2",
                 "(and 'keyword' type:'ModelName')| |garbage1 garbage2",
                 "garbages exist after valid boolean query");

  testGroup("field",
            "(field field1 'keyword1') (other group)",
            "(field field1 'keyword1')".length,
            "field1 @ \"keyword1\"");
  testGroup("filter",
            "(filter field1 29) (other group)",
            "(filter field1 29)".length,
            "field1 == 29");
  testGroup("and",
            "(and field1:'keyword1' field2:'keyword2') (other group)",
            "(and field1:'keyword1' field2:'keyword2')".length,
            "(field1 @ \"keyword1\" && field2 @ \"keyword2\")");
  testGroup("or",
            "(or field1:'keyword1' field2:'keyword2') (other group)",
            "(or field1:'keyword1' field2:'keyword2')".length,
            "(field1 @ \"keyword1\" || field2 @ \"keyword2\")");
  testGroup("nested",
            "(and (or f1:'k1' f2:'k2') f3:'k3') (other group)",
            "(and (or f1:'k1' f2:'k2') f3:'k3')".length,
            "((f1 @ \"k1\" || f2 @ \"k2\") && f3 @ \"k3\")");

  testGroupError("missing open parentheis",
                 "and f1:'k1' f2:'k2')",
                 "|a|nd f1:'k1' f2:'k2')",
                 "open parenthesis is missing");
  testGroupError("unknown operator",
                 "(nonexistent f1:'k1' f2:'k2')",
                 "(nonexistent| |f1:'k1' f2:'k2')",
                 "unknown operator: <nonexistent>");
  testGroupError("missing close parentheis: in operator",
                 "(an",
                 "(an||",
                 "close parenthesis is missing");
  testGroupError("missing operator",
                 "()",
                 "(|)|",
                 "operator is missing");
  testGroupError("invalid operator character",
                 "(operat0r f1:'k1' f2:'k2')",
                 "(operat|0|r f1:'k1' f2:'k2')",
                 "invalid operator character: <0>");

  testGroupError("field: garbage after value",
                 "(field f1 'k1' 'garbage')",
                 "(field f1 'k1' |'|garbage')",
                 "a garbage character after value: <'>");
  testGroupError("field: no field",
                 "(field )",
                 "(field |)|",
                 "field is missing");
  testGroupError("field: no value",
                 "(field f1)",
                 "(field f1|)|",
                 "field value is missing: field:<f1>");
  testGroupError("field: not string value",
                 "(field f1 29)",
                 "(field f1 |2|9)",
                 "open single quote for string value is missing");
  testGroupError("field: invalid field name",
                 "(field fIeld 'value')",
                 "(field f|I|eld 'value')",
                 "invalid field character: <I>");
  testGroupError("field: missing close parenthesis",
                 "(field ",
                 "(field ||",
                 "close parenthesis is missing: operator:<field>");

  testGroupError("filter: garbage after value",
                 "(filter field1 29 'garbage')",
                 "(filter field1 29 |'|garbage')",
                 "a garbage character after value: <'>");
  testGroupError("filter: no field",
                 "(filter )",
                 "(filter |)|",
                 "field is missing");
  testGroupError("filter: no value",
                 "(filter f1)",
                 "(filter f1|)|",
                 "field value is missing: field:<f1>");
  testGroupError("filter: invalid field name",
                 "(filter fIeld 'value')",
                 "(filter f|I|eld 'value')",
                 "invalid field character: <I>");
  testGroupError("filter: missing close parenthesis",
                 "(filter ",
                 "(filter ||",
                 "close parenthesis is missing: operator:<filter>");

  testGroupError("and: missing close parentheis",
                 "(and f1:'k1' f2:'k2'",
                 "(and f1:'k1' f2:'k2'||",
                 "close parenthesis is missing: operator:<and>");

  testExpression("value only: stirng: and: space",
                 "'keyword1 keyword2' 'other keyword'",
                 "'keyword1 keyword2'".length,
                 "field @ \"keyword1\" && field @ \"keyword2\"");
  testExpression("value only: stirng: and: +",
                 "'keyword1+keyword2' 'other keyword'",
                 "'keyword1+keyword2'".length,
                 "field @ \"keyword1\" && field @ \"keyword2\"");
  testExpression("value only: stirng: or",
                 "'keyword1|keyword2' 'other keyword'",
                 "'keyword1|keyword2'".length,
                 "field @ \"keyword1\" || field @ \"keyword2\"");
  testExpression("value only: stirng: prefix search",
                 "'keyword*' 'other keyword'",
                 "'keyword*'".length,
                 "field @^ \"keyword\"");
  testExpression("value only: stirng: phrase: one",
                 "'\"keyword1 keyword2\"' 'other keyword'",
                 "'\"keyword1 keyword2\"'".length,
                 "field @ \"keyword1 keyword2\"");
  testExpression("value only: stirng: phrase: multi",
                 "'\"keyword1 keyword2\"|\"keyword3\"' 'other keyword'",
                 "'\"keyword1 keyword2\"|\"keyword3\"'".length,
                 "field @ \"keyword1 keyword2\" || field @ \"keyword3\"");

  testExpression("field value: string",
                 "field1:'keyword1 keyword2' field2:'other keyword'",
                 "field1:'keyword1 keyword2'".length,
                 "field1 @ \"keyword1\" && field1 @ \"keyword2\"");
  testExpression("field value: unsigned integer",
                 "field1:29 field2:75",
                 "field1:29".length,
                 "field1 == 29");

  testExpressionError("missing field value separator: normal field name",
                      "f1 'k1'",
                      "f1| |'k1'",
                      "field value separator is missing");
  testExpressionError("missing field value separator: " +
                        "unsigned integer like field name",
                      "29 75",
                      "29| |75",
                      "field value separator is missing");
  testExpressionError("invalid value",
                      "f1:value",
                      "f1:|v|alue",
                      "invalid value: field:<f1>");

  testExpressionError("value only: string: missing close quote",
                      "'k1",
                      "'k1||",
                      "close single quote for string value is missing");
  testExpressionError("value only: stirng: " +
                      "missing operator between keyword and phrase",
                      "'keyword1\"keyword2\"' 'other keyword'",
                      "'keyword1|\"|keyword2\"' 'other keyword'",
                      "operator is missing: keyword:<keyword1>");
  testExpressionError("value only: stirng: missing escaped value",
                      "'keyword1\\",
                      "'keyword1\\||",
                      "escaped character is missing in string value");

  testExpressionError("value only: phrase: missing escaped value",
                      "'\"keyword1\\",
                      "'\"keyword1\\||",
                      "escaped character is missing in phrase");
  testExpressionError("value only: phrase: missing close quote",
                      "'\"keyword",
                      "'\"keyword||",
                      "close double quote for phrase is missing");

  testExpressionError("value only: unsigned integer range: no min and max",
                      "..",
                      "..||",
                      "both min and max are missing");

  testDefaultFieldNames("multi",
                        "'ModelName'",
                        ["type", "name"],
                        '(type @ "ModelName" || name @ "ModelName")');
  testDefaultFieldNamesError("null",
                             "'ModelName'",
                             null,
                             "'ModelName'||",
                             "default fields are missing");
  testDefaultFieldNamesError("empty",
                             "'ModelName'",
                             [],
                             "'ModelName'||",
                             "no default field");

  testSynonym("existent: 0 synonym",
              "'tokio'",
              { tokio: [] },
              '');
  testSynonym("existent: 1 synonym",
              "'tokio'",
              { tokio: ["tokyo"] },
              'field @ "tokyo"');
  testSynonym("existent: N synonyms",
              "'tokio'",
              { tokio: ["tokio", "tokyo"] },
              '(field @ "tokio" || field @ "tokyo")');
  testSynonym("nonexistent",
              "'hokkaido'",
              { tokio: ["tokio", "tokyo"] },
              'field @ "hokkaido"');
});
