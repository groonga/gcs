var utils = require('./test-utils');
var assert = require('chai').assert;
var http = require('http');
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
    var options = {
      host: utils.testBaseHost,
      port: utils.testPort,
      path: '/'
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      var body = '';
      response.on('data', function(data) {
        body += data;
      });
      response.on('end', function() {
        assert.match(body, /Groonga CloudSearch/);
        done();
      });
    });
  });

  test('GET /javascripts/templates.js', function(done) {
    var options = {
      host: utils.testBaseHost,
      port: utils.testPort,
      path: '/javascripts/templates.js'
    };
    http.get(options, function(response) {
      assert.equal(response.statusCode, 200);
      var body = '';
      response.on('data', function(data) {
        body += data;
      });
      response.on('end', function() {
        assert.include(body, "this.JST");
        done();
      });
    });
  });
});
