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

function PATTERN_DescribeDomainsResponse(members) {
  return {
    DescribeDomainsResponse: {
      '@': { xmlns: '' },
      DescribeDomainsResult: {
        DomainStatusList: (function() {
          var pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = PATTERN_DomainStatus;
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: PATTERN_ResponseMetadata
    }
  };
}

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

function PATTERN_DescribeIndexFieldsResponse(members) {
  return {
    DescribeIndexFieldsResponse: {
      '@': { xmlns: '' },
      DescribeIndexFieldsResult: {
        IndexFields: (function() {
          var pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = member;
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: PATTERN_ResponseMetadata
    }
  };
}

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

var PATTERN_SynonymOptionsStatus = {
      Options: '',
      Status: PATTERN_OptionStatus
    };

var PATTERN_UpdateSynonymOptionsResponse = {
      UpdateSynonymOptionsResponse: {
        '@': { xmlns: '' },
        UpdateSynonymOptionsResult: {
          Synonyms: PATTERN_SynonymOptionsStatus,
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_DescribeSynonymOptionsResponse = {
      DescribeSynonymOptionsResponse: {
        '@': { xmlns: '' },
        DescribeSynonymOptionsResult: {
          Synonyms: PATTERN_SynonymOptionsStatus,
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

var PATTERN_DefaultSearchFieldStatus = {
      Options: '',
      Status: PATTERN_OptionStatus
    };

var PATTERN_DefaultSearchFieldStatus_blank = {
      Options: {},
      Status: PATTERN_OptionStatus
    };

var PATTERN_UpdateDefaultSearchFieldResponse = {
      UpdateDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        UpdateDefaultSearchFieldResult: {
          DefaultSearchField: PATTERN_DefaultSearchFieldStatus,
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_UpdateDefaultSearchFieldResponse_blank = {
      UpdateDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        UpdateDefaultSearchFieldResult: {
          DefaultSearchField: PATTERN_DefaultSearchFieldStatus_blank,
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_DescribeDefaultSearchFieldResponse = {
      DescribeDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        DescribeDefaultSearchFieldResult: {
          DefaultSearchField: PATTERN_DefaultSearchFieldStatus,
        },
        ResponseMetadata: PATTERN_ResponseMetadata
      }
    };

var PATTERN_DescribeDefaultSearchFieldResponse_blank = {
      DescribeDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        DescribeDefaultSearchFieldResult: {
          DefaultSearchField: PATTERN_DefaultSearchFieldStatus_blank,
        },
        ResponseMetadata: PATTERN_ResponseMetadata
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

  var defaultBaseHost = 'localhost:' + utils.testPort;

  test('Get, Action=CreateDomain', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
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
                Endpoint: domain.getDocumentsEndpoint(defaultBaseHost)
              },
              DomainId: domain.domainId,
              DomainName: domain.name,
              NumSearchableDocs: String(domain.searchableDocumentsCount),
              RequiresIndexDocuments: String(domain.requiresIndexDocuments),
              SearchInstanceCount: String(domain.searchInstanceCount),
              SearchPartitionCount: String(domain.searchPartitionCount),
              SearchService: {
                Endpoint: domain.getSearchEndpoint(defaultBaseHost)
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

  suite('auto detection of the base hostname and port', function() {
    var temporaryDatabase;
    var context;
    var server;

    setup(function() {
      temporaryDatabase = utils.createTemporaryDatabase();
      context = temporaryDatabase.get();
    });

    teardown(function() {
      if (server) server.close();
      temporaryDatabase.teardown();
      temporaryDatabase = undefined;
    });

    function assertBaseHost(baseHost, response) {
      response = toParsedResponse(response);
      assert.deepEqual(response.pattern,
                       { statusCode: 200,
                         body: PATTERN_CreateDomainResponse });
      var domain = new Domain('companies', context);
      var status = response.body.CreateDomainResponse.CreateDomainResult.DomainStatus;
      assert.deepEqual(
        { documentsEndpoint: status.DocService.Endpoint,
          searchEndpoint:    status.SearchService.Endpoint },
        { documentsEndpoint: domain.getDocumentsEndpoint(baseHost),
          searchEndpoint:    domain.getSearchEndpoint(baseHost) }
      );
    }

    test('specified by server option', function(done) {
      var baseHost = 'by.server.option';
      server = utils.setupServer(context, { baseHost: baseHost });
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertBaseHost(baseHost, response);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('specified by Host header', function(done) {
      var baseHost = 'by.host.header';
      server = utils.setupServer(context);
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
          'Host': baseHost
        })
        .next(function(response) {
          assertBaseHost(baseHost, response);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('specified by HTTP_X_FORWARDED_HOST header', function(done) {
      var baseHost = 'by.forwarded.host.header';
      server = utils.setupServer(context);
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
          'HTTP_X_FORWARDED_HOST': baseHost
        })
        .next(function(response) {
          assertBaseHost(baseHost, response);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('HTTP_X_FORWARDED_HOST and Host header', function(done) {
      var baseHost =          'by.host.header';
      var baseHostForwarded = 'by.forwarded.host.header';
      server = utils.setupServer(context);
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
          'Host': baseHost,
          'HTTP_X_FORWARDED_HOST': baseHostForwarded
        })
        .next(function(response) {
          assertBaseHost(baseHostForwarded, response);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('HTTP_X_FORWARDED_HOST, Host header, and server option', function(done) {
      var baseHostByOption =  'by.server.option';
      var baseHost =          'by.host.header';
      var baseHostForwarded = 'by.forwarded.host.header';
      server = utils.setupServer(context, { baseHost: baseHostByOption });
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
          'Host': baseHost,
          'HTTP_X_FORWARDED_HOST': baseHostForwarded
        })
        .next(function(response) {
          assertBaseHost(baseHostByOption, response);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });
  });

  test('Get, Action=DeleteDomain', function(done) {
    var domain;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        assert.isTrue(domain.exists());
      })
      .get('/?DomainName=companies&Action=DeleteDomain&Version=2011-02-01')
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
                Endpoint: domain.getDocumentsEndpoint(defaultBaseHost)
              },
              DomainId: domain.domainId,
              DomainName: domain.name,
              NumSearchableDocs: String(domain.searchableDocumentsCount),
              RequiresIndexDocuments: String(domain.requiresIndexDocuments),
              SearchInstanceCount: String(domain.searchInstanceCount),
              SearchPartitionCount: String(domain.searchPartitionCount),
              SearchService: {
                Endpoint: domain.getSearchEndpoint(defaultBaseHost)
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

  function getActualDescribedDomains(response) {
    var members = response.body.DescribeDomainsResponse
                               .DescribeDomainsResult
                               .DomainStatusList
                               .member;
    var domains = [];
    for (var i in members) {
      if (members.hasOwnProperty(i))
        domains.push(members[i].DomainName);
    }
    return domains;
  }

  test('Get, Action=DescribeDomains (all domains)', function(done) {
    var domain;
    utils
      .get('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
      .get('/?Action=DescribeDomains&Version=2011-02-01')
      .next(function(response) {
        response = toParsedResponse(response);
        var expectedDomains = ['domain1', 'domain2', 'domain3'];
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeDomainsResponse(expectedDomains) });

        var actualDomains = getActualDescribedDomains(response);
        assert.deepEqual(actualDomains, expectedDomains);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DescribeDomains (specified domains)', function(done) {
    utils
      .get('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
      .get('/?Action=DescribeDomains&Version=2011-02-01' +
             '&DomainNames.member.1=domain2' +
             '&DomainNames.member.2=domain1')
      .next(function(response) {
        response = toParsedResponse(response);
        var expectedDomains = ['domain2', 'domain1'];
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeDomainsResponse(expectedDomains) });

        var actualDomains = getActualDescribedDomains(response);
        assert.deepEqual(actualDomains, expectedDomains);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DefineIndexField (text, without options)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('name');
        assert.isTrue(field.exists(), response.body);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Text });
        var expectedOptions = {
              IndexFieldName: 'name',
              IndexFieldType: 'text',
              TextOptions: {
                DefaultValue: {},
                FacetEnabled: 'false',
                ResultEnabled: 'false'
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

  test('Get, Action=DefineIndexField (text, with options)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'TextOptions.FacetEnabled=true&TextOptions.ResultEnabled=true&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('name');
        assert.isTrue(field.exists(), response.body);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Text });
        var expectedOptions = {
              IndexFieldName: 'name',
              IndexFieldType: 'text',
              TextOptions: {
                DefaultValue: {},
                FacetEnabled: 'true',
                ResultEnabled: 'true'
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('age');
        assert.isTrue(field.exists(), response.body);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_UInt });
        var expectedOptions = {
              IndexFieldName: 'age',
              IndexFieldType: 'uint',
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

  test('Get, Action=DefineIndexField (literal, without options)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('product');
        assert.isTrue(field.exists(), response.body);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Literal });
        var expectedOptions = {
              IndexFieldName: 'product',
              IndexFieldType: 'literal',
              LiteralOptions: {
                DefaultValue: {},
                FacetEnabled: 'false',
                ResultEnabled: 'false',
                SearchEnabled: 'false'
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

  test('Get, Action=DefineIndexField (literal, with options)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'LiteralOptions.SearchEnabled=true&' +
           'LiteralOptions.FacetEnabled=true&' +
           'LiteralOptions.ResultEnabled=true&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function(response) {
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('product');
        assert.isTrue(field.exists(), response.body);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Literal });
        var expectedOptions = {
              IndexFieldName: 'product',
              IndexFieldType: 'literal',
              LiteralOptions: {
                DefaultValue: {},
                FacetEnabled: 'true',
                ResultEnabled: 'true',
                SearchEnabled: 'true'
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
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

  function getActualDescribedIndexFields(response) {
    var members = response.body.DescribeIndexFieldsResponse
                               .DescribeIndexFieldsResult
                               .IndexFields
                               .member;
    var domains = [];
    for (var i in members) {
      if (members.hasOwnProperty(i))
        domains.push(members[i].Options.IndexFieldName);
    }
    return domains;
  }

  test('Get, Action=DescribeIndexFields (all fields)', function(done) {
    var domain;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?Action=DescribeIndexFields&Version=2011-02-01' +
             '&DomainName=companies')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeIndexFieldsResponse([
                             PATTERN_IndexFieldStatus_UInt,
                             PATTERN_IndexFieldStatus_Text,
                             PATTERN_IndexFieldStatus_Literal
                           ]) });

        var expectedFields = ['age', 'name', 'product'];
        var actualFields = getActualDescribedIndexFields(response);
        assert.deepEqual(actualFields, expectedFields);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DescribeIndexFields (specified fields)', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'IndexField.IndexFieldType=text&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=age&' +
           'IndexField.IndexFieldType=uint&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
           'IndexField.IndexFieldType=literal&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?Action=DescribeIndexFields&Version=2011-02-01' +
             '&DomainName=companies' +
             '&FieldNames.member.1=name' +
             '&FieldNames.member.2=age')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeIndexFieldsResponse([
                             PATTERN_IndexFieldStatus_Text,
                             PATTERN_IndexFieldStatus_UInt
                           ]) });

        var expectedFields = ['name', 'age'];
        var actualFields = getActualDescribedIndexFields(response);
        assert.deepEqual(actualFields, expectedFields);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=IndexDocuments', function(done) {
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        assert.isFalse(domain.hasSynonymsTableSync());
      })
      .get('/?Version=2011-02-01&Action=UpdateSynonymOptions&' +
           'DomainName=companies&Synonyms='+synonyms)
      .next(function(response) {
        assert.isTrue(domain.hasSynonymsTableSync());

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
                dekkaido: ['hokkaido'],
                tokio: ['tokyo']
              }
            };
        assert.deepEqual(expectedSynonymOptions, synonymOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DescribeSynonymOptions', function(done) {
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
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?Version=2011-02-01&Action=DescribeSynonymOptions&' +
           'DomainName=companies')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeSynonymOptionsResponse });

        var synonymOptions = response.body.DescribeSynonymOptionsResponse
                                          .DescribeSynonymOptionsResult
                                          .Synonyms.Options;
        synonymOptions = JSON.parse(synonymOptions);
        var expectedSynonymOptions = {
              synonyms: {}
            };
        assert.deepEqual(expectedSynonymOptions, synonymOptions);
      })
      .get('/?Version=2011-02-01&Action=UpdateSynonymOptions&' +
           'DomainName=companies&Synonyms='+synonyms)
      .get('/?Version=2011-02-01&Action=DescribeSynonymOptions&' +
           'DomainName=companies')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeSynonymOptionsResponse });

        var synonymOptions = response.body.DescribeSynonymOptionsResponse
                                          .DescribeSynonymOptionsResult
                                          .Synonyms.Options;
        synonymOptions = JSON.parse(synonymOptions);
        var expectedSynonymOptions = {
              synonyms: {
                dekkaido: ['hokkaido'],
                tokio: ['tokyo']
              }
            };
        assert.deepEqual(expectedSynonymOptions, synonymOptions);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=UpdateDefaultSearchField', function(done) {
    var domain;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .next(function() {
        domain = new Domain('companies', context);
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      })
      .get('/?Version=2011-02-01&Action=UpdateDefaultSearchField&' +
           'DomainName=companies&DefaultSearchField=name')
      .next(function(response) {
        assert.equal(domain.defaultSearchField,
                     domain.getIndexField('name'));

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_UpdateDefaultSearchFieldResponse });

        var fieldName = response.body.UpdateDefaultSearchFieldResponse
                                     .UpdateDefaultSearchFieldResult
                                     .DefaultSearchField.Options;
        assert.deepEqual(fieldName, 'name');
      })
      .get('/?Version=2011-02-01&Action=UpdateDefaultSearchField&' +
           'DomainName=companies&DefaultSearchField=')
      .next(function(response) {
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_UpdateDefaultSearchFieldResponse_blank });

        var fieldName = response.body.UpdateDefaultSearchFieldResponse
                                     .UpdateDefaultSearchFieldResult
                                     .DefaultSearchField.Options;
        // xml2json converts the content of the empty element to a blank object, not a blank text.
        assert.deepEqual(fieldName, {});

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DescribeDefaultSearchField', function(done) {
    var domain;
    utils
      .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
      .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
           'Action=DefineIndexField&Version=2011-02-01')
      .get('/?Version=2011-02-01&Action=DescribeDefaultSearchField&' +
           'DomainName=companies')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeDefaultSearchFieldResponse_blank });

        var fieldName = response.body.DescribeDefaultSearchFieldResponse
                                     .DescribeDefaultSearchFieldResult
                                     .DefaultSearchField.Options;
        // xml2json converts the content of the empty element to a blank object, not a blank text.
        assert.deepEqual(fieldName, {});
      })
      .get('/?Version=2011-02-01&Action=UpdateDefaultSearchField&' +
           'DomainName=companies&DefaultSearchField=name')
      .get('/?Version=2011-02-01&Action=DescribeDefaultSearchField&' +
           'DomainName=companies')
      .next(function(response) {
        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DescribeDefaultSearchFieldResponse });

        var fieldName = response.body.DescribeDefaultSearchFieldResponse
                                     .DescribeDefaultSearchFieldResult
                                     .DefaultSearchField.Options;
        assert.deepEqual(fieldName, 'name');

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no version', function(done) {
    utils
      .get('/?Action=unknown')
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
      .get('/?Version=2011-02-02&Action=unknown')
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
