var utils = require('./test-utils');
var assert = require('chai').assert;

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

suite('cs-create-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('create', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
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
    utils
      .run('cs-create-domain',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .run('cs-create-domain',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 1);
        assert.include(result.output.stdout,
                       'The domain [test] already exists.');

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
      .run('cs-create-domain',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 1);
        assert.include(result.output.stdout,
                       'You must specify the domain name.');

        context.reopen();
        assert.deepEqual(Domain.getAll(context), []);

        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('cs-delete-domain', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  test('delete force', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'test',
           '--database-path', temporaryDatabase.path)
      .run('cs-delete-domain',
           '--domain-name', 'test',
           '--force',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
        assert.include(result.output.stdout,
                       'Domain [test] has been deleted successfully.');

        context.reopen();
        var domain = new Domain('test', context);
        assert.isFalse(domain.exists());

        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});

suite('cs-describe-domain', function() {
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
    utils
      .run('cs-create-domain',
           '--domain-name', 'domain2',
           '--database-path', temporaryDatabase.path)
      .run('cs-create-domain',
           '--domain-name', 'domain1',
           '--database-path', temporaryDatabase.path)
      .run('cs-describe-domain',
           '--domain-name', 'domain1',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
        assert.include(result.output.stdout,
                       report(new Domain('domain1', context), 'localhost'));

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('describe all', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'domain2',
           '--database-path', temporaryDatabase.path)
      .run('cs-create-domain',
           '--domain-name', 'domain1',
           '--database-path', temporaryDatabase.path)
      .run('cs-describe-domain',
           '--show-all',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
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

suite('cs-configure-fields', function() {
  setup(commonSetup);
  teardown(commonTeardown);

  function testCreateField(done, name, type) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Updated 1 Index Field:\n' +
                                    name + ' RequiresIndexDocuments ' + type + ' ()\n' });

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
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--delete',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    0,
                           message: 'Updated 1 Index Field:\n' });

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
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', name,
           '--type', type,
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify not-existing field name.\n' });
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
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'name',
           '--delete',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify an existing field.\n' });
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create field without type', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'name',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify the field type.\n' });
        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create field without domain', function(done) {
    utils
      .run('cs-configure-fields',
           '--name', 'name',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.deepEqual({ code:    result.code,
                           message: result.output.stdout },
                         { code:    1,
                           message: 'You must specify the domain name.\n' });
        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});
