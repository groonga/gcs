var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var croongaServer = require(__dirname + '/../lib/server');
var http = require('http');
var Deferred = require('jsdeferred').Deferred;
var nroonga = require('nroonga');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');

var testHost = 'localhost';
var testPort = 3333;
exports.testHost = testHost;
exports.testPort = testPort;

function setupServer(database) {
  var server = croongaServer.createServer({database: database});
  server.listen(testPort);
  return server;
}
exports.setupServer = setupServer;

function get(path) {
  var deferred = new Deferred();

  var options = {
        host: testHost,
        port: testPort,
        path: path
      };
  http.get(options, function(response) {
    var body = '';
    response.on('data', function(data) {
      body += data;
    });
    response.on('end', function() {
      deferred.call({
        statusCode: response.statusCode,
        body: body
      });
    });
  }).on('error', function(error) {
    deferred.fail(error);
  });

  return deferred;
}
exports.get = get;

function post(path, body, bodyContentType) {
  var deferred = new Deferred();

  var options = {
        host: testHost,
        port: testPort,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': bodyContentType,
          'Content-Length': body.length
        }
      };

  Deferred.next(function() {
    var request = http.request(options, function(response) {
          var body = '';
          response.on('data', function(data) {
            body += data;
          });
          response.on('end', function() {
            deferred.call({
              statusCode: response.statusCode,
              body: body
            });
          });
        });
    request.on('error', function(error) {
      deferred.fail(error);
    });

    request.write(body);
    request.end();
  });

  return deferred;
}
exports.post = post;

var databaseCount = 0;

exports.createTemporaryDatabase = function() {
  var databaseName = 'database-' + ++databaseCount;
  var databaseDirectory = path.join(temporaryDirectory, databaseName);
  var databasePath = path.join(databaseDirectory, 'database');
  rmRSync(databaseDirectory);
  mkdirp.sync(databaseDirectory);
  return {
    path: databasePath,
    get: function() {
      return this._database ||
             (this._database = new nroonga.Database(databasePath));
    },
    teardown: function() {
      rmRSync(databaseDirectory);
      this._database = undefined;
    }
  };
};

exports.loadDumpFile = function(database, path) {
  var dump = fs.readFileSync(path, 'UTF-8');
  dump.split('\n').forEach(function(line) {
    database.commandSyncString(line);
  });
}

function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}
exports.isDirectory = isDirectory;

function rmRSync(directoryPath) {
  if (!path.existsSync(directoryPath)) return;

  var files = fs.readdirSync(directoryPath);
  var file, filePath;
  for (var i = 0, maxi = files.length; i < maxi; i++) {
    file = files[i];
    filePath = path.join(directoryPath, file);
    if (isDirectory(filePath))
      rmRSync(filePath);
    else
      fs.unlinkSync(filePath);
  }
  fs.rmdirSync(directoryPath);
}
exports.rmRSync = rmRSync;
