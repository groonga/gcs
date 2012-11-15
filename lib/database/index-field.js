var nroonga = require('../wrapped-nroonga');
var ValidationError = require('../errors').ValidationError;

var MINIMUM_NAME_LENGTH =
      exports.MINIMUM_NAME_LENGTH =
      IndexField.MINIMUM_NAME_LENGTH = 3;
var MAXIMUM_NAME_LENGTH =
      exports.MAXIMUM_NAME_LENGTH =
      IndexField.MAXIMUM_NAME_LENGTH = 64;

var VALID_NAME_PATTERN =
      exports.VALID_NAME_PATTERN =
      IndexField.VALID_NAME_PATTERN = '[a-z][a-z0-9_]*';
var VALID_NAME_MATCHER =
      exports.VALID_NAME_MATCHER =
      IndexField.VALID_NAME_MATCHER = new RegExp('^' + VALID_NAME_PATTERN + '$');
var INVALID_COLUMN_NAME_CHARACTERS_MATCHER =
      exports.INVALID_COLUMN_NAME_CHARACTERS_MATCHER =
      IndexField.INVALID_COLUMN_NAME_CHARACTERS_MATCHER = /[^_a-z0-9]/g;

var VALID_FIELD_TYPES =
      IndexField.VALID_FIELD_TYPES =
      exports.VALID_FIELD_TYPES = [
        'text',
        'literal',
        'uint'
      ];

var RESERVED_NAMES =
      IndexField.RESERVED_NAMES =
      exports.RESERVED_NAMES = [
        'body',
        'docid',
        'text_relevance'
     ];
var RESERVED_COLUMN_NAMES =
      IndexField.RESERVED_COLUMN_NAMES =
      exports.RESERVED_COLUMN_NAMES = [
        '_key'
      ];

function assertValidFieldName(field) {
  if (typeof field != 'string') {
    var error = new Error('field name name must be a string');
    error.isValidationError = true;
    throw error;
  }

  var errors = [];
  var commonPrefix = 'Value \'' + field + '\' at \'%NAME_FIELD%\' failed ' +
                     'to satisfy constraint: ';

  if (!field.match(VALID_NAME_MATCHER)) {
    errors.push(commonPrefix + 'Member must satisfy regular ' +
                'expression pattern: ' + VALID_NAME_PATTERN);
  } else {
    var invalidCharacters = field.match(INVALID_COLUMN_NAME_CHARACTERS_MATCHER);
    if (invalidCharacters) {
      invalidCharacters = Array.prototype.slice.call(invalidCharacters, 0)
                            .map(function(aCharacter) {
                              return "'" + aCharacter + "'";
                            });
      errors.push(commonPrefix + 'Member cannot include these ' +
                  'characters: ' + invalidCharacters.join(', '));
    }
  }

  if (field.length < MINIMUM_NAME_LENGTH)
    errors.push(commonPrefix + 'Member must have length greater ' +
                'than or equal to ' + MINIMUM_NAME_LENGTH);

  if (field.length > MAXIMUM_NAME_LENGTH)
    errors.push(commonPrefix + 'Member must have length less ' +
                'than or equal to ' + MAXIMUM_NAME_LENGTH);

  var index = exports.RESERVED_NAMES.indexOf(field);
  if (index > -1) index = exports.RESERVED_COLUMN_NAMES.indexOf(field);
  if (index > -1)
    errors.push(field + ' is a reserved field name');

  if (errors.length) {
    var prefix = errors.length > 1 ? 
                   errors.length + ' validation errors detected: ' :
                   '1 validation error detected: ';
    throw new ValidationError(prefix + errors.join('; '));
  }
}

function assertValidFieldType(type) {
  var errors = [];
  var commonPrefix = 'Value \'' + type + '\' at \'%TYPE_FIELD%\' failed ' +
                     'to satisfy constraint: ';

  if (!type) {
    errors.push('Value null at \'%TYPE_FIELD%\' failed to satisfy ' +
                  'constraint: Member must not be null');
  } else {
    if (VALID_FIELD_TYPES.indexOf(type) < 0)
      errors.push(commonPrefix + 'Member must satisfy enum value set: [' +
                    VALID_FIELD_TYPES.join(', ') + ']');
  }

  if (errors.length) {
    var prefix = errors.length > 1 ? 
                   errors.length + ' validation errors detected: ' :
                   '1 validation error detected: ';
    throw new ValidationError(prefix + errors.join('; '));
  }
}

function IndexField(name, domain) {
  this.domain = domain;
  this.context = domain.context;
  this.name = name;
  this._type = null;
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
      if (column.range == this.indexTableName)
        return this._type = 'literal';
    } else if (column.type == 'fix') {
      if (column.range == nroonga.UInt32)
        return this._type = 'uint';
      else if (column.range == this.indexTableName)
        return this._type = 'literal';
    }

    throw new Error('unknown unfixed column ' + this.columnName);
  },
  set type(type) {
    assertValidFieldType(type);
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

    if (!this.exists() || this._facetEnabled !== undefined)
      return !!this._facetEnabled;

    var value = this.domain.getConfiguration(this.facetEnabledConfigurationKey);
    return !!(this._facetEnabled = value);
  },
  set facetEnabled(value) {
    var booleanValue = !!value;
    if (booleanValue != this.facetEnabled && this.type == 'uint')
      throw new Error('facet option cannot be configured for the type ' + this.type + '.');

    this._facetEnabled = booleanValue;
    return value;
  },
  setFacetEnabled: function(value) {
    this.facetEnabled = value;
    return this;
  },
  get facetEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_facet_enabled';
  },

  get resultEnabled() {
    if (this.type == 'uint')
      return true;

    if (!this.exists() || this._resultEnabled !== undefined)
      return !!this._resultEnabled;

    var value = this.domain.getConfiguration(this.resultEnabledConfigurationKey);
    return !!(this._resultEnabled = value);
  },
  set resultEnabled(value) {
    var booleanValue = !!value;
    if (booleanValue != this.resultEnabled && this.type == 'uint')
      throw new Error('returnable option cannot be configured for the type ' + this.type + '.');

    this._resultEnabled = !!value;
    return value;
  },
  setResultEnabled: function(value) {
    this.resultEnabled = value;
    return this;
  },
  get resultEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_result_enabled';
  },

  get searchEnabled() {
    if (this.type == 'text' || this.type == 'uint')
      return true;

    if (!this.exists() || this._searchEnabled !== undefined)
      return !!this._searchEnabled;

    var value = this.domain.getConfiguration(this.searchEnabledConfigurationKey);
    return !!(this._searchEnabled = value);
  },
  set searchEnabled(value) {
    var booleanValue = !!value;
    if (booleanValue != this.searchEnabled &&
        (this.type == 'text' || this.type == 'uint'))
      throw new Error('searchable option cannot be configured for the type ' + this.type + '.');

    this._searchEnabled = booleanValue;
    return value;
  },
  setSearchEnabled: function(value) {
    this.searchEnabled = value;
    return this;
  },
  get searchEnabledConfigurationKey() {
    return 'column_' + this.name + '_option_search_enabled';
  },

  get defaultSearchField() {
    if (!this.exists())
      return false;

    return this == this.domain.defaultSearchField;
  },
  set defaultSearchField(value) {
    this._defaultSearchField = !!value;
    return value;
  },
  setDefaultSearchField: function(value) {
    this.defaultSearchField = value;
    return value;
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

  get summary() {
    return this.name + ' ' + this.state + ' ' +
             this.type + ' (' + this.options + ')';
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
        flags: nroonga.TABLE_PAT_KEY,
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

    return this;
  },
  saveOptionsSync: function() {
    if (!this.exists()) return this;

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

    if (this._defaultSearchField !== undefined) {
      this.domain.defaultSearchField = this._defaultSearchField ? this : null ;
      delete this._defaultSearchField;
    }

    return this;
  },
  deleteSync: function() {
    // backup information for re-creation
    this._type = this.type;
    this._facetEnabled = this.facetEnabled;
    this._resultEnabled = this.resultEnabled;
    this._searchEnabled = this.searchEnabled;
    this._defaultSearchField = this.defaultSearchField;

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
    if (this._defaultSearchField)
      this.domain.defaultSearchField = null;

    return this;
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
        flags: nroonga.TABLE_PAT_KEY,
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
    return this;
  },

  exists: function() {
    return !!this.column;
  },

  upgradeToMultipleValuesSync: function() {
    if (this.multipleValues) return this;
    var values = this.domain.dumpSync();
    this.deleteSync();
    this.createSync(true);
    this.domain.loadSync(values);
    return this;
  }
};

exports.IndexField = IndexField;

IndexField.toColumnNamePart = function(fieldName) {
  return fieldName;
};
IndexField.toFieldName = function(columnNamePart) {
  return columnNamePart;
};
