// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testQuery(label, expected, query) {
  test('query: ' + label + ': ' +
       '<' + query + '> -> <' + expected + '>', function() {
    var translator = new BooleanQueryTranslator();
    assert.equal(expected, translator.translate(query));
  });
}

function testExpression(label, expectedQueryGrnExpr, expectedOffset,
                        expression) {
  test('expression: ' + label + ': ' +
       '<' + expression + '> -> <' + expectedQueryGrnExpr + '>', function() {
    var translator = new BooleanQueryTranslator();
    var context = {
      offset: 0
    };
    var actualQueryGrnExpr = translator.translateExpression(expression, context);
    assert.deepEqual({
                       queryGrnExpr: expectedQueryGrnExpr,
                       offset: expectedOffset
                     },
                     {
                       queryGrnExpr: actualQueryGrnExpr,
                       offset: context.offset
                     });
  });
}

suite('BoolanQueryTranslator', function() {
  testQuery("expression",
            'type:"ModelName"',
            "type:'ModelName'");
  testQuery("group: raw expressions",
            'query query type:"ModelName"',
            "(and query query type:'ModelName')");
  testQuery("group: quoted expression",
            '"query query" type:"ModelName"',
            "(and 'query query' type:'ModelName')");

  testExpression("value only: stirng",
                 "keyword1 keyword2",
                 "'keyword1 keyword2'".length,
                 "'keyword1 keyword2' 'other keyword'");
  testExpression("value only: unsigned integer",
                 "29",
                 "29".length,
                 "29 29");
})
