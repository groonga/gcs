var express = require('express');
var fs = require('fs');
var path = require('path');
var nroonga = require('./wrapped-nroonga');
var CLI = require(__dirname + '/../lib/command-line').CommandLineInterface;
var logger = require(__dirname + '/../lib/logger');
var Logger = logger.Logger;
var ErrorLogger = logger.ErrorLogger;
var api = require('./api');

function prepareConfigurations(config) {
  config = config || {};

  if (!config.databasePath)
    config.databasePath = CLI.defaultDatabasePath;
  if (!config.accessLogPath)
    config.accessLogPath = CLI.defaultAccessLogPath;
  if (!config.queryLogPath)
    config.queryLogPath = CLI.defaultQueryLogPath;
  if (!config.errorLogPath)
    config.errorLogPath = CLI.defaultErrorLogPath;
  if (!config.privilegedRanges)
    config.privilegedRanges = CLI.defaultPrivilegedRanges;
  if (!config.port)
    config.port = CLI.defaultPort;

  return config;
}

function prepareLoggers(application, config) {
  if (config.accessLogPath) {
    var accessLogPath = CLI.resolve(config.accessLogPath);
    var accessLogFlags = path.existsSync(accessLogPath) ? 'a' : 'w';
    var accessLogStream = fs.createWriteStream(accessLogPath, { flags: accessLogFlags });
    application.use(express.logger({ stream: accessLogStream }));
  }
  if (config.queryLogPath) {
    config.queryLogger = new Logger(config.queryLogPath);
  }
  if (config.errorLogPath) {
    config.errorLogger = new ErrorLogger(config.errorLogPath);
  }
}

function registerHandlers(application, context, config) {
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
}

exports.createServer = function (config) {
  config = prepareConfigurations(config);

  var context = config.context || new nroonga.Context(config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());
  application.set('views', __dirname + '/../views');

  prepareLoggers(application, config);

  registerHandlers(application, context, config);

  return application;
};
