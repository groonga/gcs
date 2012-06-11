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
    return commands.join('\n');
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
      line[field] = batch.fields[field];
    }
    var command = 'load --table ' + this.tableName + ' ' + JSON.stringify([line]);
    return command;
  }
};

exports.Translator = Translator;
