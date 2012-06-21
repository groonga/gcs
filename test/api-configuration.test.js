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

function createCommonErrorResponse(errorCode, message) {
  return '<?xml version="1.0"?>\n' +
         '<Response>' +
           '<Errors>' +
             '<Error><Code>' + errorCode +'</Code>' +
                     '<Message>' + message + '</Message></Error>' +
             '</Errors>' +
           '<RequestID></RequestID>' +
         '</Response>';
}

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

  test('Get, Action=DefineIndexField', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path)
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=name&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: ''
            };
//        assert.deepEqual(response, expected);

        var dump = database.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'column_create companies name COLUMN_SCALAR ShortText\n' +
                       'column_create companies_BigramTerms companies_name ' +
                         'COLUMN_INDEX|WITH_POSITION companies name';
        assert.equal(dump, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no version', function(done) {
    var path = '/?Action=unknown';
    utils.get(path)
      .next(function(response) {
        var message = 'An input parameter "Version" that is mandatory for ' +
                      'processing the request is not supplied.';;
        var expected = {
              statusCode: 400,
              body: createCommonErrorResponse('MissingParameter', message)
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, invalid version', function(done) {
    var path = '/?Version=2011-02-02&Action=unknown';
    utils.get(path)
      .next(function(response) {
        var message = 'A bad or out-of-range value "2011-02-02" was supplied ' +
                      'for the "Version" input parameter.';
        var expected = {
              statusCode: 400,
              body: createCommonErrorResponse('InvalidParameterValue', message)
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
        var message = 'The action unknown is not valid for this web service.';
        var expected = {
              statusCode: 400,
              body: createCommonErrorResponse('InvalidAction', message)
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
