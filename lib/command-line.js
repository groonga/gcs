var program = require('commander');
var nroonga = require('./wrapped-nroonga');
var Domain = require('./database/domain').Domain;
var version = require('../package').version;
var path = require('path');

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.HOME + '/.gcs/database/gcs';
var defaultPrivilegedRanges =
      exports.defaultPrivilegedRanges =
      CommandLineInterface.defaultPrivilegedRanges = '127.0.0.0/8';

function CommandLineInterface() {
  this.program = program;
  this.reservedUsage = null;
  this.reservedOptions = [];
}
CommandLineInterface.prototype = {
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
              'database path [' + defaultDatabasePath + ']',
              String,
              defaultDatabasePath);

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

  assertHaveDomainName: function() {
    if (!this.options.domainName) {
      console.log('You must specify the domain name.');
      process.exit(1);
    }
    return this;
  },

  assertDomainExists: function() {
    if (!this.domain.exists()) {
      console.log('You must specify an existing domain name.');
      process.exit(1);
    }
    return this;
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
