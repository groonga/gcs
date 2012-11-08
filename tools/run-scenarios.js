#!/usr/bin/env node

/*
 Set these environment variables:
   * AWS_ACCESS_KEY_ID
   * AWS_SECRET_ACCESS_KEY
*/

var awssum = require('awssum');
var CloudSearch = awssum.load('amazon/cloudsearch').CloudSearch;
var fs = require('fs');

cs = new CloudSearch({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

var scenarios = JSON.parse(fs.readFileSync(__dirname + '/scenarios.json'));

CloudSearch.prototype.extractBody = function(options) {
  return 'blob';
};

var baseDir = __dirname + '/acs';
scenarios.forEach(function(scenario) {
  console.log('Processing ' + scenario.name);
  var filename = scenario.name.replace(/[^a-zA-Z0-9]+/g, '-') + '.txt';
  cs[scenario.params.Action].call(cs, scenario.params, function(error, data) {
    var response = error || data;
    var statusCodeTable = {
      404: 'Not Found',
      400: 'Bad Request',
      200: 'OK'
    };

    var statusCode = response.StatusCode;
    if (!statusCodeTable[statusCode]) {
      throw "Unknown status code " + statusCode;
    }

    var output = '';
    output += 'HTTP/1.1 ' + statusCode + ' ' + statusCodeTable[statusCode] + '\r\n';
    for (var key in response.Headers) {
      output += key + ': ' + response.Headers[key] + '\r\n';
    };
    output += '\r\n';
    output += response.Body.toString();
    var destPath = baseDir + '/' + filename, output;
    fs.writeFile(destPath, output);
    console.log('Wrote ' + destPath);
  });
});
