function ValidationError(message) {
  var error = new Error(message);
  error.isValidationError = true;
  error.isSenderError = true;
  error.code = 'ValidationError';
  error.type = 'ValidationError';
  return error;
}
exports.ValidationError = ValidationError;

function MultiplexedValidationError(messages) {
  var prefix = messages.length > 1 ? 
                 messages.length + ' validation errors detected: ' :
                 '1 validation error detected: ';
  var error = new Error(prefix + messages.join('; '));
  error.isValidationError = true;
  error.isSenderError = true;
  error.isMultiplexed = true;
  error.code = 'ValidationError';
  error.type = 'ValidationError';
  error.messages = messages;
  return error;
}
exports.MultiplexedValidationError = MultiplexedValidationError;

function FieldOptionConflictError(message) {
  var error = new Error(message);
  error.isValidationError = true;
  error.isSenderError = true;
  error.code = 'InvalidType';
  error.type = 'FieldOptionConflictError';
  return error;
}
exports.FieldOptionConflictError = FieldOptionConflictError;

function ResourceNotFoundError(message) {
  var error = new Error(message);
  error.isNotFoundError = true;
  error.isSenderError = true;
  error.code = 'ResourceNotFound';
  error.type = 'ResourceNotFoundError';
  return error;
}
exports.ResourceNotFoundError = ResourceNotFoundError;

function MalformedInputError(message) {
  var error = new Error(message);
  error.isSenderError = true;
  error.code = 'MalformedInput';
  error.type = 'MalformedInputError';
  return error;
}
exports.MalformedInputError = MalformedInputError;
