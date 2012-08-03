// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var utils = require('./test-utils');
var assert = require('chai').assert;

var QueryTranslator = require('../lib/q-translator').QueryTranslator;

function testIndividualTerm(label, individualTerm,
                            expectedOffset, expectedBooleanQuery) {
  test('individual term: ' + label + ': ' +
       '<' + individualTerm + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator(individualTerm);
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

function testPhraseTerm(label, phraseTerm,
                        expectedOffset, expectedBooleanQuery) {
  test('phrase term: ' + label + ': ' +
       '<' + phraseTerm + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator(phraseTerm);
    var actualBooleanQuery = translator.translatePhraseTerm();
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

function testPhraseTermError(label, phraseTerm, context, detail) {
  test('error: phrase term: ' + label + ': ' +
       '<' + phraseTerm + '>', function() {
    var translator = new QueryTranslator(phraseTerm);
    var actualError;
    assert.throw(function() {
      try {
        translator.translatePhraseTerm();
      } catch (error) {
        actualError = error;
        throw error;
      }
    });
    assert.equal(actualError.message, "<" + context + ">" + ": " + detail);
  });
}

function testTerm(label, term, expectedOffset, expectedBooleanQuery) {
  test('term: ' + label + ': ' +
       '<' + term + '> -> <' + expectedBooleanQuery + '>', function() {
    var translator = new QueryTranslator(term);
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
                     "'star'");
  testIndividualTerm("an individual term: single quote",
                     "let's go",
                     "let's".length,
                     "'let\\'s'");

  testPhraseTerm("no special character",
                 '"star wars" luke',
                 '"star wars"'.length,
                 "'\"star wars\"'");
  testPhraseTerm("escape",
                 '"star \\" wars" luke',
                 '"star \\" wars"'.length,
                 "'\"star \\\" wars\"'");
  testPhraseTermError("not started with <\">",
                      'star wars"',
                      '|s|tar wars"',
                      "phrase must start with <\">");
  testPhraseTermError("ended with <\\>",
                      '"star wars\\',
                      '"star wars\\||',
                      "escaped character is missing");
  testPhraseTermError("not terminated",
                      '"star wars',
                      '"star wars||',
                      "phrase is unterminated: <star wars>");

  testTerm("a term",
           "  star wars",
           "  star".length,
           "'star'");
});
