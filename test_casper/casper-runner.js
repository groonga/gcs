#!/usr/bin/env node

// In oreder to run this tests, you need CasperJS.
// http://casperjs.org/

var utils = require('../test/test-utils');
var spawn = require('child_process').spawn;

function casper(options, callback) {
  var command = spawn('casperjs', options);
  var output = '';

  command.stdout.on('data', function(data) {
    process.stdout.write(data);
  });

  command.stderr.on('data', function(data) {
    process.stderr.write(data);
  });

  command.on('exit', function(code) {
    callback(code);
  });
}

var temporaryDatabase = utils.createTemporaryDatabase();
var context = temporaryDatabase.get();
var server = utils.setupServer(context);

utils.loadDumpFile(context, __dirname + '/../test/fixture/companies/ddl.grn');
utils.loadDumpFile(context, __dirname + '/../test/fixture/companies/configurations.grn');
utils.loadDumpFile(context, __dirname + '/../test/fixture/companies/data.grn');

var options = [
  'test',
  __dirname + '/test',
  '--dashboard-url=' + server.dashboardUrl
];

casper(options, function(code) {
  server.close();
  process.exit(code);
});
