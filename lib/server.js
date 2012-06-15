var express = require('express');
var deferredDatabase = require('./database');
var api = require('./api');

exports.createServer = function (config) {
  var database = new deferredDatabase.Database(config.database || config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());

  api.versions.forEach(function(version) {
    api[version].registerHandlers(application, database);
  });

  return application;
};
