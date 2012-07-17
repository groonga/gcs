var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var schemeDump = fs.readFileSync(__dirname + '/fixture/companies/ddl.grn', 'UTF-8').replace(/\s+$/, '');
var loadDump = fs.readFileSync(__dirname + '/fixture/companies/data.grn', 'UTF-8').replace(/\s+$/, '');
var deletedLoadDump = fs.readFileSync(__dirname + '/fixture/companies/data-deleted.grn', 'UTF-8').replace(/\s+$/, '');

var addBatch = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
var deleteBatch = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');

suite('documents/batch API', function() {
  var context;
  var server;
  var temporaryDatabase;

  setup(function() {
    temporaryDatabase = utils.createTemporaryDatabase();
    context = temporaryDatabase.get();
    utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');
    server = utils.setupServer(context);
  });

  teardown(function() {
    server.close();
    temporaryDatabase.clear();
    temporaryDatabase.teardown();
    temporaryDatabase = undefined;
  });

  test('add', function(done) {
    var path = '/2011-02-01/documents/batch';
    utils.post(path, addBatch, {
      'Content-Type': 'application/json',
      'Content-Length': addBatch.length,
      'Host': 'doc-companies-00000000000000000000000000.localhost'
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

        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        assert.equal(dump, schemeDump + '\n' + loadDump);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('delete', function(done) {
    var path = '/2011-02-01/documents/batch';
    utils.post(path, addBatch, {
      'Content-Type': 'application/json',
      'Content-Length': addBatch.length,
      'Host': 'doc-companies-00000000000000000000000000.localhost'
    })
      .next(function(response) {
        return utils.post(path, deleteBatch, {
                 'Content-Type': 'application/json',
                 'Content-Length': deleteBatch.length,
                 'Host': 'doc-companies-00000000000000000000000000.localhost'
               });
      })
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: JSON.stringify({
                status: 'success',
                adds: 0,
                deletes: 1
              })
            };
        assert.deepEqual(response, expected);

        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        assert.equal(dump, schemeDump + '\n' + deletedLoadDump);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('no content type', function(done) {
    var path = '/2011-02-01/documents/batch';
    utils.post(path, 'foobar', {
      'Content-Length': 'foobar'.length,
      'Host': 'doc-companies-00000000000000000000000000.localhost'
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
    var path = '/2011-02-01/documents/batch';
    utils.post(path, 'foobar', {
      'Content-Type': 'text/plain',
      'Content-Length': 'foobar'.length,
      'Host': 'doc-companies-00000000000000000000000000.localhost'
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
    var path = '/2011-02-01/documents/batch';
    utils.post(path, '[]', {
      'Content-Type': 'application/json',
      'Host': 'doc-companies-00000000000000000000000000.localhost'
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
    var path = '/2011-02-01/documents/batch';
    utils.post(path, batch, {
      'Content-Type': 'application/json',
      'Content-Length': batch.length,
      'Host': 'doc-companies-00000000000000000000000000.localhost'
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
