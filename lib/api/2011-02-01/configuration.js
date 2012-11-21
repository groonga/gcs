var path = require('path');
var nroonga = require('../../wrapped-nroonga');
var Domain = require('../../database').Domain;
var IndexField = require('../../database').IndexField;
var dateFormat = require('dateformat');
var xmlbuilder = require('../../xmlbuilder');
var ipv4 = require('../../ipv4');
var logger = require('../../logger');
var errors = require('../../errors');
var uuid = require('node-uuid');

exports.version = path.basename(__dirname);

function handleDomanValidationError(process, variables) {
  try {
    return process();
  } catch(error) {
    if (error.isValidationError) {
      variables = variables || {
                    NAME_FIELD: 'domainName'
                  };
      error.message = error.message.replace(/%NAME_FIELD%/g, variables.NAME_FIELD);
    }
    throw error;
  }
}

function handleIndexFieldValidationError(process, variables) {
  try {
    return process();
  } catch(error) {
    if (error.isValidationError) {
      variables = variables || {
                    NAME_FIELD: 'indexField.indexFieldName',
                    TYPE_FIELD: 'indexField.indexFieldType'
                  };
      error.message = error.message
                        .replace(/%NAME_FIELD%/g, variables.NAME_FIELD)
                        .replace(/%TYPE_FIELD%/g, variables.TYPE_FIELD);
    }
    throw error;
  }
}

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';
var PRETTY_PRINT_OPTIONS = {
      pretty: true
    };

function createCommonErrorResponse(errorCode, error, requestId) {
  if (error.message) {
    error = error.message;
  } else {
    error = error.toString();
  }
  var doc = xmlbuilder.create();
  doc.begin('ErrorResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('Error')
      .element('Code').text(errorCode).up()
      .element('Message').text(error).up()
    .up()
    .element('RequestId').text(requestId).up();
  return doc.toString(PRETTY_PRINT_OPTIONS);
}

function createSenderErrorResponse(errorCode, error, requestId) {
  if (error.message) {
    error = error.message;
  } else {
    error = error.toString();
  }
  var doc = xmlbuilder.create();
  doc.begin('ErrorResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('Error')
      .element('Type').text('Sender').up()
      .element('Code').text(errorCode).up()
      .element('Message').text(error).up()
    .up()
    .element('RequestId').text(requestId).up();
  return doc.toString(PRETTY_PRINT_OPTIONS);
}

var handlers = Object.create(null);

var defaultHttpPort = 80;
var defaultBaseHost = '127.0.0.1.xip.io';

function getBaseHostAndPort(config, request) {
  var host = config.baseHost ||
             request.headers.http_x_forwarded_host ||
             request.headers.host ||
             defaultBaseHost + ':' + config.port;
  var port = defaultHttpPort;

  var portMatching = host.match(/:(\d+)$/);
  if (portMatching) {
    host = host.replace(portMatching[0], '');
    port = parseInt(portMatching[1]);
  }

  if (port == defaultHttpPort)
    return host;
  else
    return host + ':' + port;
}

function createGenericResponse(action, result, requestId) {
  var doc = xmlbuilder.create();
  var root = doc.begin(action + 'Response', { version: '1.0' })
                .attribute('xmlns', XMLNS);

  var resultContainer = root.element(action + 'Result');
  if (result) resultContainer.importXMLBuilder(result);

  root.element('ResponseMetadata')
      .element('RequestId').text(requestId);

  return doc.toString(PRETTY_PRINT_OPTIONS);
}

function createDomainStatus(options) {
  var domainStatus = xmlbuilder.create();
  domainStatus.begin(options.element || 'DomainStatus', { version: '1.0' })
    .element('Created').text('true').up() // always true, for compatibility with ACS
    .element('Deleted').text(options.deleted || 'false').up()
    .element('DocService')
      .element('Endpoint').text(options.domain.getDocumentsEndpoint(options.hostAndPort)).up()
      .element('Arn').text(options.domain.documentsArn).up()
    .up()
    .element('DomainId')
      .text(options.domain.domainId)
    .up()
    .element('DomainName').text(options.domain.name).up()
    .element('NumSearchableDocs')
      .text(options.domain.searchableDocumentsCount)
    .up()
    .element('Processing')
      .text(options.domain.processing)
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
      .element('Endpoint').text(options.domain.getSearchEndpoint(options.hostAndPort)).up()
      .element('Arn').text(options.domain.searchArn).up()
    .up();
  return domainStatus;
}

handlers.CreateDomain = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain(request.query.DomainName || '', context);
      });
  if (!domain.exists())
    domain.createSync();
  var result = createDomainStatus({
        domain:      domain,
        hostAndPort: getBaseHostAndPort(config, request)
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('CreateDomain', result, request.id));
};

handlers.DeleteDomain = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain(request.query.DomainName || '', context);
      });
  var result;
  if (domain.exists()) {
    domain.deleteSync();
    result = createDomainStatus({
      domain:      domain,
      hostAndPort: getBaseHostAndPort(config, request),
      deleted:     true
    });
  } else {
    result = null;
  }
  response.contentType('application/xml');
  response.send(createGenericResponse('DeleteDomain', result, request.id));
};

function createDomainStatusList(options) {
  var doc = xmlbuilder.create();
  var domainStatusList = doc.begin('DomainStatusList', {version: '1.0'});
  options.domains.forEach(function(domain) {
    domainStatusList.importXMLBuilder(createDomainStatus({
                       domain:      domain,
                       hostAndPort: options.hostAndPort,
                       element:     'member'
                     }));
  });
  return doc;
}

handlers.DescribeDomains = function(context, request, response, config) {
  var keys = Object.keys(request.query).filter(function(key) {
        return /^DomainNames\.member\.\d+$/.test(key);
      });
  var domainNames = keys.sort().map(function(key) {
        return request.query[key];
      });
  var domains = domainNames.length ?
                  domainNames.map(function(name) {
                    try {
                      var domain = new Domain(name, context);
                      return domain.exists() ? domain : null ;
                    } catch(error) {
                      return null;
                    }
                  }).filter(function(domain) {
                    return domain;
                  }) :
                  Domain.getAll(context) ;
  var result = createDomainStatusList({
        domains:     domains,
        hostAndPort: getBaseHostAndPort(config, request)
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeDomains', result, request.id));
};

function createIndexFieldOptionStatus(field) {
  switch (field.type) {
    case 'text':
      var textOptions = xmlbuilder.create();
      textOptions.begin('TextOptions', { version: '1.0' })
        .element('DefaultValue').up()
        .element('FacetEnabled').text(field.facetEnabled).up()
        .element('ResultEnabled').text(field.resultEnabled);
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
        .element('FacetEnabled').text(field.facetEnabled).up()
        .element('ResultEnabled').text(field.resultEnabled).up()
        .element('SearchEnabled').text(field.searchEnabled);
      return literalOptions;
  }
}

function createOptionStatus(options) {
  var optionStatus = xmlbuilder.create();
  var createdAt = options.createdAt;
  var pendingDeletion = options.pendingDeletion;
  var state = options.state;
  var updatedAt = options.updatedAt;
  var updateVersion = options.updateVersion;
  if (options.field) {
    if (!createdAt) createdAt = options.field.createdAt;
    if (!pendingDeletion) pendingDeletion = options.field.pendingDeletion;
    if (!state) state = options.field.state;
    if (!updatedAt) updatedAt = options.field.updatedAt;
    if (!updateVersion) updateVersion = options.field.updateVersion;
  }
  optionStatus.begin(options.element || 'Status', { version: '1.0' })
    .element('CreationDate').text(dateFormat(createdAt, 'isoUtcDateTime')).up()
    .element('PendingDeletion').text(pendingDeletion || 'false').up()
    .element('State').text(state || 'RequiresIndexDocuments').up()
    .element('UpdateDate').text(dateFormat(updatedAt, 'isoUtcDateTime')).up()
    .element('UpdateVersion').text(updateVersion || '0');
  return optionStatus;
}

function createIndexFieldStatus(options) {
  var indexFieldStatus = xmlbuilder.create();
  indexFieldStatus.begin(options.element || 'IndexField', { version: '1.0' })
    .element('Options')
      .element('IndexFieldName').text(options.field.name).up()
      .element('IndexFieldType').text(options.field.type).up()
      .importXMLBuilder(createIndexFieldOptionStatus(options.field))
    .up()
    .importXMLBuilder(createOptionStatus({ field:   options.field,
                                           state:   options.state,
                                           element: 'Status' }));
  return indexFieldStatus;
}

var TEXT_FIELD_OPTIONS = IndexField.TEXT_FIELD_OPTIONS.map(function(option) {
      return 'IndexField.TextOptions.' + option;
    });
var LITERAL_FIELD_OPTIONS = IndexField.LITERAL_FIELD_OPTIONS.map(function(option) {
      return 'IndexField.LiteralOptions.' + option;
    });
var UINT_FIELD_OPTIONS = IndexField.UINT_FIELD_OPTIONS.map(function(option) {
      return 'IndexField.UIntOptions.' + option;
    });

function assertValidFieldOptions(request, type, domainName) {
  var validOptions = type == 'text' ? TEXT_FIELD_OPTIONS :
                     type == 'literal' ? LITERAL_FIELD_OPTIONS :
                     UINT_FIELD_OPTIONS;
  
  var options = Object.keys(request.query).filter(function(name) {
        return /^IndexField\.[^\.]+Options\./.test(name);
      });
  if (options.some(function(name) {
        return validOptions.indexOf(name) < 0;
      }))
    throw new errors.NotFoundError('Domain not found: ' + domainName);
}

function getFieldOption(option, request, type) {
  if (type == 'text')
    return request.query['IndexField.TextOptions.' + option];
  if (type == 'literal')
    return request.query['IndexField.LiteralOptions.' + option];
  else
    return request.query['IndexField.UIntOptions.' + option];
}

handlers.DefineIndexField = function(context, request, response, config) {
  var domainName = request.query.DomainName || '';
  var domain = handleDomanValidationError(function() {
        return new Domain(domainName, context);
      });
  if (!domain || !domain.exists())
    throw new errors.NotFoundError('Domain not found: ' + domainName);

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var fieldType = request.query['IndexField.IndexFieldType'] || '';
  var field = handleIndexFieldValidationError(function() {
        var field = domain.getIndexField(fieldName);
        field.type = fieldType;
        return field;
      });

  assertValidFieldOptions(request, fieldType, domainName);

  var facetEnabled = getFieldOption('FacetEnabled', request, fieldType);
  if (facetEnabled !== undefined)
    field.facetEnabled = facetEnabled.toLowerCase() == 'true';

  var resultEnabled = getFieldOption('ResultEnabled', request, fieldType);
  if (resultEnabled !== undefined)
    field.resultEnabled = resultEnabled.toLowerCase() == 'true';

  var searchEnabled = getFieldOption('SearchEnabled', request, fieldType);
  if (searchEnabled !== undefined)
    field.searchEnabled = searchEnabled.toLowerCase() == 'true';

  if (!field.exists())
    field.createSync();
  else
    field.saveOptionsSync();

  var result = createIndexFieldStatus({
        field: field,
        state: 'RequiresIndexDocuments'
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DefineIndexField', result, request.id));
};

handlers.DeleteIndexField = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain(request.query.DomainName || '', context);
      });
  if (!domain || !domain.exists())
    throw new errors.NotFoundError('Domain not found: ' + domainName);

  var fieldName = request.query['IndexFieldName'] || '';
  var field = handleIndexFieldValidationError(function() {
        return domain.getIndexField(fieldName);
      }, {
        NAME_FIELD: 'indexFieldName'
      });

  var result = null;
  if (field.exists()) {
    result = createIndexFieldStatus({
      field: field
    });
    field.deleteSync();
  }

  response.contentType('application/xml');
  response.send(createGenericResponse('DeleteIndexField', result, request.id));
};

function createIndexFields(fields) {
  var doc = xmlbuilder.create();
  var indexFields = doc.begin('IndexFields', {version: '1.0'});
  fields.forEach(function(field) {
    indexFields.importXMLBuilder(createIndexFieldStatus({
                  field:   field,
                  element: 'member'
                }));
  });
  return doc;
}

handlers.DescribeIndexFields = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);

  var keys = Object.keys(request.query).filter(function(key) {
        return /^FieldNames\.member\.\d+$/.test(key);
      });
  var fieldNames = keys.sort().map(function(key) {
        return request.query[key];
      });
  var fields = fieldNames.length ?
                  fieldNames.map(function(name) {
                    try {
                      var field = domain.getIndexField(name);
                      return field.exists() ? field : null ;
                    } catch(error) {
                      return null;
                    }
                  }).filter(function(field) {
                    return field;
                  }) :
                  domain.indexFields ;
  var result = createIndexFields(fields);
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeIndexFields', result, request.id));
};

function createFieldNames(domain) {
  var doc = xmlbuilder.create();
  var fieldNames = doc.begin('FieldNames', {version: '1.0'});
  domain.indexFields
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
  return doc;
}

handlers.IndexDocuments = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);
  domain.reindexSync();
  var result = createFieldNames(domain);
  response.contentType('application/xml');
  response.send(createGenericResponse('IndexDocuments', result, request.id));
};

function createSynonymOptionsStatus(options) {
  var synonyms = options.domain.getSynonymsSync();
  var synonymOptions = { synonyms: synonyms };

  var synonymOptionsStatus = xmlbuilder.create();
  synonymOptionsStatus.begin('Synonyms', { version: '1.0' })
    .element('Options')
      .text(JSON.stringify(synonymOptions))
    .up()
    .importXMLBuilder(createOptionStatus({ state:         options.state,
                                           createdAt:     options.createdAt,
                                           updatedAt:     options.updatedAt,
                                           updateVersion: options.updateVersion,
                                           element:       'Status' }));
  return synonymOptionsStatus;
}

handlers.UpdateSynonymOptions = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);
  var synonymOptionsJson = request.query.Synonyms;
  var synonymOptions = JSON.parse(synonymOptionsJson);
  domain.updateSynonymsSync(synonymOptions.synonyms);

  var result = createSynonymOptionsStatus({
        domain:    domain,
        updatedAt: domain.getOptionCreationDate('synonyms'),
        createdAt: domain.getOptionUpdateDate('synonyms')
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('UpdateSynonymOptions', result, request.id));
};

handlers.DescribeSynonymOptions = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);
  var result = createSynonymOptionsStatus({
        domain:    domain,
        updatedAt: domain.getOptionCreationDate('synonyms'),
        createdAt: domain.getOptionUpdateDate('synonyms')
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeSynonymOptions', result, request.id));
};

function createDefaultSearchFieldStatus(options) {
  var defaultSearchFieldStatus = xmlbuilder.create();
  defaultSearchFieldStatus.begin('DefaultSearchField', { version: '1.0' })
    .element('Options').text(options.fieldName).up()
    .importXMLBuilder(createOptionStatus({
       state:         options.state,
       createdAt:     options.createdAt,
       updatedAt:     options.updatedAt,
       updateVersion: options.updateVersion,
       element:       'Status'
    }));
  return defaultSearchFieldStatus;
}

handlers.UpdateDefaultSearchField = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);
  var fieldName = request.query.DefaultSearchField;
  domain.defaultSearchField = fieldName;

  var result = createDefaultSearchFieldStatus({
        fieldName: fieldName,
        updatedAt: domain.getOptionCreationDate('defaultSearchField'),
        createdAt: domain.getOptionUpdateDate('defaultSearchField')
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('UpdateDefaultSearchField', result, request.id));
};

handlers.DescribeDefaultSearchField = function(context, request, response, config) {
  var domain = new Domain(request.query.DomainName, context);
  var field = domain.defaultSearchField;
  var result = createDefaultSearchFieldStatus({
        fieldName: field ? field.name : '',
        updatedAt: domain.getOptionCreationDate('defaultSearchField'),
        createdAt: domain.getOptionUpdateDate('defaultSearchField')
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeDefaultSearchField', result, request.id));
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
    request.id = uuid.v4();
    response.setHeader('x-amzn-requestid', request.id);

    // GCS specific behaviour: prevent to access this API from specific IP
    // range.
    if (privilegedRanges && privilegedRanges.length) {
      if (!privilegedRanges.some(function(privilegedRange) {
            return ipv4.isInRange(getClientIp(request), privilegedRange);
          })) {
        message = 'Permission denied.';
        body = createSenderErrorResponse('InvalidClientIpRange', message, request.id);
        response.contentType('application/xml');
        return response.send(body, 403);
      }
    }

    // GCS specific behaviour: fallback to other handlers for the endpoint
    // if no action is given.
    var action = request.query.Action || '';
    if (!action)
      return next();

    // ACS document says "The API version must be specified in all requests."
    // but actual implementation of ACS accepts configuration requests
    // without Version specification.
    // See http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/ConfigAPI.html
    var version = request.query.Version;
    if (version && version != exports.version) {
      message = 'A bad or out-of-range value "' + version + '" was supplied ' +
                'for the "Version" input parameter.';
      body = createSenderErrorResponse('InvalidParameterValue', message, request.id);
      response.contentType('application/xml');
      return response.send(body, 400);
    }

    if (!(action in handlers)) {
      message = 'The action ' + action + ' is not valid for this web service.';
      body = createSenderErrorResponse('InvalidAction', message, request.id);
      response.contentType('application/xml');
      return response.send(body, 400);
    }

    var handler = handlers[action];
    try {
      handler(context, request, response, config);
    } catch (error) {
      logger.error(error);
      var body, code;
      if (error.isSenderError) {
        body = createSenderErrorResponse(error.code, error, request.id);
        code = error.type == 'FieldOptionConflictError' ? 409 : 400;
      } else {
        body= createCommonErrorResponse('InternalFailure', error.stack || error, request.id);
        code = 500;
      }
      response.contentType('application/xml');
      response.send(body, code);
    }
  };
};
