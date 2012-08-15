var express = require('express');
var nroonga = require('./wrapped-nroonga');
var CLI = require(__dirname + '/../lib/command-line').CommandLineInterface;
var api = require('./api');
var dashboard = require('./dashboard');

exports.createServer = function (config) {
  if (!config.databasePath) config.databasePath = CLI.databasePath;
  if (!config.privilege)    config.privilege    = CLI.privilege;
  if (!config.port)         config.port         = CLI.port;
  if (!config.baseHost )    config.baseHost     = CLI.defaultBaseHost;
  if (!config.configurationHost)
     config.configurationHost = CLI.defaultConfigurationHost;

  var context = config.context || new nroonga.Context(config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());
  application.set('views', __dirname + '/../views');
  application.use(express.static(__dirname + '/../public'));

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

  application.get('/', dashboard.rootHandler);
  application.get('/javascripts/templates.js', dashboard.templatesHandler);

  return application;
};
