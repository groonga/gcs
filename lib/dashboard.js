var jade = require('jade');
var fs = require('fs');
var path = require('path');

function rootHandler(request, response) {
  return response.render('index.jade', {layout: false});
}
exports.rootHandler = rootHandler;
