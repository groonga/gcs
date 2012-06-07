var express = require('express');
var nroonga = require('nroonga');

exports.createServer = function (config) {
  var database = new nroonga.Database(config.dbPath);
  var app = express.createServer();

  var handlers = Object.create(null);
  handlers.CreateDomain = function(req, res) {
    // FIXME just an example
    var domainName = req.query.DomainName || '';
    database.command('table_create', {
      name: domainName,
      flags: 'TABLE_HASH_KEY',
      key_type: 'ShortText'
    } , function(error, data) {
      if (error) {
        return res.send(error.message, 400);
      }
      res.send('created ' + req.query.DomainName);
    });
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
