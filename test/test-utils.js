var fs = require('fs');
var path = require('path');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');
var databaseDirectory = exports.databaseDirectory = path.join(temporaryDirectory, 'database');
var databasePath = exports.databasePath = path.join(databaseDirectory, 'croonga');

function mkdirPSync(directoryPath) {
  var parent = path.dirname(directoryPath);
  if (!path.existsSync(parent))
    mkdirPSync(parent);
  fs.mkdirSync(directoryPath);
}
exports.mkdirPSync = mkdirPSync;
