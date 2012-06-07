var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Processor = require('../lib/batch/processor').Processor;

suiteSetup(function() {
  utils.prepareCleanTemporaryDatabase();
});

suite('batch processor', function() {
  test('initialize', function() {
    var processor = new Processor({
          databasePath: utils.databasePath,
          domain: 'test-domain'
        });
    assert.equal(processor.databasePath, utils.databasePath);
    assert.equal(processor.domain, 'test-domain');
  });
});
