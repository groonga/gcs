var utils = require('./test-utils');

var assert = require('chai').assert;

var Domain = require('../lib/database/domain').Domain;
var IndexField = require('../lib/database/index-field').IndexField;

suite('database', function() {
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
      }, /too short field name/);
    });

    test('too long', function() {
      assert.throw(function() {
        var fieldName = 'abcdefghijklmnopqrstuvwxyz' +
                        '0123456789' +
                        'abcdefghijklmnopqrstuvwxyz' +
                        '0123456789';
        var field = new IndexField(fieldName, domain);
      }, /too long field name/);
    });

    test('hyphen', function() {
      assert.throw(function() {
        var field = new IndexField('field-name', domain);
      }, /"-" cannot appear in a field name/);
    });

    test('upper case', function() {
      assert.throw(function() {
        var field = new IndexField('FieldName', domain);
      }, /"F", "N" cannot appear in a field name/);
    });

    test('indexColumnName', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.indexColumnName, 'testdomain_00000000000000000000000000_valid_123');
    });

    test('alterTableName', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.alterTableName, 'testdomain_00000000000000000000000000_valid_123');
    });

    test('fieldTypeToColumnType (text)', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.fieldTypeToColumnType('text'),
                   'ShortText');
    });

    test('fieldTypeToColumnType (uint)', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.fieldTypeToColumnType('uint'),
                   'UInt32');
    });

    test('fieldTypeToColumnType (literal)', function() {
      var field = new IndexField('valid_123', domain);
      assert.equal(field.fieldTypeToColumnType('literal'),
                   'testdomain_00000000000000000000000000_valid_123');
    });

    test('initial status (text)', function() {
      var field = new IndexField('text', domain);
      field.type = 'text';
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state
      }, {
        facetEnabled:  false,
        resultEnabled: true,
        searchEnabled: true,
        state:         'RequiresIndexDocuments'
      });
    });

    test('initial status (uint)', function() {
      var field = new IndexField('uint', domain);
      field.type = 'uint';
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state
      }, {
        facetEnabled:  true,
        resultEnabled: true,
        searchEnabled: true,
        state:         'RequiresIndexDocuments'
      });
    });

    test('initial status (literal)', function() {
      var field = new IndexField('literal', domain);
      field.type = 'literal';
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state
      }, {
        facetEnabled:  true,
        resultEnabled: true,
        searchEnabled: true,
        state:         'RequiresIndexDocuments'
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

      test('type detection (text)', function() {
        var field = new IndexField('name', domain);
        assert.equal(field.type, 'text');
      });

      test('type detection (uint)', function() {
        var field = new IndexField('age', domain);
        assert.equal(field.type, 'uint');
      });

      test('type detection (literal)', function() {
        var field = new IndexField('product', domain);
        assert.equal(field.type, 'literal');
      });
    });
  });
});
