var Client = require(__dirname + '/../lib/client').Client;
var fs = require('fs');
var path = require('path');

var statusCodeTable = {
  500: 'Inetnal Server Error',
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
    if (!Array.isArray(scenarios))
      scenarios = [scenarios];
    this._processScenario({ scenarios: scenarios });
  },

  _processScenario: function(params) {
    if (!params.start) params.start = Date.now();
    var scenario = params.scenarios.shift();

    if (this.callback)
      this.callback(null, { type: 'scenario:start',
                            scenario: scenario });

    var self = this;
    this._processScenario(
      scenario,
      function(error) {
        if (params.scenarios.length) {
          self._processScenario(params);
        } else {
          var elapsedTime = Date.now() - params.start;
          if (self.callback)
            self.callback(null, { type: 'all:finish',
                                  elapsedTime: elapsedTime });
        }
      }
    );
  },

  toFileName: function(scenarioName) {
    return scenarioName
             .replace(/[^a-zA-Z0-9]+/g, '-')
             .replace(/-$/, '') + '.txt';
  },

  _processScenario: function(scenario, callback) {
    if (!scenario.start) scenario.start = Date.now();
    if (!scenario.processed) scenario.processed = {};

    var request = scenario.requests.shift();
    var results = {};

    var self = this;
    function processNext() {
      if (scenario.requests.length) {
        self.processScenario(scenario, callback);
      } else {
        scenario.results = results;
        var elapsedTime = Date.now() - scenario.start;
        if (self.callback)
          self.callback(null, { type: 'scenario:finish',
                                elapsedTime: elapsedTime,
                                scenario: scenario });
        callback(null, results);
      }
    }

    if (request.onlyGCS && this.options.acs)
      return processNext();

    var name = request.name;
    var count = 1;
    while (name in scenario.processed) {
      name = request.name + count++;
    }

    if (this.callback)
      this.callback(null, { type: 'request:start',
                            scenario: scenario,
                            request: request });

    this.client.rawConfigurationRequest(request.params.Action, request.params, function(error, result) {
      var response = error || result;

      var statusCode = response.StatusCode;
      if (!statusCodeTable[statusCode]) {
        if (self.callback)
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
      request.result = output;
      if (self.callback)
        self.callback(null, { type: 'request:finish',
                              scenario: scenario,
                              request: request });

      processNext();
    });
  }
};
Runner.toSafeName = function(name) {
  return name
           .replace(/[^a-zA-Z0-9]+/g, '-')
           .replace(/-$/, '');
};
exports.Runner = Runner;
