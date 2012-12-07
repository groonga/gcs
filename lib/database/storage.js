// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rm = require('../rm');

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

  saveSync: function(document) {
    if (!this.directoryExistsSync())
      mkdirp.sync(databaseDirectory);

    // logic to save JSON as a file
  },

  readSync: function(id) {
    if (!this.directoryExistsSync())
      return null;

    // logic to read file
    // return parsed JSON
  },

  deleteSync: function(id) {
    if (!this.directoryExistsSync())
      return;

    // logic to delete file
  },

  clearSync: function() {
    if (this.directoryExistsSync())
      rm.rmRSync(this.directoryPath);
  },

  directoryExistsSync: function() {
    return path.existsSync(this.directoryPath);
  }
};

exports.Storage = Storage;
