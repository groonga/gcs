var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var Translator = require('../lib/batch/translator').Translator;

var addBatches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
addBatches = JSON.parse(addBatches);
var deleteBatches = fs.readFileSync(__dirname + '/fixture/companies/delete.sdf.json', 'UTF-8');
deleteBatches = JSON.parse(deleteBatches);

suite('batch/translator/Translator (instance methods)', function() {
  var translator;

  setup(function() {
    translator = new Translator('test');
  });

  teardown(function() {
    translator = undefined;
  });

  test('addToLoad', function() {
    var batch = addBatches[0];
    var expected = {
          command: 'load',
          options: {
            table: 'test',
            values: JSON.stringify([{
              '_key': batch['id'],
              'name': batch['fields']['name'],
              'address': batch['fields']['address'],
              'email_address': batch['fields']['email_address'],
              'age': batch['fields']['age'],
              'product': batch['fields']['product']
            }])
          }
        };
    var translated = translator.addToLoad(batch);
    assert.deepEqual(translated, expected);
  });

  test('deleteToDelete', function() {
    var batch = deleteBatches[0];
    var expected = {
          command: 'delete',
          options: {
            table: 'test',
            key: batch['id']
          }
        };
    var translated = translator.deleteToDelete(batch);
    assert.deepEqual(translated, expected);
  });

  test('translateOne for add', function() {
    var batch = addBatches[0];
    var expected = {
          command: 'load',
          options: {
            table: 'test',
            values: JSON.stringify([{
              '_key': batch['id'],
              'name': batch['fields']['name'],
              'address': batch['fields']['address'],
              'email_address': batch['fields']['email_address'],
              'age': batch['fields']['age'],
              'product': batch['fields']['product']
            }])
          }
        };
    var translated = translator.translateOne(batch);
    assert.deepEqual(translated, expected);
  });

  test('translateOne for delete', function() {
    var batch = deleteBatches[0];
    var expected = {
          command: 'delete',
          options: {
            table: 'test',
            key: batch['id']
          }
        };
    var translated = translator.translateOne(batch);
    assert.deepEqual(translated, expected);
  });

  test('translate', function() {
    var batches = addBatches.slice(0, 2).concat(deleteBatches.slice(0, 1));
    var expected = [
          {
            command: 'load',
            options: {
              table: 'test',
              values: JSON.stringify([{
                '_key': batches[0]['id'],
                'name': batches[0]['fields']['name'],
                'address': batches[0]['fields']['address'],
                'email_address': batches[0]['fields']['email_address'],
                'age': batches[0]['fields']['age'],
                'product': batches[0]['fields']['product']
              }])
            }
          },
          {
            command: 'load',
            options: {
              table: 'test',
              values: JSON.stringify([{
                '_key': batches[1]['id'],
                'name': batches[1]['fields']['name'],
                'address': batches[1]['fields']['address'],
                'email_address': batches[1]['fields']['email_address'],
                'age': batches[1]['fields']['age'],
                'product': batches[1]['fields']['product']
              }])
            }
          },
          {
            command: 'delete',
            options: {
              table: 'test',
              key: batches[2]['id']
            }
          }
        ];
    var translated = translator.translate(batches);
    assert.deepEqual(translated, expected);
  });
});

suite('batch/translator/Translator (class methods)', function() {
  suite('commandToString', function() {
    test('load', function() {
      var batches = addBatches;
      var batch = batches[0];
      var command = {
            command: 'load',
            options: {
              table: 'test',
              values: JSON.stringify([{
                '_key': batch['id'],
                'name': batch['fields']['name'],
                'address': batch['fields']['address'],
                'email_address': batch['fields']['email_address']
              }])
            }
          };
      var expected = 'load --table test --values ' + command.options.values;
      var stringified = Translator.commandToString(command);
      assert.equal(stringified, expected);
    });

    test('delete', function() {
      var batches = deleteBatches;
      var batch = batches[0];
      var command = {
            command: 'delete',
            options: {
              table: 'test',
              key: batch['id']
            }
          };
      var expected = 'delete --table test --key ' + command.options.key;
      var stringified = Translator.commandToString(command);
      assert.equal(stringified, expected);
    });
  });

  suite('commandsToString', function() {
    test('load and delete', function() {
      var batches = addBatches.slice(0, 2).concat(deleteBatches.slice(0, 1));
      var commands = [
            {
              command: 'load',
              options: {
                table: 'test',
                values: JSON.stringify([{
                  '_key': batches[0]['id'],
                  'name': batches[0]['fields']['name'],
                  'address': batches[0]['fields']['address'],
                  'email_address': batches[0]['fields']['email_address']
                }])
              }
            },
            {
              command: 'load',
              options: {
                table: 'test',
                values: JSON.stringify([{
                  '_key': batches[1]['id'],
                  'name': batches[1]['fields']['name'],
                  'address': batches[1]['fields']['address'],
                  'email_address': batches[1]['fields']['email_address']
                }])
              }
            },
            {
              command: 'delete',
              options: {
                table: 'test',
                key: batches[2]['id']
              }
            }
          ];
      var expected = [
            'load --table test --values ' + commands[0].options.values,
            'load --table test --values ' + commands[1].options.values,
            'delete --table test --key ' + commands[2].options.key
          ].join('\n');
      var stringified = Translator.commandsToString(commands);
      assert.equal(stringified, expected);
    });
  });
});
