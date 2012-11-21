
var utils = require('./test-utils');

var XMLNS =
    exports.XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';

var ResponseMetadata =
    exports.ResponseMetadata = {
      RequestId: ''
    };

function createGenericResponse(action, result) {
  var responseBody = { '@': { xmlns: '' } };
  responseBody[action + 'Result'] = result || {};
  responseBody.ResponseMetadata = ResponseMetadata;
  var response = {};
  response[action + 'Response'] = responseBody;
  return response;
}

function defineGenericResponse(action, result) {
  exports[action + 'Response'] = createGenericResponse(action, result);
}

var DocService =
    exports.DocService = {
      Endpoint: '',
      Arn: ''
    };
var SearchService =
    exports.SearchService = {
      Endpoint: '',
      Arn: ''
    };
var DomainStatus =
    exports.DomainStatus = {
      Created: '',
      Deleted: '',
      DocService: DocService,
      DomainId: '',
      DomainName: '',
      NumSearchableDocs: '',
      Processing: '',
      RequiresIndexDocuments: '',
      SearchInstanceCount: '',
      SearchPartitionCount: '',
      SearchService: SearchService
    };
defineGenericResponse('CreateDomain', {
  DomainStatus: DomainStatus
});
defineGenericResponse('DeleteDomain', {
  DomainStatus: DomainStatus
});
var DeleteDomainResponse_UnexistingDomain =
    exports.DeleteDomainResponse_UnexistingDomain = createGenericResponse('DeleteDomain', {});

exports.DescribeDomainsResponse = function(members) {
  return createGenericResponse('DescribeDomains', {
    DomainStatusList: (function() {
      var pattern = {};
      members.forEach(function(member, index) {
        pattern[index] = DomainStatus;
      });
      return members.length ? { member: pattern } : {} ;
    })()
  });
};

var OptionStatus =
    exports.OptionStatus = {
      CreationDate: '',
      PendingDeletion: '',
      State: '',
      UpdateDate: '',
      UpdateVersion: ''
    };
var TextOptions =
    exports.TextOptions = {
      DefaultValue: {},
      FacetEnabled: '',
      ResultEnabled: ''
    };
var IndexField_Text =
    exports.IndexField_Text = {
      IndexFieldName: '',
      IndexFieldType: '',
      TextOptions: TextOptions
    };
var IndexFieldStatus_Text =
    exports.IndexFieldStatus_Text = {
      Options: IndexField_Text,
      Status: OptionStatus
    };
exports.DefineIndexFieldResponse_Text = createGenericResponse('DefineIndexField', {
  IndexField: IndexFieldStatus_Text
});

var UIntOptions =
    exports.UIntOptions = {
      DefaultValue: {}
    };
var IndexField_UInt =
    exports.IndexField_UInt = {
      IndexFieldName: '',
      IndexFieldType: '',
      UIntOptions: UIntOptions
    };
var IndexFieldStatus_UInt =
    exports.IndexFieldStatus_UInt = {
      Options: IndexField_UInt,
      Status: OptionStatus
    };
exports.DefineIndexFieldResponse_UInt = createGenericResponse('DefineIndexField', {
  IndexField: IndexFieldStatus_UInt
});

var LiteralOptions =
    exports.LiteralOptions = {
      DefaultValue: {},
      FacetEnabled: '',
      ResultEnabled: '',
      SearchEnabled: ''
    };
var IndexField_Literal =
    exports.IndexField_Literal = {
      IndexFieldName: '',
      IndexFieldType: '',
      LiteralOptions: LiteralOptions
    };
var IndexFieldStatus_Literal =
    exports.IndexFieldStatus_Literal = {
      Options: IndexField_Literal,
      Status: OptionStatus
    };
exports.DefineIndexFieldResponse_Literal = createGenericResponse('DefineIndexField', {
  IndexField: IndexFieldStatus_Literal
});

exports.DeleteIndexFieldResponse_Text = createGenericResponse('DeleteIndexField', {
  IndexField: IndexFieldStatus_Text
});
exports.DeleteIndexFieldResponse_UInt = createGenericResponse('DeleteIndexField', {
  IndexField: IndexFieldStatus_UInt
});
exports.DeleteIndexFieldResponse_Literal = createGenericResponse('DeleteIndexField', {
  IndexField: IndexFieldStatus_Literal
});
defineGenericResponse('DeleteIndexField');

exports.DescribeIndexFieldsResponse = function(members) {
  return createGenericResponse('DescribeIndexFields', {
    IndexFields: (function() {
          var pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = member;
          });
          return members.length ? { member: pattern } : {} ;
        })()
  });
};

exports.IndexDocumentsResponse = function(members) {
  return createGenericResponse('IndexDocuments', {
    FieldNames: (function() {
      var pattern = {};
      members.forEach(function(member, index) {
        pattern[index] = '';
      });
      return { member: pattern };
    })()
  });
};

var SynonymOptionsStatus =
    exports.SynonymOptionsStatus = {
      Options: '',
      Status: OptionStatus
    };
defineGenericResponse('UpdateSynonymOptions', {
  Synonyms: SynonymOptionsStatus,
});
defineGenericResponse('DescribeSynonymOptions', {
  Synonyms: SynonymOptionsStatus,
});

var COMMON_ERROR_RESPONSE =
    exports.COMMON_ERROR_RESPONSE = {
      ErrorResponse: {
        '@': { xmlns: '' },
        Error: {
          Code: '',
          Message: ''
        },
        RequestId: ''
      }
    };

var TYPED_ERROR_RESPONSE =
    exports.TYPED_ERROR_RESPONSE = {
      ErrorResponse: {
        '@': { xmlns: '' },
        Error: {
          Type: '',
          Code: '',
          Message: ''
        },
        RequestId: ''
      }
    };

var DefaultSearchFieldStatus =
    exports.DefaultSearchFieldStatus = {
      Options: '',
      Status: OptionStatus
    };
exports.UpdateDefaultSearchFieldResponse = createGenericResponse('UpdateDefaultSearchField', {
  DefaultSearchField: DefaultSearchFieldStatus
});
exports.DescribeDefaultSearchFieldResponse = createGenericResponse('DescribeDefaultSearchField', {
  DefaultSearchField: DefaultSearchFieldStatus
});

var DefaultSearchFieldStatus_blank =
    exports.DefaultSearchFieldStatus_blank = {
      Options: {},
      Status: OptionStatus
    };
exports.UpdateDefaultSearchFieldResponse_blank = createGenericResponse('UpdateDefaultSearchField', {
  DefaultSearchField: DefaultSearchFieldStatus_blank
});
exports.DescribeDefaultSearchFieldResponse_blank = createGenericResponse('DescribeDefaultSearchField', {
  DefaultSearchField: DefaultSearchFieldStatus_blank
});

function toXMLPattern(fragment) {
  switch (typeof fragment) {
    default:
      return '';
    case 'object':
      var format = {};
      Object.keys(fragment).forEach(function(key) {
        if (!fragment.hasOwnProperty(key))
          return;
        format[key] = toXMLPattern(fragment[key]);
      });
      return format;
  }
}
exports.toXMLPattern = toXMLPattern;

function replaceXMLDates(str) {
  return str.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/g,
                     '1970-01-01T00:00:00Z');
}
exports.replaceXMLDates = replaceXMLDates;

function toParsedResponse(response) {
  var parsed =
    exports.parsed = {
        statusCode: response.statusCode,
        body: utils.XMLStringToJSON(response.body)
      };
  var pattern =
    exports.pattern = {
        statusCode: parsed.statusCode,
        body: toXMLPattern(parsed.body)
      };
  parsed.pattern = pattern;
  return parsed;
}
exports.toParsedResponse = toParsedResponse;

