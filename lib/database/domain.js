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

function Domain(source) {
  if (source instanceof Domain)
    return source;

  this.initialize(source);
}
Domain.prototype = {
  initialize: function(source) {
    this.name = this.getName(source);
    this.indexFields = {};
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

    var domainNameFromPath = Domain.getNameFromPath(source.url);
    if (domainNameFromPath)
      return domainNameFromPath;

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
    return this.indexFields[field] ||
           (this.indexFields[field] = new IndexField(field, this));
  },
  getIndexFieldsSync: function(context) {
    var columns = context.ordinalColumnsSync(this.tableName);
    var fields = columns.map(this.columnToIndexField, this);
    return fields;
  },
  columnToIndexField: function(column) {
    // XXX The "name" must be the field name given by the user,
    // not normalized. Because there is no such information in the
    // context and currently the column name is luckly equals to the
    // given field name, we can use the column name.
    var name = column.name;
    var field = this.getIndexField(name);

    var type;
    if (column.type == 'var') {
      if (column.range == nroonga.ShortText)
        type = 'text';
    } else if (column.type == 'fix') {
      if (column.range == nroonga.UInt32)
        type = 'uint';
      else if (column.range == field.alterTableName)
        type = 'literal';
    }
    if (!type)
      throw new Error('unknown unfixed column '+column.name);

    field.type = type;
    return field;
  },
  get synonymTableName() {
    if (!this._synonymTableName)
      this._synonymTableName = this.tableName + '_synonyms';
    return this._synonymTableName;
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
