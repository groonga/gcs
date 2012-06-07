var utils = require('test-utils');


var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var BatchProcessor = require('../lib/batch').BatchProcessor;

suiteSetup(function() {
  utils.recreateTemporaryDirectory();
});

suite('batch', function() {
  test('initialize', function() {
    var processor = new BatchProcessor({
          databasePath: utils.databasePath,
          domain: 'test-domain'
        });
    assert.equal(processor.databasePath, databasePath);
    assert.equal(processor.domain, 'test-domain');
  });
});
