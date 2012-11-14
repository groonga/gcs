var utils = require('./test-utils');
var xmlResponses = require('./xml-responses');
var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Domain = require('../lib/database').Domain;
var ScenarioRunner = require('../tools/scenario-runner').ScenarioRunner;
var ScenarioResponse = require('../tools/scenario-runner').Response;

suite('Configuration API', function() {
  var temporaryDatabase;
  var context;
  var server;

  function commonSetup() {
    temporaryDatabase = utils.createTemporaryDatabase();
    context = temporaryDatabase.get();
    server = utils.setupServer(context);
  }

  function commonTeardown() {
    server.close();
    temporaryDatabase.teardown();
    temporaryDatabase = undefined;
  }

  var defaultBaseHost = 'localhost:' + utils.testPort;

  function assertDomainCreatedResponse(response, domainName) {
    var domain = new Domain(domainName, context);
    assert.isTrue(domain.exists());

    response = xmlResponses.toParsedResponse(response);
    assert.deepEqual(response.pattern,
                     { statusCode: 200,
                       body: xmlResponses.CreateDomainResponse });
    var expectedStatus = {
          Created: 'true',
          Deleted: 'false',
          DocService: {
            Endpoint: domain.getDocumentsEndpoint(defaultBaseHost),
            Arn: domain.documentsArn
          },
          DomainId: domain.domainId,
          DomainName: domain.name,
          NumSearchableDocs: String(domain.searchableDocumentsCount),
          RequiresIndexDocuments: String(domain.requiresIndexDocuments),
          SearchInstanceCount: String(domain.searchInstanceCount),
          SearchPartitionCount: String(domain.searchPartitionCount),
          SearchService: {
            Endpoint: domain.getSearchEndpoint(defaultBaseHost),
            Arn: domain.searchArn
          }
        };
    var status = response.body.CreateDomainResponse.CreateDomainResult.DomainStatus;
    assert.deepEqual(status, expectedStatus);
  }

  function assertValidationErrorResponse(expectedMessage, response) {
    response = xmlResponses.toParsedResponse(response);
    assert.deepEqual(response.pattern,
                     { statusCode: 400,
                       body: xmlResponses.TYPED_ERROR_RESPONSE });
    var expectedError = {
          Type: 'Sender',
          Code: 'ValidationError',
          Message: expectedMessage
        };
    assert.deepEqual(response.body.Response.Errors.Error, expectedError);
  }

  var TOO_SHORT_1_LETTER_DOMAIN_NAME = 'a';
  var TOO_SHORT_1_LETTER_DOMAIN_NAME_ERROR_MESSAGE =
        '2 validation errors detected: ' +
          'Value \'' + TOO_SHORT_1_LETTER_DOMAIN_NAME + '\' at \'domainName\' ' +
            'failed to satisfy constraint: ' +
            'Member must satisfy regular expression pattern: ' +
              Domain.VALID_NAME_PATTERN + '; ' +
          'Value \'' + TOO_SHORT_1_LETTER_DOMAIN_NAME + '\' at \'domainName\' ' +
            'failed to satisfy constraint: ' +
            'Member must have length greater than or equal to ' +
              Domain.MINIMUM_NAME_LENGTH;

  var TOO_SHORT_2_LETTERS_DOMAIN_NAME = 'ab';
  var TOO_SHORT_2_LETTERS_DOMAIN_NAME_ERROR_MESSAGE =
        '1 validation error detected: ' +
          'Value \'' + TOO_SHORT_2_LETTERS_DOMAIN_NAME + '\' at \'domainName\' ' +
            'failed to satisfy constraint: ' +
            'Member must have length greater than or equal to ' +
              Domain.MINIMUM_NAME_LENGTH;

  var TOO_LONG_DOMAIN_NAME = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var TOO_LONG_DOMAIN_NAME_ERROR_MESSAGE =
        '1 validation error detected: ' +
          'Value \'' + TOO_LONG_DOMAIN_NAME + '\' at \'domainName\' failed ' +
            'to satisfy constraint: ' +
            'Member must have length less than or equal to ' +
              Domain.MAXIMUM_NAME_LENGTH;

  var NO_DOMAIN_NAME_ERROR_MESSAGE =
        '2 validation errors detected: ' +
          'Value \'\' at \'domainName\' failed to satisfy constraint: ' +
            'Member must satisfy regular expression pattern: ' +
              Domain.VALID_NAME_PATTERN + '; ' +
          'Value \'\' at \'domainName\' failed to satisfy constraint: ' +
            'Member must have length greater than or equal to ' +
              Domain.MINIMUM_NAME_LENGTH;

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

  function assertDomainsReturned(response, expectedDomains) {
    response = xmlResponses.toParsedResponse(response);
    assert.deepEqual(response.pattern,
                     { statusCode: 200,
                       body: xmlResponses.DescribeDomainsResponse(expectedDomains) });

    var actualDomains = getActualDescribedDomains(response);
    assert.deepEqual(actualDomains, expectedDomains);
  }

  suite('domain operations', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('Action=CreateDomain', function(done) {
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertDomainCreatedResponse(response, 'companies');
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('multiple Action=CreateDomain requests for the same domain', function(done) {
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertDomainCreatedResponse(response, 'companies');
          done();
        }).error(function(error) {
          done(error)
        });
    });

    test('Action=CreateDomain with too short (one character) domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_1_LETTER_DOMAIN_NAME + '&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_1_LETTER_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=CreateDomain with too short (two characters) domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_2_LETTERS_DOMAIN_NAME + '&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_2_LETTERS_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=CreateDomain with too long domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_LONG_DOMAIN_NAME + '&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_LONG_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=CreateDomain without domain name', function(done) {
      utils
        .get('/?DomainName=&Action=CreateDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            NO_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain', function(done) {
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
                  Endpoint: domain.getDocumentsEndpoint(defaultBaseHost),
                  Arn: domain.documentsArn
                },
                DomainId: domain.domainId,
                DomainName: domain.name,
                NumSearchableDocs: String(domain.searchableDocumentsCount),
                RequiresIndexDocuments: String(domain.requiresIndexDocuments),
                SearchInstanceCount: String(domain.searchInstanceCount),
                SearchPartitionCount: String(domain.searchPartitionCount),
                SearchService: {
                  Endpoint: domain.getSearchEndpoint(defaultBaseHost),
                  Arn: domain.searchArn
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

    test('Action=DeleteDomain for unexisting domain', function(done) {
      var domain = new Domain('companies', context);
      assert.isFalse(domain.exists());
      utils
        .get('/?DomainName=companies&Action=DeleteDomain&Version=2011-02-01')
        .next(function(response) {
          response = xmlResponses.toParsedResponse(response);
          assert.deepEqual(response.pattern,
                           { statusCode: 200,
                             body: xmlResponses.DeleteDomainResponse_UnexistingDomain });
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for too short (one character) domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_1_LETTER_DOMAIN_NAME + '&Action=DeleteDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_1_LETTER_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for too short (two characters) domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_2_LETTERS_DOMAIN_NAME + '&Action=DeleteDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_2_LETTERS_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for too long domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_LONG_DOMAIN_NAME + '&Action=DeleteDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_LONG_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for without name', function(done) {
      utils
        .get('/?DomainName=&Action=DeleteDomain&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            NO_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (all domains)', function(done) {
      utils
        .get('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
        .get('/?Action=DescribeDomains&Version=2011-02-01')
        .next(function(response) {
          assertDomainsReturned(response, ['domain1', 'domain2', 'domain3']);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (all domains, via POST)', function(done) {
      utils
        .post('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
        .post('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
        .post('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
        .post('/?Action=DescribeDomains&Version=2011-02-01')
        .next(function(response) {
          assertDomainsReturned(response, ['domain1', 'domain2', 'domain3']);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (specified domains)', function(done) {
      utils
        .get('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=domain2' +
               '&DomainNames.member.2=domain1')
        .next(function(response) {
          assertDomainsReturned(response, ['domain2', 'domain1']);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (not existing domain)', function(done) {
      utils
        .get('/?DomainName=domain3&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=domain2&Action=CreateDomain&Version=2011-02-01')
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=unknown')
        .next(function(response) {
          assertDomainsReturned(response, []);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (too short name)', function(done) {
      utils
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=a')
        .next(function(response) {
          assertDomainsReturned(response, []);
        })
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=a' +
               '&DomainNames.member.2=b')
        .next(function(response) {
          assertDomainsReturned(response, []);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (too long name)', function(done) {
      utils
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=abcdefghijklmnopqrstuvwxyz0123456789')
        .next(function(response) {
          assertDomainsReturned(response, []);
        })
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=abcdefghijklmnopqrstuvwxyz0123456789' +
               '&DomainNames.member.2=abcdefghijklmnopqrstuvwxyz01234567890')
        .next(function(response) {
          assertDomainsReturned(response, []);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (invalid character)', function(done) {
      utils
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=@_@')
        .next(function(response) {
          assertDomainsReturned(response, []);
        })
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=@_@' +
               '&DomainNames.member.2=@-@')
        .next(function(response) {
          assertDomainsReturned(response, []);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains (same domain)', function(done) {
      utils
        .get('/?DomainName=domain1&Action=CreateDomain&Version=2011-02-01')
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=domain1' +
               '&DomainNames.member.2=domain1')
        .next(function(response) {
          assertDomainsReturned(response, ['domain1', 'domain1']);
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DescribeDomains: NumSearchableDocs', function(done) {
      utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');
      utils.loadDumpFile(context, __dirname + '/fixture/companies/configurations.grn');
      utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');

      utils
        .get('/?Action=DescribeDomains&Version=2011-02-01' +
               '&DomainNames.member.1=companies')
        .next(function(response) {
          response = xmlResponses.toParsedResponse(response);
          var recordsCount = response.body.DescribeDomainsResponse
                                          .DescribeDomainsResult
                                          .DomainStatusList
                                          .member
                                          .NumSearchableDocs;
          assert.equal(recordsCount, '10');

          done();
        })
        .error(function(error) {
          done(error);
        });
    });
  });

  suite('auto detection of the base hostname and port', function() {
    setup(function() {
      temporaryDatabase = utils.createTemporaryDatabase();
      context = temporaryDatabase.get();
    });

    teardown(commonTeardown);

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

  suite('Action=DefineIndexField', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('(text, without options)', function(done) {
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

    test('(text, with options)', function(done) {
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=companies&IndexField.IndexFieldName=name&' +
             'IndexField.IndexFieldType=text&' +
             'IndexField.TextOptions.FacetEnabled=true&' +
             'IndexField.TextOptions.ResultEnabled=true&' +
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

    test('(uint)', function(done) {
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

    test('(literal, without options)', function(done) {
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

    test('(literal, with options)', function(done) {
      utils
        .get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01')
        .get('/?DomainName=companies&IndexField.IndexFieldName=product&' +
             'IndexField.IndexFieldType=literal&' +
             'IndexField.LiteralOptions.SearchEnabled=true&' +
             'IndexField.LiteralOptions.FacetEnabled=true&' +
             'IndexField.LiteralOptions.ResultEnabled=true&' +
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

    test('(with too short (one character) domain name)', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_1_LETTER_DOMAIN_NAME + '&IndexField.IndexFieldName=product&' +
             'IndexField.IndexFieldType=literal&' +
             'Action=DefineIndexField&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_1_LETTER_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for too short (two characters) domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_SHORT_2_LETTERS_DOMAIN_NAME + '&IndexField.IndexFieldName=product&' +
             'IndexField.IndexFieldType=literal&' +
             'Action=DefineIndexField&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_SHORT_2_LETTERS_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for too long domain name', function(done) {
      utils
        .get('/?DomainName=' + TOO_LONG_DOMAIN_NAME + '&IndexField.IndexFieldName=product&' +
             'IndexField.IndexFieldType=literal&' +
             'Action=DefineIndexField&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            TOO_LONG_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('Action=DeleteDomain for without name', function(done) {
      utils
        .get('/?DomainName=&IndexField.IndexFieldName=product&' +
             'IndexField.IndexFieldType=literal&' +
             'Action=DefineIndexField&Version=2011-02-01')
        .next(function(response) {
          assertValidationErrorResponse(
            NO_DOMAIN_NAME_ERROR_MESSAGE,
            response
          );
          done();
        })
        .error(function(error) {
          done(error);
        });
    });
  });

  suite('Action=DeleteIndexField', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('(text)', function(done) {
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

    test('(uint)', function(done) {
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

    test('(literal)', function(done) {
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
  });

  suite('Action=DescribeIndexFields', function() {
    setup(function() {
      commonSetup();
      var domain = new Domain('companies', context);
      domain.createSync();
      domain.getIndexField('name').setType('text').createSync();
      domain.getIndexField('age').setType('uint').createSync();
      domain.getIndexField('product').setType('literal').createSync();
    });
    teardown(commonTeardown);

    function getActualDescribedFields(response) {
      var members = response.body.DescribeIndexFieldsResponse
                                 .DescribeIndexFieldsResult
                                 .IndexFields
                                 .member;
      var fields = [];
      for (var i in members) {
        if (members.hasOwnProperty(i))
          fields.push(members[i].Options.IndexFieldName);
      }
      return fields;
    }

    test('all', function(done) {
      utils
        .get('/?DomainName=companies&' +
             'Action=DescribeIndexFields&Version=2011-02-01')
        .next(function(response) {
          var expectedFields = ['age', 'name', 'product'];
          response = xmlResponses.toParsedResponse(response);
          assert.deepEqual(response.pattern,
                           { statusCode: 200,
                             body: xmlResponses.DescribeIndexFieldsResponse([
                               xmlResponses.IndexFieldStatus_UInt,
                               xmlResponses.IndexFieldStatus_Text,
                               xmlResponses.IndexFieldStatus_Literal
                             ]) });

          var actualFields = getActualDescribedFields(response);
          assert.deepEqual(actualFields, expectedFields);

          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('specified', function(done) {
      utils
        .get('/?DomainName=companies&FieldNames.member.1=name&FieldNames.member.2=age&' +
             'Action=DescribeIndexFields&Version=2011-02-01')
        .next(function(response) {
          var expectedFields = ['name', 'age'];
          response = xmlResponses.toParsedResponse(response);
          assert.deepEqual(response.pattern,
                           { statusCode: 200,
                             body: xmlResponses.DescribeIndexFieldsResponse([
                               xmlResponses.IndexFieldStatus_Text,
                               xmlResponses.IndexFieldStatus_UInt
                             ]) });

          var actualFields = getActualDescribedFields(response);
          assert.deepEqual(actualFields, expectedFields);

          done();
        })
        .error(function(error) {
          done(error);
        });
    });

    test('specified (not exists)', function(done) {
      utils
        .get('/?DomainName=companies&FieldNames.member.1=unknown&' +
             'Action=DescribeIndexFields&Version=2011-02-01')
        .next(function(response) {
          var expectedFields = [];
          response = xmlResponses.toParsedResponse(response);
          assert.deepEqual(response.pattern,
                           { statusCode: 200,
                             body: xmlResponses.DescribeIndexFieldsResponse([]) });

          var actualFields = getActualDescribedFields(response);
          assert.deepEqual(actualFields, expectedFields);

          done();
        })
        .error(function(error) {
          done(error);
        });
    });
  });

  suite('domain options', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('Action=UpdateSynonymOptions', function(done) {
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

    test('Action=DescribeSynonymOptions', function(done) {
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

    test('Action=UpdateDefaultSearchField', function(done) {
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

    test('Action=DescribeDefaultSearchField', function(done) {
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
  });

  suite('misc actions', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('Action=IndexDocuments', function(done) {
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
  });

  suite('invalid accesses', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    test('invalid version', function(done) {
      utils
        .get('/?Version=2011-02-02&Action=unknown')
        .next(function(response) {
          response = xmlResponses.toParsedResponse(response);
          assert.deepEqual(response.pattern,
                           { statusCode: 400,
                             body: xmlResponses.TYPED_ERROR_RESPONSE });

          var expectedError = {
                Type: 'Sender',
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

/*
  suite('responses', function() {
    setup(commonSetup);
    teardown(commonTeardown);

    var scenariosDir = path.join(__dirname, 'scenarios/configuration');
    var expectedResponsesBaseDir = path.join(__dirname, 'response/configuration');
    var scenarioFiles = fs.readdirSync(scenariosDir);
    scenarioFiles.filter(function(name) {
      return /\.json$/i.test(name);
    }).map(function(scenarioFileName) {
      var file = path.resolve(scenariosDir, scenarioFileName);
      var requests = fs.readFileSync(file);
      requests = JSON.parse(requests);

      var scenarioName = scenarioFileName.replace(/\.json$/, '');

      var setupRequests = requests.filter(function(request) {
            return request.name.indexOf('setup:') == 0;
          });
      var teardownRequests = requests.filter(function(request) {
            return request.name.indexOf('teardown:') == 0;
          });

      var fileNames = {};
      requests.forEach(function(request, index) {
        var fileName = ScenarioRunner.toSafeName(request.name);
        var count = 1;
        while (fileName in fileNames) {
          fileName = request.name + count++;
        }
        request.fileName = fileName + '.txt';

        if (request.name.indexOf('setup:') == 0 ||
            request.name.indexOf('teardown:') == 0)
          return;

        test(scenarioName + ': ' + request.name, function(done) {
          var scenario = {
                requests: setupRequests
                            .concat([request])
                            .concat(teardownRequests)
                            .map(function(request) {
                              return Object.create(request);
                            })
              };
          var runner = new ScenarioRunner({
                accessKeyId: 'dummy-access-key-id',
                secretAccessKey: 'dummy-access-key',
                host: 'localhost',
                port: utils.testPort
              });
          var expectedResponsesDir = path.join(expectedResponsesBaseDir, scenarioName);
          runner.on('end', function(event) {
            try {
              scenario.requests.forEach(function(request) {
                var expected = path.join(expectedResponsesDir, request.fileName);
                expected = fs.readFileSync(expected).toString();
                expected = new ScenarioResponse(expected);
                var actual = new ScenarioResponse(request.response);
                assert.deepEqual(expected.bodyNormalizedJSON,
                                 actual.bodyNormalizedJSON);
              });
              done();
            } catch(error) {
              done(error);
            }
          });
          runner.on('error:fatal', function(error) {
            done(error);
          });
          runner.on('error:status_unknown', function(error) {
            done(error);
          });
          runner.run(scenario);
        });
      });
    });
  });
*/
});
