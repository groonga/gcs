var cloudsearch = require('awssum-amazon-cloudsearch');
var amazon = require('awssum-amazon');
var CloudSearch = cloudsearch.CloudSearch;
var DocumentService = cloudsearch.DocumentService;
var SearchService = cloudsearch.SearchService;
var xml = require('./batch/xml');
var fs = require('fs');

var OPTIONAL_PARAM = { required : false, type : 'param' };

function sendRawDocumentRequest() {
}

function Client(options) {
  this.rawArgs = options.rawArgs;
  this.domainName = options.domainName;
  this.host = options.host;
  this.port = options.port;
  this.docEndpoint = options.docEndpoint;
  this.searchEndpoint = options.searchEndpoint;
  this.isACS = options.isACS;

  this.accessKeyId     = options.accessKeyId;
  this.secretAccessKey = options.secretAccessKey;
}
Client.prototype = {
  get configurationAPI() {
    if (!this._configurationAPI) {
      this._configurationAPI = new CloudSearch({
        accessKeyId:     this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      });
      if (!this.isACS) {
        var self = this;
        this._configurationAPI.host = function() {
          return self.host;
        };
        this._configurationAPI.addExtras = function(options, args) {
          options.protocol = self.protocol || 'http';
          options.port = self.port;
        };
      }
    }
    return this._configurationAPI;
  },

  get APIDefinitions() {
    return {
      'doc': {
        endPoint:    this.docEndPoint,
        elementName: 'DocService',
        klass:       DocumentService
      },
      'search': {
        endPoint:    this.searchEndPoint,
        elementName: 'SearchService',
        klass:       SearchService
      }
    };
  },
  setupAPI: function(type, callback) {
    this.cachedAPI = this.cachedAPI || {};
    var name = this.domainName + '_' + type;
    if (name in this.cachedAPI)
      return this.cacnedAPI[type];

    var self = this;
    var definition = this.APIDefinitions[type];
    if (definition.endPoint) {
      var parsedEndpoint = definition.endPoint.match(/^([^-]+-([^-]+)-([^\.]+)[^:]+)(?::(\d+))?$/);
      var api = this.createService({
        domainName: parsedEndpoint[2],
        domainId: parsedEndpoint[3],
        host: parsedEndpoint[1],
        port: parsedEndpoint[4] || 80,
        klass: definition.klass
      });
      this.cachedAPI[name] = api;
      return callback(api);
    }

    this.getDomainStatus(function(error, domain) {
      if (error)
        self.raiseFatalError(error);

      try {
        var endpoint = domain[definition.elementName].Endpoint.split(':');
        var api = self.createService({
          domainName: domain.DomainName,
          domainId: domain.DomainId.replace(new RegExp('/' + domain.DomainName + '$'), ''),
          host: endpoint[0],
          port: endpoint[1] || 80,
          klass: definition.klass
        });
        self.cachedAPI[name] = api;
        callback(api);
      } catch(error) {
        self.raiseFatalError(error);
      }
    });
  },
  createService: function(options) {
    var service = new options.klass({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      domainName: options.domainName,
      domainId: options.domainId,
      region: amazon.US_EAST_1
    });
    var self = this;
    var host = options.host;
    service.host = function() {
      return host;
    };
    service.extractBody = function(options, args) {
      return 'json';
    };
    var port = options.port;
    service.addCommonOptions = function(options, args) {
      options.protocol = self.protocol || 'http';
      options.port = port;
      options.headers['content-type'] = 'application/json';
      options.headers['content-length'] = self.countBytes(JSON.stringify(args.Docs));
    };
    return service;
  },
  countBytes: function(string) {
    string = encodeURIComponent(string);
    var escapedPartsMatcher = /\%[0-9a-f][0-9a-f]/gi;
    var escapedParts = string.match(escapedPartsMatcher);
    var notEscapedParts = string.replace(escapedPartsMatcher, '');
    return notEscapedParts.length + (escapedParts ? escapedParts.length : 0);
  },

  raiseFatalError: function(error) {
    if (typeof error != 'string') {
      error = error.message ?
        error.message + '\n' + error.stack : JSON.stringify(error);
      error = 'Unexpected error: ' + error;
    }
    console.log(error);
    process.exit(1);
  },

  rawConfigurationRequest: function(action, params, callback) {
    var extractBody = this.configurationAPI.extractBody;
    this.configurationAPI.extractBody = function() {
      return 'blob';
    };

    var operation = {
          defaults: {
            Action: action
          },
          args: {}
        };
    Object.keys(params).forEach(function(name) {
      operation.args[name] = OPTIONAL_PARAM;
    });

    var self = this;
    this.configurationAPI.send(operation, params, {}, function(error, result) {
      self.configurationAPI.extractBody = extractBody;
      callback(error, result);
    });
  },

  assertHaveDomainName: function() {
    if (!this.domainName)
      this.raiseFatalError('You must specify the domain name.');
    return this;
  },

  getDomainStatus: function(domainName, callback) {
    if (typeof domainName == 'function') {
      this.assertHaveDomainName();
      callback = domainName;
      domainName = this.domainName;
    }

    var self = this;
    this.getDomainStatuses(
      { DomainNames: [domainName] },
      function(error, domainStatuses) {
        if (error)
          self.raiseFatalError(error);
        if (domainStatuses.length && domainStatuses[0]) {
          callback(null, domainStatuses[0]);
        } else {
          callback(domainName + ' does not exist. You must specify an existing domain name.', null);
        }
      }
    );
  },

  getDomainStatuses: function(options, callback) {
    try {
      var self = this;
      if (!callback) callback = options;
      var domainStatusesCallback = function(error, response) {
          if (error)
            self.raiseFatalError(error);
          var domainStatuseList = response.Body
               .DescribeDomainsResponse
               .DescribeDomainsResult
               .DomainStatusList;
          var domainStatuses = domainStatuseList && domainStatuseList.member || [];
          if (!Array.isArray(domainStatuses))
            domainStatuses = [domainStatuses];
          callback(null, domainStatuses);
        };
      if (arguments.length > 1)
        this.configurationAPI.DescribeDomains(options, domainStatusesCallback);
      else
        this.configurationAPI.DescribeDomains(domainStatusesCallback);
    } catch(error) {
      this.raiseFatalError(error);
    }
  },

  getIndexFieldStatus: function(options, callback) {
    var domainName;
    var fieldName;
    if (typeof options == 'string') {
      domainName = this.domainName;
      fieldName = options;
    } else {
      domainName = options.domainName;
      fieldName = options.fieldName;
    }

    var self = this;
    this.configurationAPI.DescribeIndexFields(
      {
        DomainName: domainName,
        FieldNames: [fieldName]
      },
      function(error, response) {
        if (error)
          self.raiseFatalError(error);

        var indexFields = response.Body
             .DescribeIndexFieldsResponse
             .DescribeIndexFieldsResult
             .IndexFields
             .member;
        indexFields = !indexFields ? [] :
                      !Array.isArray(indexFields) ? [indexFields] :
                      indexFields;
        if (indexFields.length && indexFields[0])
          callback(null, indexFields[0]);
        else
          callback(fieldName + ' does not exist.', null);
      }
    );
  },

  getIndexFieldStatuses: function(domainName, callback) {
    if (typeof domainName == 'function') {
      this.assertHaveDomainName();
      callback = domainName;
      domainName = this.domainName;
    }

    var self = this;
    this.configurationAPI.DescribeIndexFields(
      { DomainName: domainName },
      function(error, response) {
        if (error)
          self.raiseFatalError(error);

        var indexFields = response.Body
             .DescribeIndexFieldsResponse
             .DescribeIndexFieldsResult
             .IndexFields
             .member;
        indexFields = !indexFields ? [] :
                      !Array.isArray(indexFields) ? [indexFields] :
                      indexFields;
        callback(null, indexFields);
      }
    );
  },

  getDefaultSearchField: function(domainName, callback) {
    if (typeof domainName == 'function') {
      this.assertHaveDomainName();
      callback = domainName;
      domainName = this.domainName;
    }

    var self = this;
    this.configurationAPI.DescribeDefaultSearchField(
      { DomainName: domainName },
      function(error, response) {
        if (error)
          self.raiseFatalError(error);
        try {
          var defaultSearchField = response.Body
                .DescribeDefaultSearchFieldResponse
                .DescribeDefaultSearchFieldResult
                .DefaultSearchField
                .Options;
          if (typeof defaultSearchField != 'string') defaultSearchField = '';
          callback(null, defaultSearchField);
        } catch(error) {
          commandLine.raiseFatalError(error);
        }
      }
    );
  },

  summarizeIndexFieldStatus: function(status, noStatus) {
    var type = status.Options.IndexFieldType;
    var options = status.Options.TextOptions ||
                  status.Options.UIntOptions ||
                  status.Options.LiteralOptions ||
                  {};
    var summarizedOptions = [];
    if (type == 'text' || type == 'uint' || options.SearchEnabled == 'true')
      summarizedOptions.push('Search');
    if (type != 'uint' && options.FacetEnabled == 'true')
      summarizedOptions.push('Facet');
    if (type == 'uint' || options.ResultEnabled == 'true')
      summarizedOptions.push('Result');

    return status.Options.IndexFieldName + ' ' +
             (noStatus ? '' : (status.Status.State + ' ')) +
             type + ' (' + summarizedOptions.join(' ') + ')';
  },

  assertDomainExists: function(callback) {
    var domainName = this.domainName;
    var self = this;
    this.getDomainStatus(domainName, function(error, domain) {
      if (error || !domain)
        self.raiseFatalError(domainName + ' does not exist. You must specify an existing domain name.');
      callback();
    });
  },

  assertNoDomain: function(callback) {
    this.getDomainStatuses(function(error, domains) {
      if (!error && domains.length)
        error = new Error(domains.length + ' domains exist unexpectedly.');
      callback(error);
    });
  },

  detectFileFormat: function(path) {
    var format = path.match(/\.([^\.]+)$/i);
    var supportedFormats = ['xml', 'json'];
    if (!format)
      this.raiseFatalError("Couldn't detect format");

    format = format[1].toLowerCase();

    if (supportedFormats.indexOf(format) < 0)
      this.raiseFatalError('Unknown format <' + format + '>. Supported: ' + supportedFormats.join(', '));

    return format;
  },
  readSDFBatch: function(path, format) {
    format = format || this.detectFileFormat(path);
    var batches = fs.readFileSync(path, 'UTF-8');
    if (format == 'xml')
      batches = xml.toJSON(batches);
    else
      batches = JSON.parse(batches);
    return batches;
  }
};

function toValidHostAndPort(hostAndPort) {
  hostAndPort = hostAndPort.split(':');
  if (hostAndPort[0] == 'localhost')
    hostAndPort[0] = '127.0.0.1';
  if (hostAndPort[0].match(/^\d+\.\d+\.\d+\.\d+$/))
    hostAndPort[0] += '.xip.io';
  return hostAndPort.join(':');
}
Client.toValidHostAndPort = toValidHostAndPort;

exports.Client = Client;
