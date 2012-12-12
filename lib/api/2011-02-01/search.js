// -*- indent-tabs-mode: nil; js2-basic-offset: 2 -*-

var SelectQuery = require('../../select-query').SelectQuery;
var IndexField = require('../../database').IndexField;
var logger = require('../../logger');
var xmlbuilder = require('../../xmlbuilder');

var dummyRid = '000000000000000000000000000000000000000000000000000000000000000';

var XMLNS = 'http://cloudsearch.amazonaws.com/2011-02-01/results';
var PRETTY_PRINT_OPTIONS = {
      pretty: true
    };

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

function formatSelectResults(data, selectQuery) {
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

      var fieldName = IndexField.toFieldName(columnName);
      if (Array.isArray(record[index])) {
        // vector column
        data[fieldName] = record[index];
      } else {
        // scalar column
        data[fieldName] = [record[index]];
      }
    });

    selectQuery.emptyReturnFields.forEach(function(fieldName) {
      data[fieldName] = [];
    });

    if (selectQuery.returnFields.length)
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
        formatSelectResults(data, selectQuery),
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
  var jsonBody = {
    rank: options.rankExpression,
    'match-expr': options.matchExpression,
    hits: {
      found: options.found,
      start: options.start,
      hit:   options.hit
    },
    info: info
  };

  if (options.type == 'xml')
    return toXMLResponse(jsonBody);
  else
    return jsonBody;
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
  var jsonBody = {
    error:         'info',
    rid:           options.rid,
    'time-ms':     options.elapsedTime || 0,
    'cpu-time-ms': 0, // TODO
    messages:      messages
  };

  if (options.type == 'xml')
    return toXMLResponse(jsonBody);
  else
    return jsonBody;
}

function toXMLResponse(body) {
  var doc = xmlbuilder.create();
  var results = doc.begin('results', { version: '1.0' })
                  .attribute('xmlns', XMLNS);

  if (body.error) {
    var info = results.element('info',
                               { 'rid':         body['rid'],
                                 'time-ms':     body['time-ms'],
                                 'cpu-time-ms': body['cpu-time-ms'] });
    body.messages.forEach(function(message) {
      info.element('message', { severity: message.severity,
                                code:     message.code })
          .text(message.message);
    });
  } else {
    results
      .element('rank').text(body.rank).up()
      .element('match-expr').text(body['match-expr']).up();

    var hits = results.element('hits', { found: body.hits.found,
                                         start: body.hits.start });
    body.hits.hit.forEach(function(hit) {
      var item = hits.element('hit', { id: hit.id });
      if (hit.data)
        Object.keys(hit.data).forEach(function(name) {
          hit.data[name].forEach(function(value) {
            item.element('d', { name: name }).text(hit.data[name][value]);
          });
        });
    });

    var facets = results.element('facets');

    results.element('info', body.info);
  }

  return doc.toString(PRETTY_PRINT_OPTIONS);
}

exports.createHandler = function(context, config) {
  return function(request, response) {
    var startedAt = new Date();
    var resultType = request.query['results-type'] || 'json';

    var selectQuery;
    try {
      selectQuery = new SelectQuery(request, context);
    } catch(error) {
      logger.error(error);

      var errorData = {
            type: resultType,
            rid:  dummyRid
          };
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
        if (error)
          logger.error(error);

        var finishedAt = new Date();
        var elapsedTime = finishedAt.getTime() - startedAt.getTime();

        logger.query(selectQuery, elapsedTime);

        if (error) {
          var body = createErrorBody({
            type:        resultType,
            rid:         dummyRid,
            message:     error.message,
            elapsedTime: elapsedTime
          });
          return response.send(body, 400); // TODO
        }
        var result = createResultBody({
          type:            resultType,
          matchExpression: selectQuery.matchExpression,
          rankExpression:  selectQuery.rankExpression,
          found:           numFoundRecords,
          start:           selectQuery.start,
          hit:             data,
          elapsedTime:     elapsedTime
        });
        if (selectQuery.facets.length) {
          var facetsObject = {};
          facets.forEach(function(facet, index) {
            var fieldName = selectQuery.availableFacets[index];
            facetsObject[fieldName] = facet;
          });
          selectQuery.emptyFacets.forEach(function(fieldName) {
            facetsObject[fieldName] = {};
          });
          result.facets = facetsObject;
        }
        response.json(result);
      }
    );
  };
};
