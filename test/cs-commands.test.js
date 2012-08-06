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

  test('create text field', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'name',
           '--type', 'text',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
        assert.equal(result.output.stdout,
                     'Updated 1 Index Field:\n' +
                     'name RequiresIndexDocuments text ()\n');

        context.reopen();
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('name');
        assert.deepEqual({ type: field.type, exists: field.exists() },
                         { type: 'text', exists: true });

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create uint field', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'age',
           '--type', 'uint',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
        assert.equal(result.output.stdout,
                     'Updated 1 Index Field:\n' +
                     'age RequiresIndexDocuments uint ()\n');

        context.reopen();
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('age');
        assert.deepEqual({ type: field.type, exists: field.exists() },
                         { type: 'uint', exists: true });

        done();
      })
      .error(function(e) {
        done(e);
      });
  });

  test('create literal field', function(done) {
    utils
      .run('cs-create-domain',
           '--domain-name', 'companies',
           '--database-path', temporaryDatabase.path)
      .run('cs-configure-fields',
           '--domain-name', 'companies',
           '--name', 'product',
           '--type', 'literal',
           '--database-path', temporaryDatabase.path)
      .next(function(result) {
        assert.equal(result.code, 0);
        assert.equal(result.output.stdout,
                     'Updated 1 Index Field:\n' +
                     'product RequiresIndexDocuments literal ()\n');

        context.reopen();
        var domain = new Domain('companies', context);
        var field = domain.getIndexField('product');
        assert.deepEqual({ type: field.type, exists: field.exists() },
                         { type: 'literal', exists: true });

        done();
      })
      .error(function(e) {
        done(e);
      });
  });
});
