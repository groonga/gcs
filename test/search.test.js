var utils = require('./test-utils');
var assert = require('chai').assert;
var http = require('http');
var fs = require('fs');

var temporaryDatabase;
var database;

suiteSetup(function() {
  temporaryDatabase = utils.createTemporaryDatabase();
  database = temporaryDatabase.get();
  utils.loadDumpFile(database, __dirname + '/fixture/companies/ddl.grn');
  utils.loadDumpFile(database, __dirname + '/fixture/companies/data.grn');
});

suiteTeardown(function() {
  temporaryDatabase.teardown();
  temporaryDatabase = undefined;
});

suite('Search API', function() {
  var server;

  setup(function() {
    server = utils.setupServer(database);
  });

  teardown(function() {
    server.close();
  });

  function testSearch(path, host, callback) {
    test('GET ' + path, function(done) {
      var options = {
        host: utils.testHost,
        port: utils.testPort,
        path: path,
        headers: {Host: host}
      };
      http.get(options, function(response) {
        var body = '';
        response.on('data', function(data) {
          body += data;
        });
        response.on('end', function() {
          callback(response, body, done);
        });
      } );
    });
  }

  testSearch('/2011-02-01/search?q=Hongo',
             'search-companies-00000000000000000000000000.localhost',
    function(response, body, done) {
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
    }
  );

  testSearch('/2011-02-01/search?q=Tokyo',
             'search-companies-00000000000000000000000000.localhost',
    function(response, body, done) {
      var actual = JSON.parse(body);
      assert.operator(actual.info['time-ms'], '>=', 0, 'time-ms is ok');
      actual.info['time-ms'] = 0; // always set 0 for test
      var expected = {
        rank: '-text_relevance',
        'match-expr': '',
        hits: {
          found: 3,
          start: 0,
          hit: [
            {
              id: 'id1',
              data: {
                _id: [1],
                _key: ['id1'],
                address: ['Shibuya, Tokyo, Japan'],
                description: [''],
                email_address: ['info@razil.jp'],
                name: ['Brazil']
              }
            },
            {
              id: 'id3',
              data: {
                _id: [3],
                _key: ['id3'],
                address: ['Hongo, Tokyo, Japan'],
                description: [''],
                email_address: ['info@clear-code.com'],
                name: ['ClearCode Inc.']
              }
            },
            {
              id: 'id9',
              data: {
                _id: [9],
                _key: ['id9'],
                address: ['Tokyo, Japan'],
                description: [''],
                email_address: [''],
                name: ['Umbrella Corporation']
              }
            }
          ]
        },
        info: {
          rid: '000000000000000000000000000000000000000000000000000000000000000',
          'time-ms': 0, // always 0
          'cpu-time-ms': 0
        }
      };
      assert.deepEqual(actual, expected);
      done();
    }
  );
});
