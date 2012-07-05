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
      path: '/2011-02-01/search?q=Hongo',
      headers: {
        Host: 'search-companies-00000000000000000000000000.localhost'
      }
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      var body = '';
      response.on('data', function(data) {
        body += data;
      });
      response.on('end', function() {
        var actual = JSON.parse(body);
        assert.operator(actual.info['time-ms'], '>=', 0, 'time-ms is ok');
        actual.info['time-ms'] = 0; // always set 0 for test
        var expected = { // FIXME
          rank: '-text_relevance',
          'match-expr': '',
          hits: {
            found: 1,
            start: 0,
            hit: [{
              id: 'id3',
              data: {
                _id: [3],
                _key: ['id3'],
                address: ['Hongo, Tokyo, Japan'],
                description: [''],
                email_address: ['info@clear-code.com'],
                name: ['ClearCode Inc.']
              }
            }]
          },
          info: {
            rid: '000000000000000000000000000000000000000000000000000000000000000',
            'time-ms': 0, // always 0
            'cpu-time-ms': 0
          }
        };
        assert.deepEqual(actual, expected);
        done();
      });
    }).on('error', function(error) {
      throw error;
    });
  });
});
