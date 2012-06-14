var nroonga = require('nroonga');
var translator = require('./translator');
var resolver = require('../resolver');
var formatter = require('../formatter');
var Deferred = require('jsdeferred').Deferred;

function Processor(options) {
  this.database = options.database || null;
  this.databasePath = options.databasePath;
  this.domain = options.domain;
  this.initialize();
}

Processor.prototype = {
  initialize: function() {
    if (!this.database) {
      if (!this.databasePath)
        throw new Error('no database path');
      this.database = new nroonga.Database(this.databasePath);
    }
    this.translator = new translator.Translator(this.domain);
  },
  getColumns: function() {
    var deferred = new Deferred();
    var self = this;
    if (this._columns) {
      Deferred.next(function() {
        return self._columns;
      });
    } else {
      this.database.command('column_list',
                            { table: this.translator.tableName },
                            function(error, result) {
                              if (error)
                                return deferred.fail(error);

                              var columns = formatter.formatResults(result);
                              columns = columns.map(function(column) {
                                return column.name;
                              }).filter(function(column) {
                                return column != '_key';
                              });
                              deferred.call(self._columns = columns)
                            });
    }
    return deferred;
  },
  process: function(batches) {
    var self = this;
    return this.validate(batches)
               .next(function() {
                 return self.load(batches);
               });
  },
  validate: function(batches) {
    function validateWithKnownColumns(columns) {
      var unknownFields = [];
      var invalidBatches = batches.filter(function(batch) {
            if (batch.type != 'add')
              return false;
            var column;
            for (var field in batch.fields) {
              if (!batch.fields.hasOwnProperty(field))
                continue;
              column = resolver.getColumnNameFromField(field);
              if (columns.indexOf(column) < 0) {
                if (unknownFields.indexOf(field) < 0)
                  unknownFields.push(field);
                return true;
              }
            }
            return false;
          });
      if (invalidBatches.length) {
        var error = new Error('Unknown fields');
        error.fields = unknownFields;
        error.batches = invalidBatches;
        throw error;
      }
    }
    return this.getColumns()
               .next(function(columns) {
                 return validateWithKnownColumns(columns);
               });
  },
  load: function(batches) {
    var commandSets = this.translator.translate(batchs);
    var result = {
          adds: 0,
          deletes: 0,
          errors: [],
          warnings: []
        };
    var self = this;
    return Deferred.loop(commandSets.length, function(i) {
             var commandSet = commandSets[i];
             return self.sendOneCommandSet(commandSet)
                        .next(function(commandResult) {
                          switch (commandSet.command) {
                            case 'load':
                              result.adds++;
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
  sendOneCommandSet: function(commandSet) {
    var deferred = new Deferred();
    var callback = function(error, data) {
          if (error)
            deferred.fail(error);
          else
            deferred.call(data);
        };

    if (commandSet.options)
      this.database.command(commandSet.command, commandSet.options, callback);
    else
      this.database.command(commandSet.command, callback);

    return deferred;
  },
  formatResult: function(result) {
    var formattedResult = {
          status: 'success',
          adds: result.adds,
          deletes: result.deletes
        };
    if (result.errors.length) {
      formattedResult.status = 'error';
      formattedResult.errors = result.errors.map(function(error) {
        return {
          message: error.message
        };
      });
    }
    return formattedResult;
  }
};

exports.Processor = Processor;
