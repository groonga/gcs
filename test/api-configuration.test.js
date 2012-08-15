var utils = require('./test-utils');
var xmlResponses = require('./xml-responses');
var assert = require('chai').assert;
var fs = require('fs');

var Domain = require('../lib/database').Domain;

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.CreateDomainResponse });
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
    function assertBaseHost(baseHost, response) {
      response = xmlResponses.toParsedResponse(response);
      assert.deepEqual(response.pattern,
                       { statusCode: 200,
                         body: xmlResponses.CreateDomainResponse });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DeleteDomainResponse });
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
        response = xmlResponses.toParsedResponse(response);
        var expectedDomains = ['domain1', 'domain2', 'domain3'];
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeDomainsResponse(expectedDomains) });

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
        response = xmlResponses.toParsedResponse(response);
        var expectedDomains = ['domain2', 'domain1'];
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeDomainsResponse(expectedDomains) });

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DefineIndexFieldResponse_Text });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DefineIndexFieldResponse_Text });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DefineIndexFieldResponse_UInt });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DefineIndexFieldResponse_Literal });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DefineIndexFieldResponse_Literal });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DeleteIndexFieldResponse });

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DeleteIndexFieldResponse });

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DeleteIndexFieldResponse });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeIndexFieldsResponse([
                             xmlResponses.IndexFieldStatus_UInt,
                             xmlResponses.IndexFieldStatus_Text,
                             xmlResponses.IndexFieldStatus_Literal
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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeIndexFieldsResponse([
                             xmlResponses.IndexFieldStatus_Text,
                             xmlResponses.IndexFieldStatus_UInt
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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.IndexDocumentsResponse(expectedFieldNames) });
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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.UpdateSynonymOptionsResponse });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeSynonymOptionsResponse });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeSynonymOptionsResponse });

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.UpdateDefaultSearchFieldResponse });

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

        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.UpdateDefaultSearchFieldResponse_blank });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeDefaultSearchFieldResponse_blank });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: xmlResponses.DescribeDefaultSearchFieldResponse });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 400,
                           body: xmlResponses.COMMON_ERROR_RESPONSE });

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
        response = xmlResponses.toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 400,
                           body: xmlResponses.COMMON_ERROR_RESPONSE });

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
