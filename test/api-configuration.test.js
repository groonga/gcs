var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

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
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
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
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram';
        assert.equal(dump, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no version', function(done) {
    var path = '/';
    utils.get(path)
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: 'API version must be given as the parameter "Version".'
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, invalid version', function(done) {
    var path = '/?Version=2011-02-02';
    utils.get(path)
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: 'API version "2011-02-02" is not supported.'
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no action', function(done) {
    var path = '/?Version=2011-02-01';
    utils.get(path)
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: 'Action must be given as the parameter "Action".'
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, invalid action', function(done) {
    var path = '/?Version=2011-02-01&Action=unknown';
    utils.get(path)
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: 'Action "unknown" is not supported.'
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
