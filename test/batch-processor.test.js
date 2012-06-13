var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var nroonga = require('nroonga');

var Processor = require('../lib/batch/processor').Processor;

var addBatches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
addBatches = JSON.parse(addBatches);

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
    utils.loadDumpFile(database, __dirname + '/fixture/companies/data.grn');

    processor = new Processor({
      databasePath: temporaryDatabase.path,
      database: database, // we must reuse the existing connection!
      domain: 'companies',
    });
  });

  teardown(function() {
    processor = undefined;
    database.commandSync('table_remove', { name: 'BigramTerms' });
    database.commandSync('table_remove', { name: 'companies' });
  });

  test('initialize', function() {
    assert.equal(processor.databasePath, temporaryDatabase.path);
    assert.equal(processor.domain, 'companies');
  });

  test('process add-batches', function(done) {
    processor.process(addBatches)
      .next(function(results) {
        var expected = {
              status: 'success',
              adds: 10,
              deletes: 0
            };
        assert.deepEqual(results, expected);
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
});
