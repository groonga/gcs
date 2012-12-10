var xml2js = require('xml2js');

function _toJSON(xml) {
  var parser = new xml2js.Parser({
                 explicitRoot: true
               });
  var json;
  parser.addListener('end', function(result) {
    json = result;
  });
  try {
    parser.parseString(xml);
  } catch (e) {
    console.log(xml);
    throw e;
  }
  return json;
}

function toJSON(xml) {
  var batches = [];
  var json = _toJSON(xml);
  if (json.batch.add) {
    if (!Array.isArray(json.batch.add))
      json.batch.add = [json.batch.add];
    json.batch.add.forEach(function(item) {
      var batch = {
            type: 'add',
            id: item['@'].id,
            version: item['@'].version,
            lang: item['@'].lang,
            fields: {}
          };
      var fields = item.field;
      if (!Array.isArray(fields)) fields = [fields];
      fields.forEach(function(field) {
        batch.fields[field['@'].name] = field['#'];
      });
      batches.push(batch);
    });
  }
  if (json.batch.delete) {
    if (!Array.isArray(json.batch.delete))
      json.batch.delete = [json.batch.delete];
    json.batch.delete.forEach(function(item) {
      var batch = {
            type: 'delete',
            id: item['@'].id,
            version: item['@'].version
          };
      batches.push(batch);
    });
  }
  return batches;
}

exports.toJSON = toJSON;
