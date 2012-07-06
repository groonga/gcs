var Database = require('../database').Database;
var translator = require('./translator');
var Domain = require('../domain').Domain;
var Deferred = require('jsdeferred').Deferred;

exports.INVALID_BATCH = Processor.INVALID_BATCH = 'Invalid Batch';

function Processor(options) {
  this.database = options.database || null;
  this.databasePath = options.databasePath;
  this.domain = new Domain(options.domainName || options.domain);
  this.initialize();
}

Processor.prototype = {
  initialize: function() {
    if (!this.database && !this.databasePath)
      throw new Error('no database path');
    this.database = new Database(this.database || this.databasePath);
    this.translator = new translator.Translator(this.domain);
  },
  getColumns: function() {
    var self = this;
    if (this._columns) {
      return self._columns;
    } else {
      var columns = this.database.columnNamesSync(this.translator.tableName);
      return this._columns = columns;
    }
  },
  validate: function(batches) {
    var columns = this.getColumns();
    var errors = [];
    batches.forEach(function(batch) {
      if (batch.type == 'add') {
        errors = errors.concat(this.validateAddBatch(batch, columns));
      }
    }, this);
    if (errors.length) {
      var error = new Error(exports.INVALID_BATCH);
      error.errors = errors;
      error.result = this.formatErrors(errors);
      throw error;
    }
  },
  validateAddBatch: function(batch, columns) {
    if (!batch.fields) {
      return [batch.id + ': You must specify "fields".'];
    }

    var column;
    var fieldsCount = 0;
    var errors = [];
    for (var field in batch.fields) {
      if (!batch.fields.hasOwnProperty(field))
        continue;

      fieldsCount++;

      try {
        column = this.domain.getIndexField(field).columnName;
      } catch(error) {
         errors.push(batch.id + ': ' + error.message);
        continue;
      }

      if (columns.indexOf(column) < 0)
        errors.push(batch.id + ': The field "' + field + '" is unknown.');

      if (batch.fields[field] === null)
        errors.push(batch.id + ': The field "' + field + '" is null.');
    }

    if (!fieldsCount)
      errors.push(batch.id + ': You must specify one or more fields to "fields".');

    return errors;
  },
  load: function(batches) {
    var commandSets = this.translator.translate(batches);
    var result = {
          adds: 0,
          deletes: 0,
          errors: [],
          warnings: []
        };
    var self = this;
    return Deferred.loop(commandSets.length, function(i) {
             var commandSet = commandSets[i];
             return self.database.commandDeferred(commandSet.command,
                                                  commandSet.options)
                        .next(function(commandResult) {
                          switch (commandSet.command) {
                            case 'load':
                              result.adds++;
                              break;
                            case 'delete':
                              result.deletes++;
                              break;
                          }
                        })
                        .error(function(error) {
                          result.errors.push(error);
                        });
           })
           .next(function() {
             return self.formatResult(result);
           });
  },
  formatResult: function(result) {
    var formattedResult = {
          status: 'success',
          adds: result.adds || 0,
          deletes: result.deletes || 0
        };
    if (result.errors.length) {
      formattedResult.status = 'error';
      formattedResult.errors = result.errors.map(function(error) {
        return {
          message: error.message || error
        };
      });
    }
    return formattedResult;
  },
  formatErrors: function(errors) {
    return this.formatResult({
      errors: errors
    });
  }
};

exports.Processor = Processor;
