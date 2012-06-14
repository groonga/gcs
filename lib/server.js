var express = require('express');
var nroonga = require('nroonga');
var api = require('./api');

exports.createServer = function (config) {
  var database = config.database || new nroonga.Database(config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());

  application.get('/', api.configuration.createHandler(database));
  application.post('/2011-02-01/documents/batch', api.batch.createHandler(database));
  application.get('/2011-02-01/search', api.search.createHandler(database));

  return application;
};
