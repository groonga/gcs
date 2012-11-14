var Client = require(__dirname + '/../lib/client').Client;
var EventEmitter = require('events').EventEmitter;

var statusCodeTable = {
  500: 'Inetnal Server Error',
  404: 'Not Found',
  409: 'Conflict',
  400: 'Bad Request',
  200: 'OK'
};

function Runner(options) {
  this.client = new Client(options);
  this.options = options;
  if (options.documentEndpoint)
    this.client.docEndpoint = options.documentEndpoint;
}

Runner.prototype = new EventEmitter();

Runner.prototype.run = function(scenario) {
  if (!Array.isArray(scenario))
    this._processScenario(scenario);
  else
    this._processScenarios({ scenarios: scenario });
};

Runner.prototype._processScenarios = function(params) {
  if (!params.start) params.start = Date.now();
  var scenario = params.scenarios.shift();
  var self = this;
  this._processScenario(
    scenario,
    function(error, event) {
      if (params.scenarios.length) {
        self._processScenarios(params);
      } else {
        var elapsedTime = Date.now() - params.start;
        self.emit('all:finish', {elapsedTime: elapsedTime});
      }
    }
  );
};

Runner.prototype._processScenario = function(scenario, callback) {
  if (!scenario.toBeProcessedRequests) {
    scenario.toBeProcessedRequests = scenario.requests.slice(0);
    scenario.start = Date.now();
    scenario.processed = {};
    this.emit('scenario:start', {scenario: scenario});
  }

  var request = scenario.toBeProcessedRequests.shift();
  var self = this;
  function processNext() {
    if (scenario.toBeProcessedRequests.length) {
      self._processScenario(scenario, callback);
    } else {
      var elapsedTime = Date.now() - scenario.start;
      self.emit('scenario:finish', {
        elapsedTime: elapsedTime,
        scenario: scenario
      });
      if (callback)
        callback(null, event);
    }
  }

  if (request.onlyGCS && this.options.acs)
    return processNext();

  var name = request.name;
  var count = 1;
  while (name in scenario.processed) {
    name = request.name + count++;
  }

  this.emit('request:start', {
    scenario: scenario,
    request: request
  });

  this.client.rawConfigurationRequest(request.params.Action, request.params, function(error, result) {
    var response = error || result;

    var statusCode = response.StatusCode;
    if (!statusCodeTable[statusCode]) {
      self.emit('error:status_unknown', {statusCode: statusCode});
      if (callback)
        callback(statusCode, null);
      return;
    }

    var output = '';
    output += 'HTTP/1.1 ' + statusCode + ' ' + statusCodeTable[statusCode] + '\r\n';
    for (var key in response.Headers) {
      output += key + ': ' + response.Headers[key] + '\r\n';
    };
    output += '\r\n';
    output += response.Body.toString();

    request.result = output;
    self.emit('request:finish', {scenario: scenario, request: request});
    processNext();
  });
};

Runner.toSafeName = function(name) {
  return name
           .replace(/[^a-zA-Z0-9]+/g, '-')
           .replace(/-$/, '');
};

exports.Runner = Runner;
