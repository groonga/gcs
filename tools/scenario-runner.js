var Client = require(__dirname + '/../lib/client').Client;

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
Runner.prototype = {
  run: function(scenario, callback) {
    if (!Array.isArray(scenario))
      this._processScenario(scenario, callback);
    else
      this._processScenarios({ scenarios: scenario }, callback);
  },

  _processScenarios: function(params, globalCallback) {
    if (!params.start) params.start = Date.now();
    var scenario = params.scenarios.shift();
    var self = this;
    if (globalCallback)
      this.globalCallback = globalCallback;
    this._processScenario(
      scenario,
      function(error, event) {
        if (params.scenarios.length) {
          self._processScenarios(params);
        } else {
          var elapsedTime = Date.now() - params.start;
          if (self.globalCallback)
            self.globalCallback(null, { type: 'all:finish',
                                        elapsedTime: elapsedTime });
        }
      }
    );
  },

  _processScenario: function(scenario, callback) {
    if (!scenario.toBeProcessedRequests) {
      scenario.toBeProcessedRequests = scenario.requests.slice(0);
      scenario.start = Date.now();
      scenario.processed = {};
      if (this.globalCallback)
        this.globalCallback(null, { type: 'scenario:start',
                                    scenario: scenario });
    }

    var request = scenario.toBeProcessedRequests.shift();
    var self = this;
    function processNext() {
      if (scenario.toBeProcessedRequests.length) {
        self._processScenario(scenario, callback);
      } else {
        var elapsedTime = Date.now() - scenario.start;
        var event = { type: 'scenario:finish',
                      elapsedTime: elapsedTime,
                      scenario: scenario };
        if (self.globalCallback)
          self.globalCallback(null, event);
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

    if (this.globalCallback)
      this.globalCallback(null, { type: 'request:start',
                                  scenario: scenario,
                                  request: request });

    this.client.rawConfigurationRequest(request.params.Action, request.params, function(error, result) {
      var response = error || result;

      var statusCode = response.StatusCode;
      if (!statusCodeTable[statusCode]) {
        if (self.globalCallback)
          self.globalCallback(null, { type: 'error',
                                      statusCode: statusCode });
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
      if (self.globalCallback)
        self.globalCallback(null, { type: 'request:finish',
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
