var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

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
var FAKE_DOMAIN_ID = '00000000000000000000000000';

suite('Configuration API', function() {
  var temporaryDatabase;
  var database;
  var server;

  setup(function() {
    temporaryDatabase = utils.createTemporaryDatabase();
    database = temporaryDatabase.get();
    server = utils.setupServer(database);
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
        var dump = database.commandSync('dump', {
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
                    '<CreateDomainResponse xmlns="' + XMLNS + '">' +
                      '<CreateDomainResult>' +
                        '<DomainStatus>' +
                          '<Created>true</Created>' +
                          '<Deleted>false</Deleted>' +
                          '<DocService>' +
                            '<Endpoint>doc-companies-00000000000000000000000000.localhost</Endpoint>' +
                          '</DocService>' +
                          '<DomainId>' + FAKE_DOMAIN_ID + '/companies</DomainId>' +
                          '<DomainName>companies</DomainName>' +
                          '<NumSearchableDocs>0</NumSearchableDocs>' +
                          '<RequiresIndexDocuments>false</RequiresIndexDocuments>' +
                          '<SearchInstanceCount>0</SearchInstanceCount>' +
                          '<SearchPartitionCount>0</SearchPartitionCount>' +
                          '<SearchService>' +
                            '<Endpoint>search-companies-00000000000000000000000000.localhost</Endpoint>' +
                          '</SearchService>' +
                        '</DomainStatus>' +
                      '</CreateDomainResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</CreateDomainResponse>'
            };
        assert.deepEqual(response, expected);

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
        var dump = database.commandSync('dump');
        var expected = '';
        assert.equal(dump, expected);

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DeleteDomainResponse xmlns="' + XMLNS + '">' +
                      '<DeleteDomainResult>' +
                        '<DomainStatus>' +
                          '<Created>false</Created>' +
                          '<Deleted>true</Deleted>' +
                          '<DocService>' +
                            '<Endpoint>doc-companies-00000000000000000000000000.localhost</Endpoint>' +
                          '</DocService>' +
                          '<DomainId>' + FAKE_DOMAIN_ID + '/companies</DomainId>' +
                          '<DomainName>companies</DomainName>' +
                          '<NumSearchableDocs>0</NumSearchableDocs>' +
                          '<RequiresIndexDocuments>false</RequiresIndexDocuments>' +
                          '<SearchInstanceCount>0</SearchInstanceCount>' +
                          '<SearchPartitionCount>0</SearchPartitionCount>' +
                          '<SearchService>' +
                            '<Endpoint>search-companies-00000000000000000000000000.localhost</Endpoint>' +
                          '</SearchService>' +
                        '</DomainStatus>' +
                      '</DeleteDomainResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DeleteDomainResponse>'
            };
        assert.deepEqual(response, expected);

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
        var dump = database.commandSync('dump', {
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

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DefineIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DefineIndexFieldResult>' +
                        '<IndexField>' +
                          '<Options>' +
                            '<IndexFieldName>name</IndexFieldName>' +
                            '<IndexFieldType>text</IndexFieldType>' +
                            '<TextOptions>' +
                              '<DefaultValue/>' +
                              '<FacetEnabled>false</FacetEnabled>' +
                              '<ResultEnabled>true</ResultEnabled>' +
                            '</TextOptions>' +
                          '</Options>' +
                          '<Status>' +
                            '<CreationDate>1970-01-01T00:00:00Z</CreationDate>' +
                            '<State>RequiresIndexDocuments</State>' +
                            '<UpdateDate>1970-01-01T00:00:00Z</UpdateDate>' +
                            '<UpdateVersion>0</UpdateVersion>' +
                          '</Status>' +
                        '</IndexField>' +
                      '</DefineIndexFieldResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DefineIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
                      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                               '1970-01-01T00:00:00Z')
            };
        assert.deepEqual(actual, expected);

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
        var dump = database.commandSync('dump', {
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

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DefineIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DefineIndexFieldResult>' +
                        '<IndexField>' +
                          '<Options>' +
                            '<IndexFieldName>age</IndexFieldName>' +
                            '<IndexFieldType>uint</IndexFieldType>' +
                            '<UIntOptions>' +
                              '<DefaultValue/>' +
                            '</UIntOptions>' +
                          '</Options>' +
                          '<Status>' +
                            '<CreationDate>1970-01-01T00:00:00Z</CreationDate>' +
                            '<State>RequiresIndexDocuments</State>' +
                            '<UpdateDate>1970-01-01T00:00:00Z</UpdateDate>' +
                            '<UpdateVersion>0</UpdateVersion>' +
                          '</Status>' +
                        '</IndexField>' +
                      '</DefineIndexFieldResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DefineIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
                      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                               '1970-01-01T00:00:00Z')
            };
        assert.deepEqual(actual, expected);

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
        var dump = database.commandSync('dump', {
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

        var expected = {
              statusCode: 200,
              body: '<?xml version="1.0"?>\n' +
                    '<DefineIndexFieldResponse xmlns="' + XMLNS + '">' +
                      '<DefineIndexFieldResult>' +
                        '<IndexField>' +
                          '<Options>' +
                            '<IndexFieldName>member</IndexFieldName>' +
                            '<IndexFieldType>literal</IndexFieldType>' +
                            '<LiteralOptions>' +
                              '<DefaultValue/>' +
                              '<FacetEnabled>false</FacetEnabled>' +
                              '<ResultEnabled>false</ResultEnabled>' +
                              '<SearchEnabled>false</SearchEnabled>' +
                            '</LiteralOptions>' +
                          '</Options>' +
                          '<Status>' +
                            '<CreationDate>1970-01-01T00:00:00Z</CreationDate>' +
                            '<State>RequiresIndexDocuments</State>' +
                            '<UpdateDate>1970-01-01T00:00:00Z</UpdateDate>' +
                            '<UpdateVersion>0</UpdateVersion>' +
                          '</Status>' +
                        '</IndexField>' +
                      '</DefineIndexFieldResult>' +
                      '<ResponseMetadata>' +
                        '<RequestId></RequestId>' +
                      '</ResponseMetadata>' +
                    '</DefineIndexFieldResponse>'
            };
        var actual = {
              statusCode: response.statusCode,
              body: response.body
                      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                               '1970-01-01T00:00:00Z')
            };
        assert.deepEqual(actual, expected);

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
        var dump = database.commandSync('dump', {
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
        var dump = database.commandSync('dump', {
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
        var dump = database.commandSync('dump', {
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
        var dump = database.commandSync('dump', {
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
        dekkaido: ["hokkaido"]
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
              '<Options>{&quot;synonyms&quot;:{&quot;tokio&quot;:[&quot;tokyo&quot;],&quot;dekkaido&quot;:[&quot;hokkaido&quot;]}}</Options>' +
            '</Synonyms>' +
          '</UpdateSynonymOptionsResult>' +
          '<ResponseMetadata>' +
            '<RequestId></RequestId>' +
          '</ResponseMetadata>' +
        '</UpdateSynonymOptionsResponse>';

        assert.match(response.body, /^<UpdateSynonymOptionsResponse xmlns=/);
        assert.equal(response.body
                      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                               '1970-01-01T00:00:00Z'),
                    bodyExpected);
        var dumpExpected =
             'table_create companies_synonyms TABLE_HASH_KEY|KEY_NORMALIZE ShortText\n' +
             'column_create companies_synonyms synonyms COLUMN_VECTOR ShortText\n' +
             'load --table companies_synonyms\n' +
             '[\n' +
             '["_key","synonyms"],\n' +
             '["tokio",["tokyo"]],\n' +
             '["dekkaido",["hokkaido"]]\n' +
             ']';
        var dumpActual = database.commandSync('dump', {
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
