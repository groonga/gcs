var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var Domain = require('../lib/database').Domain;

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
      TextOptions: PATTERN_UIntOptions
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
      DefaultValue: {}
    };
var PATTERN_IndexField_Literal = {
      IndexFieldName: '',
      IndexFieldType: '',
      TextOptions: PATTERN_LiteralOptions
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
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expectedDump = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                           'table_create companies_BigramTerms ' +
                             'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                             '--default_tokenizer TokenBigram';
        assert.equal(dump, expectedDump);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_CreateDomainResponse });
        var expectedStatus = {
              Created: 'true',
              Deleted: 'false',
              DocService: {
                Endpoint: 'doc-companies-' + Domain.FAKE_DOMAIN_ID + '.localhost'
              },
              DomainId: Domain.FAKE_DOMAIN_ID + '/companies',
              DomainName: 'companies',
              NumSearchableDocs: '0',
              RequiresIndexDocuments: 'false',
              SearchInstanceCount: '0',
              SearchPartitionCount: '0',
              SearchService: {
                Endpoint: 'search-companies-' + Domain.FAKE_DOMAIN_ID + '.localhost'
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
    utils.get('/?DomainName=companies&Action=CreateDomain&Version=2011-02-01', {
                'Host': 'cloudsearch.localhost'
              })
      .next(function() {
        var path = '/?DomainName=companies&Action=DeleteDomain&Version=2011-02-01';
        return utils.get(path, {
                 'Host': 'cloudsearch.localhost'
               });
      })
      .next(function(response) {
        var dump = context.commandSync('dump');
        var expectedDump = '';
        assert.equal(dump, expectedDump);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DeleteDomainResponse });
        var expectedStatus = {
              Created: 'false',
              Deleted: 'true',
              DocService: {
                Endpoint: 'doc-companies-' + Domain.FAKE_DOMAIN_ID + '.localhost'
              },
              DomainId: Domain.FAKE_DOMAIN_ID + '/companies',
              DomainName: 'companies',
              NumSearchableDocs: '0',
              RequiresIndexDocuments: 'false',
              SearchInstanceCount: '0',
              SearchPartitionCount: '0',
              SearchService: {
                Endpoint: 'search-companies-' + Domain.FAKE_DOMAIN_ID + '.localhost'
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
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=name&' +
                   'IndexField.IndexFieldType=text&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'column_create companies name COLUMN_SCALAR ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'column_create companies_BigramTerms companies_name ' +
                         'COLUMN_INDEX|WITH_POSITION companies name';
        assert.equal(dump, expected);

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
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=age&' +
                   'IndexField.IndexFieldType=uint&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'column_create companies age COLUMN_SCALAR UInt32\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create companies_age ' +
                         'TABLE_HASH_KEY UInt32\n' +
                       'column_create companies_age companies_age ' +
                         'COLUMN_INDEX|WITH_POSITION companies age';
        assert.equal(dump, expected);

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

  test('Get, Action=DefineIndexField (literal)', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=member&' +
                   'IndexField.IndexFieldType=literal&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create companies_member ' +
                         'TABLE_HASH_KEY ShortText\n' +
                       'column_create companies_member companies_member ' +
                         'COLUMN_INDEX|WITH_POSITION companies member\n' +
                       'column_create companies member COLUMN_SCALAR companies_member';
        assert.equal(dump, expected);

        response = toParsedResponse(response);
        assert.deepEqual(response.pattern,
                         { statusCode: 200,
                           body: PATTERN_DefineIndexFieldResponse_Literal });
        var expectedOptions = {
              IndexFieldName: 'member',
              IndexFieldType: 'literal',
              UIntOptions: {
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

  test('Get, Action=DeleteIndexField (text)', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=name&' +
                   'IndexField.IndexFieldType=text&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexFieldName=name&' +
                   'Action=DeleteIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram';
        assert.equal(dump, expected);

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DeleteIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DeleteIndexFieldResult/>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DeleteIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
            };
        assert.deepEqual(actual, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteIndexField (uint)', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=age&' +
                   'IndexField.IndexFieldType=uint&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexFieldName=age&' +
                   'Action=DeleteIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram';
        assert.equal(dump, expected);

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DeleteIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DeleteIndexFieldResult/>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DeleteIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
            };
        assert.deepEqual(actual, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=DeleteIndexField (literal)', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=member&' +
                   'IndexField.IndexFieldType=literal&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexFieldName=member&' +
                   'Action=DeleteIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram';
        assert.equal(dump, expected);

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DeleteIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DeleteIndexFieldResult/>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DeleteIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
            };
        assert.deepEqual(actual, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=IndexDocuments', function(done) {
    var path = '/?DomainName=companies&Action=CreateDomain&Version=2011-02-01';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=name&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var path = '/?DomainName=companies&IndexField.IndexFieldName=age&' +
                   'IndexField.IndexFieldType=uint&' +
                   'Action=DefineIndexField&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var path = '/?DomainName=companies&' +
                   'Action=IndexDocuments&Version=2011-02-01';
        return utils.get(path);
      })
      .next(function(response) {
        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create companies TABLE_HASH_KEY ShortText\n' +
                       'column_create companies age COLUMN_SCALAR UInt32\n' +
                       'column_create companies name COLUMN_SCALAR ShortText\n' +
                       'table_create companies_BigramTerms ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create companies_age TABLE_HASH_KEY UInt32\n' +
                       'column_create companies_age companies_age ' +
                         'COLUMN_INDEX|WITH_POSITION companies age\n' +
                       'column_create companies_BigramTerms companies_name ' +
                         'COLUMN_INDEX|WITH_POSITION companies name';
        assert.equal(dump, expected);

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<IndexDocumentsResponse xmlns="' + XMLNS + '">' +
                      '<IndexDocumentsResult>' +
                        '<FieldNames>' +
                          '<member>age</member>' +
                          '<member>name</member>' +
                        '</FieldNames>' +
                      '</IndexDocumentsResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</IndexDocumentsResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
            };
        assert.deepEqual(actual, expected);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, Action=UpdateSynonymOptions', function(done) {
    var synonymsObject = {
      synonyms: {
        tokio: ["tokyo"],
        dekkaido: "hokkaido"
      }
    };
    var json = JSON.stringify(synonymsObject);
    var synonyms = encodeURIComponent(json);
    var path = '/?Version=2011-02-01&Action=UpdateSynonymOptions&DomainName=companies&Synonyms='+synonyms;
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        assert.equal(response.statusCode, 200);
        var bodyExpected =
        '<UpdateSynonymOptionsResponse xmlns="http://cloudsearch.amazonaws.com/doc/2011-02-01">' +
          '<UpdateSynonymOptionsResult>' +
            '<Synonyms>' +
              '<Status>' +
                '<CreationDate>1970-01-01T00:00:00Z</CreationDate>' +
                '<UpdateVersion>0</UpdateVersion>' +
                '<State>RequiresIndexDocuments</State>' +
                '<UpdateDate>1970-01-01T00:00:00Z</UpdateDate>' +
              '</Status>' +
              '<Options>{&quot;synonyms&quot;:{&quot;tokio&quot;:[&quot;tokyo&quot;],&quot;dekkaido&quot;:&quot;hokkaido&quot;}}</Options>' +
            '</Synonyms>' +
          '</UpdateSynonymOptionsResult>' +
          '<ResponseMetadata>' +
            '<RequestId></RequestId>' +
          '</ResponseMetadata>' +
        '</UpdateSynonymOptionsResponse>';

        assert.equal(replaceXMLDates(response.body), bodyExpected);
        var dumpExpected =
             'table_create companies_synonyms TABLE_HASH_KEY|KEY_NORMALIZE ShortText\n' +
             'column_create companies_synonyms synonyms COLUMN_VECTOR ShortText\n' +
             'load --table companies_synonyms\n' +
             '[\n' +
             '["_key","synonyms"],\n' +
             '["tokio",["tokyo"]],\n' +
             '["dekkaido",["hokkaido"]]\n' +
             ']';
        var dumpActual = context.commandSync('dump', {
          tables: 'companies_synonyms'
        });
        assert.equal(dumpExpected, dumpActual);

        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, no version', function(done) {
    var path = '/?Action=unknown';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var message = 'An input parameter "Version" that is mandatory for ' +
                      'processing the request is not supplied.';;
        var expected = {
              statusCode: 400,
              body: createCommonErrorResponse('MissingParameter', message)
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('Get, invalid version', function(done) {
    var path = '/?Version=2011-02-02&Action=unknown';
    utils.get(path, {
                'Host': 'cloudsearch.localhost'
              })
      .next(function(response) {
        var message = 'A bad or out-of-range value "2011-02-02" was supplied ' +
                      'for the "Version" input parameter.';
        var expected = {
              statusCode: 400,
              body: createCommonErrorResponse('InvalidParameterValue', message)
            };
        assert.deepEqual(response, expected);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });
});
