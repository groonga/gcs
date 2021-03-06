var express = require('express');
var fs = require('fs');
var nroonga = require('./wrapped-nroonga');
var CLI = require('./command-line').CommandLineInterface;
var logger = require('./logger');
var api = require('./api');
var http = require('http');

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
    var accessLogFlags = fs.existsSync(accessLogPath) ? 'a' : 'w';
    var accessLogStream = fs.createWriteStream(accessLogPath, { flags: accessLogFlags });
    application.use(express.logger({ stream: accessLogStream }));
  }
  if (config.queryLogPath) {
    logger.addFileTransport('query', CLI.resolve(config.queryLogPath));
  }
  if (config.errorLogPath) {
    logger.addFileTransport('error', CLI.resolve(config.errorLogPath),
                            { handleExceptions: true });
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
  var application = express();
  var server = http.createServer(application);

  application.use(express.bodyParser());

  prepareLoggers(application, config);

  registerHandlers(application, context, config);

  return server;
};
