function ValidationError(message) {
  var error = new Error(message);
  error.isValidationError = true;
  error.isSenderError = true;
  error.code = 'ValidationError';
  error.type = 'ValidationError';
  return error;
}
exports.ValidationError = ValidationError;


function FieldOptionConflictError(message) {
  var error = new Error(message);
  error.isValidationError = true;
  error.isSenderError = true;
  error.code = 'InvalidType';
  error.type = 'FieldOptionConflictError';
  return error;
}
exports.FieldOptionConflictError = FieldOptionConflictError;


function NotFoundError(message) {
  var error = new Error(message);
  error.isNotFoundError = true;
  error.isSenderError = true;
  error.code = 'ResourceNotFound';
  error.type = 'NotFoundError';
  return error;
}
exports.NotFoundError = NotFoundError;
