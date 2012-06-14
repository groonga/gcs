exports.MINIMUM_DOMAIN_NAME_LENGTH = 3;
exports.MAXIMUM_DOMAIN_NAME_LENGTH = 28;
exports.INVALID_DOMAIN_NAME_CHARACTER_PATTERN = /[^-a-z0-9]/g;
exports.INVALID_TABLE_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;

function assertValidDomain(domain) {
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

function getTableNameFromDomain(domain) {
  assertValidDomain(domain);
  return domain;
}
exports.getTableNameFromDomain = getTableNameFromDomain;

function getTermsTableNameFromDomain(domain) {
  assertValidDomain(domain);
  return domain + '_BigramTerms';
}
exports.getTermsTableNameFromDomain = getTermsTableNameFromDomain;


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

function assertValidField(field) {
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

function getColumnNameFromField(field) {
  assertValidField(field);
  return field;
}
exports.getColumnNameFromField = getColumnNameFromField;
