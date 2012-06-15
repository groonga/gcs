var path = require('path');
var Database = require('../../database').Database;
var Domain = require('../../domain').Domain;
var Deferred = require('jsdeferred').Deferred;

exports.version = path.basename(__dirname);

var handlers = Object.create(null);

handlers.CreateDomain = function(database, request, response) {
  // FIXME just an example
  var domain = new Domain(request.query.DomainName || '');
  var options = {
        name: domain.tableName,
        flags: Database.TABLE_HASH_KEY,
        key_type: Database.ShortText
      };
  database.commandDeferred('table_create', options)
    .next(function(data) {
      var termsOptions = {
            name: domain.termsTableName,
            flags: Database.TABLE_PAT_KEY + '|' + Database.KEY_NORMALIZE,
            key_type: Database.ShortText,
            default_tokenizer: Database.TokenBigram
          };
      return database.commandDeferred('table_create', termsOptions);
    })
    .next(function(data) {
      response.send('created ' + domain.name);
    })
    .error(function(error) {
      return response.send(error.message, 400);
    });
};

handlers.DefineIndexField = function(database, request, response) {
  var domain = new Domain(request.query.DomainName || '');

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);

  var options = {
        table: domain.tableName,
        name: field.columnName,
        flags: Database.COLUMN_SCALAR,
        type: Database.ShortText
      };
  database.commandDeferred('column_create', options)
    .next(function(data) {
      var termsOptions = {
            table: domain.termsTableName,
            name: field.indexColumnName,
            flags: Database.COLUMN_INDEX + '|' + Database.WITH_POSITION,
            type: domain.tableName,
            source: field.columnName
          };
      return database.commandDeferred('column_create', termsOptions);
    })
    .next(function() {
      response.send('created index field "' + field + '" ' +
                    'for the domain "' + domain.name + '"');
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

    if (version != exports.version)
      return response.send('API version "' + version + '" is not supported.', 400);

    var action = request.query.Action || '';
    if (!action)
      return response.send('Action must be given as the parameter "Action".', 400);

    if (!(action in handlers))
      return response.send('Action "' + action + '" is not supported.', 400);

    var handler = handlers[action];
    handler(database, request, response);
  };
};
