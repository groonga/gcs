var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var Processor = require('../lib/batch/processor').Processor;
var Domain = require('../lib/database/domain').Domain;

var schemeDump = fs.readFileSync(__dirname + '/fixture/companies/ddl.grn', 'UTF-8').replace(/\s+$/, '');
var loadDump = fs.readFileSync(__dirname + '/fixture/companies/data.grn', 'UTF-8').replace(/\s+$/, '');
var deletedLoadDump = fs.readFileSync(__dirname + '/fixture/companies/data-deleted.grn', 'UTF-8').replace(/\s+$/, '');
var deleteDump = fs.readFileSync(__dirname + '/fixture/companies/delete.grn', 'UTF-8').replace(/\s+$/, '');


suite('batch/processor/Processor (instance methods)', function() {
  var processor;
  var context;
  var temporaryDatabase;

  setup(function() {
    temporaryDatabase = utils.createTemporaryDatabase();
    context = temporaryDatabase.get();
    utils.loadDumpFile(context, __dirname + '/fixture/companies/ddl.grn');

    processor = new Processor({
      databasePath: temporaryDatabase.path,
      context: context, // we must reuse the existing connection!
      domain: 'companies',
    });
  });

  teardown(function() {
    processor = undefined;
    temporaryDatabase.clear();
    temporaryDatabase.teardown();
    temporaryDatabase = undefined;
  });

  test('initialize', function() {
    assert.equal(processor.databasePath, temporaryDatabase.path);
  });

  function assertSuccess(result, adds, deletes, expectedDump) {
    var expected = {
          status: 'success',
          adds: adds,
          deletes: deletes
        };
    assert.deepEqual(result, expected);
    if (typeof expectedDump == 'string') { // grn dump
      var actualGrnDump = context.commandSync('dump', {
            tables: 'companies_00000000000000000000000000'
          });
      assert.equal(actualGrnDump, expectedDump);
    } else {
      var actualDump = processor.domain.dumpSync();
      assert.deepEqual(actualDump, expectedDump);
    }
  }

  test('load add-batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.load(batches)
      .next(function(result) {
        assertSuccess(result, 10, 0, schemeDump + '\n' + loadDump);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('loadSync add-batches', function() {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    var result = processor.loadSync(batches);
    assertSuccess(result, 10, 0, schemeDump + '\n' + loadDump);
  });

  test('loadSync: auto migration to multiple values field', function() {
    var field = processor.domain.getIndexField('product');
    assert.isFalse(field.multipleValues);

    var batches = fs.readFileSync(__dirname + '/fixture/companies/add-multiple-values.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    var result = processor.loadSync(batches);
    assert.isTrue(field.multipleValues);

    var dump = [
          { id: 'id1',
            name: 'Brazil',
            description: '',
            address: 'Shibuya, Tokyo, Japan',
            age: 1,
            email_address: 'info@razil.jp',
            product: ['moritapo','groonga'] },
          { id: 'id6',
            name: 'Omni Consumer Products',
            description: '',
            description: '',
            address: 'Detroit and Delta City, Michigan, United States',
            age: 6,
            email_address: '',
            product: ['robocop'] },
          { id: 'id10',
            name: 'U.S. Robots and Mechanical Men',
            description: '',
            address: 'New York, United States',
            age: 10,
            email_address: '',
            product: ['ndr114'] }
        ];
    assertSuccess(result, 10, 0, dump);
  });

  test('load delete-batches', function(done) {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    processor.load(batches)
      .next(function(result) {
        var batches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
        batches = JSON.parse(batches);
        return processor.load(batches)
      })
      .next(function(result) {
        assertSuccess(result, 0, 1, schemeDump + '\n' + deletedLoadDump);
        done();
      })
      .error(function(error) {
        done(error);
      });
  });

  test('loadSync delete-batches', function() {
    var adddBatches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    adddBatches = JSON.parse(adddBatches);
    processor.loadSync(adddBatches);
    var deleteBatches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
    deleteBatches = JSON.parse(deleteBatches);
    var result = processor.loadSync(deleteBatches);
    assertSuccess(result, 0, 1, schemeDump + '\n' + deletedLoadDump);
  });

  test('validation, valid batches', function() {
    var addBatches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
    var deleteBatches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
    var batches = JSON.parse(addBatches).concat(JSON.parse(deleteBatches));
    // assert.notThrow(function() {
      processor.validate(batches);
    // }, Processor.INVALID_BATCH);
    assert(true);
  });

  test('validation, invalid batches', function() {
    var batches = fs.readFileSync(__dirname + '/fixture/companies/invalid.sdf.json', 'UTF-8');
    batches = JSON.parse(batches);
    var actualError;
    assert.throw(function() {
      try {
        processor.validate(batches);
      } catch (error) {
        actualError = error;
        throw error;
      }
    }, Processor.INVALID_BATCH);

    var expected = {
          status: 'error',
          adds: 0,
          deletes: 0,
          errors: [
            { message: 'invalidfield: The field "unknown1" is unknown. ' +
                          '(available: address,age,description,' +
                          'email_address,name,product)' },
            { message: 'invalidfield: The field "unknown2" is unknown. ' +
                          '(available: address,age,description,' +
                          'email_address,name,product)' },
            { message: 'invalidfield: The field "name" is null.' },
            { message: 'nofields: You must specify "fields".' },
            { message: 'emptyfields: You must specify one or more fields to "fields".' }
          ]
        };
    assert.deepEqual(actualError.result, expected);
  });
});
