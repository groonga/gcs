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
    database.commandSync('table_remove', { name: 'BigramTerms' });
    database.commandSync('table_remove', { name: 'companies' });
  });

  test('add', function(done) {
    var batch = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, batch, {
      'Content-Type': 'application/json',
      'Content-Length': batch.length
    })
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

  test('no content type', function(done) {
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, 'foobar', {
      'Content-Length': 'foobar'.length
    })
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: JSON.stringify({
                status: 'error',
                adds: 0,
                deletes: 0,
                errors: [
                  { message: 'The Content-Type header is missing.' }
                ]
              })
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('invalid content type', function(done) {
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, 'foobar', {
      'Content-Type': 'text/plain',
      'Content-Length': 'foobar'.length
    })
      .next(function(response) {
        var expected = {
              statusCode: 400,
              body: JSON.stringify({
                status: 'error',
                adds: 0,
                deletes: 0,
                errors: [
                  { message: 'Invalid Content-Type header: "text/plain"' }
                ]
              })
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('no content length', function(done) {
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, '[]', {
      'Content-Type': 'application/json'
    })
      .next(function(response) {
        var expected = {
              statusCode: 401,
              body: JSON.stringify({
                status: 'error',
                adds: 0,
                deletes: 0,
                errors: [
                  { message: 'The Content-Length header is missing.' }
                ]
              })
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('invalid batches', function(done) {
    var batch = fs.readFileSync(__dirname + '/fixture/companies/invalid.sdf.json', 'UTF-8');
    var path = '/2011-02-01/documents/batch?DomainName=companies';
    utils.post(path, batch, {
      'Content-Type': 'application/json',
      'Content-Length': batch.length
    })
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: JSON.stringify({
                status: 'error',
                adds: 0,
                deletes: 0,
                errors: [
                  { message: 'invalidfield: The field "unknown1" is unknown.' },
                  { message: 'invalidfield: The field "unknown2" is unknown.' },
                  { message: 'invalidfield: The field "name" is null.' },
                  { message: 'nofields: You must specify "fields".' },
                  { message: 'emptyfields: You must specify one or more fields to "fields".' }
                ]
              })
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
