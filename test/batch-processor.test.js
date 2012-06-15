var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Processor = require('../lib/batch/processor').Processor;

var schemeDump = fs.readFileSync(__dirname + '/fixture/companies/ddl.grn', 'UTF-8').replace(/\s+$/, '');
var loadDump = fs.readFileSync(__dirname + '/fixture/companies/data.grn', 'UTF-8').replace(/\s+$/, '');

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
      domainName: 'companies',
    });
  });

  teardown(function() {
    processor = undefined;
    temporaryDatabase.clear();
  });

  test('initialize', function() {
    assert.equal(processor.databasePath, temporaryDatabase.path);
  });

  test('getColumns', function(done) {
    processor.getColumns()
      .next(function(columns) {
        var expected = ['name', 'address', 'email_address', 'description'];
        assert.deepEqual(columns.sort(), expected.sort());
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('process add-batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.process(batches)
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

  test('process invalid batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/invalid.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.process(batches)
      .next(function(result) {
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
        assert.deepEqual(result, expected);
        var dump = database.commandSync('dump', {
              tables: 'companies'
            });
        assert.equal(dump, schemeDump);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
