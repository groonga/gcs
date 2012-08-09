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

  function report(domain, hostname) {
    return [
      'Domain Name               ' + domain.name,
      'Document Service Endpoint ' + domain.getDocumentsEndpoint(hostname),
      'Search Endpoint           ' + domain.getSearchEndpoint(hostname),
      'Searchable Documents      ' + domain.searchableDocumentsCount,
      'Index Fields              ' + domain.name,
      'SearchPartitionCount      ' + domain.searchPartitionCount,
      'SearchInstanceCount       ' + domain.searchInstanceCount,
      'SearchInstanceType        ' + domain.searchInstanceType
    ].join('\n');
  }

  test('describe one', function(done) {
    new Domain('domain2', context).createSync();
    new Domain('domain1', context).createSync();
    utils
      .run('gcs-describe-domain',
           '--domain-name', 'domain1',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0, result.output.stderr);
        assert.include(result.output.stdout,
                       report(new Domain('domain1', context), 'localhost'));

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
        assert.equal(result.code, 0, result.output.stderr);
        assert.include(result.output.stdout,
                       report(new Domain('domain2', context), 'localhost'));
        assert.include(result.output.stdout,
                       report(new Domain('domain1', context), 'localhost'));

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

  function testCreateField(done, name, type) {
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
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Updated 1 Index Field:\n' +
                                    name + ' Active ' + type + ' ()\n' },
                         result.output.stderr);

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
    testCreateField(done, 'name', 'text');
  });
  test('create uint field', function(done) {
    testCreateField(done, 'age', 'uint');
  });
  test('create literal field', function(done) {
    testCreateField(done, 'product', 'literal');
  });

  function testDeleteField(done, name, type) {
    var domain = new Domain('companies', context);
    domain.createSync();
    var field = domain.getIndexField(name);
    field.type = type
    field.createSync();
    utils
      .run('gcs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--delete',
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
    var field = domain.getIndexField(name);
    field.type = type
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
                           message: 'You must specify not-existing field name.\n' },
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

suite('gcs-index-documents', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('reindex', function(done) {
    var domain = new Domain('companies', context);
    domain.createSync();
    var textField = domain.getIndexField('name');
    textField.type = 'text'
    textField.createSync();
    var uintField = domain.getIndexField('age');
    uintField.type = 'uint'
    uintField.createSync();
    var literalField = domain.getIndexField('product');
    literalField.type = 'literal'
    literalField.createSync();

    utils
      .run('gcs-index-documents',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: '===========================================\n' +
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
