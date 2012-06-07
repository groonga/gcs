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

  test('addToLoad', function() {
    var batch = BATCH_ADD_MEAT_GUY;
    var expected = 'load --table test ' + JSON.stringify([{
          '_key': batch['id'],
          'name': batch['fields']['name'],
          'birhday': batch['fields']['birhday'],
          'job': batch['fields']['job']
        }]);
    var translated = translator.addToLoad(batch);
    assert.equal(translated, expected);
  });

  test('translateOne for add', function() {
    var batch = BATCH_ADD_MEAT_GUY;
    var expected = 'load --table test ' + JSON.stringify([{
          '_key': batch['id'],
          'name': batch['fields']['name'],
          'birhday': batch['fields']['birhday'],
          'job': batch['fields']['job']
        }]);
    var translated = translator.translateOne(batch);
    assert.equal(translated, expected);
  });

  test('translate', function() {
    var batches = BATCHES;
    var batch = batches[0];
    var expected = 'load --table test ' + JSON.stringify([{
          '_key': batch['id'],
          'name': batch['fields']['name'],
          'birhday': batch['fields']['birhday'],
          'job': batch['fields']['job']
        }]);
    var translated = translator.translate(BATCHES);
    assert.equal(translated, expected);
  });
});

var BATCH_ADD_MEAT_GUY = {
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
var BATCHES = [
      BATCH_ADD_MEAT_GUY
    ];
