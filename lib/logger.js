var winston = require('winston');

var loggers = {};

function getLogger(context) {
  if (loggers[context])
    return loggers[context];

  var logger = new winston.Logger({
        transports: [
          new winston.transports.Console({ json: false, timestamp: true })
        ],
        exceptionHandlers: [
          new winston.transports.Console({ json: false, timestamp: true })
        ],
        exitOnError: false
      });
  return loggers[context] = logger;
}

function logError(errors) {
  if (!Array.isArray(errors))
    errors = [errors];
  errors.forEach(function(error) {
    if (error.stack) {
      error = error + '\n' + error.stack;
    }
    getLogger('error').error(error);
  });
}
exports.error = logError;

function logQuery(selectQuery, elapsedTime) {
  var message = JSON.stringify(selectQuery.selectOptions) +
                  ' (' + elapsedTime + 'msec)';
  getLogger('query').info(message);
}
exports.query = logQuery;

function getLocalISOTimestamp() {
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
}

function addFileTransport(context, filename, options) {
  options = options || {};
  options.filename = filename;
  options.json = false;
  options.timestamp = getLocalISOTimestamp;
  getLogger(context).add(winston.transports.File, options);
  getLogger(context).remove(winston.transports.Console, options);
}
exports.addFileTransport = addFileTransport;
