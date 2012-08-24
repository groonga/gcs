// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var dummyRid = '000000000000000000000000000000000000000000000000000000000000000';

function formatFacets(data) {
  var drilldownRecords = data.slice(1);

  return drilldownRecords.map(function(drilldownRecord, index) {
    return formatFacet(drilldownRecord);
  });
}

function formatFacet(drilldownRecord) {
  var columnList = drilldownRecord[1];
  var columnNames = columnList.map(function(column) {
    return column[0];
  });

  var constraintEntries = drilldownRecord.slice(2);
  var constraints = constraintEntries.map(function(record) {
    var object = {};
    columnNames.forEach(function(columnName, index) {
      object[columnName] = record[index];
    });
    return {value: object._key, count: object._nsubrecs};
  });

  return {constraints: constraints};
}

function formatSelectResults(data) {
  var columnList = data[0][1];
  var columnNames = columnList.map(function(column) {
    return column[0];
  });

  var records = data[0].slice(2);
  var results = records.map(function(record) {
    var result = {};
    var data = {};
    columnNames.forEach(function(columnName, index) {
      // bind internal "_key" column to the "id"
      if (columnName == '_key') {
        result.id = record[index];
        return;
      }
      // don't expose any internal column
      if (columnName[0] == '_') return;
      if (Array.isArray(record[index])) {
        // vector column
        data[columnName] = record[index];
      } else {
        // scalar column
        data[columnName] = [record[index]];
      }
    });
    if (Object.keys(data).length)
      result.data = data;
    return result;
  });
  return results;
}

function select(context, selectQuery, callback) {
  if (selectQuery.noResult) {
    callback(null, [], 0, []);
    return;
  }
  context.command('select', selectQuery.selectOptions, function(error, data) {
    if (error) {
      callback(error);
    } else {
      var numFoundRecords = data[0][0][0];
      callback(
        null,
        formatSelectResults(data),
        numFoundRecords,
        formatFacets(data)
      );
    }
  });
}

function createResultBody(options) {
  var info = {
    rid:           dummyRid,
    'time-ms':     options.elapsedTime || 0,
    'cpu-time-ms': 0 // TODO
  };
  return {
    rank: '-text_relevance', // FIXME
    'match-expr': options.matchExpression,
    hits: {
      found: options.found,
      start: options.start,
      hit:   options.hit
    },
    info: info
  };
}

function createErrorBody(options) {
  var messages = [];
  if (options.messages) {
    messages = options.messages;
  } else {
    messages.push({
      severity: 'fatal',
      code:     '',
      message:  options.message || ''
    });
  }
  return {
    error:         'info',
    rid:           options.rid,
    'time-ms':     options.elapsedTime || 0,
    'cpu-time-ms': 0, // TODO
    messages:      messages
  };
}

exports.createHandler = function(context) {
  return function(request, response) {
    var startedAt = new Date();

    var selectQuery;
    try {
      selectQuery = new SelectQuery(request, context);
    } catch(error) {
      var errorData = { rid: dummyRid };
      if (error.message == 'validation error') {
        errorData.messages = [error.data];
      } else {
        errorData.message = 'Invalid ' + error.queryType + ' value: ' + (error.message || error) + error.stack;
      }
      var body = createErrorBody(errorData);
      return response.send(body, 400);
    }

    select(context, selectQuery,
      function(error, data, numFoundRecords, facets) {
        var finishedAt = new Date();
        var elapsedTime = finishedAt.getTime() - startedAt.getTime();
        if (error) {
          var body = createErrorBody({
            rid:         dummyRid,
            message:     error.message,
            elapsedTime: elapsedTime
          });
          return response.send(body, 400); // TODO
        }
        var result = createResultBody({
          matchExpression: selectQuery.matchExpression,
          found:           numFoundRecords,
          start:           selectQuery.start,
          hit:             data,
          elapsedTime:     elapsedTime
        });
        if (selectQuery.facets && selectQuery.facets.length) {
          var facetsObject = {};
          facets.forEach(function(facet, index) {
            var facetName = selectQuery.facets[index];
            facetsObject[facetName] = facet;
          });
          result.facets = facetsObject;
        }
        response.json(result);
      }
    );
  };
};
