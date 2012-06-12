var express = require('express');
var nroonga = require('nroonga');
var resolver = require('./resolver');
var BatchProcessor = require('./batch/processor').Processor;

exports.createServer = function (config) {
  var database = new nroonga.Database(config.databasePath);
  var application = express.createServer();
  application.use(express.bodyParser());

  var handlers = Object.create(null);
  handlers.CreateDomain = function(request, response) {
    // FIXME just an example
    var domain = request.query.DomainName || '';
    var tableName = resolver.getTableNameFromDomain(domain);
    database.command('table_create', {
      name: tableName,
      flags: 'TABLE_HASH_KEY',
      key_type: 'ShortText'
    } , function(error, data) {
      if (error) {
        return response.send(error.message, 400);
      }
      response.send('created ' + domain);
    });
  };

  application.get('/', function(request, response) {
    var action = request.query.Action || '';
    var handler = handlers[action];
    if (!handler) {
      response.send("Action '" + action + "' is not supported", 400);
    } else {
      handler(request, response);
    }
  });

  application.post('/documents/batch', function(request, response) {
    // FIXME: if the user accesses this server by an IP address, I cannot get
    //        the domain name via the sub domain. So, temporally
    //        I get the domain name via the query parameter "DomainName".
    var domain = request.query.DomainName || '';
    var processor = new BatchProcessor({
          database: database,
          domain: domain
        });
    processor.process(request.body)
      .next(function(resuls) {
        console.log('process results: ' + results);
        response.send('successfully processed.');
      })
      .error(function(error) {
        response.send(error.message, 502);
      });
  });

  application.get('/2011-02-01/search', function(request, response) {
    var domain = request.query.DomainName || '';
    var options = {
      table: domain
    };
    database.command('select', options, function(error, data) {
      if (error) {
        throw error;
      }

      var expr = request.query.q;
      var hitDocuments = []; // FIXME
      var hits = { // FIXME
        found: 7,
        start: 0,
        hit: hitDocuments
      };
      var info = {};
      var result = { // FIXME
        rank: '-text_relevance',
        'match-expr': expr,
        hits: hits,
        info: info
      };
      response.json(result);
    });
  });

  return application;
};
