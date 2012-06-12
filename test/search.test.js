var utils = require('./test-utils');
var assert = require('chai').assert;
var croongaServer = require(__dirname + '/../lib/server');
var http = require('http');

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});


suite('Search API', function() {
  var server;

  setup(function() {
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
      path: '/2011-02-01/search'
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      done();
    }).on('error', function(error) {
      throw error;
    });
  });
});
