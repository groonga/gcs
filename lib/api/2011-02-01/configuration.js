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
      if (error.messages)
        error.messages = error.messages.map(function(message) {
          return message.replace(/%NAME_FIELD%/g, variables.NAME_FIELD);
        });
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
      if (error.messages)
        error.messages = error.messages.map(function(message) {
          return message.replace(/%NAME_FIELD%/g, variables.NAME_FIELD)
                        .replace(/%TYPE_FIELD%/g, variables.TYPE_FIELD);
        });
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
        return new Domain(request.query.DomainName || '', context).validate();
      });
  domain.saveSync();
  var result = createDomainStatus({
        domain:      domain,
        hostAndPort: getBaseHostAndPort(config, request)
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('CreateDomain', result, request.id));
};

handlers.DeleteDomain = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain(request.query.DomainName || '', context).validate();
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
        var match = key.match(/^DomainNames\.member\.([^\.]+)$/);
        if (!match) return false;
        if (!/^[1-9]/.test(match[1]))
          throw new errors.MalformedInputError('Key ' + match[1] + ' may not have a leading \'' + match[1].charAt(0) + '\'');
        return true;
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
                  Domain.getAll(context).reverse() ;
  var result = createDomainStatusList({
        domains:     domains,
        hostAndPort: getBaseHostAndPort(config, request)
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeDomains', result, request.id));
};

function createIndexFieldOptionStatus(field, givenOptions) {
  var hasOption = Object.keys(field.getAllOptions()).length;
  switch (field.type) {
    case 'text':
      var textOptions = xmlbuilder.create();
      var textOptionsFragment = textOptions.begin('TextOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        textOptionsFragment.element('DefaultValue').text(field.defaultValue);
      if (field.hasFacetEnabled)
        textOptionsFragment.element('FacetEnabled').text(field.facetEnabled);
      if (field.hasResultEnabled)
        textOptionsFragment.element('ResultEnabled').text(field.resultEnabled);
      return hasOption ? textOptions : null;

    case 'uint':
      var uintOptions = xmlbuilder.create();
      var uintOptionsFragment = uintOptions.begin('UIntOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        uintOptionsFragment.element('DefaultValue').text(field.defaultValue);
      return hasOption ? uintOptions : null;

    case 'literal':
      var literalOptions = xmlbuilder.create();
      var literalOptionsFragment = literalOptions.begin('LiteralOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        literalOptionsFragment.element('DefaultValue').text(field.defaultValue);
      if (field.hasFacetEnabled)
        literalOptionsFragment.element('FacetEnabled').text(field.facetEnabled);
      if (field.hasResultEnabled)
        literalOptionsFragment.element('ResultEnabled').text(field.resultEnabled);
      if (field.hasSearchEnabled)
        literalOptionsFragment.element('SearchEnabled').text(field.searchEnabled);
      return hasOption ? literalOptions : null;
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
  var statusFragment = indexFieldStatus.begin(options.element || 'IndexField', { version: '1.0' });

  var optionsFragment = statusFragment
        .element('Options')
          .element('IndexFieldName').text(options.field.name).up()
          .element('IndexFieldType').text(options.field.type).up();
  var optionsStatus = createIndexFieldOptionStatus(options.field);
  if (optionsStatus) optionsFragment.importXMLBuilder(optionsStatus);

  statusFragment
    .importXMLBuilder(createOptionStatus({ field:           options.field,
                                           createdAt:       options.createdAt,
                                           pendingDeletion: options.pendingDeletion,
                                           state:           options.state,
                                           updatedAt:       options.updatedAt,
                                           updateVersion:   options.updateVersion,
                                           element:         'Status' }));
  return indexFieldStatus;
}

handlers.DefineIndexField = function(context, request, response, config) {
  var validationErrors = [];

  var domainName = request.query.DomainName || '';
  var domain;
  try {
    handleDomanValidationError(function() {
      domain = new Domain(domainName, context);
      domain.validate();
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = validationErrors.concat(error.messages);
    else
      throw error;
  }

  var fieldName = request.query['IndexField.IndexFieldName'] || '';
  var fieldType = request.query['IndexField.IndexFieldType'] || '';
  var field;
  try {
    handleIndexFieldValidationError(function() {
      field = domain.getIndexField(fieldName).setType(fieldType);
      field.validate();
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = validationErrors.concat(error.messages);
    else
      throw error;
  }

  if (!domain || !domain.exists())
    throw new errors.ResourceNotFoundError('Domain not found: ' + domainName);

  if (validationErrors.length)
    throw new errors.MultiplexedValidationError(validationErrors);

  var textOptions = Object.keys(request.query).filter(function(name) {
        return name.indexOf('IndexField.TextOptions.') == 0;
      });
  var literalOptions = Object.keys(request.query).filter(function(name) {
        return name.indexOf('IndexField.LiteralOptions.') == 0;
      });
  var uintOptions = Object.keys(request.query).filter(function(name) {
        return name.indexOf('IndexField.UIntOptions.') == 0;
      });

  if (fieldType == 'text' && (literalOptions.length || uintOptions.length))
    throw new errors.FieldOptionConflictError('A text IndexField may only specify textOptions');
  if (fieldType == 'literal' && (textOptions.length || uintOptions.length))
    throw new errors.FieldOptionConflictError('A literal IndexField may only specify literalOptions');
  if (fieldType == 'uint' && (textOptions.length || literalOptions.length))
    throw new errors.FieldOptionConflictError('A uint IndexField may only specify uintOptions');

  var optionNames = fieldType == 'text' ? textOptions :
                     fieldType == 'literal' ? literalOptions :
                     uintOptions;
  var optionValues = {};
  optionNames.forEach(function(name) {
    optionValues[name.replace(/^IndexField\.[^\.]+\./, '')] = request.query[name];
  });

  field.setOptions(optionValues);
  field.saveSync();

  var result = createIndexFieldStatus({
        field: field,
        state: 'RequiresIndexDocuments'
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DefineIndexField', result, request.id));
};

handlers.DeleteIndexField = function(context, request, response, config) {
  var validationErrors = [];

  var domainName = request.query.DomainName || '';
  var domain;
  try {
    handleDomanValidationError(function() {
      domain = new Domain(domainName, context);
      domain.validate();
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = validationErrors.concat(error.messages);
    else
      throw error;
  }

  var fieldName = request.query['IndexFieldName'] || '';
  var field;
  try {
    handleIndexFieldValidationError(function() {
      field = domain.getIndexField(fieldName);
      field.validateName();
    }, {
      NAME_FIELD: 'indexFieldName'
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = validationErrors.concat(error.messages);
    else
      throw error;
  }

  if (!domain || !domain.exists())
    throw new errors.ResourceNotFoundError('Domain not found: ' + domainName);

  if (validationErrors.length)
    throw new errors.MultiplexedValidationError(validationErrors);

  var result = null;
  if (field.exists()) {
    result = createIndexFieldStatus({
      field:           field,
      pendingDeletion: 'true'
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
  var domain = handleDomanValidationError(function() {
        return new Domain(request.query.DomainName || '', context).validate();
      });

  var keys = Object.keys(request.query).filter(function(key) {
        var match = key.match(/^FieldNames\.member\.([^\.]+)$/);
        if (!match) return false;
        if (!/^[1-9]/.test(match[1]))
          throw new errors.MalformedInputError('Key ' + match[1] + ' may not have a leading \'' + match[1].charAt(0) + '\'');
        return true;
      });
  var appeared = {};
  var fieldNames = keys.map(function(key) {
        return request.query[key];
      }).filter(function(name) {
        if (name in appeared) return false;
        appeared[name] = true;
        return true;
      }).sort();
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
        switch (error.type) {
          case 'FieldOptionConflictError':
          case 'ResourceNotFoundError':
            code = 409;
            break;
          default:
            code = 400;
            break;
        }
      } else {
        body = createCommonErrorResponse('InternalFailure', error.stack || error, request.id);
        code = 500;
      }
      response.contentType('application/xml');
      response.send(body, code);
    }
  };
};
