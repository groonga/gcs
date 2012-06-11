var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Processor = require('../lib/batch/processor').Processor;

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

suite('batch/processor/Processor (instance methods)', function() {
  var processor;

  setup(function() {
    processor = new Processor({
      databasePath: utils.databasePath,
      domain: 'test'
    });
  });

  teardown(function() {
    processor = undefined;
  });

  test('initialize', function() {
    assert.equal(processor.databasePath, utils.databasePath);
    assert.equal(processor.domain, 'test');
  });

  test('process load', function(done) {
    processor.process(BATCHES)
      .next(function(results) {
        assert.deepEqual(results, [1, 1]);
        done();
      })
      .error(function(error) {
        assertNull(error); // to handle error in the method
        done();
      });
  });
});

var BATCH_ADD_MEAT_GUY = {
      'type': 'add',
      'id': 'id29',
      'version': 29,
      'lang': 'en',
      'fields': {
        'name': 'Meat Guy',
        'birhday': '2929-02-09',
        'job': 'Meat Guy'
      }
    };
var BATCH_ADD_MEAT_LADY = {
      'type': 'add',
      'id': 'id2929',
      'version': 2929,
      'lang': 'en',
      'fields': {
        'name': 'Meat Lady',
        'birhday': '2929-02-09',
        'job': 'Meat Lady'
      }
    };
var BATCHES = [
      BATCH_ADD_MEAT_GUY,
      BATCH_ADD_MEAT_LADY
    ];
