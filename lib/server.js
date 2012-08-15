var express = require('express');
var nroonga = require('./wrapped-nroonga');
var api = require('./api');
var dashboard = require('./dashboard');

exports.createServer = function (config) {
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
