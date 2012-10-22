var program = require('commander');
var version = require('../package').version;
var path = require('path');

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
  // as option for Client
  get domainName() {
    return this.options.domainName;
  },
  get host() {
    return this.options.baseHost.split(':')[0];
  },
  get port() {
    return this.options.port || this.options.baseHost.split(':')[1];
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
