var fs = require('fs');
var utils = require('./test-utils');
var assert = require('chai').assert;

suite('package.json', function() {
  test('of bin element has all files in bin/', function() {
    var packageJson = require('../package.json');
    var binActual = [];

    var binExpected = fs.readdirSync(__dirname + '/../bin')
      .filter(function(file) {
        return file[0] != '.';
      });

    for (var name in packageJson.bin) {
      binActual.push(name);
    }

    assert.deepEqual(binActual.sort(), binExpected.sort());
  });
});
