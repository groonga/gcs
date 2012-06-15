var utils = require('./test-utils');
var assert = require('chai').assert;
var fs = require('fs');

var Translator = require('../lib/batch/translator').Translator;

var batches = fs.readFileSync(__dirname + '/fixture/companies/add.sdf.json', 'UTF-8');
batches = JSON.parse(batches);

suite('batch/translator/Translator (instance methods)', function() {
  var translator;

  setup(function() {
    translator = new Translator('test');
  });

  teardown(function() {
    translator = undefined;
  });

  test('addToLoad', function() {
    var batch = batches[0];
    var expected = {
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
    var translated = translator.addToLoad(batch);
    assert.deepEqual(translated, expected);
  });

  test('translateOne for add', function() {
    var batch = batches[0];
    var expected = {
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
    var translated = translator.translateOne(batch);
    assert.deepEqual(translated, expected);
  });

  test('translate', function() {
    var expected = [
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
          }
        ];
    var translated = translator.translate(batches.slice(0, 2));
    assert.deepEqual(translated, expected);
  });
});

suite('batch/translator/Translator (class methods)', function() {
  suite('commandToString', function() {
    test('load ', function() {
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
      var expected = 'load --table test --values '+command.options.values;
      var stringified = Translator.commandToString(command);
      assert.equal(stringified, expected);
    });
  });

  suite('commandsToString', function() {
    test('load ', function() {
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
