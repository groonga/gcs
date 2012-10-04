var connectAssetManager = require('connect-assetmanager');
var assetManagerGroups = {
  'css': {
    'route': /\/css\/gcs\.min\.css/,
    path: './public/css/',
    dataType: 'css',
    files: ['bootstrap.css', 'gcs.css']
  },
  'js': {
    'route': /\/js\/gcs\.min\.js/,
    path: './public/js/',
    dataType: 'javascript',
    files: [
      'lib/jquery-1.8.2.min.js',
      'lib/bootstrap.js',
      'lib/handlebars-1.0.rc.1.js',
      'lib/ember-latest.js',
      'lib/ember-data-latest.js',

      'gcs/base.js',
      'gcs/controllers.js',
      'gcs/models.js',
      'gcs/router.js',
      'gcs/views.js'
    ]
  }
};
exports.assetManager = connectAssetManager(assetManagerGroups);
