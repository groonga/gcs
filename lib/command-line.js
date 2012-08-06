var program = require('commander');
var nroonga = require('./wrapped-nroonga');
var Domain = require('./database/domain').Domain;

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.HOME + '/.gcs/database/gcs';
var defaultPrivilegedRanges =
      exports.defaultPrivilegedRanges =
      CommandLineInterface.defaultPrivilegedRanges = '127.0.0.0/8';

function CommandLineInterface() {
  this.program = program;
  this.program.
      .version(require('../package').version)
      .option('--database-path <path>',
              'database path [' + defaultDatabasePath + ']',
              String,
              defaultDatabasePath)
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
  },
  usage: function() {
    return this.program.option.apply(this.program, arguments);
  },
  option: function() {
    return this.program.option.apply(this.program, arguments);
  },

  assertHaveDomainName: function() {
    if (!this.options.domainName) {
      console.log('You must specify the domain name.');
      process.exit(1);
    }
  },

  assertDomainExists: function() {
    if (!this.domain.exists()) {
      console.log('You must specify an existing domain name.');
      process.exit(1);
    }
  },
};
exports.CommandLineInterface = CommandLineInterface;

exports.Domain = CommandLineInterface.Domain = Domain;
