exports.createHandler = function(database) {
  return function(request, response) {
    var domain = request.query.DomainName || '';
    var options = {
      table: domain
    };
    database.command('select', options, function(error, data) {
      if (error) {
        throw error;
      }

      var expr = request.query.q;
      var hitDocuments = []; // FIXME
      var hits = { // FIXME
        found: 7,
        start: 0,
        hit: hitDocuments
      };
      var info = {};
      var result = { // FIXME
        rank: '-text_relevance',
        'match-expr': expr,
        hits: hits,
        info: info
      };
      response.json(result);
    });
  };
};
