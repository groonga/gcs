var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var nroonga = require('nroonga');

var Processor = require('../lib/batch/processor').Processor;

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

suite('batch/processor/Processor (instance methods)', function() {
  var processor;
  var database = new nroonga.Database(utils.databasePath);

  setup(function() {
    database.commandSync('table_create', {
      name: 'test',
      flags: 'TABLE_HASH_KEY',
      key_type: 'ShortText'
    });
    ['name', 'birthday', 'job'].forEach(function(column) {
      database.commandSync('column_create', {
        table: 'test',
        name: column,
        flags: 'COLUMN_SCALAR',
        type: 'ShortText'
      });
    });

    processor = new Processor({
//      databasePath: utils.databasePath, // we must reuse the existing connection!
      database: database,
      domain: 'test',
    });
    console.log(processor.database.commandSync('table_list'));
  });

  teardown(function() {
    processor = undefined;
    database.commandSync('table_remove', {
      name: 'test'
    });
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
        done(error);
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
