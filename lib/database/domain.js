var nativeNroonga = require('nroonga');
var nroonga = require('../wrapped-nroonga');
var IndexField = require('./index-field').IndexField;

exports.MINIMUM_NAME_LENGTH = 3;
exports.MAXIMUM_NAME_LENGTH = 28;
exports.INVALID_NAME_CHARACTER_PATTERN = /[^\-a-z0-9]/g;
exports.INVALID_TABLE_NAME_CHARACTER_PATTERN = /[^_a-z0-9]/g;

var DEFAULT_ID =
      exports.DEFAULT_ID =
      Domain.DEFAULT_ID = '00000000000000000000000000';

function assertValidDomainName(domain) {
  if (typeof domain != 'string')
    throw new Error('domain name must be a string');

  if (domain.length < exports.MINIMUM_NAME_LENGTH)
    throw new Error('too short domain name (minimum length = ' +
                    exports.MINIMUM_NAME_LENGTH + ')');

  if (domain.length > exports.MAXIMUM_NAME_LENGTH)
    throw new Error('too long domain name (max length = ' +
                   exports.MAXIMUM_NAME_LENGTH + ')');

  var invalidCharacter = domain.match(exports.INVALID_NAME_CHARACTER_PATTERN) ||
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
    this.cachedIndexFields = {};

    this.context = context && new nroonga.Context(context);
    this.initializeNameAndId(source);

    // for validation
    this.tableName;
    this.termsTableName;
  },
  initializeNameAndId: function(source) {
    if (typeof source == 'string') {
      this.name = source;
      this.id = this.getIdForTable(this.toTableNamePart(this.name));
      return;
    }

    if (source.query && source.query.DomainName) {
      this.name = source.query.DomainName;
      this.id = this.getIdForTable(this.toTableNamePart(this.name));
      return;
    }

    if (source.headers && source.headers.host) {
      var host = source.headers.host;
      var nameAndIdFromHost = Domain.getNameAndIdFromHost(host);
      if (nameAndIdFromHost.name) {
        this.name = nameAndIdFromHost.name;
        this.id = nameAndIdFromHost.id;
        return;
      }
    }

    if (source.url) {
      var nameAndIdFromPath = Domain.getNameAndIdFromPath(source.url);
      if (nameAndIdFromPath.name) {
        this.name = nameAndIdFromPath.name;
        this.id = nameAndIdFromPath.id;
        return;
      }
    }

    throw new Error('no domain name');
  },
  getIdForTable: function(tableName) {
    if (this.context) {
      var tables = this.context.tableListSync();
      var tableIdMatcher = new RegExp('^' + tableName + '_([^_]+)$');
      var id;
      if (tables.some(function(table) {
            var match = table.name.match(tableIdMatcher);
            if (match) {
              id = match[1];
              return true;
            }
            return false;
          }, this))
        return id;
    }
    return this.createNewId();
  },
  createNewId: function() {
    var size = 26;
    var characters = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    var lastIndex = characters.length;
    var id = '';
    while (id.length < size) {
      id += characters[Math.round(Math.random() * lastIndex)];
    }
    return id;
  },

  get tableName() {
    if (!this._tableName) {
      assertValidDomainName(this.name);
      this._tableName = this.toTableNamePart(this.name) + '_' + this.id;
    }
    return this._tableName;
  },
  toTableNamePart: function(string) {
    return string;
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
                   // context and currently the column name is luckily equals to the
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

  get id() {
    return this._id === undefined ? DEFAULT_ID : this._id ;
  },
  set id(value) {
    this._id = value;
    // clear caches
    delete this._tableName;
    delete this._termsTableName;
    delete this._synonymTableName;
    return value;
  },

  get domainId() {
    return this.id + '/' + this.name;
  },

  get searchableDocumentsCount() {
    return 0;
  },
  get requiresIndexDocuments() {
    return false;
  },
  get searchInstanceCount() {
    return 0;
  },
  get searchPartitionCount() {
    return 0;
  },

  getDocumentsEndpoint: function(hostname) {
    return 'doc-' + this.name + '-' + this.id + hostname;
  },
  getSearchEndpoint: function(hostname) {
    return 'search-' + this.name + '-' + this.id + hostname;
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
    this.indexFields.forEach(function(field) {
      field.reindexSync();
    });
  },
  updateSynonymsSync: function(synonymOptions) {
    if (!this.context)
      throw new Error('no context');
    var synonyms = synonymOptions.synonyms;

    try {
      this.context.commandSync('table_remove', {
        table: this.synonymTableName
      });
    } catch (error) {
      // The synonym table should be inexistent. Do nothing.
    }

    this.context.commandSync('table_create', {
      name: this.synonymTableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText,
      flags: nroonga.KEY_NORMALIZE
    });
    this.context.commandSync('column_create', {
      table: this.synonymTableName,
      name: 'synonyms',
      type: nroonga.ShortText,
      flags: nroonga.COLUMN_VECTOR
    });

    var load = Object.keys(synonyms).map(function(key) {
      return {_key: key, synonyms: synonyms[key]};
    });
    this.context.commandSync('load', {
      table: this.synonymTableName,
      values: JSON.stringify(load)
    });
  },
  isSynonymTableAvailableSync: function() {
    var results = this.context.commandSync('table_list');
    var tables = nroonga.formatResults(results);
    var self = this;
    return tables.some(function(table) {
      return table.name === self.synonymTableName;
    });
  }
};

exports.Domain = Domain;

Domain.getNameAndIdFromHost = function(host) {
  var domainMatcher = /^(?:doc|search)-([^\.]+)-([^\.\-]+)\./;
  var match = host.match(domainMatcher);
  if (match)
    return { name: match[1], id: match[2] };

  return { name: '', id: '' };
};

Domain.getNameAndIdFromPath = function(path) {
  var domainMatcher = /^\/gcs\/([^\/]+)-([^\/\-]+)/;

  var match = path.match(domainMatcher);
  if (match)
    return { name: match[1], id: match[2] };

  return { name: '', id: '' };
};
