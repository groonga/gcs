var restify = require('restify');
var Croonga = require('./croonga');

exports.createServer = function (config) {
  var croonga = new Croonga(config.baseDir);

  var handlers = Object.create(null);

  handlers.CreateDomain = function(req, res, next) {
    var domainName = req.query.DomainName;
    if (!domainName || domainName === '') {
      return next(new restify.InvalidArgumentError("Invalid DomainName"));
    }
    croonga.createDomain(domainName);
    res.send(domainName);
  };

  function respond(req, res, next) {
    var action = req.query.Action || '';
    var handler = handlers[action];
    if (!handler) {
      return next(new restify.InvalidArgumentError("Action '" + action + "' is not supported"));
    }
    return handler(req, res, next);
  }

  var server = restify.createServer({
    name: 'croonga'
  });
  server.use(restify.queryParser());
  server.get('/', respond);

  return server;
};
