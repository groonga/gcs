var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');
var nroonga = require('nroonga');

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

suite('documents/batch API', function() {
  var database;
  var server;

  setup(function() {
    database = temporaryDatabase.get();
    utils.loadDumpFile(database, __dirname + '/fixture/companies/ddl.grn');
    server = utils.setupServer(database);
  });

  teardown(function() {
    server.close();
  });

  test('add', function(done) {
    var batch = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, batch, 'application/json')
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: JSON.stringify({
                status: 'success',
                adds: 10,
                deletes: 0
              })
            };
        assert.deepEqual(response, expected);

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
