var resolver = require('../resolver');
var Deferred = require('jsdeferred').Deferred;

var VERSION_2011_02_01 = exports.VERSION_2011_02_01 = '2011-02-01';

var handlers = Object.create(null);
handlers[VERSION_2011_02_01] = Object.create(null);

handlers[VERSION_2011_02_01].CreateDomain = function(database, request, response) {
  // FIXME just an example
  var domain = request.query.DomainName || '';
  var tableName = resolver.getTableNameFromDomain(domain);
  var options = {
        name: tableName,
        flags: 'TABLE_HASH_KEY',
        key_type: 'ShortText'
      };
  database.commandDeferred('table_create', options)
    .next(function(data) {
      var termsOptions = {
            name: resolver.getTermsTableNameFromDomain(domain),
            flags: 'TABLE_PAT_KEY|KEY_NORMALIZE',
            key_type: 'ShortText',
            default_tokenizer: 'TokenBigram'
          };
      return database.commandDeferred('table_create', termsOptions)
               .next(function() {
                 response.send('created ' + domain);
               });
    })
    .error(function(error) {
      return response.send(error.message, 400);
    });
};

handlers[VERSION_2011_02_01].DefineIndexField = function(database, request, response) {
  var domain = request.query.DomainName || '';
  var tableName = resolver.getTableNameFromDomain(domain);

  var field = request.query['IndexField.IndexFieldName'] || '';
  var columnName = resolver.getColumnNameFromField(field);

  var options = {
        table: tableName,
        name: columnName,
        flags: 'COLUMN_SCALAR',
        type: 'ShortText'
      };
  database.commandDeferred('column_create', options)
    .next(function(data) {
      var termsOptions = {
            table: resolver.getTermsTableNameFromDomain(domain),
            name: tableName + '_' + columnName,
            flags: 'COLUMN_INDEX|WITH_POSITION',
            type: tableName,
            source: columnName
          };
      return database.commandDeferred('column_create', termsOptions)
               .next(function() {
                 response.send('created index field "' + field + '" ' +
                               'for the domain "' + domain + '"');
               });
    })
    .error(function(error) {
      return response.send(error.message, 400);
    });
};

exports.createHandler = function(database) {
  return function(request, response) {
    var version = request.query.Version;
    if (!version)
      return response.send('API version must be given as the parameter "Version".', 400);

    if (!(version in handlers))
      return response.send('API version "' + version + '" is not supported.', 400);

    var action = request.query.Action || '';
    if (!action)
      return response.send('Action must be given as the parameter "Action".', 400);

    if (!(action in handlers[version]))
      return response.send('Action "' + action + '" is not supported.', 400);

    var handler = handlers[version][action];
    handler(database, request, response);
  };
};
