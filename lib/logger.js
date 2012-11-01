var fs = require('fs');
var path = require('path');
var CLI = require(__dirname + '/../lib/command-line').CommandLineInterface;

function Logger(filePath) {
  this.init(filePath);
}
Logger.prototype = {
  init: function(filePath) {
    filePath = CLI.resolve(filePath);
    var flags = path.existsSync(filePath) ? 'a' : 'w';
    this.stream = fs.createWriteStream(filePath, { flags: flags });
  },
  getTimestamp: function() {
    var date = new Date();

    var offsetMinutes = date.getTimezoneOffset();
    var timezoneOffset = ('0' + (Math.abs(offsetMinutes) / 60)).slice(-2) + ':' +
                         ('0' + (Math.abs(offsetMinutes) % 60)).slice(-2);
    if (offsetMinutes > 0) {
      timezoneOffset = '-' + timezoneOffset;
    } else {
      timezoneOffset = '+' + timezoneOffset;
    }

    return date.getFullYear() + '-' +
             ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
             ('0' + (date.getDate())).slice(-2) + 'T' +
             ('0' + (date.getHours())).slice(-2) + ':' +
             ('0' + (date.getMinutes())).slice(-2) + ':' +
             ('0' + (date.getSeconds())).slice(-2) + '.' +
             date.getMilliseconds() +
             timezoneOffset;
  },
  log: function(message) {
    var timestamp = '[' + this.getTimestamp + '] ';
    var indent = timestamp.replace(/./g, ' ');

    message = message.split('\n');
    this.stream.write(timestamp + message[0] + '\n');

    if (message.length > 1) {
      message.slice(1).forEach(function(line) {
        this.stream.write(indent + message + '\n');
      }, this);
    }
  }
};

function ErrorLogger(filePath) {
  this.logger = new Logger(filePath);
}
ErrorLogger.prototype = {
  log: function(error) {
    var message = error;
    if (typeof error == 'object') {
      message = error.toString() + '\n' + error.stack;
    }
    this.logger.log(message);
  }
};

exports.Logger = Logger;
exports.ErrorLogger = ErrorLogger;
