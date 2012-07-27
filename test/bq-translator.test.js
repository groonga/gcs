// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testQuery(label, expected, query) {
  test('query: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = new BooleanQueryTranslator();
    assert.equal(expected, translator.translate(query, "field"));
  });
}

function testGroup(label, expectedScriptGrnExpr, expectedOffset, group) {
  test('gorup: ' + label + ': ' +
       '<' + group + '> -> <' + expectedScriptGrnExpr + '>', function() {
    var translator = new BooleanQueryTranslator();
    var context = {
      defaultField: "field",
      offset: 0
    };
    var actualScriptGrnExpr = translator.translateGroup(group, context);
    assert.deepEqual({
                       scriptGrnExpr: expectedScriptGrnExpr,
                       offset: expectedOffset
                     },
                     {
                       scriptGrnExpr: actualScriptGrnExpr,
                       offset: context.offset
                     });
  });
}

function testExpression(label, expectedScriptGrnExpr, expectedOffset,
                        expression) {
  test('expression: ' + label + ': ' +
       '<' + expression + '> -> <' + expectedScriptGrnExpr + '>', function() {
    var translator = new BooleanQueryTranslator();
    var context = {
      defaultField: "field",
      offset: 0
    };
    var actualScriptGrnExpr =
          translator.translateExpression(expression, context);
    assert.deepEqual({
                       scriptGrnExpr: expectedScriptGrnExpr,
                       offset: expectedOffset
                     },
                     {
                       scriptGrnExpr: actualScriptGrnExpr,
                       offset: context.offset
                     });
  });
}

suite('BoolanQueryTranslator', function() {
  testQuery("expression",
            'type @ "ModelName"',
            "type:'ModelName'");
  testQuery("group: raw expressions",
            '(field1 @ "keyword1" && field2 @ "keyword2" && type @ "ModelName")',
            "(and field1:'keyword1' field2:'keyword2' type:'ModelName')");
  testQuery("group: quoted expression",
            '(field @ "keyword1" && field @ "keyword2" && type @ "ModelName")',
            "(and 'keyword1 keyword2' type:'ModelName')");

  testGroup("field",
            "field1 @ \"keyword1\"",
            "(field field1 'keyword1')".length,
            "(field field1 'keyword1') (other group)");
  testGroup("filter",
            "field1 == 29",
            "(filter field1 29)".length,
            "(filter field1 29) (other group)");
  testGroup("and",
            "(field1 @ \"keyword1\" && field2 @ \"keyword2\")",
            "(and field1:'keyword1' field2:'keyword2')".length,
            "(and field1:'keyword1' field2:'keyword2') (other group)");
  testGroup("or",
            "(field1 @ \"keyword1\" || field2 @ \"keyword2\")",
            "(or field1:'keyword1' field2:'keyword2')".length,
            "(or field1:'keyword1' field2:'keyword2') (other group)");

  testExpression("value only: stirng: keywords",
                 "field @ \"keyword1\" && field @ \"keyword2\"",
                 "'keyword1 keyword2'".length,
                 "'keyword1 keyword2' 'other keyword'");
  testExpression("value only: stirng: phrase",
                 "field @ \"keyword1 keyword2\"",
                 "'\"keyword1 keyword2\"'".length,
                 "'\"keyword1 keyword2\"' 'other keyword'");
  testExpression("value only: unsigned integer",
                 "field == 29",
                 "29".length,
                 "29 75");
  testExpression("value only: unsigned integer range: min only",
                 "field >= 29",
                 "29..".length,
                 "29.. 75");
  testExpression("value only: unsigned integer range: max only",
                 "field <= 29",
                 "..29".length,
                 "..29 75");
  testExpression("value only: unsigned integer range: min and max",
                 "(field >= 14 && field <= 29)",
                 "14..29".length,
                 "14..29 75");

  testExpression("field value: string",
                 "field1 @ \"keyword1\" && field1 @ \"keyword2\"",
                 "field1:'keyword1 keyword2'".length,
                 "field1:'keyword1 keyword2' field2:'other keyword'");
  testExpression("field value: unsigned integer",
                 "field1 == 29",
                 "field1:29".length,
                 "field1:29 field2:75");
});
