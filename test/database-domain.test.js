var utils = require('./test-utils');

var assert = require('chai').assert;

var Domain = require('../lib/database/domain').Domain;

suite('database', function() {
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
      }, /too short domain name/);
    });

    test('too long', function() {
      assert.throw(function() {
        var domain = new Domain('abcdefghijklmnopqrstuvwxyz' +
                                '0123456789');
      }, /too long domain name/);
    });

    test('hyphen', function() {
      assert.throw(function() {
        var domain = new Domain('domain-name');
      }, /"-" cannot appear in a domain name/);
    });

    test('underscore', function() {
      assert.throw(function() {
        var domain = new Domain('domain_name');
      }, /"_" cannot appear in a domain name/);
    });

    test('upper case', function() {
      assert.throw(function() {
        var domain = new Domain('DomainName');
      }, /"D", "N" cannot appear in a domain name/);
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
        }, /cannot appear in a domain name/);
      });
    });

    suite('getNameFromHost', function() {
      test('valid, doc, lower case and number', function() {
        var host = 'doc-test0123-id0123.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test0123');
      });

      test('valid, search, lower case and number', function() {
        var host = 'search-test0123-id0123.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test0123');
      });

      test('valid, doc, lower case, hyphen and number', function() {
        var host = 'doc-test-0123-id0123.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test-0123');
      });

      test('valid, search, lower case, hyphen and number', function() {
        var host = 'search-test-0123-id0123.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test-0123');
      });

      test('valid, search, lower case, hyphen and number, deep subdomain including region identifier', function() {
        var host = 'search-test-0123-id0123.us-east-1.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, 'test-0123');
      });

      test('invalid', function() {
        var host = 'cloudsearch.example.com';
        var name = Domain.getNameFromHost(host);
        assert.equal(name, '');
      });
    });

    suite('getNameFromPath', function() {
      test('valid, lower case and number', function() {
        var path = '/gcs/test0123/';
        var name = Domain.getNameFromPath(path);
        assert.equal(name, 'test0123');
      });

      test('valid, lower case, hyphen and number', function() {
        var path = '/gcs/test-0123/';
        var name = Domain.getNameFromPath(path);
        assert.equal(name, 'test-0123');
      });

      test('invalid', function() {
        var path = '/gcs';
        var name = Domain.getNameFromPath(path);
        assert.equal(name, '');
      });
    });

    suite('auto detection', function() {
      test('from host, valid', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host } };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test0123');
      });

      test('from host, invalid', function() {
        assert.throw(function() {
          var host = 'doc-domain_name-id0123.example.com';
          var request = { headers: { host: host } };
          var domain = new Domain(request);
        }, /cannot appear in a domain name/);
      });

      test('from path, valid', function() {
        var host = 'example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test0123' };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test0123');
      });

      test('from path, invalid', function() {
        assert.throw(function() {
          var host = 'example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test_01234' };
          var domain = new Domain(request);
        }, /cannot appear in a domain name/);
      });

      test('host vs path', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test4567' };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test0123');
      });

      test('option vs host vs path', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test4567',
                        query: { DomainName: 'test890' } };
        var domain = new Domain(request);
        assert.equal(domain.name, 'test890');
      });
    });

    suite('getting data from database', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');
        domain = new Domain('companies', context);
      });

      teardown(function() {
        domain = undefined;
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('indexFields', function() {
        var fields = domain.indexFields;
        fields = fields.map(function(field) {
          return {
            name: field.name,
            type: field.type
          };
        });
        var expected = [
              { name: 'address',
                type: 'text'},
              { name: 'age',
                type: 'uint'},
              { name: 'description',
                type: 'text'},
              { name: 'email_address',
                type: 'text'},
              { name: 'name',
                type: 'text'},
              { name: 'product',
                type: 'literal'}
            ];
        function sortFields(a, b) {
          return a.name - b.name;
        }
        assert.deepEqual(fields.sort(sortFields), expected.sort(sortFields));
      });
    });
  });
});