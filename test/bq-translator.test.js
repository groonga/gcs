// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testQuery(label, query, expected) {
  test('query: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = new BooleanQueryTranslator(query);
    translator.defaultField = "field";
    assert.equal(translator.translate(),
                 expected);
  });
}

function testQueryError(label, query, context, detail) {
  test('error: query: ' + label + ': ' + '<' + query + '>', function() {
    var translator = new BooleanQueryTranslator(query);
    translator.defaultField = "field";
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
    var translator = new BooleanQueryTranslator(group);
    translator.defaultField = "field";
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
    var translator = new BooleanQueryTranslator(group);
    translator.defaultField = "field";
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
    var translator = new BooleanQueryTranslator(expression);
    translator.defaultField = "field";
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
    var translator = new BooleanQueryTranslator(expression);
    translator.defaultField = "field";
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
  testExpression("value only: stirng: phrase",
                 "'\"keyword1 keyword2\"' 'other keyword'",
                 "'\"keyword1 keyword2\"'".length,
                 "field @ \"keyword1 keyword2\"");
  testExpression("value only: unsigned integer",
                 "29 75",
                 "29".length,
                 "field == 29");
  testExpression("value only: unsigned integer range: min only",
                 "29.. 75",
                 "29..".length,
                 "field >= 29");
  testExpression("value only: unsigned integer range: max only",
                 "..29 75",
                 "..29".length,
                 "field <= 29");
  testExpression("value only: unsigned integer range: min and max",
                 "14..29 75",
                 "14..29".length,
                 "(field >= 14 && field <= 29)");

  testExpression("field value: string",
                 "field1:'keyword1 keyword2' field2:'other keyword'",
                 "field1:'keyword1 keyword2'".length,
                 "field1 @ \"keyword1\" && field1 @ \"keyword2\"");
  testExpression("field value: unsigned integer",
                 "field1:29 field2:75",
                 "field1:29".length,
                 "field1 == 29");

  testExpressionError("missing field value separator",
                      "f1 'k1'",
                      "f1| |'k1'",
                      "field value separator is missing");
});
