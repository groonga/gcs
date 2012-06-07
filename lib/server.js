var express = require('express');
var Croonga = require('./croonga');

exports.createServer = function (config) {
  var croonga = new Croonga(config.baseDir);
  var app = express.createServer();

  var handlers = Object.create(null);
  handlers.CreateDomain = function(req, res) {
    var domainName = req.query.DomainName;
    if (!domainName || domainName === '') {
      return res.send("Invalid DomainName", 400);
    }
    croonga.createDomain(domainName);
    res.send(domainName);
  };

  app.get('/', function(req, res) {
    var action = req.query.Action || '';
    var handler = handlers[action];
    if (!handler) {
      res.send("Action '" + action + "' is not supported", 400);
    } else {
      handler(req, res);
    }
  });

  return app;
};
