var Client = require(__dirname + '/../lib/client').Client;
var EventEmitter = require('events').EventEmitter;
var xml2js = require('xml2js');
var xml2jsConfig = JSON.parse(JSON.stringify(xml2js.defaults['0.1']));
xml2jsConfig.explicitRoot = true;

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

ScenariosRunner.prototype.run = function(scenarios) {
  var params = { scenarios: expandScenarios(scenarios) };
  this._process(params);
};

function cloneArray(array) {
  return array.map(function(aElement) {
    if (Array.isArray(aElement))
      return cloneArray(aElement);
    else
      return Object.create(aElement);
  });
};

function expandScenarios(scenarios) {
  if (!Array.isArray(scenarios))
    scenarios = [scenarios];

  var expanded = [];
  scenarios.forEach(function(scenario) {
    expanded = expanded.concat(expandScenario(scenario));
  });
  return expanded;
};
ScenariosRunner.expandScenarios =
  ScenarioRunner.expandScenarios = expandScenarios;

function expandScenario(scenario) {
  if (!scenario.requests)
    scenario = { requests: scenario };

  if (scenario.setup) {
    if (!Array.isArray(scenario.setup))
      scenario.setup = [scenario.setup];
  } else {
    scenario.setup = [];
  }

  if (scenario.teardown) {
    if (!Array.isArray(scenario.teardown))
      scenario.teardown = [scenario.teardown];
  } else {
    scenario.teardown = [];
  }

  var scenarios = [];
  scenario.requests.forEach(function(requests) {
    if (!Array.isArray(requests))
      requests = [requests];

    var expanded = Object.create(scenario);
    expanded.name = requests[0].name;
    expanded.requests = cloneArray(scenario.setup)
                          .concat(requests)
                          .concat(cloneArray(scenario.teardown));
    scenarios.push(expanded);
  });

  // make request names unique
  var names = {};
  scenarios.forEach(function(scenario) {
    scenario.requests.forEach(function(request) {
      request.name = scenario.name + ': ' + request.name;

      var count = 1;
      var name = request.name;
      while (name in names) {
        name = request.name + '-' + count++;
      }
      request.name = name;
      names[name] = true;
    });
  });

  return scenarios;
};
ScenariosRunner.expandScenario =
  ScenarioRunner.expandScenario = expandScenario;

ScenariosRunner.prototype._process = function(params) {
  if (!params.start) params.start = Date.now();
  var scenario = params.scenarios.shift();
  var self = this;

  var runner = new ScenarioRunner(this.options);

  runner.on('error:fatal', function(event) {
    self.emit('error:fatal', event);
  });

  runner.on('start', function(event) {
    self.emit('scenario', { runner: runner,
                            scenario: event.scenario });

    runner.on('end', function(event) {
      if (params.scenarios.length) {
        if (self.options.scenarioInterval && !event.skipped) {
          self.emit('wait', { message: 'waiting ' + self.options.scenarioInterval + 'msec for the next scenario...' });
          setTimeout(function() { self._process(params); },
                     self.options.scenarioInterval);
        } else {
          self._process(params);
        }
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
  if (this.options.ignoreDirtyEnvironment) {
    this._process(scenario);
  } else {
    var self = this;
    this.client.assertNoDomain(function(error) {
      if (error)
        self.emit('error:fatal', { error: error });
      else
        self._process(scenario);
    });
  }
};

ScenarioRunner.prototype.assertNoDomain = function(callback) {
  this.client.assertNoDomain(function(error) {
    callback();
  });
};

ScenarioRunner.prototype.initializeScenario = function(scenario) {
  if (!scenario.requests)
    scenario = { requests: scenario };

  scenario.toBeProcessedRequests = scenario.requests.slice(0);
  scenario.start = Date.now();
  scenario.processed = {};

  return scenario;
};

ScenarioRunner.prototype.shouldAccept = function(name) {
  if (!this.options.accept)
    return true;

  if (!this._acceptFilter) {
    this._acceptFilter = this.options.accept;
    if (typeof this._acceptFilter == 'string' &&
        /^\/(.+)\/([gim]*)/.test(this._acceptFilter)) {
      this._acceptFilter = new RegExp(RegExp.$1, RegExp.$2 || '');
    }
  }

  if (typeof this._acceptFilter == 'string')
    return name.indexOf(this._acceptFilter) > -1;
  else
    return this._acceptFilter.test(name);
};

ScenarioRunner.prototype.shouldReject = function(name) {
  if (!this.options.reject)
    return false;

  if (!this._rejectFilter) {
    this._rejectFilter = this.options.reject;
    if (typeof this._rejectFilter == 'string' &&
        /^\/(.+)\/([gim]*)/.test(this._rejectFilter)) {
      this._rejectFilter = new RegExp(RegExp.$1, RegExp.$2 || '');
    }
  }

  if (typeof this._rejectFilter == 'string')
    return name.indexOf(this._rejectFilter) > -1;
  else
    return this._rejectFilter.test(name);
};

ScenarioRunner.prototype._process = function(scenario, callback) {
  if (!scenario.toBeProcessedRequests) {
    scenario = this.initializeScenario(scenario);
    this.emit('start', { scenario: scenario });
  }

  var request = scenario.toBeProcessedRequests.shift();
  var self = this;
  var skipped = false;
  function processNext() {
    if (scenario.toBeProcessedRequests.length) {
      self._process(scenario, callback);
    } else {
      var elapsedTime = Date.now() - scenario.start;
      var event = {
        elapsedTime: elapsedTime,
        scenario: scenario,
        skipped: skipped
      };
      self.emit('end', event);
    }
  }

  var name = request.name;

  if (!this.shouldAccept(name) || this.shouldReject(name)) {
    skipped = true;
    return processNext();
  }

  var count = 1;
  while (name in scenario.processed) {
    name = request.name + count++;
  }

  this.emit('request:start', { scenario: scenario, request: request });

  var requestCallback = function(error, response) {
    if (error) response = error;

    var statusCode = response.StatusCode;
    if (statusCode == 400) {
      var parser = new xml2js.Parser(xml2jsConfig);
      parser.parseString(response.Body, function(error, result) {
        var errorCode = result.ErrorResponse.Error.Code;
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

    request.response = output;
    self.emit('request:end', { scenario: scenario, request: request });
    if (self.options.interval) {
      self.emit('request:wait', { message: 'waiting ' + self.options.interval + 'msec for the next request...' });
      setTimeout(processNext, self.options.interval);
    } else {
      processNext();
    }
  };

  switch (request.api) {
    case 'doc':
      var batches = request.body;
      if (typeof batches == 'string') {
        var path = request.body;
        path = path.replace(/%ROOT%/gim, __dirname + '/../');
        batches = this.client.readSDFBatch(path);
      }
      this.client.domainName = request.domain;
      return this.client.setupAPI('doc', function(documentsAPI) {
        documentsAPI.DocumentsBatch({ Docs: batches }, requestCallback);
      });

    case 'search':
      this.client.domainName = request.domain;
      return this.client.setupAPI('search', function(searchAPI) {
        searchAPI.Search(request.params, requestCallback);
      });

    case 'configuration':
    default:
      return this.client.rawConfigurationRequest(request.params.Action, request.params, requestCallback);
  }
};

ScenarioRunner.prototype._sendConfigurationRequest = function(scenario, callback) {
};

function toSafeName(name) {
  return name
           .replace(/[^a-zA-Z0-9]+/g, '-')
           .replace(/-$/, '');
};
ScenariosRunner.toSafeName =
  ScenarioRunner.toSafeName = toSafeName;

function Response(source) {
  source = source.split('\r\n\r\n');
  this.rawHeaders = source[0];
  this.rawBody = source.slice(1).join('\r\n\r\n');
}
Response.prototype = {
  get body() {
    if (!this._body) {
      if (/^\s*</.test(this.rawBody)) {
        this._body = this._XMLStringToJSON(this.rawBody);
      } else {
        try {
          this._body = JSON.parse(this.rawBody);
        } catch(error) {
          this._body = this.rawBody;
        }
      }
    }
    return this._body;
  },
  _XMLStringToJSON: function(xml) {
    var parser = new xml2js.Parser(xml2jsConfig);
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
  },

  get sortedBody() {
    if (!this._sortedBody) {
      if (this.body && typeof this.body == 'object')
        this._sortedBody = this._toSortedJSON(this.body, true);
      else
        this._sortedBody = this.body;
    }
    return this._sortedBody;
  },
  _toSortedJSON: function(fragment, doSort) {
    switch (typeof fragment) {
      default:
        return fragment;
      case 'object':
        var format = {};
        var keys = Object.keys(fragment);
        if (doSort) keys.sort();
        keys.forEach(function(key) {
          if (!fragment.hasOwnProperty(key))
            return;
          var doSort = this._orderedContainers.indexOf(key) < 0;
          format[key] = this._toSortedJSON(fragment[key], doSort);
        }, this);
        return format;
    }
  },
  _orderedContainers: [
    'DomainStatusList',
    'IndexFields',
    'FieldNames'
  ],

  get normalizedBody() {
    if (!this._normalizedBody)
      this._normalizedBody = this._normalize(this.sortedBody);
    return this._normalizedBody;
  },
  _normalize: function(fragment) {
    switch (typeof fragment) {
      default:
        return fragment;
      case 'object':
        var format = {};
        Object.keys(fragment).forEach(function(key) {
          if (!fragment.hasOwnProperty(key))
            return;

          var value = fragment[key];
          var normalized;
          switch (key) {
            case 'RequestId':
              normalized = '%REQUEST_ID%';
              break;

            case 'DomainId':
              normalized = value.replace(/^\d+\//, '%DOMAIN_ID%/');
              break;

            case 'Arn':
              normalized = value.replace(/^(arn:aws:cs:us-east-1:)\d+(:(?:doc|search)\/[^\/]+)$/, '$1%DOMAIN_ID%$2');
              break;

            case 'Endpoint':
              normalized = '%ENDPOINT%';
              break;

            case 'CreationDate':
              normalized = '%CREATION_DATE%';
              break;

            case 'UpdateDate':
              normalized = '%UPDATE_DATE%';
              break;

            case 'UpdateVersion':
              normalized = '%UPDATE_VERSION%';

            case 'Processing':
              normalized = '%PROCESSING_STATE%';
              break;

            case 'State':
              if (value == 'Active' || value == 'RequiresIndexDocuments')
                normalized = '%ACTIVE_OR_REQUIRES_INDEX_DOCUMENTS%';
              break;

            default:
              normalized = this._normalize(value);
              break;
          }
          format[key] = normalized;
        }, this);
        return format;
    }
  },

  get normalized() {
    if (!this._normalized)
      this._normalized = {
        status: this.rawHeaders.split('\r\n')[0],
        body: this.normalizedBody
      };
    return this._normalized;
  },

  equals: function(anotherResponse) {
    if (!anotherResponse) return false;
    var normalizedSelf = JSON.stringify(this.normalized);
    var normalizedAnother = JSON.stringify(anotherResponse.normalized);
    return normalizedSelf == normalizedAnother;
  }
};

exports.ScenariosRunner = ScenariosRunner;
exports.ScenarioRunner = ScenarioRunner;
exports.Response = Response;
