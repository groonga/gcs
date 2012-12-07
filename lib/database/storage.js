// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rmRSync = require('../rm').rmRSync;
var crypto = require('crypto');

function FileStorage(args) {
  this.initialize(args);
}
FileStorage.prototype = {
  initialize: function(args) {
    this.name = args.name;
    this.basePath = args.basePath || '/tmp';
  },

  get directoryPath() {
    if (!this._directoryPath) {
      this._directoryPath = path.join(this.basePath, this.name);
    }
    return this._directoryPath;
  },

  // because document id can be too long, we should use a short hash
  // string instead of full id.
  idToFileName: function(id) {
    var shasum = crypto.createHash('sha1');
    shasum.update(String(id));
    return shasum.digest('hex');
  },

  idToFilePath: function(id) {
    var filename = this.idToFileName(id);
    return path.join(this.directoryPath, filename);
  },

  saveSync: function(document) {
    mkdirp.sync(this.directoryPath);

    var filePath = this.idToFilePath(document.id);
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

    var filePath = this.idToFilePath(document.id);
    if (path.existsSync(filePath))
      return null;

    var contents = fs.readFileSync(filePath, 'UTF-8');
    return JSON.parse(contents);
  },

  deleteSync: function(id) {
    if (!this.directoryExistsSync())
      return;

    var filePath = this.idToFilePath(document.id);
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
exports.FileStorage = FileStorage;


function MemoryStorage() {
  this._storage = {};
}
MemoryStorage.prototype = {
  saveSync: function(document) {
    this._storage[document.id] = document;
  },

  readSync: function(id) {
    return this._storage[id] || null;
  },

  deleteSync: function(id) {
    delete this._storage[id];
  },

  clearSync: function() {
    this._storage = {};
  }
};
exports.MemoryStorage = MemoryStorage;
