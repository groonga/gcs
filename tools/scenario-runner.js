var Client = require(__dirname + '/../lib/client').Client;
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var statusCodeTable = {
  404: 'Not Found',
  409: 'Conflict',
  400: 'Bad Request',
  200: 'OK'
};

function Runner(options, callback) {
  this.client = new Client(options);
  this.options = options;
  if (options.documentEndpoint)
    this.client.docEndpoint = options.documentEndpoint;
  this.callback = callback;
}
Runner.prototype = {
  run: function(scenarios) {
    this.processScenarios({ scenarios: scenarios });
  },

  processScenarios: function(params) {
    if (!params.start) params.start = Date.now();
    var scenarioFile = params.scenarios.shift();

    this.callback(null, { type: 'scenario:start', path: scenarioFile });

    var scenario = fs.readFileSync(scenarioFile);
    scenario = JSON.parse(scenario);

    var scenarioName = path.basename(scenarioFile, '.json');
    var resultsDir;
    if (this.options.outputDirectory) {
      resultsDir = path.resolve(this.options.outputDirectory,
                                scenarioName);
      mkdirp.sync(resultsDir);
    }

    var self = this;
    this.processScenario(
      { name:       scenarioName,
        requests:   scenario,
        resultsDir: resultsDir },
      function(error) {
        if (params.scenarios.length) {
          self.processScenarios(params);
        } else {
          var elapsedTime = Date.now() - params.start;
          self.callback(null, { type: 'all:finish', elapsedTime: elapsedTime });
        }
      }
    );
  },

  scenarioNameToFileName: function(scenarioName) {
    return scenarioName
             .replace(/[^a-zA-Z0-9]+/g, '-')
             .replace(/-$/, '') + '.txt';
  },

  processScenario: function(params, callback) {
    if (!params.start) params.start = Date.now();
    if (!params.processed) params.processed = {};

    var request = params.requests.shift();
    var results = {};

    var self = this;
    function processNext() {
      if (params.requests.length) {
        self.processScenario(params, callback);
      } else {
        var elapsedTime = Date.now() - params.start;
        self.callback(null, { type: 'scenario:finish',
                              elapsedTime: elapsedTime,
                              results: results });
        callback(null);
      }
    }

    if (request.onlyGCS && this.options.acs)
      return processNext();

    var name = request.name;
    var count = 1;
    while (name in params.processed) {
      name = request.name + count++;
    }

    this.callback(null, { type: 'request:start', name: name });

    var filename = this.scenarioNameToFileName(name);
    this.client.rawConfigurationRequest(request.params.Action, request.params, function(error, result) {
      var response = error || result;

      var statusCode = response.StatusCode;
      if (!statusCodeTable[statusCode]) {
        self.callback(null, { type: 'error', statusCode: statusCode });
        return;
      }

      var output = '';
      output += 'HTTP/1.1 ' + statusCode + ' ' + statusCodeTable[statusCode] + '\r\n';
      for (var key in response.Headers) {
        output += key + ': ' + response.Headers[key] + '\r\n';
      };
      output += '\r\n';
      output += response.Body.toString();

      results[name] = output;
      if (params.resultsDir) {
        var resultPath = path.resolve(params.resultsDir, filename);
        fs.writeFile(resultPath, output);
        self.callback(null, { type: 'request:write', path: resultPath });
      }

      processNext();
    });
  }
};
exports.Runner = Runner;
