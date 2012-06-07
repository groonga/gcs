var utils = require('./test-utils');

var assert = require('chai').assert;

var Translator = require('../lib/batch/translator').Translator;

suite('batch translator', function() {
  test('initialize', function() {
    var translator = new Translator('test');
    assert.equal(translator.domain, 'test');
    assert.equal(translator.table, 'test');
  });
});
