var path = require('path');
var Database = require('../../database').Database;
var Domain = require('../../domain').Domain;
var Deferred = require('jsdeferred').Deferred;

exports.version = path.basename(__dirname);


function createCommonErrorResponse(errorCode, message) {
  return '<?xml version="1.0"?>\n' +
         '<Response>' +
           '<Errors>' +
             '<Error><Code>' + errorCode +'</Code>' +
                     '<Message>' + message + '</Message></Error>' +
             '</Errors>' +
           '<RequestID></RequestID>' +
         '</Response>';
}


var handlers = Object.create(null);

handlers.CreateDomain = function(database, request, response) {
  var domain = new Domain(request);
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
  var domain = new Domain(request);

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
    var message, body;

    var version = request.query.Version;
    if (!version) {
      message = 'An input parameter "Version" that is mandatory for ' +
                'processing the request is not supplied.';
      body = createCommonErrorResponse('MissingParameter', message);
      return response.send(body, 400);
    }

    if (version != exports.version) {
      message = 'A bad or out-of-range value "' + version + '" was supplied ' +
                'for the "Version" input parameter.';
      body = createCommonErrorResponse('InvalidParameterValue', message);
      return response.send(body, 400);
    }

    var action = request.query.Action || '';
    if (!action) {
      message = 'The request is missing an action or operation parameter.';
      body = createCommonErrorResponse('MissingAction', message);
      return response.send(body, 400);
    }

    if (!(action in handlers)) {
      message = 'The action ' + action + ' is not valid for this web service.';
      body = createCommonErrorResponse('InvalidAction', message);
      return response.send(body, 400);
    }

    var handler = handlers[action];
    handler(database, request, response);
  };
};
