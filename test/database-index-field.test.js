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
      domain = new Domain({ name: 'testdomain', context: context });
      domain.id = Domain.DEFAULT_ID;
      domain.saveSync();
    });

    teardown(function() {
      domain = undefined;
      context = undefined;
      temporaryDatabase.teardown();
      temporaryDatabase = undefined;
    });

    test('lower case', function() {
      var field = new IndexField('valid', domain).setType('text').validate();
      assert.equal(field.columnName, 'valid');
    });

    test('lower case and number', function() {
      var field = new IndexField('valid123', domain).setType('text').validate();
      assert.equal(field.columnName, 'valid123');
    });

    test('lower case, number amd underscore', function() {
      var field = new IndexField('valid_123', domain).setType('text').validate();
      assert.equal(field.columnName, 'valid_123');
    });

    test('without name', function() {
      assert.throw(function() {
        var field = new IndexField('', domain).setType('text').validate();
      }, '2 validation errors detected: ' +
           'Value \'\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               IndexField.VALID_NAME_PATTERN + '; ' +
           'Value \'\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               IndexField.MINIMUM_NAME_LENGTH);
    });

    test('too long', function() {
      var name = 'abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789';
      assert.throw(function() {
        var field = new IndexField(name, domain).setType('text').validate();
      }, '1 validation error detected: ' +
           'Value \'' + name + '\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length less than or equal to ' +
               IndexField.MAXIMUM_NAME_LENGTH);
    });

    test('hyphen', function() {
      assert.throw(function() {
        var field = new IndexField('field-name', domain).setType('text').validate();
      }, '1 validation error detected: ' +
           'Value \'field-name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: [a-z][a-z0-9_]*');
    });

    test('underscore', function() {
      var field = new IndexField('field_name', domain).setType('text').validate();
      assert.equal(field.columnName, 'field_name');
    });

    test('upper case', function() {
      assert.throw(function() {
        var field = new IndexField('FieldName', domain).setType('text').validate();
      }, '1 validation error detected: ' +
           'Value \'FieldName\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               IndexField.VALID_NAME_PATTERN);
    });

    test('null type', function() {
      var field = new IndexField('foo', domain);
      assert.throw(function() {
        field.type = null;
        field.validate();
      }, '1 validation error detected: ' +
           'Value null at \'%TYPE_FIELD%\' failed to satisfy constraint: ' +
             'Member must not be null');
    });

    test('unknown type', function() {
      var field = new IndexField('foo', domain);
      assert.throw(function() {
        field.type = 'unknown';
        field.validate();
      }, '1 validation error detected: ' +
           'Value \'unknown\' at \'%TYPE_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy enum value set: [text, literal, uint]');
    });

    test('indexTableName', function() {
      var field = new IndexField('valid_123', domain).setType('text').validate();
      assert.equal(field.indexTableName,
                   'testdomain_' + Domain.DEFAULT_ID + '_' +
                     Domain.INDEX_SUFFIX + '_valid_123');
    });

    test('fieldTypeToColumnType (text)', function() {
      var field = new IndexField('valid_123', domain).setType('text').validate();
      assert.equal(field.fieldTypeToColumnType('text'),
                   'ShortText');
    });

    test('fieldTypeToColumnType (uint)', function() {
      var field = new IndexField('valid_123', domain).setType('text').validate();
      assert.equal(field.fieldTypeToColumnType('uint'),
                   'UInt32');
    });

    test('fieldTypeToColumnType (literal)', function() {
      var field = new IndexField('valid_123', domain).setType('text').validate();
      assert.equal(field.fieldTypeToColumnType('literal'),
                   'testdomain_' + Domain.DEFAULT_ID + '_' +
                     Domain.INDEX_SUFFIX + '_valid_123');
    });

    test('initial status (text)', function() {
      var field = new IndexField('text', domain);
      field.type = 'text';
      field.validate();
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
      field.validate();
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
      field.validate();
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
      var textField =    new IndexField('name', domain).setType('text').saveSync();
      var uintField =    new IndexField('age', domain).setType('uint').saveSync();
      var literalField = new IndexField('product', domain).setType('literal').saveSync();
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
        domain = new Domain({ name: 'companies', context: context });
      });

      teardown(function() {
        domain = undefined;
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('exists, for existing field', function() {
        var field = new IndexField('name', domain);
        assert.isTrue(field.exists());
      });

      test('exists, for non-existing field', function() {
        var field = new IndexField('unknown', domain);
        assert.isFalse(field.exists());
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

    suite('major options', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('create text field with options', function() {
        var field = new IndexField('name', domain).setType('text');
        assert.equal('Search', field.options);

        field.facetEnabled = true;
        field.saveSync();

        field = new IndexField('name', domain); // reset instance from database
        assert.equal('Search Facet', field.options);
      });

      test('create text field with conflicting options', function() {
        var field = new IndexField('name', domain).setType('text').saveSync();
        field.facetEnabled = true;
        assert.throw(function() {
          field.resultEnabled = true;
          field.saveSync();
        }, 'Error defining field: name. '+
             'An IndexField may not be both FacetEnabled and ResultEnabled');
      });

      test('update text field with options', function() {
        var field = new IndexField('name', domain).setType('text');
        field.saveSync();
        assert.equal('Search', field.options);

        field.resultEnabled = true;
        field.saveSync();

        field = new IndexField('name', domain); // reset instance from database
        assert.equal('Search Result', field.options);
      });

      test('invalid modification of options for text field', function() {
        var field = new IndexField('name', domain).setType('text');
        field.saveSync();
        field.searchEnabled = true;
        assert.throw(function() {
          field.searchEnabled = false;
          field.saveSync();
        }, 'searchable option cannot be configured for the type text');
      });

      test('invalid modification of options for uint field', function() {
        var field = new IndexField('age', domain).setType('uint');
        field.saveSync();
        field.searchEnabled = true;
        assert.throw(function() {
          field.searchEnabled = false;
          field.saveSync();
        }, 'searchable option cannot be configured for the type uint');
        field.facetEnabled = false;
        assert.throw(function() {
          field.facetEnabled = true;
          field.saveSync();
        }, 'facet option cannot be configured for the type uint');
        field.resultEnabled = true;
        assert.throw(function() {
          field.resultEnabled = false;
          field.saveSync();
        }, 'returnable option cannot be configured for the type uint');
      });

      test('create literal field with options', function() {
        var field = new IndexField('product', domain).setType('literal');
        assert.equal('', field.options);

        field.searchEnabled = true;
        field.facetEnabled = true;
        field.saveSync();

        field = new IndexField('product', domain); // reset instance from database
        assert.equal('Search Facet', field.options);
      });

      test('create literal field with conflicting options', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.searchEnabled = true;
        field.facetEnabled = true;
        assert.throw(function() {
          field.resultEnabled = true;
          field.saveSync();
        }, 'Error defining field: product. '+
             'An IndexField may not be both FacetEnabled and ResultEnabled');
      });

      test('update literal field with options', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.saveSync();
        assert.equal('', field.options);

        field.searchEnabled = true;
        field.resultEnabled = true;
        field.saveSync();

        field = new IndexField('product', domain); // reset instance from database
        assert.equal('Search Result', field.options);
      });

      test('setting default search field', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.saveSync();

        field.defaultSearchField = true;
        field.saveSync();
        assert.equal(domain.defaultSearchField,
                     domain.getIndexField('product'));

        field.defaultSearchField = false;
        field.saveSync();
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      });

      test('auto-remove default search field', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.saveSync();
        field.defaultSearchField = true;
        field.saveSync();
        assert.equal(domain.defaultSearchField,
                     domain.getIndexField('product'));

        field.deleteSync();
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      });
    });

    suite('full options', function() {
      var temporaryDatabase;
      var context;
      var domain;
      var field;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
        field = domain.getIndexField('field').setType('text');
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
        field = undefined;
      });

      test('initial state', function() {
        var actual = {
              hasAnyOption:     field.hasAnyOption(),
              getAllOptions:    {},
              getAllRawOptions: {}
            };
        var expected = {
              hasAnyOption:     false,
              getAllOptions:    {},
              getAllRawOptions: {}
            };
        assert.deepEqual(actual, expected);
      });

      test('get and set', function() {
        var anotherInstance = new IndexField('field', domain);

        field.setOption('FooBar', 'true');
        assert.deepEqual({ source:  field.getOption('FooBar'),
                           another: anotherInstance.getOption('FooBar') },
                         { source:  'true',
                           another: undefined });

        field.saveOptions();
        assert.deepEqual({ source:  field.getOption('FooBar'),
                           another: anotherInstance.getOption('FooBar') },
                         { source:  'true',
                           another: 'true' });
      });

      test('boolean option', function() {
        field.setOption('TrueOption', 'true');
        field.setOption('FalseOption', 'false');
        field.setOption('NumberOption', '1');
        field.setOption('TextOption', 'foobar');
        assert.deepEqual({ rawTrue:       field.getOption('TrueOption'),
                           booleanTrue:   field.getBooleanOption('TrueOption'),
                           rawFalse:      field.getOption('FalseOption'),
                           booleanFalse:  field.getBooleanOption('FalseOption'),
                           rawNumber:     field.getOption('NumberOption'),
                           booleanNumber: field.getBooleanOption('NumberOption'),
                           rawText:       field.getOption('TextOption'),
                           booleanText:   field.getBooleanOption('TextOption') },
                         { rawTrue:       'true',
                           booleanTrue:   true,
                           rawFalse:      'false',
                           booleanFalse:  false,
                           rawNumber:     '1',
                           booleanNumber: false,
                           rawText:       'foobar',
                           booleanText:   false });
      });

      test('hasAnyOption', function() {
        var anotherInstance = new IndexField('field', domain);

        field.setOption('FooBar', 'true');
        assert.deepEqual({ source:  field.hasAnyOption(),
                           another: anotherInstance.hasAnyOption() },
                         { source:  true,
                           another: false });

        field.saveOptions();
        assert.deepEqual({ source:  field.hasAnyOption(),
                           another: anotherInstance.hasAnyOption() },
                         { source:  true,
                           another: true });
      });

      test('setOptions', function() {
        field.setOptions({
          Option1: 'true',
          Option2: '0'
        });
        var actual = {
              Option1: field.getOption('Option1'),
              Option2: field.getOption('Option2')
            };
        var expected = {
              Option1: 'true',
              Option2: '0'
            };
        assert.deepEqual(actual, expected);

        field.saveOptions();
        actual = {
          Option1: field.getOption('Option1'),
          Option2: field.getOption('Option2')
        };
        assert.deepEqual(actual, expected);
      });

      test('getAllOptions', function() {
        field.setOption('Option1', 'false');
        field.setOption('Option2', '1');
        var actual = field.getAllOptions();
        var expected = {
              Option1: 'false',
              Option2: '1'
            };
        assert.deepEqual(actual, expected);

        field.saveOptions();
        actual = field.getAllOptions();
        assert.deepEqual(actual, expected);
      });

      test('clearAllOptions', function() {
        field.setOption('Option1', 'false');
        field.setOption('Option2', '1');
        field.clearAllOptions();
        assert.deepEqual(field.getAllOptions(), {});

        field.setOption('Option1', 'false');
        field.setOption('Option2', '1');
        field.saveOptions();
        field.clearAllOptions();
        assert.deepEqual(field.getAllOptions(), {});
      });
    });

    suite('database modifications', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
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
                 'TABLE_PAT_KEY ShortText ' +
                 '--default_tokenizer TokenBigram ' +
                 '--normalizer NormalizerAuto';
      }

      test('createSync for text field', function() {
        var field = new IndexField('name', domain);
        assert.isFalse(field.exists());

        field.type = 'text';
        assert.isFalse(field.exists());

        field.saveSync();
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
                         'TABLE_PAT_KEY ShortText ' +
                         '--default_tokenizer TokenBigram ' +
                         '--normalizer NormalizerAuto\n' +
                       'column_create ' + domain.termsTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName;
        assert.equal(dump, expected);
      });

      test('deleteSync for text field', function() {
        var field = new IndexField('name', domain).setType('text');
        field.saveSync();
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
                         'TABLE_PAT_KEY ShortText ' +
                         '--default_tokenizer TokenBigram ' +
                         '--normalizer NormalizerAuto\n' +
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
        field.saveSync();
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
                         'TABLE_PAT_KEY ShortText ' +
                         '--default_tokenizer TokenBigram ' +
                         '--normalizer NormalizerAuto\n' +
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
        field.saveSync();
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
        domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
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
                         'TABLE_PAT_KEY ShortText ' +
                         '--default_tokenizer TokenBigram ' +
                         '--normalizer NormalizerAuto\n' +
                       'column_create ' + domain.termsTableName + ' ' +
                         field.indexColumnName + ' ' +
                         'COLUMN_INDEX|WITH_POSITION ' + domain.tableName +
                         ' ' + field.columnName;
        assert.equal(dump, expected);
      });

      test('upgradeToMultipleValuesSync', function() {
        var field = new IndexField('product', domain).setType('literal');
        field.saveSync();
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
        domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
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
      });

      test('for existing field (text to literal)', function() {
        var field = new IndexField('product', domain).setType('text').saveSync();
        assert.equal(field.type, 'text');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', product: 'groonga' },
          { id: 'id2', product: 'nroonga' }
        ]);

        field.type = 'literal';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'literal', actual: 'text' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'literal', actual: 'literal' });

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', product: 'groonga' },
              { id: 'id2', product: 'nroonga' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (literal to text)', function() {
        var field = new IndexField('product', domain).setType('literal').saveSync();
        assert.equal(field.type, 'literal');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', product: 'groonga' },
          { id: 'id2', product: 'nroonga' }
        ]);

        field.type = 'text';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'text', actual: 'literal' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'text', actual: 'text' });
        assert.isFalse(field.multipleValues);

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', product: 'groonga' },
              { id: 'id2', product: 'nroonga' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (text to uint)', function() {
        var field = new IndexField('age', domain).setType('text').saveSync();
        assert.equal(field.type, 'text');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: '1' },
          { id: 'id2', age: '2' },
          { id: 'id3', age: 'a' }
        ]);

        field.type = 'uint';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'uint', actual: 'text' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'uint', actual: 'uint' });
        assert.isFalse(field.multipleValues);

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: 1 },
              { id: 'id2', age: 2 },
              { id: 'id3', age: 0 }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (uint to text)', function() {
        var field = new IndexField('age', domain).setType('uint').saveSync();
        assert.equal(field.type, 'uint');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: 1 },
          { id: 'id2', age: 2 }
        ]);

        field.type = 'text';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'text', actual: 'uint' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'text', actual: 'text' });
        assert.isFalse(field.multipleValues);

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: '1' },
              { id: 'id2', age: '2' }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (literal to uint)', function() {
        var field = new IndexField('age', domain).setType('literal').saveSync();
        assert.equal(field.type, 'literal');
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: '1' },
          { id: 'id2', age: '2' },
          { id: 'id3', age: 'a' }
        ]);

        field.type = 'uint';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'uint', actual: 'literal' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'uint', actual: 'uint' });
        assert.isFalse(field.multipleValues);

        var actualDump = field.domain.dumpSync();
        var expectedDump = [
              { id: 'id1', age: 1 },
              { id: 'id2', age: 2 },
              { id: 'id3', age: 0 }
            ];
        assert.deepEqual(actualDump, expectedDump);
      });

      test('for existing field (uint to literal)', function() {
        var field = new IndexField('age', domain).setType('uint').saveSync();
        assert.equal(field.type, 'uint');
        assert.isFalse(field.multipleValues);
        assert.isTrue(field.exists());

        field.domain.loadSync([
          { id: 'id1', age: 1 },
          { id: 'id2', age: 2 }
        ]);

        field.type = 'literal';
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'literal', actual: 'uint' });

        field.saveSync();
        assert.deepEqual({ type: field.type, actual: field.actualType },
                         { type: 'literal', actual: 'literal' });
        assert.isFalse(field.multipleValues);

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
