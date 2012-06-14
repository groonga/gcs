var nroonga = require('nroonga');
var Deferred = require('jsdeferred').Deferred;

function Database(source) {
  if (typeof source == 'string') // path
    this._database = new nroonga.Database(source);
  else if (source instanceof nroonga.Database)
    this._database = source;
  else
    return source;
}

Database.prototype = {
  command: function() {
    return this._database.command.apply(this._database, arguments);
  },
  commandSync: function() {
    return this._database.commandSync.apply(this._database, arguments);
  },
  commandString: function() {
    return this._database.commandString.apply(this._database, arguments);
  },
  commandSyncString: function() {
    return this._database.commandSyncString.apply(this._database, arguments);
  },
  commandDeferred: function(command, options) {
    var deferred = new Deferred();
    var callback = function(error, data) {
          if (error)
            deferred.fail(error);
          else
            deferred.call(data);
        };

    if (options)
      database.command(command, options, callback);
    else
      database.command(command, callback);

    return deferred;
  },
  commandDeferredString: function(command) {
    var deferred = new Deferred();
    database.commandString(command, function(error, data) {
      if (error)
        deferred.fail(error);
      else
        deferred.call(data);
    });
    return deferred;
  }
};

exports.Database = Database;
