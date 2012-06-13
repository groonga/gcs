var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');
var databaseDirectory = exports.databaseDirectory = path.join(temporaryDirectory, 'database');
var databasePath = exports.databasePath = path.join(databaseDirectory, 'croonga');

var testHost = 'localhost';
var testPort = 3333;
exports.testHost = testHost;
exports.testPort = testPort;

exports.prepareCleanTemporaryDatabase = function() {
  rmRSync(temporaryDirectory);
  mkdirp.sync(databaseDirectory);
};

function isDirectory(path) {
  return fs.statSync(path).isDirectory();
}
exports.isDirectory = isDirectory;

function rmRSync(directoryPath) {
  if (!path.existsSync(directoryPath)) return;

  var files = fs.readdirSync(directoryPath);
  var file, filePath;
  for (var i = 0, maxi = files.length; i < maxi; i++) {
    file = files[i];
    filePath = path.join(directoryPath, file);
    if (isDirectory(filePath))
      rmRSync(filePath);
    else
      fs.unlinkSync(filePath);
  }
  fs.rmdirSync(directoryPath);
}
exports.rmRSync = rmRSync;
