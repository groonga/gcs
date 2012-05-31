var nroonga = require('nroonga');
var fs = require('fs');

croonga = module.exports = function(baseDir) {
  this.baseDir = baseDir;
  this.domains = {};
  this.load();
};

croonga.prototype.load = function() {
  var dir = fs.readdirSync(this.baseDir);
  var i;
  for (i=0; i<dir.length; i++) {
    if (!dir[i].match(/\./)) {
      var nroongaDb = new nroonga.Database(this.dbPath(dir[i]));
      this.domains[dir[i]] = nroongaDb;
    }
  }
};

croonga.prototype.dbPath = function(domainName) {
  return this.baseDir + '/' + domainName;
};

croonga.prototype.createDomain = function(domainName) {
  this.domains[domainName] = new nroonga.Database(this.dbPath(domainName));
};
