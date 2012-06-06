(function() {
  var http, run, should, spawn;

  should = require('should');

  spawn = require('child_process').spawn;

  http = require('http');

  run = function(options, callback) {
    var command, commandPath, output;
    commandPath = __dirname + '/../bin/croonga';
    command = spawn(commandPath, options);
    output = {
      stdout: '',
      stderr: ''
    };
    command.stdout.on('data', function(data) {
      return output.stdout += data;
    });
    command.stderr.on('data', function(data) {
      return output.stderr += data;
    });
    return callback(null, command, output);
  };

  describe('croonga command', function() {
    return it('should output help for --help', function(done) {
      return run(['--help'], function(error, command, output) {
        return command.on('exit', function() {
          output.stdout.should.include("Usage:");
          return done();
        });
      });
    });
  });

}).call(this);
