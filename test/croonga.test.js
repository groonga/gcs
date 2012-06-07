var http = require('http');
var should = require('should');
var spawn = require('child_process').spawn;

function run(options, callback) {
  var command, commandPath, output;
  commandPath = __dirname + '/../bin/croonga';
  command = spawn(commandPath, options);
  output = {
    stdout: '',
    stderr: ''
  };
  command.stdout.on('data', function(data) {
    output.stdout += data;
  });
  command.stderr.on('data', function(data) {
    output.stderr += data;
  });
  callback(null, command, output);
}

suite('croonga command', function() {
  test('should output help for --help', function(done) {
    run(['--help'], function(error, command, output) {
      command.on('exit', function(code) {
        output.stderr.should.equal('');
        output.stdout.should.include("Usage:");
        code.should.equal(0);
        done();
      });
    });
  });
});
