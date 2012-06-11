var utils = require('./test-utils');

var assert = require('chai').assert;

var resolver = require('../lib/resolver');

suite('resolver', function() {
  suite('getTableNameFromDomain', function() {
    test('lower case', function() {
      var tableName = resolver.getTableNameFromDomain('valid');
      assert.equal(tableName, 'valid');
    });

    test('lower case and number', function() {
      var tableName = resolver.getTableNameFromDomain('valid123');
      assert.equal(tableName, 'valid123');
    });

    test('too short', function() {
      assert.throw(function() {
        resolver.getTableNameFromDomain('va');
      }, /too short domain name/)
    });

    test('too long', function() {
      assert.throw(function() {
        resolver.getTableNameFromDomain('abcdefghijklmnopqrstuvwxyz' +
                                        '0123456789');
      }, /too long domain name/)
    });

    test('hyphen', function() {
      assert.throw(function() {
        resolver.getTableNameFromDomain('domain-name');
      }, /"-" cannot appear in a domain name/)
    });

    test('underscore', function() {
      assert.throw(function() {
        resolver.getTableNameFromDomain('domain_name');
      }, /"_" cannot appear in a domain name/)
    });

    test('upper case', function() {
      assert.throw(function() {
        resolver.getTableNameFromDomain('DomainName');
      }, /"D", "N" cannot appear in a domain name/)
    });
  });
});
