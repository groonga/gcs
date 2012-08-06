var utils = require('./test-utils');
var assert = require('chai').assert;

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
        done();
      });
  });
});
