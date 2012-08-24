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
  var messages = [];
  if (options.messages) {
    messages = options.messages;
  } else {
    messages.push({
      severity: 'fatal',
      code: '',
      message: options.message || ''
    });
  }
  return {
    error: 'info',
    rid: options.rid,
    'time-ms': options.elapsedTime || 0,
    'cpu-time-ms': 0, // TODO
    messages: messages
  };
}

function translateQueryToBooleanQuery(query) {
  return "'" + query.replace(/(['\\])/g, '\\$1') + "'";
}

var dummyRid = '000000000000000000000000000000000000000000000000000000000000000';

exports.createHandler = function(context) {
  return function(request, response) {
    var startedAt = new Date();
    var domain = new Domain(request, context);
    var query = request.query.q || '';
    var booleanQuery = request.query.bq || '';
    var filters = [];
    var matchExpr = '';
    var facetParameter = request.query.facet;

    var defaultFields;
    var defaultField = domain.defaultSearchField;
    if (defaultField)
      defaultFields = [defaultField];
    else
      defaultFields = domain.searchableIndexFields.filter(function(field) {
        return field.type == 'text';
      });

    var defaultFieldNames = defaultFields.map(function(field) {
      return field.name;
    });

    if (query) {
      var queryAsBooleanQuery = translateQueryToBooleanQuery(query);
      var translator = new BooleanQueryTranslator(queryAsBooleanQuery);
      translator.domain = domain;
      translator.defaultFieldNames = defaultFieldNames;
      try {
        filters.push(translator.translate());
      } catch (error) {
        var body = createErrorBody({
          rid: dummyRid,
          message: 'Invalid q value: ' + (error.message || error)
        });
        return response.send(body, 400);
      }
      matchExpr = '(label ' + queryAsBooleanQuery + ')';
    }

    if (booleanQuery) {
      var translator = new BooleanQueryTranslator(booleanQuery);
      translator.domain = domain;
      translator.defaultFieldNames = defaultFieldNames;
      try {
        filters.push(translator.translate());
      } catch (error) {
        var errorData = { rid: dummyRid };
        if (error.message == 'validation error') {
          errorData.messages = [error.data];
        } else if (error.message == 'unsearchable field') {
          errorData.message = 'unsearchable field '+error.fieldName;
        } else {
          errorData.message = 'Invalid bq value: ' + (error.message || error);
        }
        var body = createErrorBody(errorData);
        return response.send(body, 400);
      }
      if (matchExpr.length > 0) {
        matchExpr = '(and ' + matchExpr + ' ' + booleanQuery + ')';
      } else {
        matchExpr = booleanQuery;
      }
    }

    filters = filters.map(function(filter) {
      return '(' + filter + ')';
    });
    var size = parseInt(request.query.size || '10', 10);
    var start = parseInt(request.query.start || '0', 10);
    var filter = filters.join(' && ');
    var requestedOutputColumns = request.query['return-fields'] || '';
    requestedOutputColumns = requestedOutputColumns.split(/\s*,\s*/);
    var outputColumns = domain.resultReturnableIndexFields
                              .filter(function(field) {
                                return requestedOutputColumns.indexOf(field.name) > -1;
                              })
                              .map(function(field) {
                                return field.columnName;
                              });
    outputColumns.unshift('_key');
    var options = {
      table:          domain.tableName,
      filter:         filter,
      limit:          size,
      offset:         start,
      output_columns: outputColumns.join(', ')
    };

    if (domain.hasSynonymsTableSync()) {
      options.query_expansion = domain.synonymsTableName + '.synonyms';
    }
    if (filter) {
      options.filter = filter;
    }

    if (facetParameter) {
      var facetReturnableFields = domain.facetReturnableIndexFields
                                    .map(function(field) {
                                      return field.name;
                                    });
      facetParameter = facetParameter.split(/\s*,\s*/)
                         .filter(function(field) {
                           return facetReturnableFields.indexOf(field) > -1;
                         })
                         .join(',');
      options.drilldown = facetParameter;
      options.drilldown_sortby = '-_nsubrecs';
      // TODO support sorting parameter
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
          'match-expr': matchExpr,
          hits: {
            found: numFoundRecords,
            start: start,
            hit: data
          },
          info: info
        };
        if (facetParameter) {
          var facetNames = facetParameter.split(',');
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
