var BatchProcessor = require('../../batch/processor').Processor;
var Domain = require('../../domain').Domain;

function createErrorBody(errors) {
  errors = errors.map(function(error) {
    if (error.message)
      return { message: error.message };
    else
      return { message: error.toString() };
  });
  return {
    status: 'error',
    adds: 0,
    deletes: 0,
    errors: errors
  };
}

function handleInvalidContentType(request, response) {
  var contentType = request.headers['content-type'];
  switch (contentType) {
    case 'application/json':
      return false;
    default:
      var message = contentType ?
                      'Invalid Content-Type header: "' + contentType + '"' :
                      'The Content-Type header is missing.' ;
      response.send(createErrorBody([message]), 400);
      return true;
  }
}

function handleInvalidContentLength(request, response) {
  if (('content-length' in request.headers))
    return false;

  response.send(createErrorBody(['The Content-Length header is missing.']), 401);
  return true;
}

exports.createHandler = function(database) {
  return function(request, response) {
    if (handleInvalidContentType(request, response)) return;
    if (handleInvalidContentLength(request, response)) return;

    // FIXME: if the user accesses this server by an IP address, I cannot get
    //        the domain name via the sub domain. So, temporally
    //        I get the domain name via the query parameter "DomainName".
    var domain = new Domain(request.query.DomainName || '');
    var processor = new BatchProcessor({
          database: database,
          domain: domain
        });
    processor.process(request.body)
      .next(function(result) {
        response.send(JSON.stringify(result));
      })
      .error(function(error) {
        response.send(error.message + '\n' + error.stack, 502);
      });
  };
};
