function Translator(domain) {
  this.domain = domain;
  this.init();
}

Translator.prototype = {
  TYPE_ADD: 'add',
  MAPPED_FIELDS: {
    'id': '_key'
  },

  init: function() {
    this.table = this.getTableName(this.domain);
  },
  getTableName: function(domain) {
    return domain;
  },
  translate: function(batch) {
    
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
    var command = 'load --table ' + this.table + ' ' + JSON.stringify([line]);
    return command;
  }
};

exports.Translator = Translator;
