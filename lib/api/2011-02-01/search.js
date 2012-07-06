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
      var numFoundRecords = data[0][0][0];
      callback(null, formatSelectResults(data), numFoundRecords);
    }
  });
}

exports.createHandler = function(database) {
  return function(request, response) {
    var startedAt = new Date();
    var domain = new Domain(request);
    var query = request.query.q || '';
    var matchColumns = database.columnNamesSync(domain.name).join('||');
    var size = parseInt(request.query.size || '10', 10);
    var start = parseInt(request.query.start || '0', 10);
    var options = {
      table: domain.name,
      query: query,
      limit: size,
      offset: start,
      match_columns: matchColumns
    };

    select(database, options, function(error, data, numFoundRecords) {
      var finishedAt = new Date();
      var elapsedTime = finishedAt - startedAt;
      var dummyRid = '000000000000000000000000000000000000000000000000000000000000000';
      var info = {
        rid: dummyRid,
        'time-ms': elapsedTime,
        'cpu-time-ms': 0 // TODO
      };
      if (error) {
        var body = {
          error: 'info',
          rid: dummyRid,
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
          found: numFoundRecords,
          start: start,
          hit: data
        },
        info: info
      };
      response.json(result);
    });
  };
};
