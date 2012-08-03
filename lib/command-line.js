var nroonga = require('./wrapped-nroonga');
var context;

exports.defaultDatabasePath = process.env.HOME + '/.gcs/database/gcs';
exports.defaultPrivilegedRanges = '127.0.0.0/8';
exports.getContext = function(databasePath) {
  return context ||
         (context = new nroonga.Context(databasePath || exports.defaultDatabasePath));
};

exports.Domain = require('./database/domain').Domain;
