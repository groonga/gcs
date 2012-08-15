var utils = require('./test-utils');

var XMLNS =
    exports.XMLNS = 'http://cloudsearch.amazonaws.com/doc/2011-02-01';

var DocService =
    exports.DocService = {
      Endpoint: ''
    };
var SearchService =
    exports.SearchService = {
      Endpoint: ''
    };
var ResponseMetadata =
    exports.ResponseMetadata = {
      RequestId: {}
    };
var DomainStatus =
    exports.DomainStatus = {
      Created: '',
      Deleted: '',
      DocService: DocService,
      DomainId: '',
      DomainName: '',
      NumSearchableDocs: '',
      RequiresIndexDocuments: '',
      SearchInstanceCount: '',
      SearchPartitionCount: '',
      SearchService: SearchService
    };
var CreateDomainResponse =
    exports.CreateDomainResponse = {
      CreateDomainResponse: {
        '@': { xmlns: '' },
        CreateDomainResult: {
          DomainStatus: DomainStatus
        },
        ResponseMetadata: ResponseMetadata
      }
    };
var DeleteDomainResponse =
    exports.DeleteDomainResponse = {
      DeleteDomainResponse: {
        '@': { xmlns: '' },
        DeleteDomainResult: {
          DomainStatus: DomainStatus
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var DescribeDomainsResponse = 
    exports.DescribeDomainsResponse = function(members) {
  return {
    DescribeDomainsResponse: {
      '@': { xmlns: '' },
      DescribeDomainsResult: {
        DomainStatusList: (function() {
          var pattern =
    exports.pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = DomainStatus;
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: ResponseMetadata
    }
  };
}

var OptionStatus =
    exports.OptionStatus = {
      CreationDate: '',
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
var DefineIndexFieldResponse_Text =
    exports.DefineIndexFieldResponse_Text = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: IndexFieldStatus_Text
        },
        ResponseMetadata: ResponseMetadata
      }
    };
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
var DefineIndexFieldResponse_UInt =
    exports.DefineIndexFieldResponse_UInt = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: IndexFieldStatus_UInt
        },
        ResponseMetadata: ResponseMetadata
      }
    };
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
var DefineIndexFieldResponse_Literal =
    exports.DefineIndexFieldResponse_Literal = {
      DefineIndexFieldResponse: {
        '@': { xmlns: '' },
        DefineIndexFieldResult: {
          IndexField: IndexFieldStatus_Literal
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var DeleteIndexFieldResponse =
    exports.DeleteIndexFieldResponse = {
      DeleteIndexFieldResponse: {
        '@': { xmlns: '' },
        DeleteIndexFieldResult: {},
        ResponseMetadata: ResponseMetadata
      }
    };

var DescribeIndexFieldsResponse = 
    exports.DescribeIndexFieldsResponse = function(members) {
  return {
    DescribeIndexFieldsResponse: {
      '@': { xmlns: '' },
      DescribeIndexFieldsResult: {
        IndexFields: (function() {
          var pattern =
    exports.pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = member;
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: ResponseMetadata
    }
  };
}

var IndexDocumentsResponse = 
    exports.IndexDocumentsResponse = function(members) {
  return {
    IndexDocumentsResponse: {
      '@': { xmlns: '' },
      IndexDocumentsResult: {
        FieldNames: (function() {
          var pattern =
    exports.pattern = {};
          members.forEach(function(member, index) {
            pattern[index] = '';
          });
          return { member: pattern };
        })()
      },
      ResponseMetadata: ResponseMetadata
    }
  };
}

var SynonymOptionsStatus =
    exports.SynonymOptionsStatus = {
      Options: '',
      Status: OptionStatus
    };

var UpdateSynonymOptionsResponse =
    exports.UpdateSynonymOptionsResponse = {
      UpdateSynonymOptionsResponse: {
        '@': { xmlns: '' },
        UpdateSynonymOptionsResult: {
          Synonyms: SynonymOptionsStatus,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var DescribeSynonymOptionsResponse =
    exports.DescribeSynonymOptionsResponse = {
      DescribeSynonymOptionsResponse: {
        '@': { xmlns: '' },
        DescribeSynonymOptionsResult: {
          Synonyms: SynonymOptionsStatus,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var COMMON_ERROR_RESPONSE =
    exports.COMMON_ERROR_RESPONSE = {
      Response: {
        Errors: {
          Error: {
            Code: '',
            Message: ''
          }
        },
        RequestID: {}
      }
    };

var DefaultSearchFieldStatus =
    exports.DefaultSearchFieldStatus = {
      Options: '',
      Status: OptionStatus
    };

var DefaultSearchFieldStatus_blank =
    exports.DefaultSearchFieldStatus_blank = {
      Options: {},
      Status: OptionStatus
    };

var UpdateDefaultSearchFieldResponse =
    exports.UpdateDefaultSearchFieldResponse = {
      UpdateDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        UpdateDefaultSearchFieldResult: {
          DefaultSearchField: DefaultSearchFieldStatus,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var UpdateDefaultSearchFieldResponse_blank =
    exports.UpdateDefaultSearchFieldResponse_blank = {
      UpdateDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        UpdateDefaultSearchFieldResult: {
          DefaultSearchField: DefaultSearchFieldStatus_blank,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var DescribeDefaultSearchFieldResponse =
    exports.DescribeDefaultSearchFieldResponse = {
      DescribeDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        DescribeDefaultSearchFieldResult: {
          DefaultSearchField: DefaultSearchFieldStatus,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

var DescribeDefaultSearchFieldResponse_blank =
    exports.DescribeDefaultSearchFieldResponse_blank = {
      DescribeDefaultSearchFieldResponse: {
        '@': { xmlns: '' },
        DescribeDefaultSearchFieldResult: {
          DefaultSearchField: DefaultSearchFieldStatus_blank,
        },
        ResponseMetadata: ResponseMetadata
      }
    };

function toXMLPattern(fragment) {
  switch (typeof fragment) {
    default:
      return '';
    case 'object':
      var format =
    exports.format = {};
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

