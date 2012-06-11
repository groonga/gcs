var express = require('express');
var nroonga = require('nroonga');
var resolver = require('./resolver');

exports.createServer = function (config) {
  var database = new nroonga.Database(config.databasePath);
  var app = express.createServer();

  var handlers = Object.create(null);
  handlers.CreateDomain = function(req, res) {
    // FIXME just an example
    var domain = req.query.DomainName || '';
    var tableName = resolver.getTableNameFromDomain(domainN);
    database.command('table_create', {
      name: tableName,
      flags: 'TABLE_HASH_KEY',
      key_type: 'ShortText'
    } , function(error, data) {
      if (error) {
        return res.send(error.message, 400);
      }
      res.send('created ' + domain);
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
