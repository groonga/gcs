var resolver = require('../resolver');
var Deferred = require('jsdeferred').Deferred;

function deferredCommand(database, command, options) {
  var deferred = new Deferred();
  var callback = function(error, data) {
        if (error)
          deferred.fail(error);
        else
          deferred.call(data);
      };

  if (options)
    database.command(command, options, callback);
  else
    database.command(command, callback);

  return deferred;
}

var handlers = Object.create(null);

handlers.CreateDomain = function(database, request, response) {
  // FIXME just an example
  var domain = request.query.DomainName || '';
  var tableName = resolver.getTableNameFromDomain(domain);
  var options = {
        name: tableName,
        flags: 'TABLE_HASH_KEY',
        key_type: 'ShortText'
      };
  deferredCommand(database, 'table_create', options)
    .next(function(data) {
      var termsOptions = {
            name: tableName + '_BigramTerms',
            flags: 'TABLE_PAT_KEY|KEY_NORMALIZE',
            key_type: 'ShortText',
            default_tokenizer: 'TokenBigram'
          };
      return deferredCommand(database, 'table_create', termsOptions)
               .next(function() {
                 response.send('created ' + domain);
               });
    })
    .error(function(error) {
      return response.send(error.message, 400);
    });
};
  
exports.createHandler = function(database) {
  return function(request, response) {
    var action = request.query.Action || '';
    var handler = handlers[action];
    if (!handler) {
      response.send("Action '" + action + "' is not supported", 400);
    } else {
      handler(database, request, response);
    }
  };
};
