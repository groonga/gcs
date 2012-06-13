var utils = require('./test-utils');
var assert = require('chai').assert;
var http = require('http');
var fs = require('fs');

var temporaryDatabase;

suiteSetup(function() {
  temporaryDatabase = utils.createTemporaryDatabase();
});

suiteTeardown(function() {
  temporaryDatabase.teardown();
  temporaryDatabase = undefined;
});

suite('Search API', function() {
  var database;
  var server;

  setup(function() {
    database = temporaryDatabase.get();
    utils.loadDumpFile(database, __dirname + '/fixture/companies/ddl.grn');
    utils.loadDumpFile(database, __dirname + '/fixture/companies/data.grn');
    server = utils.setupServer(database);
  });

  teardown(function() {
    server.close();
  });

  test('GET /2011-02-01/search', function(done) {
    var options = {
      host: utils.testHost,
      port: utils.testPort,
      path: '/2011-02-01/search?q=Tokyo&DomainName=companies'
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      var body = '';
      response.on('data', function(data) {
        body += data;
      });
      response.on('end', function() {
        var actual = JSON.parse(body);
        var expected = { // FIXME
          rank: '-text_relevance',
          'match-expr': 'Tokyo',
          hits: {found:7, start:0, hit: []},
          info: {}
        };
        assert.deepEqual(actual, expected);
        done();
      });
    }).on('error', function(error) {
      throw error;
    });
  });
});
