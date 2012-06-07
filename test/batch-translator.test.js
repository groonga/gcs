var utils = require('./test-utils');

var assert = require('chai').assert;

var Translator = require('../lib/batch/translator').Translator;

suite('batch translator', function() {
  var translator;

  setup(function() {
    translator = new Translator('test');
  });

  teardown(function() {
    translator = undefined;
  });

  test('initialize', function() {
    assert.equal(translator.domain, 'test');
    assert.equal(translator.table, 'test');
  });

  test('add', function() {
    var batch = {
          'type': 'add',
          'id': 'id'+parseInt(Math.random() * 1000),
          'version': parseInt(Math.random() * 1000),
          'lang': 'en',
          'fields': {
            'name': 'Meat Guy',
            'birhday': '2929-02-09',
            'job': 'Meat Guy'
          }
        };
    var expected = 'load --table test ' + JSON.stringify([
          '_key': input['id'],
          'name': input['fields']['name'],
          'birhday': input['fields']['birhday'],
          'job': input['fields']['job']
        ]);
    var translated = translator.addToLoad(batch);
    assert.equal(translated, expected);
  });
});
