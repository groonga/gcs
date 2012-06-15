var nroonga = require('nroonga');
var Deferred = require('jsdeferred').Deferred;

var ShortText =
      exports.ShortText =
      Database.ShortText = 'ShortText';

var TABLE_HASH_KEY =
      exports.TABLE_HASH_KEY =
      Database.TABLE_HASH_KEY = 'TABLE_HASH_KEY';
var TABLE_PAT_KEY =
      exports.TABLE_PAT_KEY =
      Database.TABLE_PAT_KEY = 'TABLE_PAT_KEY';
var KEY_NORMALIZE =
      exports.KEY_NORMALIZE =
      Database.KEY_NORMALIZE = 'KEY_NORMALIZE';

var COLUMN_SCALAR =
      exports.COLUMN_SCALAR =
      Database.COLUMN_SCALAR = 'COLUMN_SCALAR';
var COLUMN_INDEX =
      exports.COLUMN_INDEX =
      Database.COLUMN_INDEX = 'COLUMN_INDEX';
var WITH_POSITION =
      exports.WITH_POSITION =
      Database.WITH_POSITION = 'WITH_POSITION';

var TokenBigram =
      exports.TokenBigram =
      Database.TokenBigram = 'TokenBigram';

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
      this._database.command(command, options, callback);
    else
      this._database.command(command, callback);

    return deferred;
  },
  commandDeferredString: function(command) {
    var deferred = new Deferred();
    this._database.commandString(command, function(error, data) {
      if (error)
        deferred.fail(error);
      else
        deferred.call(data);
    });
    return deferred;
  },

  columnList: function(tableName) {
    return this.commandDeferred('column_list',
                                { table: tableName })
             .next(function(result) {
                return Database.formatResults(result);
             });
  },
  columnNamesSync: function(tableName) {
    var list = this.commandSync('column_list', {table: tableName});
    var columns = Database.formatResults(list);
    var ordinalColumns = columns.filter(function(column) {
      return column.name.slice(0, 1) !== '_';
    });
    var names = ordinalColumns.map(function(column) {
      return column.name;
    });
    return names;
  }
};

exports.Database = Database;

exports.formatResults = Database.formatResults = function(results) {
  var columns = {};
  results[0].forEach(function(column, index) {
    columns[index] = column[0];
  });

  var hashResults = [];
  results.slice(1).forEach(function(result) {
    var hashResult = {};
    result.forEach(function(column, index) {
      hashResult[columns[index]] = column;
    });
    hashResults.push(hashResult);
  });
  return hashResults;
};
