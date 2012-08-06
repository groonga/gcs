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
      });
  });
});
