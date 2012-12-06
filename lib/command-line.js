var program = require('commander');
var version = require('../package').version;
var path = require('path');

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.GCS_DATABASE_PATH || process.env.HOME + '/.gcs/database/gcs';
var defaultDocumentsPath =
      exports.defaultDocumentsPath =
      CommandLineInterface.defaultDocumentsPath = process.env.GCS_DOCUMENTS_PATH || process.env.HOME + '/.gcs/documents';
var defaultAccessLogPath =
      exports.defaultAccessLogPath =
      CommandLineInterface.defaultAccessLogPath = process.env.GCS_ACCESS_LOG_PATH;
var defaultQueryLogPath =
      exports.defaultQueryLogPath =
      CommandLineInterface.defaultQueryLogPath = process.env.GCS_QUERY_LOG_PATH;
var defaultErrorLogPath =
      exports.defaultErrorLogPath =
      CommandLineInterface.defaultErrorLogPath = process.env.GCS_ERROR_LOG_PATH;
var defaultPort =
      exports.defaultPort =
      CommandLineInterface.defaultPort = process.env.GCS_PORT || 7575;
var defaultEndpoint =
      exports.defaultEndpoint =
      CommandLineInterface.defaultEndpoint =
        '127.0.0.1.xip.io:' + defaultPort;
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
  // as option for Client
  get domainName() {
    return this.options.domainName;
  },
  get host() {
    return (this.options.endpoint || '').split(':')[0] || 'localhost';
  },
  get port() {
    return this.options.port ||
           Number((this.options.endpoint || '').split(':')[1] || 0) ||
           defaultPort;
  },

  get accessKeyId() {
    return this.options.accessKeyId ||
           process.env.AWS_ACCESS_KEY_ID ||
           'dummy-access-key-id';
  },
  set accessKeyId(value) {
    return this.options.accessKeyId = value;
  },

  get secretAccessKey() {
    return this.options.secretAccessKey ||
           process.env.AWS_SECRET_ACCESS_KEY ||
           'dummy-access-key';
  },
  set secretAccessKey(value) {
    return this.options.secretAccessKey = value;
  },

  get isACS() {
    return this.options.acs;
  },

  get databasePath() {
    return this.options.databasePath || defaultDatabasePath;
  },

  get documentsPath() {
    return this.options.documentsPath || defaultDocumentsPath;
  },

  get options() {
    return this.program;
  },

  get rawArgs() {
    return this.program.rawArgs;
  },

  parse: function(asClient) {
    this.program.version(version);

    if (this.reservedUsage)
      this.program.usage.apply(this.program, this.reservedUsage);
    else
      this.program.usage('[options]');

    this.reservedOptions.forEach(function(optionArguments) {
      this.program.option.apply(this.program, optionArguments);
    }, this);

    if (asClient) {
      this.program
          .option('-a, --access-key <access key id>',
                  'Your AWS access key. Used in conjunction with --secret-key. ' +
                    'Must be specified if you do not use an AWS credential file. ' +
                    '[' + process.env.AWS_ACCESS_KEY_ID + ']',
                  String)
          .option('-k, --secret-key <secret key>',
                  'Your AWS secret key. Used in conjunction with --access-key. ' +
                  'Must be specified if you do not use an AWS credential file. ' +
                    '[' + process.env.AWS_SECRET_ACCESS_KEY + ']',
                  String)
          .option('-e, --endpoint <hostname:port>',
                  'The host name (and port) to access the configuration API ' +
                    '[' + defaultEndpoint + ']',
                  String,
                  defaultEndpoint);
    }

    this.program.parse(process.argv);

    return this;
  },
  parseClient: function() {
    return this.parse(true);
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
    if (typeof error != 'string') {
      error = error.message ? 
        error.message + '\n' + error.stack : JSON.stringify(error);
      error = 'Unexpected error: ' + error;
    }
    console.log(error);
    process.exit(1);
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
