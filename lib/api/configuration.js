var resolver = require('../resolver');

var handlers = Object.create(null);
handlers.CreateDomain = function(database, request, response) {
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
