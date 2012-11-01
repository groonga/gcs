var Domain = require('./database').Domain;
var BooleanQueryTranslator = require('./bq-translator').BooleanQueryTranslator;

function translateQueryToBooleanQuery(query) {
  return "'" + query.replace(/(['\\])/g, '\\$1') + "'";
}

// this should be re-implemented as a class
function SelectQuery(request, context) {
  this.request = request;
  this.domain = new Domain(request, context);

  this.filters         = [];
  this.matchExpression = '';
  this.noResult        = false;

  this.parse();
}

SelectQuery.prototype = {
  get query() {
    return this.request.query.q || '';
  },

  get booleanQuery() {
    return this.request.query.bq || '';
  },

  get size() {
    if (this._size === undefined)
      this._size = this.prepareSize();
    return this._size;
  },
  prepareSize: function() {
    return parseInt(this.request.query.size || '10', 10);
  },

  get start() {
    if (this._start === undefined)
      this._start = this.prepareStart();
    return this._start;
  },
  prepareStart: function() {
    return parseInt(this.request.query.start || '0', 10);
  },

  get returnFields() {
    if (this._returnFields === undefined)
      this._returnFields = this.prepareReturnFields();
    return this._returnFields;
  },
  prepareReturnFields: function() {
    var fields = this.request.query['return-fields'];
    if (fields)
      return fields.split(/\s*,\s*/);
    else
      return [];
  },

  get facets() {
    if (this._facets === undefined)
      this._facets = this.prepareFacets();
    return this._facets;
  },
  prepareFacets: function() {
    var facets = this.request.query.facet;
    if (facets)
      return facets.split(/\s*,\s*/);
    else
      return [];
  },

  get defaultFieldNames() {
    if (this._defaultFieldNames === undefined)
      this._defaultFieldNames = this.prepareDefaultFieldNames();
    return this._defaultFieldNames;
  },
  prepareDefaultFieldNames: function() {
    var defaultFields;
    var defaultField = this.domain.defaultSearchField;
    if (defaultField)
      defaultFields = [defaultField];
    else
      defaultFields = this.domain.searchableIndexFields.filter(function(field) {
        return field.type == 'text';
      });

    return defaultFields.map(function(field) {
      return field.name;
    });
  },

  get sortKey() {
    if (this._sortKey === undefined)
      this,_sortKey = this.prepareSortKey();
    return this._sortKey;
  },
  prepareSortKey: function() {
    var sortKey = this.request.query.rank;
    if (!sortKey)
      return null;

    var fieldName = sortKey.replace(/^-/, '');
    if (!this.domain.getIndexField(fieldName).exists())
      return null;

    return sortKey;
  },

  get rankExpression() {
    return this.sortKey || '-text_relevance';
  },

  parse: function() {
    var filters = [];
    var matchExpression = '';

    if (this.query) {
      var queryAsBooleanQuery = translateQueryToBooleanQuery(this.query);
      var translator = new BooleanQueryTranslator(queryAsBooleanQuery);
      translator.domain = this.domain;
      translator.defaultFieldNames = this.defaultFieldNames;
      try {
        filters.push(translator.translate());
      } catch (error) {
        error.queryType = 'q';
        throw error;
      }
      matchExpression = '(label ' + queryAsBooleanQuery + ')';
    }

    if (this.booleanQuery) {
      var translator = new BooleanQueryTranslator(this.booleanQuery);
      translator.domain = this.domain;
      translator.defaultFieldNames = this.defaultFieldNames;
      try {
        filters.push(translator.translate());
      } catch (error) {
        error.queryType = 'bq';
        throw error;
      }
      this.noResult = !translator.available;
      if (matchExpression.length > 0) {
        matchExpression = '(and ' + matchExpression + ' ' + this.booleanQuery + ')';
      } else {
        matchExpression = this.booleanQuery;
      }
    }

    this.filters = filters.map(function(filter) {
      return '(' + filter + ')';
    });
    this.matchExpression = matchExpression;
  },

  get emptyReturnFields() {
    if (this._emptyReturnFields === undefined)
      this._emptyReturnFields = this.prepareEmptyReturnFields();
    return this._emptyReturnFields;
  },
  prepareEmptyReturnFields: function() {
    return this.returnFields.filter(function(fieldName) {
      var field = this.domain.getIndexField(fieldName);
      return field.exists() && !field.resultEnabled;
    }, this)
  },

  get availableFacets() {
    if (this._availableFacets === undefined)
      this._availableFacets = this.prepareAvailableFacets();
    return this._availableFacets;
  },
  prepareAvailableFacets: function() {
    var facetReturnableFields = this.domain.facetReturnableIndexFields
                                  .map(function(field) {
                                    return field.name;
                                  });
    return this.facets.filter(function(field) {
      return facetReturnableFields.indexOf(field) > -1;
    });
  },

  get emptyFacets() {
    if (this._emptyFacets === undefined)
      this._emptyFacets = this.prepareEmptyFacets();
    return this._emptyFacets;
  },
  prepareEmptyFacets: function() {
    return this.facets.filter(function(fieldName) {
      var field = this.domain.getIndexField(fieldName);
      return field.exists() && !field.facetEnabled;
    }, this)
  },

  // for groonga query
  get filter() {
    return this.filters.join(' && ');
  },

  get drilldownColumns() {
    if (this._drilldownColumns === undefined)
      this._drilldownColumns = this.prepareDrilldownColumns();
    return this._drilldownColumns;
  },
  prepareDrilldownColumns: function() {
    return this.availableFacets.map(function(field) {
      return this.domain.getIndexField(field).columnName;
    }, this);
  },

  get outputColumns() {
    if (this._outputColumns === undefined)
      this._outputColumns = this.prepareOutputColumns();
    return this._outputColumns;
  },
  prepareOutputColumns: function() {
    var returnFields = this.returnFields;
    var columns = this.domain.resultReturnableIndexFields
                    .filter(function(field) {
                      return returnFields.indexOf(field.name) > -1;
                    })
                    .map(function(field) {
                      return field.columnName;
                    });
    columns.unshift('_key');
    return columns;
  },

  get selectOptions() {
    if (this._selectOptions === undefined)
      this._selectOptions = this.prepareSelectOptions();
    return this._selectOptions;
  },
  prepareSelectOptions: function() {
    var options = {
      table:          this.domain.tableName,
      filter:         this.filter,
      limit:          this.size,
      offset:         this.start,
      output_columns: this.outputColumns.join(', ')
    };

    if (this.sortKey)
      options.sortby = this.sortKey;

    if (this.domain.hasSynonymsTableSync())
      options.query_expansion = this.domain.synonymsTableName + '.synonyms';

    if (this.facets.length) {
      options.drilldown = this.drilldownColumns.join(',');
      options.drilldown_sortby = '-_nsubrecs';
      // TODO support sorting parameter
      // TODO support facet-FIELD-top-n parameter
    }
    return options;
  }
};

exports.SelectQuery = SelectQuery;
