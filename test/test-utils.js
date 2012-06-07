var fs = require('fs');
var path = require('path');

var temporaryDirectory = exports.temporaryDirectory = path.join(__dirname, 'tmp');
var databaseDirectory = exports.databaseDirectory = path.join(temporaryDirectory, 'database');
var databasePath = exports.databasePath = path.join(databaseDirectory, 'croonga');

exports.prepareCleanTemporaryDatabase = function() {
  rmdirFSync(temporaryDirectory);
  mkdirPSync(databaseDirectory);
};

// https://gist.github.com/443774
function rmdirFSync(directoryPath) {
  if (!path.existsSync(directoryPath)) return;

  var files = fs.readdirSync(directoryPath);
  files.forEach(function(file) {
    var fullName = path.join(directoryPath, file);
    if (fs.statSync(fullName).isDirectory()) {
      rmdirFSync(fullName);
    } else {
      fs.unlinkSync(fullName);
    }
  });
  fs.rmdirSync(directoryPath);
}
exports.rmdirFSync = rmdirFSync;

function mkdirPSync(directoryPath) {
  var parent = path.dirname(directoryPath);
  if (!path.existsSync(parent))
    mkdirPSync(parent);
  fs.mkdirSync(directoryPath);
}
exports.mkdirPSync = mkdirPSync;
