var path = require('path');
var Database = require('../../database').Database;
var Domain = require('../../domain').Domain;
var Deferred = require('jsdeferred').Deferred;

exports.version = path.basename(__dirname);

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';
var FAKE_DOMAIN_ID = 'example';

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


function getBaseDomain(domain) {
  return domain.replace(/^cloudsearch\./, '');
}

function createDomainStatus(options) {
return '<DomainStatus>' +
         '<SearchPartitionCount>' + (options.searchPartitionCount || 0) +
           '</SearchPartitionCount>' +
         '<SearchService>' +
           '<Endpoint>' + (options.searchEndpoint || '') +'</Endpoint>' +
         '</SearchService>' +
         '<NumSearchableDocs>' + (options.searchableDocumentsCount || 0) +
           '</NumSearchableDocs>' +
         '<Created>' + (options.created || 'false') + '</Created>' +
         '<DomainId>' + options.domainName + '/' + options.domainName +
           '</DomainId>' +
         '<SearchInstanceCount>' + (options.searchInstanceCount || 0) +
           '</SearchInstanceCount>' +
         '<DomainName>' + options.domainName + '</DomainName>' +
         '<RequiresIndexDocuments>' +
           (options.requiresIndexDocuments || 'false') +
           '</RequiresIndexDocuments>' +
         '<Deleted>' + (options.deleted || 'false') + '</Deleted>' +
         '<DocService>' +
           '<Endpoint>' + (options.documentsEndpoint || '') +'</Endpoint>' +
         '</DocService>' +
       '</DomainStatus>';
}

function createCreateDomainResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<CreateDomainResponse xmlns="' + XMLNS + '">' +
           '<CreateDomainResult>' +
             createDomainStatus() +
           '</CreateDomainResult>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</CreateDomainResponse>';
}

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
      var host = getBaseDomain(request.headers.host);
      response.send(createCreateDomainResponse({
        domainName: domain.name,
        domainId: FAKE_DOMAIN_ID,
        searchEndpoint: 'http://search-' + domain.name + '-' + FAKE_DOMAIN_ID +
                        '/' + exports.version + '/search',
        documentsEndpoint: 'http://doc-' + domain.name + '-' + FAKE_DOMAIN_ID +
                           '/' + exports.version + '/documents/batch',
        created: true,
        searchableDocumentsCount: 0,
        searchInstanceCount: 0,
        searchPartitionCount: 0,
        requiresIndexDocuments: false
      }));
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
