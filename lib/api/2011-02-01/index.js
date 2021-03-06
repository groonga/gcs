var path = require('path');

exports.version = path.basename(__dirname);

exports.configuration = require('./configuration');
exports.batch = require('./batch');
exports.search = require('./search');

exports.registerHandlers = function(application, database, config) {
  application.get('/',
                  exports.configuration.createHandler(database, config));
  application.post('/',
                   exports.configuration.createHandler(database, config));

  application.post('/' + exports.version + '/documents/batch',
                   exports.batch.createHandler(database, config));
  application.get('/gcs/:domain/' + exports.version + '/documents/batch',
                  exports.batch.createHandler(database, config));

  application.get('/' + exports.version + '/search',
                  exports.search.createHandler(database, config));
  application.get('/gcs/:domain/' + exports.version + '/search',
                  exports.search.createHandler(database, config));
};
