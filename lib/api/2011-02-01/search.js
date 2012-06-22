var Domain = require('../../domain').Domain;
var Database = require('../../database').Database;

function formatSelectResults(data) {
  var columnList = data[0][1];
  var columnNames = columnList.map(function(column) {
    return column[0];
  });

  var records = data[0].slice(2);
  var results = records.map(function(record) {
    var object = {};
    columnNames.forEach(function(columnName, index) {
      object[columnName] = [record[index]];
    });
    return {
      id: object._key[0],
      data: object
    };
  });
  return results;
}

function select(database, options, callback) {
  database.command('select', options, function(error, data) {
    if (error) {
      callback(error);
    } else {
      callback(null, formatSelectResults(data));
    }
  });
}

exports.createHandler = function(database) {
  return function(request, response) {
    var startedAt = new Date();
    var domain = new Domain(request);
    var query = request.query.q || '';
    var matchColumns = database.columnNamesSync(domain.name).join('||');
    var options = {
      table: domain.name,
      query: query,
      limit: 10,
      match_columns: matchColumns
    };

    select(database, options, function(error, data) {
      var finishedAt = new Date();
      var elapsedTime = finishedAt - startedAt;
      var rid = '000000000000000000000000000000000000000000000000000000000000000';
      var info = {
        rid: rid,
        'time-ms': elapsedTime,
        'cpu-time-ms': 0 // TODO
      };
      if (error) {
        var body = {
          error: 'info',
          rid: rid,
          'time-ms': elapsedTime,
          'cpu-time-ms': 0, // TODO
          messages: [
            {
              severity: "fatal",
              code: "",
              message: error.message
            }
          ]
        };
        return response.send(body, 400); // TODO
      }
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
