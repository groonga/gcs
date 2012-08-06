var nroonga = require('./wrapped-nroonga');
var Domain = require('./database/domain').Domain;

var defaultDatabasePath =
      exports.defaultDatabasePath =
      CommandLineInterface.defaultDatabasePath = process.env.HOME + '/.gcs/database/gcs';
var defaultPrivilegedRanges =
      exports.defaultPrivilegedRanges =
      CommandLineInterface.defaultPrivilegedRanges = '127.0.0.0/8';

function CommandLineInterface(program) {
  this.program = program;
}
CommandLineInterface.prototype = {
  get databasePath() {
    return this.program.databasePath || defaultDatabasePath;
  },
  get context() {
    return this._context ||
           (this._context = new nroonga.Context(this.databasePath));
  },
  get domain() {
    return this._domain ||
           (this._domain = new Domain(this.program.domainName, this.context));
  },

  assertHaveDomainName: function() {
    if (!this.program.domainName) {
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

exports.Domain = Domain;
