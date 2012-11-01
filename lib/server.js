var express = require('express');
var nroonga = require('./wrapped-nroonga');
var CLI = require(__dirname + '/../lib/command-line').CommandLineInterface;
var api = require('./api');

exports.createServer = function (config) {
  config = config || {};

  if (!config.databasePath)
    config.databasePath = CLI.defaultDatabasePath;
  if (!config.privilegedRanges)
    config.privilegedRanges = CLI.defaultPrivilegedRanges;
  if (!config.port)
    config.port = CLI.defaultPort;

  var context = config.context || new nroonga.Context(config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());
  application.set('views', __dirname + '/../views');

  application.configure(function() {
    application.enable('jsonp callback');
  });

  application.configure('development', function(){
    application.use(express.logger('dev'));
  })

  application.configure('production', function(){
    application.use(express.logger('default'));
  })

  api.versions.forEach(function(version) {
    api[version].registerHandlers(application, context, config);
  });

  return application;
};
