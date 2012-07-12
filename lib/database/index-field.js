var nroonga = require('../wrapped-nroonga');

exports.MINIMUM_FIELD_NAME_LENGTH = 3;
exports.MAXIMUM_FIELD_NAME_LENGTH = 64;
exports.INVALID_FIELD_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;
exports.INVALID_COLUMN_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;
exports.RESERVED_FIELD_NAMES = [
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

  if (field.length < exports.MINIMUM_FIELD_NAME_LENGTH)
    throw new Error('too short field name (minimum length = ' +
                    exports.MINIMUM_FIELD_NAME_LENGTH + ')');

  if (field.length > exports.MAXIMUM_FIELD_NAME_LENGTH)
    throw new Error('too long field name (max length = ' +
                   exports.MAXIMUM_FIELD_NAME_LENGTH + ')');

  var invalidCharacter = field.match(exports.INVALID_FIELD_NAME_CHARACTER_PATTERN) ||
                         field.match(exports.INVALID_COLUMN_NAME_CHARACTER_PATTERN);
  if (invalidCharacter) {
    var characters = Array.prototype.map.call(invalidCharacter, function(aCharacter) {
                       return '"' + aCharacter + '"';
                     });
    throw new Error(characters.join(', ') + ' cannot appear in a field name');
  }

  var index = exports.RESERVED_FIELD_NAMES.indexOf(field);
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
    this.indexColumnName;
  },
  get columnName() {
    if (!this._columnName) {
      assertValidFieldName(this.name);
      this._columnName = this.name;
    }
    return this._columnName;
  },
  get indexColumnName() {
    if (!this._indexColumnName)
      this._indexColumnName = this.domain.tableName + '_' + this.columnName;
    return this._indexColumnName;
  },
  get alterTableName() {
    if (!this._alterTableName)
      this._alterTableName = this.domain.tableName + '_' + this.columnName;
    return this._alterTableName;
  },
  get alterTableKeyType() {
    var type = this.type;
    switch (type) {
      case 'uint':
        return nroonga.UInt32;
      case 'literal':
        return nroonga.ShortText;
      default:
        throw new Error('Unsupported index field type '+type+
                        ' for alter table');
    }
  },
  fieldTypeToColumnType: function(fieldType) {
    switch (fieldType) {
      case 'text':
        return nroonga.ShortText;
      case 'uint':
        return nroonga.UInt32;
      case 'literal':
        return this.alterTableName;
      default:
        throw new Error('Unsupported index field type '+fieldType);
    }
  },
  columnTypeToFieldType: function(columnType) {
    switch (columnType) {
      case nroonga.ShortText:
        return 'text';
      case nroonga.UInt32:
        return 'uint';
      case this.alterTableName:
        return 'literal';
      default:
        throw new Error('Unsupported column type '+columnType);
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
      else if (column.range == this.alterTableName)
        return this._type = 'literal';
    }

    throw new Error('unknown unfixed column '+this.columnName);
  },
  set type(type) {
    return this._type = type
  },

  createSync: function() {
    var alterTableName = this.domain.termsTableName;

    var type = this.type;
    var columnType = this.fieldTypeToColumnType(type);

    if (type == 'uint' || type == 'literal') {
      this.context.commandSync('table_create', {
        name: this.alterTableName,
        flags: nroonga.TABLE_HASH_KEY,
        key_type: this.alterTableKeyType
      });
      alterTableName = this.alterTableName;
    }

    this.context.commandSync('column_create', {
      table: this.domain.tableName,
      name: this.columnName,
      flags: nroonga.COLUMN_SCALAR,
      type: columnType
    });
    this.context.commandSync('column_create', {
      table: alterTableName,
      name: this.indexColumnName,
      flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
      type: this.domain.tableName,
      source: this.columnName
    });
  },
  deleteSync: function() {
    var type = this.type;
    if (type == 'uint' || type == 'literal') {
      this.context.commandSync('table_remove', {
        name: this.alterTableName
      });
    }
    this.context.commandSync('column_remove', {
      table: this.domain.tableName,
      name: this.columnName
    });
  },
  reindexSync: function() {
    var name = this.name;
    var type = this.type;
    if (type == 'uint' || type == 'literal') {
      this.context.commandSync('column_remove', {
        table: this.alterTableName,
        name: this.indexColumnName
      });
      this.context.commandSync('table_remove', {
        name: this.alterTableName
      });
      this.context.commandSync('table_create', {
        name: this.alterTableName,
        flags: nroonga.TABLE_HASH_KEY,
        key_type: this.alterTableKeyType
      });
      this.context.commandSync('column_create', {
        table: this.alterTableName,
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
        type: this.tableName,
        source: this.columnName
      });
    }
  }
};

exports.IndexField = IndexField;
