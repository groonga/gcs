var nroonga = require('nroonga');
var translator = require('./translator');
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
  process: function(batchs) {
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
                        .next(function(result) {
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
