var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var gcsServer = require(__dirname + '/../lib/server');
var http = require('http');
var Deferred = require('jsdeferred').Deferred;
var nativeNroonga = require('nroonga');
var wrappedNroonga = require(__dirname + '/../lib/wrapped-nroonga');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');

var testHost = 'localhost';
var testPort = 3333;
exports.testHost = testHost;
exports.testPort = testPort;

function setupServer(context) {
  var server = gcsServer.createServer({context: context});
  server.listen(testPort);
  return server;
}
exports.setupServer = setupServer;

function sendRequest(method, path, postData, headers) {
  var deferred = new Deferred();

  var options = {
        host: testHost,
        port: testPort,
        path: path,
        method: method,
        headers: {}
      };

  if (headers) {
    for (var header in headers) {
      if (headers.hasOwnProperty(header))
        options.headers[header] = headers[header];
    }
  }

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

    if (postData) request.write(postData);
    request.end();
  });

  return deferred;
}

function get(path, headers) {
  return sendRequest('GET', path, null, headers);
}
exports.get = get;

function post(path, body, headers) {
  return sendRequest('POST', path, body, headers);
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
      return this._context ||
             (this._context = new nativeNroonga.Database(databasePath));
    },
    clear: function() {
      var context = this._context;
      var tables = context.commandSync('table_list');
      wrappedNroonga.formatResults(tables).forEach(function(table) {
        context.commandSync('table_remove', { name: table.name });
      });
    },
    teardown: function() {
      rmRSync(databaseDirectory);
      this._context = undefined;
    }
  };
};

exports.loadDumpFile = function(context, path) {
  var dump = fs.readFileSync(path, 'UTF-8');
  dump.split('\n').forEach(function(line) {
    context.commandSyncString(line);
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


// activate diff for chai.assert.deepEqual

var chai_utils = require('chai/lib/chai/utils');

function sortAndStringify(object) {
  switch (typeof object) {
    case 'string':
    case 'number':
    case 'boolean':
      return JSON.stringify(object);
    default:
      if (Array.isArray(object)) {
        return '[' + object.map(function(item) { return sortAndStringify(item); }).sort().join(', ') + ']';
      } else if (!object) {
        return JSON.stringify(object);
      } else {
        var sorted = {};
        Object.keys(object).sort().forEach(function(key) {
          if (object.hasOwnProperty(key))
            sorted[key] = object[key];
        });
        return JSON.stringify(sorted);
      }
  }
}

require('chai').Assertion.prototype.eql = function(obj) {
  var expected = chai_utils.flag(this, 'object');
  this.assert(
      chai_utils.eql(obj, expected)
    , 'expected #{this} to deeply equal #{exp}'
    , 'expected #{this} to not deeply equal #{exp}'
    , sortAndStringify(expected)
    , sortAndStringify(obj)
  );
};
