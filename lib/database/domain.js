var nativeNroonga = require('nroonga');
var nroonga = require('../wrapped-nroonga');
var IndexField = require('./index-field').IndexField;

exports.MINIMUM_DOMAIN_NAME_LENGTH = 3;
exports.MAXIMUM_DOMAIN_NAME_LENGTH = 28;
exports.INVALID_DOMAIN_NAME_CHARACTER_PATTERN = /[^\-a-z0-9]/g;
exports.INVALID_TABLE_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;

function assertValidDomainName(domain) {
  if (typeof domain != 'string')
    throw new Error('domain name must be a string');

  if (domain.length < exports.MINIMUM_DOMAIN_NAME_LENGTH)
    throw new Error('too short domain name (minimum length = ' +
                    exports.MINIMUM_DOMAIN_NAME_LENGTH + ')');

  if (domain.length > exports.MAXIMUM_DOMAIN_NAME_LENGTH)
    throw new Error('too long domain name (max length = ' +
                   exports.MAXIMUM_DOMAIN_NAME_LENGTH + ')');

  var invalidCharacter = domain.match(exports.INVALID_DOMAIN_NAME_CHARACTER_PATTERN) ||
                         domain.match(exports.INVALID_TABLE_NAME_CHARACTER_PATTERN);
  if (invalidCharacter) {
    var characters = Array.prototype.map.call(invalidCharacter, function(aCharacter) {
                       return '"' + aCharacter + '"';
                     });
    throw new Error(characters.join(', ') + ' cannot appear in a domain name');
  }
}

// Accepts two arguments: source and context.
// You can give them in the reversed order, like:
// new Domain("source", context) or new Domain(context, "source")
function Domain() {
  var source, context;
  for (var i = 0, maxi = arguments.length, argument; i < maxi; i++) {
    argument = arguments[i];
    if (!argument) continue;
    if (argument instanceof nroonga.Context ||
        argument instanceof nativeNroonga.Database) {
      context = argument;
    } else if (argument) {
      source = argument;
    }
  }

  if (source instanceof Domain)
    return source;

  this.initialize(source, context);
}
Domain.prototype = {
  initialize: function(source, context) {
    this.context = context && new nroonga.Context(context);
    this.name = this.getName(source);
    this.cachedIndexFields = {};
    // for validation
    this.tableName;
    this.termsTableName;
  },
  getName: function(source) {
    if (typeof source == 'string')
      return source;

    if (source.query && source.query.DomainName)
      return source.query.DomainName;

    if (source.headers && source.headers.host) {
      var host = source.headers.host;
      var domainNameFromHost = Domain.getNameFromHost(host);
      if (domainNameFromHost)
        return domainNameFromHost;
    }

    if (source.url) {
      var domainNameFromPath = Domain.getNameFromPath(source.url);
      if (domainNameFromPath)
        return domainNameFromPath;
    }

    throw new Error('no domain name');
  },
  get tableName() {
    if (!this._tableName) {
      assertValidDomainName(this.name);
      this._tableName = this.name;
    }
    return this._tableName;
  },
  get termsTableName() {
    if (!this._termsTableName)
      this._termsTableName = this.tableName + '_BigramTerms';
    return this._termsTableName;
  },
  getIndexField: function(field) {
    return this.cachedIndexFields[field] ||
           (this.cachedIndexFields[field] = new IndexField(field, this));
  },
  get indexFields() {
    if (!this.context)
      throw new Error('no context');
    var columns = this.context.ordinalColumnsSync(this.tableName);
    var fields = columns.map(function(column) {
                   // XXX The "name" must be the field name given by the user,
                   // not normalized. Because there is no such information in the
                   // context and currently the column name is luckly equals to the
                   // given field name, we can use the column name.
                   var name = column.name;
                   return this.getIndexField(name);
                 }, this);
    return fields;
  },
  get synonymTableName() {
    if (!this._synonymTableName)
      this._synonymTableName = this.tableName + '_synonyms';
    return this._synonymTableName;
  },

  createSync: function() {
    if (!this.context)
      throw new Error('no context');

    this.context.commandSync('table_create', {
      name: this.tableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText
    });
    this.context.commandSync('table_create', {
      name: this.termsTableName,
      flags: nroonga.TABLE_PAT_KEY + '|' + nroonga.KEY_NORMALIZE,
      key_type: nroonga.ShortText,
      default_tokenizer: nroonga.TokenBigram
    });
  },
  deleteSync: function() {
    if (!this.context)
      throw new Error('no context');

    this.context.commandSync('table_remove', {
      name: this.tableName
    });
    this.context.commandSync('table_remove', {
      name: this.termsTableName
    });
  },
  reindexSync: function() {
    var indexFields = this.indexFields;
    indexFields.forEach(function(field) {
      var fieldName = field.name;
      var fieldType = field.type;
      if (fieldType == 'uint' || fieldType == 'literal') {
        this.context.commandSync('column_remove', {
          table: field.alterTableName,
          name: field.indexColumnName
        });
        this.context.commandSync('table_remove', {
          name: field.alterTableName
        });
        this.context.commandSync('table_create', {
          name: field.alterTableName,
          flags: nroonga.TABLE_HASH_KEY,
          key_type: field.alterTableKeyType
        });
        this.context.commandSync('column_create', {
          table: field.alterTableName,
          name: field.indexColumnName,
          flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
          type: this.tableName,
          source: field.columnName
        });
      } else {
        this.context.commandSync('column_remove', {
          table: this.termsTableName,
          name: field.indexColumnName
        });
        this.context.commandSync('column_create', {
          table: this.termsTableName,
          name: field.indexColumnName,
          flags: nroonga.INDEX_COLUMN_DEFAULT_FLAGS,
          type: this.tableName,
          source: field.columnName
        });
      }
    }, this);
  }
};

exports.Domain = Domain;

Domain.getNameFromHost = function(host) {
  var domainMatcher = /^(?:doc|search)-([^\.]+)-([^\.\-]+)\./;
  var match = host.match(domainMatcher);
  if (match)
    return match[1];

  return '';
};

Domain.getNameFromPath = function(path) {
  var domainMatcher = /^\/gcs\/([^\/]+)/;

  var match = path.match(domainMatcher);
  if (match)
    return match[1];

  return '';
};
