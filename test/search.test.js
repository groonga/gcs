var utils = require('./test-utils');
var assert = require('chai').assert;
var croongaServer = require(__dirname + '/../lib/server');
var http = require('http');
var spawn = require('child_process').spawn;
var fs = require('fs');

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

function executeGroonga(path, done) {
  var options = [utils.databasePath];
  var command = spawn('groonga', options);
  var stream = fs.createReadStream(path);
  stream.pipe(command.stdin);
  command.on('exit', function() {
    done();
  });
}

suite('Search API', function() {
  var server;

  setup(function(done) {
    executeGroonga(__dirname + '/fixture/companies/ddl.grn', function() {
      executeGroonga(__dirname + '/fixture/companies/data.grn', done);
    });

    server = croongaServer.createServer({databasePath: utils.databasePath});
    server.listen(utils.testPort);
  });

  teardown(function() {
    server.close();
  });

  test('GET /2011-02-01/search', function(done) {
    var options = {
      host: utils.testHost,
      port: utils.testPort,
      path: '/2011-02-01/search?q=Tokyo&DomainName=companies'
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      var body = '';
      response.on('data', function(data) {
        body += data;
      });
      response.on('end', function() {
        var actual = JSON.parse(body);
        var expected = { // FIXME
          rank: '-text_relevance',
          'match-expr': 'Tokyo',
          hits: {found:7, start:0, hit: []},
          info: {}
        };
        assert.deepEqual(actual, expected);
        done();
      });
    }).on('error', function(error) {
      throw error;
    });
  });
});
