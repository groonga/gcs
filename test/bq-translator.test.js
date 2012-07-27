// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testQuery(expected, query) {
  test('translate: <' + query + '> -> <' + expected + '>', function() {
    var translator = new BooleanQueryTranslator();
    assert.equal(expected, translator.translate(query));
  });
}

suite('BoolanQueryTranslator', function() {
  testQuery('type:"ModelName"',
            "type:'ModelName'");
  testQuery('query query type:"ModelName"',
                "(and query query type:'ModelName')");
  testQuery('"query query" type:"ModelName"',
            "(and 'query query' type:'ModelName')");
})
