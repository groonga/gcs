var nroonga = require('nroonga');
var Deferred = require('jsdeferred').Deferred;
var path = require('path');
var mkdirp = require('mkdirp');

var ShortText =
      exports.ShortText =
      Database.ShortText = 'ShortText';
var UInt32 =
      exports.UInt32 =
      Database.UInt32 = 'UInt32';

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
var COLUMN_VECTOR =
      exports.COLUMN_VECTOR =
      Database.COLUMN_VECTOR = 'COLUMN_VECTOR';
var WITH_POSITION =
      exports.WITH_POSITION =
      Database.WITH_POSITION = 'WITH_POSITION';

var INDEX_COLUMN_DEFAULT_FLAGS =
      exports.INDEX_COLUMN_DEFAULT_FLAGS =
      Database.INDEX_COLUMN_DEFAULT_FLAGS = COLUMN_INDEX + '|' + WITH_POSITION;

var TokenBigram =
      exports.TokenBigram =
      Database.TokenBigram = 'TokenBigram';

function Database(source) {
  if (typeof source == 'string') { // path
    mkdirp.sync(path.dirname(source));
    this._database = new nroonga.Database(source);
  } else if (source instanceof nroonga.Database)
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

  columnListSync: function(tableName) {
    var result =  this.commandSync('column_list', { table: tableName });
    return Database.formatResults(result);
  },
  ordinalColumnsSync: function(tableName) {
    var columns = this.columnListSync(tableName);
    var ordinalColumns = columns.filter(function(column) {
      return column.name.charAt(0) !== '_';
    });
    return ordinalColumns;
  },
  columnNamesSync: function(tableName) {
    var columns = this.ordinalColumnsSync(tableName);
    var names = columns.map(function(column) {
      return column.name;
    });
    return names;
  }
};

exports.Database = Database;

exports.formatResults = Database.formatResults = function(results) {
  if (!results || !results.length)
    return [];

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
