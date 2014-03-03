/**
 * Naming rule of generated tables:
 *   main table:   <domain name>_<domain id>
 *   index tables: <domain name>_<domain id>_index_<column name>
 *   meta tables:  <domain name>_<domain id>_synonyms
 */

var nativeNroonga = require('nroonga');
var nroonga = require('../wrapped-nroonga');
var ValidationError = require('../errors').ValidationError;
var MultiplexedValidationError = require('../errors').MultiplexedValidationError;
var IndexField = require('./index-field').IndexField;
// var storage = require('./storage');

var MINIMUM_NAME_LENGTH =
      exports.MINIMUM_NAME_LENGTH =
      Domain.MINIMUM_NAME_LENGTH = 3;
var MAXIMUM_NAME_LENGTH =
      exports.MAXIMUM_NAME_LENGTH =
      Domain.MAXIMUM_NAME_LENGTH = 28;

var VALID_NAME_PATTERN =
      exports.VALID_NAME_PATTERN =
      Domain.VALID_NAME_PATTERN = '[a-z][a-z0-9\\-]+';
var VALID_NAME_MATCHER =
      exports.VALID_NAME_MATCHER =
      Domain.VALID_NAME_MATCHER = new RegExp('^' + VALID_NAME_PATTERN + '$');
var INVALID_TABLE_NAME_CHARACTERS_MATCHER =
      exports.INVALID_TABLE_NAME_CHARACTERS_MATCHER =
      Domain.INVALID_TABLE_NAME_CHARACTERS_MATCHER = /[^a-z0-9\\-]/g;

var DEFAULT_ID =
      exports.DEFAULT_ID =
      Domain.DEFAULT_ID = '00000000000000000000000000';

var INDEX_SUFFIX =
      exports.INDEX_SUFFIX =
      Domain.INDEX_SUFFIX = 'index';

var SYNONYMS_COLUMN =
      exports.SYNONYMS_COLUMN =
      Domain.SYNONYMS_COLUMN = 'synonyms';


var NO_CONTEXT =
      exports.NO_CONTEXT =
      Domain.NO_CONTEXT = 'no context';

var DOMAIN_ALREADY_EXISTS =
      exports.DOMAIN_ALREADY_EXISTS =
      Domain.DOMAIN_ALREADY_EXISTS = 'domain already exists';

var DOMAIN_DOES_NOT_EXIST =
      exports.DOMAIN_DOES_NOT_EXIST =
      Domain.DOMAIN_DOES_NOT_EXIST = 'domain does not exist';


function assertValidDomainName(domain) {
  if (typeof domain != 'string') {
    var error = new Error('domain name must be a string');
    error.isValidationError = true;
    throw error;
  }

  var errors = [];
  var commonPrefix = 'Value \'' + domain + '\' at \'%NAME_FIELD%\' failed ' +
                     'to satisfy constraint: ';

  if (!domain.match(VALID_NAME_MATCHER)) {
    errors.push(commonPrefix + 'Member must satisfy regular ' +
                'expression pattern: ' + VALID_NAME_PATTERN);
  } else {
    var invalidCharacters = domain.match(INVALID_TABLE_NAME_CHARACTERS_MATCHER);
    if (invalidCharacters) {
      invalidCharacters = Array.prototype.slice.call(invalidCharacters, 0)
                            .map(function(aCharacter) {
                              return "'" + aCharacter + "'";
                            });
      errors.push(commonPrefix + 'Member cannot include these ' +
                  'characters: ' + invalidCharacters.join(', '));
    }
  }

  if (domain.length < MINIMUM_NAME_LENGTH)
    errors.push(commonPrefix + 'Member must have length greater ' +
                'than or equal to ' + MINIMUM_NAME_LENGTH);

  if (domain.length > MAXIMUM_NAME_LENGTH)
    errors.push(commonPrefix + 'Member must have length less ' +
                'than or equal to ' + MAXIMUM_NAME_LENGTH);

  if (errors.length)
    throw new MultiplexedValidationError(errors);
}

function Domain(args) {
  if (typeof args == 'string') {
    args = {
      source:        args,
      context:       null,
      documentsPath: null
    };
  }

  if ('name' in args && !('source' in args))
    args.source = args.name;

  if (args.source instanceof Domain)
    return args.source;

  this.initialize(args);
}
Domain.prototype = {
  initialize: function(args) {
    this.cachedIndexFields = {};

    this.context = args.context && new nroonga.Context(args.context);
    this.initializeNameAndId(args.source);
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
    var lastIndex = characters.length - 1;
    var id = '';
    while (id.length < size) {
      id += characters[Math.round(Math.random() * lastIndex)];
    }
    return id;
  },

  validate: function() {
    assertValidDomainName(this.name);
    return this;
  },

  get tableName() {
    if (!this._tableName)
      this._tableName = Domain.toTableNamePart(this.name) + '_' + this.id;
    return this._tableName;
  },

  get indexTableBaseName() {
    return this.tableName + '_' + INDEX_SUFFIX + '_';
  },

  get termsTableName() {
    return this.indexTableBaseName + 'BigramTerms';
  },

  get documentsDirectory() {
    return ;
  },

  get configurationsTableName() {
    return this.tableName + '_configurations';
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
      throw new Error(NO_CONTEXT);
    var columns = this.context.ordinalColumnsSync(this.tableName);
    columns = columns.sort(function(a, b) { return a.name - b.name; });
    var fields = columns.map(function(column) {
                   var name = IndexField.toFieldName(column.name);
                   return this.getIndexField(name);
                 }, this);
    return fields;
  },
  get facetReturnableIndexFields() {
    return this.indexFields.filter(function(field) {
      return field.facetEnabled;
    });
  },
  get resultReturnableIndexFields() {
    return this.indexFields.filter(function(field) {
      return field.resultEnabled;
    });
  },
  get searchableIndexFields() {
    return this.indexFields.filter(function(field) {
      return field.searchEnabled;
    });
  },

  get defaultSearchField() {
    var fieldName = this.getConfiguration(this.defaultSearchFieldConfigurationKey);
    if (!fieldName) return null;
    var field = this.getIndexField(fieldName);
    return field.exists() ? field : null ;
  },
  set defaultSearchField(value) {
    if (!value) {
      this.deleteConfiguration(this.defaultSearchFieldConfigurationKey);
    } else {
      if (typeof value == 'string')
        value = this.getIndexField(value);
      if (value.exists())
        this.setConfiguration(this.defaultSearchFieldConfigurationKey, value.name);
    }
    var now = new Date();
    if (!this.getConfiguration(this.getCreationDateKey('option_defaultSearchField')))
      this.setCreationDate('option_defaultSearchField', now);
    this.setUpdateDate('option_defaultSearchField', now);
    return value;
  },
  get defaultSearchFieldConfigurationKey() {
    return 'default_search_field';
  },

  getCreationDate: function(base) {
    var storedDate = this.exists() ?
          this.getConfiguration(this.getCreationDateKey(base)) : null ;
    return storedDate ? new Date(storedDate) : new Date();
  },
  setCreationDate: function(base, date) {
    if (this.exists())
      this.setConfiguration(this.getCreationDateKey(base), date.getTime())
    return date;
  },
  getCreationDateKey: function(base) {
    return base + '_created_at';
  },

  getUpdateDate: function(key) {
    var storedDate = this.exists() ?
          this.getConfiguration(this.getUpdateDateKey(key)) : null ;
    return storedDate ? new Date(storedDate) : new Date();
  },
  setUpdateDate: function(key, date) {
    if (this.exists())
      this.setConfiguration(this.getUpdateDateKey(key), date.getTime())
    return date;
  },
  getUpdateDateKey: function(key) {
    return key + '_updated_at';
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
  setId: function(value) {
    this.id = value;
    return this;
  },

  get creationDate() {
    return this.getCreationDate('self') || new Date();
  },

  get domainId() {
    return this.creationDate.getTime() + '/' + this.name;
  },

  get searchableDocumentsCount() {
    if (!this.context || !this.exists())
      return 0;

    var options = {
          table: this.tableName,
          limit: 0,
          offset: 0
        };
    var result = this.context.commandSync('select', options);
    return result[0][0][0];
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
  get searchInstanceType() {
    return null;
  },
  get processing() {
    return false;
  },

  get documentsArn() {
    return 'arn:aws:cs:us-east-1:' + this.creationDate.getTime() + ':doc/' + this.name;
  },
  get searchArn() {
    return 'arn:aws:cs:us-east-1:' + this.creationDate.getTime() + ':search/' + this.name;
  },
  documentsEndpoint: function(endpointBase) {
    if (!endpointBase) throw new Error('endpointBase must be specified');
    return 'doc-' + this.name + '-' + this.id + '.' + endpointBase;
  },
  searchEndpoint: function(endpointBase) {
    if (!endpointBase) throw new Error('endpointBase must be specified');
    return 'search-' + this.name + '-' + this.id + '.' + endpointBase;
  },

  createSync: function() {
    this.validate();

    if (!this.context)
      throw new Error(NO_CONTEXT);

    if (this.exists())
      throw new Error(DOMAIN_ALREADY_EXISTS);

    if (this.exists()) {
      throw new Error('domain exists');
    }

    this.context.commandSync('table_create', {
      name: this.tableName,
      flags: nroonga.TABLE_PAT_KEY,
      key_type: nroonga.ShortText
    });

    this.context.commandSync('table_create', {
      name: this.configurationsTableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText
    });
    this.context.commandSync('column_create', {
      table: this.configurationsTableName,
      name: 'value',
      type: nroonga.ShortText,
      flags: nroonga.COLUMN_SCALAR
    });

    this.context.commandSync('table_create', {
      name: this.termsTableName,
      flags: nroonga.TABLE_PAT_KEY,
      key_type: nroonga.ShortText,
      default_tokenizer: nroonga.TokenBigram,
      normalizer: 'NormalizerAuto'
    });

    this.setCreationDate('self', new Date());

    return this;
  },

  saveSync: function() {
    this.validate();

    if (!this.exists())
      this.createSync();

    return this;
  },

  deleteSync: function() {
    this.validate();

    if (!this.context)
      throw new Error(NO_CONTEXT);

    if (!this.exists())
      throw new Error(DOMAIN_DOES_NOT_EXIST);

    this.context.commandSync('table_remove', {
      name: this.tableName
    });
    this.context.commandSync('table_remove', {
      name: this.configurationsTableName
    });
    this.context.commandSync('table_remove', {
      name: this.termsTableName
    });

    return this;
  },

  reindexSync: function() {
    this.indexFields.forEach(function(field) {
      field.reindexSync();
    });
    return this;
  },

  getSynonymSync: function(key) {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    if (!this.hasSynonymsTableSync())
      return null;

    var options = {
          table: this.synonymsTableName,
          key: key,
          output_columns: SYNONYMS_COLUMN
        };
    var getResult;
    try {
      getResult = this.context.commandSync('get', options);
    } catch (error) {
      if (/nonexistent key:/.test(error.message)) {
        return null;
      } else {
        throw error;
      }
    }

    var synonyms = getResult[1][0];
    return synonyms;
  },

  getSynonymsSync: function() {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    if (!this.hasSynonymsTableSync())
      return {};

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

  updateSynonymsSync: function(synonyms) {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    this.setupBlankSynonymsTable();

    var values = Object.keys(synonyms).map(function(key) {
          return {_key: key, synonyms: synonyms[key]};
        });
    this.context.commandSync('load', {
      table: this.synonymsTableName,
      values: JSON.stringify(values)
    });

    var now = new Date();
    if (!this.getConfiguration(this.getCreationDateKey('option_synonyms')))
      this.setCreationDate('option_synonyms', now);
    this.setUpdateDate('option_synonyms', now);

    return this;
  },

  setupBlankSynonymsTable: function() {
    if (!this.exists())
      this.createSync();

    if (this.hasSynonymsTableSync()) {
      this.context.commandSync('table_remove', {
        name: this.synonymsTableName
      });
    }
    this.context.commandSync('table_create', {
      name: this.synonymsTableName,
      flags: nroonga.TABLE_HASH_KEY,
      key_type: nroonga.ShortText,
      normalizer: 'NormalizerAuto'
    });
    this.context.commandSync('column_create', {
      table: this.synonymsTableName,
      name: SYNONYMS_COLUMN,
      type: nroonga.ShortText,
      flags: nroonga.COLUMN_VECTOR
    });

    return this;
  },

  hasSynonymsTableSync: function() {
    return this.context.tableExistsSync(this.synonymsTableName);
  },

  exists: function() {
    return !!this.getIdFromDatabase();
  },

  dumpSync: function() {
    var dump = this.context.commandSync('dump', {
                 tables: this.tableName
               });

    var tableContents = dump.split('load --table ' + this.tableName)[1];
        // if the table is blank, tableContents becomes undefined.
    if (!tableContents) return [];
    tableContents = JSON.parse(tableContents);

    var columnNames = tableContents[0];
    columnNames = columnNames.map(function(columnName) {
      if (columnName == '_key')
        return 'id';
      else
        return columnName;
    });

    var values = tableContents.slice(1).map(function(record) {
          var formattedRecord = {};
          record.forEach(function(columnValue, columnIndex) {
            var column = columnNames[columnIndex];
            formattedRecord[column] = columnValue;
          });
          return formattedRecord;
        });
    return values;
  },

  loadSync: function(values) {
    values = values.map(this.toGrnDumpRecord);
    this.context.commandSync('load', {
      table: this.tableName,
      values: JSON.stringify(values)
    });
    return this;
  },

  toGrnDumpRecord: function(record) {
    var grnDumpRecord = {};
    Object.keys(record).forEach(function(key) {
      var grnDumpKey = key == 'id' ? '_key' : key ;
      grnDumpRecord[grnDumpKey] = record[key];
    });
    return grnDumpRecord;
  },

  addDocumentSync: function(document) {
    // this.storage.saveSync(document);
    this.indexDocumentSync(document);
    return this;
  },
  indexDocumentSync: function(document) {
    var record = { id: document.id };
    Object.keys(document.fields).forEach(function(key) {
      record[key] = document.fields[key];
      if (Array.isArray(document.fields[key])) {
        var field = this.getIndexField(key);
        if (!field.multipleValues)
          field.upgradeToMultipleValuesSync();
      }
    }, this);

    var grnDumpRecord = this.toGrnDumpRecord(record);
    this.context.commandSync('load', {
      table: this.tableName,
      values: JSON.stringify([grnDumpRecord])
    });

    return this;
  },

  deleteDocumentSync: function(id) {
    this.deleteIndexedDocumentSync(id);
    return this;
  },
  deleteIndexedDocumentSync: function(id) {
    this.context.commandSync('delete', {
      table: this.tableName,
      key: id
    });
    return this;
  },

  setConfiguration: function(key, value) {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    this.context.commandSync('load', {
      table: this.configurationsTableName,
      values: JSON.stringify([{
        _key: key,
        value: JSON.stringify(value)
      }])
    });

    return this;
  },
  getConfiguration: function(key) {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    var options = {
          table: this.configurationsTableName,
          limit: -1,
          offset: 0,
          filter: '_key == "' + key.replace(/"/g, '\\"') + '"'
        };
    var values = this.context.commandSync('select', options);
    values = nroonga.formatSelectResult(values);
    if (values.count == 0)
      return undefined;

    var value = values.results[key]['value'];
    return JSON.parse(value);
  },
  deleteConfiguration: function(key) {
    if (!this.context)
      throw new Error(NO_CONTEXT);

    this.context.commandSync('delete', {
      table: this.configurationsTableName,
      key: key
    });

    return this;
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
      domains.push(new Domain({ name: name,
                                context: context }));
    }
  });
  domains.sort(function(a, b) { return a.name - b.name; });
  return domains;
};
