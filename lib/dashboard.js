var jade = require('jade');
var fs = require('fs');
var path = require('path');

function rootHandler(request, response) {
  return response.render('index.jade');
}
exports.rootHandler = rootHandler;

function renderFile(filename, templateDirectory) {
  var templatePath = path.join(templateDirectory, filename);
  var template = fs.readFileSync(templatePath);
  var name = path.basename(filename, '.jade');

  var head = '(function() {' +
    'this.JST || (this.JST = {});' +
    'this.JST[' + JSON.stringify(name) + '] = ';
  var tail = '; }).call(this);';
  var fn = jade.compile(template, {filename: filename, client: true, compileDebug: false});

  return head + fn.toString() + tail;
}

function templatesHandler(request, response) {
  var templateDirectory = path.join(__dirname, '/../client_templates');
  var templates = fs.readdirSync(templateDirectory).filter(function(path) {
    return path.match(/\.jade$/);
  });
   
  var rendered = templates.map(function(path) {
    return renderFile(path, templateDirectory);
  });

  return response.send(rendered.join(''), {'Content-Type': 'application/javascript'});
}
exports.templatesHandler = templatesHandler;
