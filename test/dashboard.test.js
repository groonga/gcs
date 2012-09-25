var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

suite('dashboard', function() {
  var server;

  setup(function() {
    server = utils.setupServer();
  });

  teardown(function() {
    server.close();
  });

  test('GET /', function(done) {
    utils
      .get('/')
      .next(function(response) {
        assert.equal(response.statusCode, 200);
        assert.match(response.body, /Groonga CloudSearch/);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
