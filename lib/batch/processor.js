var nroonga = require('nroonga');

function Processor(options) {
  this.databasePath = options.databasePath;
  this.domain = options.domain;

  this.database = new nroonga.Database(this.databasePath);
}

Processor.prototype = {
  process: function(batch) {
    console.log(batch);
  }
};

exports.Processor = Processor;
