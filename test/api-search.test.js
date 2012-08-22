var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var Domain = require('../lib/database').Domain;

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

  function testSearch(path, message, host) {
    var setup, callback;
    var callbacks = Array.prototype.slice.call(arguments, 3);
    if (callbacks.length > 1) {
      setup = callbacks[0];
      callback = callbacks[1];
    } else {
      callback = callbacks[0];
    }
    test('GET ' + path + ' ' + message, function(done) {
      if (setup) setup();
      var options = {
        host: 'localhost',
        port: utils.testPort,
        path: path,
        headers: { Host: host }
      };
      utils
        .get(path, { Host: host })
        .next(function(response) {
          var normalizedBody = normalizeSearchResult(response.body);
          try {
            normalizedBody = JSON.parse(normalizedBody);
          } catch(error) {
            console.log(normalizedBody);
            throw error;
          }
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
      utils.loadDumpFile(context, __dirname + '/fixture/companies/configurations.grn');
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
      utils.loadDumpFile(context, __dirname + '/fixture/companies/configurations.grn');
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

  suite('search options', function() {
    var domain;

    setup(function() {
      domain = new Domain('people', context)
                 .setId('00000000000000000000000000').createSync();
      domain.getIndexField('realname').setType('text')
        .setResultEnabled(true).createSync();
      domain.getIndexField('nickname').setType('text')
        .setResultEnabled(true).createSync();
      domain.getIndexField('type').setType('literal')
        .setSearchEnabled(true).setResultEnabled(true).createSync();
      domain.loadSync([
        { id: 'id1', realname: 'Jack Sparrow',
                     nickname: 'Captain',
                     type:     'human' },
        { id: 'id2', realname: 'Pumpkin Man',
                     nickname: 'Jack-o\'-Lantern',
                     type:     'ghost' }
      ]);
    });

    testSearch('/2011-02-01/search?q=Jack',
               'should match both records',
               'search-people-00000000000000000000000000.localhost',
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Jack')",
          hits: {
            found: 2,
            start: 0,
            hit: [
              {
                id: 'id2',
                data: {
                  realname: ['Pumpkin Man'],
                  nickname: ['Jack-o\'-Lantern'],
                  type:     ['ghost']
                }
              },
              {
                id: 'id1',
                data: {
                  realname: ['Jack Sparrow'],
                  nickname: ['Captain'],
                  type:     ['human']
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

    testSearch('/2011-02-01/search?q=Jack',
               'should match only realname, by default search field',
               'search-people-00000000000000000000000000.localhost',
      function() {
        domain.defaultSearchField = 'realname';
      },
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Jack')",
          hits: {
            found: 1,
            start: 0,
            hit: [
              {
                id: 'id1',
                data: {
                  realname: ['Jack Sparrow'],
                  nickname: ['Captain'],
                  type:     ['human']
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

/* searchability of text field cannot be configured. how should I test it?
    testSearch('/2011-02-01/search?q=Jack',
               'should match only nickname, by searchability',
               'search-people-00000000000000000000000000.localhost',
      function() {
        domain.getIndexField('realname').setSearchEnabled(false).saveOptionsSync();
      },
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Jack')",
          hits: {
            found: 1,
            start: 0,
            hit: [
              {
                id: 'id2',
                data: {
                  realname: ['Pumpkin Man'],
                  nickname: ['Jack-o\'-Lantern'],
                  type:     ['ghost']
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
*/

    testSearch('/2011-02-01/search?q=Jack',
               'should return only "realname" field by resultEnabled',
               'search-people-00000000000000000000000000.localhost',
      function() {
        domain.getIndexField('nickname').setResultEnabled(false).saveOptionsSync();
        domain.getIndexField('type').setResultEnabled(false).saveOptionsSync();
      },
      function(response) {
        var expected = {
          rank: '-text_relevance',
          'match-expr': "(label 'Jack')",
          hits: {
            found: 2,
            start: 0,
            hit: [
              {
                id: 'id2',
                data: {
                  realname: ['Pumpkin Man']
                }
              },
              {
                id: 'id1',
                data: {
                  realname: ['Jack Sparrow']
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
