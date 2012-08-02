var express = require('express');
var nroonga = require('./wrapped-nroonga');
var api = require('./api');
var dashboard = require('./dashboard');

exports.createServer = function (config) {
  var context = new nroonga.Context(config.context || config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());
  application.set('views', __dirname + '/../views');
  application.use(express.static(__dirname + '/../public'));
  application.configure(function() {
    application.enable('jsonp callback');
  });

  api.versions.forEach(function(version) {
    api[version].registerHandlers(application, context, config);
  });

  application.get('/', dashboard.rootHandler);
  application.get('/javascripts/templates.js', dashboard.templatesHandler);

  return application;
};
