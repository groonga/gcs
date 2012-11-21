var utils = require('./test-utils');

var assert = require('chai').assert;

var Domain = require('../lib/database/domain').Domain;
var IndexField = require('../lib/database/index-field').IndexField;

suite('database', function() {
  suite('IndexField', function() {
    var temporaryDatabase;
    var context;
    var domain;

    setup(function() {
      temporaryDatabase = utils.createTemporaryDatabase();
      context = temporaryDatabase.get();
      domain = new Domain('testdomain', context);
      domain.id = Domain.DEFAULT_ID;
      domain.createSync();
    });

    teardown(function() {
      domain = undefined;
      context = undefined;
      temporaryDatabase.teardown();
      temporaryDatabase = undefined;
    });

    test('lower case', function() {
      var field = new IndexField('valid', domain).createSync();
      assert.equal(field.columnName, 'valid');
    });

    test('lower case and number', function() {
      var field = new IndexField('valid123', domain).createSync();
      assert.equal(field.columnName, 'valid123');
    });

    test('lower case, number amd underscore', function() {
      var field = new IndexField('valid_123', domain).createSync();
      assert.equal(field.columnName, 'valid_123');
    });

    test('too short (1 character)', function() {
      assert.throw(function() {
        var field = new IndexField('v', domain).createSync();
      }, '2 validation errors detected: ' +
           'Value \'v\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               IndexField.VALID_NAME_PATTERN + '; ' +
           'Value \'v\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               IndexField.MINIMUM_NAME_LENGTH);
    });

    test('too short (2 characters)', function() {
      assert.throw(function() {
        var field = new IndexField('va', domain).createSync();
      }, '1 validation error detected: ' +
           'Value \'va\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               IndexField.MINIMUM_NAME_LENGTH);
    });

    test('too long', function() {
      var name = 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789';
      assert.throw(function() {
        var field = new IndexField(name, domain).createSync();
      }, '1 validation error detected: ' +
           'Value \'' + name + '\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length less than or equal to ' +
               IndexField.MAXIMUM_NAME_LENGTH);
    });

    test('hyphen', function() {
      assert.throw(function() {
        var field = new IndexField('field-name', domain).createSync();
      }, '1 validation error detected: ' +
           'Value \'field-name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member cannot include these characters: \'-\'');
    });

    test('underscore', function() {
      var field = new IndexField('field_name', domain).createSync();
      assert.equal(field.columnName, 'field_name');
    });

    test('upper case', function() {
      assert.throw(function() {
        var field = new IndexField('FieldName', domain).createSync();
      }, '1 validation error detected: ' +
           'Value \'FieldName\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               IndexField.VALID_NAME_PATTERN);
    });

    test('null type', function() {
      var field = new IndexField('foo', domain);
      assert.throw(function() {
        field.type = null;
        field.createSync();
      }, '1 validation error detected: ' +
           'Value null at \'%TYPE_FIELD%\' failed to satisfy constraint: ' +
             'Member must not be null');
    });

    test('unknown type', function() {
      var field = new IndexField('foo', domain);
      assert.throw(function() {
        field.type = 'unknown';
        field.createSync();
      }, '1 validation error detected: ' +
           'Value \'unknown\' at \'%TYPE_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy enum value set: [text, literal, uint]');
    });

    test('indexTableName', function() {
      var field = new IndexField('valid_123', domain).createSync();
      assert.equal(field.indexTableName,
                   'testdomain_' + Domain.DEFAULT_ID + '_' +
                     Domain.INDEX_SUFFIX + '_valid_123');
    });

    test('fieldTypeToColumnType (text)', function() {
      var field = new IndexField('valid_123', domain).createSync();
      assert.equal(field.fieldTypeToColumnType('text'),
                   'ShortText');
    });

    test('fieldTypeToColumnType (uint)', function() {
      var field = new IndexField('valid_123', domain).createSync();
      assert.equal(field.fieldTypeToColumnType('uint'),
                   'UInt32');
    });

    test('fieldTypeToColumnType (literal)', function() {
      var field = new IndexField('valid_123', domain).createSync();
      assert.equal(field.fieldTypeToColumnType('literal'),
                   'testdomain_' + Domain.DEFAULT_ID + '_' +
                     Domain.INDEX_SUFFIX + '_valid_123');
    });

    test('initial status (text)', function() {
      var field = new IndexField('text', domain);
      field.type = 'text';
      field.createSync();
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state,
        options:       field.options
      }, {
        facetEnabled:  false,
        resultEnabled: false,
        searchEnabled: true,
        state:         'Active',
        options:       'Search'
      });
    });

    test('initial status (uint)', function() {
      var field = new IndexField('uint', domain);
      field.type = 'uint';
      field.createSync();
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state,
        options:       field.options
      }, {
        facetEnabled:  false, // disabled by groonga...
        resultEnabled: true,
        searchEnabled: true,
        state:         'Active',
        options:       'Search Result'
      });
    });

    test('initial status (literal)', function() {
      var field = new IndexField('literal', domain);
      field.type = 'literal';
      field.createSync();
      assert.deepEqual({
        facetEnabled:  field.facetEnabled,
        resultEnabled: field.resultEnabled,
        searchEnabled: field.searchEnabled,
        state:         field.state,
        options:       field.options
      }, {
        facetEnabled:  false,
        resultEnabled: false,
        searchEnabled: false,
        state:         'Active',
        options:       ''
      });
    });

    test('summary', function() {
      var textField =    new IndexField('name', domain).setType('text').createSync();
      var uintField =    new IndexField('age', domain).setType('uint').createSync();
      var literalField = new IndexField('product', domain).setType('literal').createSync();
      assert.deepEqual({ text:    textField.summary,
                         uint:    uintField.summary,
                         literal: literalField.summary },
                       { text:    'name Active text (Search)',
                         uint:    'age Active uint (Search Result)',
                         literal: 'product Active literal ()' });
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

      test('exists, for existing field', function() {
        var field = new IndexField('name', domain).createSync();
        assert.isTrue(field.exists());
      });

      test('exists, for non-existing field', function() {
        var field = new IndexField('unknown', domain).createSync();
        assert.isFalse(field.exists());
      });

      test('type detection (text)', function() {
        var field = new IndexField('name', domain).createSync();
        assert.equal(field.type, 'text');
      });

      test('type detection (uint)', function() {
        var field = new IndexField('age', domain).createSync();
        assert.equal(field.type, 'uint');
      });

      test('type detection (literal)', function() {
        var field = new IndexField('product', domain).createSync();
        assert.equal(field.type, 'literal');
      });
    });

    suite('options', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain('companies', context);
        domain.createSync();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('create text field with options', function() {
        var field = new IndexField('name', domain).setType('text');
        assert.equal('Search', field.options);

        field.facetEnabled = true;
        field.createSync();

        field = new IndexField('name', domain); // reset instance from database
        assert.equal('Search Facet', field.options);
      });

      test('create text field with conflicting options', function() {
        var field = new IndexField('name', domain).setType('text').createSync;
        field.facetEnabled = true;
        assert.throw(function() {
          field.resultEnabled = true;
          field.saveOptionsSync();
        }, ' Error defining field: name. '+
             'An IndexField may not be both FacetEnabled and ResultEnabled');
      });

      test('update text field with options', function() {
        var field = new IndexField('name', domain).setType('text');
        field.createSync();
        assert.equal('Search', field.options);

        field.resultEnabled = true;
        field.saveOptionsSync();

        field = new IndexField('name', domain); // reset instance from database
        assert.equal('Search Result', field.options);
      });

      test('invalid modification of options for text field', function() {
        var field = new IndexField('name', domain).setType('text');
        field.createSync();
        field.searchEnabled = true;
        assert.throw(function() {
          field.searchEnabled = false;
          field.saveOptionsSync();
        }, 'searchable option cannot be configured for the type text');
      });

      test('invalid modification of options for uint field', function() {
        var field = new IndexField('age', domain).setType('uint');
        field.createSync();
        field.searchEnabled = true;
        assert.throw(function() {
          field.searchEnabled = false;
          field.saveOptionsSync();
        }, 'searchable option cannot be configured for the type uint');
        field.facetEnabled = false;
        assert.throw(function() {
          field.facetEnabled = true;
          field.saveOptionsSync();
        }, 'facet option cannot be configured for the type uint');
        field.resultEnabled = true;
        assert.throw(function() {
          field.resultEnabled = false;
          field.saveOptionsSync();
        }, 'returnable option cannot be configured for the type uint');
      });

      test('create literal field with options', function() {
        var field = new IndexField('product', domain).setType('literal');
        assert.equal('', field.options);

        field.searchEnabled = true;
        field.facetEnabled = true;
        field.createSync();

        field = new IndexField('product', domain); // reset instance from database
        assert.equal('Search Facet', field.options);
      });

      test('create literal field with conflicting options', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.searchEnabled = true;
        field.facetEnabled = true;
        assert.throw(function() {
          field.resultEnabled = true;
          field.saveOptionsSync();
        }, ' Error defining field: product. '+
             'An IndexField may not be both FacetEnabled and ResultEnabled');
      });

      test('update literal field with options', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.createSync();
        assert.equal('', field.options);

        field.searchEnabled = true;
        field.resultEnabled = true;
        field.saveOptionsSync();

        field = new IndexField('product', domain); // reset instance from database
        assert.equal('Search Result', field.options);
      });

      test('setting default search field', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.createSync();

        field.defaultSearchField = true;
        field.saveOptionsSync();
        assert.equal(domain.defaultSearchField,
                     domain.getIndexField('product'));

        field.defaultSearchField = false;
        field.saveOptionsSync();
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      });

      test('auto-remove default search field', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.createSync();
        field.defaultSearchField = true;
        field.saveOptionsSync();
        assert.equal(domain.defaultSearchField,
                     domain.getIndexField('product'));

        field.deleteSync();
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      });
    });

    suite('database modifications', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain('companies', context);
        domain.createSync();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      function getNoColumnDump() {
        return 'table_create ' + domain.tableName +  ' ' +
                 'TABLE_PAT_KEY ShortText\n' +
               'table_create ' + domain.configurationsTableName +  ' ' +
                 'TABLE_HASH_KEY ShortText\n' +
               'column_create ' + domain.configurationsTableName +  ' ' +
                 'value COLUMN_SCALAR ShortText\n' +
               'table_create ' + domain.termsTableName + ' ' +
                 'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                 '--default_tokenizer TokenBigram';
      }                       

      test('createSync for text field', function() {
        var field = new IndexField('name', domain);
        assert.isFalse(field.exists());

        field.type = 'text';
        assert.isFalse(field.exists());

        field.createSync();
        assert.isTrue(field.exists());
        assert.isFalse(field.multipleValues);

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = 'table_create ' + domain.tableName +  ' ' +
                         'TABLE_PAT_KEY ShortText\n' +
                       'column_create ' + domain.tableName + ' ' +
                         field.columnName + ' COLUMN_SCALAR ShortText\n' +
                       'table_create ' + domain.configurationsTableName +  ' ' +
                         'TABLE_HASH_KEY ShortText\n' +
                       'column_create ' + domain.configurationsTableName +  ' ' +
                         'value COLUMN_SCALAR ShortText\n' +
                       'table_create ' + domain.termsTableName + ' ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'column_create ' + domain.termsTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName;
        assert.equal(dump, expected);
      });

      test('deleteSync for text field', function() {
        var field = new IndexField('name', domain).setType('text');
        field.createSync();
        assert.isTrue(field.exists());

        field.deleteSync();
        assert.isFalse(field.exists());

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = getNoColumnDump();
        assert.equal(dump, expected);
      });

      test('createSync for uint field', function() {
        var field = new IndexField('age', domain);
        assert.isFalse(field.exists());

        field.type = 'uint';
        assert.isFalse(field.exists());

        field.createSync();
        assert.isTrue(field.exists());
        assert.isFalse(field.multipleValues);

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = 'table_create ' + domain.tableName + ' ' +
                         'TABLE_PAT_KEY ShortText\n' +
                       'column_create ' + domain.tableName + ' ' +
                         field.columnName + ' COLUMN_SCALAR UInt32\n' +
                       'table_create ' + domain.configurationsTableName +  ' ' +
                         'TABLE_HASH_KEY ShortText\n' +
                       'column_create ' + domain.configurationsTableName +  ' ' +
                         'value COLUMN_SCALAR ShortText\n' +
                       'table_create ' + domain.termsTableName + ' ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create ' + field.indexTableName + ' ' +
                         'TABLE_PAT_KEY UInt32\n' +
                       'column_create ' + field.indexTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName;
        assert.equal(dump, expected);
      });

      test('deleteSync for uint field', function() {
        var field = new IndexField('age', domain).setType('uint');
        field.createSync();
        assert.isTrue(field.exists());

        field.deleteSync();
        assert.isFalse(field.exists());

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = getNoColumnDump();
        assert.equal(dump, expected);
      });

      test('createSync for literal field', function() {
        var field = new IndexField('product', domain);
        assert.isFalse(field.exists());

        field.type = 'literal';
        assert.isFalse(field.exists());

        field.createSync();
        assert.isTrue(field.exists());
        assert.isFalse(field.multipleValues);

        var dump = context.commandSync('dump', {
              tables: 'companies'
            });
        var expected = 'table_create ' + domain.tableName + ' ' +
                         'TABLE_PAT_KEY ShortText\n' +
                       'table_create ' + domain.configurationsTableName +  ' ' +
                         'TABLE_HASH_KEY ShortText\n' +
                       'column_create ' + domain.configurationsTableName +  ' ' +
                         'value COLUMN_SCALAR ShortText\n' +
                       'table_create ' + domain.termsTableName + ' ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'table_create ' + field.indexTableName + ' ' +
                         'TABLE_PAT_KEY ShortText\n' +
                       'column_create ' + field.indexTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName + '\n' +
                       'column_create ' + domain.tableName + ' ' +
                         field.columnName + ' COLUMN_SCALAR ' +
                         field.indexTableName;
        assert.equal(dump, expected);
      });

      test('deleteSync for literal field', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.createSync();
        assert.isTrue(field.exists());

        field.deleteSync();
        assert.isFalse(field.exists());

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = getNoColumnDump();
        assert.equal(dump, expected);
      });
    });

    suite('multiple values column', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain('companies', context);
        domain.createSync();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('createSync (multiple values)', function() {
        var field = new IndexField('name', domain).setType('text');
        assert.isFalse(field.exists());
        field.createSync(true);
        assert.isTrue(field.exists());
        assert.isTrue(field.multipleValues);

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expected = 'table_create ' + domain.tableName +  ' ' +
                         'TABLE_PAT_KEY ShortText\n' +
                       'column_create ' + domain.tableName + ' ' +
                         field.columnName + ' COLUMN_VECTOR ShortText\n' +
                       'table_create ' + domain.configurationsTableName +  ' ' +
                         'TABLE_HASH_KEY ShortText\n' +
                       'column_create ' + domain.configurationsTableName +  ' ' +
                         'value COLUMN_SCALAR ShortText\n' +
                       'table_create ' + domain.termsTableName + ' ' +
                         'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                         '--default_tokenizer TokenBigram\n' +
                       'column_create ' + domain.termsTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName;
        assert.equal(dump, expected);
      });

      test('upgradeToMultipleValuesSync', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.createSync();
        assert.isFalse(field.multipleValues);

        field.domain.loadSync([
          { id: 'id1', product: 'groonga' },
          { id: 'id2', product: 'nroonga' }
        ]);

        field.upgradeToMultipleValuesSync();
        assert.isTrue(field.exists());
        assert.isTrue(field.multipleValues);

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', product: ['groonga'] },
              { id: 'id2', product: ['nroonga'] }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });
    });

    suite('dynamic change of field type', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain('companies', context);
        domain.createSync();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('for non-existing field', function() {
        var product = new IndexField('product', domain);
        product.type = 'text';
        assert.equal(product.type, 'text');
        product.type = 'literal';
        assert.equal(product.type, 'literal');
        product.createSync();
      });

      test('for existing field (text to literal)', function() {
        var field = new IndexField('product', domain).setType('text').createSync();
        assert.equal(field.type, 'text');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', product: 'groonga' },
          { id: 'id2', product: 'nroonga' }
        ]);

        field.type = 'literal';
        assert.equal(field.type, 'literal');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', product: 'groonga' },
              { id: 'id2', product: 'nroonga' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (literal to text)', function() {
        var field = new IndexField('product', domain).setType('literal').createSync();
        assert.equal(field.type, 'literal');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', product: 'groonga' },
          { id: 'id2', product: 'nroonga' }
        ]);

        field.type = 'text';
        assert.isFalse(field.multipleValues);
        assert.equal(field.type, 'text');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', product: 'groonga' },
              { id: 'id2', product: 'nroonga' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (text to uint)', function() {
        var field = new IndexField('age', domain).setType('text').createSync();
        assert.equal(field.type, 'text');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: '1' },
          { id: 'id2', age: '2' },
          { id: 'id3', age: 'a' }
        ]);

        field.type = 'uint';
        assert.isFalse(field.multipleValues);
        assert.equal(field.type, 'uint');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: 1 },
              { id: 'id2', age: 2 },
              { id: 'id3', age: 0 }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (uint to text)', function() {
        var field = new IndexField('age', domain).setType('uint').createSync();
        assert.equal(field.type, 'uint');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: 1 },
          { id: 'id2', age: 2 }
        ]);

        field.type = 'text';
        assert.isFalse(field.multipleValues);
        assert.equal(field.type, 'text');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: '1' },
              { id: 'id2', age: '2' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (literal to uint)', function() {
        var field = new IndexField('age', domain).setType('literal').createSync();
        assert.equal(field.type, 'literal');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: '1' },
          { id: 'id2', age: '2' },
          { id: 'id3', age: 'a' }
        ]);

        field.type = 'uint';
        assert.isFalse(field.multipleValues);
        assert.equal(field.type, 'uint');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: 1 },
              { id: 'id2', age: 2 },
              { id: 'id3', age: 0 }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (uint to literal)', function() {
        var field = new IndexField('age', domain).setType('uint').createSync();
        assert.equal(field.type, 'uint');
        assert.isFalse(field.multipleValues);
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: 1 },
          { id: 'id2', age: 2 }
        ]);

        field.type = 'literal';
        assert.isFalse(field.multipleValues);
        assert.equal(field.type, 'literal');

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: '1' },
              { id: 'id2', age: '2' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });
    });
  });
});
