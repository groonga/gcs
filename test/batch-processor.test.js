var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Processor = require('../lib/batch/processor').Processor;

var schemeDump = fs.readFileSync(__dirname + '/fixture/companies/ddl.grn', 'UTF-8').replace(/\s+$/, '');
var loadDump = fs.readFileSync(__dirname + '/fixture/companies/data.grn', 'UTF-8').replace(/\s+$/, '');
var deletedLoadDump = fs.readFileSync(__dirname + '/fixture/companies/data-deleted.grn', 'UTF-8').replace(/\s+$/, '');
var deleteDump = fs.readFileSync(__dirname + '/fixture/companies/delete.grn', 'UTF-8').replace(/\s+$/, '');

var temporaryDatabase;

suiteSetup(function() {
  temporaryDatabase = utils.createTemporaryDatabase();
});

suiteTeardown(function() {
  temporaryDatabase.teardown();
  temporaryDatabase = undefined;
});

suite('batch/processor/Processor (instance methods)', function() {
  var processor;
  var database;

  setup(function() {
    database = temporaryDatabase.get();
    utils.loadDumpFile(database, __dirname + '/fixture/companies/ddl.grn');

    processor = new Processor({
      databasePath: temporaryDatabase.path,
      database: database, // we must reuse the existing connection!
      domain: 'companies',
    });
  });

  teardown(function() {
    processor = undefined;
    temporaryDatabase.clear();
  });

  test('initialize', function() {
    assert.equal(processor.databasePath, temporaryDatabase.path);
  });

  test('getColumns', function() {
    var columns = processor.getColumns();
    var expected = ['name', 'address', 'email_address', 'description', 'age'];
    assert.deepEqual(columns.sort(), expected.sort());
  });

  test('load add-batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.load(batches)
      .next(function(result) {
        var expected = {
              status: 'success',
              adds: 10,
              deletes: 0
            };
        assert.deepEqual(result, expected);
        var dump = database.commandSync('dump', {
              tables: 'companies'
            });
        assert.equal(dump, schemeDump + '\n' + loadDump);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('load delete-batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.load(batches)
      .next(function(result) {
        var batches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
        batches = JSON.parse(batches);
        return processor.load(batches)
      })
      .next(function(result) {
        var expected = {
              status: 'success',
              adds: 0,
              deletes: 1
            };
        assert.deepEqual(result, expected);
        var dump = database.commandSync('dump', {
              tables: 'companies'
            });
        assert.equal(dump, schemeDump + '\n' + deletedLoadDump);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('validation, valid batches', function() {
    var addBatches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    var deleteBatches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
    var batches = JSON.parse(addBatches).concat(JSON.parse(deleteBatches));
    // assert.notThrow(function() {
      processor.validate(batches);
    // }, Processor.INVALID_BATCH);
    assert(true);
  });

  test('validation, invalid batches', function() {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/invalid.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    var actualError;
    assert.throw(function() {
      try {
        processor.validate(batches);
      } catch(error) {
        actualError = error;
        throw error;
      }
    }, Processor.INVALID_BATCH);

    var expected = {
          status: 'error',
          adds: 0,
          deletes: 0,
          errors: [
            { message: 'invalidfield: The field "unknown1" is unknown.' },
            { message: 'invalidfield: The field "unknown2" is unknown.' },
            { message: 'invalidfield: The field "name" is null.' },
            { message: 'nofields: You must specify "fields".' },
            { message: 'emptyfields: You must specify one or more fields to "fields".' }
          ]
        };
    assert.deepEqual(actualError.result, expected);
  });
});
