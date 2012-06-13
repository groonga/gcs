var utils = require('./test-utils');
var assert = require('chai').assert;
var spawn = require('child_process').spawn;
var fs = require('fs');

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

function executeGroonga(path, done) {
  var options = [utils.databasePath];
  var command = spawn('groonga', options);
  var stream = fs.createReadStream(path);
  var stderr = '';
  stream.pipe(command.stdin);
  command.stderr.on('data', function(data) {
    stderr += data;
  });
  command.on('exit', function(code) {
    if (code !== 0) {
      throw 'failed to execute groonga. stderr: ' + stderr;
    }
    done();
  });
}

suite('Search API', function() {
  var server;

  setup(function(done) {
    executeGroonga(__dirname + '/fixture/companies/ddl.grn', function() {
      executeGroonga(__dirname + '/fixture/companies/data.grn', function() {
        server = utils.setupServer();
        done();
      });
    });
  });

  teardown(function() {
    server.close();
  });

  test('GET /2011-02-01/search', function(done) {
    var path = '/2011-02-01/search?q=Tokyo&DomainName=companies';
    utils.get(path)
      .next(function(response) {
        assert.equal(response.statusCode, 200);
        var actual = JSON.parse(response.body);
        var expected = { // FIXME
          rank: '-text_relevance',
          'match-expr': 'Tokyo',
          hits: {found:7, start:0, hit: []},
          info: {}
        };
        assert.deepEqual(actual, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
