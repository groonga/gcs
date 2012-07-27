var assert = require('chai').assert;

var BooleanQueryTranslator = require('../lib/bq-translator').BooleanQueryTranslator;

function testBooleanQueryTranslator(expected, query) {
  test('translating query ' + query + ' -> ' + expected, function() {
    var translator = new BooleanQueryTranslator();
    assert.equal(expected, translator.translateTinia(query));
  });
}

suite('BoolanQueryTranslator', function() {
  testBooleanQueryTranslator('type:"ModelName"',
			     "type:'ModelName'");
  testBooleanQueryTranslator('query query type:"ModelName"',
			     "(and query query type:'ModelName')");
  testBooleanQueryTranslator('"query query" type:"ModelName"',
			     "(and 'query query' type:'ModelName')");
})
