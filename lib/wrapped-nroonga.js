var nroonga = require('nroonga');
var Deferred = require('jsdeferred').Deferred;
var path = require('path');
var mkdirp = require('mkdirp');

var ShortText =
      exports.ShortText = 'ShortText';
var UInt32 =
      exports.UInt32 = 'UInt32';

var TABLE_HASH_KEY =
      exports.TABLE_HASH_KEY = 'TABLE_HASH_KEY';
var TABLE_PAT_KEY =
      exports.TABLE_PAT_KEY = 'TABLE_PAT_KEY';
var KEY_NORMALIZE =
      exports.KEY_NORMALIZE = 'KEY_NORMALIZE';

var COLUMN_SCALAR =
      exports.COLUMN_SCALAR = 'COLUMN_SCALAR';
var COLUMN_INDEX =
      exports.COLUMN_INDEX = 'COLUMN_INDEX';
var COLUMN_VECTOR =
      exports.COLUMN_VECTOR = 'COLUMN_VECTOR';
var WITH_POSITION =
      exports.WITH_POSITION = 'WITH_POSITION';

var INDEX_COLUMN_DEFAULT_FLAGS =
      exports.INDEX_COLUMN_DEFAULT_FLAGS = COLUMN_INDEX + '|' + WITH_POSITION;

var TokenBigram =
      exports.TokenBigram = 'TokenBigram';

function Context(source) {
  if (typeof source == 'string') { // path
    mkdirp.sync(path.dirname(source));
    this._path = source;
    this._context = new nroonga.Database(source);
  } else if (source instanceof nroonga.Database)
    this._context = source;
  else
    return source;
}

Context.prototype = {
  command: function() {
    return this._context.command.apply(this._context, arguments);
  },
  commandSync: function() {
    return this._context.commandSync.apply(this._context, arguments);
  },
  commandString: function() {
    return this._context.commandString.apply(this._context, arguments);
  },
  commandSyncString: function() {
    return this._context.commandSyncString.apply(this._context, arguments);
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
      this._context.command(command, options, callback);
    else
      this._context.command(command, callback);

    return deferred;
  },
  commandDeferredString: function(command) {
    var deferred = new Deferred();
    this._context.commandString(command, function(error, data) {
      if (error)
        deferred.fail(error);
      else
        deferred.call(data);
    });
    return deferred;
  },

  tableListSync: function(tableName) {
    var result =  this.commandSync('table_list');
    return formatResults(result);
  },

  columnListSync: function(tableName) {
    var result =  this.commandSync('column_list', { table: tableName });
    return formatResults(result);
  },
  ordinalColumnsSync: function(tableName) {
    var columns = this.columnListSync(tableName);
    var ordinalColumns = columns.filter(function(column) {
      return column.name.charAt(0) !== '_';
    });
    return ordinalColumns;
  },

  close: function() {
    this._context.close();
    this._context = undefined;
  },

  reopen: function() {
    if (!this._path)
      throw new Error('cannot reopen');
    this._context = new nroonga.Database(this._path);
    return this;
  }
};

exports.Database = exports.Context = Context;

function formatResults(results) {
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
}
exports.formatResults = formatResults;

function formatSelectResult(result) {
  return {
    count: result[0][0],
    results: formatResults(result.slice(1))
  };
}
exports.formatSelectResult = formatSelectResult;
