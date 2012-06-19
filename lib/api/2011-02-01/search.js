var Domain = require('../../domain').Domain;
var Database = require('../../database').Database;

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
    var domain = new Domain(request);
    var expr = request.query.q;
    var matchColumns = database.columnNamesSync(domain.name).join('||');
    var options = {
      table: domain.name,
      query: expr,
      limit: 10,
      match_columns: matchColumns
    };

    select(database, options, function(error, data) {
      if (error) {
        throw error;
      }
      var info = {
        rid: '000000000000000000000000000000000000000000000000000000000000000',
        'cpu-time-ms': 0
      };
      var result = {
        rank: '-text_relevance', // FIXME
        'match-expr': '', // FIXME
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
