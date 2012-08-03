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

  testExpression("value only: stirng: keywords",
                 "'keyword1 keyword2' 'other keyword'",
                 "'keyword1 keyword2'".length,
                 "field @ \"keyword1\" && field @ \"keyword2\"");
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
});
