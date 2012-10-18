var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var CloudSearch = awssum.load('amazon/cloudsearch').CloudSearch;
var DocumentService = awssum.load('amazon/cloudsearch').DocumentService;

function Client(options) {
  this.domainName = options.domainName;
  this.host = options.host;
  this.port = options.port;
  this.docEndpoint = options.docEndpoint;
}
Client.prototype = {
  get configurationAPI() {
    if (!this._configurationAPI) {
      this._configurationAPI = new CloudSearch({
        accessKeyId: 'dummy-access-key-id',
        secretAccessKey: 'dummy-access-key'
      });
      var self = this;
      this._configurationAPI.host = function() {
        return self.host;
      };
      this._configurationAPI.addExtras = function(options, args) {
        options.protocol = self.protocol || 'http';
        options.port =  self.port;
      };
    }
    return this._configurationAPI;
  },

  setupDocumentsAPI: function(callback) {
    if (this.documentsAPI) {
      callback(this.documentsAPI);
      return;
    }

    var self = this;
    if (this.docEndpoint) {
      var parsedEndpoint = this.docEndpoint.match(/^(([^\.-]+)-([^\.-]+).+)(?::(\d+))?$/);
      var host = parsedEndpoint[1];
      var port = parsedEndpoint[4] || 80;
      this._documentsAPI = new DocumentService({
        accessKeyId: 'dummy-access-key-id',
        secretAccessKey: 'dummy-access-key',
        domainName: parsedEndpoint[2],
        domainId: parsedEndpoint[3],
        region: amazon.US_EAST_1
      });
      this._documentsAPI.host = function() {
        return host;
      };
      this._documentsAPI.addExtras = function(options, args) {
        options.protocol = self.protocol || 'http';
        options.port =  port;
      };
      this._documentsAPI.extractBody = function(options, args) {
        return 'json';
      };
      return callback(null, this.documentsAPI);
    }

    this.getDomainStatus(function(error, domain) {
      if (error)
        self.raiseFatalError(error);

      try {
        var endpoint = domain.DocService.Endpoint.split(':');
        var host = endpoint[0];
        var port = endpoint[1] || 80;

        self._documentsAPI = new DocumentService({
          accessKeyId: 'dummy-access-key-id',
          secretAccessKey: 'dummy-access-key',
          domainName: domain.DomainName,
          domainId: domain.DomainId.replace(new RegExp('/' + domain.DomainName + '$'), ''),
          region: amazon.US_EAST_1
        });
        self._documentsAPI.host = function() {
          return host;
        };
        self._documentsAPI.addExtras = function(options, args) {
          options.protocol = self.protocol || 'http';
          options.port =  port;
        };
        self._documentsAPI.extractBody = function(options, args) {
          return 'json';
        };
        callback(self.documentsAPI);
      } catch(error) {
        self.raiseFatalError(error);
      }
    });
  },
  get documentsAPI() {
    return this._documentsAPI;
  },

  raiseFatalError: function(error) {
    if (typeof error != 'string')
      error = 'Unexpected error: ' + JSON.stringify(error);
    console.log(error);
    process.exit(1);
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
          var domainStatuses = response.Body
               .DescribeDomainsResponse
               .DescribeDomainsResult
               .DomainStatusList
               .member;
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

  summarizeIndexFieldStatus: function(status) {
    var type = status.Options.TextOptions ? 'text' :
               status.Options.UIntOptions ? 'uint' :
               status.Options.LiteralOptions ? 'literal' :
               null;

    var options = status.Options.TextOptions ||
                  status.Options.UIntOptions ||
                  status.Options.LiteralOptions;
    var summarizedOptions = [];
    if (type == 'text' || type == 'uint' || options.SearchEnabled == 'true')
      summarizedOptions.push('Search');
    if (type != 'uint' && options.FacetEnabled == 'true')
      summarizedOptions.push('Facet');
    if (type == 'uint' || options.ResultEnabled == 'true')
      summarizedOptions.push('Result');

    return status.Options.IndexFieldName + ' ' +
             status.Status.State + ' ' +
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
  }
};
exports.Client = Client;
