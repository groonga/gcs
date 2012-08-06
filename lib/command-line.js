var program = require('commander');
var nroonga = require('./wrapped-nroonga');
var Domain = require('./database/domain').Domain;
var version = require('../package').version;

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.HOME + '/.gcs/database/gcs';
var defaultPrivilegedRanges =
      exports.defaultPrivilegedRanges =
      CommandLineInterface.defaultPrivilegedRanges = '127.0.0.0/8';

function CommandLineInterface() {
  this.program = program;
  this.program
      .version(version)
      .option('--database-path <path>',
              'database path [' + defaultDatabasePath + ']',
              String,
              defaultDatabasePath);
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
    this.program.parse(process.argv);
    return this;
  },
  usage: function() {
    this.program.option.apply(this.program, arguments);
    return this;
  },
  option: function() {
    this.program.option.apply(this.program, arguments);
    return this;
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
};
exports.CommandLineInterface = CommandLineInterface;

exports.Domain = CommandLineInterface.Domain = Domain;
