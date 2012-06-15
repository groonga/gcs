var versions = exports.versions = [
      '2011-02-01'
    ];

versions.forEach(function(version) {
  exports[version] = require('./api/' + version + '/bootstrap');
});
