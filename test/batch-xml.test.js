var utils = require('./test-utils');

var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');

var xml = require('../lib/batch/xml');
var fixtures = path.join(__dirname, 'fixture/companies');

function readJSONBatch(filePath) {
  var jsonBatch = fs.readFileSync(filePath, 'UTF-8');
  jsonBatch = JSON.parse(jsonBatch);
  return sortBatches(jsonBatch);
}

function readXMLBatch(filePath) {
  var xmlBatch = fs.readFileSync(filePath, 'UTF-8');
  xmlBatch = xml.toJSON(xmlBatch);
  return sortBatches(xmlBatch);
}

function sortBatches(batches) {
  return batches.sort(function(a, b) {
    return a.type - b.type ||
           a.id - b.id ||
           a.version - b.version;
  });
}

suite('batch/xml', function() {
  test('add, multiple items, single values', function() {
    var jsonBatch = readJSONBatch(path.join(fixtures, 'add.sdf.json'));
    var xmlBatch = readXMLBatch(path.join(fixtures, 'add.sdf.xml'));
    assert.deepEqual(xmlBatch, jsonBatch);
  });

  test('delete, single item', function() {
    var jsonBatch = readJSONBatch(path.join(fixtures, 'delete.sdf.json'));
    var xmlBatch = readXMLBatch(path.join(fixtures, 'delete.sdf.xml'));
    assert.deepEqual(xmlBatch, jsonBatch);
  });
});
