exports.MINIMUM_DOMAIN_NAME_LENGTH = 3;
exports.MAXIMUM_DOMAIN_NAME_LENGTH = 28;
exports.INVALID_DOMAIN_NAME_CHARACTER_PATTERN = /[^-a-z0-9]/g;
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

function Domain(domainName) {
  this.domainName = domainName;
  this.initialize();
}
Domain.prototype = {
  initialize: function() {
    this.tableName = this.getTableName();
    this.termsTableName = this.getTermsTableName();
  },
  getTableName: function() {
    assertValidDomainName(this.domainName);
    return this.domainName;
  },
  getTermsTableName: function() {
    assertValidDomainName(this.domainName);
    return this.domainName + '_BigramTerms';
  }
};

exports.Domain = Domain;
