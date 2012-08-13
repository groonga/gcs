var path = require('path');
var nroonga = require('../../wrapped-nroonga');
var Domain = require('../../database').Domain;
var dateFormat = require('dateformat');
var xmlbuilder = require('../../xmlbuilder');
var ipv4 = require('../../ipv4');

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
  var domainStatus = xmlbuilder.create();
  domainStatus.begin(options.element || 'DomainStatus', { version: '1.0' })
    .element('Created').text(options.created || 'false').up()
    .element('Deleted').text(options.deleted || 'false').up()
    .element('DocService')
      .element('Endpoint').text(options.domain.getDocumentsEndpoint(options.hostname)).up()
    .up()
    .element('DomainId')
      .text(options.domain.domainId)
    .up()
    .element('DomainName').text(options.domain.name).up()
    .element('NumSearchableDocs')
      .text(options.domain.searchableDocumentsCount)
    .up()
    .element('RequiresIndexDocuments')
      .text(options.domain.requiresIndexDocuments)
    .up()
    .element('SearchInstanceCount')
      .text(options.domain.searchInstanceCount)
    .up()
    .element('SearchPartitionCount')
      .text(options.domain.searchPartitionCount)
    .up()
    .element('SearchService')
      .element('Endpoint').text(options.domain.getSearchEndpoint(options.hostname)).up()
    .up();
  return domainStatus;
}

function createCreateDomainResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('CreateDomainResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('CreateDomainResult')
      .importXMLBuilder(createDomainStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.CreateDomain = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);
  try {
    domain.createSync();
    response.contentType('application/xml');
    response.send(createCreateDomainResponse({
      domain: domain,
      hostname: getBaseDomain(request.headers.host),
      created: true
    }));
  } catch (error) {
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
      .importXMLBuilder(createDomainStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DeleteDomain = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);
  try {
    domain.deleteSync();
    response.contentType('application/xml');
    response.send(createDeleteDomainResponse({
      domain: domain,
      hostname: getBaseDomain(request.headers.host),
      deleted: true
    }));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createDomainStatusList(options) {
  var doc = xmlbuilder.create();
  var domainStatusList = doc.begin('DomainStatusList', {version: '1.0'});
  options.domains.forEach(function(domain) {
    domainStatusList.importXMLBuilder(createDomainStatus({
                       domain:   domain,
                       hostname: options.hostname,
                       element:  'member'
                     }));
  });
  return doc;
}

function createDescribeDomainsResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('DescribeDomainsResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('DescribeDomainsResult')
      .importXMLBuilder(createDomainStatusList(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DescribeDomains = function(context, request, response) {
  try {
    var keys = Object.keys(request.query).filter(function(key) {
          return /^DomainNames\.member\.\d+$/.test(key);
        });
    var domainNames = keys.sort().map(function(key) {
          return request.query[key];
        });
    var domains = domainNames.length ?
                    domainNames.map(function(name) {
                      return new Domain(name, context);
                    }) :
                    Domain.getAll(context) ;
    response.contentType('application/xml');
    response.send(createDescribeDomainsResponse({
      domains: domains,
      hostname: getBaseDomain(request.headers.host)
    }));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createIndexFieldOptionStatus(options) {
  switch (options.field.type) {
    case 'text':
      var textOptions = xmlbuilder.create();
      textOptions.begin('TextOptions', { version: '1.0' })
        .element('DefaultValue').up()
        .element('FacetEnabled').text(options.field.facetEnabled).up()
        .element('ResultEnabled').text(options.field.resultEnabled);
      return textOptions;
    case 'uint':
      var uintOptions = xmlbuilder.create();
      uintOptions.begin('UIntOptions', { version: '1.0' })
        .element('DefaultValue');
      return uintOptions;
    case 'literal':
      var literalOptions = xmlbuilder.create();
      literalOptions.begin('LiteralOptions', { version: '1.0' })
        .element('DefaultValue').up()
        .element('FacetEnabled').text(options.field.facetEnabled).up()
        .element('ResultEnabled').text(options.field.resultEnabled).up()
        .element('SearchEnabled').text(options.field.searchEnabled);
      return literalOptions;
  }
}

function createIndexFieldStatus(options) {
  var indexFieldStatus = xmlbuilder.create();
  indexFieldStatus.begin(options.element || 'IndexField', { version: '1.0' })
    .element('Options')
      .element('IndexFieldName').text(options.field.name).up()
      .element('IndexFieldType').text(options.field.type).up()
      .importXMLBuilder(createIndexFieldOptionStatus(options))
    .up()
    .element('Status')
      .element('CreationDate').text(dateFormat(options.createdAt,
                                               'isoUtcDateTime')).up()
      .element('State').text(options.field.state).up()
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
      .importXMLBuilder(createIndexFieldStatus(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DefineIndexField = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var fieldType = request.query['IndexField.IndexFieldType'] || 'text';
  var field = domain.getIndexField(fieldName);

  var createdAt = new Date();
  try {
    field.type = fieldType;
    field.createSync();
    response.contentType('application/xml');
    response.send(createDefineIndexFieldResponse({
      field: field,
      createdAt: createdAt,
      updatedAt: createdAt
    }));
  } catch (error) {
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
  var domain = new Domain(request.query.DomainName, context);

  var fieldName = request.query['IndexFieldName'] || '';
  var field = domain.getIndexField(fieldName);
  try {
    field.deleteSync();
    response.contentType('application/xml');
    response.send(createDeleteIndexFieldResponse({}));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createIndexFields(options) {
  var doc = xmlbuilder.create();
  var indexFields = doc.begin('IndexFields', {version: '1.0'});
  options.fields.forEach(function(field) {
    indexFields.importXMLBuilder(createIndexFieldStatus({
                  field:   field,
                  element: 'member'
                }));
  });
  return doc;
}

function createDescribeIndexFieldsResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('DescribeIndexFieldsResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('DescribeIndexFieldsResult')
      .importXMLBuilder(createIndexFields(options))
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}

handlers.DescribeIndexFields = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);

  try {
    var keys = Object.keys(request.query).filter(function(key) {
          return /^FieldNames\.member\.\d+$/.test(key);
        });
    var fieldNames = keys.sort().map(function(key) {
          return request.query[key];
        });
    var fields = fieldNames.length ?
                    fieldNames.map(function(name) {
                      return domain.getIndexField(name);
                    }) :
                    domain.indexFields ;
    response.contentType('application/xml');
    response.send(createDescribeIndexFieldsResponse({
      fields: fields
    }));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createIndexDocumentsResponse(options) {
  var doc = xmlbuilder.create();
  var root = doc.begin('IndexDocumentsResponse', {version: '1.0'})
                .attribute('xmlns', XMLNS);

  var fieldNames = root.element('IndexDocumentsResult')
                       .element('FieldNames');
  options.domain.indexFields
    .map(function(field) {
      return field.name;
    })
    .sort()
    .forEach(function(fieldName) {
      var member = xmlbuilder.create();
      member.begin('member', { version: '1.0' })
        .text(fieldName);
     fieldNames.importXMLBuilder(member);
    });

  root.element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '');

  return doc.toString();
}

handlers.IndexDocuments = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);
  try {
    domain.reindexSync();
    response.contentType('application/xml');
    response.send(createIndexDocumentsResponse({
      domain: domain
    }));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function createUpdateSynonymOptionsResponse(options) {
  var doc = xmlbuilder.create();
  doc.begin('UpdateSynonymOptionsResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('UpdateSynonymOptionsResult')
      .element('Synonyms')
        .element('Status')
          .element('CreationDate').text(dateFormat(options.createdAt,
                                                   'isoUtcDateTime')).up()
          .element('UpdateVersion').text(options.updateVersion || '0').up()
          .element('State').text(options.state || 'RequiresIndexDocuments').up()
          .element('UpdateDate').text(dateFormat(options.updatedAt,
                                                 'isoUtcDateTime')).up()
        .up()
        .element('Options')
          .text(options.synonymOptions || '{}')
        .up()
      .up()
    .up()
    .element('ResponseMetadata')
      .element('RequestId').text(options.requestId || '').up()
    .up();
  return doc.toString();
}
handlers.UpdateSynonymOptions = function(context, request, response) {
  var domain = new Domain(request.query.DomainName, context);
  try {
    var synonymOptionsJson = request.query.Synonyms;
    var synonymOptions = JSON.parse(synonymOptionsJson);

    var updatedAt = new Date();

    domain.updateSynonymsSync(synonymOptions.synonyms);

    response.send(createUpdateSynonymOptionsResponse({
      synonymOptions: JSON.stringify(synonymOptions),
      updatedAt: updatedAt,
      createdAt: updatedAt
    }));
  } catch (error) {
    var body = createCommonErrorResponse('InternalFailure', error.message);
    response.contentType('application/xml');
    response.send(body, 400);
  }
};

function getClientIp(request) {
  var forwardedIps = request.header('x-forwarded-for');
  if (forwardedIps) {
    var ip = forwardedIps.split(',')[0];
    if (ip)
      return ip;
  }
  return request.connection.remoteAddress;
};

exports.createHandler = function(context, config) {
  var privilegedRanges = config &&
                         config.privilegedRanges &&
                         config.privilegedRanges.split(/[,\| ]/);
  return function(request, response, next) {
    var message, body;

    // GCS specific behaviour: prevent to access this API from specific IP
    // range.
    if (privilegedRanges && privilegedRanges.length) {
      if (!privilegedRanges.some(function(privilegedRange) {
            return ipv4.isInRange(getClientIp(request), privilegedRange);
          })) {
        message = 'Permission denied.';
        body = createCommonErrorResponse('InvalidClientIpRange', message);
        response.contentType('application/xml');
        return response.send(body, 403);
      }
    }

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
