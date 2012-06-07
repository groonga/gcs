var nroonga = require('nroonga');

function BatchProcessor(options) {
  this.databasePath = options.databasePath;
  this.domain = options.domain;

  this.database = new nroonga.Database(this.databasePath);
}

BatchProcessor.prototype = {
  process: function(batch) {
    console.log(batch);
  }
};

exports.BatchProcessor = BatchProcessor;
