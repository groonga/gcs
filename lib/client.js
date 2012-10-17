var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var CloudSearch = awssum.load('amazon/cloudsearch').CloudSearch;
var DocumentService = awssum.load('amazon/cloudsearch').DocumentService;

function Client(options) {
  this.domainName = options.domainName;
  this.host = options.host;
  this.port = options.port;
}
Client.prototype = {
  get configurationAPI() {
    if (!this._configurationAPI) {
      this._configurationAPI = new CloudSearch({
        accessKeyId: 'dummy-access-key-id',
        secretAccessKey: 'dummy-access-key',
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
    var self = this;
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
        });
        var self = this;
        self._documentsAPI.host = function() {
          return host;
        };
        self._documentsAPI.addExtras = function(options, args) {
          options.protocol = self.protocol || 'http';
          options.port =  port;
        };
      } catch(error) {
        if (error)
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
      { 'DomainNames.member.1' : domainName },
      function(error, domainStatuses) {
        if (error)
          self.raiseFatalError(error);
        // awssum cannot operate query options including ".", so we always get all domains...
        domainStatuses = domainStatuses.filter(function(domainStatus) {
          return domainStatus && domainStatus.DomainName == domainName;
        });
        if (domainStatuses.length) {
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
        'FieldNames.member.1': fieldName
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
        // awssum cannot operate query options including ".", so we always get all index fields...
        indexFields = indexFields.filter(function(indexField) {
          return indexField && indexField.Options.IndexFieldName == fieldName;
        });
        if (indexFields.length)
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
