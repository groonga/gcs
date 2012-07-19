var path = require('path');
var nroonga = require('../../wrapped-nroonga');
var Domain = require('../../database').Domain;
var Translator = require('../../batch/translator').Translator;
var dateFormat = require('dateformat');
var xmlbuilder = require('../../xmlbuilder');

exports.version = path.basename(__dirname);

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';

function createCommonErrorResponse(errorCode, error) {
  var doc = xmlbuilder.create();
  doc.begin('Response', { version: '1.0' })
    .element('Errors')
      .element('Error')
        .element('Code').text(errorCode).up()
        .element('Message').text(error.message || error).up()
      .up()
    .up()
    .element('RequestID').up();
  return doc.toString();
}

var handlers = Object.create(null);


function getBaseDomain(domain) {
  return domain.replace(/^cloudsearch\./, '');
}

function createDomainStatus(options) {
  var domainStatus = new xmlbuilder.XMLFragment(null, 'DomainStatus');
  domainStatus
    .element('Created').text(options.created || 'false').up()
    .element('Deleted').text(options.deleted || 'false').up()
    .element('DocService')
      .element('Endpoint').text(options.documentsEndpoint || '').up()
    .up()
    .element('DomainId')
      .text(options.domainId + '/' + options.domainName)
    .up()
    .element('DomainName').text(options.domainName).up()
    .element('NumSearchableDocs')
      .text(options.searchableDocumentsCount || '0')
    .up()
    .element('RequiresIndexDocuments')
      .text(options.requiresIndexDocuments || 'false')
    .up()
    .element('SearchInstanceCount')
      .text(options.searchInstanceCount || '0')
    .up()
    .element('SearchPartitionCount')
      .text(options.searchPartitionCount || '0')
    .up()
    .element('SearchService')
      .element('Endpoint').text(options.searchEndpoint || '').up()
    .up();
  return domainStatus;
}

function createCreateDomainResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('CreateDomainResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('CreateDomainResult')
      .addFragment(createDomainStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
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
      domainId: domain.id,
      searchEndpoint: 'search-' + domain.name + '-' + domain.id + host,
      documentsEndpoint: 'doc-' + domain.name + '-' + domain.id + host,
      created: true,
      searchableDocumentsCount: 0,
      searchInstanceCount: 0,
      searchPartitionCount: 0,
      requiresIndexDocuments: false
    }));
  } catch(error) {
    var body = createCommonErrorResponse('InternalFailure', error);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createDeleteDomainResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('DeleteDomainResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('DeleteDomainResult')
      .addFragment(createDomainStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
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
      domainId: domain.id,
      searchEndpoint: 'search-' + domain.name + '-' + domain.id + host,
      documentsEndpoint: 'doc-' + domain.name + '-' + domain.id + host,
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
      var textOptions = new xmlbuilder.XMLFragment(null, 'TextOptions');
      textOptions
        .element('DefaultValue').up()
        .element('FacetEnabled').text(options.facetEnabled || 'false').up()
        .element('ResultEnabled').text(options.resultEnabled || 'false').up();
      return textOptions;
    case 'uint':
      var uintOptions = new xmlbuilder.XMLFragment(null, 'UIntOptions');
      uintOptions
        .element('DefaultValue').up();
      return uintOptions;
    case 'literal':
      var literalOptions = new xmlbuilder.XMLFragment(null, 'LiteralOptions');
      literalOptions
        .element('DefaultValue').up()
        .element('FacetEnabled').text(options.facetEnabled || 'false').up()
        .element('ResultEnabled').text(options.resultEnabled || 'false').up()
        .element('SearchEnabled').text(options.searchEnabled || 'false').up();
      return literalOptions;
  }
}

function createIndexFieldStatus(options) {
  var indexFieldStatus = new xmlbuilder.XMLFragment(null, 'IndexField');
  indexFieldStatus
    .element('Options')
      .element('IndexFieldName').text(options.fieldName).up()
      .element('IndexFieldType').text(options.fieldType).up()
      .addFragment(createIndexFieldOptionStatus(options))
    .up()
    .element('Status')
      .element('CreationDate').text(dateFormat(options.createdAt,
                                               'isoUtcDateTime')).up()
      .element('State').text(options.state).up()
      .element('UpdateDate').text(dateFormat(options.updatedAt,
                                             'isoUtcDateTime')).up()
      .element('UpdateVersion').text(options.updateVersion || '0').up()
    .up();
  return indexFieldStatus;
}

function createDefineIndexFieldResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('DefineIndexFieldResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('DefineIndexFieldResult')
      .addFragment(createIndexFieldStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DefineIndexField = function(context, request, response) {
  var domain = new Domain(request, context);

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var fieldType = request.query['IndexField.IndexFieldType'] || 'text';
  var field = domain.getIndexField(fieldName);

  var createdAt = new Date();
  var resultEnabled = fieldType != 'literal';
  try {
    field.type = fieldType;
    field.createSync();
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
  var doc = xmlbuilder.create();
  doc.begin('DeleteIndexFieldResponse', {version: '1.0'})
    .attribute('xmlns', XMLNS)
    .element('DeleteIndexFieldResult').up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DeleteIndexField = function(context, request, response) {
  var domain = new Domain(request, context);

  var fieldName = request.query['IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);
  try {
    field.deleteSync();
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
  var indexFieldNames = domain.indexFields
                          .map(function(field) {
                            return field.name;
                          })
                          .sort();
  try {
    domain.reindexSync();
    response.contentType('application/xml');
    response.send(createIndexDocumentsResponse({
      fieldNames: indexFieldNames
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

    var updatedAt = new Date();

    domain.updateSynonymsSync(synonymOptions);

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
