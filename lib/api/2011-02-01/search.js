var Domain = require('../../domain').Domain;

function select(database, options, callback) {
  var results = [];
  database.command('select', options, function(error, data) {
    if (error) {
      callback(error);
    } else {
      var columnNames = [];
      var i, j;
      for (j = 0; j < data[0][1].length; j++) {
        columnNames[j] = data[0][1][j][0];
      }

      for (i = 0; i < data[0].length - 2; i++) {
        var row = data[0][i + 2];
        var object = {};
        for (j = 0; j < columnNames.length; j++) {
          object[columnNames[j]] = [row[j]];
        }
        results[i] = {
          id: object._key[0],
          data: object
        };
      }

      callback(null, results);
    }
  });
}

exports.createHandler = function(database) {
  return function(request, response) {
    var domain = new Domain(request.query.DomainName || '');
    var expr = request.query.q;
    var options = {
      table: domain.name,
      query: expr,
      limit: 10,
      match_columns: 'address' // FIXME
    };
    select(database, options, function(error, data) {
      if (error) {
        throw error;
      }

      var info = {};
      var result = {
        rank: '-text_relevance', // FIXME
        'match-expr': expr,
        hits: {
          found: data.length,
          start: 0,
          hit: data
        },
        info: info
      };
      response.json(result);
    });
  };
};
