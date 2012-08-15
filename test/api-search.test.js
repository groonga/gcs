var utils = require('./test-utils');
var assert = require('chai').assert;
var http = require('http');
var fs = require('fs');

suite('Search API', function() {
  var server;
  var context;
  var temporaryDatabase;

  setup(function() {
    temporaryDatabase = utils.createTemporaryDatabase();
    context = temporaryDatabase.get();
    server = utils.setupServer(context);
  });

  teardown(function() {
    temporaryDatabase.teardown();
    temporaryDatabase = undefined;
    server.close();
  });

  function testSearch(path, message, host, callback) {
    test('GET ' + path + ' ' + message, function(done) {
      var options = {
        host: 'localhost',
        port: utils.testPort,
        path: path,
        headers: {Host: host}
      };
      utils
        .get(path, { Host: host })
        .next(function(response) {
          var normalizedBody = normalizeSearchResult(response.body);
          var normalizedBody = JSON.parse(normalizedBody);
          callback({
            statusCode:     response.statusCode,
            body:           response.body,
            normalizedBody: normalizedBody
          });
          done();
        })
        .error(function(error) {
          done(error);
        });
    });
  }

  function normalizeSearchResult(searchResult) {
    return searchResult.replace(/"time-ms":\s*(?:[1-9]\d*|0)([,\}])/, '"time-ms":0$1');
  }

  suite('with fixture loaded', function() {
    setup(function() {
      utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');
      utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');
    });

    testSearch('/2011-02-01/search?q=Hongo',
               'should hit one entry',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = { // FIXME
          rank: '-text_relevance',
          'match-expr': "(label 'Hongo')",
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
                name: ['ClearCode Inc.'],
                age: [3],
                product: ['groonga']
              }
            }]
          },
          info: {
            rid: '000000000000000000000000000000000000000000000000000000000000000',
            'time-ms': 0, // always 0
            'cpu-time-ms': 0
          }
        };
        assert.deepEqual(response.normalizedBody, expected);
      }
    );

    testSearch('/2011-02-01/search?q=Tokyo',
               'should hit three entries',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokyo')",
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
                  name: ['Brazil'],
                  age: [1],
                  product: ['groonga']
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
                  name: ['ClearCode Inc.'],
                  age: [3],
                  product: ['groonga']
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
                  name: ['Umbrella Corporation'],
                  age: [9],
                  product: ['tyrant']
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
        assert.deepEqual(response.normalizedBody, expected);
      }
    );
    testSearch('/2011-02-01/search?q=Tokyo&facet=product',
               'with facet "domain"',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokyo')",
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
                  name: ['Brazil'],
                  age: [1],
                  product: ['groonga']
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
                  name: ['ClearCode Inc.'],
                  age: [3],
                  product: ['groonga']
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
                  name: ['Umbrella Corporation'],
                  age: [9],
                  product: ['tyrant']
                }
              }
            ]
          },
          facets: {
            product: {
              constraints: [
                {value: 'groonga', count: 2},
                {value: 'tyrant', count: 1}
              ]
            }
          },
          info: {
            rid: '000000000000000000000000000000000000000000000000000000000000000',
            'time-ms': 0, // always 0
            'cpu-time-ms': 0
          }
        };
        assert.deepEqual(response.normalizedBody, expected);
      }
    );

    testSearch('/2011-02-01/search?q=Tokyo&size=2',
               'should return two hit entries',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokyo')",
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
                  name: ['Brazil'],
                  age: [1],
                  product: ['groonga']
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
                  name: ['ClearCode Inc.'],
                  age: [3],
                  product: ['groonga']
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
        assert.deepEqual(response.normalizedBody, expected);
      }
    );

    testSearch('/2011-02-01/search?q=Tokyo&start=1',
               'should return offseted hit result',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokyo')",
          hits: {
            found: 3,
            start: 1,
            hit: [
              {
                id: 'id3',
                data: {
                  _id: [3],
                  _key: ['id3'],
                  address: ['Hongo, Tokyo, Japan'],
                  description: [''],
                  email_address: ['info@clear-code.com'],
                  name: ['ClearCode Inc.'],
                  age: [3],
                  product: ['groonga']
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
                  name: ['Umbrella Corporation'],
                  age: [9],
                  product: ['tyrant']
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
        assert.deepEqual(response.normalizedBody, expected);
      }
    );

    testSearch('/2011-02-01/search?q=Tokio',
               'should not match with any entry',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokio')",
          hits: {
            found: 0,
            start: 0,
            hit: [
            ]
          },
          info: {
            rid: '000000000000000000000000000000000000000000000000000000000000000',
            'time-ms': 0, // always 0
            'cpu-time-ms': 0
          }
        };
        assert.deepEqual(response.normalizedBody, expected);
      }
    );
  });

  suite('with fixture and synonyms loaded', function() {
    setup(function() {
      utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');
      utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');
      utils.loadDumpFile(context, __dirname + '/fixture/companies/synonyms.grn');
    });

    testSearch('/2011-02-01/search?q=Tokio',
               'should match with using synonyms',
               'search-companies-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Tokio')",
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
                  name: ['Brazil'],
                  age: [1],
                  product: ['groonga']
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
                  name: ['ClearCode Inc.'],
                  age: [3],
                  product: ['groonga']
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
                  name: ['Umbrella Corporation'],
                  age: [9],
                  product: ['tyrant']
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
        assert.deepEqual(response.normalizedBody, expected);
      }
    );
  });
});
