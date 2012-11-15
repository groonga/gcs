function ValidationError(message) {
  var error = new Error(message);
  error.isValidationError = true;
  error.isSenderError = true;
  error.code = 'ValidationError';
  return error;
}

ValidationError.isValidationError = function(error) {
  return !!error.isValidationError;
};

exports.ValidationError = ValidationError;


function NotFoundError(message) {
  var error = new Error(message);
  error.isNotFoundError = true;
  error.isSenderError = true;
  error.code = 'ResourceNotFound';
  return error;
}

NotFoundError.isNotFoundError = function(error) {
  return !!error.isNotFoundError;
};

exports.NotFoundError = NotFoundError;
