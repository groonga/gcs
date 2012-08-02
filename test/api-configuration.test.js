var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var Domain = require('../lib/database').Domain;

var XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';

var PATTERN_DocService = {
      Endpoint: ''
    };
var PATTERN_SearchService = {
      Endpoint: ''
    };
var PATTERN_ResponseMetadata = {
      RequestId: {}
    };
var PATTERN_DomainStatus = {
      Created: '',
      Deleted: '',
      DocService: PATTERN_DocService,
      DomainId: '',
      DomainName: '',
      NumSearchableDocs: '',
      RequiresIndexDocuments: '',
      SearchInstanceCount: '',
      SearchPartitionCount: '',
      SearchService: PATTERN_SearchService
    };
var PATTERN_CreateDomainResponse = {
      CreateDomainResponse: {
        '@': { xmlns: '' },
        CreateDomainResult: {
          DomainStatus: PATTERN_DomainStatus
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };
var PATTERN_DeleteDomainResponse = {
      DeleteDomainResponse: {
        '@': { xmlns: '' },
        DeleteDomainResult: {
          DomainStatus: PATTERN_DomainStatus
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_OptionStatus = {
      CreationDate: '',
      State: '',
      UpdateDate: '',
      UpdateVersion: ''
    };
var PATTERN_TextOptions = {
      DefaultValue: {},
      FacetEnabled: '',
      ResultEnabled: ''
    };
var PATTERN_IndexField_Text = {
      IndexFieldName: '',
      IndexFieldType: '',
      TextOptions: PATTERN_TextOptions
    };
var PATTERN_IndexFieldStatus_Text = {
      Options: PATTERN_IndexField_Text,
      Status: PATTERN_OptionStatus
    };
var PATTERN_DefineIndexFieldResponse_Text = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: PATTERN_IndexFieldStatus_Text
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };
var PATTERN_UIntOptions = {
      DefaultValue: {}
    };
var PATTERN_IndexField_UInt = {
      IndexFieldName: '',
      IndexFieldType: '',
      UIntOptions: PATTERN_UIntOptions
    };
var PATTERN_IndexFieldStatus_UInt = {
      Options: PATTERN_IndexField_UInt,
      Status: PATTERN_OptionStatus
    };
var PATTERN_DefineIndexFieldResponse_UInt = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: PATTERN_IndexFieldStatus_UInt
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };
var PATTERN_LiteralOptions = {
      DefaultValue: {},
      FacetEnabled: '',
      ResultEnabled: '',
      SearchEnabled: ''
    };
var PATTERN_IndexField_Literal = {
      IndexFieldName: '',
      IndexFieldType: '',
      LiteralOptions: PATTERN_LiteralOptions
    };
var PATTERN_IndexFieldStatus_Literal = {
      Options: PATTERN_IndexField_Literal,
      Status: PATTERN_OptionStatus
    };
var PATTERN_DefineIndexFieldResponse_Literal = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: PATTERN_IndexFieldStatus_Literal
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_DeleteIndexFieldResponse = {
      DeleteIndexFieldResponse: {
        '@': { xmlns: '' },
        DeleteIndexFieldResult: {},
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

function PATTERN_IndexDocumentsResponse(members) {
  return {
    IndexDocumentsResponse: {
      '@': { xmlns: '' },
      IndexDocumentsResult: {
        FieldNames: (function() {
          var pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = '';
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: PATTERN_ResponseMetadata
    }
  };
}

var PATTERN_UpdateSynonymOptionsResponse = {
      UpdateSynonymOptionsResponse: {
        '@': { xmlns: '' },
        UpdateSynonymOptionsResult: {
          Synonyms: {
            Status: {
              CreationDate: '',
              UpdateVersion: '',
              State: '',
              UpdateDate: ''
            },
            Options: ''
          },
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_COMMON_ERROR_RESPONSE = {
      Response: {
        Errors: {
          Error: {
            Code: '',
            Message: ''
          }
        },
        RequestID: {}
      }
    };

function toXMLPattern(fragment) {
  switch (typeof fragment) {
    default:
      return '';
    case 'object':
      var format = {};
      Object.keys(fragment).forEach(function(key) {
        if (!fragment.hasOwnProperty(key))
          return;
        format[key] = toXMLPattern(fragment[key]);
      });
      return format;
  }
}

function replaceXMLDates(str) {
  return str.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                     '1970-01-01T00:00:00Z');
}

function toParsedResponse(response) {
  var parsed = {
        statusCode: response.statusCode,
        body: utils.XMLStringToJSON(response.body)
      };
  var pattern = {
        statusCode: parsed.statusCode,
        body: toXMLPattern(parsed.body)
      };
  parsed.pattern = pattern;
  return parsed;
}

suite('Configuration API', function() {
  var temporaryDatabase;
  var context;
  var server;

  setup(function() {
    temporaryDatabase = utils.createTemporaryDatabase();
    context = temporaryDatabase.get();
    server = utils.setupServer(context);
  });

  teardown(function() {
    server.close();
    temporaryDatabase.teardown();
    temporaryDatabase = undefined;
  });

  test('Get, Action=CreateDomain', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
         'Host': 'cloudsearch.localhost'
       })
      .next(function(response) {
        var domain = new Domain('companies', context);
        assert.isTrue(domain.exists());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_CreateDomainResponse });
        var expectedStatus = {
              Created: 'true',
              Deleted: 'false',
              DocService: {
                Endpoint: domain.getDocumentsEndpoint('localhost')
              },
              DomainId: domain.domainId,
              DomainName: domain.name,
              NumSearchableDocs: String(domain.searchableDocumentsCount),
              RequiresIndexDocuments: String(domain.requiresIndexDocuments),
              SearchInstanceCount: String(domain.searchInstanceCount),
              SearchPartitionCount: String(domain.searchPartitionCount),
              SearchService: {
                Endpoint: domain.getSearchEndpoint('localhost')
              }
            };
        var status = response.body.CreateDomainResponse.CreateDomainResult.DomainStatus;
        assert.deepEqual(status, expectedStatus);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteDomain', function(done) {
    var domain;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .next(function() {
        domain = new Domain('companies', context);
        assert.isTrue(domain.exists());
      })
      .get('/?DomainName=companies&Action=DeleteDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .next(function(response) {
        assert.isFalse(domain.exists());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DeleteDomainResponse });
        var expectedStatus = {
              Created: 'false',
              Deleted: 'true',
              DocService: {
                Endpoint: domain.getDocumentsEndpoint('localhost')
              },
              DomainId: domain.domainId,
              DomainName: domain.name,
              NumSearchableDocs: String(domain.searchableDocumentsCount),
              RequiresIndexDocuments: String(domain.requiresIndexDocuments),
              SearchInstanceCount: String(domain.searchInstanceCount),
              SearchPartitionCount: String(domain.searchPartitionCount),
              SearchService: {
                Endpoint: domain.getSearchEndpoint('localhost')
              }
            };
        var status = response.body.DeleteDomainResponse.DeleteDomainResult.DomainStatus;
        assert.deepEqual(status, expectedStatus);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DefineIndexField (text)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('name');
        assert.isTrue(field.exists());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Text });
        var expectedOptions = {
              IndexFieldName: field.name,
              IndexFieldType: field.type,
              TextOptions: {
                DefaultValue: {},
                FacetEnabled: String(field.facetEnabled),
                ResultEnabled: String(field.resultEnabled)
              }
            };
        var options = response.body.DefineIndexFieldResponse.DefineIndexFieldResult.IndexField.Options;
        assert.deepEqual(options, expectedOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DefineIndexField (uint)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('age');
        assert.isTrue(field.exists());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_UInt });
        var expectedOptions = {
              IndexFieldName: field.name,
              IndexFieldType: field.type,
              UIntOptions: {
                DefaultValue: {}
              }
            };
        var options = response.body.DefineIndexFieldResponse.DefineIndexFieldResult.IndexField.Options;
        assert.deepEqual(options, expectedOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DefineIndexField (literal)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('product');
        assert.isTrue(field.exists());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Literal });
        var expectedOptions = {
              IndexFieldName: field.name,
              IndexFieldType: field.type,
              LiteralOptions: {
                DefaultValue: {},
                FacetEnabled: String(field.facetEnabled),
                ResultEnabled: String(field.resultEnabled),
                SearchEnabled: String(field.searchEnabled)
              }
            };
        var options = response.body.DefineIndexFieldResponse.DefineIndexFieldResult.IndexField.Options;
        assert.deepEqual(options, expectedOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteIndexField (text)', function(done) {
    var domain, field;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        field = domain.getIndexField('name');
      })
      .get('/?DomainName=companies&IndexFieldName=name&' +
           'Action=DeleteIndexField&Version=2011-02-01')
      .next(function(response) {
        assert.deepEqual({ domain: domain.exists(),
                           field:  field.exists() },
                         { domain: true,
                           field:  false });

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DeleteIndexFieldResponse });

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteIndexField (uint)', function(done) {
    var domain, field;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        field = domain.getIndexField('age');
      })
      .get('/?DomainName=companies&IndexFieldName=age&' +
           'Action=DeleteIndexField&Version=2011-02-01')
      .next(function(response) {
        assert.deepEqual({ domain: domain.exists(),
                           field:  field.exists() },
                         { domain: true,
                           field:  false });

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DeleteIndexFieldResponse });

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteIndexField (literal)', function(done) {
    var domain, field;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        field = domain.getIndexField('product');
      })
      .get('/?DomainName=companies&IndexFieldName=product&' +
           'Action=DeleteIndexField&Version=2011-02-01')
      .next(function(response) {
        assert.deepEqual({ domain: domain.exists(),
                           field:  field.exists() },
                         { domain: true,
                           field:  false });

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DeleteIndexFieldResponse });

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=IndexDocuments', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&' +
           'Action=IndexDocuments&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        assert.isTrue(domain.exists());
        assert.isTrue(domain.getIndexField('name').exists());
        assert.isTrue(domain.getIndexField('age').exists());

        var expectedFieldNames = ['age', 'name'];
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_IndexDocumentsResponse(expectedFieldNames) });
        var fieldNames = response.body.IndexDocumentsResponse
                                      .IndexDocumentsResult
                                      .FieldNames
                                      .member;
        fieldNames = (function() {
          var names = [];
          for (var i in fieldNames) {
            if (fieldNames.hasOwnProperty(i))
              names.push(fieldNames[i]);
          }
          return names;
        })();
        assert.deepEqual(fieldNames, expectedFieldNames);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=UpdateSynonymOptions', function(done) {
    var domain;
    var synonymsObject = {
      synonyms: {
        tokio: ["tokyo"],
        dekkaido: "hokkaido"
      }
    };
    var json = JSON.stringify(synonymsObject);
    var synonyms = encodeURIComponent(json);
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
        'Host': 'cloudsearch.localhost'
      })
      .next(function() {
        domain = new Domain('companies', context);
        assert.isFalse(domain.isSynonymTableAvailableSync());
      })
      .get('/?Version=2011-02-01&Action=UpdateSynonymOptions&' +
           'DomainName=companies&Synonyms='+synonyms, {
        'Host': 'cloudsearch.localhost'
      })
      .next(function(response) {
        assert.isTrue(domain.isSynonymTableAvailableSync());

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_UpdateSynonymOptionsResponse });

        var synonymOptions = response.body.UpdateSynonymOptionsResponse
                                          .UpdateSynonymOptionsResult
                                          .Synonyms.Options;
        synonymOptions = JSON.parse(synonymOptions);
        var expectedSynonymOptions = {
              synonyms: {
                tokio: ['tokyo'],
                dekkaido: 'hokkaido'
              }
            };
        assert.deepEqual(expectedSynonymOptions, synonymOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no version', function(done) {
    utils
      .get('/?Action=unknown', {
        'Host': 'cloudsearch.localhost'
      })
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 400,
                           body: PATTERN_COMMON_ERROR_RESPONSE });

        var expectedError = {
              Code: 'MissingParameter',
              Message: 'An input parameter "Version" that is mandatory for ' +
                       'processing the request is not supplied.'
            };
        assert.deepEqual(response.body.Response.Errors.Error, expectedError);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, invalid version', function(done) {
    utils
      .get('/?Version=2011-02-02&Action=unknown', {
        'Host': 'cloudsearch.localhost'
      })
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 400,
                           body: PATTERN_COMMON_ERROR_RESPONSE });

        var expectedError = {
              Code: 'InvalidParameterValue',
              Message: 'A bad or out-of-range value "2011-02-02" was supplied ' +
                       'for the "Version" input parameter.'
            };
        assert.deepEqual(response.body.Response.Errors.Error, expectedError);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
