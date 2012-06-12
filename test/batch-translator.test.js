var utils = require('./test-utils');

var assert = require('chai').assert;

var Translator = require('../lib/batch/translator').Translator;

suite('batch/translator/Translator (instance methods)', function() {
  var translator;

  setup(function() {
    translator = new Translator('test');
  });

  teardown(function() {
    translator = undefined;
  });

  test('initialize', function() {
    assert.equal(translator.domain, 'test');
    assert.equal(translator.tableName, 'test');
  });

  test('addToLoad', function() {
    var batch = BATCH_ADD_MEAT_GUY;
    var expected = {
          command: 'load',
          options: {
            table: 'test',
            values: JSON.stringify([{
              '_key': batch['id'],
              'name': batch['fields']['name'],
              'birthday': batch['fields']['birthday'],
              'job': batch['fields']['job']
            }])
          }
        };
    var translated = translator.addToLoad(batch);
    assert.deepEqual(translated, expected);
  });

  test('translateOne for add', function() {
    var batch = BATCH_ADD_MEAT_GUY;
    var expected = {
          command: 'load',
          options: {
            table: 'test',
            values: JSON.stringify([{
              '_key': batch['id'],
              'name': batch['fields']['name'],
              'birthday': batch['fields']['birthday'],
              'job': batch['fields']['job']
            }])
          }
        };
    var translated = translator.translateOne(batch);
    assert.deepEqual(translated, expected);
  });

  test('translate', function() {
    var batches = BATCHES;
    var expected = [
          {
            command: 'load',
            options: {
              table: 'test',
              values: JSON.stringify([{
                '_key': batches[0]['id'],
                'name': batches[0]['fields']['name'],
                'birthday': batches[0]['fields']['birthday'],
                'job': batches[0]['fields']['job']
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
                'birthday': batches[1]['fields']['birthday'],
                'job': batches[1]['fields']['job']
              }])
            }
          }
        ];
    var translated = translator.translate(BATCHES);
    assert.deepEqual(translated, expected);
  });
});

suite('batch/translator/Translator (class methods)', function() {
  suite('commandToString', function() {
    test('load ', function() {
      var batch = BATCH_ADD_MEAT_GUY;
      var command = {
            command: 'load',
            options: {
              table: 'test',
              values: JSON.stringify([{
                '_key': batch['id'],
                'name': batch['fields']['name'],
                'birthday': batch['fields']['birthday'],
                'job': batch['fields']['job']
              }])
            }
          };
      var expected = 'load --table test --values '+command.options.values;
      var stringified = Translator.commandToString(command);
      assert.equal(stringified, expected);
    });
  });

  suite('commandsToString', function() {
    test('load ', function() {
      var batches = BATCHES;
      var commands = [
            {
              command: 'load',
              options: {
                table: 'test',
                values: JSON.stringify([{
                  '_key': batches[0]['id'],
                  'name': batches[0]['fields']['name'],
                  'birthday': batches[0]['fields']['birthday'],
                  'job': batches[0]['fields']['job']
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
                  'birthday': batches[1]['fields']['birthday'],
                  'job': batches[1]['fields']['job']
                }])
              }
            }
          ];
      var expected = [
            'load --table test --values ' + commands[0].options.values,
            'load --table test --values ' + commands[1].options.values
          ].join('\n');
      var stringified = Translator.commandsToString(commands);
      assert.equal(stringified, expected);
    });
  });
});

var BATCH_ADD_MEAT_GUY = {
      'type': 'add',
      'id': 'id29',
      'version': 29,
      'lang': 'en',
      'fields': {
        'name': 'Meat Guy',
        'birthday': '2929-02-09',
        'job': 'Meat Guy'
      }
    };
var BATCH_ADD_MEAT_LADY = {
      'type': 'add',
      'id': 'id2929',
      'version': 2929,
      'lang': 'en',
      'fields': {
        'name': 'Meat Lady',
        'birthday': '2929-02-09',
        'job': 'Meat Lady'
      }
    };
var BATCHES = [
      BATCH_ADD_MEAT_GUY,
      BATCH_ADD_MEAT_LADY
    ];
