/**
 * Naming rule of generated tables:
 *   main table:   <domain name>_<domain id>
 *   index tables: <domain name>_<domain id>_index_<column name>
 *   meta tables:  <domain name>_<domain id>_synonyms
 */

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

var INDEX_SUFFIX =
      exports.INDEX_SUFFIX =
      Domain.INDEX_SUFFIX = 'index';

var SYNONYMS_COLUMN = 
      exports.SYNONYMS_COLUMN =
      Domain.SYNONYMS_COKUMN = 'synonyms'

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
  },
  initializeNameAndId: function(source) {
    if (typeof source == 'string') {
      this.name = source;
      this.initializeId();
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
  initializeId: function() {
    this.id = this.getIdFromDatabase() || this.createNewId();
  },
  getIdFromDatabase: function() {
    if (this.context) {
      var tableName = Domain.toTableNamePart(this.name);
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
    return null;
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
      this._tableName = Domain.toTableNamePart(this.name) + '_' + this.id;
    }
    return this._tableName;
  },

  get indexTableBaseName() {
    return this.tableName + '_' + INDEX_SUFFIX + '_';
  },

  get termsTableName() {
    return this.indexTableBaseName + 'BigramTerms';
  },

  get synonymsTableName() {
    return this.tableName + '_synonyms';
  },

  getIndexField: function(field) {
    return this.cachedIndexFields[field] ||
           (this.cachedIndexFields[field] = new IndexField(field, this));
  },
  get indexFields() {
    if (!this.context)
      throw new Error('no context');
    var columns = this.context.ordinalColumnsSync(this.tableName);
    columns = columns.sort(function(a, b) { return a.name - b.name; });
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

  get id() {
    return this._id === undefined ? DEFAULT_ID : this._id ;
  },
  set id(value) {
    this._id = value;
    // clear cache
    delete this._tableName;
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
    if (hostname[0] != '.')
      hostname = '.' + hostname;
    return 'doc-' + this.name + '-' + this.id + hostname;
  },
  getSearchEndpoint: function(hostname) {
    if (hostname[0] != '.')
      hostname = '.' + hostname;
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

  getSynonymsSync: function() {
    if (!this.context)
      throw new Error('no context');

    var options = {
          table: this.synonymsTableName,
          limit: -1,
          offset: 0,
          output_columns: '_key,' + SYNONYMS_COLUMN
        };
    var synonyms = this.context.commandSync('select', options);

    synonyms = nroonga.formatSelectResult(synonyms);
    var formattedSynonyms = {};
    Object.keys(synonyms.results).sort().forEach(function(key) {
      var terms = synonyms.results[key][SYNONYMS_COLUMN];
      formattedSynonyms[key] = terms.sort();
    });
    return formattedSynonyms;
  },

  updateSynonymsSync: function(synonymOptions) {
    if (!this.context)
      throw new Error('no context');

    var synonyms = synonymOptions.synonyms;

    try {
      this.context.commandSync('table_remove', {
        table: this.synonymsTableName
      });
    } catch (error) {
      // The synonym table should be inexistent. Do nothing.
    }

    this.context.commandSync('table_create', {
      name: this.synonymsTableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText,
      flags: nroonga.KEY_NORMALIZE
    });
    this.context.commandSync('column_create', {
      table: this.synonymsTableName,
      name: SYNONYMS_COLUMN,
      type: nroonga.ShortText,
      flags: nroonga.COLUMN_VECTOR
    });

    var load = Object.keys(synonyms).map(function(key) {
      return {_key: key, synonyms: synonyms[key]};
    });
    this.context.commandSync('load', {
      table: this.synonymsTableName,
      values: JSON.stringify(load)
    });
  },

  isSynonymsTableAvailableSync: function() {
    var tables = this.context.tableListSync();
    return tables.some(function(table) {
      return table.name === this.synonymsTableName;
    }, this);
  },

  exists: function() {
    return !!this.getIdFromDatabase();
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

Domain.toTableNamePart = function(domainName) {
  return domainName;
};
Domain.toDonamName = function(tableNamePart) {
  return tableNamePart;
};

Domain.getAll = function(context) {
  context = context && new nroonga.Context(context);

  var tables = context.tableListSync();
  var tableMatcher = new RegExp('^([^_]+)_([^_]+)$');
  var domains = [];
  tables.forEach(function(table) {
    var match = table.name.match(tableMatcher);
    if (match) {
      var name = Domain.toDonamName(match[1]);
      domains.push(new Domain(name, context));
    }
  });
  domains.sort(function(a, b) { return a.name - b.name; });
  return domains;
};
