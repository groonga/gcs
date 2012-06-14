var BatchProcessor = require('../batch/processor').Processor;

exports.createHandler = function(database) {
  return function(request, response) {
    // FIXME: if the user accesses this server by an IP address, I cannot get
    //        the domain name via the sub domain. So, temporally
    //        I get the domain name via the query parameter "DomainName".
    var domain = request.query.DomainName || '';
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
