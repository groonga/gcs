var utils = require('./test-utils');

var assert = require('chai').assert;

var Domain = require('../lib/database/domain').Domain;

suite('database', function() {
  suite('Domain', function() {
    test('initial status', function() {
      var domain = new Domain('newdomain').validate();
      assert.deepEqual({
        searchableDocumentsCount: domain.searchableDocumentsCount,
        requiresIndexDocuments:   domain.requiresIndexDocuments,
        searchInstanceCount:      domain.searchInstanceCount,
        searchPartitionCount:     domain.searchPartitionCount,
        processing:               domain.processing
      }, {
        searchableDocumentsCount: 0,
        requiresIndexDocuments:   false,
        searchInstanceCount:      0,
        searchPartitionCount:     0,
        processing:               false
      });
    });

    test('lower case', function() {
      var domain = new Domain('valid');
      domain.id = Domain.DEFAULT_ID;
      domain.validate();
      assert.equal(domain.tableName,
                   'valid_' + Domain.DEFAULT_ID);
    });

    test('lower case and number', function() {
      var domain = new Domain('valid123');
      domain.id = Domain.DEFAULT_ID;
      domain.validate();
      assert.equal(domain.tableName,
                   'valid123_' + Domain.DEFAULT_ID);
    });

    test('without name', function() {
      assert.throw(function() {
        var domain = new Domain('').validate();
      }, '2 validation errors detected: ' +
           'Value \'\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               Domain.VALID_NAME_PATTERN + '; ' +
           'Value \'\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               Domain.MINIMUM_NAME_LENGTH);
    });

    test('too short (1 character)', function() {
      assert.throw(function() {
        var domain = new Domain('v').validate();
      }, '2 validation errors detected: ' +
           'Value \'v\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               Domain.VALID_NAME_PATTERN + '; ' +
           'Value \'v\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               Domain.MINIMUM_NAME_LENGTH);
    });

    test('too short (2 characters)', function() {
      assert.throw(function() {
        var domain = new Domain('va').validate();
      }, '1 validation error detected: ' +
           'Value \'va\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length greater than or equal to ' +
               Domain.MINIMUM_NAME_LENGTH);
    });

    test('too long', function() {
      var name = 'abcdefghijklmnopqrstuvwxyz0123456789';
      assert.throw(function() {
        var domain = new Domain(name).validate();
      }, '1 validation error detected: ' +
           'Value \'' + name + '\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must have length less than or equal to ' +
               Domain.MAXIMUM_NAME_LENGTH);
    });

    test('hyphen', function() {
      assert.throw(function() {
        var domain = new Domain('domain-name').validate();
      }, '1 validation error detected: ' +
           'Value \'domain_name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member cannot include these characters: \'-\'');
    });

    test('underscore', function() {
      assert.throw(function() {
        var domain = new Domain('domain_name').validate();
      }, '1 validation error detected: ' +
           'Value \'domain_name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               Domain.VALID_NAME_PATTERN);
    });

    test('upper case', function() {
      assert.throw(function() {
        var domain = new Domain('DomainName').validate();
      }, '1 validation error detected: ' +
           'Value \'%NAME_FIELD%\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
             'Member must satisfy regular expression pattern: ' +
               Domain.VALID_NAME_PATTERN);
    });

    test('termsTableName', function() {
      var domain = new Domain('valid123');
      domain.id = Domain.DEFAULT_ID;
      domain.validate();
      assert.equal(domain.termsTableName,
                   'valid123_' + Domain.DEFAULT_ID + '_index_BigramTerms');
    });

    suite('from query parameter', function() {
      test('not supported', function() {
        assert.throw(function() {
          var request = { query: { DomainName: 'test0123' } };
          var domain = new Domain({ source: request }).validate();
        }, /no domain name/);
      });
    });

    suite('getNameAndIdFromHost', function() {
      test('valid, doc, lower case and number', function() {
        var host = 'doc-test0123-id0123.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: 'test0123', id: 'id0123' });
      });

      test('valid, search, lower case and number', function() {
        var host = 'search-test0123-id0123.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: 'test0123', id: 'id0123' });
      });

      test('valid, doc, lower case, hyphen and number', function() {
        var host = 'doc-test-0123-id0123.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: 'test-0123', id: 'id0123' });
      });

      test('valid, search, lower case, hyphen and number', function() {
        var host = 'search-test-0123-id0123.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: 'test-0123', id: 'id0123' });
      });

      test('valid, search, lower case, hyphen and number, deep subdomain including region identifier', function() {
        var host = 'search-test-0123-id0123.us-east-1.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: 'test-0123', id: 'id0123' });
      });

      test('invalid', function() {
        var host = 'cloudsearch.example.com';
        var nameAndId = Domain.getNameAndIdFromHost(host);
        assert.deepEqual(nameAndId, { name: '', id: '' });
      });
    });

    suite('getNameAndIdFromPath', function() {
      test('valid, lower case and number', function() {
        var path = '/gcs/test0123-id0123/';
        var nameAndId = Domain.getNameAndIdFromPath(path);
        assert.deepEqual(nameAndId, { name: 'test0123', id: 'id0123' });
      });

      test('valid, lower case, hyphen and number', function() {
        var path = '/gcs/test-0123-id0123/';
        var nameAndId = Domain.getNameAndIdFromPath(path);
        assert.deepEqual(nameAndId, { name: 'test-0123', id: 'id0123' });
      });

      test('invalid', function() {
        var path = '/gcs';
        var nameAndId = Domain.getNameAndIdFromPath(path);
        assert.deepEqual(nameAndId, { name: '', id: '' });
      });
    });

    suite('auto detection', function() {
      test('from host, valid', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host } };
        var domain = new Domain({ source: request }).validate();
        assert.deepEqual({ name: domain.name, id: domain.id },
                         { name: 'test0123', id: 'id0123' });
      });

      test('from host, invalid', function() {
        assert.throw(function() {
          var host = 'doc-domain_name-id0123.example.com';
          var request = { headers: { host: host } };
          var domain = new Domain({ source: request }).validate();
        }, '1 validation error detected: ' +
             'Value \'domain_name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
               'Member must satisfy regular expression pattern: ' +
                 Domain.VALID_NAME_PATTERN);
      });

      test('from path, valid', function() {
        var host = 'example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test0123-id0123' };
        var domain = new Domain({ source: request }).validate();
        assert.deepEqual({ name: domain.name, id: domain.id },
                         { name: 'test0123', id: 'id0123' });
      });

      test('from path, invalid', function() {
        assert.throw(function() {
          var host = 'example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test_0123-id0123' };
          var domain = new Domain({ source: request }).validate();
        }, '1 validation error detected: ' +
             'Value \'domain_name\' at \'%NAME_FIELD%\' failed to satisfy constraint: ' +
               'Member must satisfy regular expression pattern: ' +
                 Domain.VALID_NAME_PATTERN);
      });

      test('host vs path', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test4567-id4567' };
        var domain = new Domain({ source: request }).validate();
        assert.deepEqual({ name: domain.name, id: domain.id },
                         { name: 'test0123', id: 'id0123' });
      });

      test('option vs host vs path', function() {
        var host = 'doc-test0123-id0123.example.com';
        var request = { headers: { host: host },
                        url: '/gcs/test4567-id4567',
                        query: { DomainName: 'test890' } };
        var domain = new Domain({ source: request }).validate();
        assert.equal(domain.name, 'test0123');
      });
    });

    suite('document endpoint', function() {
      var domain;
      setup(function() {
        domain = new Domain('valid').setId(Domain.DEFAULT_ID).validate();
      });

      test('arn', function() {
        assert.equal(domain.documentsArn,
                     'arn:aws:cs:us-east-1:' + domain.creationDate.getTime() + ':doc/valid');
      });
    });

    suite('getSearchEndpoint', function() {
      var domain;
      setup(function() {
        domain = new Domain('valid').setId(Domain.DEFAULT_ID).validate();
      });

      test('arn', function() {
        assert.equal(domain.searchArn,
                     'arn:aws:cs:us-east-1:' + domain.creationDate.getTime() + ':search/valid');
      });
    });

    suite('getting data from database', function() {
      var temporaryDatabase;
      var context;
      var domain;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
        utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl-custom-id.grn');
        domain = new Domain({ name: 'companies', context: context });
      });

      teardown(function() {
        domain = undefined;
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('id for database (known table)', function() {
        assert.deepEqual({ id: domain.id, exists: domain.exists() },
                         { id: 'id0123', exists: true });
      });

      test('id for database (unknown, new table)', function() {
        domain = new Domain({ name: 'unknown', context: context });
        assert.equal(typeof domain.id, 'string');
        assert.deepEqual({ idLength:     domain.id.length,
                           normalizedId: domain.id.replace(/[1-9a-z]/g, '0'),
                           exists:       domain.exists() },
                         { idLength:     Domain.DEFAULT_ID.length,
                           normalizedId: Domain.DEFAULT_ID,
                           exists:       false });
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

      test('facetReturnableIndexFields', function() {
        domain.getIndexField('address').facetEnabled = false;
        domain.getIndexField('description').facetEnabled = false;
        domain.getIndexField('email_address').facetEnabled = true;
        domain.getIndexField('name').facetEnabled = true;
        domain.getIndexField('product').facetEnabled = true;
        var fields = domain.facetReturnableIndexFields;
        fields = fields.map(function(field) {
          return {
            name: field.name,
            type: field.type
          };
        });
        var expected = [
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

      test('resultReturnableIndexFields', function() {
        domain.getIndexField('address').resultEnabled = true;
        domain.getIndexField('description').resultEnabled = true;
        domain.getIndexField('email_address').resultEnabled = true;
        domain.getIndexField('name').resultEnabled = false;
        domain.getIndexField('product').resultEnabled = false;
        var fields = domain.resultReturnableIndexFields;
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
                type: 'text'}
            ];
        function sortFields(a, b) {
          return a.name - b.name;
        }
        assert.deepEqual(fields.sort(sortFields), expected.sort(sortFields));
      });

      test('searchableIndexFields', function() {
        domain.getIndexField('product').searchEnabled = false;
        var fields = domain.searchableIndexFields;
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
                type: 'text'}
            ];
        function sortFields(a, b) {
          return a.name - b.name;
        }
        assert.deepEqual(fields.sort(sortFields), expected.sort(sortFields));
      });

      test('setting default search field (instance)', function() {
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
        var nameField = domain.getIndexField('name');
        domain.defaultSearchField = nameField;
        assert.equal(domain.defaultSearchField, nameField);

        var anotherDomainInstance = new Domain({ name: 'companies', context: context });
        assert.equal(anotherDomainInstance.defaultSearchField,
                     anotherDomainInstance.getIndexField('name'));
      });

      test('setting default search field (text)', function() {
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
        domain.defaultSearchField = 'name';
        assert.equal(domain.defaultSearchField, domain.getIndexField('name'));

        var anotherDomainInstance = new Domain({ name: 'companies', context: context });
        assert.equal(anotherDomainInstance.defaultSearchField,
                     anotherDomainInstance.getIndexField('name'));
      });

      test('setting default search field (unknown field)', function() {
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
        domain.defaultSearchField = 'unknown';
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);
      });

      test('removing default search field', function() {
        var nameField = domain.getIndexField('name');
        domain.defaultSearchField = nameField;
        assert.equal(domain.defaultSearchField, nameField);

        domain.defaultSearchField = null;
        assert.isTrue(domain.defaultSearchField === null,
                      domain.defaultSearchField);

        var anotherDomainInstance = new Domain({ name: 'companies', context: context });
        assert.equal(anotherDomainInstance.defaultSearchField, null);
      });
    });

    suite('database modifications', function() {
      var temporaryDatabase;
      var context;

      setup(function() {
        temporaryDatabase = utils.createTemporaryDatabase();
        context = temporaryDatabase.get();
      });

      teardown(function() {
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('createSync', function() {
        var domain = new Domain({ name: 'companies', context: context });
        assert.isFalse(domain.exists());

        domain.createSync();
        assert.isTrue(domain.exists());

        var dump = context.commandSync('dump', {
              tables: domain.tableName
            });
        var expectedDump = 'table_create ' + domain.tableName +  ' ' +
                             'TABLE_PAT_KEY ShortText\n' +
                           'table_create ' + domain.configurationsTableName +  ' ' +
                             'TABLE_HASH_KEY ShortText\n' +
                           'column_create ' + domain.configurationsTableName +  ' ' +
                             'value COLUMN_SCALAR ShortText\n' +
                           'table_create ' + domain.termsTableName +  ' ' +
                             'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
                             '--default_tokenizer TokenBigram';
        assert.equal(dump, expectedDump);
      });

      test('createSync again', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.createSync();
        assert.throw(function() {
          domain.createSync();
        }, new RegExp(Domain.DOMAIN_ALREADY_EXISTS));
      });

      test('deleteSync', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
        assert.isTrue(domain.exists());

        domain.deleteSync();
        assert.isFalse(domain.exists());

        var dump = context.commandSync('dump');
        var expectedDump = '';
        assert.equal(dump, expectedDump);
      });

      test('deleteSync again', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.saveSync();
        domain.deleteSync();
        assert.throw(function() {
          domain.deleteSync();
        }, new RegExp(Domain.DOMAIN_DOES_NOT_EXIST));
      });

      test('updateSynonymsSync, initialize', function() {
        var domain = new Domain({ name: 'companies', context: context });
        assert.isFalse(domain.hasSynonymsTableSync());

        domain.updateSynonymsSync({
          tokio: ['tokyo'],
          dekkaido: 'hokkaido'
        });
        assert.isTrue(domain.hasSynonymsTableSync());

        var dumpExpected =
             'table_create ' + domain.tableName +  ' ' +
               'TABLE_PAT_KEY ShortText\n' +
             'table_create ' + domain.configurationsTableName +  ' ' +
               'TABLE_HASH_KEY ShortText\n' +
             'column_create ' + domain.configurationsTableName + ' ' +
               'value COLUMN_SCALAR ShortText\n' +
             'table_create ' + domain.termsTableName +  ' ' +
               'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
               '--default_tokenizer TokenBigram\n' +
             'table_create ' + domain.synonymsTableName +  ' ' +
               'TABLE_HASH_KEY|KEY_NORMALIZE ShortText\n' +
             'column_create ' + domain.synonymsTableName + ' ' +
               'synonyms COLUMN_VECTOR ShortText\n' +
             'load --table ' + domain.synonymsTableName + '\n' +
             '[\n' +
             '["_key","synonyms"],\n' +
             '["tokio",["tokyo"]],\n' +
             '["dekkaido",["hokkaido"]]\n' +
             ']';
        var dumpActual = context.commandSync('dump', {
              tables: domain.synonymsTableName
            });
        assert.equal(dumpActual, dumpExpected);
      });

      test('updateSynonymsSync, replace', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.updateSynonymsSync({
          tokio: ['tokyo'],
          dekkaido: 'hokkaido'
        });
        domain.updateSynonymsSync({
          tokio: ['tonkin']
        });

        var dumpExpected =
             'table_create ' + domain.tableName +  ' ' +
               'TABLE_PAT_KEY ShortText\n' +
             'table_create ' + domain.configurationsTableName +  ' ' +
               'TABLE_HASH_KEY ShortText\n' +
             'column_create ' + domain.configurationsTableName + ' ' +
               'value COLUMN_SCALAR ShortText\n' +
             'table_create ' + domain.termsTableName +  ' ' +
               'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
               '--default_tokenizer TokenBigram\n' +
             'table_create ' + domain.synonymsTableName +  ' ' +
               'TABLE_HASH_KEY|KEY_NORMALIZE ShortText\n' +
             'column_create ' + domain.synonymsTableName + ' ' +
               'synonyms COLUMN_VECTOR ShortText\n' +
             'load --table ' + domain.synonymsTableName + '\n' +
             '[\n' +
             '["_key","synonyms"],\n' +
             '["tokio",["tonkin"]]\n' +
             ']';
        var dumpActual = context.commandSync('dump', {
              tables: domain.synonymsTableName
            });
        assert.equal(dumpActual, dumpExpected);
      });

      test('getSynonymSync, existent', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.updateSynonymsSync({
          tokio: ['tonkin', 'tokyo']
        });

        assert.deepEqual(domain.getSynonymSync('tokio'), ['tonkin', 'tokyo']);
      });

      test('getSynonymSync, nonexistent', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.updateSynonymsSync({
          tokio: ['tonkin', 'tokyo']
        });

        assert.deepEqual(domain.getSynonymSync('hokkaido'), null);
      });

      test('getSynonymsSync', function() {
        var domain = new Domain({ name: 'companies', context: context });
        domain.updateSynonymsSync({
          tokio: ['tonkin', 'tokyo'],
          dekkaido: 'hokkaido'
        });

        var expectedSynonyms = {
              dekkaido: ['hokkaido'],
              tokio: ['tokyo', 'tonkin']
            };
        var synonyms = domain.getSynonymsSync();
        assert.deepEqual(synonyms, expectedSynonyms);
      });

      test('getSynonymsSync for new domain', function() {
        var domain = new Domain({ name: 'companies', context: context });
        var expectedSynonyms = {};
        var synonyms = domain.getSynonymsSync();
        assert.deepEqual(synonyms, expectedSynonyms);
      });

      test('getAll', function() {
        var domain3 = new Domain({ name: 'domain3', context: context });
        domain3.saveSync();

        var domain1 = new Domain({ name: 'domain1', context: context });
        domain1.saveSync();

        var domain2 = new Domain({ name: 'domain2', context: context });
        domain2.saveSync();

        var allDomains = Domain.getAll(context);
        assert.deepEqual(allDomains.map(function(domain) {
                           return domain.tableName;
                         }),
                         [
                           domain1.tableName,
                           domain2.tableName,
                           domain3.tableName
                         ]);
      });
    });

    suite('record operations (add, delete, dump, load)', function() {
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

      test('addDocumentSync', function() {
        var document = {
              id: 'id1',
              fields: {
                address: 'Shibuya, Tokyo, Japan',
                age: 1,
                description: '',
                email_address: 'info@razil.jp',
                name: 'Brazil',
                product: 'groonga'
              }
            };
        domain.addDocumentSync(document);

        var record = {
              id: 'id1',
              address: 'Shibuya, Tokyo, Japan',
              age: 1,
              description: '',
              email_address: 'info@razil.jp',
              name: 'Brazil',
              product: 'groonga'
            };
        assert.deepEqual(domain.dumpSync(), [record]);
      });

      test('deleteDocumentSync', function() {
        utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');
        domain.deleteDocumentSync('id1');

        var actualDump = domain.dumpSync();
        var found = actualDump.some(function(record) {
              return record.id == 'id1';
            });
        assert.isFalse(found, actualDump);
      });

      test('dumpSync for blank domain', function() {
        var actualDump = domain.dumpSync();
        assert.deepEqual(actualDump, []);
      });

      test('dumpSync', function() {
        utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');

        var actualDump = domain.dumpSync();
        assert.isTrue(Array.isArray(actualDump), actualDump);
        assert.equal(actualDump.length, 10, actualDump);

        var expectedDump = [
              { id: 'id1',
                address: 'Shibuya, Tokyo, Japan',
                age: 1,
                description: '',
                email_address: 'info@razil.jp',
                name: 'Brazil',
                product: 'groonga' },
              { id: 'id10',
                address: 'New York, United States',
                age: 10,
                description: '',
                email_address: '',
                name: 'U.S. Robots and Mechanical Men',
                product: 'ndr114' },
              { id: 'id2',
                address: 'Sapporo, Hokkaido, Japan',
                age: 2,
                description: '',
                email_address: 'info@enishi-tech.com',
                name: 'Enishi Tech Inc.',
                product: 'groonga' }
            ];
        assert.deepEqual(actualDump.slice(0, 3), expectedDump);
      });

      test('loadSync', function() {
        utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');

        var values = [
              { id: 'id10',
                description: 'updated',
                product: 'spd13' },
              { id: 'id11',
                description: 'new',
                name: 'Nergal Heavy Industries',
                product: 'nadesico' }
            ];
        domain.loadSync(values);

        var actualDump = domain.dumpSync();
        var expectedDump = [
              { id: 'id10',
                address: 'New York, United States',
                age: 10,
                description: 'updated',
                email_address: '',
                name: 'U.S. Robots and Mechanical Men',
                product: 'spd13' },
              { id: 'id11',
                address: '',
                age: 0,
                description: 'new',
                email_address: '',
                name: 'Nergal Heavy Industries',
                product: 'nadesico' }
            ];
        assert.deepEqual(actualDump.filter(function(record) {
                           return record.id == 'id10' || record.id == 'id11';
                         }),
                         expectedDump);
      });

      test('searchableDocumentsCount', function() {
        assert.equal(domain.searchableDocumentsCount, 0);

        utils.loadDumpFile(context, __dirname + '/fixture/companies/data.grn');
        assert.equal(domain.searchableDocumentsCount, 10);

        var values = [
              { id: 'id11',
                description: 'new',
                name: 'Nergal Heavy Industries',
                product: 'nadesico' }
            ];
        domain.loadSync(values);
        assert.equal(domain.searchableDocumentsCount, 11);
      });
    });

    suite('configuration operations', function() {
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
        domain = undefined;
        temporaryDatabase.teardown();
        temporaryDatabase = undefined;
      });

      test('', function() {
        domain.setConfiguration('key1_string', 'abc');
        domain.setConfiguration('key2_number', 123);
        domain.setConfiguration('key3_hash', { value: true });

        var dumpExpected =
             'table_create ' + domain.tableName +  ' ' +
               'TABLE_PAT_KEY ShortText\n' +
             'table_create ' + domain.configurationsTableName +  ' ' +
               'TABLE_HASH_KEY ShortText\n' +
             'column_create ' + domain.configurationsTableName + ' ' +
               'value COLUMN_SCALAR ShortText\n' +
             'table_create ' + domain.termsTableName +  ' ' +
               'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
               '--default_tokenizer TokenBigram\n' +
             'load --table ' + domain.configurationsTableName + '\n' +
             '[\n' +
             '["_key","value"],\n' +
             '["self_created_at","' + domain.getCreationDate('self').getTime() + '"],\n' +
             '["key1_string","\\"abc\\""],\n' +
             '["key2_number","123"],\n' +
             '["key3_hash","{\\"value\\":true}"]\n' +
             ']';
        var dumpActual = context.commandSync('dump', {
              tables: domain.configurationsTableName
            });
        assert.equal(dumpExpected, dumpActual);
      });

      test('getConfiguration', function() {
        var expectedValues = {
              string: 'abc',
              number: 123,
              hash: { value: true }
            };
        domain.setConfiguration('key1_string', expectedValues.string);
        domain.setConfiguration('key2_number', expectedValues.number);
        domain.setConfiguration('key3_hash', expectedValues.hash);

        var actualValues = {
              string: domain.getConfiguration('key1_string'),
              number: domain.getConfiguration('key2_number'),
              hash: domain.getConfiguration('key3_hash'),
            };
        assert.deepEqual(actualValues, expectedValues);
      });

      test('getConfiguration (undefined configuration)', function() {
        assert.deepEqual(undefined, domain.getConfiguration('unknown'));
      });

      test('deleteConfiguration', function() {
        domain.setConfiguration('key1_string', 'abc');
        domain.setConfiguration('key2_number', 123);
        domain.deleteConfiguration('key2_number');

        var dumpExpected =
             'table_create ' + domain.tableName +  ' ' +
               'TABLE_PAT_KEY ShortText\n' +
             'table_create ' + domain.configurationsTableName +  ' ' +
               'TABLE_HASH_KEY ShortText\n' +
             'column_create ' + domain.configurationsTableName + ' ' +
               'value COLUMN_SCALAR ShortText\n' +
             'table_create ' + domain.termsTableName +  ' ' +
               'TABLE_PAT_KEY|KEY_NORMALIZE ShortText ' +
               '--default_tokenizer TokenBigram\n' +
             'load --table ' + domain.configurationsTableName + '\n' +
             '[\n' +
             '["_key","value"],\n' +
             '["self_created_at","' + domain.getCreationDate('self').getTime() + '"],\n' +
             '["key1_string","\\"abc\\""]\n' +
             ']';
        var dumpActual = context.commandSync('dump', {
              tables: domain.configurationsTableName
            });
        assert.equal(dumpExpected, dumpActual);
      });
    });
  });
});
