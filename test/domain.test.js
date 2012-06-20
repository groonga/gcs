var utils = require('./test-utils');

var assert = require('chai').assert;

var domain = require('../lib/domain');
var Domain = domain.Domain;
var IndexField = domain.IndexField;

suite('domain', function() {
  suite('Domain', function() {
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

    test('termsTableName', function() {
      var domain = new Domain('valid123');
      assert.equal(domain.termsTableName, 'valid123_BigramTerms');
    });

    suite('from query parameter', function() {
      test('valid', function() {
        var request = { query: { DomainName: 'test0123' } };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test0123');
      });

      test('invalid', function() {
        assert.throw(function() {
          var request = { query: { DomainName: 'domain_name' } };
          var domain = new Domain(request);
        }, /cannot appear in a domain name/)
      });
    });

    suite('from host name', function() {
      test('valid', function() {
        var host = 'doc-test0123-id0123.us-east-1.example.com';
        var request = { headers: { Host: host } };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test0123');
      });

      test('invalid', function() {
        assert.throw(function() {
          var host = 'doc-domain_name-id0123.us-east-1.example.com';
          var request = { headers: { Host: host } };
          var domain = new Domain(request);
        }, /cannot appear in a domain name/)
      });
    });

    suite('getNameFromHost', function() {
      test('valid, doc, lower case and number', function() {
        var host = 'doc-test0123-id0123.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test0123');
      });

      test('valid, search, lower case and number', function() {
        var host = 'search-test0123-id0123.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test0123');
      });

      test('valid, doc, lower case, hyphen and number', function() {
        var host = 'doc-test-0123-id0123.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test-0123');
      });

      test('valid, search, lower case, hyphen and number', function() {
        var host = 'search-test-0123-id0123.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test-0123');
      });

      test('invalid', function() {
        var host = 'cloudsearch.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, '');
      });
    });
  });

  suite('IndexField', function() {
    var domain;

    setup(function() {
      domain = new Domain('testdomain');
    });

    teardown(function() {
      domain = undefined;
    });

    test('lower case', function() {
      var field = new IndexField('valid', domain);
      assert.equal(field.columnName, 'valid');
    });

    test('lower case and number', function() {
      var field = new IndexField('valid123', domain);
      assert.equal(field.columnName, 'valid123');
    });

    test('lower case, number amd underscore', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.columnName, 'valid_123');
    });

    test('too short', function() {
      assert.throw(function() {
        var field = new IndexField('va', domain);
      }, /too short field name/)
    });

    test('too long', function() {
      assert.throw(function() {
        var fieldName = 'abcdefghijklmnopqrstuvwxyz' +
                        '0123456789' +
                        'abcdefghijklmnopqrstuvwxyz' +
                        '0123456789';
        var field = new IndexField(fieldName, domain);
      }, /too long field name/)
    });

    test('hyphen', function() {
      assert.throw(function() {
        var field = new IndexField('field-name', domain);
      }, /"-" cannot appear in a field name/)
    });

    test('upper case', function() {
      assert.throw(function() {
        var field = new IndexField('FieldName', domain);
      }, /"F", "N" cannot appear in a field name/)
    });

    test('indexColumnName', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.indexColumnName, 'testdomain_valid_123');
    });
  });
});