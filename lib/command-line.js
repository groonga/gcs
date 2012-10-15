var program = require('commander');
var nroonga = require('./wrapped-nroonga');
var Domain = require('./database/domain').Domain;
var version = require('../package').version;
var path = require('path');

var awssum = require('awssum');
var amazon = awssum.load('amazon/amazon');
var CloudSearch = awssum.load('amazon/cloudsearch').CloudSearch;

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.GCS_DATABASE_PATH || process.env.HOME + '/.gcs/database/gcs';
var defaultPort =
      exports.defaultPort =
      CommandLineInterface.defaultPort = process.env.GCS_PORT || 7575;
var defaultBaseHost =
      exports.defaultBaseHost =
      CommandLineInterface.defaultBaseHost =
        process.env.GCS_BASE_HOST || '127.0.0.1.xip.io:' + defaultPort;
var defaultConfigurationHost =
      exports.defaultConfigurationHost =
      CommandLineInterface.defaultConfigurationHost =
        process.env.GCS_CONFIGURATION_HOST || '127.0.0.1.xip.io:' + defaultPort;
var defaultPrivilegedRanges =
      exports.defaultPrivilegedRanges =
      CommandLineInterface.defaultPrivilegedRanges =
        process.env.GCS_PRIVILEGED_RANGES || '127.0.0.0/8';

function CommandLineInterface() {
  this.program = program;
  this.reservedUsage = null;
  this.reservedOptions = [];
}
CommandLineInterface.prototype = {
  get cloudSearch() {
    if (!this._couldSearch) {
      this._cloudSearch = new CloudSearch({
        accessKeyId: 'dummy-access-key-id',
        secretAccessKey: 'dummy-access-key',
      });
      var CLI = this;
      this._cloudSearch.host = function() {
        return CLI.options.baseHost.split(':')[0];
      };
      this._cloudSearch.addExtras = function(options, args) {
        options.protocol = 'http';
        options.port =  CLI.options.baseHost.split(':')[1] || CLI.options.port;
      };
    }
    return this._cloudSearch;
  },
  get domainName() {
    return this.options.domainName;
  },

  get databasePath() {
    return this.options.databasePath || defaultDatabasePath;
  },
  get context() {
    return this._context ||
           (this._context = new nroonga.Context(this.databasePath));
  },
  get domain() {
    return this._domain ||
           (this._domain = new Domain(this.options.domainName, this.context));
  },
  get options() {
    return this.program;
  },

  parse: function() {
    this.program.version(version);

    if (this.reservedUsage)
      this.program.usage.apply(this.program, this.reservedUsage);
    else
      this.program.usage('[options]');

    this.reservedOptions.forEach(function(optionArguments) {
      this.program.option.apply(this.program, optionArguments);
    }, this);

    this.program
      .option('--database-path <path>',
              'database path' +
                '(GCS_DATABASE_PATH) ' +
                '[' + defaultDatabasePath + ']',
              String,
              defaultDatabasePath)
      .option('-p, --port <port>',
              'specify port' +
                '(GCS_PORT) ' +
                '[' + defaultPort + ']',
              Number,
              defaultPort)
      .option('--base-host <hostname>',
              'The base host name assigned to the service ' +
                '(GCS_BASE_HOST) ' +
                '[' + defaultBaseHost + ']',
              String,
              defaultBaseHost);

    this.program.parse(process.argv);

    return this;
  },
  usage: function() {
    this.reservedUsage = Array.prototype.slice.call(arguments, 0)
    return this;
  },
  option: function() {
    this.reservedOptions.push(Array.prototype.slice.call(arguments, 0));
    return this;
  },

  prompt: function() {
    return this.prompt.confirm.apply(this.program, arguments);
  },
  confirm: function() {
    return this.program.confirm.apply(this.program, arguments);
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
    var self = this;
    this.getDomainStatuses(
      { 'DomainNames.member.1' : domainName },
      function(error, domainStatuses) {
        if (domainStatuses.length) {
          callback(null, domainStatuses[0]);
        } else {
          self.raiseFatalError('You must specify an existing domain name.');
        }
      }
    );
  },

  getDomainStatuses: function(options, callback) {
    var self = this;
    var domainStatusesCallback = function(error, response) {
        if (error)
          self.raiseFatalError(error);
        var domainStatuses = response.Body
             .DescribeDomainsResponse
             .DescribeDomainsResult
             .DomainStatusList
             .member;
        (callback || options)(null, domainStatuses);
      };
    if (callback)
      this.cloudSearch.DescribeDomains(options, domainStatusesCallback);
    else
      this.cloudSearch.DescribeDomains(domainStatusesCallback);
  },

  getIndexFieldStatuses: function(domainName, callback) {
    var self = this;
    this.cloudSearch.DescribeIndexFields(
      { DomainName: domainName },
      function(error, response) {
        if (error)
          self.raiseFatalError(error);

        var indexFields = response.Body
             .DescribeIndexFieldsResponse
             .DescribeIndexFieldsResult
             .IndexFields;
        indexFields = Array.isArray(indexFields.members) ? indexFields.members : [];
        callback(null, indexFields);
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

  assertDomainExistsHTTP: function(callback) {
    this.getDomainStatus(this.domainName, function(error, domain) {
      callback();
    });
  },

  assertDomainExists: function() {
    if (!this.domain.exists())
      this.raiseFatalError('You must specify an existing domain name.');
    return this;
  },

  hasOption: function(option) {
    return this.program.rawArgs.indexOf('--' + option) > -1 ||
           this.program.rawArgs.indexOf('-' + option) > -1;
  },

  hasTooManyExclusiveOptions: function(options) {
    var havingOptions = options.map(function(option) {
          return this.option[option] ? '*' : '' ;
        }, this);
    return havingOptions.join('').length > 1;
  }
};
exports.CommandLineInterface = CommandLineInterface;

CommandLineInterface.resolve = function(possibleRelativePath) {
  return path.resolve(process.cwd(), possibleRelativePath);
};

exports.Domain = CommandLineInterface.Domain = Domain;
