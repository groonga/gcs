// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testTranslate(expected, query) {
  test('translate: <' + query + '> -> <' + expected + '>', function() {
    var translator = new BooleanQueryTranslator();
    assert.equal(expected, translator.translate(query));
  });
}

suite('BoolanQueryTranslator', function() {
  testTranslate('type:"ModelName"',
                "type:'ModelName'");
  testTranslate('query query type:"ModelName"',
                "(and query query type:'ModelName')");
  testTranslate('"query query" type:"ModelName"',
                "(and 'query query' type:'ModelName')");
})
