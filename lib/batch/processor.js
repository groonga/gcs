var nroonga = require('../wrapped-nroonga');
var Domain = require('../database').Domain;
var Deferred = require('jsdeferred').Deferred;

exports.INVALID_BATCH = Processor.INVALID_BATCH = 'Invalid Batch';

function Processor(options) {
  this.context = options.context || null;
  this.databasePath = options.databasePath;
  this.domain = new Domain(options.domainName || options.domain, this.context);
  this.initialize();
}

Processor.prototype = {
  initialize: function() {
    if (!this.context && !this.databasePath)
      throw new Error('no database path');
    this.context = new nroonga.Context(this.context || this.databasePath);
  },
  validate: function(batches) {
    var fields = this.domain.indexFields;
    var errors = [];
    batches.forEach(function(batch) {
      if (batch.type == 'add') {
        errors = errors.concat(this.validateAddBatch(batch, fields));
      }
    }, this);
    if (errors.length) {
      var error = new Error(exports.INVALID_BATCH);
      error.errors = errors;
      error.result = this.formatErrors(errors);
      throw error;
    }
  },
  validateAddBatch: function(batch, fields) {
    if (!batch.fields) {
      return [batch.id + ': You must specify "fields".'];
    }

    var fieldName;
    var fieldNames = fields.map(function(field) {
          return field.name;
        });
    var fieldsCount = 0;
    var errors = [];
    for (var field in batch.fields) {
      if (!batch.fields.hasOwnProperty(field))
        continue;

      fieldsCount++;

      try {
        fieldName = this.domain.getIndexField(field).name;
      } catch (error) {
        errors.push(batch.id + ': ' + error.message);
        continue;
      }

      if (fieldNames.indexOf(fieldName) < 0)
        errors.push(batch.id + ': The field "' + field + '" is unknown. ' +
                    '(available: ' + fieldNames + ')');

      if (batch.fields[field] === null)
        errors.push(batch.id + ': The field "' + field + '" is null.');
    }

    if (!fieldsCount)
      errors.push(batch.id + ': You must specify one or more fields to "fields".');

    return errors;
  },
  load: function(batches) {
    var result = this.createNewResult();
    var self = this;
    return Deferred.loop(batches.length, function(i) {
             self.loadOneBatchSync(batches[i], result);
           })
           .error(function(error) {
             result.errors.push(error);
           })
           .next(function() {
             return self.formatResult(result);
           });
  },
  loadSync: function(batches) {
    var result = this.createNewResult();
    batches.forEach(function(batch) {
      try {
        this.loadOneBatchSync(batch, result);
      } catch(error) {
        result.errors.push(error);
      }
    }, this);
    return this.formatResult(result);
  },
  loadOneBatchSync: function(batch, results) {
    switch (batch.type) {
      case 'add':
        var record = { id: batch.id };
        Object.keys(batch.fields).forEach(function(key) {
          record[key] = batch.fields[key];
          if (Array.isArray(batch.fields[key])) {
            var field = this.domain.getIndexField(key);
            if (!field.multipleValues)
              field.upgradeToMultipleValuesSync();
          }
        }, this);
        this.domain.addRecordSync(record);
        results.adds++;
        break;
      case 'delete':
        this.domain.deleteRecordSync(batch.id);
        results.deletes++;
        break;
    }
  },
  createNewResult: function() {
    return {
      adds: 0,
      deletes: 0,
      errors: [],
      warnings: []
    };
  },
  formatResult: function(result) {
    var formattedResult = {
          status: 'success',
          adds: result.adds || 0,
          deletes: result.deletes || 0
        };
    if (result.errors.length) {
      formattedResult.status = 'error';
      formattedResult.errors = result.errors.map(function(error) {
        return {
          message: error.message || error
        };
      });
    }
    return formattedResult;
  },
  formatErrors: function(errors) {
    return this.formatResult({
      errors: errors
    });
  }
};

exports.Processor = Processor;
