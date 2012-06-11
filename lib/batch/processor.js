var nroonga = require('nroonga');
var translator = require('./translator');
var Deferred = require('jsdeferred').Deferred;

function Processor(options) {
  this.databasePath = options.databasePath;
  this.domain = options.domain;
  this.initialize();
}

Processor.prototype = {
  initialize: function() {
    this.database = new nroonga.Database(this.databasePath);
    this.translator = new translator.Translator(this.domain);
  },
  process: function(batchs) {
    var commandSets = this.translator.translate(batchs);
    var self = this;
    return Deferred.loop(commandSets.length, function(i) {
             return self.sendOneCommandSet(commandSets[i]);
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
  }
};

exports.Processor = Processor;
