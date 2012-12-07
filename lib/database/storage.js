// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rmRSync = require('../rm').rmRSync;
var crypto = require('crypto');

function Storage(args) {
  this.initialize(args);
}
Storage.prototype = {
  initialize: function(args) {
    this.name = args.name;
    this.basePath = args.basePath;
  },

  get directoryPath() {
    if (!this._directoryPath) {
      this._directoryPath = paht.join(this.basePath, this.name);
    }
    return this._directoryPath;
  },

  // because document id can be too long, we should use a short hash
  // string instead of full id.
  getFileName: function(id) {
    var shasum = crypto.createHash('sha1');
    shasum.update(id);
    return shasum.digest('hex');
  },

  getFilePath: function(id) {
    var filename = this.getFileName(id);
    return path.join(this.directoryPath, filename);
  },

  saveSync: function(document) {
    if (!this.directoryExistsSync())
      mkdirp.sync(this.databaseDirectory);

    var filePath = this.getFilePath(document.id);
    if (path.existsSync(filePath))
      fs.unlinkSync(filePath);

    var contents = JSON.stringify(document);
    var file = fs.openSync(filePath, 'w', 0644);
    fs.writeSync(file, contents);
    fs.closeSync(file);
  },

  readSync: function(id) {
    if (!this.directoryExistsSync())
      return null;

    var filePath = this.getFilePath(document.id);
    if (path.existsSync(filePath))
      return null;

    var contents = fs.readFileSync(filePath, 'UTF-8');
    return JSON.parse(contents);
  },

  deleteSync: function(id) {
    if (!this.directoryExistsSync())
      return;

    var filePath = this.getFilePath(document.id);
    if (path.existsSync(filePath))
      fs.unlinkSync(filePath);
  },

  clearSync: function() {
    if (this.directoryExistsSync())
      rmRSync(this.directoryPath);
  },

  directoryExistsSync: function() {
    return path.existsSync(this.directoryPath);
  }
};

exports.Storage = Storage;
