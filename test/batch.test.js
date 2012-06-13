var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');
var nroonga = require('nroonga');

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

suite('documents/batch API', function() {
  var database;
  var server;

  setup(function() {
    database = new nroonga.Database(utils.databasePath);
    utils.loadDumpFile(database, __dirname + '/fixture/companies/ddl.grn');
    server = utils.setupServer();
  });

  teardown(function() {
    server.close();
  });

  test('add', function(done) {
    var batch = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, batch, 'application/json')
      .next(function(response) {
        assert.equal(response.statusCode, 200);
        var actual = JSON.parse(response.body);
        var expected = {
              status: 'success',
              adds: 10,
              deletes: 0
            };
        assert.deepEqual(actual, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
