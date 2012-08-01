// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var QueryTranslator = require('../lib/q-translator').QueryTranslator;

function testIndividualTerm(label, individualTerm, expectedBooleanQuery,
                            expectedOffset) {
  test('individual term: ' + label + ': ' +
       '<' + individualTerm + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator();
    var context = {
      offset: 0,
      defaultField: 'field'
    };
    var actualBooleanQuery =
          translator.translateIndividualTerm(individualTerm, context);
    assert.deepEqual({
                       booleanQuery: actualBooleanQuery,
                       offset: context.offset
                     },
                     {
                       booleanQuery: expectedBooleanQuery,
                       offset: expectedOffset
                     });
  });
}

function testTerm(label, term, expectedBooleanQuery, expectedOffset) {
  test('term: ' + label + ': ' +
       '<' + term + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator();
    var context = {
      offset: 0,
      defaultField: 'field'
    };
    var actualBooleanQuery = translator.translateTerm(term, context);
    assert.deepEqual({
                       booleanQuery: actualBooleanQuery,
                       offset: context.offset
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
                     "field:'star'",
                     "star".length);
  testIndividualTerm("an individual term: single quote",
                     "let's go",
                     "field:'let\\'s'",
                     "let's".length);

  testTerm("a term",
           "  star wars",
           "field:'star'",
           "  star".length);
});
