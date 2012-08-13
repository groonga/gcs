var nroonga = require('../wrapped-nroonga');

exports.MINIMUM_NAME_LENGTH = 3;
exports.MAXIMUM_NAME_LENGTH = 64;
exports.INVALID_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;
exports.INVALID_COLUMN_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;
exports.RESERVED_NAMES = [
  'body',
  'docid',
  'text_relevance'
];
exports.RESERVED_COLUMN_NAMES = [
  '_key'
];

function assertValidFieldName(field) {
  if (typeof field != 'string')
    throw new Error('field name must be a string');

  if (field.length < exports.MINIMUM_NAME_LENGTH)
    throw new Error('too short field name (minimum length = ' +
                    exports.MINIMUM_NAME_LENGTH + ')');

  if (field.length > exports.MAXIMUM_NAME_LENGTH)
    throw new Error('too long field name (max length = ' +
                   exports.MAXIMUM_NAME_LENGTH + ')');

  var invalidCharacter = field.match(exports.INVALID_NAME_CHARACTER_PATTERN) ||
                         field.match(exports.INVALID_COLUMN_NAME_CHARACTER_PATTERN);
  if (invalidCharacter) {
    var characters = Array.prototype.map.call(invalidCharacter, function(aCharacter) {
                       return '"' + aCharacter + '"';
                     });
    throw new Error(characters.join(', ') + ' cannot appear in a field name');
  }

  var index = exports.RESERVED_NAMES.indexOf(field);
  if (index > -1) index = exports.RESERVED_COLUMN_NAMES.indexOf(field);
  if (index > -1)
    throw new Error(field + ' is a reserved field name');
}

function IndexField(name, domain) {
  this.domain = domain;
  this.context = domain.context;
  this.name = name;
  this.type = null;
  this.initialize();
};
IndexField.prototype = {
  initialize: function() {
    // for validation
    this.columnName;
  },
  get columnName() {
    if (!this._columnName) {
      assertValidFieldName(this.name);
      this._columnName = IndexField.toColumnNamePart(this.name);
    }
    return this._columnName;
  },
  get indexColumnName() {
    return this.domain.indexTableBaseName + this.columnName;
  },
  get indexTableName() {
    return this.domain.indexTableBaseName + this.columnName;
  },
  get indexTableKeyType() {
    var type = this.type;
    switch (type) {
      case 'uint':
        return nroonga.UInt32;
      case 'literal':
        return nroonga.ShortText;
      default:
        throw new Error('Unsupported index field type ' + type +
                        ' for index table');
    }
  },
  fieldTypeToColumnType: function(fieldType) {
    switch (fieldType) {
      case 'text':
        return nroonga.ShortText;
      case 'uint':
        return nroonga.UInt32;
      case 'literal':
        return this.indexTableName;
      default:
        throw new Error('Unsupported index field type ' + fieldType);
    }
  },
  columnTypeToFieldType: function(columnType) {
    switch (columnType) {
      case nroonga.ShortText:
        return 'text';
      case nroonga.UInt32:
        return 'uint';
      case this.indexTableName:
        return 'literal';
      default:
        throw new Error('Unsupported column type ' + columnType);
    }
  },

  get column() {
    var columns = this.context.ordinalColumnsSync(this.domain.tableName);
    for (var i = 0, maxi = columns.length; i < maxi; i++) {
      if (columns[i].name == this.columnName)
        return columns[i];
    }
    return null;
  },

  get type() {
    if (this._type)
      return this._type;

    var column = this.column;
    if (!column)
      throw new Error('the index field ' + this.name + ' is not created yet');

    if (column.type == 'var') {
      if (column.range == nroonga.ShortText)
        return this._type = 'text';
    } else if (column.type == 'fix') {
      if (column.range == nroonga.UInt32)
        return this._type = 'uint';
      else if (column.range == this.indexTableName)
        return this._type = 'literal';
    }

    throw new Error('unknown unfixed column ' + this.columnName);
  },
  set type(type) {
    return this._type = type
  },
  setType: function(type) {
    this.type = type;
    return this;
  },

  get defaultValue() {
    return null;
  },

  get facetEnabled() {
    // uint fields cannot be drilldowned by groonga...
    if (this.type == 'uint')
      return false;

    if (!this.column || this._facetEnabled !== undefined)
      return !!this._facetEnabled;

    var value = this.domain.getConfiguration(this.facetEnabledConfigurationKey);
    return !!(this._facetEnabled = value);
  },
  set facetEnabled(value) {
    if (this.type == 'uint')
      throw new Error('facet option cannot be configured for the type ' + this.type);

    this._facetEnabled = value;
    return value;
  },
  setFacetEnabled: function(value) {
    this.facetEnabled = value;
    return value;
  },
  get facetEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_facet_enabled';
  },

  get resultEnabled() {
    if (this.type == 'uint')
      return true;

    if (!this.column || this._resultEnabled !== undefined)
      return !!this._resultEnabled;

    var value = this.domain.getConfiguration(this.resultEnabledConfigurationKey);
    return !!(this._resultEnabled = value);
  },
  set resultEnabled(value) {
    if (this.type == 'uint')
      throw new Error('returnable option cannot be configured for the type ' + this.type);

    this._resultEnabled = value;
    return value;
  },
  setResultEnabled: function(value) {
    this.resultEnabled = value;
    return value;
  },
  get resultEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_result_enabled';
  },

  get searchEnabled() {
    if (this.type == 'text' || this.type == 'uint')
      return true;

    if (!this.column || this._searchEnabled !== undefined)
      return !!this._searchEnabled;

    var value = this.domain.getConfiguration(this.searchEnabledConfigurationKey);
    return !!(this._searchEnabled = value);
  },
  set searchEnabled(value) {
    if (this.type == 'text' || this.type == 'uint')
      throw new Error('searchable option cannot be configured for the type ' + this.type);

    this._searchEnabled = value;
    return value;
  },
  setSearchEnabled: function(value) {
    this.searchEnabled = value;
    return value;
  },
  get searchEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_search_enabled';
  },

  get options() {
    var options = [];
    if (this.searchEnabled) options.push('Search');
    if (this.facetEnabled) options.push('Facet');
    if (this.resultEnabled) options.push('Result');
    return options.join(' ');
  },

  get state() {
    return 'Active';
  },

  get multipleValues() {
    return !!this.column &&
           this.column.flags.indexOf(nroonga.COLUMN_VECTOR) > -1;
  },

  createSync: function(multipleValues) {
    var indexTableName = this.domain.termsTableName;

    var type = this.type;
    var columnType = this.fieldTypeToColumnType(type);

    if (type == 'uint' || type == 'literal') {
      this.context.commandSync('table_create', {
        name: this.indexTableName,
        flags: nroonga.TABLE_HASH_KEY,
        key_type: this.indexTableKeyType
      });
      indexTableName = this.indexTableName;
    }

    var columnFlags = multipleValues ?
                        nroonga.COLUMN_VECTOR : nroonga.COLUMN_SCALAR;
    this.context.commandSync('column_create', {
      table: this.domain.tableName,
      name: this.columnName,
      flags: columnFlags,
      type: columnType
    });
    this.context.commandSync('column_create', {
      table: indexTableName,
      name: this.indexColumnName,
      flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
      type: this.domain.tableName,
      source: this.columnName
    });

    this.saveOptionsSync();
  },
  saveOptionsSync: function() {
    if (!this.exists()) return;

    this.facetEnabled;
    if (this._facetEnabled !== undefined)
      this.domain.setConfiguration(this.facetEnabledConfigurationKey,
                                   this._facetEnabled);

    this.resultEnabled;
    if (this._resultEnabled !== undefined)
      this.domain.setConfiguration(this.resultEnabledConfigurationKey,
                                   this._resultEnabled);

    this.searchEnabled;
    if (this._searchEnabled !== undefined)
      this.domain.setConfiguration(this.searchEnabledConfigurationKey,
                                   this._searchEnabled);
  },
  deleteSync: function() {
    // backup information for re-creation
    this._type = this.type;
    this._facetEnabled = this.facetEnabled;
    this._resultEnabled = this.resultEnabled;
    this._searchEnabled = this.searchEnabled;

    if (this._type == 'uint' || this._type == 'literal') {
      this.context.commandSync('table_remove', {
        name: this.indexTableName
      });
    }
    this.context.commandSync('column_remove', {
      table: this.domain.tableName,
      name: this.columnName
    });

    this.domain.deleteConfiguration(this.facetEnabledConfigurationKey);
    this.domain.deleteConfiguration(this.resultEnabledConfigurationKey);
    this.domain.deleteConfiguration(this.searchEnabledConfigurationKey);
  },
  reindexSync: function() {
    var name = this.name;
    var type = this.type;
    if (type == 'uint' || type == 'literal') {
      this.context.commandSync('column_remove', {
        table: this.indexTableName,
        name: this.indexColumnName
      });
      this.context.commandSync('table_remove', {
        name: this.indexTableName
      });
      this.context.commandSync('table_create', {
        name: this.indexTableName,
        flags: nroonga.TABLE_HASH_KEY,
        key_type: this.indexTableKeyType
      });
      this.context.commandSync('column_create', {
        table: this.indexTableName,
        name: this.indexColumnName,
        flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
        type: this.domain.tableName,
        source: this.columnName
      });
    } else {
      this.context.commandSync('column_remove', {
        table: this.domain.termsTableName,
        name: this.indexColumnName
      });
      this.context.commandSync('column_create', {
        table: this.domain.termsTableName,
        name: this.indexColumnName,
        flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
        type: this.domain.tableName,
        source: this.columnName
      });
    }
  },

  exists: function() {
    return !!this.column;
  },

  upgradeToMultipleValuesSync: function() {
    if (this.multipleValues) return;
    var values = this.domain.dumpSync();
    this.deleteSync();
    this.createSync(true);
    this.domain.loadSync(values);
  }
};

exports.IndexField = IndexField;

IndexField.toColumnNamePart = function(fieldName) {
  return fieldName;
};
IndexField.toFieldName = function(columnNamePart) {
  return columnNamePart;
};
