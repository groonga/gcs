var utils = require('./test-utils');
var assert = require('chai').assert;
var path = require('path');

var Domain = require('../lib/database/domain').Domain;

var context;
var temporaryDatabase;

function commonSetup() {
  temporaryDatabase = utils.createTemporaryDatabase();
  context = temporaryDatabase.get();
}

function commonTeardown() {
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

function assertDomainNotExist(result) {
  assert.deepEqual({ code:    result.code,
                     message: result.output.stdout },
                   { code:    1,
                     message: 'You must specify an existing domain name.\n' },
                   result.output.stderr);
}

suite('gcs-create-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('create', function(done) {
    utils
      .run('gcs-create-domain',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0, result.output.stderr);
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotExist(result);
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('gcs-describe-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  var hostPort = '127.0.0.1.xip.io:7575';

  test('describe one', function(done) {
    var domain2 = new Domain('domain2', context).createSync();
    var domain1 = new Domain('domain1', context).createSync();
    var nameField = domain1.getIndexField('name').setType('text').createSync();
    var ageField = domain1.getIndexField('age').setType('uint').createSync();
    utils
      .run('gcs-describe-domain',
           '--domain-name', 'domain1',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        var domain = new Domain('domain1', context);
        assert.deepEqual({ code: result.code, message: result.output.stdout },
                         { code: 0,
                           message:
                             '=== Domain Summary ===\n' +
                             'Domain Name: domain1\n' +
                             'Document Service endpoint: ' +
                               domain.getDocumentsEndpoint(hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               domain.getSearchEndpoint(hostPort) + '\n' +
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
                             '======================\n' +
                             '*Note: the hostname and the port number is ' +
                             'detected from the default options. If you run ' +
                             'the service with your favorite host name and ' +
                             'port number, then use it instead of default ' +
                             'information.\n' });

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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        var domain1 = new Domain('domain1', context);
        var domain2 = new Domain('domain2', context);
        assert.deepEqual({ code: result.code, message: result.output.stdout },
                         { code: 0,
                           message:
                             '=== Domain Summary ===\n' +
                             'Domain Name: domain1\n' +
                             'Document Service endpoint: ' +
                               domain1.getDocumentsEndpoint(hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               domain1.getSearchEndpoint(hostPort) + '\n' +
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
                             'Domain Name: domain2\n' +
                             'Document Service endpoint: ' +
                               domain2.getDocumentsEndpoint(hostPort) + '\n' +
                             'Search Service endpoint: ' +
                               domain2.getSearchEndpoint(hostPort) + '\n' +
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
                             '*Note: the hostname and the port number is ' +
                             'detected from the default options. If you run ' +
                             'the service with your favorite host name and ' +
                             'port number, then use it instead of default ' +
                             'information.\n' });

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

  function assertSuccess(result, name, type, options) {
    assert.deepEqual({ code:    result.code,
                       message: result.output.stdout },
                     { code:    0,
                       message: 'Updated 1 Index Field:\n' +
                                name + ' Active ' + type + ' (' + options + ')\n' },
                     result.output.stderr);
  }

  function testCreateField(done, name, type, options) {
    new Domain('companies', context).createSync();
    utils
      .run('gcs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertSuccess(result, name, type, options);

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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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

  function assertOptionConfigured(result, name, type, options) {
    assertSuccess(result, name, type, options);
    context.reopen();
    var field = new Domain('companies', context).getIndexField(name);
    assert.equal(field.options, options);
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.search == 'error')
          assertOptionNotConfigurable(result, 'search', type);
        else
          assertOptionConfigured(result, name, type, results.search);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'nosearch',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.nosearch == 'error')
          assertOptionNotConfigurable(result, 'nosearch', type);
        else
          assertOptionConfigured(result, name, type, results.nosearch);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'result',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.result == 'error')
          assertOptionNotConfigurable(result, 'result', type);
        else
          assertOptionConfigured(result, name, type, results.result);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'noresult',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.noresult == 'error')
          assertOptionNotConfigurable(result, 'noresult', type);
        else
          assertOptionConfigured(result, name, type, results.noresult);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'facet',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.facet == 'error')
          assertOptionNotConfigurable(result, 'facet', type);
        else
          assertOptionConfigured(result, name, type, results.facet);
      })
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--option', 'nofacet',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        if (results.nofacet == 'error')
          assertOptionNotConfigurable(result, 'nofacet', type);
        else
          assertOptionConfigured(result, name, type, results.nofacet);
        done();
      })
      .error(function(e) {
        done(e);
      });
  }

  test('change option of text field', function(done) {
    testConfigureFieldOptions('text', {
      search:   'Search',
      nosearch: 'error',
      facet:    'Search Facet',
      nofacet:  'Search',
      result:   'Search Result',
      noresult: 'Search'
    }, done);
  });

  test('change option of uint field', function(done) {
    testConfigureFieldOptions('uint', {
      search:   'Search Result',
      nosearch: 'error',
      facet:    'error',
      nofacet:  'Search Result',
      result:   'Search Result',
      noresult: 'error'
    }, done);
  });

  test('change option of literal field', function(done) {
    testConfigureFieldOptions('literal', {
      search:   'Search',
      nosearch: '',
      facet:    'Facet',
      nofacet:  '',
      result:   'Result',
      noresult: ''
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotExist(result);
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotExist(result);
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Setting "name" as the default search ' +
                                      'field of "companies"...' +
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
           '--database-path', temporaryDatabase.path)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', 'address',
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--name', '',
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .run('gcs-configure-default-search-field',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Resetting the default search field of ' +
                                      '"companies"...' +
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
           '--database-path', temporaryDatabase.path)
      .run('gcs-describe-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotExist(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('reindex without domain', function(done) {
    utils
      .run('gcs-index-documents',
           '--database-path', temporaryDatabase.path)
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

  function setupDomain() {
    var domain = new Domain('companies', context);
    domain.createSync();
    domain.getIndexField('name').setType('text').createSync();
    domain.getIndexField('address').setType('text').createSync();
    domain.getIndexField('email_address').setType('text').createSync();
    domain.getIndexField('description').setType('text').createSync();
    domain.getIndexField('age').setType('uint').createSync();
    domain.getIndexField('product').setType('literal').createSync();
  }

  test('post add sdf json', function(done) {
    setupDomain();
    var batchFile = path.join(fixturesDirectory, 'add.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--database-path', temporaryDatabase.path)
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

  test('post delete sdf json', function(done) {
    setupDomain();
    var batchFile = path.join(fixturesDirectory, 'delete.sdf.json');
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', path.join(fixturesDirectory, 'add.sdf.json'),
           '--database-path', temporaryDatabase.path)
      .run('gcs-post-sdf',
           '--domain-name', 'companies',
           '--source', batchFile,
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message:
                             'Processing: ' + batchFile + '\n' +
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
           '--database-path', temporaryDatabase.path)
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
    utils
      .run('gcs-post-sdf',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotExist(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('post without domain', function(done) {
    utils
      .run('gcs-post-sdf',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assertDomainNotSpecified(result);
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});
