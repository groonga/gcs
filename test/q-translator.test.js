// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var QueryTranslator = require('../lib/q-translator').QueryTranslator;

function testIndividualTerm(label, individualTerm,
                            expectedOffset, expectedBooleanQuery) {
  test('individual term: ' + label + ': ' +
       '<' + individualTerm + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator(individualTerm);
    translator.defaultField = "field";
    var actualBooleanQuery = translator.translateIndividualTerm();
    assert.deepEqual({
                       booleanQuery: actualBooleanQuery,
                       offset: translator.offset
                     },
                     {
                       booleanQuery: expectedBooleanQuery,
                       offset: expectedOffset
                     });
  });
}

function testTerm(label, term, expectedOffset, expectedBooleanQuery) {
  test('term: ' + label + ': ' +
       '<' + term + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator(term);
    translator.defaultField = "field";
    var actualBooleanQuery = translator.translateTerm();
    assert.deepEqual({
                       booleanQuery: actualBooleanQuery,
                       offset: translator.offset
                     },
                     {
                       booleanQuery: expectedBooleanQuery,
                       offset: expectedOffset
                     });
  });
}

suite('QueryTranslator', function() {
  testIndividualTerm("an individual term",
                     "star wars",
                     "star".length,
                     "field:'star'");
  testIndividualTerm("an individual term: single quote",
                     "let's go",
                     "let's".length,
                     "field:'let\\'s'");

  testTerm("a term",
           "  star wars",
           "  star".length,
           "field:'star'");
});
