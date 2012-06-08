var http = require('http');
var assert = require('chai').assert;
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
        assert.equal(output.stderr, '');
        assert.include(output.stdout, 'Usage:');
        assert.equal(code, 0);
        done();
      });
    });
  });
});
