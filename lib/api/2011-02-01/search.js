// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var Domain = require('../../database').Domain;
var nroonga = require('../../wrapped-nroonga');
var BooleanQueryTranslator = require('../../bq-translator').BooleanQueryTranslator;

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

function select(context, options, callback) {
  context.command('select', options, function(error, data) {
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

function createErrorBody(options) {
  return {
    error: 'info',
    rid: options.rid,
    'time-ms': options.elapsedTime || 0,
    'cpu-time-ms': 0, // TODO
    messages: [
    {
      severity: "fatal",
      code: "",
      message: options.message || ""
    }
    ]
  };
}

exports.createHandler = function(context) {
  return function(request, response) {
    var dummyRid = '000000000000000000000000000000000000000000000000000000000000000';
    var startedAt = new Date();
    var domain = new Domain(request, context);
    var query = request.query.q || '';
    var booleanQuery = request.query.bq || '';
    var filter = null;
    var facet = request.query.facet;

    if (booleanQuery) {
      var translator = new BooleanQueryTranslator();
      var defaultField = "default_field_fixme"; // FIXME
      try {
        filter = translator.translate(booleanQuery, defaultField);
      } catch (error) {
        var body = createErrorBody({
          rid: dummyRid,
          message: 'Invalid bq value: ' + (error.message || error)
        });
        return response.send(body, 400);
      }
    }

    var matchIndexFields = domain.indexFields;
    matchIndexFields = matchIndexFields.filter(function(field) {
      return field.type == 'text';
    });
    var matchColumns = matchIndexFields
                         .map(function(field) {
                           return field.columnName;
                         })
                         .join('||');
    var size = parseInt(request.query.size || '10', 10);
    var start = parseInt(request.query.start || '0', 10);
    var options = {
      table: domain.tableName,
      query: query,
      limit: size,
      offset: start,
      match_columns: matchColumns
    };

    if (domain.isSynonymTableAvailableSync()) {
      options.query_expansion = domain.synonymTableName + '.synonyms';
    }
    if (filter) {
      options.filter = filter;
    }

    if (facet) {
      options.drilldown = facet;
      // TODO support sorting
      // TODO support facet-FIELD-top-n parameter
    }

    select(context, options,
      function(error, data, numFoundRecords, facets) {
        var finishedAt = new Date();
        var elapsedTime = finishedAt - startedAt;
        var info = {
          rid: dummyRid,
          'time-ms': elapsedTime,
          'cpu-time-ms': 0 // TODO
        };
        if (error) {
          var body = createErrorBody({
            rid: dummyRid,
            message: error.message,
            elapsedTime: elapsedTime
          });
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
        if (facets) {
          var facetNames = facet.split(',');
          var facetsObject = {};
          facets.map(function(facet, index) {
            var facetName = facetNames[index];
            facetsObject[facetName] = facet;
          });
          result.facets = facetsObject;
        }
        response.json(result);
      }
    );
  };
};
