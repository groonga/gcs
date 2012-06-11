var resolver = require('../resolver');

function Translator(domain) {
  this.domain = domain;
  this.initialize();
}

Translator.prototype = {
  TYPE_ADD: 'add',
  MAPPED_FIELDS: {
    'id': '_key'
  },

  initialize: function() {
    this.tableName = resolver.getTableNameFromDomain(this.domain);
  },

  translate: function(batches) {
    var commands = batches.map(function(batch) {
          return this.translateOne(batch);
        }, this);
    return commands;
  },
  translateOne: function(batch) {
    switch (batch.type) {
      case this.TYPE_ADD:
        return this.addToLoad(batch);
      default:
        throw new Error('batch type "' + batch.type + '" is not acceptable');
    }
  },
  addToLoad: function(batch) {
    var line = {
          _key: batch.id
        };
    for (var field in batch.fields) {
      if (!batch.fields.hasOwnProperty(field))
        continue;
      line[resolver.getColumnNameFromField(field)] = batch.fields[field];
    }
    var values = JSON.stringify([line]);
    return {
      command: 'load',
      options: {
        table: this.tableName,
        values: values
      }
    };
  }
};
exports.Translator = Translator;

function commandToString(commandSet) {
  var options = commandSet.options || {};
  var string = commandSet.command;
  for (var option in options) {
    if (!options.hasOwnProperty(option))
      continue;
    string += ' --' + option + ' ' + options[option];
  }
  return string;
}
exports.commandToString = Translator.commandToString = commandToString;

function commandsToString(commandSets) {
  return commandSets.map(function(commandSet) {
           return commandToString(commandSet);
         }).join('\n');
}
exports.commandsToString = Translator.commandsToString = commandsToString;