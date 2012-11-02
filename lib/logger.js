var winston = require('winston');

var loggers = {};

function getLogger(context) {
  if (loggers[context])
    return loggers[context];

  var logger = new winston.Logger({
        transports: [
          new winston.transports.Console()
        ]
      });
  return loggers[context] = logger;
}

function logError(error) {
  var message = error;
  if (error.stack) {
    message = error + '\n' + error.stack;
  }
  getLogger('error').error(message);
}
exports.error = logError;

function logQuery(selectQuery, elapsedTime) {
  var message = JSON.stringify(selectQuery.selectOptions) +
                  ' (' + elapsedTime + 'msec)';
  getLogger('query').info(message);
}
exports.query = logQuery;

function setLogFilePath(context, path) {
  var logger = getLogger(context);
  logger.add(winston.transports.File, { filename: path });
}
exports.setLogFilePath = setLogFilePath;
