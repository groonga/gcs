/*
  Translates Boolean Queries used in tinia https://github.com/dlangevin/tinia
  into groonga query.

  Not all of Boolean Search Queries are supported.
  http://docs.amazonwebservices.com/cloudsearch/latest/developerguide/booleansearch.html

  Returns null if the given query is not supported.
*/


function BooleanQueryTranslator() {
}

BooleanQueryTranslator.prototype = {
  translateTinia: function(query) {
    var matched = null;

    matched = query.match(/^type:'(.+)'$/);
    if (matched) {
      return 'type:"' + matched[1] + '"';
    }

    matched = query.match(/^\(and '([^']+)' type:'(.+)'\)$/);
    if (matched) {
      return '"' + matched[1] + '" type:"' + matched[2] + '"';
    }

    matched = query.match(/^\(and (.+) type:'(.+)'\)$/);
    if (matched) {
      return matched[1] + ' type:"' + matched[2] + '"';
    }

    return null;
  }
};

exports.BooleanQueryTranslator = BooleanQueryTranslator;
