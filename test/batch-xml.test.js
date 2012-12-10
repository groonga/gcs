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

function testConvert(name, basename) {
  test(name, function() {
    var jsonBatch = readJSONBatch(path.join(fixtures, basename + '.sdf.json'));
    var xmlBatch = readXMLBatch(path.join(fixtures, basename + '.sdf.xml'));
    assert.equal(JSON.stringify(xmlBatch), JSON.stringify(jsonBatch));
  });
}

suite('batch/xml', function() {
  testConvert('add, multiple items, single values', 'add');
  testConvert('add, multiple items, multiple values', 'add-multiple-values');
  testConvert('add, multiple items, single values, non-ascii', 'non-ascii.add');
  testConvert('delete, single item', 'delete');
  testConvert('delete, multiple item', 'delete-multiple');
  testConvert('mixed', 'add-delete-mixed');
});
