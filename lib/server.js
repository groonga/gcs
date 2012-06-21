var express = require('express');
var Database = require('./database').Database;
var api = require('./api');
var dashboard = require('./dashboard');

exports.createServer = function (config) {
  var database = new Database(config.database || config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());
  application.set('views', __dirname + '/../views');
  application.use(express.static(__dirname + '/../public'));

  api.versions.forEach(function(version) {
    api[version].registerHandlers(application, database);
  });

  application.get('/', dashboard.handler);

  return application;
};
