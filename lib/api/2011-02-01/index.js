var path = require('path');

exports.version = path.basename(__dirname);

exports.configuration = require('./configuration');
exports.batch = require('./batch');
exports.search = require('./search');

exports.registerHandlers = function(application, database) {
  application.get('/',
                  exports.configuration.createHandler(database));

  application.post('/' + exports.version + '/documents/batch',
                   exports.batch.createHandler(database));
  application.get('/gcs/:domain/' + exports.version + '/documents/batch',
                  exports.batch.createHandler(database));

  application.get('/' + exports.version + '/search',
                  exports.search.createHandler(database));
  application.get('/gcs/:domain/' + exports.version + '/search',
                  exports.search.createHandler(database));
};
