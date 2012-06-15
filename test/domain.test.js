var utils = require('./test-utils');

var assert = require('chai').assert;

var Domain = require('../lib/domain').Domain;

suite('Domain', function() {
  suite('table', function() {
    test('lower case', function() {
      var domain = new Domain('valid');
      assert.equal(domain.tableName, 'valid');
    });

    test('lower case and number', function() {
      var domain = new Domain('valid123');
      assert.equal(domain.tableName, 'valid123');
    });

    test('too short', function() {
      assert.throw(function() {
        var domain = new Domain('va');
      }, /too short domain name/)
    });

    test('too long', function() {
      assert.throw(function() {
        var domain = new Domain('abcdefghijklmnopqrstuvwxyz' +
                                '0123456789');
      }, /too long domain name/)
    });

    test('hyphen', function() {
      assert.throw(function() {
        var domain = new Domain('domain-name');
      }, /"-" cannot appear in a domain name/)
    });

    test('underscore', function() {
      assert.throw(function() {
        var domain = new Domain('domain_name');
      }, /"_" cannot appear in a domain name/)
    });

    test('upper case', function() {
      assert.throw(function() {
        var domain = new Domain('DomainName');
      }, /"D", "N" cannot appear in a domain name/)
    });
  });
});
