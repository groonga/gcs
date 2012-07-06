var path = require('path');
var Database = require('../../database').Database;
var Domain = require('../../domain').Domain;
var Deferred = require('jsdeferred').Deferred;
var dateFormat = require('dateformat');

exports.version = path.basename(__dirname);

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';
var FAKE_DOMAIN_ID = '00000000000000000000000000';

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
           '<Created>' + (options.created || 'false') + '</Created>' +
           '<Deleted>' + (options.deleted || 'false') + '</Deleted>' +
           '<DocService>' +
             '<Endpoint>' + (options.documentsEndpoint || '') + '</Endpoint>' +
           '</DocService>' +
           '<DomainId>' + options.domainId + '/' + options.domainName +
             '</DomainId>' +
           '<DomainName>' + options.domainName + '</DomainName>' +
           '<NumSearchableDocs>' + (options.searchableDocumentsCount || 0) +
             '</NumSearchableDocs>' +
           '<RequiresIndexDocuments>' +
             (options.requiresIndexDocuments || 'false') +
             '</RequiresIndexDocuments>' +
           '<SearchInstanceCount>' + (options.searchInstanceCount || 0) +
             '</SearchInstanceCount>' +
           '<SearchPartitionCount>' + (options.searchPartitionCount || 0) +
             '</SearchPartitionCount>' +
           '<SearchService>' +
             '<Endpoint>' + (options.searchEndpoint || '') + '</Endpoint>' +
           '</SearchService>' +
         '</DomainStatus>';
}

function createCreateDomainResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<CreateDomainResponse xmlns="' + XMLNS + '">' +
           '<CreateDomainResult>' +
             createDomainStatus(options) +
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
      host = host ? '.' + host : '';
      response.contentType('application/xml');
      response.send(createCreateDomainResponse({
        domainName: domain.name,
        domainId: FAKE_DOMAIN_ID,
        searchEndpoint: 'search-' + domain.name + '-' + FAKE_DOMAIN_ID + host,
        documentsEndpoint: 'doc-' + domain.name + '-' + FAKE_DOMAIN_ID + host,
        created: true,
        searchableDocumentsCount: 0,
        searchInstanceCount: 0,
        searchPartitionCount: 0,
        requiresIndexDocuments: false
      }));
    })
    .error(function(error) {
      var body = createCommonErrorResponse('InternalFailure', error.message);
      response.contentType('application/xml');
      return response.send(body, 400);
    });
};

function createDeleteDomainResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<DeleteDomainResponse xmlns="' + XMLNS + '">' +
           '<DeleteDomainResult>' +
             createDomainStatus(options) +
           '</DeleteDomainResult>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</DeleteDomainResponse>';
}

handlers.DeleteDomain = function(database, request, response) {
  var domain = new Domain(request);
  var options = {
        name: domain.tableName
      };
  database.commandDeferred('table_remove', options)
    .next(function(data) {
      var termsOptions = {
            name: domain.termsTableName
          };
      return database.commandDeferred('table_remove', termsOptions);
    })
    .next(function(data) {
      var host = getBaseDomain(request.headers.host);
      host = host ? '.' + host : '';
      response.contentType('application/xml');
      response.send(createDeleteDomainResponse({
        domainName: domain.name,
        domainId: FAKE_DOMAIN_ID,
        searchEndpoint: 'search-' + domain.name + '-' + FAKE_DOMAIN_ID + host,
        documentsEndpoint: 'doc-' + domain.name + '-' + FAKE_DOMAIN_ID + host,
        deleted: true,
        searchableDocumentsCount: 0,
        searchInstanceCount: 0,
        searchPartitionCount: 0,
        requiresIndexDocuments: false
      }));
    })
    .error(function(error) {
      var body = createCommonErrorResponse('InternalFailure', error.message);
      response.contentType('application/xml');
      return response.send(body, 400);
    });
};

function createIndexFieldStatus(options) {
  return '<IndexField>' +
           '<Options>' +
             '<IndexFieldName>' + options.fieldName + '</IndexFieldName>' +
             '<IndexFieldType>' + options.fieldType + '</IndexFieldType>' +
             '<TextOptions>' +
               '<DefaultValue/>' +
               '<FacetEnabled>' + (options.facetEnabled || false) +
                 '</FacetEnabled>' +
               '<ResultEnabled>' + (options.resultEnabled || false) +
                 '</ResultEnabled>' +
             '</TextOptions>' +
           '</Options>' +
           '<Status>' +
             '<CreationDate>' + dateFormat(options.createdAt,
                                           'isoUtcDateTime') +
               '</CreationDate>' +
             '<State>' + options.state + '</State>' +
             '<UpdateDate>' + dateFormat(options.updatedAt, 'isoUtcDateTime') +
               '</UpdateDate>' +
             '<UpdateVersion>' + (options.updateVersion || 0) +
               '</UpdateVersion>' +
           '</Status>' +
         '</IndexField>';
}

function createDefineIndexFieldResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<DefineIndexFieldResponse xmlns="' + XMLNS + '">' +
           '<DefineIndexFieldResult>' +
             createIndexFieldStatus(options) +
           '</DefineIndexFieldResult>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</DefineIndexFieldResponse>';
}

handlers.DefineIndexField = function(database, request, response) {
  var domain = new Domain(request);

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);

  var createdAt = new Date();
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
      response.contentType('application/xml');
      response.send(createDefineIndexFieldResponse({
        fieldName: fieldName,
        fieldType: 'text',
        facetEnabled: false,
        resultEnabled: true,
        state: 'RequiresIndexDocuments',
        createdAt: createdAt,
        updatedAt: createdAt
      }));
    })
    .error(function(error) {
      var body = createCommonErrorResponse('InternalFailure', error.message);
      response.contentType('application/xml');
      return response.send(body, 400);
    });
};

function createDeleteIndexFieldResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<DefineIndexFieldResponse xmlns="' + XMLNS + '">' +
           '<DefineIndexFieldResult/>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</DefineIndexFieldResponse>';
}

handlers.DeleteIndexField = function(database, request, response) {
  var domain = new Domain(request);

  var fieldName = request.query['IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);

  var options = {
        table: domain.tableName,
        name: field.columnName
      };
  database.commandDeferred('column_remove', options)
    .next(function() {
      response.contentType('application/xml');
      response.send(createDeleteIndexFieldResponse({}));
    })
    .error(function(error) {
      var body = createCommonErrorResponse('InternalFailure', error.message);
      response.contentType('application/xml');
      return response.send(body, 400);
    });
};

exports.createHandler = function(database) {
  return function(request, response, next) {
    var message, body;

    // GCS specific behaviour: fallback to other handlers for the endpoint
    // if no action is given.
    var action = request.query.Action || '';
    if (!action)
      return next();

    var version = request.query.Version;
    if (!version) {
      message = 'An input parameter "Version" that is mandatory for ' +
                'processing the request is not supplied.';
      body = createCommonErrorResponse('MissingParameter', message);
      response.contentType('application/xml');
      return response.send(body, 400);
    }

    if (version != exports.version) {
      message = 'A bad or out-of-range value "' + version + '" was supplied ' +
                'for the "Version" input parameter.';
      body = createCommonErrorResponse('InvalidParameterValue', message);
      response.contentType('application/xml');
      return response.send(body, 400);
    }

    if (!(action in handlers)) {
      message = 'The action ' + action + ' is not valid for this web service.';
      body = createCommonErrorResponse('InvalidAction', message);
      response.contentType('application/xml');
      return response.send(body, 400);
    }

    var handler = handlers[action];
    handler(database, request, response);
  };
};
