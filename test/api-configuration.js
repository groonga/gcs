var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');
var nroonga = require('nroonga');

var temporaryDatabase;

suiteSetup(function() {
  temporaryDatabase = utils.createTemporaryDatabase();
});

suiteTeardown(function() {
  temporaryDatabase.teardown();
  temporaryDatabase = undefined;
});

suite('Configuration API', function() {
  var database;
  var server;

  setup(function() {
    database = temporaryDatabase.get();
    server = utils.setupServer(database);
  });

  teardown(function() {
    server.close();
    temporaryDatabase.clear();
  });

  test('Get, Action=CreateDomain', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain';
    utils.get(path)
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: ''
            };
//        assert.deepEqual(response, expected);

        var dump = database.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies_BigramTerms TABLE_PAT_KEY|KEY_NORMALIZE ShortText --default_tokenizer TokenBigram\n' +
                       'table_create companies TABLE_HASH_KEY ShortText'
        assert.equal(dump, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
