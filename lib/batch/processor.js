var nroonga = require('nroonga');

function Processor(options) {
  this.databasePath = options.databasePath;
  this.domain = options.domain;
  this.initialize();
}

Processor.prototype = {
  initialize: function() {
    this.database = new nroonga.Database(this.databasePath);
  },
  process: function(batch) {
    console.log(batch);
  }
};

exports.Processor = Processor;
