var utils = require('./test-utils');
var assert = require('chai').assert;

suite('gcs command', function() {
  test('should output help for --help', function(done) {
    utils.run('gcs', '--help')
      .next(function(result) {
        assert.equal(result.output.stderr, '');
        assert.include(result.output.stdout, 'Usage:');
        assert.equal(result.code, 0);
        done();
      });
  });
});
