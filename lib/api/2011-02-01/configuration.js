var path = require('path');
var nroonga = require('../../wrapped-nroonga');
var Domain = require('../../database').Domain;
var Translator = require('../../batch/translator').Translator;
var Deferred = require('jsdeferred').Deferred;
var dateFormat = require('dateformat');

exports.version = path.basename(__dirname);

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';
var FAKE_DOMAIN_ID = '00000000000000000000000000';

function createCommonErrorResponse(errorCode, message) {
  return '<?xml version="1.0"?>\n' +
         '<Response>' +
           '<Errors>' +
             '<Error><Code>' + errorCode + '</Code>' +
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

handlers.CreateDomain = function(context, request, response) {
  var domain = new Domain(request, context);
  try {
    domain.createSync();
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
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
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

handlers.DeleteDomain = function(context, request, response) {
  var domain = new Domain(request, context);
  try {
    domain.deleteSync();
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
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createIndexFieldOptionStatus(options) {
  switch (options.fieldType) {
    case 'text':
      return '<TextOptions>' +
               '<DefaultValue/>' +
               '<FacetEnabled>' + (options.facetEnabled || false) +
                 '</FacetEnabled>' +
               '<ResultEnabled>' + (options.resultEnabled || false) +
                 '</ResultEnabled>' +
             '</TextOptions>';
    case 'uint':
      return '<UIntOptions>' +
               '<DefaultValue/>' +
             '</UIntOptions>';
    case 'literal':
      return '<LiteralOptions>' +
               '<DefaultValue/>' +
               '<FacetEnabled>' + (options.facetEnabled || false) +
                 '</FacetEnabled>' +
               '<ResultEnabled>' + (options.resultEnabled || false) +
                 '</ResultEnabled>' +
               '<SearchEnabled>' + (options.searchEnabled || false) +
                 '</SearchEnabled>' +
             '</LiteralOptions>';
  }
}

function createIndexFieldStatus(options) {
  return '<IndexField>' +
           '<Options>' +
             '<IndexFieldName>' + options.fieldName + '</IndexFieldName>' +
             '<IndexFieldType>' + options.fieldType + '</IndexFieldType>' +
             createIndexFieldOptionStatus(options) +
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

handlers.DefineIndexField = function(context, request, response) {
  var domain = new Domain(request, context);

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var fieldType = request.query['IndexField.IndexFieldType'] || 'text';
  var field = domain.getIndexField(fieldName);

  var createdAt = new Date();
  var alterTableName = domain.termsTableName;
  var columnType = field.fieldTypeToColumnType(fieldType);
  var resultEnabled = fieldType != 'literal'; 
  try {
    if (fieldType == 'uint' || fieldType == 'literal') {
      context.commandSync('table_create', {
        name: field.alterTableName,
        flags: nroonga.TABLE_HASH_KEY,
        key_type: field.fieldTypeToAlterTableKeyType(fieldType)
      });
      alterTableName = field.alterTableName;
    }
    context.commandSync('column_create', {
      table: domain.tableName,
      name: field.columnName,
      flags: nroonga.COLUMN_SCALAR,
      type: columnType
    });
    context.commandSync('column_create', {
      table: alterTableName,
      name: field.indexColumnName,
      flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
      type: domain.tableName,
      source: field.columnName
    });

    response.contentType('application/xml');
    response.send(createDefineIndexFieldResponse({
      fieldName: fieldName,
      fieldType: fieldType,
      facetEnabled: false,
      resultEnabled: resultEnabled,
      state: 'RequiresIndexDocuments',
      createdAt: createdAt,
      updatedAt: createdAt
    }));
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createDeleteIndexFieldResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<DeleteIndexFieldResponse xmlns="' + XMLNS + '">' +
           '<DeleteIndexFieldResult/>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</DeleteIndexFieldResponse>';
}

handlers.DeleteIndexField = function(context, request, response) {
  var domain = new Domain(request, context);

  var fieldName = request.query['IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);

  var column = context.columnListSync(domain.tableName)
                 .filter(function(column) {
                   return column.name == field.columnName;
                 })[0];

  try {
    context.commandSync('column_remove', {
      table: domain.tableName,
      name: field.columnName
    });

    if (column.range == field.fieldTypeToColumnType('uint') ||
        column.range == field.fieldTypeToColumnType('literal')) {
      context.commandSync('table_remove', {
        name: field.alterTableName
      });
    }

    response.contentType('application/xml');
    response.send(createDeleteIndexFieldResponse({}));
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createIndexDocumentsResponse(options) {
  return '<?xml version="1.0"?>\n' +
         '<IndexDocumentsResponse xmlns="' + XMLNS + '">' +
           '<IndexDocumentsResult>' +
             '<FieldNames>' +
               options.fieldNames.map(function(fieldName) {
                 return '<member>' + fieldName + '</member>';
               }).join('') +
             '</FieldNames>' +
           '</IndexDocumentsResult>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</IndexDocumentsResponse>';
}

handlers.IndexDocuments = function(context, request, response) {
  var domain = new Domain(request, context);
  var indexColumns = context.columnListSync(domain.termsTableName);
  indexColumns = indexColumns.filter(function(column) {
                   return column.flags.indexOf(nroonga.COLUMN_INDEX) > -1;
                 });
  try {
    indexColumns.forEach(function(column) {
      // FieldNames must be field names, not column names.
      // However, original field names are completely lost after
      // they are created via the API...
      var fieldName = column.source[0].replace(column.range + '.', '');
      var field = domain.getIndexField(fieldName);

      var fieldType = column.domain == domain.termsTableName ? 'text' :
                      field.columnTypeToFieldType(column.type);

      if (column.type == field.fieldTypeToColumnType('uint') ||
          column.type == field.fieldTypeToColumnType('literal')) {
        context.commandSync('column_remove', {
          table: field.alterTableName,
          name: field.indexColumnName
        });
        context.commandSync('table_remove', {
          name: field.alterTableName
        });
        context.commandSync('table_create', {
          name: field.alterTableName,
          flags: nroonga.TABLE_HASH_KEY,
          key_type: field.fieldTypeToAlterTableKeyType(fieldType)
        });
        context.commandSync('column_create', {
          table: field.alterTableName,
          name: field.indexColumnName,
          flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
          type: domain.tableName,
          source: field.columnName
        });
      } else {
        context.commandSync('column_remove', {
          table: domain.termsTableName,
          name: field.indexColumnName
        });
        context.commandSync('column_create', {
          table: domain.termsTableName,
          name: field.indexColumnName,
          flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
          type: column.range,
          source: field.columnName
        });
      }
    });
    response.contentType('application/xml');
    response.send(createIndexDocumentsResponse({
      // FieldNames must be field names, not column names.
      // However, original field names are completely lost after
      // they are created via the API...
      fieldNames: indexColumns.map(function(column) {
        return column.source[0].replace(column.range + '.', '');
      })
    }));
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function escapeHTML(string) {
  return string.replace(/&/g, '&amp;')
               .replace(/"/g, '&quot;')
               .replace(/>/g, '&gt;')
               .replace(/</g, '&lt;');
}

function createUpdateSynonymOptionsResponse(options) {
  return '<UpdateSynonymOptionsResponse xmlns="' + XMLNS + '">' +
           '<UpdateSynonymOptionsResult>' +
             '<Synonyms>' +
               '<Status>' +
                 '<CreationDate>' + dateFormat(options.createdAt, 'isoUtcDateTime') + '</CreationDate>' +
                 '<UpdateVersion>' + (options.updateVersion || 0) + '</UpdateVersion>' +
                 '<State>' + (options.state || 'RequiresIndexDocuments') + '</State>' +
                 '<UpdateDate>' + dateFormat(options.updatedAt, 'isoUtcDateTime') + '</UpdateDate>' +
               '</Status>' +
               '<Options>' + escapeHTML(options.synonymOptions || '{}') + '</Options>' +
             '</Synonyms>' +
           '</UpdateSynonymOptionsResult>' +
           '<ResponseMetadata>' +
             '<RequestId>' + (options.requestId || '') + '</RequestId>' +
           '</ResponseMetadata>' +
         '</UpdateSynonymOptionsResponse>';
}
handlers.UpdateSynonymOptions = function(context, request, response) {
  var domain = new Domain(request, context);
  try {
    var synonymOptionsJson = request.query.Synonyms;
    var synonymOptions = JSON.parse(synonymOptionsJson);
    var synonyms = synonymOptions.synonyms;
    var updatedAt = new Date();

    try {
      context.commandSync('table_remove', {
        table: domain.synonymTableName
      });
    } catch(error) {
      // The synonym table should be inexistent. Do nothing.
    }

    context.commandSync('table_create', {
      name: domain.synonymTableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText,
      flags: nroonga.KEY_NORMALIZE
    });
    context.commandSync('column_create', {
      table: domain.synonymTableName,
      name: 'synonyms',
      type: nroonga.ShortText,
      flags: nroonga.COLUMN_VECTOR
    });

    var load = Object.keys(synonyms).map(function(key) {
      return {_key: key, synonyms: synonyms[key]};
    });
    context.commandSync('load', {
      table: domain.synonymTableName,
      values: JSON.stringify(load)
    });

    response.send(createUpdateSynonymOptionsResponse({
      synonymOptions: JSON.stringify(synonymOptions),
      updatedAt: updatedAt,
      createdAt: updatedAt
    }));
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

exports.createHandler = function(context) {
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
    handler(context, request, response);
  };
};
