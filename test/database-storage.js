var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var FileStorage = require('../lib/database/storage').FileStorage;

function sha1hash(string) {
  var shasum = crypto.createHash('sha1');
  shasum.update(string);
  return shasum.digest('hex');
}

function createNewDocument() {
  return {
    id: Date.now(),
    date: (new Date()).toString()
  };
}

function assertFilesCount(directoryPath, delta, task) {
  var files = fs.readdirSync(directoryPath);
  var beforeCount = files.length;
  task();
  files = fs.readdirSync(directoryPath);
  var afterCount = files.length;
  assert.equal(afterCount - beforeCount, delta);
}

suite('database', function() {
  suite('FileStorage', function() {
    var storage;
    setup(function() {
      storage = new FileStorage({ name:     'storage',
                                  basePath: utils.temporaryDirectory });
    });

    teardown(function() {
      storage.clearSync();
      storage = undefined;
    });

    test('saveSync for new document', function() {
      var document = createNewDocument();
      var filePath = path.join(utils.temporaryDirectory, 'storage', sha1hash(document.id));
      assert.isFalse(path.existsSync(filePath));

      assertFilesCount(storage.directoryPath, 1, function() {
        storage.saveSync(document);
      });

      assert.isTrue(path.existsSync(filePath));

      var contents = fs.readFileSync(filePath, 'UTF-8');
      contents = JSON.parse(contents);
      assert.deepEqual(contents, document);
    });

    test('saveSync for existing document', function() {
      var document = createNewDocument();
      storage.saveSync(document);

      var updatedDocument = createNewDocument();
      updatedDocument.id = document.id;
      assertFilesCount(storage.directoryPath, 0, function() {
        storage.saveSync(updatedDocument);
      });

      var contents = fs.readFileSync(filePath, 'UTF-8');
      contents = JSON.parse(contents);
      assert.deepEqual(contents, updatedDocument);
    });

    test('readSync for existing document', function() {
      var document = createNewDocument();
      storage.saveSync(document);

      var readDocument = storage.readSync(document.id);
      assert.deepEqual(readDocument, document);
    });

    test('readSync for unknown document', function() {
      var readDocument = storage.readSync('unknown ' + Date.now());
      assert.equal(readDocument, null);
    });

    test('deleteSync for existing document', function() {
      var document = createNewDocument();
      storage.saveSync(document);

      var filePath = path.join(utils.temporaryDirectory, 'storage', sha1hash(document.id));
      assert.isTrue(path.existsSync(filePath));

      assertFilesCount(storage.directoryPath, -1, function() {
        storage.deleteSync(document.id);
        assert.isFalse(path.existsSync(filePath));
      });
    });

    test('deleteSync for unknown document', function() {
      assertFilesCount(storage.directoryPath, 0, function() {
        storage.deleteSync('unknown ' + Date.now());
      });
    });

    test('clearSync', function() {
      assertFilesCount(storage.directoryPath, 3, function() {
        storage.saveSync(createNewDocument());
        storage.saveSync(createNewDocument());
        storage.saveSync(createNewDocument());
      });
      storage.clearSync();
      assert.isFalse(path.existsSync(storage.directoryPath));
    });
  });
});
