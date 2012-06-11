var express = require('express');
var nroonga = require('nroonga');
var resolver = require('./resolver');

exports.createServer = function (config) {
  var database = new nroonga.Database(config.databasePath);
  var app = express.createServer();

  var handlers = Object.create(null);
  handlers.CreateDomain = function(request, res) {
    // FIXME just an example
    var domain = request.query.DomainName || '';
    var tableName = resolver.getTableNameFromDomain(domain);
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

  app.get('/', function(request, res) {
    var action = request.query.Action || '';
    var handler = handlers[action];
    if (!handler) {
      res.send("Action '" + action + "' is not supported", 400);
    } else {
      handler(request, res);
    }
  });

  return app;
};
