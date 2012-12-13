var path = require('path');
var nroonga = require('../../wrapped-nroonga');
var Domain = require('../../database').Domain;
var IndexField = require('../../database').IndexField;
var dateFormat = require('dateformat');
var xmlbuilder = require('xmlbuilder');
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
  var doc = xmlbuilder.create('ErrorResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('Error')
      .element('Code').text(errorCode).up()
      .element('Message').text(error).up()
    .up()
    .element('RequestId').text(requestId).up().doc();
  return doc.toString(PRETTY_PRINT_OPTIONS);
}

function createSenderErrorResponse(errorCode, error, requestId) {
  if (error.message) {
    error = error.message;
  } else {
    error = error.toString();
  }
  var doc = xmlbuilder.create('ErrorResponse', { version: '1.0' })
    .attribute('xmlns', XMLNS)
    .element('Error')
      .element('Type').text('Sender').up()
      .element('Code').text(errorCode).up()
      .element('Message').text(error).up()
    .up()
    .element('RequestId').text(requestId).up().doc();
  return doc.toString(PRETTY_PRINT_OPTIONS);
}

var handlers = Object.create(null);

function createGenericResponse(action, result, requestId) {
  var root = xmlbuilder.create(action + 'Response', { version: '1.0' })
                .attribute('xmlns', XMLNS);

  var resultContainer = root.element(action + 'Result');
  if (result) resultContainer.importXMLBuilder(result);

  root.element('ResponseMetadata')
      .element('RequestId').text(requestId);

  return root.doc().toString(PRETTY_PRINT_OPTIONS);
}

function createDomainStatus(options) {
  var domainStatus = xmlbuilder.create(options.element || 'DomainStatus', { version: '1.0' })
    .element('Created').text('true').up() // always true, for compatibility with ACS
    .element('Deleted').text(options.deleted || 'false').up()
    .element('DocService')
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
      .element('Arn').text(options.domain.searchArn).up()
    .up();
  return domainStatus;
}

handlers.CreateDomain = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain({ name:    request.query.DomainName || '',
                            context: context }).validate();
      });
  domain.saveSync();
  var result = createDomainStatus({
        domain: domain
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('CreateDomain', result, request.id));
};

handlers.DeleteDomain = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain({ name:    request.query.DomainName || '',
                            context: context }).validate();
      });
  var result;
  if (domain.exists()) {
    domain.deleteSync();
    result = createDomainStatus({
      domain:  domain,
      deleted: true
    });
  } else {
    result = null;
  }
  response.contentType('application/xml');
  response.send(createGenericResponse('DeleteDomain', result, request.id));
};

function createDomainStatusList(options) {
  var domainStatusList = xmlbuilder.create('DomainStatusList', {version: '1.0'});
  options.domains.forEach(function(domain) {
    domainStatusList.importXMLBuilder(createDomainStatus({
                       domain:  domain,
                       element: 'member'
                     }));
  });
  return domainStatusList.doc();
}

handlers.DescribeDomains = function(context, request, response, config) {
  var keys = Object.keys(request.query).filter(function(key) {
        var match = key.match(/^DomainNames\.member\.([^\.]+)$/);
        if (!match) return false;
        var index = parseInt(match[1]);
        if (isNaN(index))
          throw new errors.MalformedInputError('Start of list found where not expected');
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
                      var domain = new Domain({ name:    name,
                                                context: context });
                      return domain.exists() ? domain : null;
                    } catch(error) {
                      return null;
                    }
                  }).filter(function(domain) {
                    return domain;
                  }) :
                  Domain.getAll(context).reverse();
  var result = createDomainStatusList({
        domains: domains
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeDomains', result, request.id));
};

function createIndexFieldOptionStatus(field, givenOptions) {
  var hasOption = Object.keys(field.getAllOptions()).length;
  switch (field.type) {
    case 'text':
      var textOptionsFragment = xmlbuilder.create('TextOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        textOptionsFragment.element('DefaultValue').text(field.defaultValue);
      if (field.hasFacetEnabled)
        textOptionsFragment.element('FacetEnabled').text(field.facetEnabled);
      if (field.hasResultEnabled)
        textOptionsFragment.element('ResultEnabled').text(field.resultEnabled);
      return hasOption ? textOptionsFragment.doc() : null;

    case 'uint':
      var uintOptionsFragment = xmlbuilder.create('UIntOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        uintOptionsFragment.element('DefaultValue').text(field.defaultValue);
      return hasOption ? uintOptionsFragment.doc() : null;

    case 'literal':
      var literalOptionsFragment = xmlbuilder.create('LiteralOptions', { version: '1.0' });
      if (field.hasDefaultValue)
        literalOptionsFragment.element('DefaultValue').text(field.defaultValue);
      if (field.hasFacetEnabled)
        literalOptionsFragment.element('FacetEnabled').text(field.facetEnabled);
      if (field.hasResultEnabled)
        literalOptionsFragment.element('ResultEnabled').text(field.resultEnabled);
      if (field.hasSearchEnabled)
        literalOptionsFragment.element('SearchEnabled').text(field.searchEnabled);
      return hasOption ? literalOptionsFragment.doc() : null;
  }
}

function createOptionStatus(options) {
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
  var status = xmlbuilder.create(options.element || 'Status', { version: '1.0' })
    .element('CreationDate').text(dateFormat(createdAt, 'isoUtcDateTime')).up()
    .element('PendingDeletion').text(pendingDeletion || 'false').up()
    .element('State').text(state || 'RequiresIndexDocuments').up()
    .element('UpdateDate').text(dateFormat(updatedAt, 'isoUtcDateTime')).up()
    .element('UpdateVersion').text(updateVersion || '0');
  return status.doc();
}

function createIndexFieldStatus(options) {
  var statusFragment = xmlbuilder.create(options.element || 'IndexField', { version: '1.0' });

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
  return statusFragment.doc();
}

handlers.DefineIndexField = function(context, request, response, config) {
  var validationErrors = [];

  var domainName = request.query.DomainName || '';
  var domain;
  try {
    handleDomanValidationError(function() {
      domain = new Domain({ name:    domainName,
                            context: context });
      domain.validate();
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = error.messages.concat(validationErrors);
    else
      throw error;
  }

  function assertNoOtherError() {
    if (validationErrors.length)
      throw new errors.MultiplexedValidationError(validationErrors);

    if (!domain || !domain.exists())
      throw new errors.ResourceNotFoundError('Domain not found: ' + domainName);
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
    if (error.isValidationError && error.isMultiplexed) {
      validationErrors = error.messages.concat(validationErrors);
    } else {
      assertNoOtherError();
      throw error;
    }
  }

  assertNoOtherError();

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

  field.clearAllOptions();
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
      domain = new Domain({ name:    domainName,
                            context: context });
      domain.validate();
    });
  } catch(error) {
    if (error.isValidationError && error.isMultiplexed)
      validationErrors = validationErrors.concat(error.messages);
    else
      throw error;
  }

  function assertNoOtherError() {
    if (validationErrors.length)
      throw new errors.MultiplexedValidationError(validationErrors);

    if (!domain || !domain.exists())
      throw new errors.ResourceNotFoundError('Domain not found: ' + domainName);
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
    if (error.isValidationError && error.isMultiplexed) {
      validationErrors = validationErrors.concat(error.messages);
    } else {
      assertNoOtherError();
      throw error;
    }
  }

  assertNoOtherError();

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
  var indexFields = xmlbuilder.create('IndexFields', {version: '1.0'});
  fields.forEach(function(field) {
    indexFields.importXMLBuilder(createIndexFieldStatus({
                  field:   field,
                  element: 'member'
                }));
  });
  return indexFields.doc();
}

handlers.DescribeIndexFields = function(context, request, response, config) {
  var domain = handleDomanValidationError(function() {
        return new Domain({ name:    request.query.DomainName,
                            context: context }).validate();
      });

  var keys = Object.keys(request.query).filter(function(key) {
        var match = key.match(/^FieldNames\.member\.([^\.]+)$/);
        if (!match) return false;
        var index = parseInt(match[1]);
        if (isNaN(index))
          throw new errors.MalformedInputError('Start of list found where not expected');
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
                      return field.exists() ? field : null;
                    } catch(error) {
                      return null;
                    }
                  }).filter(function(field) {
                    return field;
                  }) :
                  domain.indexFields;
  var result = createIndexFields(fields);
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeIndexFields', result, request.id));
};

function createFieldNames(domain) {
  var fieldNames = xmlbuilder.create('FieldNames', {version: '1.0'});
  domain.indexFields
    .map(function(field) {
      return field.name;
    })
    .sort()
    .forEach(function(fieldName) {
      var member = xmlbuilder.create('member', { version: '1.0' })
        .text(fieldName)
        .doc();
     fieldNames.importXMLBuilder(member);
    });
  return fieldNames.doc();
}

handlers.IndexDocuments = function(context, request, response, config) {
  var domain = new Domain({ name:    request.query.DomainName,
                            context: context });
  domain.reindexSync();
  var result = createFieldNames(domain);
  response.contentType('application/xml');
  response.send(createGenericResponse('IndexDocuments', result, request.id));
};

function createSynonymOptionsStatus(options) {
  var synonyms = options.domain.getSynonymsSync();
  var synonymOptions = { synonyms: synonyms };

  var synonymOptionsStatus = xmlbuilder.create('Synonyms', { version: '1.0' })
    .element('Options')
      .text(JSON.stringify(synonymOptions))
    .up()
    .importXMLBuilder(createOptionStatus({ state:         options.state,
                                           createdAt:     options.createdAt,
                                           updatedAt:     options.updatedAt,
                                           updateVersion: options.updateVersion,
                                           element:       'Status' }))
    .doc();
  return synonymOptionsStatus;
}

handlers.UpdateSynonymOptions = function(context, request, response, config) {
  var domain = new Domain({ name:    request.query.DomainName,
                            context: context });
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
  var domain = new Domain({ name:    request.query.DomainName,
                            context: context });
  var result = createSynonymOptionsStatus({
        domain:    domain,
        updatedAt: domain.getOptionCreationDate('synonyms'),
        createdAt: domain.getOptionUpdateDate('synonyms')
      });
  response.contentType('application/xml');
  response.send(createGenericResponse('DescribeSynonymOptions', result, request.id));
};

function createDefaultSearchFieldStatus(options) {
  var defaultSearchFieldStatus = xmlbuilder.create('DefaultSearchField', { version: '1.0' })
    .element('Options').text(options.fieldName).up()
    .importXMLBuilder(createOptionStatus({
       state:         options.state,
       createdAt:     options.createdAt,
       updatedAt:     options.updatedAt,
       updateVersion: options.updateVersion,
       element:       'Status'
    }))
    .doc();
  return defaultSearchFieldStatus;
}

handlers.UpdateDefaultSearchField = function(context, request, response, config) {
  var domain = new Domain({ name:    request.query.DomainName,
                            context: context });
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
  var domain = new Domain({ name:    request.query.DomainName,
                            context: context });
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
