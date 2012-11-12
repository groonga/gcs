var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var gcsServer = require(__dirname + '/../lib/server');
var http = require('http');
var Deferred = require('jsdeferred').Deferred;
var nativeNroonga = require('nroonga');
var wrappedNroonga = require(__dirname + '/../lib/wrapped-nroonga');
var xml2js = require('xml2js');
var spawn = require('child_process').spawn;
var url = require('url');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');

var testBaseHost = 'api.localhost';
var testConfigurationHost = 'configuration.localhost';
var testPort = 3333;
exports.testBaseHost = testBaseHost;
exports.testConfigurationHost = testConfigurationHost;
exports.testPort = testPort;

function setupServer(context, extraOptions) {
  var options = { context:       context,
                  port:          testPort,
                  accessLogPath: resolve('test/access.log'),
                  queryLogPath:  resolve('test/query.log'),
                  errorLogPath:  resolve('test/error.log') };
  if (extraOptions)
    Object.keys(extraOptions).forEach(function(key) {
      options[key] = extraOptions[key];
    });
  var server = gcsServer.createServer(options);
  server.listen(testPort);

  return server;
}
exports.setupServer = setupServer;

function sendRequest(method, path, postData, headers) {
  var deferred = new Deferred();

  var options = {
        host: 'localhost',
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
Deferred.register('get', function() { return get.apply(this, arguments); });

function post(path, body, headers) {
  return sendRequest('POST', path, body, headers);
}
exports.post = post;
Deferred.register('post', function() { return post.apply(this, arguments); });

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
             (this._context = new wrappedNroonga.Database(databasePath));
    },
    clear: function() {
      var context = this._context;
      var tables = context.commandSync('table_list');
      wrappedNroonga.formatResults(tables).forEach(function(table) {
        context.commandSync('table_remove', { name: table.name });
      });
    },
    teardown: function() {
      this._context.close();
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

function XMLStringToJSON(xml) {
  var xml2js = require('xml2js');
  var parser = new xml2js.Parser({
                 explicitRoot: true
               });
  var json;
  parser.addListener('end', function(result) {
    json = result;
  });
  try {
    parser.parseString(xml);
  } catch (e) {
    console.log(xml);
    throw e;
  }
  return json;
}
exports.XMLStringToJSON = XMLStringToJSON;

function run() {
  var deferred = new Deferred();
  var options = Array.prototype.slice.call(arguments, 0)

  Deferred.next(function() {
    var commandName = options.shift();
    var commandPath = path.resolve(resolve('./bin'), commandName);
    var command = spawn(commandPath, options);
    var output = {
          stdout: '',
          stderr: ''
        };
    command.stdout.on('data', function(data) {
      output.stdout += data;
    });
    command.stderr.on('data', function(data) {
      output.stderr += data;
    });
    command.on('exit', function(code) {
      deferred.call({ code: code, output: output });
    });
  });

  return deferred;
}
exports.run = run;
Deferred.register('run', function() { return run.apply(this, arguments); });

function resolve(possibleRelativePath) {
  return path.resolve(process.cwd(), possibleRelativePath);
}
exports.resolve = resolve;

function toTimeStamp(date) {
  return date.getFullYear() + 'y' +
           ('0' + (date.getMonth() + 1)).slice(-2) + 'm' +
           ('0' + (date.getDate())).slice(-2) + 'd' +
           ('0' + (date.getHours())).slice(-2) + 'h' +
           ('0' + (date.getMinutes())).slice(-2) + 'm' +
           ('0' + (date.getSeconds())).slice(-2) + '.' +
           date.getMilliseconds() + 's';
}
exports.toTimeStamp = toTimeStamp;

function setupResponses(scenarios, date) {
  if (!date) date = new Date();
  var outputDir = path.join(temporaryDirectory, 'results.' + toTimeStamp(date));
  if (path.existsSync(outputDir)) {
    return Deferred.next(function() {
      return outputDir;
    });
  }

  mkdirp.sync(outputDir);
  return run(resolve('./tools/run-scenarios'),
               '--endpoint', '127.0.0.1.xip.io:' + testPort,
               '--scenarios', scenarios,
               '--output-directory', outputDir)
           .next(function() {
             return outputDir;
           });
};
exports.setupResponses = setupResponses;


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
        return '[' + object.map(function(item) { return sortAndStringify(item); }).join(', ') + ']';
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
  var actual = chai_utils.flag(this, 'object');
  this.assert(
      chai_utils.eql(obj, actual)
    , 'expected #{this} to deeply equal #{exp}'
    , 'expected #{this} to not deeply equal #{exp}'
    , sortAndStringify(obj)
    , sortAndStringify(actual)
  );
};
