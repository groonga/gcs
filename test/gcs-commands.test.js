var utils = require('./test-utils');
var assert = require('chai').assert;
var path = require('path');
var fs = require('fs');

var Domain = require('../lib/database/domain').Domain;

var context;
var temporaryDatabase;
var server;

function commonSetup() {
  temporaryDatabase = utils.createTemporaryDatabase();
  context = temporaryDatabase.get();
  server = utils.setupServer(context);
}

function commonTeardown() {
  server.close();
  context = undefined;
  temporaryDatabase.clear();
  temporaryDatabase.teardown();
  temporaryDatabase = undefined;
}

function assertDomainNotSpecified(result) {
  assert.deepEqual({ code:    result.code,
                     message: result.output.stdout },
                   { code:    1,
                     message: 'You must specify the domain name.\n' },
                   result.output.stderr);
}

function assertDomainNotExist(result, domainName) {
  assert.deepEqual({ code:    result.code,
                     message: result.output.stdout },
                   { code:    1,
                     message: domainName + ' does not exist. You must specify an existing domain name.\n' },
                   result.output.stderr);
}

suite('gcs-create-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('create', function(done) {
    utils
      .run('gcs-create-domain',
           '--domain-name', 'test',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.equal(result.code, 0, result.output.stdout + '\n' + result.output.stderr);
        assert.include(result.output.stdout,
                       'Domain endpoints are currently being created.');

        context.reopen();
        var domain = new Domain('test', context);
        assert.isTrue(domain.exists());

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create again', function(done) {
    new Domain('test', context).createSync();
    utils
      .run('gcs-create-domain',
           '--domain-name', 'test',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'The domain [test] already exists.\n' },
                         result.output.stderr);

        context.reopen();
        var domains = Domain.getAll(context).map(function(domain) {
              return domain.name;
            });
        assert.deepEqual(domains, ['test']);

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('missing domain name', function(done) {
    utils
      .run('gcs-create-domain',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);

        context.reopen();
        assert.deepEqual(Domain.getAll(context), []);

        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-delete-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('delete force', function(done) {
    new Domain('test', context).createSync();
    utils
      .run('gcs-delete-domain',
           '--domain-name', 'test',
           '--force',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Domain [test] has been deleted successfully.\n' },
                         result.output.stderr);

        context.reopen();
        var domain = new Domain('test', context);
        assert.isFalse(domain.exists());

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('delete not-existing domain', function(done) {
    utils
      .run('gcs-delete-domain',
           '--domain-name', 'test',
           '--force',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotExist(result, 'test');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('delete without domain', function(done) {
    utils
      .run('gcs-delete-domain',
           '--force',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

function arnToEndpoint(arn, hostPort) {
  var match = arn.match(/^arn:aws:cs:[^:]+:([^:]+):([^\/]+)\/(.+)$/);
  var id = match[1];
  var type = match[2];
  var name = match[3];
  return type + '-' + name + '-' + id + '.' + hostPort;
}

suite('gcs-describe-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  var hostPort = '127.0.0.1.xip.io:' + utils.testPort;

  test('describe one', function(done) {
    var domain2 = new Domain('domain2', context).createSync();
    var domain1 = new Domain('domain1', context).createSync();
    var nameField = domain1.getIndexField('name').setType('text').createSync();
    var ageField = domain1.getIndexField('age').setType('uint').createSync();
    utils
      .run('gcs-describe-domain',
           '--domain-name', 'domain1',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        var domain = new Domain('domain1', context);
        assert.deepEqual({ code: result.code, message: result.output.stdout },
                         { code: 0,
                           message:
                             '=== Domain Summary ===\n' +
                             'Domain Name: domain1\n' +
                             'Document Service endpoint: ' +
                               arnToEndpoint(domain.documentsArn, hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               arnToEndpoint(domain.searchArn, hostPort) + '\n' +
                             'SearchInstanceType: null\n' +
                             'SearchPartitionCount: 0\n' +
                             'SearchInstanceCount: 0\n' +
                             'Searchable Documents: 0\n' +
                             'Current configuration changes require ' +
                               'a call to IndexDocuments: No\n' +
                             '\n' +
                             '=== Domain Configuration ===\n' +
                             '\n' +
                             'Fields:\n' +
                             '=======\n' +
                             ageField.summary + '\n' +
                             nameField.summary +'\n' +
                             '======================\n' });

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('describe all', function(done) {
    new Domain('domain2', context).createSync();
    new Domain('domain1', context).createSync();
    utils
      .run('gcs-describe-domain',
           '--show-all',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        var domain1 = new Domain('domain1', context);
        var domain2 = new Domain('domain2', context);
        assert.deepEqual({ code: result.code, message: result.output.stdout },
                         { code: 0,
                           message:
                             '=== Domain Summary ===\n' +
                             'Domain Name: domain2\n' +
                             'Document Service endpoint: ' +
                               arnToEndpoint(domain2.documentsArn, hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               arnToEndpoint(domain2.searchArn, hostPort) + '\n' +
                             'SearchInstanceType: null\n' +
                             'SearchPartitionCount: 0\n' +
                             'SearchInstanceCount: 0\n' +
                             'Searchable Documents: 0\n' +
                             'Current configuration changes require ' +
                               'a call to IndexDocuments: No\n' +
                             '\n' +
                             '=== Domain Configuration ===\n' +
                             '\n' +
                             'Fields:\n' +
                             '=======\n' +
                             '======================\n' +
                             '\n' +
                             '=== Domain Summary ===\n' +
                             'Domain Name: domain1\n' +
                             'Document Service endpoint: ' +
                               arnToEndpoint(domain1.documentsArn, hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               arnToEndpoint(domain1.searchArn, hostPort) + '\n' +
                             'SearchInstanceType: null\n' +
                             'SearchPartitionCount: 0\n' +
                             'SearchInstanceCount: 0\n' +
                             'Searchable Documents: 0\n' +
                             'Current configuration changes require ' +
                               'a call to IndexDocuments: No\n' +
                             '\n' +
                             '=== Domain Configuration ===\n' +
                             '\n' +
                             'Fields:\n' +
                             '=======\n' +
                             '======================\n' });

        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-configure-fields', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  function assertSuccess(result, name, state, type, options) {
    assert.deepEqual({ code:    result.code,
                       message: result.output.stdout },
                     { code:    0,
                       message: 'Updated 1 Index Field:\n' +
                                name + ' ' + state + ' ' + type + ' (' + options + ')\n' },
                     result.output.stderr + [result, name, state, type, options]);
  }

  function testCreateField(done, name, type, options) {
    new Domain('companies', context).createSync();
    utils
      .run('gcs-create-domain',
           '--domain-name', 'companies',
           '--endpoint', 'localhost:' + utils.testPort)
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertSuccess(result, name, 'RequiresIndexDocuments', type, options);

        context.reopen();
        var domain = new Domain('companies', context);
        var field = domain.getIndexField(name);
        assert.deepEqual({ type: field.type, exists: field.exists() },
                         { type: type, exists: true });

        done();
      })
      .error(function(e) {
        done(e);
      });
  }

  test('create text field', function(done) {
    testCreateField(done, 'name', 'text', 'Search');
  });
  test('create uint field', function(done) {
    testCreateField(done, 'age', 'uint', 'Search Result');
  });
  test('create literal field', function(done) {
    testCreateField(done, 'product', 'literal', '');
  });

  function testDeleteField(done, name, type) {
    var domain = new Domain('companies', context);
    domain.createSync();
    var field = domain.getIndexField(name).setType(type);
    field.createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--delete',
           '--force',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Updated 1 Index Field:\n' },
                         result.output.stderr);

        context.reopen();
        var domain = new Domain('companies', context);
        var field = domain.getIndexField(name);
        assert.isFalse(field.exists());

        done();
      })
      .error(function(e) {
        done(e);
      });
  }

  test('delete text field', function(done) {
    testDeleteField(done, 'name', 'text');
  });
  test('delete uint field', function(done) {
    testDeleteField(done, 'age', 'uint');
  });
  test('delete literal field', function(done) {
    testDeleteField(done, 'product', 'literal');
  });

  function testRecreateField(done, name, type) {
    var domain = new Domain('companies', context);
    domain.createSync();
    var field = domain.getIndexField(name).setType(type);
    field.createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify the configuring option.\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  }

  test('re-create text field', function(done) {
    testRecreateField(done, 'name', 'text');
  });
  test('re-create uint field', function(done) {
    testRecreateField(done, 'age', 'uint');
  });
  test('re-create literal field', function(done) {
    testRecreateField(done, 'product', 'literal');
  });

  test('delete not-existing field', function(done) {
    new Domain('companies', context).createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'name',
           '--delete',
           '--force',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify an existing field.\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create field without type', function(done) {
    new Domain('companies', context).createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify the field type.\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create field without domain', function(done) {
    utils
      .run('gcs-configure-fields',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  function assertOptionNotConfigurable(result, option, type) {
    if (option.indexOf('search') > -1)
      option = 'searchable option';
    else if (option.indexOf('facet') > -1)
      option = 'facet option';
    else if (option.indexOf('result') > -1)
      option = 'returnable option';
    assert.deepEqual({ code:    result.code,
                       message: result.output.stdout },
                     { code:    1,
                       message: option + ' cannot be configured for the type ' + type + '.\n' },
                     result.output.stderr);
  }

  function assertOptionConfigured(result, name, state, type, options) {
    assertSuccess(result, name, state, type, options);
    context.reopen();
    var field = new Domain('companies', context).getIndexField(name);
    assert.equal(field.options, options, [result, name, state, type, options]);
  }

  function testConfigureFieldOptions(type, results, done) {
    var name = 'test';
    var domain = new Domain('companies', context);
    domain.createSync();
    domain.getIndexField(name).setType(type).createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'search',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.search == 'error')
          assertOptionNotConfigurable(result, 'search', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.search);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'nosearch',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.nosearch == 'error')
          assertOptionNotConfigurable(result, 'nosearch', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.nosearch);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'result',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.result == 'error')
          assertOptionNotConfigurable(result, 'result', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.result);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'noresult',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.noresult == 'error')
          assertOptionNotConfigurable(result, 'noresult', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.noresult);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'facet',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.facet == 'error')
          assertOptionNotConfigurable(result, 'facet', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.facet);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'nofacet',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        if (results.nofacet == 'error')
          assertOptionNotConfigurable(result, 'nofacet', type);
        else
          assertOptionConfigured(result, name, 'RequiresIndexDocuments', type, results.nofacet);
        done();
      })
      .error(function(e) {
        done(e);
      });
  }

  test('change option of text field', function(done) {
    testConfigureFieldOptions('text', {
      search:   'error',
      nosearch: 'error',
      result:   'Search Result',
      noresult: 'Search',
      facet:    'Search Facet',
      nofacet:  'Search'
    }, done);
  });

  test('change option of uint field', function(done) {
    testConfigureFieldOptions('uint', {
      search:   'error',
      nosearch: 'error',
      result:   'error',
      noresult: 'error',
      facet:    'error',
      nofacet:  'error'
    }, done);
  });

  test('change option of literal field', function(done) {
    testConfigureFieldOptions('literal', {
      search:   'Search',
      nosearch: '',
      result:   'Result',
      noresult: '',
      facet:    'Facet',
      nofacet:  ''
    }, done);
  });
});

suite('gcs-configure-text-options', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('load synonyms', function() {
    new Domain('companies', context).createSync();
    utils
      .run('gcs-configure-text-options',
           '--domain-name', 'companies',
           '--synonyms', path.join(__dirname, 'fixtures', 'synonyms.txt'),
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: '2 synonyms are loaded.\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('load synonyms to not-existing domain', function() {
    utils
      .run('gcs-configure-text-options',
           '--domain-name', 'companies',
           '--synonyms', path.join(__dirname, 'fixtures', 'synonyms.txt'),
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotExist(result, 'companies');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('load synonyms without domain', function() {
    utils
      .run('gcs-configure-text-options',
           '--synonyms', path.join(__dirname, 'fixtures', 'synonyms.txt'),
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('print synonyms', function() {
    var domain = new Domain('companies', context);
    domain.createSync();
    domain.updateSynonymsSync({
      hokkaido: 'dekkaido',
      tokyo: ['tonkin', 'tokio']
    });
    utils
      .run('gcs-configure-text-options',
           '--domain-name', 'companies',
           '--print-synonyms',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'hokkaido,dekkaido\n' +
                                    'tokyo,tokio,tonkin\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('print synonyms to not-existing domain', function() {
    utils
      .run('gcs-configure-text-options',
           '--domain-name', 'companies',
           '--print-synonyms',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotExist(result, 'companies');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('print synonyms without domain', function() {
    utils
      .run('gcs-configure-text-options',
           '--print-synonyms',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-configure-default-search-field', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('set to an existing field', function(done) {
    var domain = new Domain('companies', context).createSync();
    domain.getIndexField('name').setType('text').createSync();
    utils
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Setting "name" as the default search ' +
                                      'field of "companies"...\n' +
                                    'Done.\n' },
                         result.output.stderr);
        assert.equal(domain.defaultSearchField.name, 'name');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('set to a missing field', function(done) {
    var domain = new Domain('companies', context).createSync();
    domain.getIndexField('name').setType('text').createSync();
    utils
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'address',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: '"address" is not a field of "companies".\n' },
                         result.output.stderr);
        assert.equal(domain.defaultSearchField.name, 'name');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('set to blank', function(done) {
    var domain = new Domain('companies', context).createSync();
    domain.getIndexField('name').setType('text').createSync();
    utils
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', '',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Resetting the default search field of ' +
                                      '"companies"...\n' +
                                    'Done.\n' },
                         result.output.stderr);
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('set to blank (omitted "name" option)', function(done) {
    var domain = new Domain('companies', context).createSync();
    domain.getIndexField('name').setType('text').createSync();
    utils
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Resetting the default search field of ' +
                                      '"companies"...\n' +
                                    'Done.\n' },
                         result.output.stderr);
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('Described default search field', function(done) {
    var domain = new Domain('companies', context).createSync();
    domain.getIndexField('name').setType('text').createSync();
    utils
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'name',
           '--endpoint', 'localhost:' + utils.testPort)
      .run('gcs-describe-domain',
           '--domain-name', 'companies',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.equal(result.code, 0, result.output.stdout + result.output.stderr);
        console.log(result.output.stdout);
        assert.include(result.output.stdout, 'Default search field: name', result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-index-documents', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('reindex', function(done) {
    var domain = new Domain('companies', context);
    domain.createSync();
    domain.getIndexField('name').setType('text').createSync();
    domain.getIndexField('age').setType('uint').createSync();
    domain.getIndexField('product').setType('literal').createSync();

    utils
      .run('gcs-index-documents',
           '--domain-name', 'companies',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message:
                             '===========================================\n' +
                             'Indexing documents for domain [companies]\n' +
                             '\n' +
                             'Now indexing fields:\n' +
                             '===========================================\n' +
                             'age\n' +
                             'name\n' +
                             'product\n' +
                             '===========================================\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('reindex not-existing domain', function(done) {
    utils
      .run('gcs-index-documents',
           '--domain-name', 'test',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotExist(result, 'test');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('reindex without domain', function(done) {
    utils
      .run('gcs-index-documents',
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-post-sdf', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  var fixturesDirectory = path.join(__dirname, 'fixture', 'companies');

  var endpoint;
  function setupDomain() {
    var domain = new Domain('companies', context);
    domain.createSync();
    domain.getIndexField('name').setType('text').createSync();
    domain.getIndexField('address').setType('text').createSync();
    domain.getIndexField('email_address').setType('text').createSync();
    domain.getIndexField('description').setType('text').createSync();
    domain.getIndexField('age').setType('uint').createSync();
    domain.getIndexField('product').setType('literal').createSync();
    endpoint = arnToEndpoint(domain.documentsArn, '127.0.0.1.xip.io:' + utils.testPort);
  }

  test('post add sdf json', function(done) {
    setupDomain();
    var batchFile = path.join(fixturesDirectory, 'add.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message:
                             'Processing: ' + batchFile + '\n' +
                             'Detected source format for ' +
                               'add.sdf.json as json\n' +
                             'Status: success\n' +
                             'Added: 10\n' +
                             'Deleted: 0\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post add sdf json (non-ascii)', function(done) {
    setupDomain();
    var batchFile = path.join(fixturesDirectory, 'non-ascii.add.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message:
                             'Processing: ' + batchFile + '\n' +
                             'Detected source format for ' +
                               'non-ascii.add.sdf.json as json\n' +
                             'Status: success\n' +
                             'Added: 10\n' +
                             'Deleted: 0\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post delete sdf json', function(done) {
    setupDomain();
    var addBatch = fs.readFileSync(path.join(fixturesDirectory, 'add.sdf.json'), 'UTF-8');
    var deleteBatchFile = path.join(fixturesDirectory, 'delete.sdf.json');
    utils
/* Don't use gcs-post-sdf to setup database, because it is too slow and this test becomes time-out.
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', path.join(fixturesDirectory, 'add.sdf.json'),
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
*/
      .post('/2011-02-01/documents/batch', addBatch, {
        'Content-Type': 'application/json',
        'Content-Length': addBatch.length,
        'Host': endpoint.split(':')[0]
      })
      .next(function(response) {
        var expected = {
              statusCode: 200,
              body: JSON.stringify({
                status: 'success',
                adds: 10,
                deletes: 0
              })
            };
        assert.deepEqual(response, expected);
      })
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', deleteBatchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message:
                             'Processing: ' + deleteBatchFile + '\n' +
                             'Detected source format for ' +
                               'delete.sdf.json as json\n' +
                             'Status: success\n' +
                             'Added: 0\n' +
                             'Deleted: 1\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post invalid sdf json', function(done) {
    setupDomain();
    var batchFile = path.join(fixturesDirectory, 'invalid.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message:
                             'Processing: ' + batchFile + '\n' +
                             'Detected source format for ' +
                               'invalid.sdf.json as json\n' +
                             'Validation failed.\n' +
                             'invalidfield: The field "unknown1" is ' +
                               'unknown. (available: address,age,' +
                               'description,email_address,name,product)\n' +
                             'invalidfield: The field "unknown2" is ' +
                               'unknown. (available: address,age,' +
                               'description,email_address,name,product)\n' +
                             'invalidfield: The field "name" is null.\n' +
                             'nofields: You must specify "fields".\n' +
                             'emptyfields: You must specify one or ' +
                               'more fields to "fields".\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post no source', function(done) {
    setupDomain();
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify the source SDF.\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post unknown format file', function(done) {
    setupDomain();
    var batchFile = path.join(__dirname, 'fixture', 'synonyms.txt');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'Processing: ' + batchFile + '\n' +
                                    'Unknown format\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post missing file', function(done) {
    setupDomain();
    var batchFile = path.join(__dirname, 'fixture', 'not-exists.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'Processing: ' + batchFile + '\n' +
                                    'No such file\n' },
                         result.output.stderr);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post not-existing domain', function(done) {
    var batchFile = path.join(fixturesDirectory, 'invalid.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'test',
           '--source', batchFile,
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotExist(result, 'test');
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post without domain', function(done) {
    utils
      .run('gcs-post-sdf',
           '--document-endpoint', endpoint,
           '--endpoint', 'localhost:' + utils.testPort)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});
