var Database = require('../wrapped-nroonga').Database;

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
  fieldTypeToColumnType: function(fieldType) {
    switch (fieldType) {
      case 'text':
        return Database.ShortText;
      case 'uint':
        return Database.UInt32;
      case 'literal':
        return this.alterTableName;
      default:
        throw new Error('Unsupported index field type '+fieldType);
    }
  },
  columnTypeToFieldType: function(columnType) {
    switch (columnType) {
      case Database.ShortText:
        return 'text';
      case Database.UInt32:
        return 'uint';
      case this.alterTableName:
        return 'literal';
      default:
        throw new Error('Unsupported column type '+columnType);
    }
  },
  fieldTypeToAlterTableKeyType: function(fieldType) {
    switch (fieldType) {
      case 'uint':
        return Database.UInt32;
      case 'literal':
        return Database.ShortText;
      default:
        throw new Error('Unsupported index field type '+fieldType+
                        ' for alter table');
    }
  }
};

exports.IndexField = IndexField;
