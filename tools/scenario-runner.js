var Client = require(__dirname + '/../lib/client').Client;
var EventEmitter = require('events').EventEmitter;
var xml2js = require('xml2js');

var statusCodeTable = {
  500: 'Inetnal Server Error',
  404: 'Not Found',
  409: 'Conflict',
  400: 'Bad Request',
  200: 'OK'
};

function ScenariosRunner(options) {
  this.options = options;
}

ScenariosRunner.prototype = new EventEmitter();

ScenariosRunner.prototype.run = function(scenario) {
  this._process({ scenarios: scenario });
};

ScenariosRunner.prototype._process = function(params) {
  if (!params.start) params.start = Date.now();
  var scenario = params.scenarios.shift();
  var self = this;

  var runner = new ScenarioRunner(this.options);
  runner.on('start', function(event) {
    self.emit('scenario', { runner: runner,
                            scenario: event.scenario });

    runner.on('end', function(event) {
      if (params.scenarios.length) {
        self._process(params);
      } else {
        var elapsedTime = Date.now() - params.start;
        self.emit('end', { elapsedTime: elapsedTime });
      }
    });
  });
  runner.run(scenario);
};

function ScenarioRunner(options) {
  this.client = new Client(options);
  this.options = options;
  if (options.documentEndpoint)
    this.client.docEndpoint = options.documentEndpoint;
}

ScenarioRunner.prototype = new EventEmitter();

ScenarioRunner.prototype.run = function(scenario) {
  this._process(scenario);
};

ScenarioRunner.prototype._process = function(scenario, callback) {
  if (!scenario.toBeProcessedRequests) {
    scenario.toBeProcessedRequests = scenario.requests.slice(0);
    scenario.start = Date.now();
    scenario.processed = {};
    this.emit('start', { scenario: scenario });
  }

  var request = scenario.toBeProcessedRequests.shift();
  var self = this;
  function processNext() {
    if (scenario.toBeProcessedRequests.length) {
      self._process(scenario, callback);
    } else {
      var elapsedTime = Date.now() - scenario.start;
      var event = {
        elapsedTime: elapsedTime,
        scenario: scenario
      };
      self.emit('end', event);
    }
  }

  if (request.onlyGCS && this.options.acs)
    return processNext();

  var name = request.name;
  var count = 1;
  while (name in scenario.processed) {
    name = request.name + count++;
  }

  this.emit('request:start', { scenario: scenario, request: request });

  this.client.rawConfigurationRequest(request.params.Action, request.params, function(error, result) {
    var response = error || result;

    var statusCode = response.StatusCode;
    if (statusCode == 400) {
      var parser = new xml2js.Parser({ explicitRoot: true });
      parser.parseString(response.Body, function(error, result) {
        var errorCode = result.Response.Errors.Error.Code;
        if (errorCode === 'Throttling') {
          self.emit('error:throttling');
        }
      });
    }
    if (!statusCodeTable[statusCode]) {
      self.emit('error:status_unknown', { statusCode: statusCode });
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
    self.emit('request:end', { scenario: scenario, request: request });
    processNext();
  });
};

function toSafeName(name) {
  return name
           .replace(/[^a-zA-Z0-9]+/g, '-')
           .replace(/-$/, '');
};
ScenariosRunner.toSafeName = ScenarioRunner.toSafeName = toSafeName;

exports.ScenariosRunner = ScenariosRunner;
exports.ScenarioRunner = ScenarioRunner;
